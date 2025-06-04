// auth.js - 認証関連の処理
const Auth = {
    // 現在のユーザー情報を保持
    currentUser: null,
    currentUserProfile: null,

    // ログイン処理
    async login(userId, password) {
        try {
            // まず、user_codeからユーザー情報を取得
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('id')
                .eq('user_code', userId)
                .eq('is_active', true)
                .single();

            if (userError || !userData) {
                console.error('User lookup error:', userError);
                return { success: false, error: '担当者IDが見つかりません' };
            }

            // ユーザーIDからAuthユーザーのメールアドレスを取得
            // 注意: 実際の実装では、usersテーブルにemailカラムを追加するか、
            // auth.usersビューを使用することを推奨
            const email = `${userId.toLowerCase()}@example.com`;
            
            // Supabase Authでログイン
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('Auth error:', error);
                
                // エラーメッセージを日本語化
                if (error.message.includes('Invalid login credentials')) {
                    return { success: false, error: '担当者IDまたはパスワードが正しくありません' };
                }
                return { success: false, error: 'ログインに失敗しました' };
            }

            // ユーザープロファイルを取得
            const profile = await this.getUserProfile(data.user.id);
            if (!profile) {
                await supabase.auth.signOut();
                return { success: false, error: 'ユーザー情報が見つかりません' };
            }

            // アクティブチェック
            if (!profile.is_active) {
                await supabase.auth.signOut();
                return { success: false, error: 'このアカウントは無効化されています' };
            }

            this.currentUser = data.user;
            this.currentUserProfile = profile;

            return { success: true, user: data.user, profile };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'ログイン処理中にエラーが発生しました' };
        }
    },

    // ログアウト処理
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            this.currentUserProfile = null;
            
            // ログインページへリダイレクト
            window.location.href = './login.html';
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    // ユーザープロファイル取得
    async getUserProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select(`
                    *,
                    store:stores(*)
                `)
                .eq('id', userId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user profile error:', error);
            return null;
        }
    },

    // 認証状態をチェック
    async checkAuth() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                return { authenticated: false };
            }

            // ユーザープロファイルを取得
            const profile = await this.getUserProfile(session.user.id);
            if (!profile || !profile.is_active) {
                await this.logout();
                return { authenticated: false };
            }

            this.currentUser = session.user;
            this.currentUserProfile = profile;

            return { 
                authenticated: true, 
                user: session.user, 
                profile 
            };
        } catch (error) {
            console.error('Check auth error:', error);
            return { authenticated: false };
        }
    },

    // 権限チェック
    hasRole(role) {
        return this.currentUserProfile?.role === role;
    },

    // 管理者権限チェック
    isAdmin() {
        return this.hasRole('admin');
    },

    // 同じ店舗のユーザーかチェック
    isSameStore(storeId) {
        return this.currentUserProfile?.store_id === storeId;
    },

    // 認証が必要なページの初期化
    async initProtectedPage() {
        const authStatus = await this.checkAuth();
        
        if (!authStatus.authenticated) {
            // 未認証の場合はログインページへ
            window.location.href = './login.html';
            return false;
        }

        // ユーザー情報をUIに反映（必要に応じて）
        this.updateUIWithUserInfo();
        
        return true;
    },

    // UIにユーザー情報を反映
    updateUIWithUserInfo() {
        // ヘッダーにユーザー名を表示するなど
        const profile = this.currentUserProfile;
        if (profile) {
            // 例: ヘッダーにユーザー名と店舗名を表示
            const headerElement = document.querySelector('header h1');
            if (headerElement) {
                headerElement.textContent = `不動産売買管理システム - ${profile.store.store_name}`;
            }
        }
    },

    // セッション変更の監視
    setupAuthListener() {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = './login.html';
            } else if (event === 'SIGNED_IN' && session) {
                // 必要に応じて処理
            }
        });
    }
};

// グローバルスコープに公開
window.Auth = Auth;
