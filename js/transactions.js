// transactions.js - 取引管理機能
const Transactions = {
    filterSettings: {
        search: '',
        type: 'all',
        period: 'all',
        collectionStatus: 'all'
    },

    init() {
        this.setupEventListeners();
        this.renderTransactionList();
    },

    setupEventListeners() {
        // 検索・フィルター
        document.getElementById('transaction-search').addEventListener('input', (e) => {
            this.filterSettings.search = e.target.value.toLowerCase();
            this.renderTransactionList();
        });

        document.getElementById('transaction-type-filter').addEventListener('change', (e) => {
            this.filterSettings.type = e.target.value;
            this.renderTransactionList();
        });

        document.getElementById('transaction-period-filter').addEventListener('change', (e) => {
            this.filterSettings.period = e.target.value;
            this.renderTransactionList();
        });

        document.getElementById('collection-status-filter').addEventListener('change', (e) => {
            this.filterSettings.collectionStatus = e.target.value;
            this.renderTransactionList();
        });
    },

    renderTransactionList() {
        const sales = this.filterTransactions(Storage.getSales());
        const container = document.getElementById('transaction-list');
        
        if (sales.length === 0) {
            container.innerHTML = '<p class="no-data">取引データがありません</p>';
            return;
        }
        
        container.innerHTML = sales.map(sale => {
            let displayName = sale.dealName || sale.propertyName || sale.customerName;
            let typeText = this.getTypeText(sale.type, sale.subType);
            let amount = sale.profit || sale.amount || 0;
            let collectionStatus = sale.collectionStatus || 'pending';
            let collectionClass = collectionStatus === 'collected' ? 'collected' : 'pending';
            let collectionText = collectionStatus === 'collected' ? '回収済' : '未回収';
            
            return `
                <div class="transaction-card">
                    <div class="transaction-header">
                        <div>
                            <div class="transaction-title">${displayName}</div>
                            <div class="transaction-meta">
                                <span class="transaction-type">${typeText}</span>
                                <span class="transaction-date">${EstateApp.formatDate(sale.date)}</span>
                            </div>
                        </div>
                        <div class="transaction-status ${collectionClass}">
                            ${collectionText}
                        </div>
                    </div>
                    <div class="transaction-details">
                        <div class="detail-item">
                            <span class="detail-label">顧客名：</span>
                            <span class="detail-value">${sale.customerName}</span>
                        </div>
                        ${sale.type === 'realestate' ? `
                            <div class="detail-item">
                                <span class="detail-label">成約価格：</span>
                                <span class="detail-value">${EstateApp.formatCurrency(sale.salePrice)}</span>
                            </div>
                        ` : ''}
                        ${sale.notes || sale.content || sale.description ? `
                            <div class="detail-item full-width">
                                <span class="detail-label">備考：</span>
                                <span class="detail-value">${sale.notes || sale.content || sale.description}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="transaction-footer">
                        <div class="transaction-amount">
                            収益: ${EstateApp.formatCurrency(amount)}
                        </div>
                        <div class="transaction-actions">
                            <button class="secondary-btn" onclick="Transactions.toggleCollectionStatus('${sale.id}')">
                                ${collectionStatus === 'pending' ? '回収済にする' : '未回収に戻す'}
                            </button>
                            <button class="danger-btn" onclick="Transactions.deleteTransaction('${sale.id}')">削除</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    filterTransactions(sales) {
        const now = new Date();
        
        return sales.filter(sale => {
            // 検索フィルター
            if (this.filterSettings.search) {
                const searchTerm = this.filterSettings.search;
                const searchableText = `${sale.dealName || ''} ${sale.propertyName || ''} ${sale.customerName || ''}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }
            
            // 種別フィルター
            if (this.filterSettings.type !== 'all' && sale.type !== this.filterSettings.type) {
                return false;
            }
            
            // 期間フィルター
            if (this.filterSettings.period !== 'all') {
                const saleDate = new Date(sale.date);
                switch (this.filterSettings.period) {
                    case 'month':
                        if (saleDate.getMonth() !== now.getMonth() || saleDate.getFullYear() !== now.getFullYear()) {
                            return false;
                        }
                        break;
                    case 'quarter':
                        const currentQuarter = Math.floor(now.getMonth() / 3);
                        const saleQuarter = Math.floor(saleDate.getMonth() / 3);
                        if (saleQuarter !== currentQuarter || saleDate.getFullYear() !== now.getFullYear()) {
                            return false;
                        }
                        break;
                    case 'year':
                        if (saleDate.getFullYear() !== now.getFullYear()) {
                            return false;
                        }
                        break;
                }
            }
            
            // 回収状況フィルター
            if (this.filterSettings.collectionStatus !== 'all') {
                const status = sale.collectionStatus || 'pending';
                if (status !== this.filterSettings.collectionStatus) {
                    return false;
                }
            }
            
            return true;
        });
    },

    toggleCollectionStatus(saleId) {
        const sale = Storage.getSales().find(s => s.id === saleId);
        if (sale) {
            const newStatus = sale.collectionStatus === 'collected' ? 'pending' : 'collected';
            Storage.updateSale(saleId, { collectionStatus: newStatus });
            this.renderTransactionList();
            
            EstateApp.showToast(newStatus === 'collected' ? '回収済みに更新しました' : '未回収に更新しました');
            
            // ダッシュボードを更新
            if (EstateApp.currentTab === 'dashboard') {
                Dashboard.refresh();
            }
        }
    },

    deleteTransaction(saleId) {
        if (confirm('この取引を削除しますか？')) {
            Storage.deleteSale(saleId);
            this.renderTransactionList();
            EstateApp.showToast('取引を削除しました');
            
            // ダッシュボードを更新
            if (EstateApp.currentTab === 'dashboard') {
                Dashboard.refresh();
            }
        }
    },

    getTypeText(type, subType) {
        switch (type) {
            case 'realestate':
                return '売買';
            case 'renovation':
                return 'リフォーム';
            case 'other':
                return Reports.getOtherTypeText(subType);
            default:
                return type;
        }
    }
};

// グローバルスコープに公開
window.Transactions = Transactions;
