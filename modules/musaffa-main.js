// =========================================================================
// 🎯 MUSAFFA MAIN - Entry point for Halal Sniper Pro on Musaffa.com
// Version 2.0 - Musaffa Integration
// =========================================================================

(function () {
    'use strict';

    console.log("🎯 Halal Sniper Pro v2.0 - Musaffa Integration");

    // Wait for all modules to load
    const waitForModules = () => {
        const requiredModules = ['SniperStorage', 'SniperUtils', 'MusaffaPage', 'MusaffaSidebar'];
        const missing = requiredModules.filter(m => !window[m]);

        if (missing.length > 0) {
            console.log("⏳ Waiting for modules:", missing.join(', '));
            setTimeout(waitForModules, 100);
            return;
        }

        console.log("✅ All modules loaded, initializing Musaffa integration...");
        init();
    };

    async function init() {
        // Initialize Storage first
        try {
            if (window.SniperStorage && window.SniperStorage.init) {
                await window.SniperStorage.init();
                console.log("💾 Storage initialized successfully");
            }
        } catch (err) {
            console.error("❌ Failed to initialize storage:", err);
        }

        // Detect page type
        const pageInfo = MusaffaPage.detectPageType();
        console.log("📍 Page type detected:", pageInfo);

        // Handle different page types
        switch (pageInfo.type) {
            case 'stock':
            case 'etf':
                console.log("🔬 Loading Sidebar for:", pageInfo.ticker);
                // Small delay to ensure page is fully rendered
                setTimeout(() => {
                    MusaffaSidebar.init();
                }, 500);
                break;

            case 'screener':
                console.log("📊 Screener page detected - future enhancement");
                // Future: Add screener enhancements
                break;

            case 'trending':
                console.log("📈 Trending page detected - future enhancement");
                break;

            case 'watchlist':
            case 'portfolio':
                console.log("📋 Watchlist/Portfolio page - future enhancement");
                break;

            default:
                console.log("🏠 Home or unsupported page type");
        }
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForModules);
    } else {
        waitForModules();
    }
})();

