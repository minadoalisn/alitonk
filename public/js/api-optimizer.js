/**
 * API 优化补丁 v2.0
 * 解决：API超时导致页面加载阻塞
 */

(function() {
    'use strict';
    
    // API配置
    const API_CONFIG = {
        price: {
            // 备用API列表（按优先级）
            urls: [
                'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,tether&vs_currencies=usd',
                'https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","USDTUSD"]'
            ],
            timeout: 3000,
            cacheTime: 60000 // 缓存1分钟
        },
        aliPrice: {
            // 自定义价格API（使用fallback）
            fallback: { price: 1.00, change: 0 }
        }
    };
    
    // 缓存
    const cache = new Map();
    
    // 安全的fetch with timeout
    async function safeFetch(url, timeout = 3000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                mode: 'cors'
            });
            clearTimeout(timeoutId);
            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            return null;
        }
    }
    
    // 带缓存的API调用
    async function cachedFetch(key, fetchFn, cacheTime) {
        const cached = cache.get(key);
        if (cached && Date.now() - cached.time < cacheTime) {
            return cached.data;
        }
        
        const data = await fetchFn();
        if (data) {
            cache.set(key, { data, time: Date.now() });
        }
        return data;
    }
    
    // 全局API管理器
    window.APIManager = {
        async getPrices() {
            return cachedFetch('prices', async () => {
                for (const url of API_CONFIG.price.urls) {
                    const data = await safeFetch(url, API_CONFIG.price.timeout);
                    if (data) return data;
                }
                return API_CONFIG.aliPrice.fallback;
            }, API_CONFIG.price.cacheTime);
        },
        
        async getALIPrice() {
            return cachedFetch('aliPrice', async () => {
                // 尝试多个ALI价格源
                const sources = [
                    'https://43.160.238.228:3333/api/ali/price',
                    'https://api.coingecko.com/api/v3/simple/price?ids=ali-token&vs_currencies=usd'
                ];
                
                for (const url of sources) {
                    const data = await safeFetch(url, API_CONFIG.price.timeout);
                    if (data) return data;
                }
                
                return API_CONFIG.aliPrice.fallback;
            }, API_CONFIG.price.cacheTime);
        },
        
        // 降级显示（API失败时）
        getFallbackData(type) {
            const fallbacks = {
                btc: { usd: 65000 },
                eth: { usd: 3500 },
                bnb: { usd: 600 },
                sol: { usd: 150 },
                usdt: { usd: 1 }
            };
            return fallbacks[type] || { usd: 0 };
        }
    };
    
    // 自动优化现有fetch调用
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        if (typeof url === 'string') {
            // 为外部API添加超时
            if (url.includes('api.coingecko') || url.includes('43.160.238.228')) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                try {
                    const response = await originalFetch(url, {
                        ...options,
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    return response;
                } catch (error) {
                    clearTimeout(timeoutId);
                    console.warn('API fetch failed, using fallback:', url);
                    // 返回一个假的response对象
                    return {
                        ok: true,
                        json: async () => ({ error: 'timeout', fallback: true })
                    };
                }
            }
        }
        return originalFetch(url, options);
    };
    
    console.log('✅ API Optimizer v2.0 loaded - Performance enhanced');
})();
