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
                        ${sale.saleNumber ? `
                            <div class="detail-item">
                                <span class="detail-label">売上番号：</span>
                                <span class="detail-value">${sale.saleNumber}</span>
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">顧客名：</span>
                            <span class="detail-value">${sale.customerName}</span>
                        </div>
                        ${sale.type === 'realestate' ? `
                            <div class="detail-item">
                                <span class="detail-label">成約価格：</span>
                                <span class="detail-value">${EstateApp.formatCurrency(sale.salePrice)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">決済期日：</span>
                                <span class="detail-value">${EstateApp.formatDate(sale.settlementDate)}</span>
                            </div>
                            ${sale.loanConditionDate ? `
                                <div class="detail-item">
                                    <span class="detail-label">融資特約期日：</span>
                                    <span class="detail-value">${EstateApp.formatDate(sale.loanConditionDate)}</span>
                                </div>
                            ` : ''}
                            ${sale.collectionDate ? `
                                <div class="detail-item">
                                    <span class="detail-label">回収日：</span>
                                    <span class="detail-value">${EstateApp.formatDate(sale.collectionDate)}</span>
                                </div>
                            ` : ''}
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
                            <button class="info-btn" onclick="Memos.showMemoModal('transaction', '${sale.id}', '${displayName}')">メモ</button>
                            <button class="primary-btn" onclick="Transactions.editTransaction('${sale.id}')">編集</button>
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
            const updates = { collectionStatus: newStatus };
            
            // 回収済みにする場合は今日の日付を回収日として設定
            if (newStatus === 'collected') {
                updates.collectionDate = new Date().toISOString().split('T')[0];
                
                // 物件のステータスを取引完了に更新
                if (sale.propertyId) {
                    Storage.updateProperty(sale.propertyId, { status: 'completed' });
                }
            } else {
                updates.collectionDate = null;
                
                // 物件のステータスを契約済みに戻す
                if (sale.propertyId) {
                    Storage.updateProperty(sale.propertyId, { status: 'contracted' });
                }
            }
            
            Storage.updateSale(saleId, updates);
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
    },
    editTransaction(saleId) {
        const sale = Storage.getSales().find(s => s.id === saleId);
        if (!sale) return;
        
        const modal = document.getElementById('sale-edit-modal');
        const container = document.getElementById('sale-edit-form-container');
        const title = document.getElementById('sale-edit-modal-title');
        
        // タイトル設定
        title.textContent = `売上編集 - ${this.getTypeText(sale.type, sale.subType)}`;
        
        // フォームを生成
        let formHtml = '';
        
        if (sale.type === 'realestate') {
            formHtml = this.generateRealEstateEditForm(sale);
        } else if (sale.type === 'renovation') {
            formHtml = this.generateRenovationEditForm(sale);
        } else if (sale.type === 'other') {
            formHtml = this.generateOtherEditForm(sale);
        }
        
        container.innerHTML = formHtml;
        modal.style.display = 'flex';
        
        // フォームのイベントリスナーを設定
        this.setupEditFormListeners(sale);
        
        // モーダル背景クリックで閉じる
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeEditModal();
            }
        };
    },

    generateRealEstateEditForm(sale) {
        return `
            <form id="edit-sale-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label>売上番号</label>
                        <input type="text" id="edit-sale-number" value="${sale.saleNumber || ''}">
                    </div>
                    <div class="form-group">
                        <label>案件名</label>
                        <input type="text" id="edit-deal-name" value="${sale.dealName || ''}">
                    </div>
                    <div class="form-group full-width">
                        <label>物件名</label>
                        <input type="text" id="edit-property-name" value="${sale.propertyName || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>成約日</label>
                        <input type="date" id="edit-sale-date" value="${sale.date}" required>
                    </div>
                    <div class="form-group">
                        <label>決済期日</label>
                        <input type="date" id="edit-settlement-date" value="${sale.settlementDate}" required>
                    </div>
                    <div class="form-group">
                        <label>融資特約期日</label>
                        <input type="date" id="edit-loan-condition-date" value="${sale.loanConditionDate || ''}">
                    </div>
                    <div class="form-group">
                        <label>回収日</label>
                        <input type="date" id="edit-collection-date" value="${sale.collectionDate || ''}">
                    </div>
                    <div class="form-group">
                        <label>成約価格</label>
                        <input type="number" id="edit-sale-price" value="${sale.salePrice}" required>
                    </div>
                    <div class="form-group">
                        <label>諸経費</label>
                        <input type="number" id="edit-other-expenses" value="${sale.otherExpenses || 0}">
                    </div>
                    <div class="form-group full-width">
                        <label>顧客名</label>
                        <input type="text" id="edit-customer-name" value="${sale.customerName}" required>
                    </div>
                    <div class="form-group full-width">
                        <label>備考</label>
                        <textarea id="edit-notes" rows="3">${sale.notes || ''}</textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="primary-btn">更新</button>
                    <button type="button" class="secondary-btn" onclick="Transactions.closeEditModal()">キャンセル</button>
                </div>
            </form>
        `;
    },

    generateRenovationEditForm(sale) {
        return `
            <form id="edit-sale-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label>売上番号</label>
                        <input type="text" id="edit-sale-number" value="${sale.saleNumber || ''}">
                    </div>
                    <div class="form-group">
                        <label>案件名</label>
                        <input type="text" id="edit-deal-name" value="${sale.dealName || ''}">
                    </div>
                    <div class="form-group full-width">
                        <label>物件名/顧客名</label>
                        <input type="text" id="edit-property-name" value="${sale.propertyName}" required>
                    </div>
                    <div class="form-group">
                        <label>施工完了日</label>
                        <input type="date" id="edit-sale-date" value="${sale.date}" required>
                    </div>
                    <div class="form-group">
                        <label>回収日</label>
                        <input type="date" id="edit-collection-date" value="${sale.collectionDate || ''}">
                    </div>
                    <div class="form-group full-width">
                        <label>リフォーム内容</label>
                        <textarea id="edit-content" rows="3" required>${sale.content || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>原価</label>
                        <input type="number" id="edit-cost" value="${sale.cost}" required>
                    </div>
                    <div class="form-group">
                        <label>請求金額</label>
                        <input type="number" id="edit-price" value="${sale.price}" required>
                    </div>
                    <div class="form-group full-width">
                        <label>施工業者</label>
                        <input type="text" id="edit-contractor" value="${sale.contractor || ''}">
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="primary-btn">更新</button>
                    <button type="button" class="secondary-btn" onclick="Transactions.closeEditModal()">キャンセル</button>
                </div>
            </form>
        `;
    },

    generateOtherEditForm(sale) {
        return `
            <form id="edit-sale-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label>売上番号</label>
                        <input type="text" id="edit-sale-number" value="${sale.saleNumber || ''}">
                    </div>
                    <div class="form-group">
                        <label>案件名</label>
                        <input type="text" id="edit-deal-name" value="${sale.dealName || ''}">
                    </div>
                    <div class="form-group">
                        <label>収益種別</label>
                        <select id="edit-sub-type" required>
                            <option value="consulting" ${sale.subType === 'consulting' ? 'selected' : ''}>コンサルティング</option>
                            <option value="referral" ${sale.subType === 'referral' ? 'selected' : ''}>紹介料</option>
                            <option value="management" ${sale.subType === 'management' ? 'selected' : ''}>管理料</option>
                            <option value="other" ${sale.subType === 'other' ? 'selected' : ''}>その他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>発生日</label>
                        <input type="date" id="edit-sale-date" value="${sale.date}" required>
                    </div>
                    <div class="form-group">
                        <label>回収日</label>
                        <input type="date" id="edit-collection-date" value="${sale.collectionDate || ''}">
                    </div>
                    <div class="form-group">
                        <label>金額</label>
                        <input type="number" id="edit-amount" value="${sale.amount}" required>
                    </div>
                    <div class="form-group full-width">
                        <label>顧客名/案件名</label>
                        <input type="text" id="edit-customer-name" value="${sale.customerName}" required>
                    </div>
                    <div class="form-group full-width">
                        <label>内容詳細</label>
                        <textarea id="edit-description" rows="4" required>${sale.description || ''}</textarea>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="submit" class="primary-btn">更新</button>
                    <button type="button" class="secondary-btn" onclick="Transactions.closeEditModal()">キャンセル</button>
                </div>
            </form>
        `;
    },

    setupEditFormListeners(sale) {
        const form = document.getElementById('edit-sale-form');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateSaleData(sale);
        });
        
        // リフォームの場合、利益計算のリアルタイム更新
        if (sale.type === 'renovation') {
            const costInput = document.getElementById('edit-cost');
            const priceInput = document.getElementById('edit-price');
            
            if (costInput && priceInput) {
                costInput.addEventListener('input', () => this.calculateEditProfit());
                priceInput.addEventListener('input', () => this.calculateEditProfit());
            }
        }
    },

    calculateEditProfit() {
        const cost = parseInt(document.getElementById('edit-cost').value) || 0;
        const price = parseInt(document.getElementById('edit-price').value) || 0;
        // 利益計算のプレビューが必要な場合はここに実装
    },

    updateSaleData(sale) {
        let updates = {
            saleNumber: document.getElementById('edit-sale-number').value || null,
            dealName: document.getElementById('edit-deal-name').value || null,
            date: document.getElementById('edit-sale-date').value,
            collectionDate: document.getElementById('edit-collection-date').value || null,
            collectionStatus: document.getElementById('edit-collection-date').value ? 'collected' : 'pending'
        };
        
        if (sale.type === 'realestate') {
            updates = {
                ...updates,
                propertyName: document.getElementById('edit-property-name').value,
                settlementDate: document.getElementById('edit-settlement-date').value,
                loanConditionDate: document.getElementById('edit-loan-condition-date').value || null,
                salePrice: parseInt(document.getElementById('edit-sale-price').value),
                otherExpenses: parseInt(document.getElementById('edit-other-expenses').value) || 0,
                customerName: document.getElementById('edit-customer-name').value,
                notes: document.getElementById('edit-notes').value
            };
            
            // 収益の再計算
            if (sale.transactionType === 'seller') {
                updates.profit = updates.salePrice - (sale.purchasePrice || 0) - updates.otherExpenses;
            } else {
                updates.profit = (sale.commission || 0) - updates.otherExpenses;
            }
            
        } else if (sale.type === 'renovation') {
            const cost = parseInt(document.getElementById('edit-cost').value);
            const price = parseInt(document.getElementById('edit-price').value);
            
            updates = {
                ...updates,
                propertyName: document.getElementById('edit-property-name').value,
                content: document.getElementById('edit-content').value,
                cost: cost,
                price: price,
                profit: price - cost,
                contractor: document.getElementById('edit-contractor').value
            };
            
        } else if (sale.type === 'other') {
            const amount = parseInt(document.getElementById('edit-amount').value);
            
            updates = {
                ...updates,
                subType: document.getElementById('edit-sub-type').value,
                amount: amount,
                profit: amount,
                customerName: document.getElementById('edit-customer-name').value,
                description: document.getElementById('edit-description').value
            };
        }
        
        // 更新実行
        Storage.updateSale(sale.id, updates);
        
        // 物件ステータスの更新（売買の場合）
        if (sale.type === 'realestate' && sale.propertyId) {
            if (updates.collectionStatus === 'collected') {
                Storage.updateProperty(sale.propertyId, { status: 'completed' });
            } else {
                Storage.updateProperty(sale.propertyId, { status: 'contracted' });
            }
        }
        
        this.closeEditModal();
        this.renderTransactionList();
        EstateApp.showToast('売上データを更新しました');
        
        // ダッシュボードを更新
        if (EstateApp.currentTab === 'dashboard') {
            Dashboard.refresh();
        }
    },

    closeEditModal() {
        document.getElementById('sale-edit-modal').style.display = 'none';
        document.getElementById('sale-edit-form-container').innerHTML = '';
    }
};

// グローバルスコープに公開
window.Transactions = Transactions;
