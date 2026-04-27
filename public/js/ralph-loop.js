/**
 * Ralph-Loop 模式应用
 * 参考: Ralph Slatyer 的 React 性能优化模式
 * 
 * 核心思想:
 * 1. 组件记忆化 (Memoization)
 * 2. 防抖节流 (Debounce/Throttle)
 * 3. 虚拟列表 (Virtual List)
 * 4. 懒加载组件
 */

(function() {
    'use strict';
    
    // ========== Ralph-Loop 模式 1: 防抖 ==========
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // ========== Ralph-Loop 模式 2: 节流 ==========
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // ========== Ralph-Loop 模式 3: 记忆化 ==========
    const memoize = (fn) => {
        const cache = new Map();
        return (arg) => {
            if (cache.has(arg)) return cache.get(arg);
            const result = fn(arg);
            cache.set(arg, result);
            return result;
        };
    };
    
    // ========== Ralph-Loop 模式 4: 虚拟滚动 ==========
    class VirtualScroll {
        constructor(container, items, itemHeight) {
            this.container = container;
            this.items = items;
            this.itemHeight = itemHeight;
            this.scrollTop = 0;
            this.init();
        }
        
        init() {
            this.container.style.overflow = 'auto';
            this.container.style.height = '400px';
            
            const handleScroll = throttle((e) => {
                this.scrollTop = e.target.scrollTop;
                this.render();
            }, 16);
            
            this.container.addEventListener('scroll', handleScroll);
            this.render();
        }
        
        render() {
            const visibleHeight = this.container.clientHeight;
            const startIndex = Math.floor(this.scrollTop / this.itemHeight);
            const endIndex = Math.min(
                startIndex + Math.ceil(visibleHeight / this.itemHeight) + 2,
                this.items.length
            );
            
            const totalHeight = this.items.length * this.itemHeight;
            const offsetY = startIndex * this.itemHeight;
            
            let html = `<div style="height:${totalHeight}px;position:relative;">`;
            
            for (let i = startIndex; i < endIndex; i++) {
                html += `<div style="position:absolute;top:${i * this.itemHeight}px;width:100%;">${this.items[i]}</div>`;
            }
            
            html += '</div>';
            this.container.innerHTML = html;
        }
    }
    
    // ========== Ralph-Loop 模式 5: 懒加载图片 ==========
    function lazyLoadImages() {
        if (!('IntersectionObserver' in window)) {
            // 降级处理
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
            });
            return;
        }
        
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.dataset.lazy;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.01
        });
        
        document.querySelectorAll('img.lazy, img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // ========== Ralph-Loop 模式 6: 组件卸载优化 ==========
    function cleanupOnUnmount(element) {
        // 存储需要清理的数据
        const cleanupData = {
            intervals: [],
            timeouts: [],
            eventListeners: []
        };
        
        // 安全清理函数
        const safeCleanup = () => {
            cleanupData.intervals.forEach(id => clearInterval(id));
            cleanupData.timeouts.forEach(id => clearTimeout(id));
            cleanupData.eventListeners.forEach(({ element, event, handler }) => {
                element.removeEventListener(event, handler);
            });
        };
        
        // 封装的定时器
        const setIntervalSafe = (callback, ms) => {
            const id = setInterval(callback, ms);
            cleanupData.intervals.push(id);
            return id;
        };
        
        const setTimeoutSafe = (callback, ms) => {
            const id = setTimeout(callback, ms);
            cleanupData.timeouts.push(id);
            return id;
        };
        
        // 封装的事件监听
        const addEventSafe = (element, event, handler) => {
            element.addEventListener(event, handler);
            cleanupData.eventListeners.push({ element, event, handler });
        };
        
        // 元素卸载时自动清理
        if (element && element.parentNode) {
            const mutationObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.removedNodes.forEach(removed => {
                        if (removed === element) {
                            safeCleanup();
                            mutationObserver.disconnect();
                        }
                    });
                });
            });
            
            mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
        
        return {
            cleanup: safeCleanup,
            setInterval: setIntervalSafe,
            setTimeout: setTimeoutSafe,
            addEvent: addEventSafe
        };
    }
    
    // ========== Ralph-Loop 模式 7: 批量状态更新 ==========
    class BatchUpdater {
        constructor(callback) {
            this.callback = callback;
            this.pending = false;
            this.scheduled = false;
        }
        
        update(data) {
            this.data = data;
            if (!this.pending) {
                this.pending = true;
                requestAnimationFrame(() => {
                    this.callback(this.data);
                    this.pending = false;
                    this.scheduled = false;
                });
            }
        }
    }
    
    // ========== 初始化 ==========
    document.addEventListener('DOMContentLoaded', () => {
        lazyLoadImages();
        
        // 搜索框防抖
        const searchInput = document.querySelector('input[type="search"], input[name="search"]');
        if (searchInput) {
            const debouncedSearch = debounce((value) => {
                console.log('Searching for:', value);
                // 执行搜索
            }, 300);
            searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
        }
        
        // 滚动事件节流
        const handleScroll = throttle(() => {
            const scrollTop = window.pageYOffset;
            // 执行滚动相关操作
        }, 100);
        window.addEventListener('scroll', handleScroll);
    });
    
    // 暴露全局接口
    window.RalphLoop = {
        debounce,
        throttle,
        memoize,
        VirtualScroll,
        lazyLoadImages,
        cleanupOnUnmount,
        BatchUpdater
    };
    
})();
