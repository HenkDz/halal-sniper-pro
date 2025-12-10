// =========================================================================
// 🕌 HALAL SCORER MODULE - Comprehensive Sharia Compliance Scoring
// Based on Islamic Finance Guru methodology (Mufti Taqi Usmani criteria)
// https://www.islamicfinanceguru.com/articles/how-to-screen-for-halal-sharia-compliant-shares
// =========================================================================

const SniperHalalScorer = {
    /**
     * Calculate comprehensive halal score based on IFG 5-criteria methodology
     * @param {Object} data - Financial and business data for the company
     * @returns {Object} - Score breakdown and overall compliance status
     */
    calculateHalalScore(data) {
        const {
            ticker,
            companyName,
            businessActivity, // 'HALAL', 'HARAM', 'DOUBTFUL', or null
            haramIncomePercent, // % of revenue from haram sources (must be <5%)
            interestBearingDebt, // Total interest-bearing debt
            totalAssets, // Total assets
            illiquidAssets, // Illiquid assets (real estate, etc.)
            netLiquidAssets, // Current assets - current liabilities
            marketCap, // Market capitalization
            grossRevenue // Gross revenue for haram income calculation
        } = data;

        const criteria = {
            business: this.checkBusinessActivity(businessActivity),
            haramIncome: this.checkHaramIncome(haramIncomePercent),
            debtRatio: this.checkDebtRatio(interestBearingDebt, totalAssets),
            illiquidRatio: this.checkIlliquidRatio(illiquidAssets, totalAssets),
            liquidAssets: this.checkLiquidAssets(netLiquidAssets, marketCap)
        };

        // Calculate overall score (0-100)
        // Each criterion contributes equally (20 points each)
        let score = 0;
        let passedCriteria = 0;
        const totalCriteria = 5;

        if (criteria.business.passed) {
            score += 20;
            passedCriteria++;
        }
        if (criteria.haramIncome.passed) {
            score += 20;
            passedCriteria++;
        }
        if (criteria.debtRatio.passed) {
            score += 20;
            passedCriteria++;
        }
        if (criteria.illiquidRatio.passed) {
            score += 20;
            passedCriteria++;
        }
        if (criteria.liquidAssets.passed) {
            score += 20;
            passedCriteria++;
        }

        // Determine overall status
        let status = 'UNKNOWN';
        if (passedCriteria === totalCriteria) {
            status = 'HALAL';
        } else if (criteria.business.status === 'HARAM') {
            status = 'NOT_HALAL';
        } else if (passedCriteria >= 3) {
            status = 'DOUBTFUL';
        } else {
            status = 'NOT_HALAL';
        }

        // Calculate purification percentage if haram income exists
        const purificationPercent = criteria.haramIncome.passed 
            ? null 
            : (haramIncomePercent || 0);

        return {
            score: Math.round(score),
            status,
            passedCriteria,
            totalCriteria,
            criteria,
            purificationPercent,
            breakdown: this.generateBreakdown(criteria, score, status)
        };
    },

    /**
     * Criterion 1: Business Activity Check
     * Main business must be halal (no alcohol, gambling, pork, etc.)
     */
    checkBusinessActivity(businessActivity) {
        if (!businessActivity) {
            return {
                passed: false,
                status: 'UNKNOWN',
                message: 'Business activity not verified',
                threshold: 'Must be halal',
                value: null
            };
        }

        const passed = businessActivity === 'HALAL';
        return {
            passed,
            status: businessActivity,
            message: passed 
                ? 'Business activities are halal compliant' 
                : 'Business activities contain haram elements',
            threshold: 'Must be halal',
            value: businessActivity
        };
    },

    /**
     * Criterion 2: Haram Income Check
     * Income from non-sharia compliant investments must be <5% of gross revenue
     */
    checkHaramIncome(haramIncomePercent) {
        if (haramIncomePercent === null || haramIncomePercent === undefined) {
            return {
                passed: false,
                status: 'UNKNOWN',
                message: 'Haram income data not available',
                threshold: '<5% of gross revenue',
                value: null
            };
        }

        const passed = haramIncomePercent < 5;
        return {
            passed,
            status: passed ? 'PASS' : 'FAIL',
            message: passed
                ? `Haram income is ${haramIncomePercent.toFixed(2)}% (within limit)`
                : `Haram income is ${haramIncomePercent.toFixed(2)}% (exceeds 5% limit)`,
            threshold: '<5% of gross revenue',
            value: haramIncomePercent,
            note: passed 
                ? null 
                : `Purification required: Give ${haramIncomePercent.toFixed(2)}% of profits to charity`
        };
    },

    /**
     * Criterion 3: Debt Ratio Check
     * Interest-bearing debt must be <33% of total assets
     * NOTE: interestBearingDebt = 0 is VALID (means no debt, which passes!)
     */
    checkDebtRatio(interestBearingDebt, totalAssets) {
        // FIXED: Use explicit null check - 0 debt is valid and should pass!
        if (interestBearingDebt == null || totalAssets == null || totalAssets === 0) {
            return {
                passed: false,
                status: 'UNKNOWN',
                message: 'Debt ratio data not available',
                threshold: '<33% of total assets',
                value: null
            };
        }

        const ratio = (interestBearingDebt / totalAssets) * 100;
        const passed = ratio < 33;
        
        return {
            passed,
            status: passed ? 'PASS' : 'FAIL',
            message: passed
                ? `Debt ratio is ${ratio.toFixed(2)}% (within limit)`
                : `Debt ratio is ${ratio.toFixed(2)}% (exceeds 33% limit)`,
            threshold: '<33% of total assets',
            value: ratio,
            raw: {
                debt: interestBearingDebt,
                assets: totalAssets
            }
        };
    },

    /**
     * Criterion 4: Illiquid Assets Ratio Check
     * Illiquid assets must be >20% of total assets
     */
    checkIlliquidRatio(illiquidAssets, totalAssets) {
        if (!illiquidAssets || !totalAssets) {
            return {
                passed: false,
                status: 'UNKNOWN',
                message: 'Illiquid assets data not available',
                threshold: '>20% of total assets',
                value: null
            };
        }

        const ratio = (illiquidAssets / totalAssets) * 100;
        const passed = ratio > 20;
        
        return {
            passed,
            status: passed ? 'PASS' : 'FAIL',
            message: passed
                ? `Illiquid assets are ${ratio.toFixed(2)}% (meets requirement)`
                : `Illiquid assets are ${ratio.toFixed(2)}% (below 20% requirement)`,
            threshold: '>20% of total assets',
            value: ratio,
            raw: {
                illiquid: illiquidAssets,
                assets: totalAssets
            }
        };
    },

    /**
     * Criterion 5: Liquid Assets vs Market Cap Check
     * Net liquid assets should be less than market capitalization
     */
    checkLiquidAssets(netLiquidAssets, marketCap) {
        if (!netLiquidAssets || !marketCap) {
            return {
                passed: false,
                status: 'UNKNOWN',
                message: 'Liquid assets data not available',
                threshold: 'Net liquid assets < market cap',
                value: null
            };
        }

        const passed = netLiquidAssets < marketCap;
        
        return {
            passed,
            status: passed ? 'PASS' : 'FAIL',
            message: passed
                ? `Net liquid assets (${this.formatMoney(netLiquidAssets)}) are less than market cap (${this.formatMoney(marketCap)})`
                : `Net liquid assets (${this.formatMoney(netLiquidAssets)}) exceed market cap (${this.formatMoney(marketCap)})`,
            threshold: 'Net liquid assets < market cap',
            value: {
                netLiquid: netLiquidAssets,
                marketCap: marketCap,
                ratio: (netLiquidAssets / marketCap) * 100
            }
        };
    },

    /**
     * Generate human-readable breakdown of the score
     */
    generateBreakdown(criteria, score, status) {
        const breakdown = [];
        
        breakdown.push(`## Halal Compliance Score: ${score}/100`);
        breakdown.push(`**Status:** ${status}`);
        breakdown.push(`**Criteria Passed:** ${Object.values(criteria).filter(c => c.passed).length}/5\n`);

        breakdown.push('### Criterion Breakdown:\n');
        
        const criterionNames = [
            { key: 'business', name: '1. Business Activity' },
            { key: 'haramIncome', name: '2. Haram Income (<5% of revenue)' },
            { key: 'debtRatio', name: '3. Interest-Bearing Debt (<33% of assets)' },
            { key: 'illiquidRatio', name: '4. Illiquid Assets (>20% of assets)' },
            { key: 'liquidAssets', name: '5. Net Liquid Assets (< market cap)' }
        ];

        criterionNames.forEach(({ key, name }) => {
            const criterion = criteria[key];
            const icon = criterion.passed ? '✅' : criterion.status === 'UNKNOWN' ? '❓' : '❌';
            breakdown.push(`${icon} **${name}**`);
            breakdown.push(`   ${criterion.message}`);
            if (criterion.value !== null && criterion.value !== undefined) {
                if (typeof criterion.value === 'number') {
                    breakdown.push(`   Value: ${criterion.value.toFixed(2)}%`);
                } else if (typeof criterion.value === 'object') {
                    breakdown.push(`   Details: ${JSON.stringify(criterion.value, null, 2)}`);
                } else {
                    breakdown.push(`   Value: ${criterion.value}`);
                }
            }
            if (criterion.note) {
                breakdown.push(`   ⚠️ ${criterion.note}`);
            }
            breakdown.push('');
        });

        if (criteria.haramIncome.note) {
            breakdown.push('### ⚠️ Purification Required');
            breakdown.push(criteria.haramIncome.note);
            breakdown.push('You must give this percentage of your profits (dividends + capital gains) to charity.');
        }

        return breakdown.join('\n');
    },

    /**
     * Format money for display
     */
    formatMoney(amount) {
        if (amount >= 1e9) return `$${(amount / 1e9).toFixed(2)}B`;
        if (amount >= 1e6) return `$${(amount / 1e6).toFixed(2)}M`;
        if (amount >= 1e3) return `$${(amount / 1e3).toFixed(2)}K`;
        return `$${amount.toFixed(2)}`;
    },

    /**
     * Fetch financial data from SEC filings or financial APIs
     * This is a placeholder - implement actual data fetching logic
     */
    async fetchFinancialData(ticker) {
        // TODO: Implement actual data fetching
        // Options:
        // 1. SEC EDGAR API (https://www.sec.gov/edgar/sec-api-documentation)
        // 2. Financial modeling prep API (https://financialmodelingprep.com/)
        // 3. Alpha Vantage API
        // 4. Yahoo Finance scraping
        // 5. Company annual reports parsing
        
        console.log(`📊 Fetching financial data for ${ticker}`);
        
        // Placeholder return
        return {
            ticker,
            companyName: null,
            businessActivity: null,
            haramIncomePercent: null,
            interestBearingDebt: null,
            totalAssets: null,
            illiquidAssets: null,
            netLiquidAssets: null,
            marketCap: null,
            grossRevenue: null
        };
    },

    /**
     * Extract business activity from AI analysis or Musaffa data
     */
    extractBusinessActivity(aiAnalysis, musaffaStatus) {
        // Priority: Musaffa status > AI analysis
        if (musaffaStatus) {
            if (musaffaStatus === 'HALAL') return 'HALAL';
            if (musaffaStatus === 'NOT_HALAL') return 'HARAM';
            if (musaffaStatus === 'DOUBTFUL') return 'DOUBTFUL';
        }

        // Try to extract from AI analysis
        if (aiAnalysis) {
            const lowerAnalysis = aiAnalysis.toLowerCase();
            if (lowerAnalysis.includes('halal') && !lowerAnalysis.includes('not halal')) {
                return 'HALAL';
            }
            if (lowerAnalysis.includes('haram') || lowerAnalysis.includes('not halal')) {
                return 'HARAM';
            }
        }

        return null;
    }
};

// Make available globally
window.SniperHalalScorer = SniperHalalScorer;

