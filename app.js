// PWA Web Wrapper - Main Application Logic

let currentUrl = '';
let iframe = null;

// DOM Elements
const inputContainer = document.getElementById('input-container');
const appContainer = document.getElementById('app-container');
const urlInput = document.getElementById('url-input');
const loadBtn = document.getElementById('load-btn');
const errorMessage = document.getElementById('error-message');
const backBtn = document.getElementById('back-btn');
const reloadBtn = document.getElementById('reload-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const closeBtn = document.getElementById('close-btn');
const currentUrlDisplay = document.getElementById('current-url');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    iframe = document.getElementById('app-frame');

    // Load button click handler
    loadBtn.addEventListener('click', loadWebApp);

    // Enter key handler
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadWebApp();
        }
    });

    // Toolbar button handlers
    backBtn.addEventListener('click', () => {
        try {
            iframe.contentWindow.history.back();
        } catch (e) {
            showError('뒤로가기를 실행할 수 없습니다.');
        }
    });

    reloadBtn.addEventListener('click', () => {
        if (iframe && currentUrl) {
            iframe.src = iframe.src;
        }
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    closeBtn.addEventListener('click', closeWebApp);

    // Check for saved URL
    const savedUrl = localStorage.getItem('lastLoadedUrl');
    if (savedUrl) {
        urlInput.value = savedUrl;
    }

    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
});

// Load web application
function loadWebApp() {
    const url = urlInput.value.trim();

    if (!url) {
        showError('URL을 입력해주세요.');
        return;
    }

    if (!isValidUrl(url)) {
        showError('올바른 URL을 입력해주세요. (예: https://example.com)');
        return;
    }

    clearError();
    currentUrl = url;

    // Save to localStorage
    localStorage.setItem('lastLoadedUrl', url);

    // Load the URL in iframe
    iframe.src = url;

    // Show app container, hide input container
    inputContainer.style.display = 'none';
    appContainer.style.display = 'flex';

    // Update current URL display
    updateUrlDisplay(url);

    // Handle iframe load error
    iframe.onerror = () => {
        showError('웹 어플리케이션을 로드할 수 없습니다.');
        closeWebApp();
    };
}

// Close web application
function closeWebApp() {
    iframe.src = 'about:blank';
    currentUrl = '';
    inputContainer.style.display = 'flex';
    appContainer.style.display = 'none';
    clearError();
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        appContainer.requestFullscreen().catch(err => {
            showError('전체화면을 활성화할 수 없습니다.');
        });
    } else {
        document.exitFullscreen();
    }
}

// Validate URL
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Clear error message
function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

// Update URL display
function updateUrlDisplay(url) {
    try {
        const urlObj = new URL(url);
        currentUrlDisplay.textContent = urlObj.hostname;
    } catch (e) {
        currentUrlDisplay.textContent = url;
    }
}

// Handle fullscreen change
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenBtn.textContent = '⛶';
        fullscreenBtn.title = '전체화면 종료';
    } else {
        fullscreenBtn.textContent = '⛶';
        fullscreenBtn.title = '전체화면';
    }
});
