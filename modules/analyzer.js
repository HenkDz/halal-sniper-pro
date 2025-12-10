// =========================================================================
// 📊 STOCK ANALYZER MODULE - Single stock page analysis
// Premium Zinc Theme - Collapsible Sidebar (matches Musaffa design)
// =========================================================================

const SniperStockAnalyzer = {
    sidebarEl: null,
    toggleEl: null,
    isOpen: true,
    currentTicker: null,
    currentStats: null,
    currentSignals: null,
    currentScore: null,

    init(tickerGuess) {
        console.log("🎯 Sniper Pro: Smart Opportunity Engine");
        this.enableBigView();
        this.currentTicker = tickerGuess;
        
        // Inject shared styles
        this.injectStyles();
        
        // Create sidebar UI (matches Musaffa design)
        this.createSidebar();
        this.createToggle();

        // Initial Loading State
        const content = document.getElementById('sniper-analyzer-content');
        if (content) {
            content.innerHTML = `
                <div class="sniper-loading">
                    <div class="sniper-loading-spinner"></div>
                    Analyzing insider data...
                </div>
            `;
        }

        setTimeout(() => this.runAnalysis(tickerGuess), 500);
    },

    /**
     * Inject CSS styles for the sidebar (Premium Zinc Theme)
     */
    injectStyles() {
        if (document.getElementById('sniper-analyzer-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'sniper-analyzer-styles';
        styles.textContent = `
            /* OpenInsider Analyzer Sidebar - Compact Premium Zinc Theme */
            #sniper-analyzer-sidebar {
                position: fixed;
                top: 10px;
                right: 0;
                width: 320px;
                max-height: calc(100vh - 20px);
                background: #09090b;
                border-left: 1px solid #27272a;
                border-top-left-radius: 12px;
                border-bottom-left-radius: 12px;
                box-shadow: -4px 0 24px rgba(0,0,0,0.4);
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
                transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            #sniper-analyzer-sidebar.collapsed {
                transform: translateX(100%);
            }

            #sniper-analyzer-toggle {
                position: fixed;
                top: 80px;
                right: 0;
                width: 32px;
                height: 40px;
                background: #09090b;
                border: 1px solid #27272a;
                border-right: none;
                border-radius: 8px 0 0 8px;
                cursor: pointer;
                z-index: 100000;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #71717a;
                font-size: 16px;
                transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.2s, background 0.2s;
                box-shadow: -2px 2px 10px rgba(0,0,0,0.2);
            }

            #sniper-analyzer-toggle:hover {
                background: #18181b;
                color: #e4e4e7;
                width: 36px;
            }

            #sniper-analyzer-toggle.open {
                right: 320px;
                width: 32px;
                background: #09090b;
            }

            .sniper-analyzer-header {
                padding: 10px 12px;
                border-bottom: 1px solid #27272a;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .sniper-analyzer-title {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .sniper-analyzer-title h2 {
                margin: 0;
                font-size: 13px;
                font-weight: 700;
                color: #fff;
                letter-spacing: -0.3px;
            }

            .sniper-analyzer-title span {
                font-size: 10px;
                color: #52525b;
                font-weight: 500;
            }

            .sniper-analyzer-close {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                cursor: pointer;
                color: #52525b;
                font-size: 12px;
                transition: all 0.2s;
            }

            .sniper-analyzer-close:hover {
                background: #18181b;
                color: #e4e4e7;
            }

            .sniper-analyzer-content {
                flex: 1;
                overflow-y: auto;
                padding: 10px 12px;
            }

            /* Compact component styles */
            .sniper-section {
                margin-bottom: 10px;
            }

            .sniper-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                padding: 4px 0;
            }

            .sniper-section-title {
                font-size: 9px;
                font-weight: 600;
                color: #71717a;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .sniper-section-toggle {
                font-size: 9px;
                color: #52525b;
                transition: transform 0.2s;
            }

            .sniper-section-toggle.collapsed {
                transform: rotate(-90deg);
            }

            .sniper-section-body {
                overflow: hidden;
                transition: max-height 0.3s ease;
            }

            .sniper-section-body.collapsed {
                max-height: 0 !important;
            }

            .sniper-card {
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 6px;
                padding: 8px;
            }

            .sniper-score-card {
                text-align: center;
                padding: 6px;
            }

            .sniper-score-value {
                font-size: 32px;
                font-weight: 700;
                line-height: 1;
            }

            .sniper-score-label {
                font-size: 10px;
                color: #71717a;
                margin-top: 2px;
            }

            .sniper-stat-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 4px 0;
                border-bottom: 1px solid #1f1f23;
            }

            .sniper-stat-row:last-child {
                border-bottom: none;
            }

            .sniper-stat-label {
                font-size: 10px;
                color: #a1a1aa;
            }

            .sniper-stat-value {
                font-size: 10px;
                font-weight: 600;
                color: #e4e4e7;
            }

            .sniper-badge {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 9px;
                font-weight: 600;
                margin: 1px;
            }

            .sniper-badge.exec { background: rgba(168,85,247,0.2); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); }
            .sniper-badge.cluster { background: rgba(249,115,22,0.2); color: #fb923c; border: 1px solid rgba(249,115,22,0.3); }
            .sniper-badge.whale { background: rgba(250,204,21,0.2); color: #facc15; border: 1px solid rgba(250,204,21,0.3); }
            .sniper-badge.reversal { background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); }
            .sniper-badge.new { background: rgba(45,212,191,0.2); color: #2dd4bf; border: 1px solid rgba(45,212,191,0.3); }
            .sniper-badge.risk { background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
            .sniper-badge.penny { background: rgba(161,161,170,0.2); color: #d4d4d8; border: 1px solid rgba(161,161,170,0.3); }
            .sniper-badge.bags { background: rgba(234,179,8,0.2); color: #fde047; border: 1px solid rgba(234,179,8,0.3); }

            .sniper-compliance-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 700;
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 8px;
            }

            .sniper-compliance-badge.halal {
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
                border: 1px solid rgba(34, 197, 94, 0.3);
            }

            .sniper-compliance-badge.not-halal {
                background: rgba(239, 68, 68, 0.15);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
            }

            .sniper-compliance-badge.doubtful {
                background: rgba(250, 204, 21, 0.15);
                color: #facc15;
                border: 1px solid rgba(250, 204, 21, 0.3);
            }

            .sniper-compliance-badge.unknown {
                background: rgba(113, 113, 122, 0.15);
                color: #a1a1aa;
                border: 1px solid rgba(113, 113, 122, 0.3);
            }

            .sniper-grade-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 700;
                background: #27272a;
                color: #e4e4e7;
                border: 1px solid #3f3f46;
            }

            .sniper-grade-badge.a { background: rgba(34, 197, 94, 0.2); color: #22c55e; border-color: rgba(34, 197, 94, 0.3); }
            .sniper-grade-badge.b { background: rgba(132, 204, 22, 0.2); color: #84cc16; border-color: rgba(132, 204, 22, 0.3); }
            .sniper-grade-badge.c { background: rgba(250, 204, 21, 0.2); color: #facc15; border-color: rgba(250, 204, 21, 0.3); }
            .sniper-grade-badge.d { background: rgba(249, 115, 22, 0.2); color: #f97316; border-color: rgba(249, 115, 22, 0.3); }
            .sniper-grade-badge.f { background: rgba(239, 68, 68, 0.2); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); }

            .sniper-btn {
                width: 100%;
                padding: 7px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }

            .sniper-btn-primary {
                background: #2563eb;
                color: white;
                border: none;
            }

            .sniper-btn-primary:hover {
                background: #1d4ed8;
            }

            .sniper-btn-success {
                background: #22c55e;
                color: white;
                border: none;
            }

            .sniper-btn-success:hover {
                background: #16a34a;
            }

            .sniper-btn-secondary {
                background: #27272a;
                color: #e4e4e7;
                border: 1px solid #3f3f46;
            }

            .sniper-btn-secondary:hover {
                background: #3f3f46;
            }

            .sniper-btn-sm {
                padding: 4px 8px;
                font-size: 10px;
                width: auto;
            }

            .sniper-link-row {
                display: flex;
                gap: 4px;
                flex-wrap: wrap;
            }

            .sniper-link-btn {
                flex: 1;
                min-width: 50px;
                padding: 6px 8px;
                background: #27272a;
                border: 1px solid #3f3f46;
                border-radius: 4px;
                color: #e4e4e7;
                font-size: 10px;
                font-weight: 600;
                text-decoration: none;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s;
            }

            .sniper-link-btn:hover {
                background: #3f3f46;
                color: #fff;
                border-color: #52525b;
                transform: translateY(-1px);
            }

            /* Brand-specific link colors */
            .sniper-link-btn[href*="zoya"] {
                background: rgba(34,197,94,0.15);
                border-color: rgba(34,197,94,0.3);
                color: #4ade80;
            }
            .sniper-link-btn[href*="zoya"]:hover {
                background: rgba(34,197,94,0.25);
                color: #86efac;
            }

            .sniper-link-btn[href*="musaffa"] {
                background: rgba(45,212,191,0.15);
                border-color: rgba(45,212,191,0.3);
                color: #2dd4bf;
            }
            .sniper-link-btn[href*="musaffa"]:hover {
                background: rgba(45,212,191,0.25);
                color: #5eead4;
            }

            .sniper-link-btn[href*="yahoo"] {
                background: rgba(139,92,246,0.15);
                border-color: rgba(139,92,246,0.3);
                color: #a78bfa;
            }
            .sniper-link-btn[href*="yahoo"]:hover {
                background: rgba(139,92,246,0.25);
                color: #c4b5fd;
            }

            .sniper-link-btn[href*="sec.gov"] {
                background: rgba(59,130,246,0.15);
                border-color: rgba(59,130,246,0.3);
                color: #60a5fa;
            }
            .sniper-link-btn[href*="sec.gov"]:hover {
                background: rgba(59,130,246,0.25);
                color: #93c5fd;
            }

            .sniper-link-btn[href*="finviz"] {
                background: rgba(249,115,22,0.15);
                border-color: rgba(249,115,22,0.3);
                color: #fb923c;
            }
            .sniper-link-btn[href*="finviz"]:hover {
                background: rgba(249,115,22,0.25);
                color: #fdba74;
            }

            .sniper-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 30px;
                color: #71717a;
                font-size: 11px;
            }

            .sniper-loading-spinner {
                width: 16px;
                height: 16px;
                border: 2px solid #27272a;
                border-top-color: #2563eb;
                border-radius: 50%;
                animation: sniper-spin 0.8s linear infinite;
                margin-right: 6px;
            }

            @keyframes sniper-spin {
                to { transform: rotate(360deg); }
            }

            .sniper-empty-state {
                text-align: center;
                padding: 10px;
                color: #52525b;
                font-size: 10px;
            }

            .sniper-trade-card {
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 5px;
                padding: 6px 8px;
                margin-bottom: 4px;
            }

            .sniper-trade-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
            }

            .sniper-trade-name {
                font-size: 10px;
                font-weight: 600;
                color: #e4e4e7;
            }

            .sniper-trade-value {
                font-size: 10px;
                font-weight: 700;
            }

            .sniper-trade-value.buy { color: #22c55e; }
            .sniper-trade-value.sell { color: #ef4444; }

            .sniper-trade-meta {
                font-size: 9px;
                color: #71717a;
            }

            .sniper-ai-modes {
                display: flex;
                gap: 4px;
                margin-bottom: 6px;
                background: #18181b;
                padding: 3px;
                border-radius: 6px;
                border: 1px solid #27272a;
            }

            .sniper-ai-mode {
                flex: 1;
                padding: 6px 4px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                cursor: pointer;
                text-align: center;
                transition: all 0.15s;
                background: transparent;
                border: none;
                color: #71717a;
            }

            .sniper-ai-mode.active {
                background: #27272a;
                color: #e4e4e7;
                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }

            .sniper-ai-mode.active[data-mode="quick"] {
                background: rgba(34,197,94,0.15);
                color: #4ade80;
            }

            .sniper-ai-mode.active[data-mode="deep"] {
                background: rgba(37,99,235,0.15);
                color: #60a5fa;
            }

            .sniper-ai-mode:hover:not(.active) {
                background: rgba(255,255,255,0.05);
                color: #a1a1aa;
            }

            .sniper-halal-actions {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }

            .sniper-halal-row {
                display: flex;
                gap: 3px;
            }

            .sniper-halal-btn {
                flex: 1;
                padding: 5px;
                border-radius: 4px;
                font-size: 9px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 3px;
                transition: all 0.1s;
                border: 1px solid transparent;
            }

            .sniper-halal-btn:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }

            .sniper-halal-btn.halal { background: #064e3b; border-color: #059669; color: #a7f3d0; }
            .sniper-halal-btn.haram { background: #450a0a; border-color: #dc2626; color: #fecaca; }
            .sniper-halal-btn.doubt { background: #422006; border-color: #d97706; color: #fde68a; }
            .sniper-halal-btn.clear { background: #27272a; border-color: #3f3f46; color: #a1a1aa; }
        `;

        document.head.appendChild(styles);
    },

    /**
     * Create the sidebar element
     */
    createSidebar() {
        if (document.getElementById('sniper-analyzer-sidebar')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'sniper-analyzer-sidebar';
        sidebar.innerHTML = `
            <div class="sniper-analyzer-header">
                <div class="sniper-analyzer-title">
                    <h2>📊 Insider Analysis</h2>
                    <span>OpenInsider</span>
                </div>
                <div class="sniper-analyzer-close" id="sniper-analyzer-close">✕</div>
            </div>
            <div class="sniper-analyzer-content" id="sniper-analyzer-content">
                <div class="sniper-loading">
                    <div class="sniper-loading-spinner"></div>
                    Analyzing...
                </div>
            </div>
        `;

        document.body.appendChild(sidebar);
        this.sidebarEl = sidebar;

        // Close button handler
        document.getElementById('sniper-analyzer-close').addEventListener('click', () => {
            this.toggle();
        });
    },

    /**
     * Create the toggle button
     */
    createToggle() {
        if (document.getElementById('sniper-analyzer-toggle')) return;

        const toggle = document.createElement('div');
        toggle.id = 'sniper-analyzer-toggle';
        toggle.className = 'open';
        toggle.innerHTML = '📊';
        toggle.title = 'Toggle Insider Analysis';

        toggle.addEventListener('click', () => {
            this.toggle();
        });

        document.body.appendChild(toggle);
        this.toggleEl = toggle;
    },

    /**
     * Toggle sidebar visibility
     */
    toggle() {
        this.isOpen = !this.isOpen;
        this.sidebarEl.classList.toggle('collapsed', !this.isOpen);
        this.toggleEl.classList.toggle('open', this.isOpen);
    },

    enableBigView() {
        const container = document.querySelector('#content');
        if (container) container.style.width = '95%';
    },

    getColumnIndices() {
        const headers = Array.from(document.querySelectorAll('table.tinytable thead th')).map(th => th.innerText.trim().toLowerCase());
        const find = (k, d) => { const i = headers.findIndex(h => h.includes(k)); return i > -1 ? i : d; };
        return {
            filingDate: find('filing', 1),
            tradeDate: find('trade date', 2),
            ticker: find('ticker', 3),
            insiderName: find('insider', 4),
            title: find('title', 5),
            tradeType: find('trade type', 6),
            price: find('price', 7),
            qty: find('qty', 8),
            owned: find('owned', 9),
            deltaOwn: 10,
            value: find('value', 11),
        };
    },

    runAnalysis(tickerGuess) {
        const container = document.getElementById('sniper-analyzer-content');
        const cols = this.getColumnIndices();
        const rows = document.querySelectorAll('table.tinytable tbody tr');
        if (rows.length === 0) {
            container.innerHTML = `<div style="color:#71717a; text-align:center; font-size:12px;">No trade data found on this page.</div>`;
            return;
        }

        const now = new Date();
        const trades = [];
        const stats = {
            companyName: "",
            totalBuy: 0,
            totalSell: 0,
            uniqueBuyers: new Set(),
            uniqueSellers: new Set(),
            countBuy: 0,
            countSell: 0,
            isHaram: false,
            reason: ""
        };

        const signals = {
            executiveBuys: [],
            whaleTrades: [],
            clusterBuying: false,
            recentActivity: 0,
            buyStreak: 0,
            reversalSignal: false,
            freshEntries: [],
            insidersByName: {}
        };

        // Parse All Trades
        rows.forEach((row, idx) => {
            if (row.cells.length < 8) return;

            const tradeType = row.cells[cols.tradeType]?.innerText.trim() || "";
            const valueCell = row.cells[cols.value]?.innerText.trim() || "0";
            const title = row.cells[cols.title]?.innerText.trim() || "";
            const insiderName = row.cells[cols.insiderName]?.innerText.trim() || "Unknown";

            const valMatch = valueCell.replace(/[,$]/g, '').match(/-?\d+/);
            const val = valMatch ? Math.abs(parseInt(valMatch[0])) : 0;

            const priceCell = row.cells[cols.price]?.innerText.replace(/[$,]/g, '').trim() || "0";
            const price = parseFloat(priceCell) || 0;

            // Date Handling: Prefer Trade Date for accuracy vs Price
            const fileDateStr = row.cells[cols.filingDate]?.innerText.trim() || "";
            const tradeDateStr = row.cells[cols.tradeDate]?.innerText.trim() || "";

            // Try parse Trade Date first, fallback to Filing Date
            let tDate = SniperUtils.parseDate(tradeDateStr);
            if (!tDate || isNaN(tDate.getTime())) tDate = SniperUtils.parseDate(fileDateStr);

            const daysAgo = tDate ? Math.floor((now - tDate) / (1000 * 60 * 60 * 24)) : 999;

            const deltaOwn = row.cells[cols.deltaOwn]?.innerText.trim() || "";
            const isNewPosition = deltaOwn.toLowerCase() === 'new';

            const trade = { tradeType, val, title, daysAgo, insiderName, row, idx, isNewPosition, price };
            trades.push(trade);

            if (!signals.insidersByName[insiderName]) {
                signals.insidersByName[insiderName] = { buys: [], sells: [], titles: new Set() };
            }
            signals.insidersByName[insiderName].titles.add(title);

            const isPurchase = tradeType.includes("P -") || tradeType.toLowerCase().includes("purchase");
            const isSale = tradeType.includes("S -") || tradeType.toLowerCase().includes("sale");

            // Recency Weighting: Actions > 6 months ago are stale
            // 0-90 days: 100% | 90-180 days: 50% | >180 days: 10%
            let weight = 1.0;
            if (daysAgo > 365) weight = 0.0; // Ignore > 1 year entirely for scoring
            else if (daysAgo > 180) weight = 0.1;
            else if (daysAgo > 90) weight = 0.5;

            if (isPurchase) {
                stats.totalBuy += val;
                stats.weightedBuy = (stats.weightedBuy || 0) + (val * weight);
                stats.countBuy++;
                stats.uniqueBuyers.add(insiderName);
                signals.insidersByName[insiderName].buys.push(trade);

                if (daysAgo <= 30) signals.recentActivity++;

                if (SniperUtils.BOSS_TITLES.some(t => title.includes(t))) {
                    signals.executiveBuys.push({ name: insiderName, title, val, daysAgo });
                }

                if (val >= SniperUtils.DEFAULT_THRESHOLD) {
                    signals.whaleTrades.push({ name: insiderName, val, daysAgo });
                }

                if (isNewPosition) {
                    signals.freshEntries.push({ name: insiderName, val, daysAgo });
                }

                // Visual highlights - more subtle now
                row.style.backgroundColor = "rgba(74, 222, 128, 0.1)"; // faint green
                if (val >= SniperUtils.DEFAULT_THRESHOLD) {
                    row.cells[0].style.borderLeft = "4px solid #facc15"; // yellow border
                    if (row.cells[cols.value]) {
                        row.cells[cols.value].style.fontWeight = '700';
                        row.cells[cols.value].style.color = '#15803d';
                    }
                }
                if (SniperUtils.BOSS_TITLES.some(t => title.includes(t))) {
                    row.style.backgroundColor = "rgba(250, 204, 21, 0.1)"; // faint yellow
                    row.cells[0].style.borderLeft = "4px solid #a855f7"; // purple border
                }

            } else if (isSale) {
                stats.totalSell += val;
                stats.weightedSell = (stats.weightedSell || 0) + (val * weight);
                stats.countSell++;
                stats.uniqueSellers.add(insiderName);
                signals.insidersByName[insiderName].sells.push(trade);
                row.style.opacity = "0.7";
            }
        });

        // Detect signals
        signals.clusterBuying = stats.uniqueBuyers.size >= 3;

        for (const [_name, data] of Object.entries(signals.insidersByName)) {
            if (data.buys.length > 0 && data.sells.length > 0) {
                const lastBuy = Math.min(...data.buys.map(t => t.daysAgo));
                const lastSell = Math.min(...data.sells.map(t => t.daysAgo));
                if (lastBuy < lastSell) signals.reversalSignal = true;
            }
        }

        const buyDays = new Set(trades
            .filter(t => (t.tradeType.includes("P -") || t.tradeType.toLowerCase().includes("purchase")) && t.daysAgo <= 90)
            .map(t => t.daysAgo)
        );
        signals.buyStreak = buyDays.size;

        // --- NEW: Price & Risk Analysis ---
        const validPrices = trades.filter(t => t.price > 0).sort((a, b) => a.daysAgo - b.daysAgo); // Sort by date (newest first)
        const latestInfo = validPrices[0];
        const latestPrice = latestInfo ? latestInfo.price : 0;

        // Calculate Drawdown from visible history
        const maxPrice = trades.reduce((max, t) => Math.max(max, t.price || 0), 0);
        const drawdown = (maxPrice > 0 && latestPrice > 0) ? (maxPrice - latestPrice) / maxPrice : 0;

        signals.priceDrawdown = drawdown;
        signals.isPennyStock = latestPrice > 0 && latestPrice < 1.00;
        signals.isCrashLabels = [];

        if (drawdown > 0.80) signals.isCrashLabels.push("CRASH (-" + (drawdown * 100).toFixed(0) + "%)");
        else if (drawdown > 0.50) signals.isCrashLabels.push("DOWNTREND (-" + (drawdown * 100).toFixed(0) + "%)");

        if (signals.isPennyStock) signals.isCrashLabels.push("PENNY STOCK");

        // Calculate Average Buy Price of recent buyers vs Current Price (Are they underwater?)
        let totalBuyVal = 0;
        let totalBuyQty = 0;
        trades.forEach(t => {
            if ((t.tradeType.includes("P -") || t.tradeType.toLowerCase().includes("purchase")) && t.price > 0 && t.val > 0) {
                // OpenInsider doesn't give Qty easily in all views, but we can infer: val / price
                const qty = t.val / t.price;
                totalBuyVal += t.val;
                totalBuyQty += qty;
            }
        });

        const avgBuyPrice = totalBuyQty > 0 ? totalBuyVal / totalBuyQty : 0;
        const insiderPerformance = (latestPrice > 0 && avgBuyPrice > 0) ? (latestPrice - avgBuyPrice) / avgBuyPrice : 0;
        signals.insiderPerformance = insiderPerformance;
        // ----------------------------------------

        // Get company name
        const h1 = document.querySelector('h1')?.innerText || "";
        const nameParts = h1.split('-');
        stats.companyName = nameParts.length >= 2 ? nameParts[1].trim() : (tickerGuess || "Unknown");
        const ticker = (nameParts[0]?.trim() || tickerGuess || "").toUpperCase();

        // Halal Check
        const userBlacklist = SniperUtils.getBlacklist();
        if (ticker && userBlacklist.includes(ticker)) {
            stats.isHaram = true;
            stats.reason = "User Blacklist";
        } else if (SniperUtils.HARAM_KEYWORDS.some(k => new RegExp(`\\b${k}\\b`, 'i').test(stats.companyName))) {
            stats.isHaram = true;
            stats.reason = "Keyword in name";
        }

        const score = this.calculateOpportunityScore(stats, signals);
        this.renderAnalysis(container, stats, signals, score, ticker);

        console.log("🎯 Sniper Analysis Complete:", { stats, signals, score });
    },

    calculateOpportunityScore(stats, signals) {
        let score = 50;

        // Use Weighted stats for Scoring to prioritize recent activity
        const wBuy = stats.weightedBuy || 0;
        const wSell = stats.weightedSell || 0;
        const wTotal = wBuy + wSell;

        const buyRatio = wTotal > 0 ? wBuy / wTotal : 0.5;

        if (buyRatio >= 0.7) score += 30;
        else if (buyRatio >= 0.5) score += Math.round((buyRatio - 0.5) * 60);
        else if (buyRatio >= 0.3) score -= Math.round((0.5 - buyRatio) * 40);
        else if (buyRatio >= 0.1) score -= 20;
        else score -= 35;

        const buyerCount = stats.uniqueBuyers.size;
        const sellerCount = stats.uniqueSellers.size;
        if (sellerCount > buyerCount * 2) score -= 15;
        else if (sellerCount > buyerCount) score -= 8;
        else if (buyerCount > sellerCount * 2) score += 10;
        else if (buyerCount > sellerCount) score += 5;

        const recentExecBuys = signals.executiveBuys.filter(e => e.daysAgo <= 90);
        score += Math.min(recentExecBuys.length * 15, 30);
        if (signals.executiveBuys.some(e => e.daysAgo <= 30)) score += 10;

        if (signals.clusterBuying) score += 12;
        score += Math.min(signals.whaleTrades.length * 8, 24);
        score += Math.min(signals.recentActivity * 2, 10);
        score += Math.min(signals.buyStreak * 2, 8);

        if (signals.reversalSignal && buyRatio >= 0.3) score += 12;
        score += Math.min(signals.freshEntries.length * 4, 12);

        if (signals.recentActivity === 0) score -= 12;
        if (stats.countBuy === 0) score -= 25;
        if (stats.totalSell > stats.totalBuy * 5 && stats.totalBuy > 0) score -= 15;

        // --- Risk Penalties ---
        // 1. Penny Stock Penalty (High Volatility/Risk)
        if (signals.isPennyStock) score -= 15;

        // 2. Falling Knife / Crash Penalty
        if (signals.priceDrawdown > 0.80) {
            score -= 40; // Massive penalty for >80% crash (Catching a falling knife)
        } else if (signals.priceDrawdown > 0.50) {
            score -= 20; // Moderate penalty for >50% drop
        }

        // 3. Underwater Insiders (They are losing money on their buys)
        if (signals.insiderPerformance < -0.30) {
            score -= 15; // Insiders are down >30% on average
        } else if (signals.insiderPerformance < -0.10) {
            score -= 5;
        }

        // CAP SCORE for Penny Stocks or Crashes
        if ((signals.isPennyStock || signals.priceDrawdown > 0.6) && score > 70) {
            score = 70; // Hard cap
        }

        return Math.max(0, Math.min(100, score));
    },

    getOpportunityRating(score, isHaram) {
        if (isHaram) return { label: "SKIP", color: "#ef4444", emoji: "🚫", desc: "Likely Haram" };
        if (score >= 75) return { label: "STRONG BUY", color: "#22c55e", emoji: "🚀", desc: "High conviction buing" };
        if (score >= 60) return { label: "BUY", color: "#4ade80", emoji: "✅", desc: "Positive sentiment" };
        if (score >= 45) return { label: "WATCH", color: "#facc15", emoji: "👀", desc: "Mixed signals" };
        if (score >= 30) return { label: "WEAK", color: "#f97316", emoji: "⚠️", desc: "Selling pressure" };
        return { label: "AVOID", color: "#ef4444", emoji: "❌", desc: "Heavy selling" };
    },

    renderAnalysis(container, stats, signals, score, ticker) {
        // Store for later use
        this.currentStats = stats;
        this.currentSignals = signals;
        this.currentScore = score;
        this.currentTicker = ticker;

        const net = stats.totalBuy - stats.totalSell;
        const fmt = SniperUtils.formatMoney;
        const rating = this.getOpportunityRating(score, stats.isHaram);

        // Get current template
        const currentTemplate = SniperTemplates?.getCurrentTemplate() || 'fundamentals';
        const template = SniperTemplates?.getTemplate(currentTemplate) || { sections: {} };

        // Check cached halal status
        let cachedData = SniperStorage.getHalal(ticker);
        let cachedStatus = cachedData?.status || null;
        let hasMusaffaData = cachedData?.source === 'musaffa' || !!cachedData?.grade;
        
        // If not in memory, try async cross-site lookup
        if (!cachedData) {
            SniperStorage.getHalalAsync(ticker).then(asyncData => {
                if (asyncData && asyncData.status) {
                    console.log('🔄 Cross-site halal data loaded for', ticker, ':', asyncData.status);
                    this.renderAnalysis(container, stats, signals, score, ticker);
                }
            });
        }

        // Build compliance badge
        let complianceClass = 'unknown';
        let complianceIcon = '❓';
        let complianceText = 'Unknown';
        
        if (cachedStatus === 'NOT_HALAL' || stats.isHaram) {
            complianceClass = 'not-halal';
            complianceIcon = '🚫';
            complianceText = 'Not Halal';
        } else if (cachedStatus === 'HALAL') {
            complianceClass = 'halal';
            complianceIcon = '✅';
            complianceText = cachedData?.grade ? `Halal` : 'Halal';
        } else if (cachedStatus === 'DOUBTFUL') {
            complianceClass = 'doubtful';
            complianceIcon = '⚠️';
            complianceText = 'Doubtful';
        }

        // Score color
        let scoreColor = '#facc15';
        if (score >= 75) scoreColor = '#22c55e';
        else if (score >= 60) scoreColor = '#4ade80';
        else if (score >= 45) scoreColor = '#facc15';
        else if (score >= 30) scoreColor = '#f97316';
        else scoreColor = '#ef4444';

        // Favorites state
        const isFav = SniperUtils.isFavorite(ticker);

        // Calculate breakdown scores
        const complianceScore = cachedData?.status === 'HALAL' ? 100 : (cachedData?.status === 'NOT_HALAL' ? 0 : 50);
        const insiderScore = score;

        // Determine grade class
        const grade = cachedData?.grade || '';
        const gradeClass = grade ? grade.charAt(0).toLowerCase() : '';

        // Check section visibility based on template
        const showSection = (sectionId) => template.sections[sectionId] !== false;
        const isSectionCollapsed = (sectionId) => template.defaultCollapsed?.includes(sectionId);

        // Generate quick summary for Quick Scan template
        const quickSummary = currentTemplate === 'quick' ? SniperTemplates.generateQuickSummary({
            score, halalData: cachedData, signals, stats
        }) : null;

        container.innerHTML = `
            <!-- Template Selector -->
            ${SniperTemplates?.renderTemplateSelector(currentTemplate) || ''}

            <!-- Header Section -->
            <div class="sniper-section" style="margin-bottom: 12px; border-bottom: 1px solid #27272a; padding-bottom: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div>
                            <div style="font-size: 18px; font-weight: 700; color: #fff;">${ticker}</div>
                            <div style="font-size: 11px; color: #71717a;">${stats.companyName}</div>
                        </div>
                        ${grade ? `<div class="sniper-grade-badge ${gradeClass}">${grade}</div>` : ''}
                    </div>
                    <button id="fav-toggle-btn" style="padding: 6px 10px; background: ${isFav ? '#facc15' : 'transparent'}; border: 1px solid ${isFav ? '#facc15' : '#3f3f46'}; color: ${isFav ? '#000' : '#d4d4d8'}; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">
                        ${isFav ? '★' : '☆'}
                    </button>
                </div>
                <div class="sniper-compliance-badge ${complianceClass}">
                    ${complianceIcon} ${complianceText}
                </div>
            </div>

            <!-- Quick Summary (for Quick Scan template) -->
            ${currentTemplate === 'quick' && quickSummary ? SniperTemplates.renderQuickSummaryCard(quickSummary) : ''}

            <!-- Opportunity Score -->
            ${showSection('score') && currentTemplate !== 'quick' ? `
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="score">
                    <span class="sniper-section-title">Opportunity Score</span>
                    <span class="sniper-section-toggle ${isSectionCollapsed('score') ? 'collapsed' : ''}">▼</span>
                </div>
                <div class="sniper-section-body ${isSectionCollapsed('score') ? 'collapsed' : ''}" data-section="score">
                    <div class="sniper-score-card">
                        <div class="sniper-score-value" style="color: ${scoreColor}">${score}</div>
                        <div class="sniper-score-label">${rating.label}</div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <div style="flex: 1; text-align: center; padding: 8px; background: #18181b; border-radius: 6px;">
                            <div style="font-size: 10px; color: #71717a;">Compliance</div>
                            <div style="font-size: 13px; font-weight: 600; color: ${complianceScore >= 50 ? '#22c55e' : '#ef4444'}">${complianceScore}%</div>
                        </div>
                        <div style="flex: 1; text-align: center; padding: 8px; background: #18181b; border-radius: 6px;">
                            <div style="font-size: 10px; color: #71717a;">Insider</div>
                            <div style="font-size: 13px; font-weight: 600; color: ${insiderScore >= 50 ? '#22c55e' : '#ef4444'}">${insiderScore}%</div>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Financial Ratios (new section for templates) -->
            ${showSection('financials') ? `
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="financials">
                    <span class="sniper-section-title">📊 Financial Ratios</span>
                    <span class="sniper-section-toggle ${isSectionCollapsed('financials') ? 'collapsed' : ''}">▼</span>
                </div>
                <div class="sniper-section-body ${isSectionCollapsed('financials') ? 'collapsed' : ''}" data-section="financials">
                    <div id="financial-ratios-content">
                        <div style="text-align: center; padding: 12px; color: #71717a; font-size: 11px;">
                            <div class="sniper-loading-spinner" style="margin: 0 auto 8px;"></div>
                            Loading financial data...
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Compliance Details -->
            ${showSection('compliance') ? `
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="halal">
                    <span class="sniper-section-title">🛡️ Compliance Details</span>
                    <span class="sniper-section-toggle ${isSectionCollapsed('compliance') ? 'collapsed' : ''}">▼</span>
                </div>
                <div class="sniper-section-body ${isSectionCollapsed('compliance') ? 'collapsed' : ''}" data-section="halal">
                    ${this.renderHalalSection(ticker, cachedData, hasMusaffaData)}
                </div>
            </div>
            ` : ''}

            <!-- AI Analysis -->
            ${showSection('aiAnalysis') ? `
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="ai">
                    <span class="sniper-section-title">🤖 AI Analysis</span>
                    <span class="sniper-section-toggle ${isSectionCollapsed('aiAnalysis') ? 'collapsed' : ''}">▼</span>
                </div>
                <div class="sniper-section-body ${isSectionCollapsed('aiAnalysis') ? 'collapsed' : ''}" data-section="ai">
                    ${this.renderAISection(ticker)}
                </div>
            </div>
            ` : ''}

            <!-- Insider Activity Signals -->
            ${showSection('signals') ? `
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="signals">
                    <span class="sniper-section-title">⚡ Insider Signals</span>
                    <span class="sniper-section-toggle ${isSectionCollapsed('signals') ? 'collapsed' : ''}">▼</span>
                </div>
                <div class="sniper-section-body ${isSectionCollapsed('signals') ? 'collapsed' : ''}" data-section="signals">
                    ${this.renderSignalBadges(signals)}
                    
                    <div style="display: flex; gap: 4px; margin-top: 10px;">
                        <div style="flex: 1; text-align: center; padding: 6px; background: #18181b; border-radius: 4px; border: 1px solid #27272a;">
                            <div style="font-size: 9px; color: #71717a;">Net Flow</div>
                            <div style="font-size: 12px; font-weight: 600; color: ${net >= 0 ? '#22c55e' : '#ef4444'}">${net >= 0 ? '+' : ''}${fmt(net)}</div>
                        </div>
                        <div style="flex: 1; text-align: center; padding: 6px; background: #18181b; border-radius: 4px; border: 1px solid #27272a;">
                            <div style="font-size: 9px; color: #71717a;">Buyers</div>
                            <div style="font-size: 12px; font-weight: 600; color: #22c55e;">${stats.uniqueBuyers.size}</div>
                        </div>
                        <div style="flex: 1; text-align: center; padding: 6px; background: #18181b; border-radius: 4px; border: 1px solid #27272a;">
                            <div style="font-size: 9px; color: #71717a;">Sellers</div>
                            <div style="font-size: 12px; font-weight: 600; color: #ef4444;">${stats.uniqueSellers.size}</div>
                        </div>
                    </div>
                    
                    ${this.renderSignalDetails(signals, fmt)}
                </div>
            </div>
            ` : ''}

            <!-- Insider Details Table -->
            ${showSection('insiderStats') ? `
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="insider">
                    <span class="sniper-section-title">Insider Statistics</span>
                    <span class="sniper-section-toggle ${isSectionCollapsed('insiderStats') ? 'collapsed' : ''}">▼</span>
                </div>
                <div class="sniper-section-body ${isSectionCollapsed('insiderStats') ? 'collapsed' : ''}" data-section="insider">
                    <div class="sniper-card">
                        <div class="sniper-stat-row">
                            <span class="sniper-stat-label">Total Buys</span>
                            <span class="sniper-stat-value" style="color: #22c55e">${fmt(stats.totalBuy)} (${stats.countBuy})</span>
                        </div>
                        <div class="sniper-stat-row">
                            <span class="sniper-stat-label">Total Sells</span>
                            <span class="sniper-stat-value" style="color: #ef4444">${fmt(stats.totalSell)} (${stats.countSell})</span>
                        </div>
                        <div class="sniper-stat-row">
                            <span class="sniper-stat-label">Recent (30d)</span>
                            <span class="sniper-stat-value">${signals.recentActivity} trades</span>
                        </div>
                        <div class="sniper-stat-row">
                            <span class="sniper-stat-label">Buy Streak</span>
                            <span class="sniper-stat-value">${signals.buyStreak} days</span>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Quick Links -->
            ${showSection('links') ? `
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="links">
                    <span class="sniper-section-title">Quick Links</span>
                    <span class="sniper-section-toggle ${isSectionCollapsed('links') ? 'collapsed' : ''}">▼</span>
                </div>
                <div class="sniper-section-body ${isSectionCollapsed('links') ? 'collapsed' : ''}" data-section="links">
                    <div class="sniper-link-row">
                        <a class="sniper-link-btn" href="https://zoya.finance/stocks/${ticker}" target="_blank">Zoya</a>
                        <a class="sniper-link-btn" href="https://musaffa.com/stock/${ticker}" target="_blank">Musaffa</a>
                        <a class="sniper-link-btn" href="https://finance.yahoo.com/quote/${ticker}" target="_blank">Yahoo</a>
                    </div>
                    <div class="sniper-link-row" style="margin-top: 4px;">
                        <a class="sniper-link-btn" href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=4" target="_blank">SEC</a>
                        <a class="sniper-link-btn" href="https://finviz.com/quote.ashx?t=${ticker}" target="_blank">Finviz</a>
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        // Attach event listeners
        this.attachEventListeners(container, ticker, stats, signals, score);

        // Fetch and render financial ratios if section is visible
        if (showSection('financials')) {
            this.loadFinancialRatios(ticker);
        }
    },

    /**
     * Load and render financial ratios from Alpha Vantage
     */
    async loadFinancialRatios(ticker) {
        const container = document.getElementById('financial-ratios-content');
        if (!container) return;

        // Check if Alpha Vantage API key is configured
        if (!SniperAlphaVantage?.hasApiKey()) {
            container.innerHTML = `
                <div style="text-align: center; padding: 12px;">
                    <div style="color: #71717a; font-size: 11px; margin-bottom: 8px;">
                        Alpha Vantage API key required for financial data
                    </div>
                    <button id="setup-av-key-btn" class="sniper-btn sniper-btn-secondary sniper-btn-sm">
                        ⚙️ Setup API Key
                    </button>
                </div>
            `;
            container.querySelector('#setup-av-key-btn')?.addEventListener('click', () => {
                this.showAlphaVantageSetup();
            });
            return;
        }

        try {
            const result = await SniperAlphaVantage.fetchKeyRatios(ticker);
            
            if (result.success) {
                container.innerHTML = SniperAlphaVantage.renderKeyRatiosHTML(result.data, true);
                
                // Store for PDF export
                this.currentFinancialData = result.data;
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 12px; color: #ef4444; font-size: 11px;">
                        ${result.rateLimited ? '⚠️ API rate limit reached' : '❌ ' + (result.error || 'Failed to load')}
                    </div>
                `;
            }
        } catch (e) {
            console.error('Failed to load financial ratios:', e);
            container.innerHTML = `
                <div style="text-align: center; padding: 12px; color: #ef4444; font-size: 11px;">
                    ❌ Error loading data
                </div>
            `;
        }
    },

    /**
     * Show Alpha Vantage API key setup dialog
     */
    showAlphaVantageSetup() {
        const existing = document.getElementById('sniper-av-setup');
        if (existing) existing.remove();

        const dialog = document.createElement('div');
        dialog.id = 'sniper-av-setup';
        dialog.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #09090b; border: 1px solid #27272a; border-radius: 12px;
            padding: 24px; z-index: 100002; width: 360px; max-width: 90vw;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        `;
        
        dialog.innerHTML = `
            <h3 style="color: #fff; font-size: 16px; margin: 0 0 16px 0;">📊 Alpha Vantage Setup</h3>
            <p style="color: #a1a1aa; font-size: 12px; margin-bottom: 16px;">
                Get free financial data (PE, PEG, EPS, etc.) from Alpha Vantage. 
                <a href="https://www.alphavantage.co/support/#api-key" target="_blank" style="color: #60a5fa;">Get free API key →</a>
            </p>
            <input type="text" id="av-api-key-input" placeholder="Enter your Alpha Vantage API key" 
                value="${SniperAlphaVantage?.getApiKey() || ''}"
                style="width: 100%; padding: 10px 12px; background: #18181b; border: 1px solid #27272a; border-radius: 8px; color: #fff; font-size: 13px; margin-bottom: 16px; box-sizing: border-box;">
            <div style="display: flex; gap: 8px;">
                <button id="av-save-btn" style="flex: 1; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer;">Save</button>
                <button id="av-cancel-btn" style="padding: 10px 16px; background: #27272a; color: #a1a1aa; border: none; border-radius: 8px; font-size: 13px; cursor: pointer;">Cancel</button>
            </div>
        `;

        const backdrop = document.createElement('div');
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100001;';
        backdrop.onclick = () => { backdrop.remove(); dialog.remove(); };

        document.body.appendChild(backdrop);
        document.body.appendChild(dialog);

        dialog.querySelector('#av-save-btn').onclick = () => {
            const key = dialog.querySelector('#av-api-key-input').value.trim();
            if (key) {
                SniperAlphaVantage.setApiKey(key);
                backdrop.remove();
                dialog.remove();
                // Reload financial data
                this.loadFinancialRatios(this.currentTicker);
            }
        };

        dialog.querySelector('#av-cancel-btn').onclick = () => {
            backdrop.remove();
            dialog.remove();
        };
    },
    
    /**
     * Render signal badges (compact)
     */
    renderSignalBadges(signals) {
        let badges = '';
        if (signals.clusterBuying) badges += `<span class="sniper-badge cluster">🔥 Cluster Buying</span>`;
        if (signals.whaleTrades.length > 0) badges += `<span class="sniper-badge whale">🐋 Whale Activity</span>`;
        if (signals.executiveBuys.length > 0) badges += `<span class="sniper-badge exec">👔 Executive Buys</span>`;
        if (signals.reversalSignal) badges += `<span class="sniper-badge reversal">🔄 Reversal</span>`;
        if (signals.buyStreak >= 3) badges += `<span class="sniper-badge new">📈 Buy Streak</span>`;
        if (signals.freshEntries.length > 0) badges += `<span class="sniper-badge new">✨ New Entry</span>`;
        if (signals.isPennyStock) badges += `<span class="sniper-badge penny">⚠️ Penny Stock</span>`;
        if (signals.priceDrawdown > 0.5) badges += `<span class="sniper-badge risk">📉 Downtrend</span>`;
        
        return `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">${badges}</div>`;
    },

    /**
     * Render signal details (compact)
     */
    renderSignalDetails(signals, fmt) {
        let html = '';
        
        // Executive Buys
        if (signals.executiveBuys.length > 0) {
            html += `<div style="margin-top: 8px;"><div style="font-size: 10px; font-weight: 600; color: #a1a1aa; margin-bottom: 4px;">Top Executive Buys</div>`;
            signals.executiveBuys.slice(0, 3).forEach(b => {
                html += `
                    <div class="sniper-trade-card">
                        <div class="sniper-trade-header">
                            <span class="sniper-trade-name">${b.name}</span>
                            <span class="sniper-trade-value buy">+${fmt(b.val)}</span>
                        </div>
                        <div class="sniper-trade-meta">${b.title} • ${b.daysAgo}d ago</div>
                    </div>`;
            });
            html += `</div>`;
        }

        // Whale Trades
        const whalesNotExec = signals.whaleTrades.filter(w => !signals.executiveBuys.find(e => e.name === w.name));
        if (whalesNotExec.length > 0) {
            html += `<div style="margin-top: 8px;"><div style="font-size: 10px; font-weight: 600; color: #a1a1aa; margin-bottom: 4px;">Whale Trades</div>`;
            whalesNotExec.slice(0, 3).forEach(w => {
                html += `
                    <div class="sniper-trade-card">
                        <div class="sniper-trade-header">
                            <span class="sniper-trade-name">${w.name}</span>
                            <span class="sniper-trade-value buy">+${fmt(w.val)}</span>
                        </div>
                        <div class="sniper-trade-meta">${w.daysAgo}d ago</div>
                    </div>`;
            });
            html += `</div>`;
        }
        
        return html;
    },

    /**
     * Render halal status section with enhanced data if available
     */
    renderHalalSection(ticker, cachedData, hasMusaffaData) {
        const hasCachedStatus = cachedData?.status !== null && cachedData?.status !== undefined;
        
        let musaffaInfo = '';
        
        if (hasMusaffaData && cachedData) {
            // Render enhanced breakdown
            const parts = [];
            if (cachedData.halalPercent !== null && cachedData.halalPercent !== undefined) {
                parts.push(`<div class="sniper-stat-row"><span class="sniper-stat-label">Halal Revenue</span><span class="sniper-stat-value" style="color: #22c55e">${cachedData.halalPercent}%</span></div>`);
            }
            if (cachedData.notHalalPercent !== null && cachedData.notHalalPercent !== undefined) {
                parts.push(`<div class="sniper-stat-row"><span class="sniper-stat-label">Haram Revenue</span><span class="sniper-stat-value" style="color: #ef4444">${cachedData.notHalalPercent}%</span></div>`);
            }
            if (cachedData.marketCapDisplay) {
                parts.push(`<div class="sniper-stat-row"><span class="sniper-stat-label">Market Cap</span><span class="sniper-stat-value">${cachedData.marketCapDisplay}</span></div>`);
            }
            if (cachedData.dividendYield) {
                parts.push(`<div class="sniper-stat-row"><span class="sniper-stat-label">Div Yield</span><span class="sniper-stat-value">${cachedData.dividendYield}</span></div>`);
            }
            
            if (parts.length > 0) {
                musaffaInfo = `
                    <div class="sniper-card" style="margin-bottom: 8px;">
                        ${parts.join('')}
                    </div>
                `;
            }
            
            // Age indicator
            const age = cachedData.checkedAt ? Math.floor((Date.now() - cachedData.checkedAt) / (1000 * 60 * 60)) : null;
            const ageText = age !== null ? (age < 24 ? `${age}h ago` : `${Math.floor(age/24)}d ago`) : '';
            if (ageText) {
                musaffaInfo += `<div style="text-align: right; font-size: 9px; color: #52525b; margin-bottom: 8px;">Updated: ${ageText}</div>`;
            }
        }

        return `
            ${musaffaInfo}
            <div id="halal-view-mode">
                <div style="display: flex; gap: 4px;">
                    <button id="musaffa-refresh-btn" class="sniper-btn sniper-btn-secondary sniper-btn-sm" style="flex: 1;">
                        ${hasCachedStatus ? '🔄 Verify / Update' : '🛡️ Check Status'}
                    </button>
                    <button id="halal-edit-trigger" class="sniper-btn sniper-btn-secondary sniper-btn-sm" style="flex: 0 0 auto; background: transparent; border-style: dashed; width: auto;">
                        ✏️
                    </button>
                </div>
            </div>
            <div id="halal-edit-mode" style="display: none;">
                <div class="sniper-halal-actions">
                    <div class="sniper-halal-row">
                        <button class="sniper-halal-btn halal status-set-btn" data-status="HALAL">✅ Halal</button>
                        <button class="sniper-halal-btn haram status-set-btn" data-status="NOT_HALAL">🚫 Haram</button>
                    </div>
                    <div class="sniper-halal-row" style="margin-top: 4px;">
                        <button class="sniper-halal-btn doubt status-set-btn" data-status="DOUBTFUL">⚠️ Doubtful</button>
                        <button class="sniper-halal-btn clear" id="musaffa-clear-btn" title="Clear Status">🗑️</button>
                    </div>
                    <div id="halal-edit-cancel" style="text-align: center; padding: 6px; font-size: 10px; color: #71717a; cursor: pointer; margin-top: 4px; border-top: 1px solid #27272a;">Cancel</div>
                </div>
            </div>
        `;
    },

    /**
     * Render AI analysis section (compact, Musaffa-style)
     */
    renderAISection(_ticker) {
        return `
            <div id="ai-cached-reports" style="display: none; margin-bottom: 8px;">
                <!-- Cached reports will be injected here -->
            </div>
            <div class="sniper-ai-modes" style="display: flex; gap: 4px; margin-bottom: 8px;">
                <div class="sniper-ai-mode active" data-mode="quick" style="flex: 1;">
                    <span style="font-size: 11px;">⚡</span> Quick
                    <div style="font-size: 8px; color: #71717a; margin-top: 1px;">Insider Only</div>
                </div>
                <div class="sniper-ai-mode" data-mode="deep" style="flex: 1;">
                    <span style="font-size: 11px;">🌐</span> Deep
                    <div style="font-size: 8px; color: #71717a; margin-top: 1px;">+ Web Search</div>
                </div>
            </div>
            <div id="ai-actions-container" style="display: flex; gap: 4px;">
                <button id="ai-analyze-btn" class="sniper-btn sniper-btn-primary sniper-btn-sm" style="flex: 1;">
                    🤖 Analyze
                </button>
                <button id="ai-settings-btn" class="sniper-btn sniper-btn-secondary sniper-btn-sm" style="width: auto; padding: 6px 8px;">
                    ⚙️
                </button>
            </div>
        `;
    },

    /**
     * Attach event listeners to rendered elements
     */
    attachEventListeners(container, ticker, stats, signals, score) {
        // Template selector - attach listeners and handle template change
        if (SniperTemplates) {
            SniperTemplates.attachTemplateSelectorListeners(container, (templateId) => {
                console.log('📋 Template changed to:', templateId);
                // Re-render with new template
                this.renderAnalysis(container, stats, signals, score, ticker);
            });
        }

        // Collapsible sections
        container.querySelectorAll('.sniper-section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.getAttribute('data-section');
                const body = container.querySelector(`.sniper-section-body[data-section="${section}"]`);
                const toggle = header.querySelector('.sniper-section-toggle');
                
                if (body) {
                    body.classList.toggle('collapsed');
                    if (toggle) toggle.classList.toggle('collapsed');
                }
            });
        });

        // Favorite toggle
        const favBtn = container.querySelector('#fav-toggle-btn');
        if (favBtn) {
            favBtn.addEventListener('click', () => {
                if (SniperUtils.isFavorite(ticker)) {
                    SniperUtils.removeFavorite(ticker);
                } else {
                    SniperUtils.addFavorite(ticker);
                }
                this.renderAnalysis(container, stats, signals, score, ticker);
            });
        }

        // Musaffa verify button
        const refreshBtn = container.querySelector('#musaffa-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<div class="sniper-loading-spinner" style="width: 14px; height: 14px; margin: 0;"></div> Checking...';
                SniperMusaffa.fetchMusaffaStatus(ticker, () => {
                    this.renderAnalysis(container, stats, signals, score, ticker);
                });
            });
        }

        // Halal edit mode toggle
        const editTrigger = container.querySelector('#halal-edit-trigger');
        const viewMode = container.querySelector('#halal-view-mode');
        const editMode = container.querySelector('#halal-edit-mode');
        const editCancel = container.querySelector('#halal-edit-cancel');

        if (editTrigger) {
            editTrigger.addEventListener('click', () => {
                viewMode.style.display = 'none';
                editMode.style.display = 'block';
            });
        }

        if (editCancel) {
            editCancel.addEventListener('click', () => {
                editMode.style.display = 'none';
                viewMode.style.display = 'block';
            });
        }

        // Manual status setters
        container.querySelectorAll('.status-set-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.getAttribute('data-status');
                SniperUtils.setHalalCache(ticker, status);
                this.renderAnalysis(container, stats, signals, score, ticker);
            });
        });

        // Clear status button
        const clearBtn = container.querySelector('#musaffa-clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                SniperUtils.clearHalalCache(ticker);
                this.renderAnalysis(container, stats, signals, score, ticker);
            });
        }

        // AI mode toggle - use helper function to get current mode from DOM (more reliable than closure variable)
        const getSelectedAiMode = () => {
            const activeMode = container.querySelector('.sniper-ai-mode.active');
            return activeMode?.getAttribute('data-mode') || 'quick';
        };

        const aiModes = container.querySelectorAll('.sniper-ai-mode');
        aiModes.forEach(mode => {
            mode.addEventListener('click', () => {
                aiModes.forEach(m => m.classList.remove('active'));
                mode.classList.add('active');
                console.log('🎯 AI Mode selected:', mode.getAttribute('data-mode'));
            });
        });

        // AI actions - check for cached reports
        const insiderDataForAI = SniperAI.buildInsiderDataSummary(stats, signals);
        
        Promise.all([
            SniperStorage.getAIHistory(ticker, 'quick'),
            SniperStorage.getAIHistory(ticker, 'deep')
        ]).then(([cachedQuick, cachedDeep]) => {
            const actionsContainer = container.querySelector('#ai-actions-container');
            const cachedReportsContainer = container.querySelector('#ai-cached-reports');
            if (!actionsContainer) return;

            const getValidReport = (report) => {
                if (!report) return null;
                const age = Date.now() - report.timestamp;
                return age < 48 * 60 * 60 * 1000 ? report : null;
            };

            const validQuick = getValidReport(cachedQuick);
            const validDeep = getValidReport(cachedDeep);
            const hasAnyReport = validQuick || validDeep;

            // Helper to get time ago
            const getTimeAgo = (timestamp) => {
                const seconds = Math.floor((Date.now() - timestamp) / 1000);
                if (seconds < 60) return 'just now';
                if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
                if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
                return Math.floor(seconds / 86400) + 'd ago';
            };

            // Show cached report buttons (Musaffa-style - separate buttons for each type)
            if (cachedReportsContainer && hasAnyReport) {
                cachedReportsContainer.style.display = 'flex';
                cachedReportsContainer.style.gap = '4px';
                cachedReportsContainer.innerHTML = '';

                if (validQuick) {
                    const quickBtn = document.createElement('button');
                    quickBtn.className = 'sniper-btn sniper-btn-success sniper-btn-sm';
                    quickBtn.style.flex = '1';
                    quickBtn.innerHTML = `<span style="margin-right: 4px;">📄</span> Quick Report`;
                    quickBtn.title = `Saved ${getTimeAgo(validQuick.timestamp)}`;
                    quickBtn.onclick = () => {
                        SniperAI.showAnalysisPopup(ticker, stats.companyName, insiderDataForAI, stats, signals, 'quick', validQuick);
                    };
                    cachedReportsContainer.appendChild(quickBtn);
                }

                if (validDeep) {
                    const deepBtn = document.createElement('button');
                    deepBtn.className = 'sniper-btn sniper-btn-success sniper-btn-sm';
                    deepBtn.style.flex = '1';
                    deepBtn.innerHTML = `<span style="margin-right: 4px;">📋</span> Deep Report`;
                    deepBtn.title = `Saved ${getTimeAgo(validDeep.timestamp)}`;
                    deepBtn.onclick = () => {
                        SniperAI.showAnalysisPopup(ticker, stats.companyName, insiderDataForAI, stats, signals, 'deep', validDeep);
                    };
                    cachedReportsContainer.appendChild(deepBtn);
                }
            }

            // Update action buttons
            actionsContainer.innerHTML = '';

            // Run Analysis button - changes label based on whether reports exist
            const runBtn = document.createElement('button');
            runBtn.innerHTML = hasAnyReport ? '🔄 New Analysis' : '🤖 Analyze';
            runBtn.className = 'sniper-btn sniper-btn-primary sniper-btn-sm';
            runBtn.style.flex = '1';
            runBtn.onclick = () => {
                // Read mode from DOM at click time (not closure variable)
                const currentMode = getSelectedAiMode();
                console.log('🎯 Running analysis with mode:', currentMode);
                SniperAI.showAnalysisPopup(ticker, stats.companyName, insiderDataForAI, stats, signals, currentMode, null);
            };
            actionsContainer.appendChild(runBtn);

            // Settings button
            const setBtn = document.createElement('button');
            setBtn.innerHTML = '⚙️';
            setBtn.className = 'sniper-btn sniper-btn-secondary sniper-btn-sm';
            setBtn.style.width = 'auto';
            setBtn.style.padding = '6px 8px';
            setBtn.onclick = () => SniperAI.showApiKeyDialog();
            actionsContainer.appendChild(setBtn);
        });

        // AI settings button (fallback if not replaced)
        const aiSettingsBtn = container.querySelector('#ai-settings-btn');
        if (aiSettingsBtn) {
            aiSettingsBtn.addEventListener('click', () => SniperAI.showApiKeyDialog());
        }

        // AI analyze button (fallback if not replaced)
        const aiAnalyzeBtn = container.querySelector('#ai-analyze-btn');
        if (aiAnalyzeBtn) {
            aiAnalyzeBtn.addEventListener('click', () => {
                const currentMode = getSelectedAiMode();
                console.log('🎯 Running analysis (fallback) with mode:', currentMode);
                SniperAI.showAnalysisPopup(ticker, stats.companyName, insiderDataForAI, stats, signals, currentMode, null);
            });
        }
    }
};

window.SniperStockAnalyzer = SniperStockAnalyzer;
