// UI Optimizer for ALI Charity
(function() {
    'use strict';
    
    document.addEventListener('DOMContentLoaded', function() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
        
        // Add transition to all interactive elements
        document.querySelectorAll('button, a, input, select').forEach(function(el) {
            el.style.transition = 'all 0.2s ease';
        });
        
        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', function() {
                const navLinks = document.getElementById('navLinks');
                if (navLinks) {
                    navLinks.classList.toggle('hidden');
                }
            });
        }
        
        console.log('[UI Optimizer] Loaded successfully');
    });
})();
