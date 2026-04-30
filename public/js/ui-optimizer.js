// UI Optimizer - Improve user experience
(function() {
    'use strict';

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add loading state to buttons
    document.querySelectorAll('button, .btn').forEach(btn => {
        if (!btn.classList.contains('no-loading')) {
            btn.addEventListener('click', function() {
                const originalText = this.textContent;
                this.classList.add('opacity-50', 'cursor-not-allowed');
                setTimeout(() => {
                    this.classList.remove('opacity-50', 'cursor-not-allowed');
                }, 500);
            });
        }
    });

    // Improve accessibility
    document.querySelectorAll('input, textarea').forEach(input => {
        if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
            const label = input.closest('label');
            if (label) {
                const labelId = label.id || 'label-' + Math.random().toString(36).substr(2, 9);
                label.id = labelId;
                input.setAttribute('aria-labelledby', labelId);
            }
        }
    });

    console.log('UI Optimizer loaded');
})();