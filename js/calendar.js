// calendar.js - カレンダー機能
const Calendar = {
    currentYearMonth: '',
    
    init() {
        this.currentYearMonth = this.getCurrentYearMonth();
        this.setupEventListeners();
    },

    setupEventListeners() {
        // カレンダー表示ボタン（ダッシュボードなどから）
        document.addEventListener('showCalendarWithDate', (e) => {
            this.currentYearMonth = e.detail.yearMonth;
            this.render();
        });
    },

    getCurrentYearMonth() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    render() {
        // カレンダービューをダッシュボードに統合
        const calendarContainer = document.getElementById('calendar-view');
        if (!calendarContainer) return;
        
        const [year, month] = this.currentYearMonth.split('-').map(Number);
        const monthSales = this.getMonthSalesData();
        
        calendarContainer.innerHTML = `
            <div class="calendar-header">
                <button class="month-nav-btn" onclick="Calendar.changeMonth(-1)">←</button>
                <h3>${year}年${month}月</h3>
                <button class="month-nav-btn" onclick="Calendar.changeMonth(1)">→</button>
            </div>
            <div class="calendar-container">
                ${this.generateCalendarGrid(year, month, monthSales)}
            </div>
        `;
    },

    changeMonth(direction) {
        const [year, month] = this.currentYearMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + direction, 1);
        this.currentYearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        this.render();
    },

    generateCalendarGrid(year, month, monthSales) {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const firstDayOfWeek = firstDay.getDay();
        const lastDate = lastDay.getDate();
        
        let html = `
            <div class="calendar-weekdays">
                <div class="weekday">日</div>
                <div class="weekday">月</div>
                <div class="weekday">火</div>
                <div class="weekday">水</div>
                <div class="weekday">木</div>
                <div class="weekday">金</div>
                <div class="weekday">土</div>
            </div>
            <div class="calendar-grid">
        `;
        
        // 前月の空白
        for (let i = 0; i < firstDayOfWeek; i++) {
            html += '<div class="calendar-day other-month"></div>';
        }
        
        // 当月の日付
        for (let day = 1; day <= lastDate; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const daySales = monthSales[dateStr];
            
            html += `<div class="calendar-day ${daySales ? 'has-sales' : ''}" 
                        onclick="Calendar.showDayDetail('${dateStr}')">
                        <div class="day-number">${day}</div>`;
            
            if (daySales) {
                html += `
                    <div class="day-sales">${EstateApp.formatCurrency(daySales.totalRevenue, false)}</div>
                    <div class="day-count">${daySales.count}件</div>
                `;
            }
            
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    },

    getMonthSalesData() {
        const [year, month] = this.currentYearMonth.split('-').map(Number);
        const sales = Storage.getSales();
        const monthSales = {};
        
        sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate.getFullYear() === year && saleDate.getMonth() + 1 === month) {
                const dateStr = saleDate.toISOString().split('T')[0];
                
                if (!monthSales[dateStr]) {
                    monthSales[dateStr] = {
                        date: dateStr,
                        sales: [],
                        totalRevenue: 0,
                        count: 0
                    };
                }
                
                const revenue = sale.profit || sale.amount || 0;
                monthSales[dateStr].sales.push(sale);
                monthSales[dateStr].totalRevenue += revenue;
                monthSales[dateStr].count++;
            }
        });
        
        return monthSales;
    },

    showDayDetail(dateStr) {
        const monthSales = this.getMonthSalesData();
        const daySales = monthSales[dateStr];
        
        if (!daySales || daySales.sales.length === 0) {
            EstateApp.showToast('この日の売上はありません');
            return;
        }
        
        // モーダルで詳細表示
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${new Date(dateStr).toLocaleDateString('ja-JP')}の売上</h3>
                <div class="day-sales-list">
                    ${daySales.sales.map(sale => {
                        let description = '';
                        let amount = 0;
                        
                        switch (sale.type) {
                            case 'realestate':
                                description = sale.propertyName || sale.customerName;
                                amount = sale.profit;
                                break;
                            case 'renovation':
                                description = sale.propertyName;
                                amount = sale.profit;
                                break;
                            case 'other':
                                description = sale.customerName;
                                amount = sale.amount;
                                break;
                        }
                        
                        return `
                            <div class="day-detail-item">
                                <div class="day-detail-title">${description}</div>
                                <div class="day-detail-info">
                                    ${EstateApp.formatCurrency(amount)}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="day-total">
                    <span>合計：</span>
                    <span>${EstateApp.formatCurrency(daySales.totalRevenue)}</span>
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">閉じる</button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.body.appendChild(modal);
    }
};

// グローバルスコープに公開
window.Calendar = Calendar;
