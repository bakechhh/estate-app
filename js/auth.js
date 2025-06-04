// auth.js - 認証関連の処理（修正版）
const Auth = {
    // 現在のユーザー情報を保持
    currentUser: null,
    currentUserProfile: null,

    // ログイン処理（データベース関数を使用）
    async login(userId, password) {
        try {
            console.log('Login attempt for user:', userId);
            
            // Step 1: データベース関数を呼び出してユーザー情報を取得
            const { data: authResult, error: authError } = await supabase
                .rpc('authenticate_user', {
                    p_user_code: userId,
                    p_password: password  // 注意：実際にはパスワードは使用しない
                });

            if (authError) {
                console.error('Authentication function error:', authError);
                return { success: false, error: 'システムエラーが発生しました' };
            }

            if (!authResult.success) {
                return { success: false, error: authResult.error };
            }

            const userData = authResult.user;
            console.log('User found:', userData.email);

            // Step 2: Supabase Authでログイン
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email: userData.email,
                password: password
            });

            if (signInError) {
                console.error('Sign in error:', signInError);
                
                if (signInError.message.includes('Invalid login credentials')) {
                    return { success: false, error: 'パスワードが正しくありません' };
                }
                return { success: false, error: 'ログインに失敗しました' };
            }

            // Step 3: ログイン成功後、改めてユーザープロファイルを取得
            const profile = await this.getUserProfile(authData.user.id);
            if (!profile) {
                console.error('Failed to get user profile after login');
                await supabase.auth.signOut();
                return { success: false, error: 'ユーザー情報の取得に失敗しました' };
            }

            // 成功
            this.currentUser = authData.user;
            this.currentUserProfile = profile;

            console.log('Login successful');
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

    // ユーザープロファイル取得（認証後のみ）
    async getUserProfile(userId) {
        try {
            console.log('Getting user profile for:', userId);
            
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

            console.log('Profile fetched successfully');
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

            console.log('Active session found for:', session.user.email);

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

        console.log('User authenticated:', authStatus.profile.user_name);
        
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
                console.log('User signed in:', session.user.email);
            } else if (event === 'TOKEN_REFRESHED') {
                console.log('Token refreshed');
            }
        });
    }
};

// グローバルスコープに公開
window.Auth = Auth;
