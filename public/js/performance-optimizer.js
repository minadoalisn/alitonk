/**
 * ALI Charity 前端性能优化方案
 * 目标：解决浏览器加载超时问题
 */

// 优化1：延迟加载非关键脚本
const deferScripts = () => {
    const scripts = document.querySelectorAll('script[async]');
    scripts.forEach(script => {
        script.setAttribute('defer', 'true');
        script.removeAttribute('async');
    });
};

// 优化2：API调用优化 - 使用Promise.race + 缓存
const fetchWithFallback = (urls, timeout = 3000) => {
    const fetchPromises = urls.map(url => 
        fetch(url).then(r => r.json()).catch(() => null)
    );
    
    return Promise.race([
        Promise.all(fetchPromises),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeout)
        )
    ]).catch(() => null);
};

// 优化3：价格更新延迟加载
const initPriceUpdates = () => {
    setTimeout(() => {
        if (typeof fetchALIPrice === 'function') {
            fetchALIPrice();
        }
    }, 2000); // 页面加载2秒后才获取价格
};

// 优化4：懒加载图片
const lazyLoadImages = () => {
    const images = document.querySelectorAll('img[data-src]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                observer.unobserve(img);
            }
        });
    });
    images.forEach(img => observer.observe(img));
};

// 页面加载完成后执行优化
document.addEventListener('DOMContentLoaded', () => {
    deferScripts();
    initPriceUpdates();
    lazyLoadImages();
});
