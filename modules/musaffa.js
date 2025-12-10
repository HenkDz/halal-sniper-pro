// =========================================================================
// 🕌 MUSAFFA MODULE - Halal verification from Musaffa.com
// =========================================================================

const SniperMusaffa = {
    // Debug mode - set to true to show debug panel
    DEBUG_MODE: true,

    // Show debug panel with parsing details
    showDebugPanel(ticker, debug, status) {
        const isDebugEnabled = SniperStorage.getSetting('sniper_debug_mode', true);
        if (!isDebugEnabled) return;

        const existing = document.getElementById('sniper-debug-panel');
        if (existing) existing.remove();

        const panel = document.createElement('div');
        panel.id = 'sniper-debug-panel';
        panel.style.cssText = `
            position: fixed; top: 10px; right: 10px;
            background: linear-gradient(145deg, #0d1117, #161b22);
            border: 2px solid ${status === 'NOT_HALAL' ? '#f85149' : status === 'HALAL' ? '#3fb950' : '#f0883e'};
            border-radius: 12px; padding: 16px; z-index: 100002;
            width: 450px; max-height: 80vh; overflow-y: auto;
            font-family: 'Consolas', 'Monaco', monospace; font-size: 11px;
            color: #c9d1d9; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        `;

        const statusColor = status === 'NOT_HALAL' ? '#f85149' : status === 'HALAL' ? '#3fb950' : '#f0883e';
        const statusEmoji = status === 'NOT_HALAL' ? '🚫' : status === 'HALAL' ? '✅' : '⚠️';

        let matchesHtml = '';
        if (debug && debug.matches) {
            for (const m of debug.matches) {
                const method = m.method || 'Unknown';
                const details = { ...m };
                delete details.method;

                // Truncate long strings for display
                for (const key in details) {
                    if (typeof details[key] === 'string' && details[key].length > 200) {
                        details[key] = details[key].substring(0, 200) + '...';
                    }
                }

                const isSuccess = method.includes('NOT HALAL') || method.includes('HALAL Found');
                const methodColor = isSuccess ? '#3fb950' : '#8b949e';

                matchesHtml += `
                    <div style="margin: 8px 0; padding: 8px; background: #21262d; border-radius: 6px; border-left: 3px solid ${methodColor};">
                        <div style="color: ${methodColor}; font-weight: bold; margin-bottom: 4px;">📍 ${method}</div>
                        <pre style="margin: 0; white-space: pre-wrap; word-break: break-all; color: #8b949e; font-size: 10px;">${JSON.stringify(details, null, 2)}</pre>
                    </div>
                `;
            }
        }

        let indicatorsHtml = '';
        if (debug && debug.indicators) {
            const cardStatus = debug.indicators.cardSectionStatus;
            const cardStatusColor = cardStatus === 'NOT_HALAL' ? '#f85149' : cardStatus === 'HALAL' ? '#3fb950' : '#8b949e';

            indicatorsHtml = `
                <div style="margin: 12px 0; padding: 10px; background: #21262d; border-radius: 6px;">
                    <div style="color: #58a6ff; font-weight: bold; margin-bottom: 8px;">🔍 Indicators</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px;">
                        <div>firstHalalChip: <span style="color: #3fb950">${debug.indicators.firstHalalChip}</span></div>
                        <div>firstNotHalalChip: <span style="color: #f85149">${debug.indicators.firstNotHalalChip}</span></div>
                        <div>firstStatusText: <span style="color: #f0883e">${debug.indicators.firstStatusText}</span></div>
                        <div>parseMs: <span style="color: #8b949e">${debug.parseMs}ms</span></div>
                        <div>cardSectionStatus: <span style="color: ${cardStatusColor}">${cardStatus || 'none'}</span></div>
                        <div>notHalalClasses: <span style="color: #f85149">${debug.indicators.allNotHalalClasses?.length || 0}</span></div>
                    </div>
                    ${debug.indicators.halalChipContext ? `<div style="margin-top: 8px; padding: 6px; background: #0d1117; border-radius: 4px; font-size: 9px; color: #3fb950; word-break: break-all;">halal: ${debug.indicators.halalChipContext}</div>` : ''}
                    ${debug.indicators.notHalalChipContext ? `<div style="margin-top: 4px; padding: 6px; background: #0d1117; border-radius: 4px; font-size: 9px; color: #f85149; word-break: break-all;">not-halal: ${debug.indicators.notHalalChipContext}</div>` : ''}
                    ${debug.indicators.allNotHalalClasses?.length > 0 ? `<div style="margin-top: 4px; padding: 6px; background: #0d1117; border-radius: 4px; font-size: 9px; color: #f85149; word-break: break-all;">notHalalClass: ${debug.indicators.allNotHalalClasses[0]?.classValue || ''}</div>` : ''}
                    ${debug.indicators.cardSectionSnippet ? `<div style="margin-top: 8px; padding: 6px; background: #0d1117; border-radius: 4px; font-size: 9px; color: #8b949e; word-break: break-all; max-height: 100px; overflow-y: auto;">cardSnippet: ${debug.indicators.cardSectionSnippet.substring(0, 300).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
                </div>
            `;
        }

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: bold; color: #fff;">
                    🎯 Halal Sniper Debug
                </div>
                <button id="sniper-debug-close" style="background: #30363d; border: none; color: #c9d1d9; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">✕ Close</button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #21262d; border-radius: 8px; margin-bottom: 12px;">
                <div style="font-size: 28px;">${statusEmoji}</div>
                <div>
                    <div style="font-size: 16px; font-weight: bold; color: #fff;">${ticker}</div>
                    <div style="font-size: 14px; color: ${statusColor}; font-weight: bold;">${status || 'UNKNOWN'}</div>
                </div>
                <div style="margin-left: auto; text-align: right; font-size: 10px; color: #8b949e;">
                    <div>HTML: ${debug?.htmlLength?.toLocaleString() || 0} chars</div>
                    <div>Parse: ${debug?.parseMs || 0}ms</div>
                </div>
            </div>
            
            ${indicatorsHtml}
            
            <div style="color: #58a6ff; font-weight: bold; margin: 12px 0 8px;">📋 Detection Steps (${debug?.matches?.length || 0})</div>
            <div style="max-height: 300px; overflow-y: auto;">
                ${matchesHtml || '<div style="color: #8b949e;">No matches recorded</div>'}
            </div>
            
            <div style="margin-top: 12px; display: flex; gap: 8px;">
                <button id="sniper-debug-copy" style="flex: 1; background: #238636; border: none; color: white; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">📋 Copy Debug JSON</button>
                <a href="https://musaffa.com/stock/${ticker}" target="_blank" style="flex: 1; background: #1f6feb; border: none; color: white; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; text-decoration: none; text-align: center;">↗ Open Musaffa</a>
            </div>
        `;

        document.body.appendChild(panel);

        document.getElementById('sniper-debug-close').onclick = () => panel.remove();
        document.getElementById('sniper-debug-copy').onclick = () => {
            SniperUtils.copyToClipboard(JSON.stringify(debug, null, 2), () => {
                const btn = document.getElementById('sniper-debug-copy');
                btn.textContent = '✓ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy Debug JSON', 2000);
            }, (err) => {
                console.error("Copy failed", err);
                const btn = document.getElementById('sniper-debug-copy');
                btn.textContent = '❌ Failed';
                setTimeout(() => btn.textContent = '📋 Copy Debug JSON', 2000);
            });
        };
    },

    // Parse Musaffa HTML response to extract halal status
    parseMusaffaHtml(html) {
        let match = html.match(/class="[^"]*status-text[^"]*"[^>]*>([^<]+)</i);
        if (match) {
            const statusText = match[1].trim().toUpperCase();
            if (statusText.includes('NOT HALAL') || statusText.includes('NOT_HALAL')) return 'NOT_HALAL';
            if (statusText === 'HALAL') return 'HALAL';
            if (statusText.includes('DOUBTFUL')) return 'DOUBTFUL';
        }

        match = html.match(/compliance[^>]*status[^>]*>([^<]+)</i) ||
            html.match(/>\s*(HALAL|NOT HALAL|NOT_HALAL|DOUBTFUL)\s*</i);
        if (match) {
            const statusText = match[1].trim().toUpperCase();
            if (statusText.includes('NOT')) return 'NOT_HALAL';
            if (statusText === 'HALAL') return 'HALAL';
            if (statusText.includes('DOUBT')) return 'DOUBTFUL';
        }

        // Check for CSS classes
        if (html.includes('not-halal-chip') || html.includes('nothalal-chip')) return 'NOT_HALAL';
        if (html.includes('class="[^"]*halal-chip') && !html.includes('not-halal')) return 'HALAL';
        if (html.includes('doubtful-chip')) return 'DOUBTFUL';

        return null;
    },

    // Main fetch function with fallback chain
    fetchMusaffaStatus(ticker, callback) {
        console.log("🎯 Sniper: Fetching Musaffa status for", ticker);
        this.tryBackgroundFetch(ticker, callback);
    },

    // Try using chrome.runtime.sendMessage for background script
    tryBackgroundFetch(ticker, callback) {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            console.log("🎯 Sniper: Trying chrome.runtime.sendMessage to background script");
            try {
                chrome.runtime.sendMessage(
                    { action: 'fetchMusaffa', ticker: ticker },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            console.log("🎯 Sniper: Background script error:", chrome.runtime.lastError.message);
                            this.offerManualCheck(ticker, callback);
                            return;
                        }
                        if (response && response.success && response.status) {
                            console.log("🎯 Sniper: Background fetch success:", response.status);
                            if (response.debug) {
                                console.log("🎯 Sniper: Background Debug:", response.debug);
                                // Show debug panel with live data
                                this.showDebugPanel(ticker, response.debug, response.status);
                            }
                            SniperUtils.setHalalCache(ticker, response.status);
                            callback(response.status, null);
                        } else if (response && response.success && !response.status) {
                            console.log("🎯 Sniper: Background parsed but status unclear");
                            if (response.debug) {
                                this.showDebugPanel(ticker, response.debug, null);
                            }
                            this.offerManualCheck(ticker, callback);
                        } else {
                            console.log("🎯 Sniper: Background fetch failed");
                            this.offerManualCheck(ticker, callback);
                        }
                    }
                );
            } catch (e) {
                console.log("🎯 Sniper: Background message exception:", e);
                this.offerManualCheck(ticker, callback);
            }
        } else {
            console.log("🎯 Sniper: chrome.runtime not available");
            this.offerManualCheck(ticker, callback);
        }
    },

    // Final fallback: Manual check with popup
    offerManualCheck(ticker, callback) {
        console.log("🎯 Sniper: All automated methods failed, offering manual check");

        const existing = document.getElementById('sniper-manual-popup');
        if (existing) existing.remove();

        const popup = document.createElement('div');
        popup.id = 'sniper-manual-popup';
        popup.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: linear-gradient(145deg, #1a1a2e, #16213e); 
            border: 1px solid #8e44ad; border-radius: 12px; padding: 24px;
            z-index: 100001; width: 380px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
        `;

        popup.innerHTML = `
            <div style="font-size:11px; color:#e74c3c; margin-bottom:12px;">⚠️ Auto-detection failed</div>
            <div style="font-size:13px; color:#bdc3c7; margin-bottom:10px;">Please verify manually:</div>
            <div style="font-size:14px; font-weight:bold; color:#fff; margin-bottom:15px;">${ticker.toUpperCase()}</div>
            <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                <button id="sniper-btn-halal" style="padding:10px 20px; background:#27ae60; border:none; color:white; border-radius:6px; cursor:pointer; font-weight:bold;">✅ HALAL</button>
                <button id="sniper-btn-haram" style="padding:10px 20px; background:#c0392b; border:none; color:white; border-radius:6px; cursor:pointer; font-weight:bold;">🚫 NOT HALAL</button>
                <button id="sniper-btn-doubtful" style="padding:10px 20px; background:#f39c12; border:none; color:white; border-radius:6px; cursor:pointer; font-weight:bold;">⚠️ DOUBTFUL</button>
            </div>
            <div style="margin-top:15px;">
                <a href="https://musaffa.com/stock/${ticker.toUpperCase()}" target="_blank" style="color:#3498db; font-size:11px;">↗ Open Musaffa to check</a>
            </div>
            <button id="sniper-btn-cancel" style="margin-top:15px; padding:6px 15px; background:#7f8c8d; border:none; color:white; border-radius:4px; cursor:pointer; font-size:11px;">Cancel</button>
        `;

        document.body.appendChild(popup);

        document.getElementById('sniper-btn-halal').onclick = () => {
            SniperUtils.setHalalCache(ticker, 'HALAL');
            popup.remove();
            callback('HALAL', null);
        };
        document.getElementById('sniper-btn-haram').onclick = () => {
            SniperUtils.setHalalCache(ticker, 'NOT_HALAL');
            popup.remove();
            callback('NOT_HALAL', null);
        };
        document.getElementById('sniper-btn-doubtful').onclick = () => {
            SniperUtils.setHalalCache(ticker, 'DOUBTFUL');
            popup.remove();
            callback('DOUBTFUL', null);
        };
        document.getElementById('sniper-btn-cancel').onclick = () => {
            popup.remove();
            callback(null, 'USER_CANCELLED');
        };
    }
};

// Make available globally
window.SniperMusaffa = SniperMusaffa;
