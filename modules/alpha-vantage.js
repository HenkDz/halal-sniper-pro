// =========================================================================
// 📊 ALPHA VANTAGE MODULE - Real Financial Data & Analyst Consensus
// https://www.alphavantage.co/documentation/
// =========================================================================

const SniperAlphaVantage = {
    // API Configuration
    BASE_URL: 'https://www.alphavantage.co/query',
    CACHE_DURATION_MS: 6 * 60 * 60 * 1000, // 6 hours (free tier: 25 calls/day)
    
    /**
     * Get API key from storage
     */
    getApiKey() {
        return localStorage.getItem('sniper_alphavantage_key') || '';
    },
    
    /**
     * Set API key in storage
     */
    setApiKey(key) {
        localStorage.setItem('sniper_alphavantage_key', key);
    },
    
    /**
     * Check if API key is configured
     */
    hasApiKey() {
        return !!this.getApiKey();
    },

    /**
     * Get cached data for a ticker
     */
    getCachedData(ticker, dataType) {
        const cacheKey = `sniper_av_${dataType}_${ticker.toUpperCase()}`;
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;
        
        try {
            const data = JSON.parse(cached);
            const age = Date.now() - data.timestamp;
            if (age > this.CACHE_DURATION_MS) {
                localStorage.removeItem(cacheKey);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    },
    
    /**
     * Save data to cache
     */
    setCachedData(ticker, dataType, data) {
        const cacheKey = `sniper_av_${dataType}_${ticker.toUpperCase()}`;
        localStorage.setItem(cacheKey, JSON.stringify({
            ...data,
            timestamp: Date.now(),
            ticker: ticker.toUpperCase()
        }));
    },

    /**
     * Fetch Company Overview (includes analyst data!)
     * @param {string} ticker - Stock symbol
     * @returns {Promise<Object>} - Overview data
     */
    async fetchOverview(ticker) {
        // Check cache first
        const cached = this.getCachedData(ticker, 'overview');
        if (cached) {
            console.log(`📊 Alpha Vantage: Using cached overview for ${ticker}`);
            return { success: true, data: cached, fromCache: true };
        }
        
        const apiKey = this.getApiKey();
        if (!apiKey) {
            return { success: false, error: 'Alpha Vantage API key not configured' };
        }
        
        try {
            const url = `${this.BASE_URL}?function=OVERVIEW&symbol=${ticker}&apikey=${apiKey}`;
            console.log(`📊 Alpha Vantage: Fetching overview for ${ticker}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            // Check for API errors
            if (data['Error Message']) {
                return { success: false, error: data['Error Message'] };
            }
            if (data['Note']) {
                // Rate limit hit
                return { success: false, error: 'API rate limit reached. Try again later.', rateLimited: true };
            }
            if (!data.Symbol) {
                return { success: false, error: `No data found for ${ticker}` };
            }
            
            // Parse and structure the data
            const structured = this.parseOverviewData(data);
            this.setCachedData(ticker, 'overview', structured);
            
            return { success: true, data: structured, fromCache: false };
        } catch (e) {
            console.error('Alpha Vantage API error:', e);
            return { success: false, error: e.message };
        }
    },

    /**
     * Fetch Balance Sheet data
     * @param {string} ticker - Stock symbol
     * @returns {Promise<Object>} - Balance sheet data
     */
    async fetchBalanceSheet(ticker) {
        // Check cache first
        const cached = this.getCachedData(ticker, 'balance');
        if (cached) {
            console.log(`📊 Alpha Vantage: Using cached balance sheet for ${ticker}`);
            return { success: true, data: cached, fromCache: true };
        }
        
        const apiKey = this.getApiKey();
        if (!apiKey) {
            return { success: false, error: 'Alpha Vantage API key not configured' };
        }
        
        try {
            const url = `${this.BASE_URL}?function=BALANCE_SHEET&symbol=${ticker}&apikey=${apiKey}`;
            console.log(`📊 Alpha Vantage: Fetching balance sheet for ${ticker}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data['Error Message']) {
                return { success: false, error: data['Error Message'] };
            }
            if (data['Note']) {
                return { success: false, error: 'API rate limit reached', rateLimited: true };
            }
            if (!data.annualReports || data.annualReports.length === 0) {
                return { success: false, error: `No balance sheet data for ${ticker}` };
            }
            
            // Get most recent annual report
            const latest = data.annualReports[0];
            const structured = this.parseBalanceSheetData(latest);
            this.setCachedData(ticker, 'balance', structured);
            
            return { success: true, data: structured, fromCache: false };
        } catch (e) {
            console.error('Alpha Vantage Balance Sheet error:', e);
            return { success: false, error: e.message };
        }
    },

    /**
     * Fetch Income Statement data
     * @param {string} ticker - Stock symbol
     * @returns {Promise<Object>} - Income statement data
     */
    async fetchIncomeStatement(ticker) {
        // Check cache first
        const cached = this.getCachedData(ticker, 'income');
        if (cached) {
            console.log(`📊 Alpha Vantage: Using cached income statement for ${ticker}`);
            return { success: true, data: cached, fromCache: true };
        }
        
        const apiKey = this.getApiKey();
        if (!apiKey) {
            return { success: false, error: 'Alpha Vantage API key not configured' };
        }
        
        try {
            const url = `${this.BASE_URL}?function=INCOME_STATEMENT&symbol=${ticker}&apikey=${apiKey}`;
            console.log(`📊 Alpha Vantage: Fetching income statement for ${ticker}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data['Error Message']) {
                return { success: false, error: data['Error Message'] };
            }
            if (data['Note']) {
                return { success: false, error: 'API rate limit reached', rateLimited: true };
            }
            if (!data.annualReports || data.annualReports.length === 0) {
                return { success: false, error: `No income statement data for ${ticker}` };
            }
            
            const latest = data.annualReports[0];
            const structured = this.parseIncomeStatementData(latest);
            this.setCachedData(ticker, 'income', structured);
            
            return { success: true, data: structured, fromCache: false };
        } catch (e) {
            console.error('Alpha Vantage Income Statement error:', e);
            return { success: false, error: e.message };
        }
    },

    /**
     * Fetch ALL data for comprehensive analysis (Overview + Balance + Income)
     * Uses parallel requests for speed
     * @param {string} ticker - Stock symbol
     * @returns {Promise<Object>} - Combined financial data
     */
    async fetchComprehensiveData(ticker) {
        console.log(`📊 Alpha Vantage: Fetching comprehensive data for ${ticker}`);
        
        // Check if we have all cached data
        const cachedOverview = this.getCachedData(ticker, 'overview');
        const cachedBalance = this.getCachedData(ticker, 'balance');
        const cachedIncome = this.getCachedData(ticker, 'income');
        
        if (cachedOverview && cachedBalance && cachedIncome) {
            console.log(`📊 Alpha Vantage: All data cached for ${ticker}`);
            return {
                success: true,
                fromCache: true,
                overview: cachedOverview,
                balanceSheet: cachedBalance,
                incomeStatement: cachedIncome,
                combined: this.combineData(cachedOverview, cachedBalance, cachedIncome)
            };
        }
        
        // Fetch missing data (parallel where possible)
        const results = await Promise.allSettled([
            cachedOverview ? Promise.resolve({ success: true, data: cachedOverview, fromCache: true }) : this.fetchOverview(ticker),
            cachedBalance ? Promise.resolve({ success: true, data: cachedBalance, fromCache: true }) : this.fetchBalanceSheet(ticker),
            cachedIncome ? Promise.resolve({ success: true, data: cachedIncome, fromCache: true }) : this.fetchIncomeStatement(ticker)
        ]);
        
        const [overviewResult, balanceResult, incomeResult] = results.map(r => 
            r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
        );
        
        // Check for rate limiting
        const rateLimited = [overviewResult, balanceResult, incomeResult].some(r => r.rateLimited);
        if (rateLimited) {
            return {
                success: false,
                error: 'Alpha Vantage API rate limit reached (25 calls/day on free tier)',
                rateLimited: true,
                partial: {
                    overview: overviewResult.success ? overviewResult.data : null,
                    balanceSheet: balanceResult.success ? balanceResult.data : null,
                    incomeStatement: incomeResult.success ? incomeResult.data : null
                }
            };
        }
        
        // Return whatever we got
        const overview = overviewResult.success ? overviewResult.data : null;
        const balance = balanceResult.success ? balanceResult.data : null;
        const income = incomeResult.success ? incomeResult.data : null;
        
        return {
            success: overview !== null, // At minimum we need overview
            overview,
            balanceSheet: balance,
            incomeStatement: income,
            combined: this.combineData(overview, balance, income),
            errors: {
                overview: overviewResult.error || null,
                balanceSheet: balanceResult.error || null,
                incomeStatement: incomeResult.error || null
            }
        };
    },

    /**
     * Parse Overview API response into structured data
     */
    parseOverviewData(raw) {
        const parseNum = (val) => {
            if (!val || val === 'None' || val === '-' || val === 'N/A') return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };
        
        return {
            // Company Info
            symbol: raw.Symbol,
            name: raw.Name,
            description: raw.Description,
            sector: raw.Sector,
            industry: raw.Industry,
            exchange: raw.Exchange,
            currency: raw.Currency,
            country: raw.Country,
            
            // Analyst Data (THE GOLD!)
            analyst: {
                targetPrice: parseNum(raw.AnalystTargetPrice),
                strongBuy: parseNum(raw.AnalystRatingStrongBuy) || 0,
                buy: parseNum(raw.AnalystRatingBuy) || 0,
                hold: parseNum(raw.AnalystRatingHold) || 0,
                sell: parseNum(raw.AnalystRatingSell) || 0,
                strongSell: parseNum(raw.AnalystRatingStrongSell) || 0,
                get totalAnalysts() {
                    return this.strongBuy + this.buy + this.hold + this.sell + this.strongSell;
                },
                get consensus() {
                    const total = this.totalAnalysts;
                    if (total === 0) return 'N/A';
                    const bullish = this.strongBuy + this.buy;
                    const bearish = this.sell + this.strongSell;
                    if (bullish > this.hold && bullish > bearish) return 'Buy';
                    if (bearish > this.hold && bearish > bullish) return 'Sell';
                    return 'Hold';
                },
                get score() {
                    // 1-5 scale (1=Strong Buy, 5=Strong Sell)
                    const total = this.totalAnalysts;
                    if (total === 0) return null;
                    return (
                        (this.strongBuy * 1 + this.buy * 2 + this.hold * 3 + this.sell * 4 + this.strongSell * 5) / total
                    ).toFixed(2);
                }
            },
            
            // Valuation Metrics
            marketCap: parseNum(raw.MarketCapitalization),
            peRatio: parseNum(raw.PERatio),
            pegRatio: parseNum(raw.PEGRatio),
            forwardPE: parseNum(raw.ForwardPE),
            priceToBook: parseNum(raw.PriceToBookRatio),
            priceToSales: parseNum(raw.PriceToSalesRatioTTM),
            evToRevenue: parseNum(raw.EVToRevenue),
            evToEbitda: parseNum(raw.EVToEBITDA),
            bookValue: parseNum(raw.BookValue),
            
            // Profitability
            eps: parseNum(raw.EPS),
            dilutedEps: parseNum(raw.DilutedEPSTTM),
            profitMargin: parseNum(raw.ProfitMargin),
            operatingMargin: parseNum(raw.OperatingMarginTTM),
            returnOnAssets: parseNum(raw.ReturnOnAssetsTTM),
            returnOnEquity: parseNum(raw.ReturnOnEquityTTM),
            
            // Revenue & Growth
            revenueTTM: parseNum(raw.RevenueTTM),
            revenuePerShare: parseNum(raw.RevenuePerShareTTM),
            grossProfitTTM: parseNum(raw.GrossProfitTTM),
            ebitda: parseNum(raw.EBITDA),
            quarterlyEarningsGrowth: parseNum(raw.QuarterlyEarningsGrowthYOY),
            quarterlyRevenueGrowth: parseNum(raw.QuarterlyRevenueGrowthYOY),
            
            // Dividends
            dividendPerShare: parseNum(raw.DividendPerShare),
            dividendYield: parseNum(raw.DividendYield),
            exDividendDate: raw.ExDividendDate !== 'None' ? raw.ExDividendDate : null,
            
            // Price & Risk
            beta: parseNum(raw.Beta),
            high52Week: parseNum(raw['52WeekHigh']),
            low52Week: parseNum(raw['52WeekLow']),
            movingAvg50: parseNum(raw['50DayMovingAverage']),
            movingAvg200: parseNum(raw['200DayMovingAverage']),
            
            // Ownership
            sharesOutstanding: parseNum(raw.SharesOutstanding),
            sharesFloat: parseNum(raw.SharesFloat),
            percentInsiders: parseNum(raw.PercentInsiders),
            percentInstitutions: parseNum(raw.PercentInstitutions),
            
            // Dates
            fiscalYearEnd: raw.FiscalYearEnd,
            latestQuarter: raw.LatestQuarter
        };
    },

    /**
     * Parse Balance Sheet API response
     */
    parseBalanceSheetData(raw) {
        const parseNum = (val) => {
            if (!val || val === 'None' || val === '-') return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };
        
        const totalCurrentAssets = parseNum(raw.totalCurrentAssets) || 
            (parseNum(raw.cashAndShortTermInvestments) || 0) + 
            (parseNum(raw.inventory) || 0) + 
            (parseNum(raw.currentNetReceivables) || 0) +
            (parseNum(raw.otherCurrentAssets) || 0);
        
        const totalAssets = parseNum(raw.totalAssets) || 
            totalCurrentAssets + (parseNum(raw.totalNonCurrentAssets) || 0);
        
        return {
            fiscalDate: raw.fiscalDateEnding,
            
            // Assets
            totalAssets,
            totalCurrentAssets,
            totalNonCurrentAssets: parseNum(raw.totalNonCurrentAssets),
            cashAndShortTerm: parseNum(raw.cashAndShortTermInvestments),
            inventory: parseNum(raw.inventory),
            receivables: parseNum(raw.currentNetReceivables),
            
            // Illiquid Assets (for Halal scoring)
            propertyPlantEquipment: parseNum(raw.propertyPlantEquipment),
            intangibleAssets: parseNum(raw.intangibleAssets),
            goodwill: parseNum(raw.goodwill),
            longTermInvestments: parseNum(raw.longTermInvestments),
            get totalIlliquidAssets() {
                return (this.propertyPlantEquipment || 0) + 
                       (this.intangibleAssets || 0) + 
                       (this.goodwill || 0) +
                       (this.longTermInvestments || 0);
            },
            
            // Liabilities
            totalLiabilities: parseNum(raw.totalLiabilities),
            totalCurrentLiabilities: parseNum(raw.totalCurrentLiabilities),
            totalNonCurrentLiabilities: parseNum(raw.totalNonCurrentLiabilities),
            accountsPayable: parseNum(raw.currentAccountsPayable),
            
            // Debt (for Halal scoring)
            shortTermDebt: parseNum(raw.shortTermDebt),
            longTermDebt: parseNum(raw.longTermDebt) || parseNum(raw.longTermDebtNoncurrent),
            totalDebt: parseNum(raw.shortLongTermDebtTotal),
            capitalLeaseObligations: parseNum(raw.capitalLeaseObligations),
            get interestBearingDebt() {
                // Total interest-bearing debt = short-term + long-term debt
                return (this.shortTermDebt || 0) + (this.longTermDebt || 0) + (this.totalDebt || 0);
            },
            
            // Equity
            totalShareholderEquity: parseNum(raw.totalShareholderEquity),
            retainedEarnings: parseNum(raw.retainedEarnings),
            commonStock: parseNum(raw.commonStock),
            sharesOutstanding: parseNum(raw.commonStockSharesOutstanding),
            
            // Calculated metrics
            get netLiquidAssets() {
                // Current Assets - Current Liabilities
                return (this.totalCurrentAssets || 0) - (this.totalCurrentLiabilities || 0);
            },
            get debtToAssetRatio() {
                if (!this.totalAssets) return null;
                return ((this.interestBearingDebt || 0) / this.totalAssets) * 100;
            },
            get illiquidToAssetRatio() {
                if (!this.totalAssets) return null;
                return (this.totalIlliquidAssets / this.totalAssets) * 100;
            }
        };
    },

    /**
     * Parse Income Statement API response
     */
    parseIncomeStatementData(raw) {
        const parseNum = (val) => {
            if (!val || val === 'None' || val === '-') return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };
        
        return {
            fiscalDate: raw.fiscalDateEnding,
            
            // Revenue
            totalRevenue: parseNum(raw.totalRevenue),
            grossProfit: parseNum(raw.grossProfit),
            costOfRevenue: parseNum(raw.costOfRevenue),
            
            // Income
            operatingIncome: parseNum(raw.operatingIncome),
            netIncome: parseNum(raw.netIncome),
            ebit: parseNum(raw.ebit),
            ebitda: parseNum(raw.ebitda),
            
            // Interest (for Halal scoring - haram income check)
            interestIncome: parseNum(raw.interestIncome),
            interestExpense: parseNum(raw.interestExpense),
            get haramIncomePercent() {
                // Interest income as % of total revenue
                if (!this.totalRevenue || !this.interestIncome) return 0;
                return (this.interestIncome / this.totalRevenue) * 100;
            },
            
            // Expenses
            operatingExpenses: parseNum(raw.operatingExpenses),
            researchDevelopment: parseNum(raw.researchAndDevelopment),
            sellingGeneralAdmin: parseNum(raw.sellingGeneralAndAdministrative),
            
            // Per Share
            eps: parseNum(raw.reportedEPS),
            
            // Margins (calculated)
            get grossMargin() {
                if (!this.totalRevenue || !this.grossProfit) return null;
                return (this.grossProfit / this.totalRevenue) * 100;
            },
            get operatingMargin() {
                if (!this.totalRevenue || !this.operatingIncome) return null;
                return (this.operatingIncome / this.totalRevenue) * 100;
            },
            get netMargin() {
                if (!this.totalRevenue || !this.netIncome) return null;
                return (this.netIncome / this.totalRevenue) * 100;
            }
        };
    },

    /**
     * Combine all data sources for comprehensive analysis
     */
    combineData(overview, balance, income) {
        if (!overview) return null;
        
        const combined = {
            // Basic Info
            ticker: overview.symbol,
            name: overview.name,
            sector: overview.sector,
            industry: overview.industry,
            
            // Analyst Consensus (THE KEY DATA!)
            analyst: overview.analyst,
            
            // Market Data
            marketCap: overview.marketCap,
            beta: overview.beta,
            high52Week: overview.high52Week,
            low52Week: overview.low52Week,
            
            // Halal Scoring Data
            halalData: {
                businessActivity: null, // Must come from Musaffa or AI
                haramIncomePercent: income?.haramIncomePercent || 0,
                interestBearingDebt: balance?.interestBearingDebt || 0,
                totalAssets: balance?.totalAssets || overview.marketCap, // Fallback
                illiquidAssets: balance?.totalIlliquidAssets || null,
                netLiquidAssets: balance?.netLiquidAssets || null,
                marketCap: overview.marketCap,
                grossRevenue: income?.totalRevenue || overview.revenueTTM,
                
                // Pre-calculated ratios
                debtRatio: balance?.debtToAssetRatio || null,
                illiquidRatio: balance?.illiquidToAssetRatio || null,
                liquidToMarketCapRatio: balance && overview.marketCap ? 
                    (balance.netLiquidAssets / overview.marketCap) * 100 : null
            },
            
            // Financial Health
            financials: {
                revenueTTM: overview.revenueTTM,
                profitMargin: overview.profitMargin,
                operatingMargin: overview.operatingMargin,
                returnOnEquity: overview.returnOnEquity,
                returnOnAssets: overview.returnOnAssets,
                eps: overview.eps,
                peRatio: overview.peRatio,
                priceToBook: overview.priceToBook,
                dividendYield: overview.dividendYield
            },
            
            // Ownership
            ownership: {
                insiders: overview.percentInsiders,
                institutions: overview.percentInstitutions,
                sharesOutstanding: overview.sharesOutstanding,
                sharesFloat: overview.sharesFloat
            },
            
            // Data freshness
            dataDate: {
                overview: overview.latestQuarter,
                balanceSheet: balance?.fiscalDate || null,
                incomeStatement: income?.fiscalDate || null
            }
        };
        
        return combined;
    },

    /**
     * Generate analyst consensus HTML for display
     */
    generateAnalystHTML(analyst, currentPrice) {
        if (!analyst || analyst.totalAnalysts === 0) {
            return `<div style="color: #71717a; font-size: 12px;">No analyst coverage available</div>`;
        }
        
        const targetPrice = analyst.targetPrice;
        const upside = targetPrice && currentPrice ? 
            ((targetPrice - currentPrice) / currentPrice * 100).toFixed(1) : null;
        const upsideColor = upside > 0 ? '#4ade80' : upside < 0 ? '#f87171' : '#71717a';
        
        // Rating bar visualization
        const total = analyst.totalAnalysts;
        const buyWidth = ((analyst.strongBuy + analyst.buy) / total * 100).toFixed(0);
        const holdWidth = (analyst.hold / total * 100).toFixed(0);
        const sellWidth = ((analyst.sell + analyst.strongSell) / total * 100).toFixed(0);
        
        // Consensus color
        const consensusColor = analyst.consensus === 'Buy' ? '#4ade80' : 
                              analyst.consensus === 'Sell' ? '#f87171' : '#eab308';
        
        return `
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
                        ${upside !== null ? `<div style="font-size: 11px; color: ${upsideColor};">${upside > 0 ? '+' : ''}${upside}%</div>` : ''}
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
    },

    /**
     * Quick fetch of key financial ratios only (PE, PEG, EPS, Growth)
     * Uses Overview endpoint which has all the data we need
     * @param {string} ticker - Stock symbol
     * @returns {Promise<Object>} - Key ratios data
     */
    async fetchKeyRatios(ticker) {
        const result = await this.fetchOverview(ticker);
        
        if (!result.success) {
            return result;
        }

        const ov = result.data;
        
        return {
            success: true,
            fromCache: result.fromCache,
            data: {
                ticker: ov.symbol,
                name: ov.name,
                sector: ov.sector,
                
                // Valuation
                peRatio: ov.peRatio,
                forwardPE: ov.forwardPE,
                pegRatio: ov.pegRatio,
                priceToBook: ov.priceToBook,
                priceToSales: ov.priceToSales,
                
                // Earnings
                eps: ov.eps,
                dilutedEps: ov.dilutedEps,
                quarterlyEarningsGrowth: ov.quarterlyEarningsGrowth,
                quarterlyRevenueGrowth: ov.quarterlyRevenueGrowth,
                
                // Profitability
                profitMargin: ov.profitMargin,
                operatingMargin: ov.operatingMargin,
                returnOnEquity: ov.returnOnEquity,
                returnOnAssets: ov.returnOnAssets,
                
                // Revenue
                revenueTTM: ov.revenueTTM,
                grossProfitTTM: ov.grossProfitTTM,
                
                // Dividend
                dividendYield: ov.dividendYield,
                dividendPerShare: ov.dividendPerShare,
                exDividendDate: ov.exDividendDate,
                
                // Market Data
                marketCap: ov.marketCap,
                beta: ov.beta,
                high52Week: ov.high52Week,
                low52Week: ov.low52Week,
                
                // Analyst
                analyst: ov.analyst,
                
                // Ownership
                percentInsiders: ov.percentInsiders,
                percentInstitutions: ov.percentInstitutions,
                
                // Meta
                latestQuarter: ov.latestQuarter,
                fiscalYearEnd: ov.fiscalYearEnd
            }
        };
    },

    /**
     * Render key ratios as compact HTML (for sidebar)
     * @param {Object} ratios - From fetchKeyRatios
     * @param {boolean} compact - Use compact layout
     * @returns {string} HTML string
     */
    renderKeyRatiosHTML(ratios, compact = true) {
        if (!ratios) {
            return `<div style="color: #71717a; font-size: 11px; text-align: center; padding: 10px;">No financial data</div>`;
        }

        const formatNum = (v, suffix = '') => {
            if (v === null || v === undefined) return 'N/A';
            if (typeof v === 'number') {
                if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B${suffix}`;
                if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M${suffix}`;
                return v.toFixed(2) + suffix;
            }
            return v;
        };

        const formatPct = (v) => {
            if (v === null || v === undefined) return 'N/A';
            return `${(v * 100).toFixed(1)}%`;
        };

        const getRatioColor = (value, type) => {
            if (value === null || value === undefined) return '#71717a';
            
            switch(type) {
                case 'pe':
                    if (value < 0) return '#ef4444';
                    if (value < 15) return '#22c55e';
                    if (value > 30) return '#ef4444';
                    return '#facc15';
                case 'peg':
                    if (value < 1) return '#22c55e';
                    if (value > 2) return '#ef4444';
                    return '#facc15';
                case 'growth':
                    if (value > 0.15) return '#22c55e';
                    if (value < 0) return '#ef4444';
                    return '#facc15';
                case 'margin':
                    if (value > 0.15) return '#22c55e';
                    if (value < 0.05) return '#ef4444';
                    return '#facc15';
                default:
                    return value > 0 ? '#22c55e' : '#ef4444';
            }
        };

        if (compact) {
            return `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px;">
                    <div style="background: #27272a; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 9px; color: #71717a;">P/E</div>
                        <div style="font-size: 14px; font-weight: 600; color: ${getRatioColor(ratios.peRatio, 'pe')};">
                            ${ratios.peRatio ? ratios.peRatio.toFixed(1) : 'N/A'}
                        </div>
                    </div>
                    <div style="background: #27272a; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 9px; color: #71717a;">PEG</div>
                        <div style="font-size: 14px; font-weight: 600; color: ${getRatioColor(ratios.pegRatio, 'peg')};">
                            ${ratios.pegRatio ? ratios.pegRatio.toFixed(2) : 'N/A'}
                        </div>
                    </div>
                    <div style="background: #27272a; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 9px; color: #71717a;">EPS</div>
                        <div style="font-size: 14px; font-weight: 600; color: ${getRatioColor(ratios.eps, 'eps')};">
                            ${ratios.eps ? '$' + ratios.eps.toFixed(2) : 'N/A'}
                        </div>
                    </div>
                    <div style="background: #27272a; border-radius: 6px; padding: 8px; text-align: center;">
                        <div style="font-size: 9px; color: #71717a;">Growth</div>
                        <div style="font-size: 14px; font-weight: 600; color: ${getRatioColor(ratios.quarterlyEarningsGrowth, 'growth')};">
                            ${formatPct(ratios.quarterlyEarningsGrowth)}
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 4px; margin-top: 6px; justify-content: space-between;">
                    <div style="flex: 1; text-align: center; padding: 4px; background: #18181b; border-radius: 4px;">
                        <div style="font-size: 8px; color: #52525b;">Margin</div>
                        <div style="font-size: 10px; font-weight: 500; color: ${getRatioColor(ratios.profitMargin, 'margin')};">
                            ${formatPct(ratios.profitMargin)}
                        </div>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 4px; background: #18181b; border-radius: 4px;">
                        <div style="font-size: 8px; color: #52525b;">ROE</div>
                        <div style="font-size: 10px; font-weight: 500; color: ${getRatioColor(ratios.returnOnEquity, 'margin')};">
                            ${formatPct(ratios.returnOnEquity)}
                        </div>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 4px; background: #18181b; border-radius: 4px;">
                        <div style="font-size: 8px; color: #52525b;">Div</div>
                        <div style="font-size: 10px; font-weight: 500; color: ${ratios.dividendYield ? '#60a5fa' : '#71717a'};">
                            ${formatPct(ratios.dividendYield)}
                        </div>
                    </div>
                </div>
            `;
        }

        // Full layout
        return `
            <div style="background: #18181b; border: 1px solid #27272a; border-radius: 10px; padding: 12px;">
                <div style="font-size: 10px; font-weight: 600; color: #71717a; text-transform: uppercase; margin-bottom: 10px;">
                    📊 Financial Ratios
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: #71717a;">P/E Ratio</div>
                        <div style="font-size: 16px; font-weight: 600; color: ${getRatioColor(ratios.peRatio, 'pe')};">
                            ${ratios.peRatio ? ratios.peRatio.toFixed(1) : 'N/A'}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: #71717a;">PEG Ratio</div>
                        <div style="font-size: 16px; font-weight: 600; color: ${getRatioColor(ratios.pegRatio, 'peg')};">
                            ${ratios.pegRatio ? ratios.pegRatio.toFixed(2) : 'N/A'}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 9px; color: #71717a;">EPS (TTM)</div>
                        <div style="font-size: 16px; font-weight: 600; color: ${getRatioColor(ratios.eps, 'eps')};">
                            ${ratios.eps ? '$' + ratios.eps.toFixed(2) : 'N/A'}
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #27272a;">
                    <div style="text-align: center;">
                        <div style="font-size: 8px; color: #52525b;">Growth</div>
                        <div style="font-size: 11px; font-weight: 500; color: ${getRatioColor(ratios.quarterlyEarningsGrowth, 'growth')};">
                            ${formatPct(ratios.quarterlyEarningsGrowth)}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 8px; color: #52525b;">Margin</div>
                        <div style="font-size: 11px; font-weight: 500; color: ${getRatioColor(ratios.profitMargin, 'margin')};">
                            ${formatPct(ratios.profitMargin)}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 8px; color: #52525b;">ROE</div>
                        <div style="font-size: 11px; font-weight: 500; color: ${getRatioColor(ratios.returnOnEquity, 'margin')};">
                            ${formatPct(ratios.returnOnEquity)}
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 8px; color: #52525b;">Div Yield</div>
                        <div style="font-size: 11px; font-weight: 500; color: ${ratios.dividendYield ? '#60a5fa' : '#71717a'};">
                            ${formatPct(ratios.dividendYield)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Compare AI decision with analyst consensus and return warning if mismatch
     */
    compareWithAnalystConsensus(aiDecision, analystData, targetPrice, currentPrice) {
        if (!analystData || analystData.totalAnalysts === 0) {
            return null; // No analyst data to compare
        }
        
        const consensus = analystData.consensus;
        const aiNormalized = aiDecision?.toLowerCase().includes('buy') ? 'Buy' :
                           aiDecision?.toLowerCase().includes('sell') ? 'Sell' : 'Hold';
        
        // Check for major conflicts
        const isMajorConflict = (aiNormalized === 'Buy' && consensus === 'Sell') ||
                               (aiNormalized === 'Sell' && consensus === 'Buy');
        
        const isMinorConflict = (aiNormalized === 'Buy' && consensus === 'Hold') ||
                               (aiNormalized === 'Sell' && consensus === 'Hold') ||
                               (aiNormalized === 'Hold' && consensus !== 'Hold');
        
        // Check target price conflict
        let targetConflict = null;
        if (targetPrice && currentPrice) {
            const upside = (targetPrice - currentPrice) / currentPrice * 100;
            if (aiNormalized === 'Buy' && upside < -10) {
                targetConflict = `AI recommends BUY but target ($${targetPrice.toFixed(2)}) is ${Math.abs(upside).toFixed(0)}% below current price`;
            } else if (aiNormalized === 'Sell' && upside > 10) {
                targetConflict = `AI recommends SELL but target ($${targetPrice.toFixed(2)}) is ${upside.toFixed(0)}% above current price`;
            }
        }
        
        if (!isMajorConflict && !isMinorConflict && !targetConflict) {
            return null;
        }
        
        return {
            severity: isMajorConflict ? 'HIGH' : 'MEDIUM',
            aiDecision: aiNormalized,
            analystConsensus: consensus,
            analystCount: analystData.totalAnalysts,
            targetPrice,
            targetConflict,
            message: isMajorConflict ? 
                `⚠️ MAJOR CONFLICT: AI says ${aiNormalized.toUpperCase()} but ${analystData.totalAnalysts} analyst${analystData.totalAnalysts > 1 ? 's' : ''} say ${consensus.toUpperCase()}` :
                `ℹ️ AI says ${aiNormalized.toUpperCase()}, analysts say ${consensus.toUpperCase()}`
        };
    }
};

// Make available globally
window.SniperAlphaVantage = SniperAlphaVantage;

