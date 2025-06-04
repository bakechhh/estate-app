// auth.js - 認証関連の処理（シンプル版）
const Auth = {
    // 現在のユーザー情報を保持
    currentUser: null,
    currentUserProfile: null,

    // ログイン処理（user_codeとパスワードでログイン）
    async login(userId, password) {
        try {
            // Step 1: user_codeからユーザー情報を取得
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('user_code', userId)
                .eq('is_active', true)
                .single();

            if (userError || !userData) {
                console.error('User not found:', userError);
                return { success: false, error: '担当者IDが見つかりません' };
            }

            // Step 2: 取得したメールアドレスでログイン
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: userData.email,
                password: password
            });

            if (authError) {
                console.error('Auth error:', authError);
                return { success: false, error: 'パスワードが正しくありません' };
            }

            // Step 3: ユーザープロファイルを取得（店舗情報含む）
            const profile = await this.getUserProfile(authData.user.id);
            if (!profile) {
                await supabase.auth.signOut();
                return { success: false, error: 'ユーザー情報の取得に失敗しました' };
            }

            // 成功
            this.currentUser = authData.user;
            this.currentUserProfile = profile;

            console.log('Login successful:', profile);
            return { success: true, user: authData.user, profile };

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
            alert('ログアウトに失敗しました');
        }
    },

    // ユーザープロファイル取得（店舗情報含む）
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

            if (error) {
                console.error('Profile fetch error:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Get user profile error:', error);
            return null;
        }
    },

    // 認証状態をチェック
    async checkAuth() {
        try {
            // 現在のセッションを取得
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error || !session) {
                console.log('No active session');
                return { authenticated: false };
            }

            // ユーザープロファイルを取得
            const profile = await this.getUserProfile(session.user.id);
            if (!profile) {
                console.error('Profile not found for authenticated user');
                await this.logout();
                return { authenticated: false };
            }

            // アクティブチェック
            if (!profile.is_active) {
                console.log('User is not active');
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
        console.log('Initializing protected page...');
        
        const authStatus = await this.checkAuth();
        
        if (!authStatus.authenticated) {
            console.log('Not authenticated, redirecting to login...');
            window.location.href = './login.html';
            return false;
        }

        console.log('User authenticated:', authStatus.profile);
        
        // ユーザー情報をUIに反映
        this.updateUIWithUserInfo();
        
        return true;
    },

    // UIにユーザー情報を反映
    updateUIWithUserInfo() {
        const profile = this.currentUserProfile;
        if (!profile) return;

        // ヘッダーのユーザー情報を更新
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            const roleIcon = profile.role === 'admin' ? '👑' : '👤';
            userInfo.innerHTML = `${roleIcon} ${profile.user_name} (${profile.store.store_name})`;
        }

        // ヘッダータイトルを更新（オプション）
        const headerTitle = document.querySelector('header h1');
        if (headerTitle) {
            headerTitle.textContent = `不動産売買管理システム - ${profile.store.store_name}`;
        }
    },

    // セッション変更の監視
    setupAuthListener() {
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);
            
            if (event === 'SIGNED_OUT') {
                window.location.href = './login.html';
            } else if (event === 'SIGNED_IN' && session) {
                // サインイン時の処理（必要に応じて）
                console.log('User signed in');
            }
        });
    }
};

// グローバルスコープに公開
window.Auth = Auth;
