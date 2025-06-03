// dashboard.js - ダッシュボード機能
const Dashboard = {
    init() {
        this.refresh();
        // カレンダーも初期化
        if (typeof Calendar !== 'undefined') {
            Calendar.render();
        }
    },

    refresh() {
        this.updateSummary();
        this.updateDeadlineAlerts();
        this.updateRecentTransactions();
    },

    updateSummary() {
        // 今月の統計を取得
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const monthlyStats = Storage.getMonthlyStats(yearMonth);
        const propertyStats = Storage.getPropertyStats();
        
        // サマリー表示を更新
        document.getElementById('monthly-revenue').textContent = 
            EstateApp.formatCurrency(monthlyStats.totalRevenue);
        document.getElementById('monthly-deals').textContent = 
            `${monthlyStats.dealCount}件`;
        document.getElementById('inventory-count').textContent = 
            `${propertyStats.active + propertyStats.negotiating}件`;
        document.getElementById('inventory-value').textContent = 
            EstateApp.formatCurrency(propertyStats.totalValue);
    },

    updateDeadlineAlerts() {
        const settings = Storage.getSettings();
        const deadlines = Storage.getUpcomingDeadlines(settings.notificationDays);
        const container = document.getElementById('deadline-alerts');
        
        if (deadlines.length === 0) {
            container.innerHTML = '<p class="no-data">期限が近い物件はありません</p>';
            return;
        }
        
        container.innerHTML = deadlines.slice(0, 5).map(deadline => `
            <div class="alert-item ${deadline.urgent ? 'urgent' : ''}">
                <div class="alert-property">${deadline.property.name}</div>
                <div class="alert-message">${deadline.message}</div>
            </div>
        `).join('');
    },

    updateRecentTransactions() {
        const sales = Storage.getSales();
        const container = document.getElementById('recent-transactions');
        
        if (sales.length === 0) {
            container.innerHTML = '<p class="no-data">取引履歴がありません</p>';
            return;
        }
        
        container.innerHTML = sales.slice(0, 5).map(sale => {
            let propertyName = '';
            let amount = 0;
            
            switch (sale.type) {
                case 'realestate':
                    const property = Storage.getProperty(sale.propertyId);
                    propertyName = property ? property.name : sale.propertyName || sale.customerName;
                    amount = sale.profit;
                    break;
                case 'renovation':
                    propertyName = sale.propertyName;
                    amount = sale.profit;
                    break;
                case 'other':
                    propertyName = sale.customerName;
                    amount = sale.amount;
                    break;
            }
            
            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-property">${propertyName}</div>
                        <div class="transaction-date">${EstateApp.formatDate(sale.date)}</div>
                    </div>
                    <div class="transaction-amount">${EstateApp.formatCurrency(amount)}</div>
                </div>
            `;
        }).join('');
    }
};

// グローバルスコープに公開
window.Dashboard = Dashboard;
