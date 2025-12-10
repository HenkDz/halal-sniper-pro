// =========================================================================
// 🎯 HALAL SNIPER PRO - Main Entry Point
// Version 1.9 - Modular Architecture & IndexedDB Storage
// =========================================================================

(function () {
    'use strict';

    console.log("🎯 Halal Sniper Pro v1.9 - Modular Edition");

    // Wait for all modules to load
    const waitForModules = () => {
        const requiredModules = ['SniperStorage', 'SniperUtils', 'SniperMusaffa', 'SniperAI', 'SniperScreener', 'SniperStockAnalyzer'];
        const missing = requiredModules.filter(m => !window[m]);

        if (missing.length > 0) {
            console.log("⏳ Waiting for modules:", missing.join(', '));
            setTimeout(waitForModules, 100);
            return;
        }

        console.log("✅ All modules loaded, initializing...");
        init();
    };

    async function init() {
        // Initialize Storage first
        try {
            await window.SniperUtils.init();
        } catch (err) {
            console.error("❌ Failed to initialize storage:", err);
        }

        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        console.log("📍 Current path:", path);

        // Check if it's a single stock page first
        // e.g., /screener?s=NRDY or /AAPL or /?q=MSFT
        // Only count as ticker if param exists AND has a non-empty value
        const hasTicker = !!params.get('s') || !!params.get('q');
        const isStockPage = hasTicker || (
            path.length > 1 && 
            path.length < 12 && 
            !path.includes('screener') &&
            !path.includes('top') &&
            !path.includes('latest') &&
            !path.includes('insider-') &&
            !path.includes('significant') &&
            !path.includes('penny') &&
            !path.includes('hot') &&
            !path.includes('microcap')
        );

        // Check if it's a screener page (no ticker param)
        const isScreener = !isStockPage && (
            path.includes('screener') ||
            path === '/' ||
            path.includes('top') ||
            path.includes('latest') ||
            path.includes('insider-') ||
            path.includes('significant') ||
            path.includes('penny') ||
            path.includes('hot') ||
            path.includes('microcap')
        );

        if (isStockPage) {
            // Extract ticker: prioritize params (s, q) over path
            const ticker = params.get('s')?.toUpperCase() ||
                params.get('q')?.toUpperCase() ||
                path.replace('/', '').toUpperCase();
            console.log("🔬 Loading Stock Analyzer for:", ticker);
            SniperStockAnalyzer.init(ticker);
        } else {
            console.log("📊 Loading Screener Module");
            SniperScreener.init();
        }
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForModules);
    } else {
        waitForModules();
    }
})();
