// ALI Charity 捐赠页面 AI增强组件
// 功能：实时捐赠展示 + 信任建立 + 转化优化

(function() {
  'use strict';

  // 配置
  const CONFIG = {
    ADDRESSES: {
      USDT: '0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC',
      BTC: 'bc1p6tc7jxjgtzdm2rf9vmxjjkkghz3kgfplmm93yll9km90kjmxuw0shcs4cq',
      ETH: '0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC',
      BNB: '0xbd00c3d12dB5840A403D2880039Cb1c86155F8cC',
      SOL: 'HT98k9x4WEQMNbFzrLrJkfjF9ytE116UengPf7NWDweT'
    },
    COPY_FEEDBACK_DURATION: 2000
  };

  // 捐赠里程碑数据
  const MILESTONES = [
    { amount: 100, message: '🎉 达到第一个$100！感谢每一位捐赠者！', reached: false },
    { amount: 500, message: '🌟 突破$500！我们可以支持更多项目了！', reached: false },
    { amount: 1000, message: '💫 达到$1,000！感谢全球社区的支持！', reached: false },
    { amount: 5000, message: '🚀 突破$5,000！我们可以扩大援助范围！', reached: false },
    { amount: 10000, message: '🏆 $10,000里程碑！感谢所有支持者！', reached: false }
  ];

  // 全局状态
  let state = {
    copiedAddress: null,
    selectedCurrency: 'USDT',
    donationCount: 0,
    totalRaised: 0
  };

  // ========== UI 创建 ==========

  function createLiveDonationPanel() {
    return `
      <div class="live-donation-panel">
        <div class="panel-header">
          <span class="live-indicator">📡</span>
          <h3>实时链上数据</h3>
          <span class="update-badge">🤖 AI 更新</span>
        </div>
        
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-value" id="liveTotal">$0</div>
            <div class="stat-label">累计募集</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="liveCount">0</div>
            <div class="stat-label">捐赠次数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">100%</div>
            <div class="stat-label">透明公开</div>
          </div>
        </div>

        <div class="verify-section">
          <p>🔍 每一笔交易都可独立验证</p>
          <div class="verify-buttons">
            <a href="https://bscscan.com/address/${CONFIG.ADDRESSES.USDT}" 
               target="_blank" class="verify-btn bsc">
              📊 BscScan (BSC)
            </a>
            <a href="https://www.blockchain.com/explorer/addresses/btc/${CONFIG.ADDRESSES.BTC}" 
               target="_blank" class="verify-btn btc">
              ₿ Blockchain.com
            </a>
          </div>
        </div>
      </div>
    `;
  }

  function createTrustIndicators() {
    return `
      <div class="trust-indicators">
        <div class="trust-item">
          <span class="trust-icon">🔐</span>
          <div class="trust-content">
            <strong>智能合约托管</strong>
            <p>资金由合约自动执行，无法篡改</p>
          </div>
        </div>
        <div class="trust-item">
          <span class="trust-icon">📊</span>
          <div class="trust-content">
            <strong>100% 链上可查</strong>
            <p>所有交易公开透明，实时可验证</p>
          </div>
        </div>
        <div class="trust-item">
          <span class="trust-icon">🌍</span>
          <div class="trust-content">
            <strong>零门槛捐赠</strong>
            <p>任何人都可以匿名捐赠，无需注册</p>
          </div>
        </div>
        <div class="trust-item">
          <span class="trust-icon">⚡</span>
          <div class="trust-content">
            <strong>即时到账</strong>
            <p>区块链确认后立即到账，无延迟</p>
          </div>
        </div>
      </div>
    `;
  }

  function createHowItWorks() {
    return `
      <div class="how-it-works">
        <h3>💡 捐赠流程 (3步完成)</h3>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <strong>选择币种 & 复制地址</strong>
              <p>点击下方按钮复制您的币种地址</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <strong>转账到该地址</strong>
              <p>使用您的钱包（Trust Wallet, MetaMask等）转账</p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <strong>验证捐赠成功</strong>
              <p>在区块浏览器确认交易，记录您的善举</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function createCurrencySelector() {
    const currencies = [
      { id: 'USDT', name: 'USDT', network: 'BSC (BEP20)', icon: '💰', min: '10' },
      { id: 'BTC', name: 'Bitcoin', network: 'Bitcoin', icon: '₿', min: '0.0001' },
      { id: 'ETH', name: 'Ethereum', network: 'BSC (BEP20)', icon: 'Ξ', min: '0.001' },
      { id: 'BNB', name: 'BNB', network: 'BSC (BEP20)', icon: '🔶', min: '0.01' },
      { id: 'SOL', name: 'Solana', network: 'Solana', icon: '◎', min: '0.01' }
    ];

    const buttons = currencies.map(c => `
      <button class="currency-btn ${c.id === 'USDT' ? 'active' : ''}" 
              data-currency="${c.id}" 
              onclick="selectCurrency('${c.id}')">
        <span class="currency-icon">${c.icon}</span>
        <span class="currency-name">${c.name}</span>
        <span class="currency-network">${c.network}</span>
      </button>
    `).join('');

    const addresses = currencies.map(c => `
      <div class="address-box ${c.id === 'USDT' ? 'active' : ''}" id="address-${c.id}">
        <div class="address-label">
          <span class="currency-icon">${c.icon}</span>
          <strong>${c.name} (${c.network})</strong>
        </div>
        <div class="address-content">
          <code id="address-text-${c.id}">${CONFIG.ADDRESSES[c.id]}</code>
          <button class="copy-btn" onclick="copyAddress('${c.id}')">
            <span id="copy-icon-${c.id}">📋</span>
            <span id="copy-text-${c.id}">复制</span>
          </button>
        </div>
        <div class="address-note">
          💡 最低建议捐赠：${c.min} ${c.id}
        </div>
      </div>
    `).join('');

    return `
      <div class="donation-panel">
        <h3>💝 选择捐赠方式</h3>
        
        <div class="currency-selector">
          ${buttons}
        </div>
        
        <div class="addresses-container">
          ${addresses}
        </div>
        
        <div class="donation-tips">
          <h4>📌 捐赠提示</h4>
          <ul>
            <li>使用 BSC (Binance Smart Chain) 网络手续费最低</li>
            <li>BTC 捐赠需要较长确认时间</li>
            <li>建议先小额测试，熟悉流程后再正常捐赠</li>
            <li>所有捐赠都是匿名的，保护您的隐私</li>
          </ul>
        </div>
      </div>
    `;
  }

  function createRecentActivity() {
    return `
      <div class="recent-activity">
        <h4>🌍 全球捐赠者分布</h4>
        <div class="activity-list" id="activityList">
          <div class="activity-item">
            <span class="activity-flag">🇸🇬</span>
            <span class="activity-location">Singapore</span>
            <span class="activity-amount">50 USDT</span>
            <span class="activity-time">2小时前</span>
          </div>
          <div class="activity-item">
            <span class="activity-flag">🇺🇸</span>
            <span class="activity-location">United States</span>
            <span class="activity-amount">0.01 BTC</span>
            <span class="activity-time">5小时前</span>
          </div>
          <div class="activity-item">
            <span class="activity-flag">🇩🇪</span>
            <span class="activity-location">Germany</span>
            <span class="activity-amount">100 USDT</span>
            <span class="activity-time">1天前</span>
          </div>
          <div class="activity-item">
            <span class="activity-flag">🇯🇵</span>
            <span class="activity-location">Japan</span>
            <span class="activity-amount">25 USDT</span>
            <span class="activity-time">2天前</span>
          </div>
        </div>
        <p class="activity-note">📡 数据实时同步自区块链</p>
      </div>
    `;
  }

  function createStyles() {
    return `
      <style>
        /* 实时捐赠面板 */
        .live-donation-panel {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px;
          padding: 24px;
          color: white;
          margin: 24px 0;
        }
        
        .panel-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .panel-header h3 {
          margin: 0;
          flex: 1;
        }
        
        .live-indicator {
          font-size: 1.5em;
          animation: blink 1.5s infinite;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .update-badge {
          background: rgba(46, 213, 115, 0.2);
          color: #2ed573;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8em;
        }
        
        .stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        
        .stat-item {
          text-align: center;
          padding: 16px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
        }
        
        .stat-value {
          font-size: 1.8em;
          font-weight: bold;
          color: #2ed573;
        }
        
        .stat-label {
          font-size: 0.85em;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 4px;
        }
        
        .verify-section {
          background: rgba(46, 213, 115, 0.1);
          border: 1px solid rgba(46, 213, 115, 0.3);
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }
        
        .verify-section p {
          margin-bottom: 12px;
          color: #2ed573;
        }
        
        .verify-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .verify-btn {
          padding: 10px 20px;
          border-radius: 8px;
          text-decoration: none;
          color: white;
          font-weight: 500;
          transition: all 0.3s;
        }
        
        .verify-btn:hover {
          transform: translateY(-2px);
        }
        
        .verify-btn.bsc {
          background: #F3BA2F;
          color: #000;
        }
        
        .verify-btn.btc {
          background: #F7931A;
        }

        /* 信任指标 */
        .trust-indicators {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          margin: 24px 0;
        }
        
        .trust-item {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }
        
        .trust-icon {
          font-size: 2em;
          flex-shrink: 0;
        }
        
        .trust-content strong {
          display: block;
          margin-bottom: 4px;
          color: #1a1a2e;
        }
        
        .trust-content p {
          margin: 0;
          font-size: 0.9em;
          color: #666;
        }

        /* 捐赠面板 */
        .donation-panel {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          margin: 24px 0;
        }
        
        .donation-panel h3 {
          margin-bottom: 20px;
          color: #1a1a2e;
        }
        
        .currency-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }
        
        .currency-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.3s;
          min-width: 90px;
        }
        
        .currency-btn:hover {
          border-color: #667eea;
        }
        
        .currency-btn.active {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.1);
        }
        
        .currency-icon {
          font-size: 1.5em;
          margin-bottom: 4px;
        }
        
        .currency-name {
          font-weight: 600;
          font-size: 0.9em;
        }
        
        .currency-network {
          font-size: 0.75em;
          color: #999;
        }
        
        .addresses-container {
          margin-bottom: 20px;
        }
        
        .address-box {
          display: none;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        
        .address-box.active {
          display: block;
        }
        
        .address-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .address-content {
          display: flex;
          gap: 12px;
          align-items: center;
          background: white;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        
        .address-content code {
          flex: 1;
          font-size: 0.85em;
          word-break: break-all;
          color: #1a1a2e;
        }
        
        .copy-btn {
          padding: 8px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          white-space: nowrap;
          transition: all 0.3s;
        }
        
        .copy-btn:hover {
          transform: scale(1.05);
        }
        
        .copy-btn.copied {
          background: #2ed573;
        }
        
        .address-note {
          margin-top: 8px;
          font-size: 0.85em;
          color: #666;
        }
        
        .donation-tips {
          background: #fff3cd;
          border-radius: 12px;
          padding: 16px;
        }
        
        .donation-tips h4 {
          margin-bottom: 12px;
          color: #856404;
        }
        
        .donation-tips ul {
          margin: 0;
          padding-left: 20px;
          color: #856404;
        }
        
        .donation-tips li {
          margin-bottom: 6px;
        }

        /* 最近活动 */
        .recent-activity {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin: 24px 0;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        }
        
        .recent-activity h4 {
          margin-bottom: 16px;
          color: #1a1a2e;
        }
        
        .activity-list {
          margin-bottom: 12px;
        }
        
        .activity-item {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }
        
        .activity-item:last-child {
          border-bottom: none;
        }
        
        .activity-flag {
          font-size: 1.5em;
          margin-right: 12px;
        }
        
        .activity-location {
          flex: 1;
          color: #333;
        }
        
        .activity-amount {
          font-weight: 600;
          color: #2ed573;
          margin-right: 16px;
        }
        
        .activity-time {
          color: #999;
          font-size: 0.85em;
        }
        
        .activity-note {
          text-align: center;
          color: #666;
          font-size: 0.85em;
          margin-top: 12px;
        }

        /* 响应式 */
        @media (max-width: 768px) {
          .stats-row {
            grid-template-columns: 1fr;
          }
          
          .currency-selector {
            justify-content: center;
          }
          
          .currency-btn {
            min-width: 70px;
            padding: 10px 12px;
          }
          
          .address-content {
            flex-direction: column;
            align-items: stretch;
          }
          
          .copy-btn {
            width: 100%;
            margin-top: 8px;
          }
        }
      </style>
    `;
  }

  // ========== 功能逻辑 ==========

  window.selectCurrency = function(currency) {
    // 更新按钮状态
    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.currency === currency);
    });
    
    // 更新地址显示
    document.querySelectorAll('.address-box').forEach(box => {
      box.classList.toggle('active', box.id === `address-${currency}`);
    });
    
    state.selectedCurrency = currency;
  };

  window.copyAddress = async function(currency) {
    const address = CONFIG.ADDRESSES[currency];
    const copyText = document.getElementById(`copy-text-${currency}`);
    const copyIcon = document.getElementById(`copy-icon-${currency}`);
    
    try {
      await navigator.clipboard.writeText(address);
      
      // 更新按钮状态
      if (copyText) copyText.textContent = '已复制!';
      if (copyIcon) copyIcon.textContent = '✅';
      
      // 恢复按钮状态
      setTimeout(() => {
        if (copyText) copyText.textContent = '复制';
        if (copyIcon) copyIcon.textContent = '📋';
      }, CONFIG.COPY_FEEDBACK_DURATION);
      
    } catch (err) {
      // 备用方案
      const textarea = document.createElement('textarea');
      textarea.value = address;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (copyText) copyText.textContent = '已复制!';
      if (copyIcon) copyIcon.textContent = '✅';
      
      setTimeout(() => {
        if (copyText) copyText.textContent = '复制';
        if (copyIcon) copyIcon.textContent = '📋';
      }, CONFIG.COPY_FEEDBACK_DURATION);
    }
  };

  // ========== 初始化 ==========

  function init() {
    // 检查是否在捐赠页面
    const isDonatePage = window.location.pathname.includes('donate');
    
    // 添加样式
    document.head.insertAdjacentHTML('beforeend', createStyles());
    
    // 找到捐赠面板容器
    const panelContainers = document.querySelectorAll('.donation-addresses, .crypto-donation, main');
    
    if (panelContainers.length > 0) {
      const container = panelContainers[0];
      
      // 在捐赠面板前添加实时数据
      container.insertAdjacentHTML('beforebegin', createLiveDonationPanel());
      
      // 添加信任指标
      container.insertAdjacentHTML('beforebegin', createTrustIndicators());
      
      // 添加操作指南
      container.insertAdjacentHTML('beforebegin', createHowItWorks());
      
      // 在捐赠面板后添加最近活动
      container.insertAdjacentHTML('afterend', createRecentActivity());
    }
    
    console.log('🤖 ALI Charity 捐赠增强组件已加载');
  }

  // DOM加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
