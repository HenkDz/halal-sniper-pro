// =========================================================================
// 🤖 AI MODULE - Gemini/Grok Analysis with Premium Zinc UI
// Now supports Pro subscription via backend API
// =========================================================================

// Check if user has Pro subscription or own API key
async function checkAIAccess() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'getSubscription' }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ hasAccess: false, isPro: false, hasOwnKey: false });
                return;
            }
            
            const isPro = response?.valid && response?.plan === 'pro';
            const hasOwnKey = !!(SniperUtils.getGeminiApiKey() || SniperUtils.getXaiApiKey());
            const canUse = isPro || hasOwnKey || (response?.usage < response?.limit);
            
            resolve({
                hasAccess: canUse,
                isPro: isPro,
                hasOwnKey: hasOwnKey,
                usage: response?.usage || 0,
                limit: response?.limit || 3,
                plan: response?.plan || 'free',
            });
        });
    });
}

// Show upgrade prompt when limit reached
function showUpgradeBanner(contentDiv, usage, limit, isPro = false) {
    const title = isPro ? "Monthly Limit Reached" : "You're Out of Free Analyses";
    const subtitle = isPro 
        ? `You've used all ${limit} Pro analyses this month. Your quota resets next month.`
        : `Upgrade to Pro for 50 analyses/month!`;
    
    const upgradeSection = isPro ? `
        <div style="background: #18181b; border-radius: 12px; padding: 16px; margin-bottom: 20px; max-width: 300px; margin-left: auto; margin-right: auto;">
            <div style="color: #a1a1aa; font-size: 12px; margin-bottom: 8px;">Need more analyses?</div>
            <div style="color: #d4d4d8; font-size: 11px; line-height: 1.6;">
                • Use your own API key for unlimited access<br>
                • Wait for next month's quota reset<br>
                • Contact support for enterprise plans
            </div>
        </div>
        <button id="sniper-use-own-key-btn" style="
            background: #27272a;
            color: #fff;
            border: 1px solid #3f3f46;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
        ">Use Own API Key</button>
    ` : `
        <div style="background: #18181b; border-radius: 12px; padding: 20px; margin-bottom: 20px; max-width: 300px; margin-left: auto; margin-right: auto;">
            <div style="display: flex; justify-content: center; align-items: baseline; gap: 4px; margin-bottom: 12px;">
                <span style="color: #fff; font-size: 28px; font-weight: 700;">$9.99</span>
                <span style="color: #71717a; font-size: 14px;">/month</span>
            </div>
            <div style="text-align: left; color: #d4d4d8; font-size: 12px;">
                <div style="padding: 3px 0;">✓ <b>50</b> AI analyses/month</div>
                <div style="padding: 3px 0;">✓ Deep Research + Live Data</div>
                <div style="padding: 3px 0;">✓ Halal Screening (IFG 5-criteria)</div>
                <div style="padding: 3px 0;">✓ Whale & Cluster Detection</div>
            </div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
            <button id="sniper-upgrade-btn" style="
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: #fff;
                border: none;
                padding: 12px 28px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
            ">Upgrade to Pro</button>
            <button id="sniper-use-own-key-btn" style="
                background: transparent;
                color: #71717a;
                border: none;
                padding: 8px 16px;
                font-size: 12px;
                cursor: pointer;
            ">or use your own API key</button>
        </div>
    `;
    
    contentDiv.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">${isPro ? '📊' : '🎯'}</div>
            <h3 style="color: #fff; font-size: 18px; margin-bottom: 12px;">${title}</h3>
            <p style="color: ${isPro ? '#60a5fa' : '#f59e0b'}; font-size: 13px; margin-bottom: 24px; background: ${isPro ? 'rgba(96, 165, 250, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; padding: 10px 16px; border-radius: 8px; display: inline-block;">
                ${isPro ? '📊' : '⚠️'} ${usage}/${limit} used this month
            </p>
            <div style="color: #a1a1aa; font-size: 12px; margin-bottom: 16px;">${subtitle}</div>
            
            ${upgradeSection}
        </div>
    `;
    
    // Add event listeners
    contentDiv.querySelector('#sniper-upgrade-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ 
            action: 'getCheckoutUrl',
            successUrl: window.location.href + '?upgraded=true'
        }, (response) => {
            if (response?.checkoutUrl) window.open(response.checkoutUrl, '_blank');
        });
    });
    
    contentDiv.querySelector('#sniper-use-own-key-btn')?.addEventListener('click', () => {
        SniperAI.showApiKeyDialog();
    });
}

const SniperAI = {
    // Show popup when user has no access (no API key and free limit reached)
    showAccessLimitedPopup(ticker, companyName, usage, limit) {
        // Remove existing popups
        const existing = document.getElementById('sniper-ai-popup');
        if (existing) existing.remove();
        const existingBackdrop = document.getElementById('sniper-ai-backdrop');
        if (existingBackdrop) existingBackdrop.remove();

        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'sniper-ai-backdrop';
        backdrop.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            z-index: 100000;
        `;

        // Popup
        const popup = document.createElement('div');
        popup.id = 'sniper-ai-popup';
        popup.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #09090b;
            border: 1px solid #27272a; border-radius: 12px;
            z-index: 100001; width: 480px; max-width: 92vw;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
            overflow: hidden;
        `;

        popup.innerHTML = `
            <div style="padding: 24px; text-align: center;">
                <button id="sniper-limit-close" style="position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #52525b; font-size: 20px; cursor: pointer; padding: 4px;">✕</button>
                
                <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
                <h2 style="color: #fff; font-size: 20px; font-weight: 600; margin-bottom: 8px;">Upgrade to Pro</h2>
                <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 8px;">
                    Analyzing <strong style="color: #fff;">${ticker}</strong> - ${companyName}
                </p>
                <p style="color: #71717a; font-size: 13px; margin-bottom: 24px;">
                    You've used ${usage}/${limit} free AI analyses this month.
                </p>
                
                <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: left;">
                    <h4 style="color: #22c55e; font-size: 14px; font-weight: 600; margin-bottom: 12px;">✨ Pro unlocks everything:</h4>
                    <ul style="list-style: none; padding: 0; margin: 0; color: #d4d4d8; font-size: 13px;">
                        <li style="padding: 6px 0; display: flex; align-items: center; gap: 8px;">
                            <span>🤖</span> <strong>Unlimited Quick Analysis</strong> — No monthly limits
                        </li>
                        <li style="padding: 6px 0; display: flex; align-items: center; gap: 8px;">
                            <span>🌐</span> <strong>Deep Research + Web</strong> — Live market data & news
                        </li>
                        <li style="padding: 6px 0; display: flex; align-items: center; gap: 8px;">
                            <span>🕌</span> <strong>Halal Screening</strong> — 5-criteria IFG methodology
                        </li>
                        <li style="padding: 6px 0; display: flex; align-items: center; gap: 8px;">
                            <span>🐋</span> <strong>Whale Detection</strong> — Spot $100K+ insider buys
                        </li>
                    </ul>
                </div>
                
                <div style="background: #18181b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: center; align-items: baseline; gap: 4px;">
                        <span style="color: #fff; font-size: 32px; font-weight: 700;">$9.99</span>
                        <span style="color: #71717a; font-size: 14px;">/month</span>
                    </div>
                    <div style="color: #52525b; font-size: 12px; text-align: center; margin-top: 4px;">
                        Less than a coffee ☕ per week
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="sniper-upgrade-pro" style="
                        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                        color: #fff;
                        border: none;
                        padding: 14px 24px;
                        border-radius: 8px;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3);
                    ">🚀 Upgrade to Pro</button>
                    
                    <button id="sniper-use-own-key" style="
                        background: transparent;
                        color: #71717a;
                        border: none;
                        padding: 8px;
                        font-size: 12px;
                        cursor: pointer;
                        text-decoration: underline;
                    ">I have my own API key</button>
                </div>
                
                <p style="color: #52525b; font-size: 11px; margin-top: 12px;">
                    Cancel anytime • No questions asked
                </p>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(popup);

        // Event handlers
        const closePopup = () => {
            popup.remove();
            backdrop.remove();
        };

        backdrop.addEventListener('click', closePopup);
        document.getElementById('sniper-limit-close')?.addEventListener('click', closePopup);

        document.getElementById('sniper-upgrade-pro')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ 
                action: 'getCheckoutUrl',
                successUrl: window.location.href + '?upgraded=true'
            }, (response) => {
                if (response?.checkoutUrl) {
                    window.open(response.checkoutUrl, '_blank');
                }
            });
        });

        document.getElementById('sniper-use-own-key')?.addEventListener('click', () => {
            closePopup();
            this.showApiKeyDialog();
        });
    },

    // Build insider data summary for AI
    buildInsiderDataSummary(stats, signals) {
        const fmt = SniperUtils.formatMoney;
        const net = stats.totalBuy - stats.totalSell;

        let summary = `Summary:
- Total Bought: ${fmt(stats.totalBuy)} by ${stats.uniqueBuyers.size} unique buyers
- Total Sold: ${fmt(stats.totalSell)} by ${stats.uniqueSellers.size} unique sellers  
- Net Flow: ${net >= 0 ? '+' : ''}${fmt(net)}
- Buy Count: ${stats.countBuy} transactions
- Sell Count: ${stats.countSell} transactions
`;

        if (signals.executiveBuys.length > 0) {
            summary += `\nExecutive Purchases (${signals.executiveBuys.length}):\n`;
            signals.executiveBuys.slice(0, 5).forEach(e => {
                summary += `  - ${e.title}: ${fmt(e.val)} (${e.daysAgo} days ago)\n`;
            });
        }

        if (signals.whaleTrades.length > 0) {
            summary += `\nWhale Trades >$200k (${signals.whaleTrades.length}):\n`;
            signals.whaleTrades.slice(0, 5).forEach(w => {
                summary += `  - ${w.name}: ${fmt(w.val)} (${w.daysAgo} days ago)\n`;
            });
        }

        summary += `\nSignals Detected:\n`;
        summary += `- Cluster Buying (3+ buyers): ${signals.clusterBuying ? 'YES' : 'No'}\n`;
        summary += `- Reversal Signal: ${signals.reversalSignal ? 'YES' : 'No'}\n`;
        summary += `- Fresh Entries (first-time buyers): ${signals.freshEntries.length}\n`;
        summary += `- Recent Activity (30d): ${signals.recentActivity} trades\n`;
        summary += `- Buy Streak: ${signals.buyStreak} unique days with buys\n`;

        return summary;
    },

    // Improved markdown to HTML renderer
    renderMarkdown(text) {
        if (!text) return '';

        // First, escape any HTML that might interfere
        let html = text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Process citations [[1]](url) before splitting lines to handle inline flows
        html = html.replace(/\[\[(\d+)\]\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="display:inline-flex;align-items:center;justify-content:center;min-width:14px;height:14px;padding:0 3px;border-radius:4px;background:rgba(37,99,235,0.2);color:#60a5fa;font-size:9px;font-weight:700;text-decoration:none;margin:0 2px;vertical-align:text-top;border:1px solid rgba(37,99,235,0.3);position:relative;top:-1px;">$1</a>');

        // Process line by line for better control
        const lines = html.split('\n');
        const processedLines = [];
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // Headers
            if (line.match(/^#{1,3}\s+/)) {
                if (inList) { processedLines.push('</div>'); inList = false; }
                const level = line.match(/^(#{1,3})/)[1].length;
                const headerText = line.replace(/^#{1,3}\s+/, '');
                // Premium Typography: Inter/System fonts
                const styles = {
                    1: 'font-size:18px; color:#fff; font-weight:700; margin:24px 0 12px 0; letter-spacing:-0.5px;',
                    2: 'font-size:16px; color:#f4f4f5; font-weight:600; margin:20px 0 10px 0;',
                    3: 'font-size:14px; color:#e4e4e7; font-weight:600; margin:16px 0 8px 0;'
                };
                processedLines.push(`<div style="${styles[level]}">${headerText}</div>`);
                continue;
            }

            // Bullet points
            if (line.match(/^[\-\*•]\s+/)) {
                if (!inList) { processedLines.push('<div style="margin:8px 0;">'); inList = true; }
                const bulletText = line.replace(/^[\-\*•]\s+/, '');
                processedLines.push(`<div style="display:flex; align-items:flex-start; gap:10px; margin:6px 0; line-height:1.6;"><span style="color:#52525b; font-size:14px; margin-top:2px;">•</span><span style="color:#d4d4d8;">${this.processInlineFormatting(bulletText)}</span></div>`);
                continue;
            }

            // Numbered lists
            if (line.match(/^\d+\.\s+/)) {
                if (!inList) { processedLines.push('<div style="margin:8px 0;">'); inList = true; }
                const match = line.match(/^(\d+)\.\s+(.+)/);
                processedLines.push(`<div style="display:flex; align-items:flex-start; gap:10px; margin:6px 0; line-height:1.6;"><span style="color:#71717a; font-weight:500; min-width:16px; margin-top:1px; font-size:13px;">${match[1]}.</span><span style="color:#d4d4d8;">${this.processInlineFormatting(match[2])}</span></div>`);
                continue;
            }

            // Close list if we hit a non-list line
            if (inList && line.trim() !== '') {
                processedLines.push('</div>');
                inList = false;
            }

            // Empty lines
            if (line.trim() === '') {
                processedLines.push('<div style="height:12px;"></div>');
                continue;
            }

            // Regular paragraphs
            processedLines.push(`<div style="color:#d4d4d8; line-height:1.6; margin:6px 0; font-size:14px;">${this.processInlineFormatting(line)}</div>`);
        }

        if (inList) processedLines.push('</div>');

        return processedLines.join('');
    },

    // Process inline formatting (bold, italic, etc)
    processInlineFormatting(text) {
        let out = text
            // Bold with **text** - Bright White
            .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#fff; font-weight:600;">$1</strong>')
            // Italic with *text* - Muted
            .replace(/\*([^*]+)\*/g, '<em style="color:#a1a1aa;">$1</em>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code style="background:#27272a; color:#e4e4e7; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:12px; border:1px solid #3f3f46;">$1</code>')
            // Markdown links [text](url) - Blue
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:#60a5fa; text-decoration:none; border-bottom:1px dashed #3b82f6;">$1</a>');

        // Auto-link bare URLs/domains if not already linked
        out = out.replace(/\b(https?:\/\/[^\s<>()"']+|www\.[^\s<>()"']+)\b/gi, (match, url, offset, string) => {
            // Avoid linking if inside an HTML tag attribute (preceded by " or ') or already linked
            if (string[offset - 1] === '"' || string[offset - 1] === "'" || string[offset - 1] === '>') return match;
            // Also check two chars back for markdown link syntax ](
            if (offset >= 2 && string.substr(offset - 2, 2) === '](') return match;

            const href = match.startsWith('http') ? match : `https://${match}`;
            // Use a shorter display for long URLs
            const display = match.length > 40 ? match.substring(0, 30) + '...' : match;
            return `<a href="${href}" target="_blank" style="color:#60a5fa; text-decoration:none;">${display}</a>`;
        });

        return out;
    },

    // Show AI Analysis Popup
    async showAnalysisPopup(ticker, companyName, insiderData, stats, signals, initialMode = 'quick', existingReport = null) {
        const provider = SniperUtils.getAiProvider();
        const apiKey = provider === 'xai' ? SniperUtils.getXaiApiKey() : SniperUtils.getGeminiApiKey();

        // Check AI access (Pro subscription, own API key, or free tier remaining)
        const access = await checkAIAccess();
        console.log('🎯 AI Access check:', access);
        
        // Store access info for use in runAnalysis
        const canUseBackend = !apiKey && (access.isPro || access.hasAccess);
        
        // If no API key AND no access at all (free limit reached, not Pro)
        if (!apiKey && !access.hasAccess && !access.isPro) {
            this.showAccessLimitedPopup(ticker, companyName, access.usage, access.limit);
            return;
        }

        // Remove existing popup
        const existing = document.getElementById('sniper-ai-popup');
        if (existing) existing.remove();
        const existingBackdrop = document.getElementById('sniper-ai-backdrop');
        if (existingBackdrop) existingBackdrop.remove();

        // Animations
        if (!document.getElementById('sniper-ai-styles')) {
            const style = document.createElement('style');
            style.id = 'sniper-ai-styles';
            style.textContent = `
                @keyframes sniperFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes sniperPopIn { from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
                .sniper-btn-hover:hover { background: #27272a !important; }
            `;
            document.head.appendChild(style);
        }

        // Backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'sniper-ai-backdrop';
        backdrop.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            z-index: 100000; animation: sniperFadeIn 0.2s ease;
        `;

        // Main Popup Container
        const popup = document.createElement('div');
        popup.id = 'sniper-ai-popup';

        const net = stats.totalBuy - stats.totalSell;
        const buyRatio = (stats.totalBuy + stats.totalSell) > 0 ? (stats.totalBuy / (stats.totalBuy + stats.totalSell) * 100).toFixed(0) : 50;
        const fmt = SniperUtils.formatMoney;

        // Premium Dark Theme styling (Zinc)
        popup.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #09090b;
            border: 1px solid #27272a; border-radius: 12px;
            z-index: 100001; width: 680px; max-width: 92vw; max-height: 95vh;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
            display: flex; flex-direction: column; overflow: hidden;
            animation: sniperPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        popup.innerHTML = `
            <!-- Header -->
            <div style="padding: 20px 24px; border-bottom: 1px solid #27272a; background: #09090b;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                            <span style="font-size: 24px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">${ticker}</span>
                            <span style="padding: 2px 8px; background: #2563eb; border-radius: 99px; font-size: 10px; color: white; font-weight: 600; letter-spacing: 0.5px;">AI ANALYSIS</span>
                        </div>
                        <div style="font-size: 13px; color: #a1a1aa; font-weight: 400;">${companyName}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button id="ai-popup-fav" style="background: ${SniperUtils.isFavorite(ticker) ? '#fbbf24' : 'transparent'}; border: 1px solid ${SniperUtils.isFavorite(ticker) ? '#fbbf24' : '#27272a'}; color: ${SniperUtils.isFavorite(ticker) ? '#18181b' : '#71717a'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s;" title="${SniperUtils.isFavorite(ticker) ? 'Remove from Favorites' : 'Add to Favorites'}">
                            <span>${SniperUtils.isFavorite(ticker) ? '★' : '☆'}</span> ${SniperUtils.isFavorite(ticker) ? 'Saved' : 'Save'}
                        </button>
                        <button id="ai-popup-pdf" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(239,68,68,0.3);" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 4px 12px rgba(239,68,68,0.4)';" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(239,68,68,0.3)';" title="Export as PDF">
                            <span>📄</span> Export PDF
                        </button>
                        <button id="ai-popup-copy" style="background: transparent; border: 1px solid #27272a; color: #71717a; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s;" onmouseover="this.style.background='#18181b';this.style.borderColor='#3f3f46';this.style.color='#e4e4e7';" onmouseout="this.style.background='transparent';this.style.borderColor='#27272a';this.style.color='#71717a';">
                            <span>📋</span> Copy
                        </button>
                        <button id="ai-popup-close" style="background: transparent; border: none; color: #52525b; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.background='#18181b';this.style.color='#f4f4f5';" onmouseout="this.style.background='transparent';this.style.color='#52525b';">✕</button>
                    </div>
                </div>
                
                <!-- Quick Stats Grid -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 20px;">
                    <div style="background: #18181b; border: 1px solid #27272a; padding: 10px; border-radius: 8px;">
                        <span style="display:block; color: #71717a; font-size: 10px; font-weight:500; margin-bottom:2px;">BOUGHT</span>
                        <span style="color: #4ade80; font-weight: 600; font-size: 13px;">${fmt(stats.totalBuy)}</span>
                    </div>
                    <div style="background: #18181b; border: 1px solid #27272a; padding: 10px; border-radius: 8px;">
                        <span style="display:block; color: #71717a; font-size: 10px; font-weight:500; margin-bottom:2px;">SOLD</span>
                        <span style="color: #f87171; font-weight: 600; font-size: 13px;">${fmt(stats.totalSell)}</span>
                    </div>
                    <div style="background: #18181b; border: 1px solid #27272a; padding: 10px; border-radius: 8px;">
                        <span style="display:block; color: #71717a; font-size: 10px; font-weight:500; margin-bottom:2px;">NET FLOW</span>
                        <span style="color: ${net >= 0 ? '#4ade80' : '#f87171'}; font-weight: 600; font-size: 13px;">${net >= 0 ? '+' : '-'}${fmt(net)}</span>
                    </div>
                    <div style="background: #18181b; border: 1px solid #27272a; padding: 10px; border-radius: 8px;">
                        <span style="display:block; color: #71717a; font-size: 10px; font-weight:500; margin-bottom:2px;">SIGNAL</span>
                        <span style="color: #60a5fa; font-weight: 600; font-size: 13px;">${buyRatio}% Buy</span>
                    </div>
                </div>
            </div>
            
            <!-- Analysis Content -->
            <div id="ai-analysis-content" style="flex: 1; overflow-y: auto; padding: 24px; min-height: 200px; background: #09090b;">
                <div class="sniper-thinking" style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 32px; margin-bottom: 16px;">✨</div>
                    <div style="font-size: 14px; color: #e4e4e7; font-weight: 500; margin-bottom: 6px;">Analyzing Insider Data...</div>
                    <div style="font-size: 12px; color: #71717a;">Synthesizing patterns, signals, and market context</div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="padding: 12px 24px; border-top: 1px solid #27272a; background: #09090b; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 4px; background: #18181b; padding: 4px; border-radius: 8px; border: 1px solid #27272a;">
                    <button id="ai-mode-quick" style="padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; border:none; transition: all 0.2s;">
                        ⚡ Quick
                    </button>
                    <button id="ai-mode-deep" style="padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; border:none; transition: all 0.2s;">
                        🌐 Deep + Web
                    </button>
                </div>
                <div id="ai-provider-label" style="font-size: 10px; color: #52525b; font-weight:500;">Powered by ${provider === 'xai' ? 'xAI Grok' : 'Google Gemini'}</div>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.appendChild(popup);

        // Store markdown content and structured data for copying
        let currentMarkdown = null;
        let currentStructured = null;
        let currentHalalBreakdown = null; // Store comprehensive halal breakdown for copy
        let currentMode = initialMode || 'quick';

        // Check for cached Analysis - check both quick and deep
        const cachedQuick = await SniperStorage.getAIHistory(ticker, 'quick');
        const cachedDeep = await SniperStorage.getAIHistory(ticker, 'deep');
        // Use the one matching initialMode, or quick as default
        const cached = (initialMode === 'deep' && cachedDeep) ? cachedDeep : (cachedQuick || cachedDeep);

        // Store sources for copying
        let currentSources = null;

        // Copy function
        const copyReport = () => {
            if (!currentMarkdown) {
                alert('No report content available to copy.');
                return;
            }

            // Build highlights section from structured data
            let highlightsSection = '';
            if (currentStructured) {
                const s = currentStructured;
                const parts = [];
                
                if (s.decision && s.confidence) {
                    parts.push(`**Decision**: ${s.decision} (${s.confidence} confidence)`);
                } else if (s.decision) {
                    parts.push(`**Decision**: ${s.decision}`);
                }
                
                if (s.actionableTake) {
                    parts.push(`**Actionable Take**: ${s.actionableTake}`);
                }
                
                if (s.halalScore) {
                    parts.push(`**Halal Score**: ${s.halalScore}`);
                }
                
                if (parts.length > 0) {
                    highlightsSection = `## ⚡ Highlights\n\n${parts.join('\n\n')}\n\n---\n\n`;
                }
            }
            
            // Add comprehensive halal breakdown if available (from comprehensive scorer)
            if (currentHalalBreakdown) {
                highlightsSection += `\n${currentHalalBreakdown}\n\n---\n\n`;
            }

            // Build sources section for markdown export
            let sourcesSection = '';
            if (currentSources && currentSources.length > 0) {
                const sourceLines = currentSources
                    .filter(s => s && /^https?:\/\//i.test(s)) // Only keep actual URLs
                    .slice(0, 15) // Limit to 15 sources
                    .map((source, idx) => {
                        // Format as numbered markdown links
                        try {
                            const url = new URL(source);
                            let displayName;
                            
                            // Handle vertexaisearch redirect URLs - show as "Google Source #"
                            if (url.hostname.includes('vertexaisearch.cloud.google.com')) {
                                displayName = `Google Search Result ${idx + 1}`;
                            } else {
                                displayName = url.hostname.replace('www.', '');
                            }
                            
                            return `${idx + 1}. [${displayName}](${source})`;
                        } catch {
                            return `${idx + 1}. ${source}`;
                        }
                    });
                
                if (sourceLines.length > 0) {
                    sourcesSection = `\n\n---\n\n## 📎 Sources\n\n${sourceLines.join('\n')}`;
                }
            }

            // Clean markdown before export - remove HTML blobs and duplicate source sections
            let cleanedMarkdown = currentMarkdown
                // Remove any HTML style blocks
                .replace(/<style>[\s\S]*?<\/style>/gi, '')
                // Remove any HTML div blocks (like Gemini's search widget)
                .replace(/<div[\s\S]*?<\/div>/gi, '')
                // Remove any SVG blocks  
                .replace(/<svg[\s\S]*?<\/svg>/gi, '')
                // Remove plain-text "Sources:" sections (with or without markdown bold)
                // These have numbered items WITHOUT URLs - we'll add our own with real URLs
                .replace(/\*?\*?Sources?\*?\*?:?\s*\n((?:\d+\.\s*(?!https?:\/\/|\[)[^\n]+\n?)+)/gim, '')
                // Also remove "Sources:" followed by numbered list without links
                .replace(/^Sources?:?\s*$/gim, '')
                // Clean up excessive newlines
                .replace(/\n{4,}/g, '\n\n\n')
                .trim();

            // Add header with ticker and company name
            const fullReport = `# AI Analysis Report: ${ticker} - ${companyName}\n\n` +
                `Generated: ${new Date().toLocaleString()}\n\n` +
                `---\n\n${highlightsSection}${cleanedMarkdown}${sourcesSection}`;

            const copyBtn = popup.querySelector('#ai-popup-copy');
            const originalText = copyBtn.innerHTML;

            SniperUtils.copyToClipboard(
                fullReport,
                () => {
                    // Success callback
                    copyBtn.innerHTML = '<span>✓</span> Copied!';
                    copyBtn.style.color = '#4ade80';
                    copyBtn.style.borderColor = '#4ade80';
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.style.color = '';
                        copyBtn.style.borderColor = '';
                    }, 2000);
                },
                (error) => {
                    // Error callback
                    console.error('Failed to copy:', error);
                    copyBtn.innerHTML = '<span>❌</span> Failed';
                    copyBtn.style.color = '#f87171';
                    copyBtn.style.borderColor = '#f87171';
                    
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                        copyBtn.style.color = '';
                        copyBtn.style.borderColor = '';
                    }, 2000);
                }
            );
        };

        // Event handlers
        const closePopup = () => {
            backdrop.remove();
            popup.remove();
        };

        backdrop.onclick = closePopup;
        popup.querySelector('#ai-popup-close').onclick = closePopup;
        popup.querySelector('#ai-popup-copy').onclick = copyReport;
        
        // PDF Export handler
        const pdfBtn = popup.querySelector('#ai-popup-pdf');
        pdfBtn.onclick = async () => {
            const originalText = pdfBtn.innerHTML;
            pdfBtn.innerHTML = '<span class="sniper-loading-spinner" style="width:12px;height:12px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:sniper-spin 0.8s linear infinite;margin:0;"></span> Generating...';
            pdfBtn.disabled = true;
            pdfBtn.style.opacity = '0.7';
            
            try {
                // Get halal data for the report
                let halalData = null;
                try {
                    halalData = SniperStorage.getHalal(ticker);
                } catch (e) {
                    console.log('📄 PDF: No halal data');
                }
                
                await SniperPDF.generateReport({
                    ticker: ticker,
                    companyName: companyName,
                    stats: stats,
                    signals: signals,
                    score: window.SniperStockAnalyzer?.currentScore || null,
                    structured: currentStructured,
                    markdown: currentMarkdown,
                    halalData: halalData,
                    sources: currentSources,
                    timestamp: Date.now()
                });
                
                pdfBtn.innerHTML = '<span>✓</span> Downloaded!';
                pdfBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                pdfBtn.style.boxShadow = '0 2px 8px rgba(34,197,94,0.3)';
                
                setTimeout(() => {
                    pdfBtn.innerHTML = originalText;
                    pdfBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    pdfBtn.style.boxShadow = '0 2px 8px rgba(239,68,68,0.3)';
                    pdfBtn.disabled = false;
                    pdfBtn.style.opacity = '1';
                }, 2500);
            } catch (err) {
                console.error('📄 PDF Export failed:', err);
                pdfBtn.innerHTML = '<span>❌</span> Failed';
                pdfBtn.style.background = '#71717a';
                
                setTimeout(() => {
                    pdfBtn.innerHTML = originalText;
                    pdfBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                    pdfBtn.style.boxShadow = '0 2px 8px rgba(239,68,68,0.3)';
                    pdfBtn.disabled = false;
                    pdfBtn.style.opacity = '1';
                }, 2500);
            }
        };
        
        // Favorite button handler
        const favBtn = popup.querySelector('#ai-popup-fav');
        favBtn.onclick = () => {
            const isFav = SniperUtils.isFavorite(ticker);
            if (isFav) {
                SniperUtils.removeFavorite(ticker);
                favBtn.style.background = 'transparent';
                favBtn.style.borderColor = '#27272a';
                favBtn.style.color = '#71717a';
                favBtn.innerHTML = '<span>☆</span> Save';
                favBtn.title = 'Add to Favorites';
            } else {
                SniperUtils.addFavorite(ticker);
                favBtn.style.background = '#fbbf24';
                favBtn.style.borderColor = '#fbbf24';
                favBtn.style.color = '#18181b';
                favBtn.innerHTML = '<span>★</span> Saved';
                favBtn.title = 'Remove from Favorites';
            }
        };
        
        const escHandler = (e) => { if (e.key === 'Escape') closePopup(); };
        document.addEventListener('keydown', escHandler);

        // Mode buttons
        const quickBtn = popup.querySelector('#ai-mode-quick');
        const deepBtn = popup.querySelector('#ai-mode-deep');

        const setActiveMode = (mode) => {
            const activeStyle = `background: #2563eb; color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.1);`;
            const inactiveStyle = `background: transparent; color: #71717a;`;

            if (mode === 'quick') {
                quickBtn.style.cssText = quickBtn.style.cssText + activeStyle;
                deepBtn.style.cssText = deepBtn.style.cssText + inactiveStyle;
            } else {
                quickBtn.style.cssText = quickBtn.style.cssText + inactiveStyle;
                deepBtn.style.cssText = deepBtn.style.cssText + activeStyle;
            }
        };

        // Robust JSON extraction function that handles nested braces
        const extractJSONBlock = (text) => {
            // Find the start of JSON code block
            const jsonStartPattern = /```json\s*/i;
            const startMatch = text.match(jsonStartPattern);
            if (!startMatch) return null;

            const startIdx = startMatch.index + startMatch[0].length;
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;
            let jsonStart = -1;

            // Find the opening brace and track nested braces
            for (let i = startIdx; i < text.length; i++) {
                const char = text[i];
                
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                
                if (inString) continue;
                
                if (char === '{') {
                    if (jsonStart === -1) jsonStart = i;
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                    if (braceCount === 0 && jsonStart !== -1) {
                        // Found complete JSON object
                        const jsonStr = text.substring(jsonStart, i + 1);
                        try {
                            return JSON.parse(jsonStr);
                        } catch (e) {
                            console.error("Sniper AI: Failed to parse extracted JSON", e);
                            return null;
                        }
                    }
                }
            }
            
            return null;
        };

        // Helper function to remove JSON code blocks from markdown
        const removeJSONBlock = (text) => {
            if (!text) return text;
            
            // Match various JSON block patterns:
            // 1. ```json\n{...}\n```
            // 2. ```json{...}```
            // 3. ```\njson\n{...}\n``` (json on separate line)
            // 4. ```\njson\n\n{...}\n``` (json on line, blank line, then JSON)
            // 5. ```{...}``` (without json label but has decision field)
            
            // Pattern 1 & 2: Standard ```json ... ```
            const jsonBlockPattern1 = /```json\s*[\s\S]*?```/gi;
            let cleaned = text.replace(jsonBlockPattern1, '');
            
            // Pattern 3 & 4: ``` followed by json on new line (with optional blank line)
            const jsonBlockPattern2 = /```\s*\n\s*json\s*\n\s*\{[\s\S]*?\}\s*```/gi;
            cleaned = cleaned.replace(jsonBlockPattern2, '');
            
            // Pattern 5: ``` without json label but contains our structured format
            const jsonObjectPattern = /```\s*\{\s*"decision"[\s\S]*?\}\s*```/gi;
            cleaned = cleaned.replace(jsonObjectPattern, '');
            
            // Pattern 6: Handle case where "json" appears standalone followed by code block
            // Match: "json" on line, then ``` on next line(s), then JSON object
            const jsonStandalonePattern = /^json\s*$\s*\n\s*```\s*\n\s*\{[\s\S]*?\}\s*```/gmi;
            cleaned = cleaned.replace(jsonStandalonePattern, '');
            
            // Pattern 7: Remove any remaining standalone "json" lines near code blocks
            const lines = cleaned.split('\n');
            const filteredLines = [];
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();
                
                // Skip standalone "json" lines that are near code blocks or JSON objects
                if (trimmed === 'json' || trimmed === '```json') {
                    // Check surrounding lines
                    const nextLine = lines[i + 1]?.trim() || '';
                    const prevLine = lines[i - 1]?.trim() || '';
                    const nextNextLine = lines[i + 2]?.trim() || '';
                    
                    // Skip if followed by ``` or { or blank line then {
                    if (nextLine.startsWith('```') || 
                        nextLine.startsWith('{') || 
                        (nextLine === '' && nextNextLine.startsWith('{')) ||
                        prevLine.endsWith('```')) {
                        continue; // Skip this line
                    }
                }
                filteredLines.push(line);
            }
            
            return filteredLines.join('\n').trim();
        };

        const displayResult = async (markdown, grounded, structured = null, sources = null, avData = null) => {
            const contentDiv = popup.querySelector('#ai-analysis-content');
            
            // If structured data not provided but JSON block exists in markdown, extract it
            if (!structured) {
                structured = extractJSONBlock(markdown);
            }
            
            // Always remove JSON block from markdown display (handles both new and cached reports)
            markdown = removeJSONBlock(markdown);
            
            // Extract Highlights - prioritize structured data, fallback to markdown parsing
            let actionableTake = null;
            let halalScore = null;
            let halalBreakdown = null; // Declare first before using
            
            // Store cleaned markdown, structured data, and sources for copying (after halalBreakdown is declared)
            currentMarkdown = markdown;
            currentStructured = structured;
            // Sources will be set below after extraction

            // Use structured data if available (most reliable)
            if (structured) {
                actionableTake = structured.actionableTake || null;
                // NOTE: Do NOT use structured.halalScore directly - it's often hallucinated by AI
                // The comprehensive scorer below will calculate the real score from halalData
                // Only use AI's score as absolute fallback if no halalData available
                halalScore = null; // Will be set by scorer or fallback below
                
                // CRITICAL: Merge Alpha Vantage financial data into halalData
                // This fills in missing data that AI couldn't find
                if (avData && avData.halalData) {
                    console.log('📊 Alpha Vantage halalData available:', avData.halalData);
                    
                    if (!structured.halalData) {
                        structured.halalData = {};
                        console.log('📊 Created empty halalData for structured');
                    }
                    
                    // Merge Alpha Vantage data (only fill in missing fields)
                    const av = avData.halalData;
                    let fieldsUpdated = [];
                    
                    if (structured.halalData.interestBearingDebt == null && av.interestBearingDebt != null) {
                        structured.halalData.interestBearingDebt = av.interestBearingDebt;
                        fieldsUpdated.push(`interestBearingDebt=${av.interestBearingDebt}`);
                    }
                    if (structured.halalData.totalAssets == null && av.totalAssets != null) {
                        structured.halalData.totalAssets = av.totalAssets;
                        fieldsUpdated.push(`totalAssets=${av.totalAssets}`);
                    }
                    if (structured.halalData.illiquidAssets == null && av.illiquidAssets != null) {
                        structured.halalData.illiquidAssets = av.illiquidAssets;
                        fieldsUpdated.push(`illiquidAssets=${av.illiquidAssets}`);
                    }
                    if (structured.halalData.netLiquidAssets == null && av.netLiquidAssets != null) {
                        structured.halalData.netLiquidAssets = av.netLiquidAssets;
                        fieldsUpdated.push(`netLiquidAssets=${av.netLiquidAssets}`);
                    }
                    if (structured.halalData.marketCap == null && av.marketCap != null) {
                        structured.halalData.marketCap = av.marketCap;
                        fieldsUpdated.push(`marketCap=${av.marketCap}`);
                    }
                    if (structured.halalData.grossRevenue == null && av.grossRevenue != null) {
                        structured.halalData.grossRevenue = av.grossRevenue;
                        fieldsUpdated.push(`grossRevenue=${av.grossRevenue}`);
                    }
                    if (structured.halalData.haramIncomePercent == null && av.haramIncomePercent != null) {
                        structured.halalData.haramIncomePercent = av.haramIncomePercent;
                        fieldsUpdated.push(`haramIncomePercent=${av.haramIncomePercent}`);
                    }
                    
                    if (fieldsUpdated.length > 0) {
                        console.log('📊 MERGED from Alpha Vantage:', fieldsUpdated.join(', '));
                    } else {
                        console.log('📊 No fields needed from Alpha Vantage (all already provided by AI)');
                    }
                    console.log('📊 Final halalData:', JSON.stringify(structured.halalData));
                } else {
                    console.warn('📊 No Alpha Vantage halalData available for merge');
                    if (avData) {
                        console.log('📊 avData keys:', Object.keys(avData));
                    }
                }
                
                // If we have halalData, use comprehensive scorer
                if (structured.halalData && window.SniperHalalScorer) {
                    try {
                        // Check for cached financial data to validate consistency
                        const cachedFinancial = await SniperStorage.getHalalFinancialData(ticker);
                        const comparison = cachedFinancial ? 
                            SniperStorage.compareHalalData(structured.halalData, cachedFinancial) : 
                            { consistent: true, differences: [] };
                        
                        // Track if data is inconsistent for UI warning
                        let isDataInconsistent = false;
                        let inconsistencyWarning = null;
                        
                        // Check consistency and determine if we should save or use cached data
                        const isDataNew = !cachedFinancial;
                        const isDataConsistent = comparison.consistent;
                        const cacheAgeMs = cachedFinancial ? (Date.now() - cachedFinancial.timestamp) : Infinity;
                        const cacheAgeHours = cacheAgeMs / (1000 * 60 * 60);
                        const isCacheExpired = cacheAgeMs > 86400000; // 24 hours
                        
                        // Warn if significant differences found (within 24 hours)
                        // BUT: Skip warning if cached data had no values (null/undefined) - that's not variance, it's first-time data
                        const cachedHadData = cachedFinancial?.halalData?.netLiquidAssets != null && 
                                              !isNaN(cachedFinancial.halalData.netLiquidAssets);
                        const newHasData = structured.halalData?.netLiquidAssets != null &&
                                           !isNaN(structured.halalData.netLiquidAssets);
                        
                        if (!comparison.consistent && cachedFinancial && !isCacheExpired && cachedHadData && newHasData) {
                            isDataInconsistent = true;
                            console.warn('⚠️ Halal financial data inconsistency detected:', comparison.differences);
                            
                            // Build detailed warning message
                            const differencesText = comparison.differences.map(d => {
                                const oldFormatted = d.old ? SniperUtils.formatMoney(d.old) : 'N/A';
                                const newFormatted = d.new ? SniperUtils.formatMoney(d.new) : 'N/A';
                                return `- ${d.field}: ${oldFormatted} → ${newFormatted} (${d.percentDiff}% change)`;
                            }).join('\n');
                            
                            inconsistencyWarning = {
                                differences: comparison.differences,
                                cachedValue: cachedFinancial.halalData.netLiquidAssets,
                                newValue: structured.halalData.netLiquidAssets,
                                hoursAgo: cacheAgeHours.toFixed(1),
                                source: comparison.cachedSource || 'Unknown'
                            };
                            
                            // Add warning to breakdown
                            const warningNote = `\n\n⚠️ **Data Consistency Warning**: Significant differences detected compared to cached data (${cacheAgeHours.toFixed(1)}h ago):\n` +
                                differencesText +
                                `\nCached source: ${comparison.cachedSource || 'Unknown'}\n` +
                                `Using stable cached values to prevent data thrashing. Consider verifying against SEC filings directly.`;
                            
                            // Store warning for display
                            if (!halalBreakdown) halalBreakdown = '';
                            halalBreakdown += warningNote;
                        }
                        
                        // Extract source from markdown if available (needed for both save and volatility checks)
                        const sourceMatch = markdown.match(/SEC\s+10-K\s+([A-Za-z]+\s+\d+,\s+\d{4})/i) || 
                                           markdown.match(/filing\s+([A-Za-z]+\s+\d+,\s+\d{4})/i);
                        const source = sourceMatch ? `SEC 10-K ${sourceMatch[1]}` : null;
                        
                        // CRITICAL FIX: Only save if data is new, consistent, OR cache is expired
                        // This prevents cache thrashing from inconsistent AI responses
                        const validDataCount = Object.values(structured.halalData).filter(v => v !== null && v !== undefined).length;
                        const shouldSave = validDataCount >= 3 && (isDataNew || isDataConsistent || isCacheExpired);
                        
                        if (shouldSave) {
                            await SniperStorage.saveHalalFinancialData(ticker, structured.halalData, source);
                            console.log('✅ Saved halal financial data to cache');
                        } else if (isDataInconsistent && cachedFinancial) {
                            // Use cached stable data instead of inconsistent new data
                            console.log('⚠️ Preventing cache overwrite due to inconsistent AI data. Using stable cached version.');
                            structured.halalData = { ...cachedFinancial.halalData };
                        }
                        
                        // CRITICAL: Calculate Net Liquid Assets from components if raw data available
                        // Formula: (Total Assets - Illiquid Assets) - Total Liabilities
                        // OR: Current Assets - Current Liabilities (if available)
                        let calculatedNetLiquidAssets = structured.halalData.netLiquidAssets;
                        
                        if (structured.halalData.totalAssets && structured.halalData.illiquidAssets && structured.halalData.totalLiabilities) {
                            // Use formula: (Total Assets - Illiquid Assets) - Total Liabilities
                            calculatedNetLiquidAssets = (structured.halalData.totalAssets - structured.halalData.illiquidAssets) - structured.halalData.totalLiabilities;
                            console.log(`✅ Calculated Net Liquid Assets: ${SniperUtils.formatMoney(calculatedNetLiquidAssets)} (from components)`);
                        } else if (structured.halalData.currentAssets && structured.halalData.currentLiabilities) {
                            // Fallback: Current Assets - Current Liabilities
                            calculatedNetLiquidAssets = structured.halalData.currentAssets - structured.halalData.currentLiabilities;
                            console.log(`✅ Calculated Net Liquid Assets: ${SniperUtils.formatMoney(calculatedNetLiquidAssets)} (Current Assets - Current Liabilities)`);
                        }
                        
                        // Override AI-provided netLiquidAssets with calculated value if we have components
                        if (calculatedNetLiquidAssets !== null && calculatedNetLiquidAssets !== undefined && 
                            (structured.halalData.totalAssets || structured.halalData.currentAssets)) {
                            structured.halalData.netLiquidAssets = calculatedNetLiquidAssets;
                        }
                        
                        const musaffaStatus = SniperUtils.getCachedHalalStatus(ticker);
                        const businessActivity = structured.halalData.businessActivity || 
                            SniperHalalScorer.extractBusinessActivity(markdown, musaffaStatus);
                        
                        const scoreResult = SniperHalalScorer.calculateHalalScore({
                            ticker,
                            companyName,
                            businessActivity,
                            haramIncomePercent: structured.halalData.haramIncomePercent,
                            interestBearingDebt: structured.halalData.interestBearingDebt,
                            totalAssets: structured.halalData.totalAssets,
                            illiquidAssets: structured.halalData.illiquidAssets,
                            netLiquidAssets: structured.halalData.netLiquidAssets,
                            marketCap: structured.halalData.marketCap,
                            grossRevenue: structured.halalData.grossRevenue
                        });
                        
                        // SCORE VOLATILITY PROTECTION: Reject massive swings (>20%) unless:
                        // 1. Cache is expired (>24h)
                        // 2. We have VERIFIED Alpha Vantage financial data
                        let isScoreVolatile = false;
                        let scoreVolatilityWarning = null;
                        
                        // Check if score was enhanced by Alpha Vantage verified data
                        const hasVerifiedAVData = avData && avData.halalData && (
                            avData.halalData.totalAssets != null ||
                            avData.halalData.netLiquidAssets != null ||
                            avData.halalData.interestBearingDebt != null
                        );
                        
                        // Get cached score from halalData.score or top-level score field
                        const cachedScore = cachedFinancial?.halalData?.score || cachedFinancial?.score || null;
                        
                        if (cachedFinancial && cachedScore && !hasVerifiedAVData) {
                            // Only apply volatility protection if we DON'T have verified Alpha Vantage data
                            const oldScoreNum = parseInt(cachedScore) || 0;
                            const newScoreNum = scoreResult.score;
                            const scoreDeviation = Math.abs(newScoreNum - oldScoreNum);
                            
                            if (scoreDeviation > 20 && !isCacheExpired) {
                                isScoreVolatile = true;
                                console.warn(`⚠️ High Score Volatility Detected: Score moved from ${oldScoreNum}% to ${newScoreNum}% (${scoreDeviation}% deviation)`);
                                
                                // Revert to cached stable score
                                const cachedScoreResult = cachedFinancial?.halalData?.scoreResult || cachedFinancial?.scoreResult || null;
                                if (cachedScoreResult) {
                                    console.log('⚠️ Reverting to cached Halal score due to volatility. Keeping stable version.');
                                    halalScore = `${oldScoreNum}%`;
                                    halalBreakdown = cachedScoreResult.breakdown || halalBreakdown;
                                    
                                    // Override scoreResult with cached version
                                    Object.assign(scoreResult, cachedScoreResult);
                                } else {
                                    // Fallback: Use cached score number but keep new breakdown
                                    halalScore = `${oldScoreNum}%`;
                                }
                                
                                scoreVolatilityWarning = {
                                    oldScore: oldScoreNum,
                                    newScore: newScoreNum,
                                    deviation: scoreDeviation,
                                    hoursAgo: cacheAgeHours.toFixed(1)
                                };
                                
                                // Add warning to breakdown
                                if (!halalBreakdown) halalBreakdown = '';
                                halalBreakdown += `\n\n⚠️ **Score Volatility Warning**: Score deviation of ${scoreDeviation}% detected (${oldScoreNum}% → ${newScoreNum}%). Using stable cached score to prevent hallucination.`;
                            }
                        } else if (hasVerifiedAVData && cachedScore) {
                            // Log that we're trusting Alpha Vantage data over cached score
                            const oldScoreNum = parseInt(cachedScore) || 0;
                            const newScoreNum = scoreResult.score;
                            if (Math.abs(newScoreNum - oldScoreNum) > 20) {
                                console.log(`📊 Score updated from ${oldScoreNum}% to ${newScoreNum}% using VERIFIED Alpha Vantage financial data`);
                                // Add a positive note in breakdown
                                if (!halalBreakdown) halalBreakdown = '';
                                halalBreakdown += `\n\n✅ **Score Verified by Alpha Vantage**: Financial data from real SEC filings (Total Assets: $${(avData.halalData.totalAssets / 1e6).toFixed(1)}M, Debt: $${((avData.halalData.interestBearingDebt || 0) / 1e6).toFixed(1)}M)`;
                            }
                        } else if (hasVerifiedAVData) {
                            // Alpha Vantage data used but no cached score to compare
                            console.log(`📊 Halal score ${scoreResult.score}% calculated using VERIFIED Alpha Vantage financial data`);
                        }
                        
                        // Only update score if not volatile
                        if (!isScoreVolatile) {
                            halalScore = `${scoreResult.score}%`;
                        }
                        
                        // Check if AI's claimed score differs significantly from calculated score
                        // This catches AI hallucinations like claiming "100%" when data shows 40%
                        let aiScoreMismatch = null;
                        if (structured.halalScore && !isScoreVolatile) {
                            const aiScoreMatch = structured.halalScore.match(/(\d+)/);
                            if (aiScoreMatch) {
                                const aiScoreNum = parseInt(aiScoreMatch[1], 10);
                                const calculatedScoreNum = scoreResult.score;
                                const scoreDiff = Math.abs(aiScoreNum - calculatedScoreNum);
                                
                                if (scoreDiff >= 20) {
                                    aiScoreMismatch = {
                                        aiClaimed: aiScoreNum,
                                        calculated: calculatedScoreNum,
                                        difference: scoreDiff
                                    };
                                    console.warn(`⚠️ AI Score Mismatch: AI claimed ${aiScoreNum}% but calculated ${calculatedScoreNum}% (${scoreDiff}% diff)`);
                                }
                            }
                        }
                        
                        halalBreakdown = scoreResult.breakdown + (halalBreakdown?.includes('⚠️') ? halalBreakdown.split('⚠️')[1] : '');
                        currentHalalBreakdown = halalBreakdown; // Store for copy function
                        
                        // Store warnings for UI display
                        if (isDataInconsistent) {
                            structured._inconsistencyWarning = inconsistencyWarning;
                        }
                        if (isScoreVolatile) {
                            structured._scoreVolatilityWarning = scoreVolatilityWarning;
                        }
                        if (aiScoreMismatch) {
                            structured._aiScoreMismatch = aiScoreMismatch;
                        }
                        
                        // Save score result to cache for volatility protection (if not already saved above)
                        if (shouldSave && !isScoreVolatile && !isDataInconsistent) {
                            // Update cache with score information for future volatility checks
                            const cacheUpdate = {
                                ...structured.halalData,
                                score: scoreResult.score,
                                scoreResult: scoreResult
                            };
                            await SniperStorage.saveHalalFinancialData(ticker, cacheUpdate, source);
                            console.log(`✅ Saved halal score ${scoreResult.score}% to cache for volatility protection`);
                        }
                        
                        console.log('✅ Using comprehensive IFG halal scorer', scoreResult);
                        if (comparison.consistent && cachedFinancial) {
                            console.log('✅ Financial data consistent with cache');
                        }
                        if (isScoreVolatile) {
                            console.log('⚠️ Score volatility protection activated - using cached stable score');
                        }
                    } catch (e) {
                        console.error('Error calculating comprehensive halal score:', e);
                    }
                } else if (window.SniperHalalScorer && markdown.toLowerCase().includes('ifg 5-criteria') || markdown.toLowerCase().includes('5-criteria')) {
                    // Fallback: Try to extract financial data from markdown text if AI mentioned IFG methodology
                    console.log('⚠️ AI mentioned IFG methodology but no halalData in JSON. Attempting to extract from text...');
                    try {
                        const musaffaStatus = SniperUtils.getCachedHalalStatus(ticker);
                        const businessActivity = SniperHalalScorer.extractBusinessActivity(markdown, musaffaStatus);
                        
                        // Try to extract financial metrics from markdown using regex
                        const extractNumber = (text, pattern) => {
                            const match = text.match(pattern);
                            return match ? parseFloat(match[1].replace(/[,$]/g, '')) : null;
                        };
                        
                        // Extract market cap if mentioned
                        const marketCapMatch = markdown.match(/mkt cap[^0-9]*([0-9.]+[BMK]?)/i) || 
                                               markdown.match(/market cap[^0-9]*([0-9.]+[BMK]?)/i);
                        let marketCap = null;
                        if (marketCapMatch) {
                            const val = marketCapMatch[1];
                            if (val.includes('B')) marketCap = parseFloat(val) * 1e9;
                            else if (val.includes('M')) marketCap = parseFloat(val) * 1e6;
                            else if (val.includes('K')) marketCap = parseFloat(val) * 1e3;
                            else marketCap = parseFloat(val);
                        }
                        
                        // Check for zero debt mentions
                        const zeroDebt = /zero debt|no debt|debt.*0/i.test(markdown);
                        const interestBearingDebt = zeroDebt ? 0 : null;
                        
                        // If we have enough data, calculate score
                        if (businessActivity && (zeroDebt || marketCap)) {
                            const scoreResult = SniperHalalScorer.calculateHalalScore({
                                ticker,
                                companyName,
                                businessActivity,
                                haramIncomePercent: /no haram income|zero haram/i.test(markdown) ? 0 : null,
                                interestBearingDebt: interestBearingDebt,
                                totalAssets: null,
                                illiquidAssets: null,
                                netLiquidAssets: null,
                                marketCap: marketCap,
                                grossRevenue: null
                            });
                            
                            // Only override if we got a meaningful score (not just business activity)
                            if (scoreResult.passedCriteria > 1) {
                                halalScore = `${scoreResult.score}%`;
                                halalBreakdown = scoreResult.breakdown + '\n\n⚠️ Note: Score calculated from limited data extracted from report text. For full accuracy, AI should return halalData in JSON structure.';
                                currentHalalBreakdown = halalBreakdown; // Store for copy function
                                console.log('✅ Extracted partial data and calculated score', scoreResult);
                            }
                        }
                    } catch (e) {
                        console.error('Error in fallback halal score extraction:', e);
                    }
                }
            }

            // Fallback: Regex to capture highlights from markdown
            if (!actionableTake) {
                const takeMatch = markdown.match(/\*\*Actionable Take:\*\*\s*(.+)/i) || markdown.match(/- Actionable Take:\s*(.+)/i);
                if (takeMatch) {
                    actionableTake = takeMatch[1].trim();
                }
            }

            if (!halalScore) {
                // First try: Extract from markdown text
                const scoreMatch = markdown.match(/\*\*Halal Score:\*\*\s*(.+)/i) || markdown.match(/- Halal Score:\s*(.+)/i);
                if (scoreMatch) {
                    halalScore = scoreMatch[1].trim();
                }
                // Final fallback: Use AI's structured score if no other source available
                // But add a warning flag since this is unverified
                if (!halalScore && structured?.halalScore) {
                    halalScore = structured.halalScore;
                    // Mark as unverified - scorer didn't have enough data
                    if (!structured._scoreWarning) {
                        structured._scoreWarning = {
                            type: 'UNVERIFIED',
                            message: 'Score from AI analysis - financial data unavailable for verification'
                        };
                    }
                    console.warn('⚠️ Using unverified AI halal score (no financial data for scorer):', halalScore);
                }
            }

            // Clean up empty Headers if we removed lines under them (keeping this just in case, harmless if text remains)
            markdown = markdown.replace(/## ⚡ HIGHLIGHTS\s*(\n|$)/g, '').replace(/Highlights:\s*(\n|$)/g, '');

            let html = this.renderMarkdown(markdown);

            // Build Highlights Section - Decision/Confidence at top, then Actionable Take and Halal Score
            let highlightsHtml = '';
            const hasStructuredData = structured && (structured.decision || structured.confidence || structured.actionableTake || structured.halalScore);
            
            if (hasStructuredData || actionableTake || halalScore) {
                // Parse score number for color/bar
                let scoreNum = 0;
                let scoreColor = '#71717a';
                if (halalScore) {
                    const numMatch = halalScore.match(/(\d+)%/);
                    if (numMatch) {
                        scoreNum = parseInt(numMatch[1], 10);
                        if (scoreNum >= 90) scoreColor = '#22c55e'; // Green
                        else if (scoreNum >= 50) scoreColor = '#eab308'; // Yellow
                        else scoreColor = '#ef4444'; // Red
                    }
                }

                // Determine decision color from structured data
                let decisionColor = '#71717a';
                let decisionText = '';
                let confidenceText = '';
                if (structured) {
                    const decision = structured.decision || '';
                    const confidence = structured.confidence || '';
                    if (decision.match(/Buy|Bullish/i)) decisionColor = '#22c55e';
                    else if (decision.match(/Sell|Bearish/i)) decisionColor = '#ef4444';
                    else if (decision.match(/Hold|Neutral/i)) decisionColor = '#eab308';
                    
                    decisionText = decision;
                    confidenceText = confidence;
                }

                highlightsHtml = `
                    <!-- Top Section: Decision and Confidence -->
                    ${decisionText ? `
                    <div style="background: #18181b; border: 1px solid ${decisionColor}40; border-radius: 10px; padding: 20px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px;">
                        <div style="flex: 1;">
                            <div style="font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Decision</div>
                            <div style="color: ${decisionColor}; font-size: 24px; font-weight: 700; line-height: 1.2;">
                                ${decisionText}
                            </div>
                        </div>
                        ${confidenceText ? `
                        <div style="flex: 1;">
                            <div style="font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Confidence</div>
                            <div style="color: #e4e4e7; font-size: 20px; font-weight: 600; line-height: 1.2;">
                                ${confidenceText}
                            </div>
                        </div>` : ''}
                    </div>` : ''}
                    
                    <!-- Details Section: Actionable Take and Halal Score -->
                    <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
                        ${actionableTake ? (() => {
                        let formatted = actionableTake
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/\[\[(\d+)\]\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="display:inline-flex;align-items:center;justify-content:center;min-width:14px;height:14px;padding:0 3px;border-radius:4px;background:rgba(37,99,235,0.2);color:#60a5fa;font-size:9px;font-weight:700;text-decoration:none;margin:0 2px;vertical-align:text-top;border:1px solid rgba(37,99,235,0.3);position:relative;top:-1px;">$1</a>');
                        formatted = this.processInlineFormatting(formatted);
                        return `
                            <div style="flex: 1; min-width: 200px; background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; display: flex; flex-direction: column;">
                                <div style="font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Actionable Take</div>
                                <div style="color: #fff; font-size: 14px; line-height: 1.6; font-weight: 500;">
                                    ${formatted}
                                </div>
                            </div>`;
                    })() : ''}
                        
                        ${halalScore ? `
                        <div style="width: 160px; background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                            <div style="font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Halal Score</div>
                            ${scoreNum > 0 ? `
                            <div style="position: relative; width: 56px; height: 56px; border-radius: 50%; background: conic-gradient(${scoreColor} ${scoreNum}%, #27272a 0); margin-bottom: 8px; display: flex; align-items: center; justify-content: center;">
                                <div style="width: 48px; height: 48px; background: #18181b; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                    <span style="font-size: 16px; font-weight: 700; color: #fff;">${scoreNum}%</span>
                                </div>
                            </div>
                            <div style="font-size: 11px; color: #71717a; margin-top: 4px;">${halalBreakdown ? 'IFG 5-Criteria' : 'Business Activities'}</div>` : `
                            <div style="color: #a1a1aa; font-size: 16px; font-weight: 600; padding: 16px 0;">
                                ${halalScore}
                            </div>
                            <div style="font-size: 11px; color: #71717a; margin-top: 4px;">${halalBreakdown ? 'IFG 5-Criteria' : 'Business Activities'}</div>`}
                        </div>` : ''}
                    </div>
                    ${structured && structured._inconsistencyWarning ? `
                    <div style="margin-top: 8px; margin-bottom: 16px; padding: 8px 12px; background: rgba(234,179,8,0.1); border: 1px solid #eab308; border-radius: 6px; font-size: 11px; color: #eab308; display: flex; gap: 8px; align-items: flex-start;">
                        <span style="font-size: 14px; line-height: 1.2;">⚠️</span>
                        <div style="flex: 1; line-height: 1.4;">
                            <div style="font-weight: 600; margin-bottom: 2px;">Data Variance Detected</div>
                            <div style="opacity: 0.9; font-size: 10px;">
                                Net Liquid Assets: ${structured._inconsistencyWarning.cachedValue == null || isNaN(structured._inconsistencyWarning.cachedValue) ? 'N/A' : SniperUtils.formatMoney(structured._inconsistencyWarning.cachedValue)} (cached) vs ${structured._inconsistencyWarning.newValue == null || isNaN(structured._inconsistencyWarning.newValue) ? 'N/A' : SniperUtils.formatMoney(structured._inconsistencyWarning.newValue)} (new). Using stable cached values to prevent thrashing.
                            </div>
                        </div>
                    </div>` : ''}
                    ${structured && structured._scoreVolatilityWarning ? `
                    <div style="margin-top: 8px; margin-bottom: 16px; padding: 8px 12px; background: rgba(234,179,8,0.1); border: 1px solid #eab308; border-radius: 6px; font-size: 11px; color: #eab308; display: flex; gap: 8px; align-items: flex-start;">
                        <span style="font-size: 14px; line-height: 1.2;">⚠️</span>
                        <div style="flex: 1; line-height: 1.4;">
                            <div style="font-weight: 600; margin-bottom: 2px;">Score Volatility Detected</div>
                            <div style="opacity: 0.9; font-size: 10px;">
                                Halal Score deviation of ${structured._scoreVolatilityWarning.deviation}% detected (${structured._scoreVolatilityWarning.oldScore}% → ${structured._scoreVolatilityWarning.newScore}%). Using stable cached score (${structured._scoreVolatilityWarning.oldScore}%) to prevent hallucination.
                            </div>
                        </div>
                    </div>` : ''}
                    ${structured && structured._aiScoreMismatch ? `
                    <div style="margin-top: 8px; margin-bottom: 16px; padding: 8px 12px; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 6px; font-size: 11px; color: #f87171; display: flex; gap: 8px; align-items: flex-start;">
                        <span style="font-size: 14px; line-height: 1.2;">🚨</span>
                        <div style="flex: 1; line-height: 1.4;">
                            <div style="font-weight: 600; margin-bottom: 2px;">AI Score Mismatch Detected</div>
                            <div style="opacity: 0.9; font-size: 10px;">
                                AI claimed ${structured._aiScoreMismatch.aiClaimed}% but actual IFG 5-criteria score is ${structured._aiScoreMismatch.calculated}% (${structured._aiScoreMismatch.difference}% difference). Using calculated score based on available financial data.
                            </div>
                        </div>
                    </div>` : ''}
                    ${structured && structured._scoreWarning ? `
                    <div style="margin-top: 8px; margin-bottom: 16px; padding: 8px 12px; background: rgba(113,113,122,0.1); border: 1px solid #71717a; border-radius: 6px; font-size: 11px; color: #a1a1aa; display: flex; gap: 8px; align-items: flex-start;">
                        <span style="font-size: 14px; line-height: 1.2;">ℹ️</span>
                        <div style="flex: 1; line-height: 1.4;">
                            <div style="font-weight: 600; margin-bottom: 2px;">${structured._scoreWarning.type === 'UNVERIFIED' ? 'Unverified Score' : 'Score Notice'}</div>
                            <div style="opacity: 0.9; font-size: 10px;">
                                ${structured._scoreWarning.message}
                            </div>
                        </div>
                    </div>` : ''}
                    ${halalBreakdown ? `
                    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                        <div style="font-size: 11px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">Halal Compliance Breakdown</div>
                        <div style="color: #d4d4d8; font-size: 12px; line-height: 1.6; white-space: pre-wrap; font-family: 'Consolas', 'Monaco', monospace;">${halalBreakdown.replace(/\*\*/g, '').replace(/## /g, '').replace(/### /g, '')}</div>
                    </div>` : ''}
                `;
            }

            // Extract sources from markdown if not provided separately
            let extractedSources = sources;
            if (!extractedSources && markdown) {
                // Try to extract sources section from markdown
                const sourcesMatch = markdown.match(/Sources?:?\s*\n((?:\d+\.\s*[^\n]+\n?)+)/i);
                if (sourcesMatch) {
                    const sourceLines = sourcesMatch[1].split('\n').filter(l => l.trim());
                    extractedSources = sourceLines.map(line => {
                        const urlMatch = line.match(/\d+\.\s*(.+)/);
                        return urlMatch ? urlMatch[1].trim() : line.trim();
                    }).filter(Boolean);
                }
            }
            
            // Store sources for copy function
            currentSources = extractedSources || [];
            
            // Build sources section HTML
            let sourcesHtml = '';
            if (grounded && extractedSources && extractedSources.length > 0) {
                const sourcesList = extractedSources.slice(0, 10).map((source, idx) => {
                    // Check if source is a URL
                    const isUrl = /^https?:\/\//i.test(source);
                    const displayText = source.replace(/^Search:\s*/i, ''); // Remove "Search:" prefix if present
                    
                    if (isUrl) {
                        return `
                            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 0;">
                                <span style="color: #71717a; font-size: 11px; min-width: 16px;">${idx + 1}.</span>
                                <a href="${source}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; font-size: 11px; text-decoration: none; word-break: break-all; line-height: 1.4; border-bottom: 1px dashed rgba(96,165,250,0.3);" onmouseover="this.style.color='#93c5fd';this.style.borderBottomColor='rgba(147,197,253,0.5)';" onmouseout="this.style.color='#60a5fa';this.style.borderBottomColor='rgba(96,165,250,0.3)';">${displayText}</a>
                            </div>
                        `;
                    } else {
                        return `
                            <div style="display: flex; align-items: flex-start; gap: 8px; padding: 6px 0;">
                                <span style="color: #71717a; font-size: 11px; min-width: 16px;">${idx + 1}.</span>
                                <span style="color: #a1a1aa; font-size: 11px; line-height: 1.4;">${displayText}</span>
                            </div>
                        `;
                    }
                }).join('');
                
                sourcesHtml = `
                    <div style="background: rgba(37,99,235,0.05); border: 1px solid rgba(37,99,235,0.15); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <span style="font-size: 14px;">📎</span>
                            <div style="color: #60a5fa; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Sources</div>
                            <span style="color: #71717a; font-size: 10px;">(${extractedSources.length})</span>
                        </div>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${sourcesList}
                        </div>
                    </div>
                `;
            }
            
            if (grounded) {
                html = `
                    <div style="background: rgba(37,99,235,0.1); border: 1px solid rgba(37,99,235,0.2); border-radius: 8px; padding: 12px; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 16px;">🌐</span>
                        <div>
                            <div style="color: #60a5fa; font-size: 12px; font-weight: 600;">Enhanced with Web Search</div>
                            <div style="color: #93c5fd; font-size: 11px; opacity: 0.8;">Includes real-time market context & activity check</div>
                        </div>
                    </div>
                ` + html;
            }
            
            // Build Analyst Consensus HTML from Alpha Vantage data
            let analystHtml = '';
            let conflictWarningHtml = '';
            
            if (avData && avData.overview && avData.overview.analyst) {
                const analyst = avData.overview.analyst;
                const currentPrice = stats ? (stats.totalBuy / Math.max(stats.countBuy, 1)) / 1000 : null; // Approximate from insider data
                
                if (analyst.totalAnalysts > 0) {
                    const targetPrice = analyst.targetPrice;
                    const upside = targetPrice && avData.overview.movingAvg50 ? 
                        ((targetPrice - avData.overview.movingAvg50) / avData.overview.movingAvg50 * 100).toFixed(1) : null;
                    const upsideColor = upside > 0 ? '#4ade80' : upside < 0 ? '#f87171' : '#71717a';
                    
                    // Rating bar visualization
                    const total = analyst.totalAnalysts;
                    const buyWidth = ((analyst.strongBuy + analyst.buy) / total * 100).toFixed(0);
                    const holdWidth = (analyst.hold / total * 100).toFixed(0);
                    const sellWidth = ((analyst.sell + analyst.strongSell) / total * 100).toFixed(0);
                    
                    // Consensus color
                    const consensusColor = analyst.consensus === 'Buy' ? '#4ade80' : 
                                          analyst.consensus === 'Sell' ? '#f87171' : '#eab308';
                    
                    analystHtml = `
                        <div style="background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                <span style="font-size: 16px;">📊</span>
                                <div style="font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Analyst Consensus</div>
                                <span style="font-size: 10px; color: #52525b; margin-left: auto;">Alpha Vantage</span>
                            </div>
                            
                            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                                <div style="flex: 1;">
                                    <div style="font-size: 10px; color: #71717a; margin-bottom: 4px;">RATING</div>
                                    <div style="font-size: 20px; font-weight: 700; color: ${consensusColor};">${analyst.consensus}</div>
                                    <div style="font-size: 11px; color: #52525b;">${total} analyst${total > 1 ? 's' : ''}</div>
                                </div>
                                ${targetPrice ? `
                                <div style="flex: 1;">
                                    <div style="font-size: 10px; color: #71717a; margin-bottom: 4px;">TARGET</div>
                                    <div style="font-size: 20px; font-weight: 700; color: #fff;">$${targetPrice.toFixed(2)}</div>
                                    ${upside !== null ? `<div style="font-size: 11px; color: ${upsideColor};">${upside > 0 ? '+' : ''}${upside}% vs 50MA</div>` : ''}
                                </div>` : ''}
                            </div>
                            
                            <!-- Rating Bar -->
                            <div style="height: 8px; background: #27272a; border-radius: 4px; overflow: hidden; display: flex;">
                                <div style="width: ${buyWidth}%; background: #4ade80;" title="Buy: ${analyst.strongBuy + analyst.buy}"></div>
                                <div style="width: ${holdWidth}%; background: #eab308;" title="Hold: ${analyst.hold}"></div>
                                <div style="width: ${sellWidth}%; background: #f87171;" title="Sell: ${analyst.sell + analyst.strongSell}"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: #71717a;">
                                <span>Buy ${analyst.strongBuy + analyst.buy}</span>
                                <span>Hold ${analyst.hold}</span>
                                <span>Sell ${analyst.sell + analyst.strongSell}</span>
                            </div>
                        </div>
                    `;
                    
                    // Check for AI vs Analyst conflict
                    if (structured && structured.decision) {
                        const aiDecision = structured.decision.toLowerCase();
                        const analystConsensus = analyst.consensus.toLowerCase();
                        
                        const isMajorConflict = (aiDecision.includes('buy') && analystConsensus === 'sell') ||
                                               (aiDecision.includes('sell') && analystConsensus === 'buy');
                        const isMinorConflict = (aiDecision.includes('buy') && analystConsensus === 'hold') ||
                                               (aiDecision.includes('sell') && analystConsensus === 'hold');
                        
                        if (isMajorConflict) {
                            conflictWarningHtml = `
                                <div style="margin-bottom: 16px; padding: 10px 14px; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 8px; display: flex; gap: 10px; align-items: flex-start;">
                                    <span style="font-size: 16px;">⚠️</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 12px; font-weight: 600; color: #f87171; margin-bottom: 4px;">AI vs Analyst Conflict</div>
                                        <div style="font-size: 11px; color: #fca5a5; line-height: 1.4;">
                                            AI recommends <strong>${structured.decision.toUpperCase()}</strong> but ${total} analyst${total > 1 ? 's' : ''} rate it <strong>${analyst.consensus.toUpperCase()}</strong>.
                                            ${targetPrice ? `Target price: $${targetPrice.toFixed(2)}` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        } else if (isMinorConflict) {
                            conflictWarningHtml = `
                                <div style="margin-bottom: 16px; padding: 10px 14px; background: rgba(234,179,8,0.1); border: 1px solid #eab308; border-radius: 8px; display: flex; gap: 10px; align-items: flex-start;">
                                    <span style="font-size: 16px;">ℹ️</span>
                                    <div style="flex: 1;">
                                        <div style="font-size: 12px; font-weight: 600; color: #eab308; margin-bottom: 4px;">Consider Analyst View</div>
                                        <div style="font-size: 11px; color: #fde047; line-height: 1.4;">
                                            AI says <strong>${structured.decision}</strong>, analysts say <strong>${analyst.consensus}</strong> (${total} analyst${total > 1 ? 's' : ''}).
                                        </div>
                                    </div>
                                </div>
                            `;
                        }
                    }
                }
            }

            contentDiv.innerHTML = `<div style="animation: sniperFadeIn 0.3s ease;">${highlightsHtml}${conflictWarningHtml}${analystHtml}${html}${sourcesHtml}</div>`;
        };

        // Store Alpha Vantage data for display
        let alphaVantageData = null;
        
        const runAnalysis = async (withSearch) => {
            const contentDiv = popup.querySelector('#ai-analysis-content');

            // FORCE RUN: If user clicked Run, we ignore cache.
            contentDiv.innerHTML = `
                <div class="sniper-thinking" style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 32px; margin-bottom: 16px;">${withSearch ? '🌐' : '⚡'}</div>
                    <div style="font-size: 14px; color: #e4e4e7; font-weight: 500; margin-bottom: 6px;">
                        ${withSearch ? 'Fetching Market Data & Analyzing...' : 'Analyzing Insider Data...'}
                    </div>
                    <div style="font-size: 12px; color: #71717a;">
                        ${withSearch ? 'Checking analyst consensus, financials, and insider trades.' : 'Identifying patterns in insider transactions.'}
                    </div>
                </div>
            `;

            // Fetch Alpha Vantage data for analyst consensus + financial data
            const avApiKey = SniperStorage.getAlphaVantageKey();
            if (avApiKey) {
                try {
                    // Check cache first
                    alphaVantageData = await SniperStorage.getAlphaVantageData(ticker);
                    
                    if (!alphaVantageData) {
                        console.log('📊 Fetching Alpha Vantage data for', ticker);
                        // Fetch via background script
                        alphaVantageData = await new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                action: 'fetchAlphaVantageData',
                                ticker: ticker,
                                apiKey: avApiKey,
                                dataType: 'comprehensive'
                            }, (response) => {
                                if (response && response.success) {
                                    // Cache the data
                                    SniperStorage.saveAlphaVantageData(ticker, response);
                                    resolve(response);
                                } else {
                                    console.warn('📊 Alpha Vantage fetch failed:', response?.error);
                                    resolve(null);
                                }
                            });
                        });
                    }
                    
                    if (alphaVantageData) {
                        console.log('📊 Got Alpha Vantage data:', alphaVantageData.overview?.analyst);
                    }
                } catch (e) {
                    console.warn('📊 Alpha Vantage error:', e.message);
                }
            }

            // Fetch Musaffa financial data from storage (synced from Musaffa page visits)
            let musaffaData = null;
            try {
                if (typeof SniperStorage !== 'undefined' && SniperStorage.getHalalEnhanced) {
                    musaffaData = await SniperStorage.getHalalEnhanced(ticker);
                    if (musaffaData) {
                        console.log('🎯 AI: Found Musaffa financial data for', ticker, musaffaData);
                    }
                }
            } catch (e) {
                console.log('🎯 AI: No Musaffa data available for', ticker);
            }

            // Decide whether to use backend or direct API
            // Backend is used when user has no API key but has Pro subscription or free tier remaining
            const shouldUseBackend = canUseBackend && !withSearch; // Backend doesn't support web search yet
            
            // If Deep Research requested but no API key and not Pro, show upgrade prompt
            if (withSearch && !apiKey) {
                const currentAccess = await checkAIAccess();
                if (!currentAccess.isPro) {
                    contentDiv.innerHTML = `
                        <div style="text-align: center; padding: 40px 20px;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🌐</div>
                            <h3 style="color: #fff; font-size: 18px; margin-bottom: 8px;">Deep Research is a Pro Feature</h3>
                            <p style="color: #a1a1aa; font-size: 14px; margin-bottom: 20px;">
                                Web-powered deep research with live market data requires Pro subscription or your own API key.
                            </p>
                            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                                <button id="sniper-deep-upgrade" style="
                                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                                    color: #fff; border: none; padding: 12px 24px;
                                    border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
                                    box-shadow: 0 4px 14px rgba(34, 197, 94, 0.3);
                                ">🚀 Upgrade to Pro</button>
                                <button id="sniper-deep-quick" style="
                                    background: #18181b; color: #e4e4e7;
                                    border: 1px solid #27272a; padding: 12px 24px;
                                    border-radius: 8px; font-size: 14px; cursor: pointer;
                                ">⚡ Use Quick Analysis</button>
                                <button id="sniper-deep-own-key" style="
                                    background: transparent; color: #71717a;
                                    border: 1px solid #27272a; padding: 12px 24px;
                                    border-radius: 8px; font-size: 14px; cursor: pointer;
                                ">🔑 Use Own API Key</button>
                            </div>
                        </div>
                    `;
                    
                    document.getElementById('sniper-deep-upgrade')?.addEventListener('click', () => {
                        chrome.runtime.sendMessage({ 
                            action: 'getCheckoutUrl',
                            successUrl: window.location.href + '?upgraded=true'
                        }, (response) => {
                            if (response?.checkoutUrl) window.open(response.checkoutUrl, '_blank');
                        });
                    });
                    
                    document.getElementById('sniper-deep-quick')?.addEventListener('click', () => {
                        setActiveMode('quick');
                        runAnalysis(false);
                    });
                    
                    document.getElementById('sniper-deep-own-key')?.addEventListener('click', () => {
                        SniperAI.showApiKeyDialog();
                    });
                    
                    return;
                }
            }
            
            const handleResponse = (response) => {
                if (response && response.success) {
                    // Extract JSON block if present
                    let markdown = response.analysis;
                    let structured = null;
                    
                    // Use robust JSON extraction function
                    structured = extractJSONBlock(markdown);
                    
                    // Remove JSON block from markdown before saving/displaying
                    markdown = removeJSONBlock(markdown);

                    // Determine mode for storage key
                    const mode = withSearch ? 'deep' : 'quick';
                    
                    // SAVE TO STORAGE with structured data (markdown is now cleaned)
                    // Uses chrome.storage.local for cross-site sharing (OpenInsider <-> Musaffa)
                    SniperStorage.saveAIHistory(ticker, markdown, insiderData, mode, {
                        structured: structured,
                        grounded: response.grounded || false,
                        sources: response.sources || null
                    });

                    // Call async displayResult without await (callback context)
                    displayResult(markdown, response.grounded, structured, response.sources || null, alphaVantageData).catch(e => {
                        console.error('Error displaying result:', e);
                    });
                } else {
                    // Check if it's a limit reached error
                    if (response?.error === 'limit_reached') {
                        showUpgradeBanner(contentDiv, response.usage, response.limit, response.isPro);
                    } else {
                        contentDiv.innerHTML = this.renderError(response?.error || 'Unknown error');
                    }
                }
            };
            
            if (shouldUseBackend) {
                // Use backend API (no API key needed, uses Pro subscription)
                console.log('🎯 AI: Using backend API for', ticker);
                chrome.runtime.sendMessage({
                    action: 'aiAnalyzeBackend',
                    ticker: ticker,
                    companyName: companyName,
                    insiderData: insiderData,
                    provider: provider
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        contentDiv.innerHTML = this.renderError(chrome.runtime.lastError.message);
                        return;
                    }
                    handleResponse(response);
                });
            } else {
                // Use direct API with user's own key
                const action = withSearch ? 'aiAnalyzeWithSearch' : 'aiAnalyze';
                console.log('🎯 AI: Using direct API for', ticker, 'action:', action);

                chrome.runtime.sendMessage({
                    action: action,
                    ticker: ticker,
                    companyName: companyName,
                    insiderData: insiderData,
                    musaffaData: musaffaData,
                    apiKey: apiKey,
                    provider: provider
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        contentDiv.innerHTML = this.renderError(chrome.runtime.lastError.message);
                        return;
                    }
                    handleResponse(response);
                });
            }
        };

        quickBtn.onclick = () => { setActiveMode('quick'); runAnalysis(false); };
        deepBtn.onclick = () => { setActiveMode('deep'); runAnalysis(true); };

        // Initial Load Logic
        if (existingReport) {
            // VIEW SAVED REPORT MODE
            // Determine mode from existing report or default to quick
            const reportMode = existingReport.mode || initialMode || 'quick';
            setActiveMode(reportMode); // Set visual mode to match report type
            
            // Fetch Alpha Vantage data for analyst consensus display (even for cached reports)
            const loadCachedReportWithAV = async () => {
                const avApiKey = SniperStorage.getAlphaVantageKey();
                let avDataForCached = null;
                
                if (avApiKey) {
                    try {
                        avDataForCached = await SniperStorage.getAlphaVantageData(ticker);
                        if (!avDataForCached) {
                            // Fetch fresh if not cached
                            avDataForCached = await new Promise((resolve) => {
                                chrome.runtime.sendMessage({
                                    action: 'fetchAlphaVantageData',
                                    ticker: ticker,
                                    apiKey: avApiKey,
                                    dataType: 'comprehensive'
                                }, (response) => {
                                    if (response && response.success) {
                                        SniperStorage.saveAlphaVantageData(ticker, response);
                                        resolve(response);
                                    } else {
                                        resolve(null);
                                    }
                                });
                            });
                        }
                    } catch (e) {
                        console.warn('📊 Alpha Vantage error for cached report:', e.message);
                    }
                }
                
                // Display with Alpha Vantage data
                await displayResult(existingReport.analysis, existingReport.grounded, existingReport.structured, existingReport.sources || null, avDataForCached);
            };
            
            loadCachedReportWithAV().catch(e => {
                console.error('Error displaying cached result:', e);
            });

            // Add a "Cached" label
            const contentDiv = popup.querySelector('#ai-analysis-content');
            const timeStr = new Date(existingReport.timestamp).toLocaleString();
            const cachedLabel = document.createElement('div');
            cachedLabel.style.cssText = "display:flex; justify-content:space-between; font-size:10px; color:#52525b; margin-bottom:12px; border-bottom:1px solid #27272a; padding-bottom:8px;";
            cachedLabel.innerHTML = `<span>Report generated: ${timeStr}</span>`;

            // If we have structured data, show a mini badge here too (optional, but cool)
            if (existingReport.structured) {
                const s = existingReport.structured;
                cachedLabel.innerHTML += `<span style="color:${s.decision === 'Buy' ? '#4ade80' : s.decision === 'Sell' ? '#f87171' : '#fbbf24'}">Verdict: ${s.decision} (${s.confidence})</span>`;
            }

            contentDiv.insertBefore(cachedLabel, contentDiv.firstChild);

        } else {
            // NEW ANALYSIS MODE
            // Immediately trigger based on requested mode
            if (initialMode === 'deep') {
                setActiveMode('deep');
                runAnalysis(true);
            } else {
                setActiveMode('quick');
                runAnalysis(false);
            }
        }
    },

    renderError(message) {
        const isApiKeyError = message.toLowerCase().includes('api') || message.toLowerCase().includes('key');
        return `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 32px; margin-bottom: 16px;">⚠️</div>
                <div style="font-size: 15px; color: #f87171; font-weight: 500; margin-bottom: 8px;">Analysis Failed</div>
                <div style="font-size: 12px; color: #a1a1aa; max-width: 300px; margin: 0 auto; line-height: 1.5;">${message}</div>
                ${isApiKeyError ? `
                    <button onclick="SniperAI.showApiKeyDialog(); document.getElementById('sniper-ai-backdrop').click();" 
                            style="margin-top: 24px; padding: 8px 16px; background: #27272a; border: 1px solid #3f3f46; color: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500; transition:all 0.2s;" onmouseover="this.style.background='#3f3f46'" onmouseout="this.style.background='#27272a'">
                        Configure API Key
                    </button>
                ` : ''}
            </div>
        `;
    },

    async showApiKeyDialog(onSuccess) {
        const existing = document.getElementById('sniper-api-key-dialog');
        if (existing) existing.remove();
        const existingBackdrop = document.getElementById('sniper-api-key-backdrop');
        if (existingBackdrop) existingBackdrop.remove();

        const currentGeminiKey = SniperUtils.getGeminiApiKey();
        const currentXaiKey = SniperUtils.getXaiApiKey();
        const currentAvKey = SniperStorage.getAlphaVantageKey();
        const currentProvider = SniperUtils.getAiProvider();
        const maskedGemini = currentGeminiKey ? currentGeminiKey.substring(0, 8) + '...' + currentGeminiKey.substring(currentGeminiKey.length - 4) : '';
        const maskedXai = currentXaiKey ? currentXaiKey.substring(0, 8) + '...' + currentXaiKey.substring(currentXaiKey.length - 4) : '';
        
        // Get current subscription info
        let currentEmail = '';
        let currentLicense = '';
        let subscriptionStatus = null;
        
        try {
            const stored = await new Promise(resolve => chrome.storage.sync.get(['userEmail', 'licenseKey'], resolve));
            currentEmail = stored.userEmail || '';
            currentLicense = stored.licenseKey || '';
            subscriptionStatus = await checkAIAccess();
        } catch (e) {
            console.log('Error loading subscription info:', e);
        }

        const backdrop = document.createElement('div');
        backdrop.id = 'sniper-api-key-backdrop';
        backdrop.style.cssText = `position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); z-index: 100002; backdrop-filter: blur(4px);`;

        const dialog = document.createElement('div');
        dialog.id = 'sniper-api-key-dialog';
        dialog.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #09090b; 
            border: 1px solid #27272a; border-radius: 12px; padding: 24px;
            z-index: 100003; width: 420px; max-width: 90vw; box-shadow: 0 25px 80px rgba(0,0,0,0.6);
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
        `;

        // Build subscription status display
        const subStatusHtml = subscriptionStatus?.isPro 
            ? `<div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 8px; padding: 10px 12px; margin-bottom: 16px;">
                   <div style="display: flex; align-items: center; gap: 8px;">
                       <span style="color: #22c55e; font-weight: 600; font-size: 13px;">✓ Pro Active</span>
                       <span style="color: #71717a; font-size: 11px;">${currentEmail}</span>
                   </div>
               </div>`
            : subscriptionStatus?.hasOwnKey
            ? `<div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 8px; padding: 10px 12px; margin-bottom: 16px;">
                   <div style="color: #60a5fa; font-size: 12px;">Using your own API keys</div>
               </div>`
            : `<div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 10px 12px; margin-bottom: 16px;">
                   <div style="display: flex; justify-content: space-between; align-items: center;">
                       <span style="color: #f59e0b; font-size: 12px;">Free: ${subscriptionStatus?.usage || 0}/${subscriptionStatus?.limit || 3} analyses used</span>
                       <button id="sniper-settings-upgrade" style="background: #22c55e; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;">Upgrade</button>
                   </div>
               </div>`;

        dialog.innerHTML = `
            <div style="font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 8px; display: flex; align-items: center; gap: 10px;">
                <span>⚙️</span> Settings
            </div>
            <div style="font-size: 13px; color: #a1a1aa; margin-bottom: 16px; line-height: 1.5;">
                Manage your subscription and API keys.
            </div>
            
            ${subStatusHtml}
            
            <!-- Pro Subscription Section -->
            <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #27272a;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 14px;">🎯</span>
                    <span style="font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Pro Subscription</span>
                </div>
                <div style="margin-bottom: 12px;">
                    <div style="font-size:12px; color:#d4d4d8; margin-bottom:4px; font-weight:500;">Email</div>
                    <input type="email" id="sniper-user-email" placeholder="your@email.com" 
                           style="width: 100%; padding: 8px 12px; background: #18181b; border: 1px solid #27272a; color: white; border-radius: 6px; font-size: 12px; outline: none;"
                           value="${currentEmail}">
                    <div style="font-size:10px; color:#52525b; margin-top:2px;">Enter the email you used for Polar checkout</div>
                </div>
                <div>
                    <div style="font-size:12px; color:#d4d4d8; margin-bottom:4px; font-weight:500;">License Key <span style="color:#52525b; font-weight:400;">(optional)</span></div>
                    <input type="text" id="sniper-license-key" placeholder="XXXX-XXXX-XXXX-XXXX" 
                           style="width: 100%; padding: 8px 12px; background: #18181b; border: 1px solid #27272a; color: white; border-radius: 6px; font-size: 12px; font-family: monospace; outline: none;"
                           value="${currentLicense}">
                </div>
            </div>
            
            <!-- AI Provider Section -->
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <span style="font-size: 14px;">🤖</span>
                <span style="font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Own API Keys (Optional)</span>
            </div>
            <div style="font-size: 11px; color: #52525b; margin-bottom: 12px;">Skip Pro subscription by using your own API keys.</div>
            
            <div style="display:flex; gap:12px; margin-bottom:16px;">
                <label style="flex:1; cursor:pointer;">
                    <input type="radio" name="ai-provider" value="gemini" ${currentProvider === 'gemini' ? 'checked' : ''} style="display:none;" onchange="this.parentElement.parentElement.querySelectorAll('div').forEach(d => { d.style.borderColor = '#27272a'; d.style.background = '#18181b'; }); this.nextElementSibling.style.borderColor = '#2563eb'; this.nextElementSibling.style.background = 'rgba(37,99,235,0.1)';">
                    <div style="padding: 12px; border: 1px solid ${currentProvider === 'gemini' ? '#2563eb' : '#27272a'}; border-radius: 8px; background: ${currentProvider === 'gemini' ? 'rgba(37,99,235,0.1)' : '#18181b'}; transition: all 0.2s; text-align: center;">
                        <div style="font-weight: 600; color: #fff; font-size: 13px; margin-bottom: 2px;">Gemini</div>
                        <div style="font-size: 11px; color: #a1a1aa;">Google</div>
                    </div>
                </label>
                <label style="flex:1; cursor:pointer;">
                    <input type="radio" name="ai-provider" value="xai" ${currentProvider === 'xai' ? 'checked' : ''} style="display:none;" onchange="this.parentElement.parentElement.querySelectorAll('div').forEach(d => { d.style.borderColor = '#27272a'; d.style.background = '#18181b'; }); this.nextElementSibling.style.borderColor = '#2563eb'; this.nextElementSibling.style.background = 'rgba(37,99,235,0.1)';">
                    <div style="padding: 12px; border: 1px solid ${currentProvider === 'xai' ? '#2563eb' : '#27272a'}; border-radius: 8px; background: ${currentProvider === 'xai' ? 'rgba(37,99,235,0.1)' : '#18181b'}; transition: all 0.2s; text-align: center;">
                        <div style="font-weight: 600; color: #fff; font-size: 13px; margin-bottom: 2px;">Grok</div>
                        <div style="font-size: 11px; color: #a1a1aa;">xAI</div>
                    </div>
                </label>
            </div>

            <div style="margin-bottom: 16px;">
                <div style="font-size:12px; color:#d4d4d8; margin-bottom:6px; font-weight:500;">Gemini API Key</div>
                <input type="password" id="sniper-api-key-input-gemini" placeholder="AIza..." 
                       style="width: 100%; padding: 10px 12px; background: #18181b; border: 1px solid #27272a; color: white; border-radius: 8px; font-size: 13px; font-family: monospace; outline: none; transition: border-color 0.2s;"
                       onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#27272a'"
                       value="${currentGeminiKey}">
            </div>

            <div style="margin-bottom: 16px;">
                <div style="font-size:12px; color:#d4d4d8; margin-bottom:6px; font-weight:500;">Grok API Key</div>
                <input type="password" id="sniper-api-key-input-xai" placeholder="xai-..." 
                       style="width: 100%; padding: 10px 12px; background: #18181b; border: 1px solid #27272a; color: white; border-radius: 8px; font-size: 13px; font-family: monospace; outline: none; transition: border-color 0.2s;"
                       onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#27272a'"
                       value="${currentXaiKey}">
            </div>

            <div style="margin-bottom: 16px; padding-top: 16px; border-top: 1px solid #27272a;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 14px;">📊</span>
                    <span style="font-size: 12px; font-weight: 600; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.5px;">Market Data</span>
                </div>
                <div style="font-size:12px; color:#d4d4d8; margin-bottom:6px; font-weight:500;">Alpha Vantage API Key <span style="color:#52525b; font-weight:400;">(Free tier: 25 calls/day)</span></div>
                <input type="password" id="sniper-api-key-input-av" placeholder="Your Alpha Vantage key..." 
                       style="width: 100%; padding: 10px 12px; background: #18181b; border: 1px solid #27272a; color: white; border-radius: 8px; font-size: 13px; font-family: monospace; outline: none; transition: border-color 0.2s;"
                       onfocus="this.style.borderColor='#3b82f6'" onblur="this.style.borderColor='#27272a'"
                       value="${currentAvKey}">
                <div style="font-size:10px; color:#52525b; margin-top:4px;">Enables analyst ratings, target prices, and real financial data. <a href="https://www.alphavantage.co/support/#api-key" target="_blank" style="color:#60a5fa;">Get free key</a></div>
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display:flex; align-items:center; cursor:pointer; justify-content:space-between; background:#18181b; padding:10px 12px; border:1px solid #27272a; border-radius:8px;">
                    <span style="font-size:13px; color:#e4e4e7; font-weight:500;">Show Debug Panel</span>
                    <input type="checkbox" id="sniper-debug-toggle" style="accent-color:#2563eb; transform:scale(1.2);">
                </label>
                <div style="font-size:11px; color:#52525b; margin-top:4px; margin-left:4px;">Enable detailed logging and debug overlay.</div>
            </div>

            <div style="margin-top: 24px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="sniper-api-key-cancel" style="padding: 10px 16px; background: transparent; border: 1px solid transparent; color: #a1a1aa; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.color='#f4f4f5';this.style.background='#27272a';" onmouseout="this.style.color='#a1a1aa';this.style.background='transparent';">Cancel</button>
                <button id="sniper-api-key-save" style="padding: 10px 20px; background: #2563eb; border: 1px solid #3b82f6; color: white; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.background='#1d4ed8';this.style.borderColor='#2563eb';" onmouseout="this.style.background='#2563eb';this.style.borderColor='#3b82f6';">Save Changes</button>
            </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(dialog);

        const geminiInput = dialog.querySelector('#sniper-api-key-input-gemini');
        const xaiInput = dialog.querySelector('#sniper-api-key-input-xai');
        const avInput = dialog.querySelector('#sniper-api-key-input-av');
        const debugToggle = dialog.querySelector('#sniper-debug-toggle');
        const emailInput = dialog.querySelector('#sniper-user-email');
        const licenseInput = dialog.querySelector('#sniper-license-key');

        // Init Debug State
        debugToggle.checked = SniperStorage.getSetting('sniper_debug_mode', true);

        // Focus email input first (for Pro flow)
        if (!currentEmail && !currentGeminiKey && !currentXaiKey) {
            emailInput?.focus();
        } else if (currentProvider === 'xai') {
            xaiInput.focus();
        } else {
            geminiInput.focus();
        }

        const closeDialog = () => {
            dialog.remove();
            backdrop.remove();
        };

        backdrop.onclick = closeDialog;
        dialog.querySelector('#sniper-api-key-cancel').onclick = closeDialog;
        
        // Upgrade button in status section
        dialog.querySelector('#sniper-settings-upgrade')?.addEventListener('click', () => {
            chrome.runtime.sendMessage({ 
                action: 'getCheckoutUrl',
                email: emailInput?.value.trim(),
                successUrl: window.location.href + '?upgraded=true'
            }, (response) => {
                if (response?.checkoutUrl) window.open(response.checkoutUrl, '_blank');
            });
        });

        dialog.querySelector('#sniper-api-key-save').onclick = async () => {
            const selectedProvider = dialog.querySelector('input[name="ai-provider"]:checked')?.value || 'gemini';
            const geminiKey = geminiInput.value.trim();
            const xaiKey = xaiInput.value.trim();
            const avKey = avInput.value.trim();
            const debugState = debugToggle.checked;
            const userEmail = emailInput?.value.trim() || '';
            const licenseKey = licenseInput?.value.trim() || '';

            // Save Pro subscription credentials first
            if (userEmail || licenseKey) {
                await chrome.storage.sync.set({ 
                    userEmail: userEmail,
                    licenseKey: licenseKey
                });
                // Clear subscription cache to force refresh
                chrome.runtime.sendMessage({ action: 'getSubscription', forceRefresh: true });
                console.log('🎯 Pro credentials saved:', userEmail);
            }

            // Persist API keys
            SniperUtils.setGeminiApiKey(geminiKey);
            SniperUtils.setXaiApiKey(xaiKey);
            SniperUtils.setAiProvider(selectedProvider);
            SniperStorage.setSetting('sniper_debug_mode', debugState);
            
            // Save Alpha Vantage key (optional)
            if (avKey) {
                SniperStorage.setAlphaVantageKey(avKey);
                console.log('📊 Alpha Vantage API key saved');
            }

            // Allow save even without API keys if they have Pro email
            const hasProCredentials = userEmail.length > 0;
            const hasOwnKeys = geminiKey || xaiKey;
            
            if (!hasProCredentials && !hasOwnKeys) {
                // Highlight email field
                if (emailInput) {
                    emailInput.style.borderColor = '#f59e0b';
                    emailInput.style.background = 'rgba(245, 158, 11, 0.1)';
                }
                return;
            }

            closeDialog();
            if (onSuccess) onSuccess();
        };

        [geminiInput, xaiInput, avInput].forEach(inp => {
            inp.onkeydown = (e) => {
                if (e.key === 'Enter') dialog.querySelector('#sniper-api-key-save').click();
                if (e.key === 'Escape') closeDialog();
            };
        });
    }
};

window.SniperAI = SniperAI;
