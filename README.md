# Antigravity Auto Accept & Retry ⚡

🛡️ **Update-Proof** — Không bao giờ hỏng khi IDE update!

Tự động Accept commands & Retry khi lỗi trong Antigravity IDE.

## Tại sao extension này khác biệt?

Các extension auto-accept khác dựa vào **CSS class** → mỗi lần Google update IDE, class thay đổi → extension hỏng.

Extension này sử dụng **Internal Antigravity Commands** trực tiếp:
- `antigravity.agent.acceptAgentStep`
- `antigravity.terminalCommand.accept`
- `antigravity.command.accept`
- Và tự động phát hiện commands mới qua **Command Discovery**

## Features

- **Auto Accept** — Tự động accept pending agent steps
- **Auto Retry** — Tự động retry khi command thất bại
- **Update-Proof** — Dùng internal API, không phụ thuộc CSS/DOM
- **Command Discovery** — Tự phát hiện commands mới khi IDE update
- **Toggle Controls** — Bật/tắt nhanh qua status bar hoặc `Ctrl+Alt+Shift+A`
- **Output Log** — Xem log chi tiết trong Output panel

## Cài đặt

### VS Code / Antigravity IDE Extension

1. Build file `.vsix`:
```
cd vscode-extension
npx -y @vscode/vsce package --allow-missing-repository --no-dependencies
```

2. Cài đặt vào IDE:
```
code --install-extension antigravity-auto-accept-0.3.0.vsix
```

Hoặc: Extensions sidebar → `...` menu → **Install from VSIX...**

### Chrome Extension (Backup)

1. Mở `chrome://extensions/`
2. Bật **Developer mode**
3. Click **Load unpacked** → chọn thư mục root của repo này
4. Click icon ⚡ → **Start**

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Auto Accept | ✅ On | Auto-accept pending agent steps |
| Auto Retry | ✅ On | Auto-retry failed commands |
| Scan Interval | 2s | Time between scans |
| Status Bar Position | Right | Vị trí nút toggle |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+Shift+A` | Toggle Auto-Accept ON/OFF |

## License

MIT

---

Made with ❤️ by [Nemark Digital](https://shop.nemarkdigital.com)
