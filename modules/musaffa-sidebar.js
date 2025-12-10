// =========================================================================
// 🎯 MUSAFFA SIDEBAR MODULE - Collapsible sidebar UI for Musaffa.com
// Premium Zinc Theme - Matches Halal Sniper Pro aesthetic
// =========================================================================

const MusaffaSidebar = {
    sidebarEl: null,
    toggleEl: null,
    isOpen: true,
    currentData: null,
    insiderData: null,
    opportunityScore: null,
    cachedReports: { quick: null, deep: null },

    /**
     * Initialize the sidebar
     */
    init() {
        console.log('🎯 Musaffa Sidebar: Initializing...');
        this.injectStyles();
        this.createSidebar();
        this.createToggle();
        this.loadData();
    },

    /**
     * Inject CSS styles for the sidebar
     */
    injectStyles() {
        if (document.getElementById('sniper-musaffa-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'sniper-musaffa-styles';
        styles.textContent = `
            /* Musaffa Sidebar - Premium Zinc Theme */
            #sniper-musaffa-sidebar {
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

            #sniper-musaffa-sidebar.collapsed {
                transform: translateX(100%);
            }

            #sniper-musaffa-toggle {
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

            #sniper-musaffa-toggle:hover {
                background: #18181b;
                color: #e4e4e7;
                width: 36px;
            }

            #sniper-musaffa-toggle.open {
                right: 320px;
                width: 32px;
                background: #09090b;
            }

            .sniper-sidebar-header {
                padding: 10px 12px;
                border-bottom: 1px solid #27272a;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .sniper-sidebar-title {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .sniper-sidebar-title h2 {
                margin: 0;
                font-size: 13px;
                font-weight: 700;
                color: #fff;
                letter-spacing: -0.3px;
            }

            .sniper-sidebar-title span {
                font-size: 10px;
                color: #52525b;
                font-weight: 500;
            }

            .sniper-sidebar-close {
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

            .sniper-sidebar-close:hover {
                background: #18181b;
                color: #e4e4e7;
            }

            .sniper-sidebar-content {
                flex: 1;
                overflow-y: auto;
                padding: 10px 12px;
            }

            /* Compact component styles (Shared with Analyzer) */
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

            /* Signal badges - matches analyzer styling */
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
                gap: 8px;
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
            .sniper-link-btn[href*="openinsider"] {
                background: rgba(249,115,22,0.15);
                border-color: rgba(249,115,22,0.3);
                color: #fb923c;
            }
            .sniper-link-btn[href*="openinsider"]:hover {
                background: rgba(249,115,22,0.25);
                color: #fdba74;
            }

            .sniper-link-btn[href*="zoya"] {
                background: rgba(34,197,94,0.15);
                border-color: rgba(34,197,94,0.3);
                color: #4ade80;
            }
            .sniper-link-btn[href*="zoya"]:hover {
                background: rgba(34,197,94,0.25);
                color: #86efac;
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

            .sniper-loading {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 40px;
                color: #71717a;
                font-size: 12px;
            }

            .sniper-loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #27272a;
                border-top-color: #2563eb;
                border-radius: 50%;
                animation: sniper-spin 0.8s linear infinite;
                margin-right: 8px;
            }

            @keyframes sniper-spin {
                to { transform: rotate(360deg); }
            }

            .sniper-insider-card {
                background: #18181b;
                border: 1px solid #27272a;
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 8px;
            }

            .sniper-insider-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
            }

            .sniper-insider-name {
                font-size: 12px;
                font-weight: 600;
                color: #e4e4e7;
            }

            .sniper-insider-value {
                font-size: 12px;
                font-weight: 700;
            }

            .sniper-insider-value.buy { color: #22c55e; }
            .sniper-insider-value.sell { color: #ef4444; }

            .sniper-insider-meta {
                font-size: 10px;
                color: #71717a;
            }

            .sniper-empty-state {
                text-align: center;
                padding: 20px;
                color: #52525b;
                font-size: 12px;
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

            .sniper-btn-success {
                background: #22c55e;
                color: white;
                border: none;
            }

            .sniper-btn-success:hover {
                background: #16a34a;
            }

            .sniper-report-row {
                display: flex;
                gap: 6px;
                margin-bottom: 10px;
            }

            .sniper-report-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                font-weight: 500;
                background: rgba(34, 197, 94, 0.15);
                color: #22c55e;
                border: 1px solid rgba(34, 197, 94, 0.3);
            }

            /* Report Modal */
            #sniper-report-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
            }

            .sniper-report-modal-content {
                background: #09090b;
                border: 1px solid #27272a;
                border-radius: 12px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            }

            .sniper-report-modal-header {
                padding: 16px;
                border-bottom: 1px solid #27272a;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .sniper-report-modal-title {
                font-size: 14px;
                font-weight: 700;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .sniper-report-modal-close {
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                cursor: pointer;
                color: #71717a;
                font-size: 16px;
                transition: all 0.2s;
            }

            .sniper-report-modal-close:hover {
                background: #27272a;
                color: #e4e4e7;
            }

            .sniper-report-modal-body {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
                font-size: 13px;
                line-height: 1.6;
                color: #d4d4d8;
            }

            .sniper-report-modal-body h1,
            .sniper-report-modal-body h2,
            .sniper-report-modal-body h3 {
                color: #fff;
                margin-top: 16px;
                margin-bottom: 8px;
            }

            .sniper-report-modal-body h1 { font-size: 18px; }
            .sniper-report-modal-body h2 { font-size: 16px; }
            .sniper-report-modal-body h3 { font-size: 14px; }

            .sniper-report-modal-body p {
                margin-bottom: 12px;
            }

            .sniper-report-modal-body ul,
            .sniper-report-modal-body ol {
                margin-left: 20px;
                margin-bottom: 12px;
            }

            .sniper-report-modal-body li {
                margin-bottom: 4px;
            }

            .sniper-report-modal-body strong {
                color: #fff;
            }

            .sniper-report-modal-body code {
                background: #27272a;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
            }

            .sniper-report-meta {
                font-size: 11px;
                color: #71717a;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #27272a;
            }

            .sniper-report-modal-footer {
                padding: 12px 16px;
                border-top: 1px solid #27272a;
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
        `;

        document.head.appendChild(styles);
    },

    /**
     * Create the sidebar element
     */
    createSidebar() {
        if (document.getElementById('sniper-musaffa-sidebar')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'sniper-musaffa-sidebar';
        sidebar.innerHTML = `
            <div class="sniper-sidebar-header">
                <div class="sniper-sidebar-title">
                    <h2>🎯 Halal Sniper Pro</h2>
                    <span>v2.0</span>
                </div>
                <div class="sniper-sidebar-close" id="sniper-sidebar-close">✕</div>
            </div>
            <div class="sniper-sidebar-content" id="sniper-sidebar-content">
                <div class="sniper-loading">
                    <div class="sniper-loading-spinner"></div>
                    Analyzing...
                </div>
            </div>
        `;

        document.body.appendChild(sidebar);
        this.sidebarEl = sidebar;

        // Close button handler
        document.getElementById('sniper-sidebar-close').addEventListener('click', () => {
            this.toggle();
        });
    },

    /**
     * Create the toggle button
     */
    createToggle() {
        if (document.getElementById('sniper-musaffa-toggle')) return;

        const toggle = document.createElement('div');
        toggle.id = 'sniper-musaffa-toggle';
        toggle.className = 'open';
        toggle.innerHTML = '🎯';
        toggle.title = 'Toggle Halal Sniper';

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

    /**
     * Load and display data
     */
    async loadData() {
        try {
            // Wait for page to load and extract Musaffa data
            const pageData = await MusaffaPage.waitAndExtract();
            this.currentData = pageData;

            if (!pageData.data) {
                this.showError('Unable to extract page data');
                return;
            }

            // 🔄 SYNC: Save extracted Musaffa data to shared DB for OpenInsider
            await this.saveToSharedDB(pageData.data);

            // Check for cached AI reports
            await this.checkCachedReports(pageData.data.ticker);

            // ⚡ OPTIMIZATION: Only fetch insider data if stock is NOT haram
            // For haram stocks, don't waste resources - user can fetch manually if needed
            const complianceStatus = pageData.data?.compliance?.status;
            if (complianceStatus !== 'NOT_HALAL') {
                // Fetch insider data from OpenInsider (checks cache first)
                await this.fetchInsiderData(pageData.data.ticker);
            } else {
                console.log('🎯 Musaffa Sidebar: Skipping OpenInsider fetch - stock is NOT HALAL');
                this.insiderData = null;
            }

            // Calculate combined opportunity score
            this.calculateOpportunityScore();

            // Render the sidebar content
            this.render();
        } catch (e) {
            console.error('🎯 Musaffa Sidebar: Error loading data:', e);
            this.showError('Error loading data: ' + e.message);
        }
    },

    /**
     * Save extracted Musaffa data to shared DB for cross-site sync
     * This data will be available on OpenInsider for the same ticker
     */
    async saveToSharedDB(data) {
        if (!data?.ticker) return;

        try {
            // Build enhanced halal data object with ALL available financial data
            const enhancedData = {
                status: data.compliance?.status || 'UNKNOWN',
                grade: data.compliance?.grade,
                methodology: data.compliance?.methodology,
                lastUpdated: data.compliance?.lastUpdated,
                reportSource: data.compliance?.reportSource,
                
                // Business breakdown
                halalPercent: data.businessBreakdown?.halalPercent,
                doubtfulPercent: data.businessBreakdown?.doubtfulPercent,
                notHalalPercent: data.businessBreakdown?.notHalalPercent,
                businessActivity: data.businessBreakdown?.businessActivity,
                
                // Financial screening (halal compliance ratios)
                debtRatio: data.financialData?.debtRatio,
                debtStatus: data.financialData?.debtStatus,
                securitiesStatus: data.financialData?.securitiesStatus,
                
                // Company info
                companyName: data.name,
                sector: data.sector,
                country: data.country,
                
                // ===== NEW: Key Statistics from Overview =====
                marketCapValue: data.keyStatistics?.marketCapValue,      // Numeric value (e.g., 1300000000)
                marketCapDisplay: data.keyStatistics?.marketCapDisplay,  // Display string (e.g., "1.30B")
                peRatio: data.keyStatistics?.peRatio,                    // P/E Ratio TTM
                volume: data.keyStatistics?.volume,                      // Today's volume
                avgVolume: data.keyStatistics?.avgVolume,                // Average volume
                dividendYield: data.keyStatistics?.dividendYield,        // Dividend yield %
                currentPrice: data.keyStatistics?.currentPrice,          // Current stock price
                todaysOpen: data.keyStatistics?.todaysOpen,
                todaysLow: data.keyStatistics?.todaysLow,
                todaysHigh: data.keyStatistics?.todaysHigh,
                fiftyTwoWeekLow: data.keyStatistics?.fiftyTwoWeekLow,
                fiftyTwoWeekHigh: data.keyStatistics?.fiftyTwoWeekHigh,
                
                // ===== NEW: Financial Metrics from Financials Tab =====
                eps: data.financialMetrics?.eps,                         // Earnings per share
                epsForward: data.financialMetrics?.epsForward,           // Forward EPS estimate
                revenuePerShare: data.financialMetrics?.revenuePerShare,
                ebitPerShare: data.financialMetrics?.ebitPerShare,
                dividendPerShare: data.financialMetrics?.dividendPerShare,
                netMargin: data.financialMetrics?.netMargin,
                grossMargin: data.financialMetrics?.grossMargin,
                operatingMargin: data.financialMetrics?.operatingMargin,
                quickRatio: data.financialMetrics?.quickRatio,
                currentRatio: data.financialMetrics?.currentRatio,
                priceToBook: data.financialMetrics?.priceToBook,
                returnOnAssets: data.financialMetrics?.returnOnAssets,
                returnOnEquity: data.financialMetrics?.returnOnEquity,
                freeCashFlowMargin: data.financialMetrics?.freeCashFlowMargin
            };

            // Save to shared IndexedDB
            if (typeof SniperStorage !== 'undefined' && SniperStorage.setHalalEnhanced) {
                await SniperStorage.setHalalEnhanced(data.ticker, enhancedData);
                console.log('🔄 Synced Musaffa data to shared DB:', data.ticker, {
                    status: enhancedData.status,
                    marketCap: enhancedData.marketCapDisplay,
                    pe: enhancedData.peRatio,
                    eps: enhancedData.eps,
                    divYield: enhancedData.dividendYield
                });
            }
        } catch (e) {
            console.error('🎯 Error saving to shared DB:', e);
        }
    },

    /**
     * Check for cached AI reports in storage
     */
    async checkCachedReports(ticker) {
        if (!ticker) return;

        try {
            console.log('🎯 Checking for cached reports:', ticker);
            
            // Check if SniperStorage is available
            if (typeof SniperStorage !== 'undefined' && SniperStorage.getAIHistory) {
                // Check for quick report
                const quickReport = await SniperStorage.getAIHistory(ticker, 'quick');
                if (quickReport && quickReport.analysis) {
                    this.cachedReports.quick = quickReport;
                    console.log('🎯 Found cached quick report for', ticker);
                }

                // Check for deep report
                const deepReport = await SniperStorage.getAIHistory(ticker, 'deep');
                if (deepReport && deepReport.analysis) {
                    this.cachedReports.deep = deepReport;
                    console.log('🎯 Found cached deep report for', ticker);
                }
            }
        } catch (e) {
            console.error('🎯 Error checking cached reports:', e);
        }
    },

    /**
     * Fetch insider trading data from OpenInsider
     * Uses cached data if available and fresh, otherwise fetches new data
     */
    async fetchInsiderData(ticker) {
        if (!ticker) return;

        try {
            console.log('🎯 Checking for cached insider data:', ticker);
            
            // 🔄 SYNC: Check for cached insider data first
            if (typeof SniperStorage !== 'undefined' && SniperStorage.getInsiderData) {
                const cachedInsider = await SniperStorage.getInsiderData(ticker);
                if (cachedInsider) {
                    console.log('🎯 Using cached insider data for:', ticker);
                    this.insiderData = cachedInsider;
                    return;
                }
            }

            console.log('🎯 Fetching fresh insider data for:', ticker);
            
            // Request insider data from background script
            return new Promise((resolve) => {
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                    chrome.runtime.sendMessage(
                        { action: 'fetchInsiderData', ticker: ticker },
                        async (response) => {
                            if (chrome.runtime.lastError) {
                                console.log('🎯 Insider fetch error:', chrome.runtime.lastError.message);
                                this.insiderData = null;
                                resolve();
                                return;
                            }
                            
                            if (response && response.success) {
                                this.insiderData = response.data;
                                console.log('🎯 Insider data received:', this.insiderData);
                                
                                // 🔄 SYNC: Cache insider data for future use
                                if (typeof SniperStorage !== 'undefined' && SniperStorage.saveInsiderData) {
                                    await SniperStorage.saveInsiderData(ticker, this.insiderData);
                                }
                            } else {
                                this.insiderData = null;
                            }
                            resolve();
                        }
                    );
                } else {
                    // Fallback: generate placeholder data
                    this.insiderData = null;
                    resolve();
                }
            });
        } catch (e) {
            console.error('🎯 Error fetching insider data:', e);
            this.insiderData = null;
        }
    },

    /**
     * Calculate combined opportunity score
     * Compliance (40%) + Insider Activity (60%)
     */
    calculateOpportunityScore() {
        let complianceScore = 50; // Default neutral
        let insiderScore = 50; // Default neutral

        const data = this.currentData?.data;

        // Compliance score (0-100)
        if (data?.compliance?.status) {
            switch (data.compliance.status) {
                case 'HALAL':
                    complianceScore = 100;
                    // Bonus for grade
                    if (data.compliance.grade) {
                        const gradeBonus = { 'A+': 0, 'A': 0, 'B': -5, 'C': -10, 'D': -15, 'F': -20 };
                        complianceScore += gradeBonus[data.compliance.grade] || 0;
                    }
                    break;
                case 'DOUBTFUL':
                    complianceScore = 50;
                    break;
                case 'NOT_HALAL':
                    complianceScore = 0;
                    break;
            }
        }

        // Insider score (0-100)
        if (this.insiderData) {
            const { totalBuy = 0, totalSell = 0, buyCount = 0, sellCount = 0, recentActivity = 0 } = this.insiderData;
            
            // Calculate buy/sell ratio
            const total = totalBuy + totalSell;
            if (total > 0) {
                const buyRatio = totalBuy / total;
                insiderScore = Math.round(buyRatio * 100);
            }

            // Bonus for recent activity
            if (recentActivity > 0) insiderScore += Math.min(recentActivity * 2, 10);
            
            // Bonus for more buyers than sellers
            if (buyCount > sellCount) insiderScore += 5;
            if (buyCount > sellCount * 2) insiderScore += 5;
        }

        // Weighted combination
        const combinedScore = Math.round(complianceScore * 0.4 + insiderScore * 0.6);
        
        this.opportunityScore = {
            combined: Math.max(0, Math.min(100, combinedScore)),
            compliance: complianceScore,
            insider: insiderScore
        };
    },

    /**
     * Render the sidebar content
     */
    render() {
        const content = document.getElementById('sniper-sidebar-content');
        if (!content) return;

        const data = this.currentData?.data;
        if (!data) {
            content.innerHTML = '<div class="sniper-empty-state">No data available</div>';
            return;
        }

        const compliance = data.compliance || {};
        const ticker = data.ticker || 'N/A';
        const companyName = data.name || 'Unknown Company';

        // Determine status styling
        let statusClass = 'doubtful';
        let statusIcon = '⚠️';
        if (compliance.status === 'HALAL') {
            statusClass = 'halal';
            statusIcon = '✅';
        } else if (compliance.status === 'NOT_HALAL') {
            statusClass = 'not-halal';
            statusIcon = '🚫';
        }

        // Grade class
        const gradeClass = compliance.grade ? compliance.grade[0].toLowerCase() : '';

        // Score rating
        const score = this.opportunityScore?.combined || 50;
        let scoreColor = '#facc15';
        let scoreLabel = 'WATCH';
        if (score >= 75) { scoreColor = '#22c55e'; scoreLabel = 'STRONG BUY'; }
        else if (score >= 60) { scoreColor = '#4ade80'; scoreLabel = 'BUY'; }
        else if (score >= 45) { scoreColor = '#facc15'; scoreLabel = 'WATCH'; }
        else if (score >= 30) { scoreColor = '#f97316'; scoreLabel = 'WEAK'; }
        else { scoreColor = '#ef4444'; scoreLabel = 'AVOID'; }

        // Check if ticker is favorited
        const isFav = typeof SniperUtils !== 'undefined' && SniperUtils.isFavorite ? SniperUtils.isFavorite(ticker) : false;

        content.innerHTML = `
            <!-- Header Section -->
            <div class="sniper-section" style="margin-bottom: 12px; border-bottom: 1px solid #27272a; padding-bottom: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div>
                            <div style="font-size: 18px; font-weight: 700; color: #fff;">${ticker}</div>
                            <div style="font-size: 11px; color: #71717a;">${companyName}</div>
                        </div>
                        ${compliance.grade ? `<div class="sniper-grade-badge ${gradeClass}">${compliance.grade}</div>` : ''}
                    </div>
                    <button id="sniper-fav-toggle" style="padding: 6px 10px; background: ${isFav ? '#facc15' : 'transparent'}; border: 1px solid ${isFav ? '#facc15' : '#3f3f46'}; color: ${isFav ? '#000' : '#d4d4d8'}; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s;">
                        ${isFav ? '★' : '☆'}
                    </button>
                </div>
                <div class="sniper-compliance-badge ${statusClass}">
                    ${statusIcon} ${compliance.status || 'UNKNOWN'}
                </div>
            </div>

            <!-- Opportunity Score -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="score">
                    <span class="sniper-section-title">Opportunity Score</span>
                    <span class="sniper-section-toggle">▼</span>
                </div>
                <div class="sniper-section-body" data-section="score">
                    <div class="sniper-score-card">
                        <div class="sniper-score-value" style="color: ${scoreColor}">${score}</div>
                        <div class="sniper-score-label">${scoreLabel}</div>
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <div style="flex: 1; text-align: center; padding: 8px; background: #18181b; border-radius: 6px;">
                            <div style="font-size: 10px; color: #71717a;">Compliance</div>
                            <div style="font-size: 13px; font-weight: 600; color: ${this.opportunityScore?.compliance >= 50 ? '#22c55e' : '#ef4444'}">${this.opportunityScore?.compliance || 0}%</div>
                        </div>
                        <div style="flex: 1; text-align: center; padding: 8px; background: #18181b; border-radius: 6px;">
                            <div style="font-size: 10px; color: #71717a;">Insider</div>
                            <div style="font-size: 13px; font-weight: 600; color: ${this.opportunityScore?.insider >= 50 ? '#22c55e' : '#ef4444'}">${this.opportunityScore?.insider || 0}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Compliance Details -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="compliance">
                    <span class="sniper-section-title">🛡️ Compliance Details</span>
                    <span class="sniper-section-toggle">▼</span>
                </div>
                <div class="sniper-section-body" data-section="compliance">
                    <div class="sniper-card">
                        <div class="sniper-stat-row">
                            <span class="sniper-stat-label">Methodology</span>
                            <span class="sniper-stat-value">${compliance.methodology || 'AAOIFI'}</span>
                        </div>
                        <div class="sniper-stat-row">
                            <span class="sniper-stat-label">Last Updated</span>
                            <span class="sniper-stat-value">${compliance.lastUpdated || 'Unknown'}</span>
                        </div>
                        ${data.businessBreakdown?.halalPercent !== null ? `
                        <div class="sniper-stat-row">
                            <span class="sniper-stat-label">Halal Revenue</span>
                            <span class="sniper-stat-value" style="color: #22c55e">${data.businessBreakdown.halalPercent}%</span>
                        </div>
                        ` : ''}
                        ${data.businessBreakdown?.notHalalPercent !== null ? `
                        <div class="sniper-stat-row">
                            <span class="sniper-stat-label">Haram Revenue</span>
                            <span class="sniper-stat-value" style="color: #ef4444">${data.businessBreakdown.notHalalPercent}%</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>

            <!-- Insider Signals -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="insider">
                    <span class="sniper-section-title">⚡ Insider Signals</span>
                    <span class="sniper-section-toggle">▼</span>
                </div>
                <div class="sniper-section-body" data-section="insider">
                    ${this.renderInsiderSection()}
                </div>
            </div>

            <!-- AI Analysis -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="ai">
                    <span class="sniper-section-title">🤖 AI Analysis</span>
                    <span class="sniper-section-toggle">▼</span>
                </div>
                <div class="sniper-section-body" data-section="ai">
                    ${this.renderAISection()}
                </div>
            </div>

            <!-- Quick Links -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="links">
                    <span class="sniper-section-title">Quick Links</span>
                    <span class="sniper-section-toggle">▼</span>
                </div>
                <div class="sniper-section-body" data-section="links">
                    <div class="sniper-link-row">
                        <a class="sniper-link-btn" href="http://openinsider.com/${ticker}" target="_blank">OpenInsider</a>
                        <a class="sniper-link-btn" href="https://zoya.finance/stocks/${ticker}" target="_blank">Zoya</a>
                    </div>
                    <div class="sniper-link-row" style="margin-top: 4px;">
                        <a class="sniper-link-btn" href="https://finance.yahoo.com/quote/${ticker}" target="_blank">Yahoo</a>
                        <a class="sniper-link-btn" href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=4" target="_blank">SEC</a>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        this.attachEventListeners();
    },

    /**
     * Render signal badges (matches analyzer styling)
     */
    renderSignalBadges() {
        if (!this.insiderData) return '';
        
        const { 
            buyCount = 0, 
            sellCount = 0, 
            recentActivity = 0,
            hasWhale = false,
            hasExecutive = false,
            hasCluster = false
        } = this.insiderData;
        
        let badges = '';
        if (hasCluster || buyCount >= 3) badges += `<span class="sniper-badge cluster">🔥 Cluster Buying</span>`;
        if (hasWhale) badges += `<span class="sniper-badge whale">🐋 Whale Activity</span>`;
        if (hasExecutive) badges += `<span class="sniper-badge exec">👔 Executive Buys</span>`;
        if (buyCount > sellCount * 2) badges += `<span class="sniper-badge new">📈 Buy Streak</span>`;
        
        if (!badges) return '';
        return `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;">${badges}</div>`;
    },

    /**
     * Render the insider section
     */
    renderInsiderSection() {
        if (!this.insiderData) {
            const isHaram = this.currentData?.data?.compliance?.status === 'NOT_HALAL';
            const message = isHaram 
                ? 'Skipped for haram stock' 
                : 'No insider data available';
            
            return `
                <div class="sniper-empty-state">
                    <div style="color: ${isHaram ? '#f87171' : '#71717a'};">${message}</div>
                    <button class="sniper-btn sniper-btn-secondary sniper-btn-sm" id="sniper-fetch-insider" style="margin-top: 8px; width: auto; padding: 6px 12px;">
                        🔄 Fetch Data
                    </button>
                </div>
            `;
        }

        const { 
            totalBuy = 0, 
            totalSell = 0, 
            buyCount = 0, 
            sellCount = 0,
            recentTrades = []
        } = this.insiderData;

        const net = totalBuy - totalSell;
        const formatMoney = (n) => {
            if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
            if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
            return '$' + n.toFixed(0);
        };

        // Signal badges first (matches analyzer)
        const badgesHtml = this.renderSignalBadges();

        // Compact stats row (matches analyzer)
        const statsHtml = `
            <div style="display: flex; gap: 4px; margin-top: 10px;">
                <div style="flex: 1; text-align: center; padding: 6px; background: #18181b; border-radius: 4px; border: 1px solid #27272a;">
                    <div style="font-size: 9px; color: #71717a;">Net Flow</div>
                    <div style="font-size: 12px; font-weight: 600; color: ${net >= 0 ? '#22c55e' : '#ef4444'}">${net >= 0 ? '+' : ''}${formatMoney(net)}</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 6px; background: #18181b; border-radius: 4px; border: 1px solid #27272a;">
                    <div style="font-size: 9px; color: #71717a;">Buyers</div>
                    <div style="font-size: 12px; font-weight: 600; color: #22c55e;">${buyCount}</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 6px; background: #18181b; border-radius: 4px; border: 1px solid #27272a;">
                    <div style="font-size: 9px; color: #71717a;">Sellers</div>
                    <div style="font-size: 12px; font-weight: 600; color: #ef4444;">${sellCount}</div>
                </div>
            </div>
        `;

        // Recent trades (matches analyzer trade cards)
        let tradesHtml = '';
        if (recentTrades && recentTrades.length > 0) {
            tradesHtml = `<div style="margin-top: 8px;"><div style="font-size: 10px; font-weight: 600; color: #a1a1aa; margin-bottom: 4px;">Top Executive Buys</div>`;
            tradesHtml += recentTrades.slice(0, 3).map(t => `
                <div class="sniper-card" style="padding: 6px 8px; margin-bottom: 4px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span style="font-size: 10px; font-weight: 600; color: #e4e4e7;">${t.insiderName || 'Unknown'}</span>
                        <span style="font-size: 10px; font-weight: 700; color: ${t.type === 'buy' ? '#22c55e' : '#ef4444'};">${t.type === 'buy' ? '+' : '-'}${formatMoney(t.value)}</span>
                    </div>
                    <div style="font-size: 9px; color: #71717a;">${t.title || ''} • ${t.daysAgo || 0}d ago</div>
                </div>
            `).join('');
            tradesHtml += '</div>';
        }

        return `${badgesHtml}${statsHtml}${tradesHtml}`;
    },

    /**
     * Render the AI Analysis section (matches analyzer compact style)
     */
    renderAISection() {
        const hasQuickReport = this.cachedReports.quick && this.cachedReports.quick.analysis;
        const hasDeepReport = this.cachedReports.deep && this.cachedReports.deep.analysis;
        const hasAnyReport = hasQuickReport || hasDeepReport;

        let html = '';

        // Show cached reports if available (matches analyzer style)
        if (hasAnyReport) {
            html += '<div style="display: flex; gap: 4px; margin-bottom: 8px;">';
            
            if (hasQuickReport) {
                const quickDate = new Date(this.cachedReports.quick.timestamp);
                const quickAge = this.getTimeAgo(quickDate);
                html += `
                    <button class="sniper-btn sniper-btn-success sniper-btn-sm" id="sniper-view-quick-report" title="Saved ${quickAge}" style="flex: 1;">
                        📄 Quick Report
                    </button>
                `;
            }
            
            if (hasDeepReport) {
                const deepDate = new Date(this.cachedReports.deep.timestamp);
                const deepAge = this.getTimeAgo(deepDate);
                html += `
                    <button class="sniper-btn sniper-btn-success sniper-btn-sm" id="sniper-view-deep-report" title="Saved ${deepAge}" style="flex: 1;">
                        📋 Deep Report
                    </button>
                `;
            }
            
            html += '</div>';
        }

        // AI Mode selection (matches analyzer compact toggle)
        html += `
            <div class="sniper-ai-modes">
                <div class="sniper-ai-mode active" data-mode="quick">
                    <span style="font-size: 11px;">⚡</span> Quick
                    <div style="font-size: 8px; color: #71717a; margin-top: 1px;">Insider Only</div>
                </div>
                <div class="sniper-ai-mode" data-mode="deep">
                    <span style="font-size: 11px;">🌐</span> Deep
                    <div style="font-size: 8px; color: #71717a; margin-top: 1px;">+ Web Search</div>
                </div>
            </div>
            <div style="display: flex; gap: 4px;">
                <button class="sniper-btn sniper-btn-primary sniper-btn-sm" id="sniper-run-ai" style="flex: 1;">
                    🤖 ${hasAnyReport ? 'New Analysis' : 'Analyze'}
                </button>
                <button class="sniper-btn sniper-btn-secondary sniper-btn-sm" id="sniper-ai-settings" style="width: auto; padding: 6px 8px;">
                    ⚙️
                </button>
            </div>
        `;

        return html;
    },

    /**
     * Get human-readable time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
        
        return date.toLocaleDateString();
    },

    /**
     * Show cached report in a modal
     */
    showCachedReport(mode) {
        const report = this.cachedReports[mode];
        if (!report || !report.analysis) return;

        const data = this.currentData?.data;
        const ticker = data?.ticker || 'Unknown';
        const reportDate = new Date(report.timestamp);
        const modeLabel = mode === 'quick' ? '⚡ Quick Analysis' : '🔍 Deep Analysis';

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'sniper-report-modal';
        modal.innerHTML = `
            <div class="sniper-report-modal-content">
                <div class="sniper-report-modal-header">
                    <div class="sniper-report-modal-title">
                        ${modeLabel} - ${ticker}
                    </div>
                    <div class="sniper-report-modal-close" id="sniper-close-report">✕</div>
                </div>
                <div class="sniper-report-modal-body">
                    <div class="sniper-report-meta">
                        📅 Generated: ${reportDate.toLocaleString()}
                        ${report.dataSummary ? `<br>📊 Data: ${report.dataSummary.substring(0, 100)}...` : ''}
                    </div>
                    <div class="sniper-report-content">
                        ${this.formatReportContent(report.analysis)}
                    </div>
                </div>
                <div class="sniper-report-modal-footer">
                    <button class="sniper-btn sniper-btn-secondary sniper-btn-sm" id="sniper-copy-report">
                        📋 Copy
                    </button>
                    <button class="sniper-btn sniper-btn-primary sniper-btn-sm" id="sniper-close-report-btn">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        const closeModal = () => modal.remove();
        
        modal.querySelector('#sniper-close-report').addEventListener('click', closeModal);
        modal.querySelector('#sniper-close-report-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Copy button
        modal.querySelector('#sniper-copy-report').addEventListener('click', () => {
            navigator.clipboard.writeText(report.analysis).then(() => {
                const btn = modal.querySelector('#sniper-copy-report');
                btn.textContent = '✅ Copied!';
                setTimeout(() => btn.textContent = '📋 Copy', 2000);
            });
        });

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    },

    /**
     * Format report content with basic markdown-like rendering
     */
    formatReportContent(content) {
        if (!content) return '';
        
        return content
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Code
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            // Wrap in paragraphs
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
    },

    /**
     * Attach event listeners to rendered elements
     */
    attachEventListeners() {
        const content = document.getElementById('sniper-sidebar-content');
        
        // Collapsible sections
        if (content) {
            content.querySelectorAll('.sniper-section-header').forEach(header => {
                header.addEventListener('click', () => {
                    const section = header.getAttribute('data-section');
                    const body = content.querySelector(`.sniper-section-body[data-section="${section}"]`);
                    const toggle = header.querySelector('.sniper-section-toggle');
                    
                    if (body) {
                        body.classList.toggle('collapsed');
                        if (toggle) toggle.classList.toggle('collapsed');
                    }
                });
            });
        }

        // AI mode toggle
        const aiModes = document.querySelectorAll('.sniper-ai-mode');
        aiModes.forEach(mode => {
            mode.addEventListener('click', () => {
                aiModes.forEach(m => m.classList.remove('active'));
                mode.classList.add('active');
            });
        });

        // Run AI button
        const runAiBtn = document.getElementById('sniper-run-ai');
        if (runAiBtn) {
            runAiBtn.addEventListener('click', () => {
                this.runAIAnalysis();
            });
        }

        // AI settings button
        const aiSettingsBtn = document.getElementById('sniper-ai-settings');
        if (aiSettingsBtn) {
            aiSettingsBtn.addEventListener('click', () => {
                if (typeof SniperAI !== 'undefined' && SniperAI.showApiKeyDialog) {
                    SniperAI.showApiKeyDialog();
                }
            });
        }

        // Favorite toggle button
        const favToggleBtn = document.getElementById('sniper-fav-toggle');
        if (favToggleBtn) {
            favToggleBtn.addEventListener('click', () => {
                const ticker = this.currentData?.data?.ticker;
                if (!ticker || typeof SniperUtils === 'undefined') return;
                
                if (SniperUtils.isFavorite(ticker)) {
                    SniperUtils.removeFavorite(ticker);
                } else {
                    SniperUtils.addFavorite(ticker);
                }
                // Re-render to update button state
                this.render();
            });
        }

        // View Quick Report button
        const viewQuickBtn = document.getElementById('sniper-view-quick-report');
        if (viewQuickBtn) {
            viewQuickBtn.addEventListener('click', () => {
                this.showCachedReport('quick');
            });
        }

        // View Deep Report button
        const viewDeepBtn = document.getElementById('sniper-view-deep-report');
        if (viewDeepBtn) {
            viewDeepBtn.addEventListener('click', () => {
                this.showCachedReport('deep');
            });
        }

        // Fetch insider button
        const fetchInsiderBtn = document.getElementById('sniper-fetch-insider');
        if (fetchInsiderBtn) {
            fetchInsiderBtn.addEventListener('click', async () => {
                fetchInsiderBtn.disabled = true;
                fetchInsiderBtn.textContent = '⏳ Loading...';
                await this.fetchInsiderData(this.currentData?.data?.ticker);
                this.calculateOpportunityScore();
                this.render();
            });
        }
    },

    /**
     * Run AI analysis
     */
    runAIAnalysis() {
        const data = this.currentData?.data;
        if (!data?.ticker) return;

        const activeMode = document.querySelector('.sniper-ai-mode.active');
        const mode = activeMode?.dataset?.mode || 'quick';

        // Build insider data summary
        let insiderSummary = 'No insider data available';
        if (this.insiderData) {
            const { totalBuy = 0, totalSell = 0, buyCount = 0, sellCount = 0 } = this.insiderData;
            insiderSummary = `Total Buys: $${(totalBuy / 1e6).toFixed(2)}M (${buyCount} transactions)\n`;
            insiderSummary += `Total Sells: $${(totalSell / 1e6).toFixed(2)}M (${sellCount} transactions)\n`;
            insiderSummary += `Net Flow: $${((totalBuy - totalSell) / 1e6).toFixed(2)}M`;
        }

        // Prepare stats and signals for AI
        const stats = {
            companyName: data.name || data.ticker,
            totalBuy: this.insiderData?.totalBuy || 0,
            totalSell: this.insiderData?.totalSell || 0,
            uniqueBuyers: { size: this.insiderData?.buyCount || 0 },
            uniqueSellers: { size: this.insiderData?.sellCount || 0 },
            countBuy: this.insiderData?.buyCount || 0,
            countSell: this.insiderData?.sellCount || 0,
            isHaram: data.compliance?.status === 'NOT_HALAL'
        };

        const signals = {
            executiveBuys: [],
            whaleTrades: [],
            clusterBuying: false,
            recentActivity: 0,
            buyStreak: 0,
            reversalSignal: false,
            freshEntries: []
        };

        // Check if SniperAI is available
        if (typeof SniperAI !== 'undefined' && SniperAI.showAnalysisPopup) {
            SniperAI.showAnalysisPopup(
                data.ticker,
                data.name || data.ticker,
                insiderSummary,
                stats,
                signals,
                mode,
                null
            );

            // Watch for popup close to refresh cached reports
            this.watchForPopupClose(data.ticker);
        } else {
            alert('AI module not available. Please check extension configuration.');
        }
    },

    /**
     * Watch for the AI popup to close and refresh cached reports
     */
    watchForPopupClose(ticker) {
        const checkInterval = setInterval(async () => {
            const popup = document.getElementById('sniper-ai-popup');
            const backdrop = document.getElementById('sniper-ai-backdrop');
            
            // If both popup and backdrop are gone, the popup has closed
            if (!popup && !backdrop) {
                clearInterval(checkInterval);
                
                // Refresh cached reports
                await this.checkCachedReports(ticker);
                
                // Re-render the AI section
                this.render();
                
                console.log('🎯 Refreshed cached reports after AI popup close');
            }
        }, 500);

        // Safety timeout - stop checking after 10 minutes
        setTimeout(() => clearInterval(checkInterval), 600000);
    },

    /**
     * Show error message
     */
    showError(message) {
        const content = document.getElementById('sniper-sidebar-content');
        if (content) {
            content.innerHTML = `
                <div class="sniper-empty-state" style="color: #ef4444;">
                    <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                    <div>${message}</div>
                </div>
            `;
        }
    }
};

// Make available globally
window.MusaffaSidebar = MusaffaSidebar;

