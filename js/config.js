// config.js - Supabase設定
// 注意: 本番環境では環境変数を使用してください

const SUPABASE_CONFIG = {
    // ここにあなたのSupabaseプロジェクトの情報を入力
    url: 'https://xqophpmxaatkvxkvpfyh.supabase.co', // 例: https://xqophpmxaatkvxkvpfyh.supabase.co
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxb3BocG14YWF0a3Z4a3ZwZnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDkwODcsImV4cCI6MjA2NDYyNTA4N30.RaDuulH_RcdkV8o2Re4GWJME2rlWdBklBGDU7-23a8U' // 例: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
};

// Supabaseクライアントの初期化
let supabase;
if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}
