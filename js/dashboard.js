// dashboard.js - ダッシュボード機能
const Dashboard = {
    chart: null,

    init() {
        this.refresh();
        this.initChart();
    },

    refresh() {
        this.updateSummary();
        this.updateDeadlineAlerts();
        this.updateRecentTransactions();
        this.updateChart();
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
                    propertyName = property ? property.name : sale.customerName;
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
    },

    initChart() {
        const canvas = document.getElementById('revenue-chart');
        const ctx = canvas.getContext('2d');
        
        // Canvas設定
        canvas.width = canvas.offsetWidth;
        canvas.height = 300;
        
        this.updateChart();
    },

    updateChart() {
        const canvas = document.getElementById('revenue-chart');
        const ctx = canvas.getContext('2d');
        
        // 過去6ヶ月のデータを取得
        const monthsData = [];
        const now = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const stats = Storage.getMonthlyStats(yearMonth);
            
            monthsData.push({
                month: `${date.getMonth() + 1}月`,
                revenue: stats.totalRevenue,
                realEstate: stats.realEstateRevenue,
                renovation: stats.renovationRevenue,
                other: stats.otherRevenue
            });
        }
        
        // グラフ描画
        const padding = 40;
        const width = canvas.width - padding * 2;
        const height = canvas.height - padding * 2;
        
        // クリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 最大値を計算
        const maxRevenue = Math.max(...monthsData.map(d => d.revenue), 1000000);
        
        // 軸を描画
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
        ctx.lineWidth = 1;
        
        // Y軸
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.stroke();
        
        // X軸
        ctx.beginPath();
        ctx.moveTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.stroke();
        
        // グリッド線とY軸ラベル
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        
        for (let i = 0; i <= 5; i++) {
            const y = padding + (height / 5) * i;
            const value = Math.round((maxRevenue / 5) * (5 - i));
            
            // グリッド線
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
            
            // ラベル
            ctx.fillText(`¥${(value / 1000000).toFixed(1)}M`, padding - 5, y + 4);
        }
        
        // 棒グラフを描画
        const barWidth = width / monthsData.length * 0.6;
        const barSpacing = width / monthsData.length;
        
        monthsData.forEach((data, index) => {
            const x = padding + barSpacing * index + barSpacing * 0.2;
            const barHeight = (data.revenue / maxRevenue) * height;
            const y = canvas.height - padding - barHeight;
            
            // 積み上げ棒グラフ
            let currentY = canvas.height - padding;
            
            // 売買収益
            if (data.realEstate > 0) {
                const h = (data.realEstate / maxRevenue) * height;
                ctx.fillStyle = '#4285f4';
                ctx.fillRect(x, currentY - h, barWidth, h);
                currentY -= h;
            }
            
            // リフォーム収益
            if (data.renovation > 0) {
                const h = (data.renovation / maxRevenue) * height;
                ctx.fillStyle = '#34a853';
                ctx.fillRect(x, currentY - h, barWidth, h);
                currentY -= h;
            }
            
            // その他収益
            if (data.other > 0) {
                const h = (data.other / maxRevenue) * height;
                ctx.fillStyle = '#fbbc04';
                ctx.fillRect(x, currentY - h, barWidth, h);
                currentY -= h;
            }
            
            // X軸ラベル
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(data.month, x + barWidth / 2, canvas.height - padding + 20);
        });
        
        // 凡例
        const legendY = 15;
        const legendItems = [
            { label: '売買', color: '#4285f4' },
            { label: 'リフォーム', color: '#34a853' },
            { label: 'その他', color: '#fbbc04' }
        ];
        
        let legendX = canvas.width - 200;
        legendItems.forEach(item => {
            // 色の四角
            ctx.fillStyle = item.color;
            ctx.fillRect(legendX, legendY, 15, 15);
            
            // ラベル
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, legendX + 20, legendY + 12);
            
            legendX += 60;
        });
    }
};

// グローバルスコープに公開
window.Dashboard = Dashboard;
