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
        
        // 案件件数の詳細表示
        document.getElementById('monthly-deals').textContent = 
            `${monthlyStats.dealCount}件`;
        document.getElementById('deal-breakdown').innerHTML = `
            <span>売買: ${monthlyStats.realEstateCount}件</span><br>
            <span>リフォーム: ${monthlyStats.renovationCount}件</span><br>
            <span>その他: ${monthlyStats.otherCount}件</span>
        `;
        
        // 在庫物件数の詳細表示（取引様態ごと）
        document.getElementById('inventory-count').textContent = 
            `${propertyStats.activeCount}件`;
        document.getElementById('inventory-breakdown').innerHTML = `
            <span>売主: ${propertyStats.sellerCount}件</span><br>
            <span>専任媒介: ${propertyStats.exclusiveCount}件</span><br>
            <span>一般媒介: ${propertyStats.generalCount}件</span><br>
            <span>その他: ${propertyStats.otherModeCount}件</span>
        `;
        
        // 在庫総額（売主物件のみ）
        document.getElementById('inventory-value').textContent = 
            EstateApp.formatCurrency(propertyStats.sellerValue);
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
            let displayName = '';
            let amount = 0;
            
            // 案件名があればそれを優先、なければ物件名または顧客名
            displayName = sale.dealName || sale.propertyName || sale.customerName;
            
            switch (sale.type) {
                case 'realestate':
                    amount = sale.profit;
                    break;
                case 'renovation':
                    amount = sale.profit;
                    break;
                case 'other':
                    amount = sale.amount;
                    break;
            }
            
            const collectionStatus = sale.collectionStatus || 'pending';
            const collectionIcon = collectionStatus === 'collected' ? '✓' : '⏳';
            const collectionClass = collectionStatus === 'collected' ? 'collected' : 'pending';
            
            return `
                <div class="transaction-item">
                    <div class="transaction-info">
                        <div class="transaction-property">${displayName}</div>
                        <div class="transaction-date">${EstateApp.formatDate(sale.date)}</div>
                    </div>
                    <div class="transaction-amount">
                        ${EstateApp.formatCurrency(amount)}
                        <span class="collection-status ${collectionClass}" title="${collectionStatus === 'collected' ? '回収済' : '未回収'}">${collectionIcon}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// グローバルスコープに公開
window.Dashboard = Dashboard;
