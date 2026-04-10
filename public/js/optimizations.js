// Performance Optimizations for ALI Charity
(function() {
    'use strict';
    
    // Remove console logs in production
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log = function() {};
        console.warn = function() {};
        console.info = function() {};
    }
    
    // Add loaded class when page is ready
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
    });
    
    // Service Worker registration (if available)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(function() {
            // Service worker not available, ignore
        });
    }
    
    // Performance monitoring
    if (window.performance && window.performance.timing) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                const timing = window.performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;
                console.log('[Performance] Page loaded in ' + loadTime + 'ms');
            }, 0);
        });
    }
    
    console.log('[Optimizations] Loaded successfully');
})();
