// Popup controller
(function () {
    const btnInject = document.getElementById('btnInject');
    const btnStop = document.getElementById('btnStop');
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const toggleAccept = document.getElementById('toggleAccept');
    const toggleRetry = document.getElementById('toggleRetry');
    const toggleScroll = document.getElementById('toggleScroll');
    const acceptCount = document.getElementById('acceptCount');
    const retryCount = document.getElementById('retryCount');

    // Load saved settings
    chrome.storage.local.get(['autoAccept', 'autoRetry', 'scrollIntoView', 'isActive'], (data) => {
        if (data.autoAccept !== undefined) toggleAccept.checked = data.autoAccept;
        if (data.autoRetry !== undefined) toggleRetry.checked = data.autoRetry;
        if (data.scrollIntoView !== undefined) toggleScroll.checked = data.scrollIntoView;
        if (data.isActive) {
            setActive(true);
        }
    });

    // Save toggle changes
    toggleAccept.addEventListener('change', () => {
        chrome.storage.local.set({ autoAccept: toggleAccept.checked });
        sendToContent({ type: 'UPDATE_SETTINGS', autoAccept: toggleAccept.checked });
    });
    toggleRetry.addEventListener('change', () => {
        chrome.storage.local.set({ autoRetry: toggleRetry.checked });
        sendToContent({ type: 'UPDATE_SETTINGS', autoRetry: toggleRetry.checked });
    });
    toggleScroll.addEventListener('change', () => {
        chrome.storage.local.set({ scrollIntoView: toggleScroll.checked });
        sendToContent({ type: 'UPDATE_SETTINGS', scrollIntoView: toggleScroll.checked });
    });

    btnInject.addEventListener('click', () => {
        chrome.storage.local.set({ isActive: true });
        setActive(true);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id, allFrames: true },
                    files: ['content.js']
                });
                sendToContent({
                    type: 'START',
                    autoAccept: toggleAccept.checked,
                    autoRetry: toggleRetry.checked,
                    scrollIntoView: toggleScroll.checked
                });
            }
        });
    });

    btnStop.addEventListener('click', () => {
        chrome.storage.local.set({ isActive: false });
        setActive(false);
        sendToContent({ type: 'STOP' });
    });

    function setActive(active) {
        if (active) {
            statusBadge.className = 'status-badge active';
            statusText.textContent = 'Active';
            btnInject.textContent = '✅ Running';
            btnInject.disabled = true;
            btnInject.style.opacity = '0.6';
        } else {
            statusBadge.className = 'status-badge inactive';
            statusText.textContent = 'Inactive';
            btnInject.textContent = '▶ Start';
            btnInject.disabled = false;
            btnInject.style.opacity = '1';
        }
    }

    function sendToContent(message) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message).catch(() => { });
            }
        });
    }

    // Poll stats from content script
    setInterval(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }).then((resp) => {
                    if (resp) {
                        acceptCount.textContent = resp.acceptClicks || 0;
                        retryCount.textContent = resp.retryClicks || 0;
                    }
                }).catch(() => { });
            }
        });
    }, 2000);
})();
