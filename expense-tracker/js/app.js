// ============================================================
// Main Application Controller
// ============================================================

class ExpenseApp {
    constructor() {
        this.categorizer = new TransactionCategorizer();
        this.anomalyDetector = new AnomalyDetector({ zThreshold: 2.0 });
        this.dataManager = new DataManager(this.categorizer);
        this.chartManager = new ChartManager(this.categorizer);

        this.transactions = [];
        this.anomalies = [];
        this.filteredTxns = [];
        this.dismissedAlerts = new Set(JSON.parse(localStorage.getItem('dismissed_alerts') || '[]'));

        // Pagination
        this.currentPage = 1;
        this.perPage = 15;

        // Filters
        this.searchTerm = '';
        this.categoryFilter = 'all';
        this.dateFilter = '30d';
        this.sortField = 'date';
        this.sortDir = 'desc';

        this._init();
    }

    _init() {
        const saved = this.dataManager.load();
        this.transactions = saved || this.dataManager.generateSampleData();
        if (!saved) this.dataManager.save(this.transactions);

        this.anomalies = this.anomalyDetector.detectAll(this.transactions);

        this._bindNavigation();
        this._bindHeader();
        this._bindModal();
        this._bindTableControls();
        this._bindImportExport();
        this._bindSettings();

        this._applyFilters();
        this._renderSummaryCards();
        this._renderCharts();
        this._renderAlerts();
        this._renderTable();
        this._updateAlertBadge();

        if (window.lucide) lucide.createIcons();
    }

    // ----- Navigation -------------------------------------------------

    _bindNavigation() {
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
                const section = document.getElementById(`page-${page}`);
                if (section) section.classList.add('active');

                const titles = {
                    dashboard: 'Overview',
                    transactions: 'Transactions',
                    analytics: 'Analytics',
                    alerts: 'Alerts',
                    settings: 'Settings'
                };
                document.getElementById('header-title').textContent = titles[page] || 'Overview';

                if (page === 'analytics') {
                    setTimeout(() => this._renderAnalyticsCharts(), 80);
                }

                document.querySelector('.sidebar')?.classList.remove('open');
                document.querySelector('.sidebar-overlay')?.classList.remove('visible');

                if (window.lucide) lucide.createIcons();
            });
        });

        document.getElementById('menu-toggle')?.addEventListener('click', () => {
            document.querySelector('.sidebar')?.classList.toggle('open');
            document.querySelector('.sidebar-overlay')?.classList.toggle('visible');
        });

        document.querySelector('.sidebar-overlay')?.addEventListener('click', () => {
            document.querySelector('.sidebar')?.classList.remove('open');
            document.querySelector('.sidebar-overlay')?.classList.remove('visible');
        });
    }

    _bindHeader() {
        document.getElementById('btn-add-txn')?.addEventListener('click', () => this._openModal('add'));
    }

    // ----- Modal ------------------------------------------------------

    _bindModal() {
        const overlay = document.getElementById('modal-overlay');
        const closeBtn = document.getElementById('modal-close');
        const cancelBtn = document.getElementById('modal-cancel');

        closeBtn?.addEventListener('click', () => this._closeModal());
        cancelBtn?.addEventListener('click', () => this._closeModal());
        overlay?.addEventListener('click', e => {
            if (e.target === overlay) this._closeModal();
        });

        document.getElementById('modal-save')?.addEventListener('click', () => this._handleModalSave());

        document.getElementById('txn-merchant')?.addEventListener('input', (e) => {
            const result = this.categorizer.categorize(e.target.value);
            const catSelect = document.getElementById('txn-category');
            if (catSelect && result.confidence > 0.5) {
                catSelect.value = result.category;
            }
        });
    }

    _openModal(mode) {
        const overlay = document.getElementById('modal-overlay');
        const title = document.getElementById('modal-title');

        if (mode === 'add') {
            title.textContent = 'New transaction';
            document.getElementById('txn-date').value = new Date().toISOString().slice(0, 10);
            document.getElementById('txn-merchant').value = '';
            document.getElementById('txn-amount').value = '';
            document.getElementById('txn-category').value = '';
            document.getElementById('txn-notes').value = '';
        }

        overlay.classList.add('visible');
    }

    _closeModal() {
        document.getElementById('modal-overlay').classList.remove('visible');
    }

    _handleModalSave() {
        const merchant = document.getElementById('txn-merchant').value.trim();
        const amount = parseFloat(document.getElementById('txn-amount').value);
        const date = document.getElementById('txn-date').value;
        const category = document.getElementById('txn-category').value;
        const notes = document.getElementById('txn-notes').value.trim();

        if (!merchant || isNaN(amount) || amount <= 0) {
            this._toast('Please enter a merchant and valid amount.', 'error');
            return;
        }

        const result = this.categorizer.categorize(merchant, amount);
        const txn = {
            date: date || new Date().toISOString().slice(0, 10),
            merchant,
            amount,
            category: category || result.category,
            confidence: category ? 0.99 : result.confidence,
            method: category ? 'manual' : result.method,
            notes
        };

        if (category && category !== result.category) {
            this.categorizer.learn(merchant, category);
        }

        this.transactions = this.dataManager.addTransaction(this.transactions, txn);
        this.anomalies = this.anomalyDetector.detectAll(this.transactions);

        this._closeModal();
        this._refresh();
        this._toast(`Added ${merchant} ($${amount.toFixed(2)})`, 'success');
    }

    // ----- Table Controls ---------------------------------------------

    _bindTableControls() {
        document.getElementById('search-input')?.addEventListener('input', e => {
            this.searchTerm = e.target.value.toLowerCase();
            this.currentPage = 1;
            this._applyFilters();
            this._renderTable();
        });

        document.getElementById('filter-category')?.addEventListener('change', e => {
            this.categoryFilter = e.target.value;
            this.currentPage = 1;
            this._applyFilters();
            this._renderTable();
        });

        document.getElementById('filter-date')?.addEventListener('change', e => {
            this.dateFilter = e.target.value;
            this.currentPage = 1;
            this._applyFilters();
            this._renderTable();
            this._renderSummaryCards();
            this._renderCharts();
        });

        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.sort;
                if (this.sortField === field) {
                    this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.sortField = field;
                    this.sortDir = field === 'date' || field === 'amount' ? 'desc' : 'asc';
                }
                this._applyFilters();
                this._renderTable();
            });
        });
    }

    // ----- Import / Export --------------------------------------------

    _bindImportExport() {
        const importBtn = document.getElementById('btn-import');
        const importOverlay = document.getElementById('import-modal-overlay');

        importBtn?.addEventListener('click', () => {
            importOverlay?.classList.add('visible');
            if (window.lucide) lucide.createIcons();
        });

        document.getElementById('import-modal-close')?.addEventListener('click', () => {
            importOverlay?.classList.remove('visible');
        });
        document.getElementById('import-cancel')?.addEventListener('click', () => {
            importOverlay?.classList.remove('visible');
        });

        importOverlay?.addEventListener('click', e => {
            if (e.target === importOverlay) importOverlay.classList.remove('visible');
        });

        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('csv-file-input');

        dropZone?.addEventListener('click', () => fileInput?.click());
        dropZone?.addEventListener('dragover', e => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone?.addEventListener('drop', e => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) this._importFile(file);
        });

        fileInput?.addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) this._importFile(file);
        });

        document.getElementById('btn-export')?.addEventListener('click', () => {
            const csv = this.dataManager.exportCSV(this.transactions);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            this._toast('Exported transactions as CSV', 'success');
        });
    }

    _importFile(file) {
        if (!file.name.endsWith('.csv')) {
            this._toast('Please upload a CSV file.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            const newTxns = this.dataManager.parseCSV(e.target.result);
            if (newTxns.length === 0) {
                this._toast('No valid transactions found in CSV.', 'error');
                return;
            }
            this.transactions = [...newTxns, ...this.transactions];
            this.transactions.sort((a, b) => b.date.localeCompare(a.date));
            this.dataManager.save(this.transactions);
            this.anomalies = this.anomalyDetector.detectAll(this.transactions);
            this._refresh();
            document.getElementById('import-modal-overlay')?.classList.remove('visible');
            this._toast(`Imported ${newTxns.length} transactions`, 'success');
        };
        reader.readAsText(file);
    }

    // ----- Settings ---------------------------------------------------

    _bindSettings() {
        document.getElementById('btn-reset-data')?.addEventListener('click', () => {
            if (confirm('Reset to standard sample transactions? Your existing entries will be replaced.')) {
                this.dataManager.clearAll();
                this.transactions = this.dataManager.generateSampleData();
                this.dataManager.save(this.transactions);
                this.anomalies = this.anomalyDetector.detectAll(this.transactions);
                this.dismissedAlerts.clear();
                localStorage.removeItem('dismissed_alerts');
                this._refresh();
                this._toast('Reset to sample dataset', 'info');
            }
        });

        document.getElementById('btn-clear-data')?.addEventListener('click', () => {
            if (confirm('Delete all stored transactions? This cannot be undone.')) {
                this.dataManager.clearAll();
                this.transactions = [];
                this.anomalies = [];
                this.dismissedAlerts.clear();
                localStorage.removeItem('dismissed_alerts');
                this._refresh();
                this._toast('All transactions cleared', 'info');
            }
        });

        document.getElementById('anomaly-threshold')?.addEventListener('change', e => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) {
                this.anomalyDetector.zThreshold = val;
                this.anomalies = this.anomalyDetector.detectAll(this.transactions);
                this._renderAlerts();
                this._updateAlertBadge();
                this._toast(`Sensitivity updated (${val}σ)`, 'info');
            }
        });
    }

    // ----- Data Filtering & Sorting -----------------------------------

    _applyFilters() {
        let txns = [...this.transactions];
        const now = new Date();

        if (this.dateFilter !== 'all') {
            const days = { '7d': 7, '30d': 30, '90d': 90 }[this.dateFilter] || 9999;
            const cutoff = new Date(now);
            cutoff.setDate(cutoff.getDate() - days);
            txns = txns.filter(t => new Date(t.date) >= cutoff);
        }

        if (this.categoryFilter !== 'all') {
            txns = txns.filter(t => t.category === this.categoryFilter);
        }

        if (this.searchTerm) {
            txns = txns.filter(t =>
                t.merchant.toLowerCase().includes(this.searchTerm) ||
                t.category.toLowerCase().includes(this.searchTerm) ||
                (t.notes || '').toLowerCase().includes(this.searchTerm)
            );
        }

        txns.sort((a, b) => {
            let va, vb;
            switch (this.sortField) {
                case 'date':     va = a.date; vb = b.date; break;
                case 'merchant': va = a.merchant.toLowerCase(); vb = b.merchant.toLowerCase(); break;
                case 'amount':   va = a.amount; vb = b.amount; break;
                case 'category': va = a.category; vb = b.category; break;
                default:         va = a.date; vb = b.date;
            }
            if (va < vb) return this.sortDir === 'asc' ? -1 : 1;
            if (va > vb) return this.sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        this.filteredTxns = txns;
    }

    // ----- Render Summary Cards ---------------------------------------

    _renderSummaryCards() {
        const txns = this.filteredTxns;
        const total = txns.reduce((s, t) => s + t.amount, 0);
        const categories = new Set(txns.map(t => t.category));
        const avgPerDay = this._avgPerDay(txns);
        const activeAlerts = this.anomalies.filter(a => !this.dismissedAlerts.has(a.transaction.id + '_' + a.type));

        document.getElementById('card-total').textContent = '$' + total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('card-txn-count').textContent = txns.length.toLocaleString();
        document.getElementById('card-categories').textContent = categories.size;
        document.getElementById('card-alerts').textContent = activeAlerts.length;
        document.getElementById('card-avg-daily').textContent = '$' + avgPerDay.toFixed(2);

        document.getElementById('card-total-sub').textContent = `${txns.length} transactions`;
        document.getElementById('card-avg-sub').textContent = `over ${this._uniqueDays(txns)} days`;
    }

    _avgPerDay(txns) {
        if (txns.length === 0) return 0;
        const days = this._uniqueDays(txns);
        return txns.reduce((s, t) => s + t.amount, 0) / Math.max(days, 1);
    }

    _uniqueDays(txns) {
        return new Set(txns.map(t => t.date)).size;
    }

    // ----- Render Charts ----------------------------------------------

    _renderCharts() {
        this.chartManager.renderCategoryChart('chart-category', this.filteredTxns);
        this.chartManager.renderTimelineChart('chart-timeline', this.filteredTxns);
    }

    _renderAnalyticsCharts() {
        this.chartManager.renderMerchantsChart('chart-merchants', this.filteredTxns);
        this.chartManager.renderWeeklyChart('chart-weekly', this.filteredTxns);
        this.chartManager.renderCategoryChart('chart-category-full', this.filteredTxns);
        this.chartManager.renderTimelineChart('chart-timeline-full', this.filteredTxns);
    }

    // ----- Render Alerts ----------------------------------------------

    _renderAlerts() {
        const containers = [
            document.getElementById('alerts-list'),
            document.getElementById('alerts-list-full')
        ].filter(Boolean);
        if (containers.length === 0) return;

        const active = this.anomalies.filter(a =>
            !this.dismissedAlerts.has(a.transaction.id + '_' + a.type)
        );

        if (active.length === 0) {
            const emptyHtml = `
                <div class="no-alerts">
                    <p>No unusual spending activity detected.</p>
                </div>`;
            containers.forEach(c => c.innerHTML = emptyHtml);
            return;
        }

        const html = active.map(a => {
            const key = a.transaction.id + '_' + a.type;
            const typeLabels = {
                'high-amount': 'Unusual amount',
                'category-spike': 'Category spike',
                'high-frequency': 'Frequent spending',
                'daily-spike': 'High daily spend'
            };
            return `
                <div class="alert-item ${a.severity}" data-key="${key}">
                    <div class="alert-severity"></div>
                    <div class="alert-content">
                        <div class="alert-title">${typeLabels[a.type] || a.type}</div>
                        <div class="alert-message">${a.message}</div>
                        <div class="alert-meta">
                            <span>${this._esc(a.transaction.merchant)}</span>
                            <span>&bull;</span>
                            <span>${a.transaction.date}</span>
                            <span>&bull;</span>
                            <span>${a.score}&sigma;</span>
                        </div>
                    </div>
                    <button class="alert-dismiss" onclick="app.dismissAlert('${key}')" title="Dismiss">&times;</button>
                </div>`;
        }).join('');
        containers.forEach(c => c.innerHTML = html);
    }

    dismissAlert(key) {
        this.dismissedAlerts.add(key);
        localStorage.setItem('dismissed_alerts', JSON.stringify([...this.dismissedAlerts]));
        this._renderAlerts();
        this._renderSummaryCards();
        this._updateAlertBadge();
    }

    _updateAlertBadge() {
        const badge = document.getElementById('alert-badge');
        const count = this.anomalies.filter(a =>
            !this.dismissedAlerts.has(a.transaction.id + '_' + a.type)
        ).length;
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    // ----- Render Transactions Table ----------------------------------

    _renderTable() {
        const tbody = document.getElementById('txn-tbody');
        if (!tbody) return;

        const start = (this.currentPage - 1) * this.perPage;
        const page = this.filteredTxns.slice(start, start + this.perPage);

        if (page.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align:center; padding:36px; color:var(--text-muted);">
                    <div style="font-size:0.85rem;">No transactions matching your criteria.</div>
                </td></tr>`;
        } else {
            tbody.innerHTML = page.map(t => {
                const info = this.categorizer.getCategoryInfo(t.category);
                const confColor = t.confidence > 0.8 ? '#059669' :
                                  t.confidence > 0.5 ? '#d97706' : '#dc2626';
                const confPct = Math.round(t.confidence * 100);
                const initial = (t.merchant || '?').trim().charAt(0).toUpperCase();

                return `
                    <tr>
                        <td style="color:var(--text-secondary); font-size:0.8rem;">${t.date}</td>
                        <td>
                            <div class="merchant-cell">
                                <div class="merchant-icon" style="background:#f3f4f6; color:#4b5563; font-weight:600; font-size:0.75rem;">
                                    ${initial}
                                </div>
                                <span class="merchant-name">${this._esc(t.merchant)}</span>
                            </div>
                        </td>
                        <td class="amount-cell">$${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                            <span class="category-badge" style="background:${info.bgColor}; color:${info.color}"
                                  onclick="app.showCategoryPicker(event, '${t.id}')">
                                <span style="width:6px; height:6px; border-radius:50%; background:${info.color}; display:inline-block; margin-right:4px;"></span>${t.category}
                            </span>
                            <div class="confidence-bar" title="${confPct}% confidence (${t.method})">
                                <div class="confidence-fill" style="width:${confPct}%; background:${confColor}"></div>
                            </div>
                        </td>
                        <td style="color:var(--text-muted); font-size:0.8rem;">${this._esc(t.notes || '—')}</td>
                        <td>
                            <button class="action-btn" onclick="app.deleteTransaction('${t.id}')" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        </td>
                    </tr>`;
            }).join('');
        }

        this._renderPagination();

        const footerInfo = document.getElementById('table-info');
        if (footerInfo) {
            const total = this.filteredTxns.length;
            const s = start + 1;
            const e = Math.min(start + this.perPage, total);
            footerInfo.textContent = total > 0 ? `Showing ${s}–${e} of ${total}` : 'No results';
        }

        if (window.lucide) lucide.createIcons();
    }

    _renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredTxns.length / this.perPage);
        if (totalPages <= 1) { container.innerHTML = ''; return; }

        let html = `<button class="page-btn" onclick="app.goPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>&lsaquo;</button>`;

        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

        if (startPage > 1) html += `<button class="page-btn" onclick="app.goPage(1)">1</button>`;
        if (startPage > 2) html += `<span style="color:var(--text-muted);padding:0 2px;">&hellip;</span>`;

        for (let p = startPage; p <= endPage; p++) {
            html += `<button class="page-btn ${p === this.currentPage ? 'active' : ''}" onclick="app.goPage(${p})">${p}</button>`;
        }

        if (endPage < totalPages - 1) html += `<span style="color:var(--text-muted);padding:0 2px;">&hellip;</span>`;
        if (endPage < totalPages) html += `<button class="page-btn" onclick="app.goPage(${totalPages})">${totalPages}</button>`;

        html += `<button class="page-btn" onclick="app.goPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>&rsaquo;</button>`;

        container.innerHTML = html;
    }

    goPage(p) {
        const totalPages = Math.ceil(this.filteredTxns.length / this.perPage);
        this.currentPage = Math.max(1, Math.min(p, totalPages));
        this._renderTable();
    }

    // ----- Category Picker (inline) -----------------------------------

    showCategoryPicker(event, txnId) {
        event.stopPropagation();

        document.querySelector('.category-dropdown')?.remove();

        const badge = event.currentTarget;
        const rect = badge.getBoundingClientRect();

        const dropdown = document.createElement('div');
        dropdown.className = 'category-dropdown';
        dropdown.style.top = (rect.bottom + window.scrollY + 4) + 'px';
        dropdown.style.left = (rect.left + window.scrollX) + 'px';

        const cats = this.categorizer.getAllCategories();
        dropdown.innerHTML = cats.map(cat => {
            const info = this.categorizer.getCategoryInfo(cat);
            return `<div class="cat-option" data-cat="${cat}">
                <span style="width:7px; height:7px; border-radius:50%; background:${info.color}; display:inline-block;"></span>
                <span>${cat}</span>
            </div>`;
        }).join('');

        dropdown.querySelectorAll('.cat-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const newCat = opt.dataset.cat;
                this.transactions = this.dataManager.updateCategory(this.transactions, txnId, newCat);
                this.anomalies = this.anomalyDetector.detectAll(this.transactions);
                dropdown.remove();
                this._refresh();
                this._toast(`Category updated to ${newCat}`, 'success');
            });
        });

        document.body.appendChild(dropdown);

        const closeHandler = (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    // ----- Delete Transaction -----------------------------------------

    deleteTransaction(id) {
        this.transactions = this.dataManager.deleteTransaction(this.transactions, id);
        this.anomalies = this.anomalyDetector.detectAll(this.transactions);
        this._refresh();
        this._toast('Transaction deleted', 'info');
    }

    // ----- Refresh All ------------------------------------------------

    _refresh() {
        this._applyFilters();
        this._renderSummaryCards();
        this._renderCharts();
        this._renderAlerts();
        this._renderTable();
        this._updateAlertBadge();
    }

    // ----- Toast Notifications ----------------------------------------

    _toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(6px)';
            toast.style.transition = '0.2s ease';
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    }

    _esc(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// ----- Boot -----------------------------------------------------------

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ExpenseApp();
});
