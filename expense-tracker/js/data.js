// ============================================================
// Data Manager – sample data, persistence, import/export
// ============================================================

class DataManager {
    constructor(categorizer) {
        this.categorizer = categorizer;
        this.STORAGE_KEY = 'expense_transactions';
    }

    // ----- persistence ------------------------------------------------

    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    save(transactions) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
    }

    clearAll() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem('expense_corrections');
    }

    // ----- CRUD -------------------------------------------------------

    addTransaction(txns, txn) {
        txn.id = txn.id || this._id();
        txns.unshift(txn);
        this.save(txns);
        return txns;
    }

    deleteTransaction(txns, id) {
        const idx = txns.findIndex(t => t.id === id);
        if (idx > -1) txns.splice(idx, 1);
        this.save(txns);
        return txns;
    }

    updateCategory(txns, id, newCat) {
        const t = txns.find(t => t.id === id);
        if (t) {
            this.categorizer.learn(t.merchant, newCat);
            t.category = newCat;
            t.confidence = 0.99;
            t.method = 'manual';
        }
        this.save(txns);
        return txns;
    }

    // ----- CSV import / export ----------------------------------------

    parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
        const txns = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = this._splitCSVLine(lines[i]);
            if (cols.length < 2) continue;

            const row = {};
            headers.forEach((h, idx) => row[h] = (cols[idx] || '').trim().replace(/^['"]|['"]$/g, ''));

            const merchant = row.merchant || row.description || row.name || row.payee || cols[0];
            const amount   = parseFloat(row.amount || row.value || cols[1]) || 0;
            const date     = row.date || row.transaction_date || row.trans_date || new Date().toISOString().slice(0, 10);

            const result = this.categorizer.categorize(merchant, amount);
            txns.push({
                id: this._id(),
                date: this._normalizeDate(date),
                merchant: merchant.trim(),
                amount: Math.abs(amount),
                category: row.category || result.category,
                confidence: result.confidence,
                method: row.category ? 'imported' : result.method,
                notes: row.notes || ''
            });
        }
        return txns;
    }

    exportCSV(txns) {
        const header = 'Date,Merchant,Amount,Category,Confidence,Notes';
        const rows = txns.map(t =>
            `${t.date},"${t.merchant}",${t.amount.toFixed(2)},${t.category},${t.confidence},${(t.notes || '').replace(/"/g, '""')}`
        );
        return [header, ...rows].join('\n');
    }

    // ----- sample data ------------------------------------------------

    generateSampleData() {
        const now = new Date();
        const txns = [];
        const samples = [
            // Regular daily spending
            { m: 'Starbucks',           min: 4,   max: 8 },
            { m: 'Chipotle',            min: 9,   max: 14 },
            { m: 'Subway',              min: 7,   max: 12 },
            { m: 'McDonalds',           min: 5,   max: 11 },
            { m: 'Uber',                min: 8,   max: 25 },
            { m: 'Shell Gas Station',   min: 30,  max: 65 },
            { m: 'Amazon',              min: 12,  max: 80 },
            { m: 'Walmart',             min: 25,  max: 120 },
            { m: 'Target',              min: 15,  max: 90 },
            { m: 'Netflix',             min: 15,  max: 16 },
            { m: 'Spotify',             min: 10,  max: 11 },
            { m: 'Whole Foods',         min: 40,  max: 130 },
            { m: 'Planet Fitness',      min: 25,  max: 26 },
            { m: 'CVS Pharmacy',        min: 8,   max: 45 },
            { m: 'AT&T',               min: 85,  max: 90 },
            { m: 'Comcast Internet',    min: 70,  max: 75 },
            { m: 'Duke Energy',         min: 90,  max: 160 },
            { m: 'Trader Joes',         min: 35,  max: 80 },
            { m: 'Panera Bread',        min: 10,  max: 16 },
            { m: 'Lyft',                min: 10,  max: 30 },
            { m: 'Apple Store',         min: 10,  max: 50 },
            { m: 'Udemy',               min: 10,  max: 15 },
            { m: 'Adobe Creative Cloud',min: 55,  max: 56 },
            { m: 'Supercuts',           min: 18,  max: 30 },
            { m: 'Grubhub',             min: 15,  max: 40 },
            { m: 'Best Buy',            min: 20,  max: 200 },
            { m: 'Costco',              min: 80,  max: 250 },
            { m: 'Home Depot',          min: 20,  max: 150 },
            { m: 'Dominos Pizza',       min: 12,  max: 28 },
            { m: 'Sweetgreen',          min: 12,  max: 18 },
        ];

        // Generate ~90 days of data
        for (let d = 0; d < 90; d++) {
            const date = new Date(now);
            date.setDate(date.getDate() - d);
            const dateStr = date.toISOString().slice(0, 10);

            // 1-5 transactions per day
            const count = 1 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                const s = samples[Math.floor(Math.random() * samples.length)];
                const amount = +(s.min + Math.random() * (s.max - s.min)).toFixed(2);
                const result = this.categorizer.categorize(s.m, amount);
                txns.push({
                    id: this._id(),
                    date: dateStr,
                    merchant: s.m,
                    amount,
                    category: result.category,
                    confidence: result.confidence,
                    method: result.method,
                    notes: ''
                });
            }
        }

        // Inject anomalies
        const anomalyDate1 = new Date(now);
        anomalyDate1.setDate(anomalyDate1.getDate() - 3);
        const anomalyDate2 = new Date(now);
        anomalyDate2.setDate(anomalyDate2.getDate() - 7);
        const anomalyDate3 = new Date(now);
        anomalyDate3.setDate(anomalyDate3.getDate() - 12);

        const anomalies = [
            { date: anomalyDate1.toISOString().slice(0, 10), merchant: 'Louis Vuitton',       amount: 2850.00, notes: 'Luxury purchase — flagged' },
            { date: anomalyDate1.toISOString().slice(0, 10), merchant: 'Michelin Star Dining', amount: 450.00,  notes: 'Anniversary dinner' },
            { date: anomalyDate2.toISOString().slice(0, 10), merchant: 'Delta Airlines',       amount: 1200.00, notes: 'Emergency flight' },
            { date: anomalyDate2.toISOString().slice(0, 10), merchant: 'Marriott Hotel',       amount: 890.00,  notes: 'Last-minute hotel' },
            { date: anomalyDate3.toISOString().slice(0, 10), merchant: 'Apple Store',          amount: 1299.00, notes: 'New MacBook Pro' },
            { date: anomalyDate3.toISOString().slice(0, 10), merchant: 'Best Buy',             amount: 650.00,  notes: '4K Monitor' },
        ];

        anomalies.forEach(a => {
            const result = this.categorizer.categorize(a.merchant, a.amount);
            txns.push({
                id: this._id(),
                date: a.date,
                merchant: a.merchant,
                amount: a.amount,
                category: result.category,
                confidence: result.confidence,
                method: result.method,
                notes: a.notes
            });
        });

        // Sort newest first
        txns.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
        return txns;
    }

    // ----- helpers ----------------------------------------------------

    _id() {
        return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    _normalizeDate(str) {
        const d = new Date(str);
        if (isNaN(d)) return new Date().toISOString().slice(0, 10);
        return d.toISOString().slice(0, 10);
    }

    _splitCSVLine(line) {
        const result = [];
        let cur = '', inQuote = false;
        for (const ch of line) {
            if (ch === '"') { inQuote = !inQuote; continue; }
            if (ch === ',' && !inQuote) { result.push(cur); cur = ''; continue; }
            cur += ch;
        }
        result.push(cur);
        return result;
    }
}

window.DataManager = DataManager;
