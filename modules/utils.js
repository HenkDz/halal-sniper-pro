// =========================================================================
// 🛠️ UTILS MODULE - Shared utilities and storage functions
// =========================================================================

const SniperUtils = {
    // --- CONFIGURATION ---
    DEFAULT_THRESHOLD: 200000,
    BOSS_TITLES: ["CEO", "COB", "Chairman", "President", "Director"],
    HARAM_KEYWORDS: [
        "Bank", "Bancorp", "Financial", "Insurance", "Capital", "Trust", "Savings",
        "Casino", "Betting", "Gaming", "Spirit", "Beer", "Lending", "Credit", "Mortgage",
        "Cannabis", "Realty", "Entertainment", "Finance", "Interest", "Loan", "Asset",
        "Invest", "Equity", "Fund", "Holdings", "Group", "Reinsurance", "Assurance",
        "Brewery", "Distillery", "Wine", "Alcohol", "Tobacco", "Cigarette", "Vape",
        "Defense", "Weapon", "Arms", "Military", "Casino", "Gambling", "Pork",
        "Adult", "Nightclub"
    ],
    HARAM_INDUSTRIES: [
        "Banks", "Insurance", "Capital Markets", "Consumer Finance",
        "Thrifts & Mortgage Finance", "Tobacco", "Beverages - Wineries & Distilleries",
        "Beverages - Brewers", "Casinos & Gaming", "Aerospace & Defense",
        "Hotels, Restaurants & Leisure", "Entertainment"
    ],

    // --- INITIALIZATION ---
    async init() {
        console.log("🛠️ Sniper Utils: Initializing...");
        if (window.SniperStorage) {
            await SniperStorage.init();
        } else {
            console.error("❌ SniperStorage not found! Make sure imports are correct.");
        }
    },

    // --- BLACKLIST STORAGE ---
    getBlacklist() {
        const list = SniperStorage.getSetting('sniper_haram_list', []);
        // Normalize all entries to uppercase for consistent comparison
        return list.map(ticker => typeof ticker === 'string' ? ticker.toUpperCase() : ticker);
    },

    // --- FAVORITES STORAGE ---
    getFavorites() {
        return SniperStorage.getSetting('sniper_fav_list', []);
    },

    addFavorite(ticker) {
        if (!ticker) return;
        const upper = ticker.toUpperCase();
        const favs = this.getFavorites();
        if (!favs.includes(upper)) {
            favs.push(upper);
            SniperStorage.setSetting('sniper_fav_list', favs);
        }
    },

    removeFavorite(ticker) {
        if (!ticker) return;
        const upper = ticker.toUpperCase();
        const favs = this.getFavorites();
        const idx = favs.indexOf(upper);
        if (idx > -1) {
            favs.splice(idx, 1);
            SniperStorage.setSetting('sniper_fav_list', favs);
        }
    },

    isFavorite(ticker) {
        if (!ticker) return false;
        return this.getFavorites().includes(ticker.toUpperCase());
    },

    // --- HALAL VERIFICATION CACHE ---
    setHalalCache(ticker, status) {
        const upperTicker = ticker.toUpperCase();

        // Save to DB
        SniperStorage.setHalal(upperTicker, status);
        console.log("🎯 Sniper: Cached", upperTicker, "as", status);

        // Sync with blacklist - ensure all entries are normalized to uppercase
        const blacklist = this.getBlacklist();
        const normalizedBlacklist = blacklist.map(t => typeof t === 'string' ? t.toUpperCase() : t);
        const inBlacklist = normalizedBlacklist.includes(upperTicker);

        if (status === 'NOT_HALAL' && !inBlacklist) {
            normalizedBlacklist.push(upperTicker);
            SniperStorage.setSetting('sniper_haram_list', normalizedBlacklist);
            console.log("🎯 Sniper: Added", upperTicker, "to blacklist");
        } else if (status === 'HALAL' && inBlacklist) {
            const idx = normalizedBlacklist.indexOf(upperTicker);
            normalizedBlacklist.splice(idx, 1);
            SniperStorage.setSetting('sniper_haram_list', normalizedBlacklist);
            console.log("🎯 Sniper: Removed", upperTicker, "from blacklist (now verified HALAL)");
        } else if (status === 'NOT_HALAL' && inBlacklist) {
            // Ensure the stored blacklist is normalized (in case it wasn't before)
            SniperStorage.setSetting('sniper_haram_list', normalizedBlacklist);
        }
    },

    clearHalalCache(ticker) {
        const upperTicker = ticker.toUpperCase();
        SniperStorage.removeHalal(upperTicker);
        console.log("🎯 Sniper: Cleared cache for", upperTicker);

        const blacklist = this.getBlacklist();
        const normalizedBlacklist = blacklist.map(t => typeof t === 'string' ? t.toUpperCase() : t);
        const idx = normalizedBlacklist.indexOf(upperTicker);
        if (idx > -1) {
            normalizedBlacklist.splice(idx, 1);
            SniperStorage.setSetting('sniper_haram_list', normalizedBlacklist);
            console.log("🎯 Sniper: Removed", upperTicker, "from blacklist");
        }
    },

    getCachedHalalStatus(ticker) {
        const entry = SniperStorage.getHalal(ticker);
        if (!entry) return null;

        const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (Date.now() - entry.checkedAt > CACHE_DURATION) {
            return null; // Expired
        }
        return entry.status;
    },

    // --- GEMINI API KEY STORAGE ---
    getGeminiApiKey() {
        return SniperStorage.getSetting('sniper_gemini_api_key', '');
    },

    setGeminiApiKey(key) {
        SniperStorage.setSetting('sniper_gemini_api_key', key);
    },

    // --- xAI (Grok) API KEY STORAGE ---
    getXaiApiKey() {
        return SniperStorage.getSetting('sniper_xai_api_key', '');
    },

    setXaiApiKey(key) {
        SniperStorage.setSetting('sniper_xai_api_key', key);
    },

    // --- AI PROVIDER PREFERENCE ---
    getAiProvider() {
        return SniperStorage.getSetting('sniper_ai_provider', 'gemini');
    },

    setAiProvider(provider) {
        const allowed = ['gemini', 'xai'];
        if (allowed.includes(provider)) {
            SniperStorage.setSetting('sniper_ai_provider', provider);
        }
    },

    // --- GLOBAL ENABLED STATE ---
    getEnabled() {
        return SniperStorage.getSetting('sniper_enabled', true);
    },

    setEnabled(status) {
        SniperStorage.setSetting('sniper_enabled', status);
    },

    // --- FORMATTING HELPERS ---
    formatMoney(n) {
        return "$" + (Math.abs(n) / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + "k";
    },

    parseDate(str) {
        if (!str) return null;
        const match = str.match(/(\d{4}-\d{2}-\d{2})/);
        if (match) return new Date(match[1]);
        return null;
    },

    // --- UI HELPERS ---
    createFloatingPanel(title) {
        const panel = document.createElement('div');
        panel.id = 'sniper-panel';
        Object.assign(panel.style, {
            position: 'fixed', top: '10px', right: '10px', width: '260px',
            background: '#09090b', border: '1px solid #27272a',
            borderRadius: '10px', zIndex: '99999',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            color: '#e4e4e7'
        });

        const header = document.createElement('div');
        Object.assign(header.style, {
            padding: '12px 14px', borderBottom: '1px solid #27272a',
            cursor: 'move', userSelect: 'none', display: 'flex',
            justifyContent: 'space-between', alignItems: 'center',
            background: '#18181b', borderRadius: '10px 10px 0 0'
        });
        header.innerHTML = `<span style="font-weight:600;font-size:13px;color:#fff;">${title}</span>`;

        const body = document.createElement('div');
        body.style.padding = '12px 14px';

        panel.appendChild(header);
        panel.appendChild(body);
        document.body.appendChild(panel);

        // Drag functionality
        let isDragging = false, offsetX, offsetY;
        header.onmousedown = (e) => {
            isDragging = true;
            offsetX = e.clientX - panel.getBoundingClientRect().left;
            offsetY = e.clientY - panel.getBoundingClientRect().top;
            panel.style.transition = 'none';
        };
        document.onmousemove = (e) => {
            if (isDragging) {
                panel.style.left = (e.clientX - offsetX) + 'px';
                panel.style.top = (e.clientY - offsetY) + 'px';
                panel.style.right = 'auto';
            }
        };
        document.onmouseup = () => { isDragging = false; };

        return { panel, header, body };
    },

    createMiniButton(text, bg, url) {
        return `<a href="${url}" target="_blank" style="flex:1; background:${bg}; color:white; text-decoration:none; padding:6px; border-radius:4px; font-size:11px; font-weight:bold; text-align:center; display:block; border:1px solid #3f3f46;">${text}</a>`;
    },

    // --- CLIPBOARD HELPER ---
    copyToClipboard(text, onSuccess, onError) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(onSuccess).catch(err => {
                console.warn("Clipboard access denied, falling back:", err);
                this._fallbackCopy(text, onSuccess, onError);
            });
        } else {
            this._fallbackCopy(text, onSuccess, onError);
        }
    },

    _fallbackCopy(text, onSuccess, onError) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;

            // Ensure it's not visible but part of the DOM
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);

            textArea.focus();
            textArea.select();

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                if (onSuccess) onSuccess();
            } else {
                if (onError) onError(new Error("execCommand copy failed"));
            }
        } catch (err) {
            console.error("Fallback copy failed:", err);
            if (onError) onError(err);
        }
    }
};

window.SniperUtils = SniperUtils;
