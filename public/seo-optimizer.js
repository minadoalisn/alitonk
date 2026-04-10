// SEO Optimizer for ALI Charity
(function() {
    'use strict';
    
    // Lazy load images for better performance
    document.addEventListener('DOMContentLoaded', function() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });
        images.forEach(function(img) {
            imageObserver.observe(img);
        });
        
        // Add loading="lazy" to all images
        document.querySelectorAll('img').forEach(function(img) {
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
        });
        
        console.log('[SEO Optimizer] Loaded successfully');
    });
})();
