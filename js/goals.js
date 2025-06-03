// goals.js - 目標管理・モチベーション機能
const Goals = {
    init() {
        this.setupEventListeners();
        this.loadCurrentGoals();
        this.checkAchievements();
    },

    setupEventListeners() {
        // 目標設定モーダルのイベントなど
    },

    loadCurrentGoals() {
        const goals = Storage.getGoals();
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyGoal = goals.find(g => g.period === currentMonth && g.type === 'monthly');
        
        if (monthlyGoal) {
            this.updateGoalProgress(monthlyGoal);
        }
    },

    updateGoalProgress(goal) {
        const stats = Storage.getMonthlyStats(goal.period);
        const progress = (stats.totalRevenue / goal.targetAmount) * 100;
        
        // ダッシュボードに目標進捗を表示
        const progressElement = document.getElementById('goal-progress');
        if (progressElement) {
            progressElement.innerHTML = `
                <div class="goal-progress-container">
                    <div class="goal-info">
                        <span>月間目標: ${EstateApp.formatCurrency(goal.targetAmount)}</span>
                        <span class="progress-percentage">${Math.round(progress)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                    ${progress >= 100 ? '<div class="goal-achieved">🎉 目標達成！</div>' : ''}
                </div>
            `;
        }
    },

    setGoal(type, period, targetAmount, targetCount) {
        const goal = {
            id: Date.now().toString(),
            type, // 'monthly' or 'yearly'
            period, // '2024-01' for monthly, '2024' for yearly
            targetAmount,
            targetCount,
            createdAt: new Date().toISOString()
        };
        
        Storage.saveGoal(goal);
        this.loadCurrentGoals();
        EstateApp.showToast('目標を設定しました');
    },

    checkAchievements() {
        const achievements = Storage.getAchievements();
        const sales = Storage.getSales();
        
        // 実績チェックロジック
        const newAchievements = [];
        
        // 初回成約
        if (sales.length === 1 && !achievements.find(a => a.id === 'first_sale')) {
            newAchievements.push({
                id: 'first_sale',
                name: '初めての一歩',
                description: '初めての成約を達成',
                icon: '🎯',
                unlockedAt: new Date().toISOString()
            });
        }
        
        // 月間10件達成
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyStats = Storage.getMonthlyStats(currentMonth);
        if (monthlyStats.dealCount >= 10 && !achievements.find(a => a.id === `monthly_10_${currentMonth}`)) {
            newAchievements.push({
                id: `monthly_10_${currentMonth}`,
                name: '月間マスター',
                description: '月間10件の成約を達成',
                icon: '🏆',
                unlockedAt: new Date().toISOString()
            });
        }
        
        // 新しい実績があれば保存して表示
        newAchievements.forEach(achievement => {
            Storage.saveAchievement(achievement);
            this.showAchievementUnlock(achievement);
        });
    },

    showAchievementUnlock(achievement) {
        const modal = document.createElement('div');
        modal.className = 'achievement-unlock-modal';
        modal.innerHTML = `
            <div class="achievement-unlock-content">
                <div class="achievement-icon">${achievement.icon}</div>
                <h2>実績解除！</h2>
                <h3>${achievement.name}</h3>
                <p>${achievement.description}</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // アニメーション後に削除
        setTimeout(() => {
            modal.classList.add('fade-out');
            setTimeout(() => modal.remove(), 500);
        }, 3000);
    },

    showEnhancedSuccessAnimation(sale) {
        // 基本のエフェクト
        Effects.showSaveEffect(sale.profit || sale.amount, true);
        
        // 追加の豪華なアニメーション
        const celebration = document.createElement('div');
        celebration.className = 'celebration-container';
        celebration.innerHTML = `
            <div class="confetti-container">
                ${this.generateConfetti(50)}
            </div>
            <div class="celebration-message">
                <h1>🎊 成約おめでとうございます！ 🎊</h1>
                <p class="deal-name">${sale.dealName || sale.propertyName || sale.customerName}</p>
                <p class="deal-amount">${EstateApp.formatCurrency(sale.profit || sale.amount)}</p>
            </div>
        `;
        
        document.body.appendChild(celebration);
        
        // 効果音を再生（オプション）
        this.playSuccessSound();
        
        setTimeout(() => {
            celebration.classList.add('fade-out');
            setTimeout(() => celebration.remove(), 1000);
        }, 5000);
        
        // 実績チェック
        this.checkAchievements();
    },

    generateConfetti(count) {
        let confetti = '';
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500'];
        
        for (let i = 0; i < count; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const left = Math.random() * 100;
            const animationDuration = 3 + Math.random() * 2;
            const animationDelay = Math.random() * 2;
            
            confetti += `<div class="confetti" style="
                left: ${left}%;
                background-color: ${color};
                animation-duration: ${animationDuration}s;
                animation-delay: ${animationDelay}s;
            "></div>`;
        }
        
        return confetti;
    },

    playSuccessSound() {
        // 効果音を再生（音声ファイルが必要）
        const audio = new Audio('sounds/success.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('効果音の再生に失敗しました'));
    },

    showRanking(period = 'monthly') {
        const rankings = Storage.getRankings(period);
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>🏆 ${period === 'monthly' ? '月間' : '年間'}ランキング</h3>
                <div class="ranking-list">
                    ${rankings.map((entry, index) => `
                        <div class="ranking-item ${index < 3 ? 'top-three' : ''}">
                            <div class="rank">${this.getRankIcon(index + 1)}</div>
                            <div class="rank-info">
                                <div class="rank-name">${entry.name}</div>
                                <div class="rank-stats">
                                    成約: ${entry.dealCount}件 / 
                                    売上: ${EstateApp.formatCurrency(entry.revenue)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
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
    },

    getRankIcon(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `${rank}位`;
        }
    }
};

// グローバルスコープに公開
window.Goals = Goals;
