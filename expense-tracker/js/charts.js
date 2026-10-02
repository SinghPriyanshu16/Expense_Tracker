// ============================================================
// Chart Manager – renders dashboard charts via Chart.js
// Styled for clean light theme with subtle accents
// ============================================================

class ChartManager {
    constructor(categorizer) {
        this.categorizer = categorizer;
        this.charts = {};
    }

    destroyAll() {
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};
    }

    // ----- Category Doughnut ------------------------------------------

    renderCategoryChart(canvasId, transactions) {
        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        const byCategory = {};
        transactions.forEach(t => {
            byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
        });

        const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
        const labels = sorted.map(e => e[0]);
        const data   = sorted.map(e => +e[1].toFixed(2));
        const colors = labels.map(l => this.categorizer.getCategoryColor(l));

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverBorderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '72%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#374151',
                            padding: 10,
                            usePointStyle: true,
                            pointStyleWidth: 8,
                            font: { size: 12, family: "'Inter', sans-serif", weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        cornerRadius: 6,
                        padding: 10,
                        callbacks: {
                            label: ctx => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: $${ctx.raw.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // ----- Spending Timeline ------------------------------------------

    renderTimelineChart(canvasId, transactions) {
        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        const byDay = {};
        transactions.forEach(t => {
            byDay[t.date] = (byDay[t.date] || 0) + t.amount;
        });

        const sortedDays = Object.keys(byDay).sort();
        const data = sortedDays.map(d => +byDay[d].toFixed(2));

        // 7-day rolling average
        const rolling = data.map((_, i) => {
            const start = Math.max(0, i - 6);
            const window = data.slice(start, i + 1);
            return +(window.reduce((a, b) => a + b, 0) / window.length).toFixed(2);
        });

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedDays.map(d => {
                    const dt = new Date(d + 'T00:00:00');
                    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [
                    {
                        label: 'Daily',
                        data,
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.08)',
                        fill: true,
                        tension: 0.25,
                        pointRadius: 2,
                        pointHoverRadius: 5,
                        pointBackgroundColor: '#059669',
                        borderWidth: 2
                    },
                    {
                        label: '7-day average',
                        data: rolling,
                        borderColor: '#9ca3af',
                        borderDash: [4, 4],
                        fill: false,
                        tension: 0.25,
                        pointRadius: 0,
                        borderWidth: 1.5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    legend: {
                        labels: {
                            color: '#4b5563',
                            usePointStyle: true,
                            pointStyleWidth: 8,
                            font: { size: 12, family: "'Inter', sans-serif" }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        cornerRadius: 6,
                        padding: 10,
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: $${ctx.raw.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#f3f4f6' },
                        ticks: { color: '#9ca3af', maxTicksLimit: 10, font: { size: 11 } }
                    },
                    y: {
                        grid: { color: '#f3f4f6' },
                        ticks: {
                            color: '#9ca3af',
                            font: { size: 11 },
                            callback: v => '$' + v.toLocaleString()
                        }
                    }
                }
            }
        });
    }

    // ----- Top Merchants Bar ------------------------------------------

    renderMerchantsChart(canvasId, transactions) {
        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        const byMerchant = {};
        transactions.forEach(t => {
            byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + t.amount;
        });

        const sorted = Object.entries(byMerchant).sort((a, b) => b[1] - a[1]).slice(0, 8);
        const labels = sorted.map(e => e[0]);
        const data   = sorted.map(e => +e[1].toFixed(2));

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Spent',
                    data,
                    backgroundColor: '#10b981',
                    borderRadius: 4,
                    barPercentage: 0.65
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        cornerRadius: 6,
                        padding: 10,
                        callbacks: {
                            label: ctx => ` $${ctx.raw.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#f3f4f6' },
                        ticks: { color: '#9ca3af', font: { size: 11 }, callback: v => '$' + v }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#374151', font: { size: 12, weight: '500' } }
                    }
                }
            }
        });
    }

    // ----- Weekly Comparison ------------------------------------------

    renderWeeklyChart(canvasId, transactions) {
        if (this.charts[canvasId]) this.charts[canvasId].destroy();

        const byWeek = {};
        transactions.forEach(t => {
            const d = new Date(t.date + 'T00:00:00');
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            const key = weekStart.toISOString().slice(0, 10);
            byWeek[key] = (byWeek[key] || 0) + t.amount;
        });

        const sorted = Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));
        const labels = sorted.map(e => {
            const dt = new Date(e[0] + 'T00:00:00');
            return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        const data = sorted.map(e => +e[1].toFixed(2));
        const avg  = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;

        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Total',
                        data,
                        backgroundColor: data.map(v =>
                            v > avg * 1.3 ? '#ef4444' :
                            v < avg * 0.7 ? '#10b981' :
                            '#3b82f6'
                        ),
                        borderRadius: 4,
                        barPercentage: 0.6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#111827',
                        titleColor: '#f9fafb',
                        bodyColor: '#d1d5db',
                        cornerRadius: 6,
                        padding: 10,
                        callbacks: {
                            label: ctx => ` $${ctx.raw.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#f3f4f6' },
                        ticks: { color: '#9ca3af', font: { size: 11 }, maxRotation: 0 }
                    },
                    y: {
                        grid: { color: '#f3f4f6' },
                        ticks: { color: '#9ca3af', font: { size: 11 }, callback: v => '$' + v }
                    }
                }
            }
        });
    }
}

window.ChartManager = ChartManager;
