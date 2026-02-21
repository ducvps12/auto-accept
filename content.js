// ═══════════════════════════════════════════════════════════
// ANTIGRAVITY AUTO-ACCEPT & RETRY — Content Script v2.0
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // Prevent double injection
    if (window.__agAutoActive) return;
    window.__agAutoActive = true;

    // ==================== CONFIG ====================
    const CONFIG = {
        SCAN_INTERVAL: 2000,
        CLICK_DELAY: 150,
        DEBOUNCE_MS: 400,
        // Accept button keywords (lowercase)
        BUTTON_KEYWORDS_ACCEPT: [
            'accept', 'run', 'approve', 'allow', 'confirm',
            'yes', 'ok', 'proceed', 'continue', 'execute'
        ],
        // Retry button keywords (lowercase)
        BUTTON_KEYWORDS_RETRY: [
            'retry', 'try again', 'rerun', 're-run', 'restart',
            'try once more', 'attempt again'
        ],
        // Class patterns that help identify IDE buttons (optional boost)
        BUTTON_CLASS_PATTERNS: [
            'hover:bg-ide-button-hover',
            'bg-ide-button-bac',
            'action-button',
            'btn-primary',
            'dialog-button'
        ],
        // Selectors for clickable elements
        CLICKABLE_SELECTORS: 'button, [role="button"], a.btn, a.button, div[role="button"], span[role="button"]',
    };

    // ==================== STATE ====================
    const state = {
        interval: null,
        observer: null,
        totalAcceptClicks: 0,
        totalRetryClicks: 0,
        totalScans: 0,
        autoAcceptEnabled: true,
        autoRetryEnabled: true,
        scrollIntoView: true,
        lastClickTime: 0,
        clickedButtons: new WeakSet(), // track already-clicked buttons
    };

    // ==================== MESSAGE HANDLER ====================
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        switch (msg.type) {
            case 'START':
                state.autoAcceptEnabled = msg.autoAccept !== undefined ? msg.autoAccept : true;
                state.autoRetryEnabled = msg.autoRetry !== undefined ? msg.autoRetry : true;
                state.scrollIntoView = msg.scrollIntoView !== undefined ? msg.scrollIntoView : true;
                startScanning();
                sendResponse({ ok: true });
                break;

            case 'STOP':
                stopScanning();
                sendResponse({ ok: true });
                break;

            case 'UPDATE_SETTINGS':
                if (msg.autoAccept !== undefined) state.autoAcceptEnabled = msg.autoAccept;
                if (msg.autoRetry !== undefined) state.autoRetryEnabled = msg.autoRetry;
                if (msg.scrollIntoView !== undefined) state.scrollIntoView = msg.scrollIntoView;
                sendResponse({ ok: true });
                break;

            case 'GET_STATS':
                sendResponse({
                    acceptClicks: state.totalAcceptClicks,
                    retryClicks: state.totalRetryClicks,
                    scans: state.totalScans,
                    active: !!state.interval,
                });
                break;
        }
        return true; // keep channel open for async
    });

    // ==================== BUTTON FINDER ====================
    function getButtonText(el) {
        // Get text from element, aria-label, title, or value
        const text = (el.textContent || '').trim().toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        const value = (el.getAttribute('value') || '').toLowerCase();
        return { text, ariaLabel, title, value, combined: `${text} ${ariaLabel} ${title} ${value}` };
    }

    function isVisible(el) {
        if (!el) return false;
        if (el.disabled) return false;
        if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

        return true;
    }

    function matchesKeywords(combined, keywords) {
        return keywords.some(k => combined.includes(k));
    }

    function findButtons(doc) {
        const found = { accept: [], retry: [] };
        if (!doc) return found;

        try {
            const elements = doc.querySelectorAll(CONFIG.CLICKABLE_SELECTORS);
            elements.forEach(el => {
                if (!isVisible(el)) return;

                const { combined } = getButtonText(el);
                if (!combined.trim()) return;

                // Check accept keywords
                if (matchesKeywords(combined, CONFIG.BUTTON_KEYWORDS_ACCEPT)) {
                    found.accept.push(el);
                }

                // Check retry keywords
                if (matchesKeywords(combined, CONFIG.BUTTON_KEYWORDS_RETRY)) {
                    found.retry.push(el);
                }
            });
        } catch (e) { /* ignore cross-origin or DOM errors */ }

        return found;
    }

    function findAllButtons() {
        const allFound = { accept: [], retry: [] };

        // Check main document
        const mainFound = findButtons(document);
        allFound.accept.push(...mainFound.accept);
        allFound.retry.push(...mainFound.retry);

        // Check all accessible iframes
        try {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    const iframeFound = findButtons(iframeDoc);
                    allFound.accept.push(...iframeFound.accept);
                    allFound.retry.push(...iframeFound.retry);
                } catch (e) { /* cross-origin iframe */ }
            });
        } catch (e) { /* ignore */ }

        // Check shadow DOMs
        try {
            const shadowHosts = document.querySelectorAll('*');
            shadowHosts.forEach(host => {
                try {
                    if (host.shadowRoot) {
                        const shadowFound = findButtons(host.shadowRoot);
                        allFound.accept.push(...shadowFound.accept);
                        allFound.retry.push(...shadowFound.retry);
                    }
                } catch (e) { /* ignore */ }
            });
        } catch (e) { /* ignore */ }

        return allFound;
    }

    function clickButton(button, type) {
        const now = Date.now();
        if (now - state.lastClickTime < CONFIG.DEBOUNCE_MS) return false;

        // Skip if we already clicked this exact button instance
        if (state.clickedButtons.has(button)) return false;

        state.lastClickTime = now;
        state.clickedButtons.add(button);

        // Clear from clicked set after a delay (button might reappear)
        setTimeout(() => {
            state.clickedButtons.delete(button);
        }, 3000);

        const doClick = () => {
            try {
                // Dispatch proper mouse events for maximum compatibility
                button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                button.click(); // fallback native click

                if (type === 'accept') {
                    state.totalAcceptClicks++;
                    console.log(`⚡ [AG Auto] Accepted: "${button.textContent.trim().substring(0, 50)}"`);
                } else {
                    state.totalRetryClicks++;
                    console.log(`🔄 [AG Auto] Retried: "${button.textContent.trim().substring(0, 50)}"`);
                }
            } catch (e) {
                console.warn('[AG Auto] Click failed:', e);
            }
        };

        if (state.scrollIntoView) {
            try {
                button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) { /* ignore */ }
            setTimeout(doClick, CONFIG.CLICK_DELAY);
        } else {
            doClick();
        }

        return true;
    }

    // ==================== SCAN LOOP ====================
    function scan() {
        state.totalScans++;
        const found = findAllButtons();

        if (state.autoAcceptEnabled && found.accept.length > 0) {
            found.accept.forEach(btn => clickButton(btn, 'accept'));
        }

        if (state.autoRetryEnabled && found.retry.length > 0) {
            found.retry.forEach(btn => clickButton(btn, 'retry'));
        }
    }

    // ==================== MUTATION OBSERVER ====================
    function setupObserver() {
        if (state.observer) {
            state.observer.disconnect();
        }

        state.observer = new MutationObserver((mutations) => {
            // Only react to added nodes (new buttons appearing)
            let hasNewNodes = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    hasNewNodes = true;
                    break;
                }
            }
            if (hasNewNodes) {
                // Small delay to let the DOM settle
                setTimeout(() => scan(), 100);
            }
        });

        state.observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
        });
    }

    // ==================== START / STOP ====================
    function startScanning() {
        if (state.interval) clearInterval(state.interval);

        console.log('⚡ [AG Auto] Started — scanning every ' + CONFIG.SCAN_INTERVAL / 1000 + 's');

        // Initial scan
        scan();

        // Periodic scanning
        state.interval = setInterval(scan, CONFIG.SCAN_INTERVAL);

        // Also watch for DOM changes
        setupObserver();
    }

    function stopScanning() {
        if (state.interval) {
            clearInterval(state.interval);
            state.interval = null;
        }
        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }
        window.__agAutoActive = false;
        console.log('🛑 [AG Auto] Stopped');
    }

    // ==================== AUTO-START ====================
    // Check if already activated via storage
    try {
        chrome.storage.local.get(['isActive', 'autoAccept', 'autoRetry', 'scrollIntoView'], (data) => {
            if (chrome.runtime.lastError) {
                console.warn('[AG Auto] Storage error:', chrome.runtime.lastError.message);
                return;
            }

            if (data.autoAccept !== undefined) state.autoAcceptEnabled = data.autoAccept;
            if (data.autoRetry !== undefined) state.autoRetryEnabled = data.autoRetry;
            if (data.scrollIntoView !== undefined) state.scrollIntoView = data.scrollIntoView;

            if (data.isActive) {
                startScanning();
            }
        });
    } catch (e) {
        console.warn('[AG Auto] Could not read storage:', e);
    }
})();
