/**
 * ALI Charity - 简化版核心脚本
 * 合并所有价格更新逻辑，减少代码冗余
 */

(function() {
    'use strict';
    
    // ========== 配置 ==========
    const CONFIG = {
        priceApi: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,tether&vs_currencies=usd',
        cacheKey: 'ali_crypto_prices',
        cacheDuration: 300000,
        timeout: 3000,
        retryCount: 2
    };
    
    // ========== 工具函数 ==========
    const $ = (id) => document.getElementById(id);
    const formatPrice = (p) => {
        if (!p) return '$--';
        if (p >= 1) return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return '$' + (p >= 0.01 ? p.toFixed(4) : p.toFixed(6));
    };
    
    // ========== 缓存管理 ==========
    const getCache = () => {
        try {
            const cached = localStorage.getItem(CONFIG.cacheKey);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CONFIG.cacheDuration) return data;
            }
        } catch(e) {}
        return null;
    };
    
    const setCache = (data) => {
        try {
            localStorage.setItem(CONFIG.cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
        } catch(e) {}
    };
    
    // ========== 价格显示 ==========
    const displayPrices = (data) => {
        const map = {
            btcPrice: data.bitcoin?.usd,
            ethPrice: data.ethereum?.usd,
            bnbPrice: data.binancecoin?.usd,
            solPrice: data.solana?.usd,
            usdtPrice: data.tether?.usd || 1,
            aliPrice: data.tether?.usd || 1
        };
        
        Object.entries(map).forEach(([id, price]) => {
            const el = $(id);
            if (el) el.textContent = formatPrice(price);
        });
        
        // 隐藏加载器
        document.querySelectorAll('.price-loader, .loading').forEach(el => {
            el.style.display = 'none';
        });
    };
    
    // ========== API 获取 ==========
    const fetchPrices = async () => {
        try {
            const response = await fetch(CONFIG.priceApi, {
                signal: AbortSignal.timeout(CONFIG.timeout)
            });
            const data = await response.json();
            if (data) {
                setCache(data);
                displayPrices(data);
            }
        } catch(e) {
            console.warn('Price fetch failed:', e.message);
            const cached = getCache();
            if (cached) displayPrices(cached);
        }
    };
    
    // ========== 初始化 ==========
    const init = () => {
        // 先显示缓存
        const cached = getCache();
        if (cached) displayPrices(cached);
        
        // 延迟获取新价格
        setTimeout(fetchPrices, 1500);
        
        // 定时更新
        setInterval(fetchPrices, CONFIG.cacheDuration);
    };
    
    // DOM 加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // 暴露全局接口
    window.updateCryptoPrices = fetchPrices;
    window.displayCryptoPrices = displayPrices;
    
})();
