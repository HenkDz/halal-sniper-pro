// =========================================================================
// 🕵️ SCREENER MODULE - Main screener page functionality
// Premium Zinc Theme - Matches Analyzer/Musaffa Sidebar design
// =========================================================================

const SniperScreener = {
    sidebarEl: null,
    toggleEl: null,
    isOpen: true,
    state: {
        threshold: SniperUtils.DEFAULT_THRESHOLD,
        filters: { hideHaram: true, hideDoubtful: false, hideUnknown: false, onlyGold: false, onlyCluster: false },
        viewMode: 'chronological', // 'chronological' | 'grouped'
        expandedTickers: {} // Track which ticker groups are expanded inline
    },

    init() {
        console.log("🎯 Sniper Pro: Screener Mode");

        // Load settings from storage
        const saved = SniperStorage.getSetting('sniper_screener_config');
        if (saved) {
            const { aiCache: _aiCache, expandedTickers: _expandedTickers, ...rest } = saved;
            this.state = { ...this.state, ...rest };
        }

        // Always reset caches on init
        this.state.aiCache = {};
        this.state.expandedTickers = {};

        this.injectStyles();
        this.createSidebar();
        this.createToggle();
        this.renderContent();
        
        setInterval(() => this.refresh(), 2000);
    },

    /**
     * Inject CSS styles (Premium Zinc Theme - Enhanced)
     */
    injectStyles() {
        if (document.getElementById('sniper-screener-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'sniper-screener-styles';
        styles.textContent = `
            /* Screener Sidebar - Premium Zinc Theme (Enhanced) */
            #sniper-screener-sidebar {
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

            #sniper-screener-sidebar.collapsed {
                transform: translateX(100%);
            }

            #sniper-screener-toggle {
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

            #sniper-screener-toggle:hover {
                background: #18181b;
                color: #e4e4e7;
                width: 36px;
            }

            #sniper-screener-toggle.open {
                right: 320px;
                width: 32px;
                background: #09090b;
            }

            .sniper-screener-header {
                padding: 14px 16px;
                border-bottom: 1px solid #27272a;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .sniper-screener-title {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .sniper-screener-title h2 {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                color: #fff;
                letter-spacing: -0.3px;
            }

            .sniper-screener-title span {
                font-size: 11px;
                color: #52525b;
                font-weight: 500;
            }

            .sniper-header-actions {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .sniper-settings-btn {
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                cursor: pointer;
                color: #71717a;
                font-size: 14px;
                transition: all 0.2s;
                background: transparent;
                border: 1px solid #3f3f46;
            }

            .sniper-settings-btn:hover {
                background: #27272a;
                color: #e4e4e7;
                border-color: #52525b;
            }

            .sniper-screener-close {
                width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 6px;
                cursor: pointer;
                color: #52525b;
                font-size: 14px;
                transition: all 0.2s;
            }

            .sniper-screener-close:hover {
                background: #18181b;
                color: #e4e4e7;
            }

            .sniper-screener-content {
                flex: 1;
                overflow-y: auto;
                padding: 14px 16px;
            }

            /* Section Styles */
            .sniper-section {
                margin-bottom: 14px;
            }

            .sniper-section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                padding: 4px 0;
            }

            .sniper-section-title {
                font-size: 11px;
                font-weight: 600;
                color: #71717a;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .sniper-section-toggle {
                font-size: 10px;
                color: #52525b;
                transition: transform 0.2s;
            }

            .sniper-section-toggle.collapsed {
                transform: rotate(-90deg);
            }

            .sniper-section-body {
                overflow: hidden;
                transition: max-height 0.3s ease;
                margin-top: 8px;
            }

            .sniper-section-body.collapsed {
                max-height: 0 !important;
                margin-top: 0;
            }

            /* Input Styles */
            .sniper-input-group {
                margin-bottom: 12px;
            }

            .sniper-input-label {
                font-size: 12px;
                color: #a1a1aa;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .sniper-input-wrapper {
                position: relative;
                display: flex;
                align-items: center;
            }

            .sniper-input-prefix {
                position: absolute;
                left: 12px;
                color: #71717a;
                font-size: 13px;
                font-weight: 500;
            }

            .sniper-input {
                width: 100%;
                background: #18181b;
                border: 1px solid #27272a;
                color: #e4e4e7;
                padding: 10px 12px;
                padding-left: 28px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }

            .sniper-input:focus {
                border-color: #3f3f46;
                background: #1f1f23;
            }

            .sniper-input::placeholder {
                color: #52525b;
            }

            /* Filter Buttons */
            .sniper-filter-btn {
                width: 100%;
                padding: 10px 12px;
                margin-bottom: 6px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border: 1px solid;
            }

            .sniper-filter-btn.active {
                color: white;
            }

            .sniper-filter-btn.inactive {
                background: transparent;
            }

            .sniper-filter-btn:hover {
                filter: brightness(1.1);
            }

            /* Button Styles */
            .sniper-btn-row {
                display: flex;
                gap: 6px;
                margin-bottom: 6px;
            }

            .sniper-btn {
                flex: 1;
                padding: 10px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                border: 1px solid #3f3f46;
                background: #27272a;
                color: #e4e4e7;
            }

            .sniper-btn:hover {
                background: #3f3f46;
            }

            .sniper-btn-primary {
                background: #2563eb;
                border-color: #2563eb;
                color: white;
            }

            .sniper-btn-primary:hover {
                background: #1d4ed8;
            }

            .sniper-btn-danger {
                background: transparent;
                border-color: #dc2626;
                color: #f87171;
            }

            .sniper-btn-danger:hover {
                background: rgba(220, 38, 38, 0.1);
            }

            /* Switch */
            .sniper-switch {
                position: relative;
                display: inline-block;
                width: 36px;
                height: 20px;
                vertical-align: middle;
            }

            .sniper-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .sniper-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #3f3f46;
                transition: .2s;
                border-radius: 20px;
            }

            .sniper-slider:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
                background-color: #71717a;
                transition: .2s;
                border-radius: 50%;
            }

            input:checked + .sniper-slider {
                background-color: #22c55e;
            }

            input:checked + .sniper-slider:before {
                transform: translateX(16px);
                background-color: white;
            }

            /* Favorites */
            .sniper-fav-container {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            .sniper-fav-pill {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: #18181b;
                color: #d4d4d8;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
                border: 1px solid #3f3f46;
                cursor: pointer;
                transition: all 0.2s;
            }

            .sniper-fav-pill:hover {
                background: #27272a;
                border-color: #52525b;
            }

            .sniper-fav-remove {
                color: #71717a;
                font-weight: bold;
                margin-left: 2px;
                font-size: 12px;
            }

            .sniper-fav-remove:hover {
                color: #ef4444;
            }

            .sniper-empty-state {
                text-align: center;
                padding: 12px;
                color: #52525b;
                font-size: 12px;
            }

            .sniper-version {
                font-size: 10px;
                color: #3f3f46;
                text-align: center;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #1f1f23;
            }

            /* View Mode Toggle */
            .sniper-view-toggle {
                display: flex;
                background: #18181b;
                border-radius: 6px;
                padding: 3px;
                margin-bottom: 12px;
                border: 1px solid #27272a;
            }

            .sniper-view-btn {
                flex: 1;
                padding: 8px 10px;
                border: none;
                background: transparent;
                color: #71717a;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }

            .sniper-view-btn:hover {
                color: #a1a1aa;
            }

            .sniper-view-btn.active {
                background: #27272a;
                color: #e4e4e7;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }

            /* Grouped View Styles */
            .sniper-group-header {
                background: linear-gradient(135deg, #18181b, #1f1f23) !important;
                border: 1px solid #27272a;
                cursor: pointer;
                transition: all 0.2s;
            }

            .sniper-group-header:hover {
                background: linear-gradient(135deg, #1f1f23, #27272a) !important;
            }

            .sniper-group-header td {
                padding: 10px 12px !important;
                border-bottom: 1px solid #27272a;
            }

            .sniper-group-title {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .sniper-group-ticker {
                font-size: 14px;
                font-weight: 700;
                color: #e4e4e7;
            }

            .sniper-group-company {
                font-size: 12px;
                color: #71717a;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .sniper-group-stats {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-left: auto;
            }

            .sniper-group-count {
                background: #3b82f6;
                color: white;
                font-size: 10px;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 10px;
            }

            .sniper-group-chevron {
                color: #52525b;
                font-size: 12px;
                transition: transform 0.2s;
            }

            .sniper-group-header.expanded .sniper-group-chevron {
                transform: rotate(180deg);
            }

            tr.sniper-group-row {
                display: none;
            }

            tr.sniper-group-row.visible {
                display: table-row;
            }

            tr.sniper-group-row td:first-child {
                border-left: 3px solid #3b82f6 !important;
            }

            /* Fix link visibility in colored rows */
            table.tinytable tbody tr[style*="background"] a,
            table.tinytable tbody tr[style*="background"] a:visited {
                color: inherit !important;
                text-decoration: underline;
            }

            /* Specifically for green halal rows */
            tr[style*="#052e16"] a,
            tr[style*="#052e16"] a:visited,
            tr[style*="rgb(5, 46, 22)"] a {
                color: #86efac !important;
            }

            /* For light green rows */
            tr[style*="#e8f5e9"] a,
            tr[style*="rgb(232, 245, 233)"] a {
                color: #166534 !important;
            }

            /* For yellow whale rows */
            tr[style*="#fef9c3"] a,
            tr[style*="rgb(254, 249, 195)"] a,
            tr[style*="#fff9c4"] a {
                color: #92400e !important;
            }

            /* For red haram rows */
            tr[style*="#2c0505"] a,
            tr[style*="rgb(44, 5, 5)"] a {
                color: #fca5a5 !important;
            }

            /* For orange doubtful rows */
            tr[style*="#431407"] a,
            tr[style*="rgb(67, 20, 7)"] a {
                color: #fdba74 !important;
            }

            /* For gray unknown rows */
            tr[style*="#1f1f23"] a,
            tr[style*="rgb(31, 31, 35)"] a {
                color: #a1a1aa !important;
            }
        `;

        document.head.appendChild(styles);
    },

    /**
     * Create sidebar element
     */
    createSidebar() {
        if (document.getElementById('sniper-screener-sidebar')) return;

        const sidebar = document.createElement('div');
        sidebar.id = 'sniper-screener-sidebar';
        sidebar.innerHTML = `
            <div class="sniper-screener-header">
                <div class="sniper-screener-title">
                    <h2>🎯 Screener</h2>
                    <span>v2.0</span>
                </div>
                <div class="sniper-header-actions">
                    <label class="sniper-switch" title="Enable/Disable Sniper">
                        <input type="checkbox" id="sniper-enabled-toggle" ${SniperUtils.getEnabled() ? 'checked' : ''}>
                        <span class="sniper-slider"></span>
                    </label>
                    <button class="sniper-settings-btn" id="sniper-settings-btn" title="AI Settings">⚙️</button>
                    <div class="sniper-screener-close" id="sniper-screener-close" title="Close Sidebar">✕</div>
                </div>
            </div>
            <div class="sniper-screener-content" id="sniper-screener-content">
            </div>
        `;

        document.body.appendChild(sidebar);
        this.sidebarEl = sidebar;

        // Close button
        document.getElementById('sniper-screener-close').addEventListener('click', () => {
            this.toggle();
        });

        // Enable/disable toggle
        document.getElementById('sniper-enabled-toggle').addEventListener('change', (e) => {
            SniperUtils.setEnabled(e.target.checked);
            this.refresh();
        });

        // Settings button - opens AI settings dialog
        document.getElementById('sniper-settings-btn').addEventListener('click', () => {
            if (typeof SniperAI !== 'undefined' && SniperAI.showApiKeyDialog) {
                SniperAI.showApiKeyDialog();
            } else {
                alert('AI module not available');
            }
        });
    },

    /**
     * Create toggle button
     */
    createToggle() {
        if (document.getElementById('sniper-screener-toggle')) return;

        const toggle = document.createElement('div');
        toggle.id = 'sniper-screener-toggle';
        toggle.className = 'open';
        toggle.innerHTML = '🎯';
        toggle.title = 'Toggle Screener';

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
     * Render sidebar content
     */
    renderContent() {
        const content = document.getElementById('sniper-screener-content');
        if (!content) return;

        const formatThreshold = (val) => {
            if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
            if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
            return val.toString();
        };

        content.innerHTML = `
            <!-- View Mode Toggle -->
            <div class="sniper-view-toggle">
                <button class="sniper-view-btn ${this.state.viewMode === 'chronological' ? 'active' : ''}" data-view="chronological">
                    📅 Timeline
                </button>
                <button class="sniper-view-btn ${this.state.viewMode === 'grouped' ? 'active' : ''}" data-view="grouped">
                    📊 Grouped
                </button>
            </div>

            <!-- Whale Threshold -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="threshold">
                    <span class="sniper-section-title">🐋 Whale Detection</span>
                    <span class="sniper-section-toggle">▼</span>
                </div>
                <div class="sniper-section-body" data-section="threshold">
                    <div class="sniper-input-group">
                        <label class="sniper-input-label">
                            Minimum Trade Value
                            <span style="color: #facc15; font-weight: 600;">${formatThreshold(this.state.threshold)}</span>
                        </label>
                        <div class="sniper-input-wrapper">
                            <span class="sniper-input-prefix">$</span>
                            <input type="number" class="sniper-input" id="sniper-threshold" 
                                   value="${this.state.threshold}" step="50000" min="0" placeholder="100000">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="filters">
                    <span class="sniper-section-title">🎚️ Filters</span>
                    <span class="sniper-section-toggle">▼</span>
                </div>
                <div class="sniper-section-body" data-section="filters">
                    <button class="sniper-filter-btn" id="filter-hideHaram" 
                            style="border-color: #dc2626; ${this.state.filters.hideHaram ? 'background: #dc2626; color: white;' : 'color: #f87171;'}">
                        <span>🚫 Hide Haram</span>
                        <span>${this.state.filters.hideHaram ? '✓' : ''}</span>
                    </button>
                    <button class="sniper-filter-btn" id="filter-onlyGold" 
                            style="border-color: #f59e0b; ${this.state.filters.onlyGold ? 'background: #f59e0b; color: white;' : 'color: #fbbf24;'}">
                        <span>🏆 Gold Whales Only</span>
                        <span>${this.state.filters.onlyGold ? '✓' : ''}</span>
                    </button>
                    <button class="sniper-filter-btn" id="filter-onlyCluster" 
                            style="border-color: #ea580c; ${this.state.filters.onlyCluster ? 'background: #ea580c; color: white;' : 'color: #fb923c;'}">
                        <span>🔥 Clusters Only</span>
                        <span>${this.state.filters.onlyCluster ? '✓' : ''}</span>
                    </button>
                    <div style="display: flex; gap: 6px; margin-top: 2px;">
                        <button class="sniper-filter-btn" id="filter-hideDoubtful" 
                                style="flex: 1; margin-bottom: 0; border-color: #f97316; ${this.state.filters.hideDoubtful ? 'background: #f97316; color: white;' : 'color: #fb923c;'}">
                            <span>⚠️ D</span>
                            <span>${this.state.filters.hideDoubtful ? '✓' : ''}</span>
                        </button>
                        <button class="sniper-filter-btn" id="filter-hideUnknown" 
                                style="flex: 1; margin-bottom: 0; border-color: #71717a; ${this.state.filters.hideUnknown ? 'background: #71717a; color: white;' : 'color: #a1a1aa;'}">
                            <span>❓ U</span>
                            <span>${this.state.filters.hideUnknown ? '✓' : ''}</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Favorites -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="favorites">
                    <span class="sniper-section-title">⭐ Saved Tickers</span>
                    <span class="sniper-section-toggle collapsed">▼</span>
                </div>
                <div class="sniper-section-body collapsed" data-section="favorites">
                    <div id="fav-pill-wrap" class="sniper-fav-container">
                        ${this.renderFavorites()}
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="actions">
                    <span class="sniper-section-title">⚡ Quick Actions</span>
                    <span class="sniper-section-toggle collapsed">▼</span>
                </div>
                <div class="sniper-section-body collapsed" data-section="actions">
                    <div class="sniper-btn-row">
                        <button class="sniper-btn" id="btn-copy">📋 Copy Visible</button>
                        <button class="sniper-btn sniper-btn-danger" id="btn-reset">🗑️ Clear Blocks</button>
                    </div>
                </div>
            </div>

            <!-- Data Management -->
            <div class="sniper-section">
                <div class="sniper-section-header" data-section="data">
                    <span class="sniper-section-title">💾 Data Management</span>
                    <span class="sniper-section-toggle collapsed">▼</span>
                </div>
                <div class="sniper-section-body collapsed" data-section="data">
                    <div class="sniper-btn-row">
                        <button class="sniper-btn sniper-btn-primary" id="btn-export">💾 Export</button>
                        <button class="sniper-btn" id="btn-import">📂 Import</button>
                    </div>
                    <input type="file" id="file-import" accept=".json" style="display: none;">
                </div>
            </div>

            <div class="sniper-version">Halal Sniper Pro v2.0</div>
        `;

        this.attachEventListeners();
    },

    /**
     * Render favorites pills
     */
    renderFavorites() {
        const favorites = SniperUtils.getFavorites();
        if (favorites.length === 0) {
            return '<div class="sniper-empty-state">No saved tickers. Click ☆ on stock pages to add.</div>';
        }
        return favorites.map(f => 
            `<span class="sniper-fav-pill" data-ticker="${f}">
                ${f}
                <span class="sniper-fav-remove" data-ticker="${f}">×</span>
            </span>`
        ).join('');
    },

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const content = document.getElementById('sniper-screener-content');
        
        // View mode toggle
        content.querySelectorAll('.sniper-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newMode = btn.getAttribute('data-view');
                if (this.state.viewMode !== newMode) {
                    this.state.viewMode = newMode;
                    this.state.expandedTickers = {}; // Reset expansions on mode change
                    this.saveState();
                    this.renderContent();
                    this.refresh();
                }
            });
        });
        
        // Collapsible sections
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

        // Threshold input
        const thresholdInput = document.getElementById('sniper-threshold');
        if (thresholdInput) {
            thresholdInput.addEventListener('change', (e) => {
                this.state.threshold = parseInt(e.target.value) || 0;
                this.saveState();
                this.renderContent();
                this.refresh();
            });
        }

        // Filter toggles
        ['hideHaram', 'hideDoubtful', 'hideUnknown', 'onlyGold', 'onlyCluster'].forEach(key => {
            const btn = document.getElementById(`filter-${key}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.state.filters[key] = !this.state.filters[key];
                    this.saveState();
                    this.renderContent();
                    this.refresh();
                });
            }
        });

        // Favorites pills click handling
        const favWrap = document.getElementById('fav-pill-wrap');
        if (favWrap) {
            favWrap.addEventListener('click', (e) => {
                const removeNode = e.target.closest('.sniper-fav-remove');
                if (removeNode) {
                    e.stopPropagation();
                    const ticker = removeNode.getAttribute('data-ticker');
                    SniperUtils.removeFavorite(ticker);
                    this.renderContent();
                    return;
                }
                const pill = e.target.closest('.sniper-fav-pill');
                if (pill) {
                    const ticker = pill.getAttribute('data-ticker');
                    if (ticker) window.open(`http://openinsider.com/${ticker}`, '_blank');
                }
            });
        }

        // Copy button
        document.getElementById('btn-copy')?.addEventListener('click', () => {
            this.copyVisibleTable();
        });

        // Reset button
        document.getElementById('btn-reset')?.addEventListener('click', async () => {
            if (confirm('Clear all blocked tickers? This will remove your manually blocked stocks.')) {
                await SniperStorage.setSetting('sniper_haram_list', []);
                location.reload();
            }
        });

        // Export button
        document.getElementById('btn-export')?.addEventListener('click', async () => {
            try {
                const json = await SniperStorage.exportData();
                JSON.parse(json); // Validate
                const blob = new Blob([json], { type: "application/json;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const filename = `halal_sniper_backup_${new Date().toISOString().slice(0, 10)}.json`;
                
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            } catch (error) {
                console.error("Export failed:", error);
                alert("Failed to export: " + error.message);
            }
        });

        // Import button
        const fileInput = document.getElementById('file-import');
        document.getElementById('btn-import')?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const result = await SniperStorage.importData(ev.target.result);
                if (result.success) {
                    alert(`Imported! +${result.added || 0} new, ${result.overwritten || 0} updated`);
                    location.reload();
                } else {
                    alert('Import failed: ' + (result.error || 'Unknown error'));
                }
            };
            reader.readAsText(file);
        });
    },

    saveState() {
        // Don't save aiCache or expandedTickers (session-only)
        const { aiCache: _aiCache, expandedTickers: _expandedTickers, ...toSave } = this.state;
        SniperStorage.setSetting('sniper_screener_config', toSave);
    },

    refresh() {
        // Clear previous modifications
        document.querySelectorAll('.sniper-tag, .action-group, .sniper-group-header').forEach(e => e.remove());
        document.querySelectorAll('tr').forEach(r => { 
            r.style.display = ''; 
            r.style.background = ''; 
            r.style.color = '';
            r.classList.remove('sniper-group-row', 'visible');
            delete r.dataset.sniperTicker;
            delete r.dataset.sniperFiltered;
        });

        if (!SniperUtils.getEnabled()) return;
        this.runLogic();
    },

    runLogic() {
        if (!this.state.aiCache) this.state.aiCache = {};
        if (!this.state.expandedTickers) this.state.expandedTickers = {};

        const cols = this.getColumnIndices();
        const rows = document.querySelectorAll('table.tinytable tbody tr');
        const userBlacklist = SniperUtils.getBlacklist();

        // Remove any previously added group headers
        document.querySelectorAll('.sniper-group-header').forEach(el => el.remove());

        // Cluster Count & Group Tracking
        const counts = {};
        const tickerRows = {}; // Track all rows per ticker
        const tickerFirstSeen = {}; // Track first row index for each ticker
        
        rows.forEach((r, idx) => {
            const t = (r.cells[cols.ticker]?.innerText.trim() || "").toUpperCase();
            const type = r.cells[cols.tradeType]?.innerText;
            if (t) {
                if (!tickerRows[t]) tickerRows[t] = [];
                tickerRows[t].push({ row: r, index: idx });
                if (tickerFirstSeen[t] === undefined) tickerFirstSeen[t] = idx;
            }
            if (t && type && type.includes("Purchase")) counts[t] = (counts[t] || 0) + 1;
        });

        rows.forEach(row => {
            if (row.cells.length < 5) return;

            const ticker = (row.cells[cols.ticker]?.innerText.trim() || "").toUpperCase();
            const company = row.cells[cols.company]?.innerText || "";
            const type = row.cells[cols.tradeType]?.innerText || "";
            const val = parseInt(row.cells[cols.value]?.innerText.replace(/[^0-9]/g, '') || 0);
            const ind = cols.industry > -1 ? row.cells[cols.industry]?.innerText : "";

            // AI Data Fetching
            if (ticker && this.state.aiCache[ticker] === undefined) {
                this.state.aiCache[ticker] = 'pending';
                Promise.all([
                    SniperStorage.getAIHistory(ticker, 'quick'),
                    SniperStorage.getAIHistory(ticker, 'deep')
                ]).then(([quickReport, deepReport]) => {
                    let report = null;
                    if (deepReport) {
                        report = deepReport;
                        report.mode = report.mode || 'deep';
                    } else if (quickReport) {
                        report = quickReport;
                        report.mode = report.mode || 'quick';
                    }
                    
                    this.state.aiCache[ticker] = report || null;
                    if (report) {
                        row.dataset.hasAi = "true";
                        this.runLogic();
                    } else {
                        this.state.aiCache[ticker] = "none";
                    }
                });
            }

            let isHaram = false;
            let isHalal = false;
            let isDoubtful = false;
            let isUnknown = false;
            let reason = "";
            let halalGrade = null;
            
            const cachedHalalData = SniperStorage.getHalal(ticker);
            const cachedHalalStatus = cachedHalalData?.status || null;
            
            if (cachedHalalStatus === 'NOT_HALAL') {
                isHaram = true;
                reason = "Not Halal";
            } else if (cachedHalalStatus === 'HALAL') {
                isHalal = true;
                halalGrade = cachedHalalData?.grade || null;
            } else if (cachedHalalStatus === 'DOUBTFUL') {
                isDoubtful = true;
                halalGrade = cachedHalalData?.grade || null;
            } else if (ticker && userBlacklist.includes(ticker)) {
                isHaram = true;
                reason = "Blacklist";
            } else if (SniperUtils.HARAM_KEYWORDS.some(k => company.includes(k))) {
                isHaram = true;
                reason = "Keyword";
            } else if (ind && SniperUtils.HARAM_INDUSTRIES.some(i => ind.includes(i))) {
                isHaram = true;
                reason = "Industry";
            } else if (!cachedHalalStatus || cachedHalalStatus === 'UNKNOWN') {
                isUnknown = true;
            }

            const isWhale = (val >= this.state.threshold);
            const isPurchase = type.includes("Purchase");
            const isCluster = counts[ticker] > 1;

            // Visual styling
            if (isHaram) {
                row.style.backgroundColor = "#2c0505";
                row.style.color = "#ffcccc";
                // Fix link colors in haram rows
                row.querySelectorAll('a').forEach(a => { a.style.color = '#fca5a5'; });
                if (row.cells[cols.company] && !row.innerHTML.includes('HARAM')) {
                    row.cells[cols.company].innerHTML += ` <span class="sniper-tag" style="font-size:9px; background:#dc2626; color:white; padding:2px 4px; border-radius:3px;">${reason}</span>`;
                }
            } else if (isDoubtful) {
                // Orange styling for doubtful stocks
                row.style.backgroundColor = "#431407";
                row.style.color = "#fed7aa";
                // Fix link colors in doubtful rows
                row.querySelectorAll('a').forEach(a => { a.style.color = '#fdba74'; });
                if (row.cells[cols.company] && !row.innerHTML.includes('DOUBTFUL')) {
                    const gradeText = halalGrade ? ` ${halalGrade}` : '';
                    row.cells[cols.company].innerHTML += ` <span class="sniper-tag" style="font-size:9px; background:#f97316; color:white; padding:2px 4px; border-radius:3px; font-weight:600;">D${gradeText}</span>`;
                }
                if (isPurchase && isWhale) {
                    row.cells[0].style.borderLeft = "4px solid #f97316";
                    if (row.cells[cols.value]) {
                        row.cells[cols.value].style.fontWeight = 'bold';
                        row.cells[cols.value].style.color = '#fb923c';
                    }
                }
                if (isCluster && !row.innerHTML.includes('Cluster')) {
                    row.cells[cols.company].innerHTML += ` <span class="sniper-tag" style="background:#ea580c; color:white; font-size:9px; padding:2px 4px; border-radius:3px;">🔥${counts[ticker]}</span>`;
                }
            } else if (isUnknown) {
                // Gray styling for unknown stocks
                row.style.backgroundColor = "#1f1f23";
                row.style.color = "#d4d4d8";
                // Fix link colors in unknown rows
                row.querySelectorAll('a').forEach(a => { a.style.color = '#a1a1aa'; });
                if (row.cells[cols.company] && !row.innerHTML.includes('UNKNOWN')) {
                    row.cells[cols.company].innerHTML += ` <span class="sniper-tag" style="font-size:9px; background:#71717a; color:white; padding:2px 4px; border-radius:3px; font-weight:600;">U</span>`;
                }
                if (isPurchase && isWhale) {
                    row.cells[0].style.borderLeft = "4px solid #71717a";
                    if (row.cells[cols.value]) {
                        row.cells[cols.value].style.fontWeight = 'bold';
                        row.cells[cols.value].style.color = '#a1a1aa';
                    }
                }
                if (isCluster && !row.innerHTML.includes('Cluster')) {
                    row.cells[cols.company].innerHTML += ` <span class="sniper-tag" style="background:#52525b; color:white; font-size:9px; padding:2px 4px; border-radius:3px;">🔥${counts[ticker]}</span>`;
                }
            } else if (isHalal && !row.innerHTML.includes('HALAL')) {
                const gradeText = halalGrade ? ` ${halalGrade}` : '';
                const gradeColor = halalGrade && ['A+', 'A', 'B'].includes(halalGrade) ? '#22c55e' : '#4ade80';
                if (row.cells[cols.company]) {
                    row.cells[cols.company].innerHTML += ` <span class="sniper-tag" style="font-size:9px; background:${gradeColor}; color:#052e16; padding:2px 4px; border-radius:3px; font-weight:600;">✓${gradeText}</span>`;
                }
                if (isPurchase) {
                    row.style.backgroundColor = "#052e16";
                    row.style.color = "#bbf7d0";
                    // Fix link colors in dark green halal rows - use bright green
                    row.querySelectorAll('a').forEach(a => { a.style.color = '#86efac'; });
                    if (isWhale) {
                        row.cells[0].style.borderLeft = "4px solid #22c55e";
                        if (row.cells[cols.value]) {
                            row.cells[cols.value].style.fontWeight = 'bold';
                            row.cells[cols.value].style.color = '#4ade80';
                        }
                    }
                    if (isCluster && !row.innerHTML.includes('Cluster')) {
                        row.cells[cols.company].innerHTML += ` <span class="sniper-tag" style="background:#16a34a; color:white; font-size:9px; padding:2px 4px; border-radius:3px;">🔥${counts[ticker]}</span>`;
                    }
                }
            } else if (!isHaram && !isDoubtful && !isUnknown && isPurchase) {
                row.style.backgroundColor = "#e8f5e9";
                // Fix link colors in light green rows - use dark green
                row.querySelectorAll('a').forEach(a => { a.style.color = '#166534'; });
                if (isWhale) {
                    row.style.backgroundColor = "#fef9c3";
                    // Fix link colors in yellow whale rows - use dark orange
                    row.querySelectorAll('a').forEach(a => { a.style.color = '#92400e'; });
                    row.cells[0].style.borderLeft = "4px solid #f59e0b";
                    if (row.cells[cols.value]) {
                        row.cells[cols.value].style.fontWeight = 'bold';
                        row.cells[cols.value].style.color = '#ea580c';
                    }
                }
                if (isCluster && !row.innerHTML.includes('Cluster')) {
                    row.cells[cols.company].innerHTML += ` <span class="sniper-tag" style="background:#ea580c; color:white; font-size:9px; padding:2px 4px; border-radius:3px;">🔥${counts[ticker]}</span>`;
                }
            }

            // AI Report Badges
            const aiData = this.state.aiCache[ticker];
            if (aiData && aiData !== 'pending' && aiData !== 'none' && !row.querySelector('.sniper-ai-badge')) {
                let label = "🤖";
                let color = "#52525b";
                let title = "Click to view report";

                if (aiData.structured) {
                    const s = aiData.structured;
                    const d = s.decision || "?";
                    const c = s.confidence || "";
                    const mode = aiData.mode || 'quick';

                    if (d.match(/Buy|Bullish/i)) color = "#22c55e";
                    else if (d.match(/Sell|Bearish/i)) color = "#dc2626";
                    else if (d.match(/Hold|Neutral/i)) color = "#f59e0b";

                    const modeIcon = mode === 'deep' ? '🌐' : '⚡';
                    label = `${modeIcon}${d.substring(0,4)}`;
                    title = `${mode === 'deep' ? 'Deep' : 'Quick'}: ${d} (${c})`;
                } else if (aiData.analysis) {
                    const md = aiData.analysis;
                    if (md.match(/Actionable Take:.*(Buy|Accumulate|Long|Strong|Bullish)/i)) color = "#22c55e";
                    else if (md.match(/Actionable Take:.*(Sell|Avoid|Short|Weak|Bearish)/i)) color = "#dc2626";
                    else if (md.match(/Actionable Take:.*(Hold|Neutral|Wait|Mixed)/i)) color = "#f59e0b";
                }

                const badge = document.createElement('span');
                badge.className = 'sniper-tag sniper-ai-badge';
                badge.innerHTML = label;
                badge.title = title;
                Object.assign(badge.style, {
                    background: color, color: 'white', fontSize: '9px', padding: '2px 4px',
                    borderRadius: '3px', marginLeft: '4px', cursor: 'pointer'
                });

                badge.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    Promise.all([
                        SniperStorage.getAIHistory(ticker, 'quick'),
                        SniperStorage.getAIHistory(ticker, 'deep')
                    ]).then(([quickReport, deepReport]) => {
                        let reportToShow = aiData;
                        let modeToShow = aiData.mode || 'quick';
                        
                        if (deepReport && quickReport) {
                            reportToShow = deepReport;
                            modeToShow = 'deep';
                        } else if (deepReport) {
                            reportToShow = deepReport;
                            modeToShow = 'deep';
                        } else if (quickReport) {
                            reportToShow = quickReport;
                            modeToShow = 'quick';
                        }
                        
                        if (!reportToShow.mode) reportToShow.mode = modeToShow;
                        
                        const mockStats = { totalBuy: 0, totalSell: 0, countBuy: 0, countSell: 0 };
                        SniperAI.showAnalysisPopup(ticker, company, reportToShow.dataSummary || aiData.dataSummary, mockStats, { whaleTrades: [] }, modeToShow, reportToShow);
                    });
                };

                if (row.cells[cols.company]) {
                    row.cells[cols.company].appendChild(badge);
                }
            }

            // Action buttons
            if (row.cells[cols.ticker] && !row.querySelector('.action-group')) {
                const g = document.createElement('div');
                g.className = 'action-group';
                g.style.cssText = "display:flex; gap:2px; margin-top:2px;";

                const x = document.createElement('span');
                x.innerHTML = "✕";
                Object.assign(x.style, { 
                    cursor: 'pointer', color: '#f87171', fontWeight: 'bold', fontSize: '9px', 
                    padding: '1px 4px', background: 'rgba(220,38,38,0.2)', borderRadius: '3px' 
                });
                x.title = "Block ticker";
                x.onclick = (e) => { e.preventDefault(); this.addToBlacklist(ticker); };

                g.appendChild(this.createMiniBtn('Z', '#22c55e', `https://zoya.finance/stocks/${ticker}`, 'Zoya'));
                g.appendChild(this.createMiniBtn('M', '#a855f7', `https://musaffa.com/stock/${ticker}`, 'Musaffa'));
                g.appendChild(x);
                row.cells[cols.ticker].appendChild(g);
            }

            // Store row metadata for grouping
            row.dataset.sniperTicker = ticker;
            row.dataset.sniperFiltered = 'false';
            
            // Filter visibility (base filtering)
            let show = true;
            if (this.state.filters.hideHaram && isHaram) show = false;
            if (this.state.filters.hideDoubtful && isDoubtful) show = false;
            if (this.state.filters.hideUnknown && isUnknown) show = false;
            if (this.state.filters.onlyGold && (!isWhale || !isPurchase)) show = false;
            if (this.state.filters.onlyCluster && (!isCluster || !isPurchase)) show = false;
            
            if (!show) {
                row.dataset.sniperFiltered = 'true';
                row.style.display = 'none';
            }
        });
        
        // Apply view mode logic after all rows processed
        this.applyViewMode(tickerRows, tickerFirstSeen, cols);
    },
    
    /**
     * Apply view mode (chronological or grouped)
     */
    applyViewMode(tickerRows, tickerFirstSeen, cols) {
        if (this.state.viewMode === 'chronological') {
            // Timeline mode: just show all non-filtered rows normally (default behavior)
            // Nothing extra to do - rows are already visible/hidden based on filters
            return;
        } else if (this.state.viewMode === 'grouped') {
            this.applyGroupedView(tickerRows, cols);
        }
    },
    
    /**
     * Grouped view with collapsible sections
     */
    applyGroupedView(tickerRows, cols) {
        const tbody = document.querySelector('table.tinytable tbody');
        if (!tbody) return;
        
        // Remove existing group headers
        document.querySelectorAll('.sniper-group-header').forEach(el => el.remove());
        
        // Hide all original rows first
        const allRows = document.querySelectorAll('table.tinytable tbody tr');
        allRows.forEach(row => {
            if (!row.classList.contains('sniper-group-header')) {
                row.style.display = 'none';
                row.classList.remove('sniper-grouped-child', 'visible', 'sniper-group-row');
            }
        });
        
        // Build grouped data - only include tickers with visible rows
        const groupedData = {};
        Object.entries(tickerRows).forEach(([ticker, rows]) => {
            const visibleRows = rows.filter(r => r.row.dataset.sniperFiltered !== 'true');
            if (visibleRows.length > 0) {
                const firstRow = visibleRows[0].row;
                groupedData[ticker] = {
                    ticker,
                    company: firstRow.cells[cols.company]?.innerText?.split('\n')[0]?.trim() || '',
                    count: visibleRows.length,
                    rows: visibleRows,
                    firstRow: firstRow
                };
            }
        });
        
        // Sort groups by their first appearance (maintains chronological order of first filing)
        const sortedGroups = Object.values(groupedData).sort((a, b) => {
            return a.rows[0].index - b.rows[0].index;
        });
        
        // Create group headers and organize rows
        sortedGroups.forEach((group, groupIdx) => {
            const isExpanded = this.state.expandedTickers[group.ticker];
            
            // Create group header row
            const headerRow = document.createElement('tr');
            headerRow.className = `sniper-group-header ${isExpanded ? 'expanded' : ''}`;
            headerRow.dataset.ticker = group.ticker;
            
            // Count columns for proper colspan
            const colCount = group.firstRow.cells.length;
            
            headerRow.innerHTML = `
                <td colspan="${colCount}">
                    <div class="sniper-group-title">
                        <span class="sniper-group-ticker">${group.ticker}</span>
                        <span class="sniper-group-company">${group.company.replace(/<[^>]*>/g, '').substring(0, 40)}</span>
                        <div class="sniper-group-stats">
                            <span class="sniper-group-count">${group.count} filing${group.count > 1 ? 's' : ''}</span>
                            <span class="sniper-group-chevron">▼</span>
                        </div>
                    </div>
                </td>
            `;
            
            headerRow.addEventListener('click', () => {
                this.toggleTickerExpansion(group.ticker);
            });
            
            // Insert header before the first row of this group
            group.firstRow.parentNode.insertBefore(headerRow, group.firstRow);
            
            // Mark and show/hide group rows
            group.rows.forEach((rowData, rowIdx) => {
                const row = rowData.row;
                row.classList.add('sniper-group-row');
                
                if (isExpanded) {
                    row.classList.add('visible');
                    row.style.display = '';
                } else {
                    row.classList.remove('visible');
                    row.style.display = 'none';
                }
            });
        });
    },
    
    /**
     * Toggle ticker expansion state
     */
    toggleTickerExpansion(ticker) {
        if (!this.state.expandedTickers) this.state.expandedTickers = {};
        this.state.expandedTickers[ticker] = !this.state.expandedTickers[ticker];
        this.refresh();
    },

    getColumnIndices() {
        const headers = Array.from(document.querySelectorAll('table.tinytable thead th')).map(th => th.innerText.trim().toLowerCase());
        const find = (k, d) => { const i = headers.findIndex(h => h.includes(k)); return i > -1 ? i : d; };
        return {
            ticker: find('ticker', 3),
            company: headers.findIndex(h => h.includes('company')),
            title: find('title', 6),
            tradeType: find('trade type', 7),
            value: find('value', 12),
            industry: headers.findIndex(h => h.includes('industry'))
        };
    },

    createMiniBtn(text, color, url, tooltip) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.innerText = text;
        a.title = tooltip;
        Object.assign(a.style, {
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: '14px', height: '14px', padding: '0 3px',
            backgroundColor: color, color: 'white', fontSize: '8px',
            borderRadius: '2px', textDecoration: 'none', fontWeight: 'bold'
        });
        return a;
    },

    async addToBlacklist(ticker) {
        if (!ticker) return;
        const upperTicker = ticker.toUpperCase();
        const list = SniperUtils.getBlacklist();
        if (!list.includes(upperTicker)) {
            list.push(upperTicker);
            await SniperStorage.setSetting('sniper_haram_list', list);
            SniperUtils.setHalalCache(upperTicker, 'NOT_HALAL');
            this.refresh();
        }
    },

    copyVisibleTable() {
        let txt = "";
        document.querySelectorAll('table.tinytable tbody tr').forEach(r => {
            if (r.style.display !== 'none') txt += r.innerText.replace(/\t/g, ',') + "\n";
        });
        SniperUtils.copyToClipboard(txt, () => alert("Copied!"), (err) => alert("Failed: " + err));
    }
};

window.SniperScreener = SniperScreener;
