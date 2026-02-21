const vscode = require('vscode');

let statusBarItem;
let scanInterval;
let isActive = false;
let totalAccepts = 0;
let totalRetries = 0;

// ==================== BUTTON PATTERNS ====================
const ACCEPT_KEYWORDS = ['accept', 'run', 'approve'];
const RETRY_KEYWORDS = ['retry', 'try again', 'rerun', 're-run'];
const CLASS_PATTERNS = ['hover:bg-ide-button-hover', 'bg-ide-button-bac'];

// ==================== ACTIVATION ====================
function activate(context) {
    console.log('[AG Auto Accept] ⚡ Extension activated — by Nemark Digital');

    // Create status bar button (RIGHT side by default)
    const config = vscode.workspace.getConfiguration('agAutoAccept');
    const position = config.get('statusBarPosition', 'right');
    const alignment = position === 'right'
        ? vscode.StatusBarAlignment.Right
        : vscode.StatusBarAlignment.Left;

    statusBarItem = vscode.window.createStatusBarItem(alignment, 100);
    statusBarItem.command = 'agAutoAccept.toggle';
    context.subscriptions.push(statusBarItem);

    // Register all commands
    context.subscriptions.push(
        vscode.commands.registerCommand('agAutoAccept.start', () => startAutoAccept()),
        vscode.commands.registerCommand('agAutoAccept.stop', () => stopAutoAccept()),
        vscode.commands.registerCommand('agAutoAccept.toggle', () => {
            if (isActive) {
                stopAutoAccept();
            } else {
                startAutoAccept();
            }
        }),
        vscode.commands.registerCommand('agAutoAccept.showWelcome', () => {
            showWelcomePanel(context);
        })
    );

    // Listen for config changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('agAutoAccept')) {
                const newConfig = vscode.workspace.getConfiguration('agAutoAccept');
                if (isActive) {
                    // Restart with new settings
                    stopAutoAccept();
                    startAutoAccept();
                }
            }
        })
    );

    // Auto-start if enabled
    if (config.get('enabled', true)) {
        startAutoAccept();
    }

    updateStatusBar();

    // Show welcome on first install
    const hasShownWelcome = context.globalState.get('agAutoAccept.welcomeShown', false);
    if (!hasShownWelcome) {
        context.globalState.update('agAutoAccept.welcomeShown', true);
        showWelcomePanel(context);
    }
}

// ==================== START / STOP ====================
function startAutoAccept() {
    if (isActive) return;
    isActive = true;

    const config = vscode.workspace.getConfiguration('agAutoAccept');
    const interval = config.get('scanInterval', 2000);

    scanInterval = setInterval(() => {
        performScan();
    }, interval);

    updateStatusBar();
    console.log(`[AG Auto Accept] ▶ Started — scanning every ${interval}ms`);
}

function stopAutoAccept() {
    if (!isActive) return;
    isActive = false;

    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }

    updateStatusBar();
    console.log('[AG Auto Accept] ⏹ Stopped');
}

// ==================== SCAN ====================
function performScan() {
    const config = vscode.workspace.getConfiguration('agAutoAccept');
    const autoRetry = config.get('autoRetry', true);

    try {
        // VS Code quick input accept
        vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem').then(() => { }, () => { });
    } catch (e) { }

    // The main auto-click mechanism works through the content script
    // injected in the browser extension version.
    // For the IDE extension, we rely on VS Code's command system.
}

// ==================== STATUS BAR ====================
function updateStatusBar() {
    if (isActive) {
        statusBarItem.text = `$(zap) Auto-Accept: ON`;
        statusBarItem.tooltip = [
            '⚡ Antigravity Auto Accept & Retry',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            `✅ Accepted: ${totalAccepts}`,
            `🔄 Retried: ${totalRetries}`,
            '',
            '📌 Click to toggle OFF',
            '',
            '🏪 shop.nemarkdigital.com'
        ].join('\n');
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        statusBarItem.color = undefined;
    } else {
        statusBarItem.text = `$(circle-slash) Auto-Accept: OFF`;
        statusBarItem.tooltip = [
            '⚡ Antigravity Auto Accept & Retry',
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
            '⏸ Currently paused',
            '',
            '📌 Click to toggle ON',
            '',
            '🏪 shop.nemarkdigital.com'
        ].join('\n');
        statusBarItem.backgroundColor = undefined;
        statusBarItem.color = undefined;
    }
    statusBarItem.show();
}

// ==================== WELCOME PANEL ====================
function showWelcomePanel(context) {
    const panel = vscode.window.createWebviewPanel(
        'agAutoAcceptWelcome',
        '⚡ Auto Accept — Welcome',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getWelcomeHtml();
}

function getWelcomeHtml() {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0d1117;
        color: #e6edf3;
        padding: 0;
        line-height: 1.6;
    }

    .hero {
        background: linear-gradient(135deg, #0d1b2a 0%, #1b2838 50%, #0a192f 100%);
        padding: 60px 40px;
        text-align: center;
        border-bottom: 2px solid #30363d;
        position: relative;
        overflow: hidden;
    }
    .hero::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle at 30% 50%, rgba(56,189,248,0.08) 0%, transparent 50%),
                    radial-gradient(circle at 70% 50%, rgba(139,92,246,0.06) 0%, transparent 50%);
        animation: pulse 8s ease-in-out infinite;
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(1.1); opacity: 1; }
    }

    .hero-content { position: relative; z-index: 1; }
    .hero-icon { font-size: 64px; margin-bottom: 16px; }
    .hero h1 {
        font-size: 32px;
        font-weight: 800;
        background: linear-gradient(135deg, #58a6ff, #a78bfa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 8px;
    }
    .hero .subtitle {
        color: #8b949e;
        font-size: 16px;
        margin-bottom: 20px;
    }
    .hero .version-badge {
        display: inline-block;
        background: rgba(56,189,248,0.15);
        color: #58a6ff;
        padding: 4px 14px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        border: 1px solid rgba(56,189,248,0.2);
    }

    .container { max-width: 800px; margin: 0 auto; padding: 40px; }

    .section { margin-bottom: 40px; }
    .section h2 {
        font-size: 22px;
        font-weight: 700;
        color: #e6edf3;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .features {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
    }
    .feature-card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 12px;
        padding: 20px;
        transition: all 0.3s ease;
    }
    .feature-card:hover {
        border-color: #58a6ff;
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(56,189,248,0.1);
    }
    .feature-card .icon { font-size: 28px; margin-bottom: 10px; }
    .feature-card h3 { font-size: 15px; color: #e6edf3; margin-bottom: 6px; }
    .feature-card p { font-size: 13px; color: #8b949e; line-height: 1.5; }

    .guide-steps {
        counter-reset: step;
    }
    .step {
        display: flex;
        gap: 16px;
        margin-bottom: 20px;
        padding: 16px;
        background: #161b22;
        border-radius: 12px;
        border: 1px solid #30363d;
    }
    .step-num {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #58a6ff, #a78bfa);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 16px;
    }
    .step-content h3 { font-size: 15px; color: #e6edf3; margin-bottom: 4px; }
    .step-content p { font-size: 13px; color: #8b949e; }
    .step-content code {
        background: #0d1117;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 12px;
        color: #79c0ff;
        border: 1px solid #30363d;
    }

    .shop-banner {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 1px solid #e2725b;
        border-radius: 16px;
        padding: 30px;
        text-align: center;
        position: relative;
        overflow: hidden;
    }
    .shop-banner::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(135deg, rgba(226,114,91,0.08), rgba(255,154,0,0.05));
    }
    .shop-banner * { position: relative; z-index: 1; }
    .shop-banner h2 {
        justify-content: center;
        color: #ff9a00;
    }
    .shop-banner p { color: #b0b0b0; margin-bottom: 12px; }
    .shop-banner .shop-link {
        display: inline-block;
        background: linear-gradient(135deg, #e2725b, #ff9a00);
        color: white;
        padding: 10px 28px;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 700;
        font-size: 14px;
        transition: all 0.3s;
    }
    .shop-banner .shop-link:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 20px rgba(226,114,91,0.4);
    }
    .shop-banner .ultra-badge {
        display: inline-block;
        background: linear-gradient(135deg, #ffd700, #ffaa00);
        color: #1a1a2e;
        padding: 3px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 800;
        margin-left: 6px;
        text-transform: uppercase;
    }

    .footer {
        text-align: center;
        padding: 24px;
        color: #484f58;
        font-size: 12px;
        border-top: 1px solid #21262d;
        margin-top: 20px;
    }
    .footer a { color: #58a6ff; text-decoration: none; }
</style>
</head>
<body>

<div class="hero">
    <div class="hero-content">
        <div class="hero-icon">⚡</div>
        <h1>Antigravity Auto Accept & Retry</h1>
        <p class="subtitle">Tự động Accept commands & Retry khi lỗi — by Nemark Digital</p>
        <span class="version-badge">v0.2.0</span>
    </div>
</div>

<div class="container">

    <div class="section">
        <h2>✨ Tính năng</h2>
        <div class="features">
            <div class="feature-card">
                <div class="icon">✅</div>
                <h3>Auto Accept</h3>
                <p>Tự động nhấn Accept khi Antigravity yêu cầu phê duyệt command</p>
            </div>
            <div class="feature-card">
                <div class="icon">🔄</div>
                <h3>Auto Retry</h3>
                <p>Tự động Retry khi command thất bại, không cần thao tác thủ công</p>
            </div>
            <div class="feature-card">
                <div class="icon">⚡</div>
                <h3>Quick Toggle</h3>
                <p>Bật/tắt nhanh bằng nút ở status bar góc phải — 1 click là xong</p>
            </div>
            <div class="feature-card">
                <div class="icon">⚙️</div>
                <h3>Tùy chỉnh</h3>
                <p>Cấu hình scan interval, auto-start, vị trí nút trong Settings</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>📖 Hướng dẫn sử dụng</h2>
        <div class="guide-steps">
            <div class="step">
                <div class="step-num">1</div>
                <div class="step-content">
                    <h3>Cài đặt xong — tự động chạy</h3>
                    <p>Extension sẽ tự kích hoạt khi mở IDE. Bạn sẽ thấy <code>⚡ Auto-Accept: ON</code> ở góc phải dưới màn hình.</p>
                </div>
            </div>
            <div class="step">
                <div class="step-num">2</div>
                <div class="step-content">
                    <h3>Bật/Tắt nhanh</h3>
                    <p>Click vào nút <code>⚡ Auto-Accept: ON</code> trên status bar để toggle. Hoặc mở Command Palette <code>Ctrl+Shift+P</code> → gõ <code>Auto Accept: Toggle</code></p>
                </div>
            </div>
            <div class="step">
                <div class="step-num">3</div>
                <div class="step-content">
                    <h3>Tùy chỉnh Settings</h3>
                    <p>Mở <code>Ctrl+,</code> → tìm <code>Auto Accept</code> để thay đổi tốc độ scan, bật/tắt auto-retry, và vị trí nút status bar.</p>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="shop-banner">
            <h2>🏪 Nemark Digital Shop</h2>
            <p>Mua Account Ultra để sử dụng Antigravity không giới hạn!</p>
            <p style="font-size:14px; color:#ccc;">
                💎 <strong>Shop Account Ultra</strong> <span class="ultra-badge">Premium</span>
            </p>
            <p style="font-size:13px; color:#999; margin-bottom:16px;">
                Cung cấp tài khoản Antigravity chất lượng cao, hỗ trợ 24/7
            </p>
            <a class="shop-link" href="https://shop.nemarkdigital.com" target="_blank">
                🛒 Truy cập shop.nemarkdigital.com
            </a>
        </div>
    </div>

</div>

<div class="footer">
    Made with ❤️ by <a href="https://shop.nemarkdigital.com">Nemark Digital</a> •
    <a href="https://github.com/ducvps12/auto-accept">GitHub</a>
</div>

</body>
</html>`;
}

// ==================== DEACTIVATION ====================
function deactivate() {
    stopAutoAccept();
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    console.log('[AG Auto Accept] Extension deactivated');
}

module.exports = { activate, deactivate };
