// ═══════════════════════════════════════════════════════════
// ANTIGRAVITY AUTO-ACCEPT & RETRY — Content Script
// ═══════════════════════════════════════════════════════════

(function () {
    'use strict';

    // Prevent double injection
    if (window.__agAutoActive) return;
    window.__agAutoActive = true;

    // ==================== CONFIG ====================
    const CONFIG = {
        SCAN_INTERVAL: 2000,
        CLICK_DELAY: 200,
        BUTTON_KEYWORDS_ACCEPT: ['accept', 'run', 'approve'],
        BUTTON_KEYWORDS_RETRY: ['retry', 'try again', 'rerun', 're-run'],
        BUTTON_CLASS_PATTERNS: ['hover:bg-ide-button-hover', 'bg-ide-button-bac'],
    };

    // ==================== STATE ====================
    const state = {
        interval: null,
        totalAcceptClicks: 0,
        totalRetryClicks: 0,
        totalScans: 0,
        autoAcceptEnabled: true,
        autoRetryEnabled: true,
        scrollIntoView: true,
        lastClickTime: 0,
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
                });
                break;
        }
        return true; // keep channel open for async
    });

    // ==================== BUTTON FINDER ====================
    function findButtons(doc) {
        const found = { accept: [], retry: [] };
        if (!doc) return found;

        try {
            const buttons = doc.querySelectorAll('button');
            buttons.forEach(button => {
                const text = (button.textContent || '').trim().toLowerCase();
                const className = button.className?.toString() || '';
                const isVisible = button.offsetWidth > 0 && button.offsetHeight > 0 && !button.disabled;

                if (!isVisible) return;

                const hasMatchingClass = CONFIG.BUTTON_CLASS_PATTERNS.some(p => className.includes(p));

                // Accept buttons
                if (CONFIG.BUTTON_KEYWORDS_ACCEPT.some(k => text.includes(k)) && hasMatchingClass) {
                    found.accept.push(button);
                }

                // Retry buttons — broader match (any retry-like button)
                if (CONFIG.BUTTON_KEYWORDS_RETRY.some(k => text.includes(k))) {
                    found.retry.push(button);
                }
            });
        } catch (e) { /* ignore */ }

        return found;
    }

    function findAllButtons() {
        const allFound = { accept: [], retry: [] };

        // Check main document
        const mainFound = findButtons(document);
        allFound.accept.push(...mainFound.accept);
        allFound.retry.push(...mainFound.retry);

        // Check all accessible iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                const iframeFound = findButtons(iframeDoc);
                allFound.accept.push(...iframeFound.accept);
                allFound.retry.push(...iframeFound.retry);
            } catch (e) { /* cross-origin */ }
        });

        return allFound;
    }

    function clickButton(button, type) {
        const now = Date.now();
        if (now - state.lastClickTime < 500) return; // debounce
        state.lastClickTime = now;

        const doClick = () => {
            button.click();
            if (type === 'accept') {
                state.totalAcceptClicks++;
                console.log(`⚡ [AG Auto] Accepted: "${button.textContent.trim().substring(0, 40)}"`);
            } else {
                state.totalRetryClicks++;
                console.log(`🔄 [AG Auto] Retried: "${button.textContent.trim().substring(0, 40)}"`);
            }
        };

        if (state.scrollIntoView) {
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(doClick, CONFIG.CLICK_DELAY);
        } else {
            doClick();
        }
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

    function startScanning() {
        if (state.interval) clearInterval(state.interval);
        console.log('⚡ [AG Auto] Started — scanning every ' + CONFIG.SCAN_INTERVAL / 1000 + 's');
        scan();
        state.interval = setInterval(scan, CONFIG.SCAN_INTERVAL);
    }

    function stopScanning() {
        if (state.interval) {
            clearInterval(state.interval);
            state.interval = null;
        }
        window.__agAutoActive = false;
        console.log('🛑 [AG Auto] Stopped');
    }

    // ==================== AUTO-START ====================
    // Check if already activated via storage
    chrome.storage.local.get(['isActive', 'autoAccept', 'autoRetry', 'scrollIntoView'], (data) => {
        if (data.autoAccept !== undefined) state.autoAcceptEnabled = data.autoAccept;
        if (data.autoRetry !== undefined) state.autoRetryEnabled = data.autoRetry;
        if (data.scrollIntoView !== undefined) state.scrollIntoView = data.scrollIntoView;

        if (data.isActive) {
            startScanning();
        }
    });
})();
