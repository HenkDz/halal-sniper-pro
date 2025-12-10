// =========================================================================
// 📋 REPORT TEMPLATES MODULE - Pre-made Report Designs
// Based on user feedback: concise, scannable reports for screening 10-20 stocks/day
// =========================================================================

const SniperTemplates = {
    // Available templates
    TEMPLATES: {
        quick: {
            id: 'quick',
            name: 'Quick Scan',
            icon: '⚡',
            description: 'Compliance + Score + Verdict only',
            sections: {
                header: true,
                score: true,
                compliance: true,
                financials: false,
                signals: false,
                insiderStats: false,
                aiAnalysis: false,
                links: true
            },
            defaultCollapsed: [],
            pdfPages: 1
        },
        fundamentals: {
            id: 'fundamentals',
            name: 'Fundamentals',
            icon: '📊',
            description: 'Compliance + Ratios + Earnings',
            sections: {
                header: true,
                score: true,
                compliance: true,
                financials: true,
                signals: true,
                insiderStats: false,
                aiAnalysis: false,
                links: true
            },
            defaultCollapsed: ['insiderStats'],
            pdfPages: 2
        },
        full: {
            id: 'full',
            name: 'Full Analysis',
            icon: '📑',
            description: 'Everything (current behavior)',
            sections: {
                header: true,
                score: true,
                compliance: true,
                financials: true,
                signals: true,
                insiderStats: true,
                aiAnalysis: true,
                links: true
            },
            defaultCollapsed: ['insiderStats'],
            pdfPages: 'auto'
        },
        news: {
            id: 'news',
            name: 'News Focus',
            icon: '📰',
            description: 'Compliance + News Summary',
            sections: {
                header: true,
                score: true,
                compliance: true,
                financials: false,
                signals: false,
                insiderStats: false,
                aiAnalysis: true, // Uses news-focused AI mode
                links: true
            },
            defaultCollapsed: [],
            aiMode: 'news', // Special AI mode for news summary
            pdfPages: 2
        }
    },

    // Default template for new users
    DEFAULT_TEMPLATE: 'fundamentals',

    /**
     * Get the current user's preferred template
     * @returns {string} Template ID
     */
    getCurrentTemplate() {
        return SniperStorage.getSetting('preferred_template', this.DEFAULT_TEMPLATE);
    },

    /**
     * Set the user's preferred template
     * @param {string} templateId - Template ID
     */
    async setCurrentTemplate(templateId) {
        if (!this.TEMPLATES[templateId]) {
            console.warn(`Invalid template: ${templateId}, using default`);
            templateId = this.DEFAULT_TEMPLATE;
        }
        await SniperStorage.setSetting('preferred_template', templateId);
        console.log(`📋 Template set to: ${templateId}`);
    },

    /**
     * Get template configuration by ID
     * @param {string} templateId - Template ID
     * @returns {Object} Template configuration
     */
    getTemplate(templateId) {
        return this.TEMPLATES[templateId] || this.TEMPLATES[this.DEFAULT_TEMPLATE];
    },

    /**
     * Get all available templates
     * @returns {Object} All templates
     */
    getAllTemplates() {
        return this.TEMPLATES;
    },

    /**
     * Check if a section should be visible for the current template
     * @param {string} sectionId - Section ID
     * @param {string} templateId - Optional template ID (uses current if not provided)
     * @returns {boolean}
     */
    isSectionVisible(sectionId, templateId = null) {
        const template = this.getTemplate(templateId || this.getCurrentTemplate());
        return template.sections[sectionId] !== false;
    },

    /**
     * Check if a section should be collapsed by default
     * @param {string} sectionId - Section ID
     * @param {string} templateId - Optional template ID
     * @returns {boolean}
     */
    isSectionCollapsed(sectionId, templateId = null) {
        const template = this.getTemplate(templateId || this.getCurrentTemplate());
        return template.defaultCollapsed.includes(sectionId);
    },

    /**
     * Get the AI mode for a template (for news-focused analysis)
     * @param {string} templateId - Template ID
     * @returns {string|null} AI mode or null for default
     */
    getAiMode(templateId = null) {
        const template = this.getTemplate(templateId || this.getCurrentTemplate());
        return template.aiMode || null;
    },

    /**
     * Generate template selector HTML
     * @param {string} currentTemplateId - Currently selected template
     * @returns {string} HTML string
     */
    renderTemplateSelector(currentTemplateId = null) {
        const current = currentTemplateId || this.getCurrentTemplate();
        const templates = Object.values(this.TEMPLATES);

        return `
            <div class="sniper-template-selector" style="display: flex; gap: 4px; padding: 4px; background: #18181b; border-radius: 8px; border: 1px solid #27272a; margin-bottom: 12px;">
                ${templates.map(t => `
                    <button 
                        class="sniper-template-btn ${t.id === current ? 'active' : ''}" 
                        data-template="${t.id}"
                        title="${t.description}"
                        style="
                            flex: 1;
                            padding: 6px 4px;
                            border-radius: 6px;
                            font-size: 10px;
                            font-weight: 500;
                            cursor: pointer;
                            text-align: center;
                            transition: all 0.15s;
                            background: ${t.id === current ? '#27272a' : 'transparent'};
                            border: none;
                            color: ${t.id === current ? '#e4e4e7' : '#71717a'};
                            ${t.id === current ? 'box-shadow: 0 1px 2px rgba(0,0,0,0.2);' : ''}
                        "
                    >
                        <span style="font-size: 12px; display: block; margin-bottom: 2px;">${t.icon}</span>
                        ${t.name}
                    </button>
                `).join('')}
            </div>
        `;
    },

    /**
     * Attach event listeners to template selector buttons
     * @param {HTMLElement} container - Container element
     * @param {Function} onTemplateChange - Callback when template changes
     */
    attachTemplateSelectorListeners(container, onTemplateChange) {
        const buttons = container.querySelectorAll('.sniper-template-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', async () => {
                const templateId = btn.getAttribute('data-template');
                await this.setCurrentTemplate(templateId);
                
                // Update active state
                buttons.forEach(b => {
                    const isActive = b.getAttribute('data-template') === templateId;
                    b.classList.toggle('active', isActive);
                    b.style.background = isActive ? '#27272a' : 'transparent';
                    b.style.color = isActive ? '#e4e4e7' : '#71717a';
                    b.style.boxShadow = isActive ? '0 1px 2px rgba(0,0,0,0.2)' : 'none';
                });

                // Trigger callback
                if (onTemplateChange) {
                    onTemplateChange(templateId);
                }
            });
        });
    },

    /**
     * Get financial ratios display data
     * @param {Object} alphaVantageData - Data from Alpha Vantage
     * @returns {Object} Formatted ratios for display
     */
    formatFinancialRatios(alphaVantageData) {
        if (!alphaVantageData || !alphaVantageData.overview) {
            return null;
        }

        const ov = alphaVantageData.overview;
        
        return {
            // Valuation Ratios
            peRatio: {
                value: ov.peRatio,
                label: 'P/E Ratio',
                format: (v) => v ? v.toFixed(2) : 'N/A',
                color: (v) => {
                    if (!v) return '#71717a';
                    if (v < 15) return '#22c55e'; // Undervalued
                    if (v > 30) return '#ef4444'; // Expensive
                    return '#facc15'; // Fair
                },
                hint: (v) => {
                    if (!v) return 'Not available';
                    if (v < 0) return 'Negative earnings';
                    if (v < 15) return 'Undervalued';
                    if (v < 25) return 'Fair value';
                    return 'Premium valuation';
                }
            },
            pegRatio: {
                value: ov.pegRatio,
                label: 'PEG Ratio',
                format: (v) => v ? v.toFixed(2) : 'N/A',
                color: (v) => {
                    if (!v) return '#71717a';
                    if (v < 1) return '#22c55e'; // Good
                    if (v > 2) return '#ef4444'; // Expensive
                    return '#facc15';
                },
                hint: (v) => {
                    if (!v) return 'Not available';
                    if (v < 1) return 'Undervalued vs growth';
                    if (v < 2) return 'Fair for growth';
                    return 'Expensive for growth';
                }
            },
            eps: {
                value: ov.eps,
                label: 'EPS (TTM)',
                format: (v) => v ? `$${v.toFixed(2)}` : 'N/A',
                color: (v) => {
                    if (!v) return '#71717a';
                    return v > 0 ? '#22c55e' : '#ef4444';
                },
                hint: (v) => {
                    if (!v) return 'Not available';
                    return v > 0 ? 'Profitable' : 'Unprofitable';
                }
            },
            
            // Growth
            earningsGrowth: {
                value: ov.quarterlyEarningsGrowth,
                label: 'Earnings Growth',
                format: (v) => v ? `${(v * 100).toFixed(1)}%` : 'N/A',
                color: (v) => {
                    if (!v) return '#71717a';
                    if (v > 0.15) return '#22c55e';
                    if (v < 0) return '#ef4444';
                    return '#facc15';
                },
                hint: (v) => {
                    if (!v) return 'Not available';
                    if (v > 0.25) return 'Strong growth';
                    if (v > 0) return 'Growing';
                    return 'Declining';
                }
            },
            revenueGrowth: {
                value: ov.quarterlyRevenueGrowth,
                label: 'Revenue Growth',
                format: (v) => v ? `${(v * 100).toFixed(1)}%` : 'N/A',
                color: (v) => {
                    if (!v) return '#71717a';
                    if (v > 0.10) return '#22c55e';
                    if (v < 0) return '#ef4444';
                    return '#facc15';
                },
                hint: (v) => {
                    if (!v) return 'Not available';
                    if (v > 0.20) return 'High growth';
                    if (v > 0) return 'Growing';
                    return 'Declining';
                }
            },
            
            // Profitability
            profitMargin: {
                value: ov.profitMargin,
                label: 'Profit Margin',
                format: (v) => v ? `${(v * 100).toFixed(1)}%` : 'N/A',
                color: (v) => {
                    if (!v) return '#71717a';
                    if (v > 0.15) return '#22c55e';
                    if (v < 0.05) return '#ef4444';
                    return '#facc15';
                },
                hint: (v) => {
                    if (!v) return 'Not available';
                    if (v > 0.20) return 'Excellent margins';
                    if (v > 0.10) return 'Good margins';
                    if (v > 0) return 'Low margins';
                    return 'Negative margins';
                }
            },
            roe: {
                value: ov.returnOnEquity,
                label: 'ROE',
                format: (v) => v ? `${(v * 100).toFixed(1)}%` : 'N/A',
                color: (v) => {
                    if (!v) return '#71717a';
                    if (v > 0.15) return '#22c55e';
                    if (v < 0.05) return '#ef4444';
                    return '#facc15';
                },
                hint: (v) => {
                    if (!v) return 'Not available';
                    if (v > 0.20) return 'Excellent returns';
                    if (v > 0.10) return 'Good returns';
                    return 'Low returns';
                }
            },

            // Dividend
            dividendYield: {
                value: ov.dividendYield,
                label: 'Div Yield',
                format: (v) => v ? `${(v * 100).toFixed(2)}%` : 'N/A',
                color: (v) => {
                    if (!v || v === 0) return '#71717a';
                    if (v > 0.04) return '#22c55e';
                    return '#60a5fa';
                },
                hint: (v) => {
                    if (!v || v === 0) return 'No dividend';
                    if (v > 0.05) return 'High yield';
                    if (v > 0.02) return 'Moderate yield';
                    return 'Low yield';
                }
            }
        };
    },

    /**
     * Render financial ratios card HTML
     * @param {Object} ratios - Formatted ratios from formatFinancialRatios
     * @returns {string} HTML string
     */
    renderFinancialRatiosCard(ratios) {
        if (!ratios) {
            return `
                <div class="sniper-card" style="padding: 12px; text-align: center;">
                    <div style="color: #71717a; font-size: 11px;">
                        Financial data not available.<br>
                        <button id="fetch-alpha-vantage-btn" class="sniper-btn sniper-btn-secondary sniper-btn-sm" style="margin-top: 8px;">
                            📊 Fetch Data
                        </button>
                    </div>
                </div>
            `;
        }

        // Primary ratios to show
        const primaryRatios = ['peRatio', 'pegRatio', 'eps', 'earningsGrowth'];
        // Secondary ratios (shown in smaller grid)
        const secondaryRatios = ['profitMargin', 'roe', 'dividendYield'];

        return `
            <div class="sniper-card" style="padding: 8px;">
                <!-- Primary Ratios Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px;">
                    ${primaryRatios.map(key => {
                        const r = ratios[key];
                        if (!r) return '';
                        return `
                            <div style="background: #27272a; border-radius: 6px; padding: 8px; text-align: center;" title="${r.hint(r.value)}">
                                <div style="font-size: 9px; color: #71717a; margin-bottom: 2px;">${r.label}</div>
                                <div style="font-size: 14px; font-weight: 600; color: ${r.color(r.value)};">${r.format(r.value)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <!-- Secondary Ratios Row -->
                <div style="display: flex; gap: 6px; justify-content: space-between;">
                    ${secondaryRatios.map(key => {
                        const r = ratios[key];
                        if (!r) return '';
                        return `
                            <div style="flex: 1; text-align: center; padding: 4px; background: #18181b; border-radius: 4px;" title="${r.hint(r.value)}">
                                <div style="font-size: 8px; color: #52525b;">${r.label}</div>
                                <div style="font-size: 11px; font-weight: 500; color: ${r.color(r.value)};">${r.format(r.value)}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Generate a quick summary for the Quick Scan template
     * @param {Object} data - Stock analysis data
     * @returns {Object} Summary data
     */
    generateQuickSummary(data) {
        const { score, halalData, signals, stats } = data;

        // Determine verdict
        let verdict = 'WATCH';
        let verdictColor = '#facc15';
        let verdictIcon = '👀';

        if (halalData?.status === 'NOT_HALAL') {
            verdict = 'SKIP (Not Halal)';
            verdictColor = '#ef4444';
            verdictIcon = '🚫';
        } else if (score >= 75 && halalData?.status === 'HALAL') {
            verdict = 'STRONG BUY';
            verdictColor = '#22c55e';
            verdictIcon = '🚀';
        } else if (score >= 60 && halalData?.status !== 'NOT_HALAL') {
            verdict = 'BUY';
            verdictColor = '#4ade80';
            verdictIcon = '✅';
        } else if (score < 30) {
            verdict = 'AVOID';
            verdictColor = '#ef4444';
            verdictIcon = '❌';
        }

        // Key highlights (max 3)
        const highlights = [];
        if (signals?.clusterBuying) highlights.push('Cluster Buying');
        if (signals?.executiveBuys?.length > 0) highlights.push('Executive Buys');
        if (signals?.whaleTrades?.length > 0) highlights.push('Whale Activity');
        if (signals?.reversalSignal) highlights.push('Reversal Signal');

        return {
            verdict,
            verdictColor,
            verdictIcon,
            score,
            highlights: highlights.slice(0, 3),
            complianceStatus: halalData?.status || 'UNKNOWN',
            complianceGrade: halalData?.grade || null,
            netFlow: (stats?.totalBuy || 0) - (stats?.totalSell || 0),
            buyerCount: stats?.uniqueBuyers?.size || 0,
            sellerCount: stats?.uniqueSellers?.size || 0
        };
    },

    /**
     * Render quick summary card (for Quick Scan template)
     * @param {Object} summary - From generateQuickSummary
     * @returns {string} HTML string
     */
    renderQuickSummaryCard(summary) {
        const fmt = (n) => {
            if (!n && n !== 0) return '$0';
            const abs = Math.abs(n);
            if (abs >= 1000000) return (n < 0 ? '-' : '') + '$' + (abs / 1000000).toFixed(1) + 'M';
            if (abs >= 1000) return (n < 0 ? '-' : '') + '$' + (abs / 1000).toFixed(0) + 'K';
            return '$' + Math.round(n);
        };

        return `
            <div class="sniper-card" style="padding: 16px; text-align: center; background: linear-gradient(135deg, #18181b 0%, #09090b 100%); border: 1px solid #27272a;">
                <!-- Verdict -->
                <div style="font-size: 28px; margin-bottom: 8px;">${summary.verdictIcon}</div>
                <div style="font-size: 20px; font-weight: 700; color: ${summary.verdictColor}; margin-bottom: 4px;">
                    ${summary.verdict}
                </div>
                <div style="font-size: 11px; color: #71717a; margin-bottom: 16px;">
                    Score: <span style="color: ${summary.score >= 60 ? '#22c55e' : summary.score >= 40 ? '#facc15' : '#ef4444'}; font-weight: 600;">${summary.score}/100</span>
                </div>

                <!-- Quick Stats Row -->
                <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 12px;">
                    <div style="padding: 8px 12px; background: #27272a; border-radius: 6px;">
                        <div style="font-size: 9px; color: #71717a;">Net Flow</div>
                        <div style="font-size: 13px; font-weight: 600; color: ${summary.netFlow >= 0 ? '#22c55e' : '#ef4444'};">
                            ${summary.netFlow >= 0 ? '+' : ''}${fmt(summary.netFlow)}
                        </div>
                    </div>
                    <div style="padding: 8px 12px; background: #27272a; border-radius: 6px;">
                        <div style="font-size: 9px; color: #71717a;">Buyers/Sellers</div>
                        <div style="font-size: 13px; font-weight: 600;">
                            <span style="color: #22c55e;">${summary.buyerCount}</span>
                            <span style="color: #52525b;">/</span>
                            <span style="color: #ef4444;">${summary.sellerCount}</span>
                        </div>
                    </div>
                </div>

                <!-- Highlights -->
                ${summary.highlights.length > 0 ? `
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;">
                        ${summary.highlights.map(h => `
                            <span style="padding: 3px 8px; background: rgba(37,99,235,0.15); border: 1px solid rgba(37,99,235,0.3); border-radius: 4px; font-size: 9px; color: #60a5fa;">
                                ${h}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }
};

// Make available globally
window.SniperTemplates = SniperTemplates;

