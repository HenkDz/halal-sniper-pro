// =========================================================================
// 💾 STORAGE MODULE - IndexedDB Wrapper & Cache Layer
// =========================================================================

const SniperStorage = {
    dbName: 'HalalSniperDB',
    dbVersion: 2, // Bumped to 2 to add halal_financial_cache store
    db: null,

    // In-memory write-through cache for sync access in UI
    mem: {
        settings: {},
        halal: {}
    },

    async init() {
        return new Promise((resolve) => {
            console.log("💾 Opening IndexedDB version", this.dbVersion);
            
            // Timeout fallback - if DB doesn't open in 8 seconds, use localStorage
            // (IndexedDB can be slow on first load or after clearing data)
            const timeout = setTimeout(() => {
                console.warn("⚠️ IndexedDB timeout after 8s - using localStorage fallback");
                this.db = null;
                this.useLocalStorageFallback = true;
                this.hydrateMemoryFromLocalStorage();
                this.setupStorageListener(); // Listen for cross-tab updates
                console.log("💾 Sniper Storage: Ready (localStorage mode)");
                resolve();
            }, 8000);
            
            try {
                console.log("💾 Calling indexedDB.open...");
                const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                clearTimeout(timeout);
                console.error("❌ IndexedDB Error:", event.target.error);
                // Fall back to localStorage instead of rejecting
                this.db = null;
                this.useLocalStorageFallback = true;
                this.hydrateMemoryFromLocalStorage();
                this.setupStorageListener(); // Listen for cross-tab updates
                console.log("💾 Sniper Storage: Ready (localStorage fallback after error)");
                resolve();
            };

            request.onblocked = (_event) => {
                console.warn("⚠️ IndexedDB blocked! Close other tabs and refresh.");
                // Don't wait forever - resolve with fallback after 2 more seconds
                setTimeout(() => {
                    clearTimeout(timeout);
                    this.db = null;
                    this.useLocalStorageFallback = true;
                    this.hydrateMemoryFromLocalStorage();
                    this.setupStorageListener(); // Listen for cross-tab updates
                    console.log("💾 Sniper Storage: Ready (localStorage fallback after block)");
                    resolve();
                }, 2000);
            };

            request.onupgradeneeded = (event) => {
                console.log("💾 Upgrading database schema...");
                const db = event.target.result;
                // Settings: { key: 'favorites', value: [...] }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                // Halal Cache: { ticker: 'AAPL', status: 'HALAL', timestamp: 123... }
                if (!db.objectStoreNames.contains('halal_cache')) {
                    db.createObjectStore('halal_cache', { keyPath: 'ticker' });
                }
                // AI Logs: { ticker: 'AAPL', analysis: '...', date: ... }
                if (!db.objectStoreNames.contains('ai_history')) {
                    db.createObjectStore('ai_history', { keyPath: 'ticker' });
                }
                // Halal Financial Data Cache: { ticker: 'AAPL', halalData: {...}, source: 'SEC 10-K Dec 31 2024', timestamp: ... }
                if (!db.objectStoreNames.contains('halal_financial_cache')) {
                    console.log("💾 Creating halal_financial_cache store...");
                    db.createObjectStore('halal_financial_cache', { keyPath: 'ticker' });
                }
                console.log("💾 Database schema upgrade complete");
            };

            request.onsuccess = async (event) => {
                clearTimeout(timeout);
                console.log("💾 Database opened successfully");
                this.db = event.target.result;
                this.useLocalStorageFallback = false;
                await this.migrateFromLocalStorage();
                await this.hydrateMemory();
                this.setupStorageListener(); // Listen for cross-tab updates
                console.log("💾 Sniper Storage: Ready (IndexedDB mode)");
                resolve();
            };
            } catch (e) {
                clearTimeout(timeout);
                console.warn("⚠️ IndexedDB error, using localStorage:", e.message);
                this.db = null;
                this.useLocalStorageFallback = true;
                this.hydrateMemoryFromLocalStorage();
                this.setupStorageListener(); // Listen for cross-tab updates
                console.log("💾 Sniper Storage: Ready (localStorage mode)");
                resolve();
            }
        });
    },

    // Hydrate memory from localStorage (fallback)
    hydrateMemoryFromLocalStorage() {
        try {
            // Load settings
            const settingsKeys = ['sniper_haram_list', 'sniper_fav_list', 'sniper_gemini_api_key', 'sniper_xai_api_key', 'sniper_ai_provider', 'sniper_debug_mode', 'sniper_alphavantage_key', 'preferred_template'];
            settingsKeys.forEach(key => {
                const val = localStorage.getItem(key);
                if (val) {
                    try {
                        this.mem.settings[key] = JSON.parse(val);
                    } catch {
                        this.mem.settings[key] = val;
                    }
                }
            });
            
            // Load halal cache
            const halalKeys = Object.keys(localStorage).filter(k => k.startsWith('halal_'));
            halalKeys.forEach(key => {
                const ticker = key.replace('halal_', '');
                this.mem.halal[ticker] = localStorage.getItem(key);
            });
            
            console.log("💾 Loaded from localStorage:", Object.keys(this.mem.settings).length, "settings,", Object.keys(this.mem.halal).length, "halal entries");
        } catch (e) {
            console.warn("💾 localStorage hydration error:", e.message);
        }
    },

    // Reset database by deleting and recreating
    async resetDatabase() {
        return new Promise((resolve, reject) => {
            console.log("💾 Deleting database for fresh start...");
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            deleteRequest.onsuccess = () => {
                console.log("💾 Database deleted successfully");
                resolve();
            };
            deleteRequest.onerror = (e) => {
                console.error("❌ Failed to delete database:", e);
                reject(e);
            };
            deleteRequest.onblocked = () => {
                console.warn("⚠️ Delete blocked - forcing resolution");
                // Still resolve after a moment - the delete might complete later
                setTimeout(resolve, 1000);
            };
        });
    },

    // Init without timeout (for retry after reset)
    async initWithoutTimeout() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onerror = (e) => reject(e.target.error);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('halal_cache')) db.createObjectStore('halal_cache', { keyPath: 'ticker' });
                if (!db.objectStoreNames.contains('ai_history')) db.createObjectStore('ai_history', { keyPath: 'ticker' });
                if (!db.objectStoreNames.contains('halal_financial_cache')) db.createObjectStore('halal_financial_cache', { keyPath: 'ticker' });
            };
            request.onsuccess = async (event) => {
                this.db = event.target.result;
                console.log("💾 Database reopened after reset");
                resolve();
            };
        });
    },

    // Migrate old localStorage data to IndexedDB (One-time)
    async migrateFromLocalStorage() {
        const migrated = localStorage.getItem('sniper_db_migrated');
        if (migrated) return;

        console.log("📦 Migrating data from localStorage to IndexedDB...");

        // 1. Settings & Lists
        const keysToMove = [
            'sniper_haram_list', 'sniper_fav_list',
            'sniper_gemini_api_key', 'sniper_xai_api_key', 'sniper_ai_provider',
            'preferred_template'
        ];

        for (const k of keysToMove) {
            const val = localStorage.getItem(k);
            if (val) {
                // Determine if it's JSON or string
                let parsed = val;
                try {
                    // Start keys like 'sniper_fav_list' are JSON arrays
                    if (val.startsWith('[') || val.startsWith('{')) parsed = JSON.parse(val);
                } catch (e) { }

                await this.setSetting(k, parsed);
            }
        }

        // 2. Halal Cache
        const oldCache = JSON.parse(localStorage.getItem('sniper_halal_cache') || '{}');
        for (const [ticker, data] of Object.entries(oldCache)) {
            await this.setHalal(ticker, data.status, data.checkedAt);
        }

        localStorage.setItem('sniper_db_migrated', 'true');
        console.log("📦 Migration Complete.");
    },

    // Load common data into RAM for UI speed
    async hydrateMemory() {
        // 1. Load settings from chrome.storage.local FIRST (cross-site, highest priority)
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await new Promise(resolve => {
                chrome.storage.local.get(null, (items) => {
                    Object.keys(items).forEach(key => {
                        if (key.startsWith('sniper_setting_')) {
                            const settingKey = key.replace('sniper_setting_', '');
                            this.mem.settings[settingKey] = items[key];
                        }
                    });
                    console.log(`💾 Loaded ${Object.keys(this.mem.settings).length} settings from chrome.storage`);
                    resolve();
                });
            });
        }
        
        // 2. Load from IndexedDB as fallback (fills in any missing settings)
        if (this.db) {
            try {
                const settingsTx = this.db.transaction('settings', 'readonly');
                const settingsReq = settingsTx.objectStore('settings').getAll();

                await new Promise(r => {
                    settingsReq.onsuccess = () => {
                        settingsReq.result.forEach(item => {
                            // Only set if not already loaded from chrome.storage
                            if (this.mem.settings[item.key] === undefined) {
                                this.mem.settings[item.key] = item.value;
                            }
                        });
                        r();
                    };
                    settingsReq.onerror = () => r();
                });

                // Load Halal Cache from IndexedDB
                const halalTx = this.db.transaction('halal_cache', 'readonly');
                const halalReq = halalTx.objectStore('halal_cache').getAll();

                await new Promise(r => {
                    halalReq.onsuccess = () => {
                        halalReq.result.forEach(item => {
                            this.mem.halal[item.ticker] = item;
                        });
                        r();
                    };
                    halalReq.onerror = () => r();
                });
            } catch (e) {
                console.warn('💾 IndexedDB hydration error:', e.message);
            }
        }

        // 3. Load Halal Cache from chrome.storage.local (CROSS-SITE - highest priority)
        // This ensures halal data synced from Musaffa.com is available on OpenInsider
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await new Promise(resolve => {
                chrome.storage.local.get(null, (items) => {
                    let halalCount = 0;
                    Object.keys(items).forEach(key => {
                        if (key.startsWith('halal_')) {
                            const ticker = key.replace('halal_', '');
                            const data = items[key];
                            // chrome.storage.local has priority (cross-site sync)
                            const existing = this.mem.halal[ticker];
                            
                            // Determine if we should update:
                            // 1. No existing data
                            // 2. New data is from Musaffa (source: 'musaffa') - ALWAYS takes priority
                            // 3. New data has enhanced info (grade) - takes priority over auto-verify
                            // 4. New data is more recent (by timestamp)
                            const isNewEnhanced = data.source === 'musaffa' || data.grade;
                            const isExistingEnhanced = existing?.source === 'musaffa' || existing?.grade;
                            const isNewNewer = data.checkedAt && (!existing?.checkedAt || data.checkedAt > existing.checkedAt);
                            
                            // Enhanced Musaffa data always wins over auto-verify
                            // Otherwise, use timestamp comparison
                            if (!existing || (isNewEnhanced && !isExistingEnhanced) || isNewNewer) {
                                this.mem.halal[ticker] = data;
                                halalCount++;
                            }
                        }
                    });
                    if (halalCount > 0) {
                        console.log(`💾 Loaded ${halalCount} halal entries from chrome.storage (cross-site sync)`);
                    }
                    resolve();
                });
            });
        }
    },

    /**
     * Setup chrome.storage.onChanged listener for cross-tab sync
     * This ensures that when Musaffa page updates halal data, OpenInsider sees it immediately
     */
    setupStorageListener() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (areaName !== 'local') return;
                
                for (const [key, { newValue }] of Object.entries(changes)) {
                    // Update halal data in memory when changed by another tab/page
                    if (key.startsWith('halal_')) {
                        const ticker = key.replace('halal_', '');
                        if (newValue) {
                            // Only update if new data is more recent or has more info (enhanced)
                            const existing = this.mem.halal[ticker];
                            const newCheckedAt = newValue.checkedAt || 0;
                            const existingCheckedAt = existing?.checkedAt || 0;
                            
                            // Update if: no existing, new is more recent, or new has enhanced data (grade/source)
                            const isEnhanced = newValue.source === 'musaffa' || newValue.grade;
                            if (!existing || newCheckedAt > existingCheckedAt || isEnhanced) {
                                this.mem.halal[ticker] = newValue;
                                console.log(`🔄 Cross-tab sync: Updated ${ticker} to ${newValue.status}`, isEnhanced ? '(enhanced)' : '');
                            }
                        } else {
                            // Data was removed
                            delete this.mem.halal[ticker];
                            console.log(`🔄 Cross-tab sync: Removed ${ticker}`);
                        }
                    }
                    
                    // Update settings in memory when changed by another tab/page
                    if (key.startsWith('sniper_setting_')) {
                        const settingKey = key.replace('sniper_setting_', '');
                        if (newValue !== undefined) {
                            this.mem.settings[settingKey] = newValue;
                            console.log(`🔄 Cross-tab sync: Updated setting ${settingKey}`);
                        } else {
                            delete this.mem.settings[settingKey];
                        }
                    }
                }
            });
            console.log("💾 Storage listener setup for cross-tab sync");
        }
    },

    // --- API Methods ---

    // Settings (Sync Read from memory, Async Write to chrome.storage.local)
    // Uses chrome.storage.local for cross-site sharing (API keys work on both OpenInsider & Musaffa)
    getSetting(key, defaultValue = null) {
        return this.mem.settings[key] !== undefined ? this.mem.settings[key] : defaultValue;
    },

    async setSetting(key, value) {
        this.mem.settings[key] = value;
        
        // Save to chrome.storage.local for cross-site sharing
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const storageKey = `sniper_setting_${key}`;
            chrome.storage.local.set({ [storageKey]: value }, () => {
                console.log(`💾 Saved setting to chrome.storage: ${key}`);
            });
        }
        
        // Also save to IndexedDB as backup
        return this.put('settings', { key, value });
    },

    // Halal Cache - Now supports enhanced data from Musaffa
    // Uses chrome.storage.local for cross-site sharing + IndexedDB for backup
    getHalal(ticker) {
        return this.mem.halal[ticker.toUpperCase()] || null;
    },

    async setHalal(ticker, status, checkedAt = Date.now()) {
        const item = { ticker: ticker.toUpperCase(), status, checkedAt };
        this.mem.halal[item.ticker] = item;
        
        // Save to IndexedDB (origin-specific backup)
        await this.put('halal_cache', item);
        
        // Also save to chrome.storage.local for cross-site sharing
        await this.syncHalalToChromeStorage(item.ticker, item);
        
        return item;
    },

    /**
     * Set enhanced halal data from Musaffa with full compliance details
     * This includes grade, business breakdown, financial screening, etc.
     */
    async setHalalEnhanced(ticker, data) {
        const upperTicker = ticker.toUpperCase();
        const item = {
            ticker: upperTicker,
            status: data.status || 'UNKNOWN',
            checkedAt: Date.now(),
            // Enhanced fields from Musaffa
            grade: data.grade || null,              // A+, A, B, C, D, F
            methodology: data.methodology || null,   // AAOIFI, etc.
            lastUpdated: data.lastUpdated || null,   // Date from Musaffa
            reportSource: data.reportSource || null, // "2025 Annual Report"
            // Business breakdown
            halalPercent: data.halalPercent ?? null,
            doubtfulPercent: data.doubtfulPercent ?? null,
            notHalalPercent: data.notHalalPercent ?? null,
            businessActivity: data.businessActivity || null, // Pass/Fail
            // Financial screening
            debtRatio: data.debtRatio ?? null,
            debtStatus: data.debtStatus || null,     // Pass/Fail
            securitiesStatus: data.securitiesStatus || null, // Pass/Fail
            // Company info
            companyName: data.companyName || null,
            sector: data.sector || null,
            country: data.country || null,
            marketCap: data.marketCap || null,
            // Source tracking
            source: 'musaffa'
        };
        
        this.mem.halal[upperTicker] = item;
        console.log(`💾 Saved enhanced halal data for ${upperTicker}:`, item.status, item.grade);
        
        // Save to IndexedDB (origin-specific backup)
        await this.put('halal_cache', item);
        
        // Also save to chrome.storage.local for cross-site sharing
        await this.syncHalalToChromeStorage(upperTicker, item);
        
        return item;
    },

    /**
     * Sync halal data to chrome.storage.local for cross-site sharing
     */
    async syncHalalToChromeStorage(ticker, data) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const key = `halal_${ticker}`;
            await chrome.storage.local.set({ [key]: data });
            console.log(`🔄 Synced ${ticker} to chrome.storage.local`);
        }
    },

    /**
     * Load halal data from chrome.storage.local (cross-site)
     */
    async loadHalalFromChromeStorage(ticker) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const key = `halal_${ticker}`;
            return new Promise((resolve) => {
                chrome.storage.local.get([key], (result) => {
                    if (result[key]) {
                        // Also update memory cache
                        this.mem.halal[ticker] = result[key];
                        console.log(`🔄 Loaded ${ticker} from chrome.storage.local:`, result[key].status);
                    }
                    resolve(result[key] || null);
                });
            });
        }
        return null;
    },

    /**
     * Get halal data with cross-site fallback
     * Checks memory → IndexedDB → chrome.storage.local
     */
    async getHalalAsync(ticker) {
        const upperTicker = ticker.toUpperCase();
        
        // 1. Check memory cache first
        if (this.mem.halal[upperTicker]) {
            return this.mem.halal[upperTicker];
        }
        
        // 2. Check IndexedDB
        const idbData = await this.get('halal_cache', upperTicker);
        if (idbData) {
            this.mem.halal[upperTicker] = idbData;
            return idbData;
        }
        
        // 3. Check chrome.storage.local (cross-site)
        const chromeData = await this.loadHalalFromChromeStorage(upperTicker);
        if (chromeData) {
            return chromeData;
        }
        
        return null;
    },

    async removeHalal(ticker) {
        const upperTicker = ticker.toUpperCase();
        delete this.mem.halal[upperTicker];
        
        // Remove from IndexedDB
        await this.delete('halal_cache', upperTicker);
        
        // Remove from chrome.storage.local
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const key = `halal_${upperTicker}`;
            await chrome.storage.local.remove([key]);
        }
    },

    // AI History - Uses chrome.storage.local to share across sites (OpenInsider + Musaffa)
    // mode: 'quick' or 'deep' - saves reports separately
    async getAIHistory(ticker, mode = 'quick') {
        const key = `ai_report_${ticker.toUpperCase()}_${mode}`;
        
        // Use chrome.storage.local for cross-site sharing
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve) => {
                chrome.storage.local.get(key, (result) => {
                    resolve(result[key] || null);
                });
            });
        }
        
        // Fallback to IndexedDB (won't work cross-site but better than nothing)
        const dbKey = `${ticker.toUpperCase()}_${mode}`;
        return this.get('ai_history', dbKey);
    },

    async saveAIHistory(ticker, analysis, dataSummary, mode = 'quick', extraData = {}) {
        const key = `ai_report_${ticker.toUpperCase()}_${mode}`;
        const data = {
            ticker: `${ticker.toUpperCase()}_${mode}`,
            timestamp: Date.now(),
            analysis,
            dataSummary,
            mode: mode,
            ...extraData
        };
        
        // Use chrome.storage.local for cross-site sharing
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: data }, () => {
                    console.log(`💾 Saved AI report to chrome.storage: ${key}`);
                    resolve();
                });
            });
        }
        
        // Fallback to IndexedDB
        return this.put('ai_history', data);
    },

    // Insider Data Cache - Share insider data between OpenInsider and Musaffa
    async getInsiderData(ticker) {
        const data = await this.get('halal_cache', ticker.toUpperCase());
        if (data && data.insiderData) {
            // Check if insider data is fresh (less than 24 hours old)
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            if (data.insiderCachedAt && (Date.now() - data.insiderCachedAt) < maxAge) {
                return data.insiderData;
            }
        }
        return null;
    },

    async saveInsiderData(ticker, insiderData) {
        const upperTicker = ticker.toUpperCase();
        const existing = this.mem.halal[upperTicker] || { ticker: upperTicker, status: 'UNKNOWN' };
        
        const item = {
            ...existing,
            insiderData: insiderData,
            insiderCachedAt: Date.now()
        };
        
        this.mem.halal[upperTicker] = item;
        console.log(`💾 Cached insider data for ${upperTicker}`);
        return this.put('halal_cache', item);
    },

    // Halal Financial Data Cache - Store extracted financial data with validation
    async getHalalFinancialData(ticker) {
        try {
            // Check if using localStorage fallback or IndexedDB store exists
            if (this.useLocalStorageFallback || !this.db) {
                return await this.get('halal_financial_cache', ticker.toUpperCase());
            }
            if (!this.db.objectStoreNames.contains('halal_financial_cache')) {
                return null;
            }
            return await this.get('halal_financial_cache', ticker.toUpperCase());
        } catch (e) {
            console.warn('💾 Error getting halal financial data:', e.message);
            return null;
        }
    },

    async saveHalalFinancialData(ticker, halalData, source = null) {
        try {
            const item = {
                ticker: ticker.toUpperCase(),
                halalData: halalData,
                source: source,
                timestamp: Date.now(),
                filingDate: halalData.filingDate || null
            };
            
            // Check if using localStorage fallback or IndexedDB store exists
            if (this.useLocalStorageFallback || !this.db) {
                return await this.put('halal_financial_cache', item);
            }
            if (!this.db.objectStoreNames.contains('halal_financial_cache')) {
                // Fallback to localStorage
                localStorage.setItem(`sniper_halal_financial_cache_${ticker.toUpperCase()}`, JSON.stringify(item));
                return;
            }
            return await this.put('halal_financial_cache', item);
        } catch (e) {
            console.warn('💾 Error saving halal financial data:', e.message);
        }
    },

    // =========================================================================
    // 📊 ALPHA VANTAGE DATA CACHE
    // =========================================================================
    
    /**
     * Get Alpha Vantage API key
     */
    getAlphaVantageKey() {
        return this.getSetting('sniper_alphavantage_key', '') || localStorage.getItem('sniper_alphavantage_key') || '';
    },
    
    /**
     * Set Alpha Vantage API key
     */
    async setAlphaVantageKey(key) {
        localStorage.setItem('sniper_alphavantage_key', key);
        await this.setSetting('sniper_alphavantage_key', key);
    },
    
    /**
     * Get cached Alpha Vantage data for a ticker
     * Cache duration: 6 hours (to respect 25 calls/day limit)
     */
    async getAlphaVantageData(ticker) {
        const upperTicker = ticker.toUpperCase();
        const cacheKey = `av_${upperTicker}`;
        
        // Try chrome.storage first (cross-site)
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            return new Promise((resolve) => {
                chrome.storage.local.get(cacheKey, (result) => {
                    const data = result[cacheKey];
                    if (data) {
                        // Check cache freshness (6 hours)
                        const cacheAge = Date.now() - (data.timestamp || 0);
                        if (cacheAge < 6 * 60 * 60 * 1000) {
                            console.log(`📊 Using cached Alpha Vantage data for ${upperTicker} (${Math.round(cacheAge / 60000)}min old)`);
                            resolve(data);
                            return;
                        }
                    }
                    resolve(null);
                });
            });
        }
        
        // Fallback to localStorage
        const stored = localStorage.getItem(`sniper_${cacheKey}`);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                const cacheAge = Date.now() - (data.timestamp || 0);
                if (cacheAge < 6 * 60 * 60 * 1000) {
                    return data;
                }
            } catch (e) { }
        }
        
        return null;
    },
    
    /**
     * Save Alpha Vantage data to cache
     */
    async saveAlphaVantageData(ticker, data) {
        const upperTicker = ticker.toUpperCase();
        const cacheKey = `av_${upperTicker}`;
        const cacheData = {
            ...data,
            ticker: upperTicker,
            timestamp: Date.now()
        };
        
        // Save to chrome.storage (cross-site)
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            await chrome.storage.local.set({ [cacheKey]: cacheData });
            console.log(`📊 Cached Alpha Vantage data for ${upperTicker}`);
        }
        
        // Also save to localStorage as backup
        localStorage.setItem(`sniper_${cacheKey}`, JSON.stringify(cacheData));
    },

    /**
     * Get enhanced halal data (wrapper for getHalalAsync)
     * Returns the full halal object with financial data
     */
    async getHalalEnhanced(ticker) {
        const data = await this.getHalalAsync(ticker);
        return data;
    },

    // Compare new halalData with cached to detect inconsistencies
    compareHalalData(newData, cachedData) {
        if (!cachedData || !cachedData.halalData) return { consistent: true, differences: [] };
        
        const differences = [];
        const threshold = 0.05; // 5% difference threshold
        
        const compareNumber = (newVal, oldVal, fieldName) => {
            if (newVal === null || oldVal === null) return; // Skip null comparisons
            if (typeof newVal !== 'number' || typeof oldVal !== 'number') return;
            
            const diff = Math.abs(newVal - oldVal);
            const percentDiff = oldVal > 0 ? (diff / oldVal) * 100 : (diff > 0 ? 100 : 0);
            
            if (percentDiff > threshold * 100) { // More than 5% difference
                differences.push({
                    field: fieldName,
                    new: newVal,
                    old: oldVal,
                    diff: diff,
                    percentDiff: percentDiff.toFixed(2)
                });
            }
        };
        
        const newH = newData;
        const oldH = cachedData.halalData;
        
        compareNumber(newH.interestBearingDebt, oldH.interestBearingDebt, 'Interest-Bearing Debt');
        compareNumber(newH.totalAssets, oldH.totalAssets, 'Total Assets');
        compareNumber(newH.illiquidAssets, oldH.illiquidAssets, 'Illiquid Assets');
        compareNumber(newH.netLiquidAssets, oldH.netLiquidAssets, 'Net Liquid Assets');
        compareNumber(newH.marketCap, oldH.marketCap, 'Market Cap');
        compareNumber(newH.grossRevenue, oldH.grossRevenue, 'Gross Revenue');
        compareNumber(newH.haramIncomePercent, oldH.haramIncomePercent, 'Haram Income %');
        
        return {
            consistent: differences.length === 0,
            differences: differences,
            cachedSource: cachedData.source,
            cachedTimestamp: cachedData.timestamp
        };
    },

    // --- Low Level Wrappers (with localStorage fallback) ---

    async put(storeName, data) {
        // localStorage fallback
        if (this.useLocalStorageFallback || !this.db) {
            const key = data.key || data.ticker || 'unknown';
            localStorage.setItem(`sniper_${storeName}_${key}`, JSON.stringify(data));
            return;
        }
        
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                store.put(data);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            } catch (e) {
                // Fallback to localStorage on error
                const key = data.key || data.ticker || 'unknown';
                localStorage.setItem(`sniper_${storeName}_${key}`, JSON.stringify(data));
                resolve();
            }
        });
    },

    async get(storeName, key) {
        // localStorage fallback
        if (this.useLocalStorageFallback || !this.db) {
            const stored = localStorage.getItem(`sniper_${storeName}_${key}`);
            return stored ? JSON.parse(stored) : null;
        }
        
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.get(key);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } catch (e) {
                // Fallback to localStorage on error
                const stored = localStorage.getItem(`sniper_${storeName}_${key}`);
                resolve(stored ? JSON.parse(stored) : null);
            }
        });
    },

    async getAll(storeName) {
        // localStorage fallback
        if (this.useLocalStorageFallback || !this.db) {
            const results = [];
            const prefix = `sniper_${storeName}_`;
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith(prefix)) {
                    try {
                        results.push(JSON.parse(localStorage.getItem(k)));
                    } catch {}
                }
            });
            return results;
        }
        
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            } catch (e) {
                resolve([]);
            }
        });
    },

    async delete(storeName, key) {
        // localStorage fallback
        if (this.useLocalStorageFallback || !this.db) {
            localStorage.removeItem(`sniper_${storeName}_${key}`);
            return;
        }
        
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                store.delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            } catch (e) {
                localStorage.removeItem(`sniper_${storeName}_${key}`);
                resolve();
            }
        });
    },

    // --- Import / Export ---

    async exportData() {
        const backup = {
            version: 1,
            timestamp: Date.now(),
            settings: await this.getAll('settings'),
            halal_cache: await this.getAll('halal_cache'),
            ai_history: await this.getAll('ai_history')
        };
        return JSON.stringify(backup, null, 2);
    },

    async importData(jsonString) {
        try {
            const backup = JSON.parse(jsonString);
            let added = 0, overwritten = 0, skipped = 0;

            // 1. Settings - Always overwrite (no timestamp, configuration data)
            if (Array.isArray(backup.settings)) {
                for (const item of backup.settings) {
                    await this.setSetting(item.key, item.value);
                    overwritten++;
                }
            }

            // 2. Halal Cache - Add new, overwrite old, skip same/newer
            if (Array.isArray(backup.halal_cache)) {
                for (const item of backup.halal_cache) {
                    // Check database directly to ensure we have the latest data
                    const existing = await this.get('halal_cache', item.ticker?.toUpperCase());
                    if (!existing) {
                        // Add new entry
                        await this.setHalal(item.ticker, item.status, item.checkedAt);
                        added++;
                    } else {
                        // Compare timestamps: overwrite if imported is newer
                        const importedTime = item.checkedAt || 0;
                        const existingTime = existing.checkedAt || 0;
                        if (importedTime > existingTime) {
                            await this.setHalal(item.ticker, item.status, item.checkedAt);
                            overwritten++;
                        } else {
                            skipped++;
                        }
                    }
                }
            }

            // 3. AI History - Add new, overwrite old, skip same/newer
            if (Array.isArray(backup.ai_history)) {
                const tx = this.db.transaction('ai_history', 'readwrite');
                const store = tx.objectStore('ai_history');
                
                for (const item of backup.ai_history) {
                    const ticker = item.ticker?.toUpperCase();
                    if (!ticker) continue; // Skip invalid entries
                    
                    const existing = await this.get('ai_history', ticker);
                    if (!existing) {
                        // Add new entry (ensure ticker is uppercase)
                        store.put({ ...item, ticker });
                        added++;
                    } else {
                        // Compare timestamps: overwrite if imported is newer
                        const importedTime = item.timestamp || 0;
                        const existingTime = existing.timestamp || 0;
                        if (importedTime > existingTime) {
                            store.put({ ...item, ticker });
                            overwritten++;
                        } else {
                            skipped++;
                        }
                    }
                }
                
                await new Promise((resolve, reject) => {
                    tx.oncomplete = resolve;
                    tx.onerror = reject;
                });
            }

            console.log(`📥 Import Complete: ${added} added, ${overwritten} overwritten, ${skipped} skipped`);
            return { success: true, added, overwritten, skipped };
        } catch (error) {
            console.error("❌ Import Failed:", error);
            return { success: false, error: error.message };
        }
    }
};

window.SniperStorage = SniperStorage;
