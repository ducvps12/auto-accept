# Antigravity Auto Accept & Retry

⚡ Automatically accepts commands and retries failed actions in Antigravity IDE.

## Features

- **Auto Accept** — Automatically clicks "Accept" buttons for command approval
- **Auto Retry** — Automatically clicks "Retry" buttons when actions fail  
- **Toggle Controls** — Enable/disable each feature independently
- **Debounced Clicking** — Prevents duplicate clicks
- **Cross-frame Scanning** — Searches both main document and iframes

## Browser Extension (Chrome)

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `ag-auto-accept-extension` folder
4. Click the ⚡ icon on toolbar → **Start**

## VS Code / IDE Extension

Install the `.vsix` file directly:
```
code --install-extension antigravity-auto-accept-0.1.0.vsix
```

Or install from the Extensions sidebar → `...` menu → **Install from VSIX...**

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Auto Accept | ✅ On | Auto-click accept buttons |
| Auto Retry | ✅ On | Auto-click retry buttons |
| Scroll Into View | ✅ On | Scroll button into view before clicking |
| Scan Interval | 2s | Time between scans |

## License

MIT
