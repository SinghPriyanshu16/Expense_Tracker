// ============================================================
// Anomaly Detection Engine
// Z-score, rolling average, and IQR-based detection
// ============================================================

class AnomalyDetector {
    constructor(opts = {}) {
        this.zThreshold     = opts.zThreshold     || 2.0;   // σ threshold
        this.iqrMultiplier  = opts.iqrMultiplier  || 1.5;
        this.minDataPoints  = opts.minDataPoints  || 3;      // need at least this many for stats
    }

    // ----- public API -------------------------------------------------

    /**
     * Analyse a full set of transactions and return anomaly objects.
     * Each anomaly: { transaction, type, severity, message, score }
     */
    detectAll(transactions) {
        const anomalies = [];
        if (!transactions || transactions.length < this.minDataPoints) return anomalies;

        anomalies.push(...this._detectAmountAnomalies(transactions));
        anomalies.push(...this._detectCategorySpikes(transactions));
        anomalies.push(...this._detectFrequencyAnomalies(transactions));
        anomalies.push(...this._detectDailySpendingSpikes(transactions));

        // Deduplicate by transaction id + type
        const seen = new Set();
        return anomalies.filter(a => {
            const key = `${a.transaction.id}_${a.type}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).sort((a, b) => this._severityRank(b.severity) - this._severityRank(a.severity));
    }

    // ----- detection strategies ---------------------------------------

    /** Flag individual transactions whose amount is unusually high */
    _detectAmountAnomalies(txns) {
        const amounts = txns.map(t => t.amount);
        const stats   = this._stats(amounts);
        if (stats.std === 0) return [];

        return txns.filter(t => {
            const z = (t.amount - stats.mean) / stats.std;
            return z > this.zThreshold;
        }).map(t => {
            const z = (t.amount - stats.mean) / stats.std;
            return {
                transaction: t,
                type: 'high-amount',
                severity: z > 3 ? 'high' : z > 2.5 ? 'medium' : 'low',
                score: +z.toFixed(2),
                message: `\$${t.amount.toFixed(2)} is ${z.toFixed(1)}σ above your average spending of \$${stats.mean.toFixed(2)}`
            };
        });
    }

    /** Flag categories where recent spending is abnormally higher than historical */
    _detectCategorySpikes(txns) {
        const byCategory = {};
        txns.forEach(t => {
            (byCategory[t.category] = byCategory[t.category] || []).push(t);
        });

        const anomalies = [];
        for (const [cat, catTxns] of Object.entries(byCategory)) {
            if (catTxns.length < this.minDataPoints) continue;

            // Compare last 7-day total to previous weekly averages
            const now   = new Date(Math.max(...catTxns.map(t => new Date(t.date))));
            const week  = 7 * 24 * 60 * 60 * 1000;
            const recent = catTxns.filter(t => (now - new Date(t.date)) < week);
            const older  = catTxns.filter(t => (now - new Date(t.date)) >= week);

            if (older.length < this.minDataPoints || recent.length === 0) continue;

            // Group older transactions into weekly buckets
            const weeklyTotals = this._bucketize(older, week);
            if (weeklyTotals.length < 2) continue;

            const recentTotal = recent.reduce((s, t) => s + t.amount, 0);
            const stats = this._stats(weeklyTotals);
            if (stats.std === 0) continue;

            const z = (recentTotal - stats.mean) / stats.std;
            if (z > this.zThreshold) {
                // Attach the anomaly to the largest recent transaction
                const biggest = recent.reduce((a, b) => a.amount > b.amount ? a : b);
                anomalies.push({
                    transaction: biggest,
                    type: 'category-spike',
                    severity: z > 3 ? 'high' : z > 2.5 ? 'medium' : 'low',
                    score: +z.toFixed(2),
                    message: `${cat} spending this week (\$${recentTotal.toFixed(2)}) is ${z.toFixed(1)}σ above your weekly average of \$${stats.mean.toFixed(2)}`
                });
            }
        }
        return anomalies;
    }

    /** Flag unusually frequent spending in a single day */
    _detectFrequencyAnomalies(txns) {
        const byDay = {};
        txns.forEach(t => {
            const day = t.date.slice(0, 10);
            (byDay[day] = byDay[day] || []).push(t);
        });

        const counts = Object.values(byDay).map(arr => arr.length);
        const stats  = this._stats(counts);
        if (stats.std === 0) return [];

        const anomalies = [];
        for (const [day, dayTxns] of Object.entries(byDay)) {
            const z = (dayTxns.length - stats.mean) / stats.std;
            if (z > this.zThreshold && dayTxns.length >= 5) {
                const biggest = dayTxns.reduce((a, b) => a.amount > b.amount ? a : b);
                anomalies.push({
                    transaction: biggest,
                    type: 'high-frequency',
                    severity: z > 3 ? 'high' : 'medium',
                    score: +z.toFixed(2),
                    message: `${dayTxns.length} transactions on ${day} — that's ${z.toFixed(1)}σ above your daily average of ${stats.mean.toFixed(1)}`
                });
            }
        }
        return anomalies;
    }

    /** Flag days where total spending is abnormally high */
    _detectDailySpendingSpikes(txns) {
        const byDay = {};
        txns.forEach(t => {
            const day = t.date.slice(0, 10);
            byDay[day] = (byDay[day] || 0) + t.amount;
        });

        const totals = Object.values(byDay);
        const stats  = this._stats(totals);
        if (stats.std === 0) return [];

        const anomalies = [];
        for (const [day, total] of Object.entries(byDay)) {
            const z = (total - stats.mean) / stats.std;
            if (z > this.zThreshold) {
                // Find the largest transaction that day
                const dayTxns = txns.filter(t => t.date.slice(0, 10) === day);
                const biggest = dayTxns.reduce((a, b) => a.amount > b.amount ? a : b);
                anomalies.push({
                    transaction: biggest,
                    type: 'daily-spike',
                    severity: z > 3 ? 'high' : z > 2.5 ? 'medium' : 'low',
                    score: +z.toFixed(2),
                    message: `Total spending on ${day} was \$${total.toFixed(2)} — ${z.toFixed(1)}σ above your daily average of \$${stats.mean.toFixed(2)}`
                });
            }
        }
        return anomalies;
    }

    // ----- helpers ----------------------------------------------------

    _stats(arr) {
        const n = arr.length;
        if (n === 0) return { mean: 0, std: 0, q1: 0, q3: 0 };
        const mean = arr.reduce((a, b) => a + b, 0) / n;
        const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
        const std = Math.sqrt(variance);
        const sorted = [...arr].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(n * 0.25)];
        const q3 = sorted[Math.floor(n * 0.75)];
        return { mean, std, q1, q3 };
    }

    /** Bucket transaction amounts into time windows and return array of totals */
    _bucketize(txns, windowMs) {
        if (txns.length === 0) return [];
        const sorted = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
        const start  = new Date(sorted[0].date).getTime();
        const end    = new Date(sorted[sorted.length - 1].date).getTime();
        const buckets = {};
        sorted.forEach(t => {
            const idx = Math.floor((new Date(t.date).getTime() - start) / windowMs);
            buckets[idx] = (buckets[idx] || 0) + t.amount;
        });
        return Object.values(buckets);
    }

    _severityRank(s) {
        return { high: 3, medium: 2, low: 1 }[s] || 0;
    }
}

window.AnomalyDetector = AnomalyDetector;
