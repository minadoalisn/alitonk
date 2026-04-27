/**
 * ALI Charity - 生产优化脚本
 * 移除所有调试输出，提升性能
 */

(function() {
    'use strict';
    
    // 生产环境禁用console
    if (location.hostname !== 'localhost') {
        ['log', 'warn', 'info'].forEach(method => {
            console[method] = function() {};
        });
    }
    
    // 页面加载完成标记
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
        
        // 移除加载动画
        var loader = document.querySelector('.loader, .loading-overlay, #loader');
        if (loader) loader.style.display = 'none';
    });
    
    // 性能监控
    if (window.performance && window.performance.timing) {
        window.addEventListener('load', function() {
            setTimeout(function() {
                var timing = window.performance.timing;
                var loadTime = timing.loadEventEnd - timing.navigationStart;
                if (loadTime > 3000) {
                    console.warn('Page load time: ' + loadTime + 'ms');
                }
            }, 0);
        });
    }
    
    // 图片懒加载
    if ('IntersectionObserver' in window) {
        var lazyImages = document.querySelectorAll('img[data-src]');
        var imageObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });
        lazyImages.forEach(function(img) {
            imageObserver.observe(img);
        });
    }
    
    // 移动端菜单
    var menuBtn = document.querySelector('.menu-toggle, .mobile-menu-btn, #menuBtn');
    var nav = document.querySelector('nav, .nav-menu, #navMenu');
    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function() {
            nav.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });
    }
    
    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var targetId = this.getAttribute('href');
            if (targetId !== '#') {
                var target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
    
    // 表单验证增强
    document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function(e) {
            var required = form.querySelectorAll('[required]');
            var valid = true;
            required.forEach(function(field) {
                if (!field.value.trim()) {
                    valid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });
            if (!valid) {
                e.preventDefault();
            }
        });
    });
    
})();
