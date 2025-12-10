// =========================================================================
// 🕌 MUSAFFA PAGE MODULE - Page detection and data extraction for Musaffa.com
// =========================================================================

const MusaffaPage = {
    /**
     * Detect the current page type on Musaffa.com
     * @returns {Object} Page type information
     */
    detectPageType() {
        const path = window.location.pathname;
        const url = window.location.href;

        // Stock page: /stock/TICKER
        if (path.match(/^\/stock\/[A-Za-z0-9.-]+$/i)) {
            const ticker = this.extractTickerFromUrl();
            return { type: 'stock', ticker };
        }

        // ETF page: /etf/TICKER
        if (path.match(/^\/etf\/[A-Za-z0-9.-]+$/i)) {
            const ticker = path.split('/')[2]?.toUpperCase();
            return { type: 'etf', ticker };
        }

        // Stock Screener
        if (path.includes('/stocks') || path.includes('/halal-stock-screener')) {
            return { type: 'screener', subtype: 'stocks' };
        }

        // ETF Screener
        if (path.includes('/etfs') || path.includes('/halal-etf-screener')) {
            return { type: 'screener', subtype: 'etfs' };
        }

        // Trending Halal Stocks
        if (path.includes('/trending')) {
            return { type: 'trending' };
        }

        // Collections
        if (path.includes('/collection')) {
            return { type: 'collection' };
        }

        // Watchlist
        if (path.includes('/watchlist')) {
            return { type: 'watchlist' };
        }

        // Portfolio
        if (path.includes('/portfolio')) {
            return { type: 'portfolio' };
        }

        // Super Investor Tracker
        if (path.includes('/super-investor')) {
            return { type: 'super-investor' };
        }

        // Home or unknown
        return { type: 'home' };
    },

    /**
     * Extract ticker from URL
     * @returns {string|null} Ticker symbol
     */
    extractTickerFromUrl() {
        const path = window.location.pathname;
        const match = path.match(/\/(?:stock|etf)\/([A-Za-z0-9.-]+)/i);
        return match ? match[1].toUpperCase() : null;
    },

    /**
     * Extract company information from the page
     * @returns {Object} Company info
     */
    extractCompanyInfo() {
        const info = {
            ticker: null,
            name: null,
            country: null,
            sector: null,
            marketCap: null,
            description: null,
            price: null,
            priceChange: null
        };

        try {
            // Extract ticker from URL first
            info.ticker = this.extractTickerFromUrl();

            // Extract company name from page title or header
            // Musaffa format: "Company Name Stock Analysis TICKER"
            const h1Els = document.querySelectorAll('h1');
            for (const h1 of h1Els) {
                const text = h1.textContent.trim();
                // Match pattern: "Company Name Stock Analysis TICKER"
                const match = text.match(/^(.+?)\s*Stock\s*Analysis\s*([A-Z0-9.-]+)$/i);
                if (match) {
                    info.name = match[1].trim();
                    if (!info.ticker) info.ticker = match[2].toUpperCase();
                    break;
                }
                // Or just "Company Name TICKER"
                const simpleMatch = text.match(/^(.+?)\s+([A-Z]{1,5})$/);
                if (simpleMatch && !info.name) {
                    info.name = simpleMatch[1].trim();
                }
            }

            // Alternative: Check page title
            if (!info.name) {
                const pageTitle = document.title;
                const titleMatch = pageTitle.match(/Is\s+(.+?)\s*-\s*([A-Z]+)\s*Stock/i);
                if (titleMatch) {
                    info.name = titleMatch[1].trim();
                    if (!info.ticker) info.ticker = titleMatch[2].toUpperCase();
                }
            }

            // Extract country, sector, market cap from tag-like elements
            // Look for pill/chip style elements with short text
            const allSpans = document.querySelectorAll('span, div, button');
            const countries = ['United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Japan', 'China', 'India', 'Australia'];
            const sectors = [
                'Technology', 'Information Technology', 'Healthcare', 'Health Care',
                'Financials', 'Financial Services', 'Consumer Discretionary', 
                'Consumer Staples', 'Energy', 'Utilities', 'Materials', 
                'Industrials', 'Real Estate', 'Communication Services',
                'Basic Materials', 'Consumer Cyclical', 'Consumer Defensive'
            ];
            const capTypes = ['Mega Cap', 'Large Cap', 'Mid Cap', 'Small Cap', 'Micro Cap', 'Nano Cap'];

            for (const el of allSpans) {
                const text = el.textContent.trim();
                
                // Skip if text is too long (not a tag)
                if (text.length > 50) continue;

                // Country detection
                if (!info.country) {
                    for (const country of countries) {
                        if (text === country || text.includes(country)) {
                            info.country = country;
                            break;
                        }
                    }
                    // Flag emoji detection
                    if (text.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)) {
                        // Map common flag emojis
                        if (text.includes('🇺🇸')) info.country = 'United States';
                        else if (text.includes('🇬🇧')) info.country = 'United Kingdom';
                        else if (text.includes('🇨🇦')) info.country = 'Canada';
                        else if (text.includes('🇩🇪')) info.country = 'Germany';
                        else if (text.includes('🇯🇵')) info.country = 'Japan';
                        else if (text.includes('🇨🇳')) info.country = 'China';
                        else if (text.includes('🇮🇳')) info.country = 'India';
                    }
                }

                // Sector detection
                if (!info.sector) {
                    for (const sector of sectors) {
                        if (text === sector || text.includes(sector)) {
                            info.sector = sector;
                            break;
                        }
                    }
                }

                // Market cap detection
                if (!info.marketCap) {
                    for (const cap of capTypes) {
                        if (text.includes(cap)) {
                            info.marketCap = cap;
                            break;
                        }
                    }
                }
            }

            // Extract description - first paragraph after company name
            const paragraphs = document.querySelectorAll('p');
            for (const p of paragraphs) {
                const text = p.textContent.trim();
                // Description is usually 50+ characters and talks about the company
                if (text.length > 50 && text.length < 1000 && 
                    (text.includes('company') || text.includes('business') || 
                     text.includes('engages') || text.includes('provides') ||
                     text.includes('operates') || text.includes('Inc.') || 
                     text.includes('Ltd.') || text.includes('Corporation'))) {
                    info.description = text.substring(0, 500);
                    break;
                }
            }

            // Extract price information if visible
            const priceMatch = document.body.innerText.match(/\$\s*(\d+\.?\d*)/);
            if (priceMatch) {
                info.price = parseFloat(priceMatch[1]);
            }

            // Price change percentage
            const changeMatch = document.body.innerText.match(/([+-]?\d+\.?\d*)\s*%/);
            if (changeMatch) {
                info.priceChange = parseFloat(changeMatch[1]);
            }

        } catch (e) {
            console.error('🎯 Musaffa Page: Error extracting company info:', e);
        }

        return info;
    },

    /**
     * Extract compliance status from the page
     * @returns {Object} Compliance data
     */
    extractComplianceStatus() {
        const compliance = {
            status: null, // HALAL, NOT_HALAL, DOUBTFUL
            grade: null, // A+, A, B, C, D, F
            methodology: null, // AAOIFI, etc.
            lastUpdated: null,
            reportSource: null
        };

        try {
            // Method 1: Find the Shariah Compliance section by heading
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="heading"]');
            let complianceSection = null;
            
            for (const h of headings) {
                const text = h.textContent.toLowerCase();
                if (text.includes('shariah compliance') || text.includes('sharia compliance')) {
                    // Found the compliance heading, get its parent container
                    complianceSection = h.closest('section') || h.closest('article') || h.closest('div[class*="card"]') || h.parentElement?.parentElement;
                    break;
                }
            }

            // Helper function to check status within a specific container
            const checkStatusInContainer = (container) => {
                if (!container) return null;
                
                // Priority 1: Look for large status badges/buttons with specific styling
                // These are usually the main status display
                const statusCandidates = container.querySelectorAll('div, span, button, p');
                for (const el of statusCandidates) {
                    const text = el.textContent.trim();
                    const textUpper = text.toUpperCase();
                    const style = window.getComputedStyle(el);
                    const bgColor = style.backgroundColor;
                    const fontSize = parseFloat(style.fontSize);
                    
                    // Check for exact status matches in prominent displays
                    if (text.length <= 15) {
                        // HALAL - usually green background or large text
                        if (textUpper === 'HALAL') {
                            // Check if it's styled as a status badge (green background or large font)
                            if (bgColor.includes('rgb(34, 197') || bgColor.includes('rgb(22, 163') || 
                                bgColor.includes('#22c55e') || bgColor.includes('#16a34a') ||
                                fontSize >= 18 || el.classList.toString().toLowerCase().includes('halal')) {
                                return 'HALAL';
                            }
                        }
                        // NOT HALAL - usually red background
                        if (textUpper === 'NOT HALAL' || textUpper === 'NOT_HALAL' || textUpper === 'NOTHALAL') {
                            // Check if it's styled as a status badge (red background or large font)
                            if (bgColor.includes('rgb(239, 68') || bgColor.includes('rgb(220, 38') ||
                                bgColor.includes('#ef4444') || bgColor.includes('#dc2626') ||
                                fontSize >= 18 || el.classList.toString().toLowerCase().includes('not-halal')) {
                                return 'NOT_HALAL';
                            }
                        }
                        // DOUBTFUL - usually yellow/orange background
                        if (textUpper === 'DOUBTFUL') {
                            if (bgColor.includes('rgb(250, 204') || bgColor.includes('rgb(249, 115') ||
                                bgColor.includes('#facc15') || bgColor.includes('#f97316') ||
                                fontSize >= 18 || el.classList.toString().toLowerCase().includes('doubtful')) {
                                return 'DOUBTFUL';
                            }
                        }
                    }
                }
                
                // Priority 2: Check for CSS class-based indicators within container
                const notHalalEl = container.querySelector('[class*="not-halal"], [class*="nothalal"], [class*="NOT_HALAL"]');
                if (notHalalEl && notHalalEl.textContent.trim().toUpperCase().match(/^(NOT\s*)?HALAL$/)) {
                    return 'NOT_HALAL';
                }
                
                const halalEl = container.querySelector('[class*="halal"]:not([class*="not"]):not([class*="doubtful"])');
                if (halalEl && halalEl.textContent.trim().toUpperCase() === 'HALAL') {
                    return 'HALAL';
                }
                
                const doubtfulEl = container.querySelector('[class*="doubtful"], [class*="DOUBTFUL"]');
                if (doubtfulEl && doubtfulEl.textContent.trim().toUpperCase() === 'DOUBTFUL') {
                    return 'DOUBTFUL';
                }
                
                return null;
            };

            // Method 2: Check within compliance section first (highest priority)
            if (complianceSection) {
                compliance.status = checkStatusInContainer(complianceSection);
                console.log('🎯 Musaffa Page: Found compliance section, status:', compliance.status);
                if (!compliance.status) {
                    console.log('🎯 Musaffa Page: No status found in compliance section, checking section HTML:', complianceSection.innerHTML.substring(0, 500));
                }
            } else {
                console.log('🎯 Musaffa Page: No compliance section found');
            }

            // Method 3: If not found in section, check for prominent status displays on page
            // Look for large, styled status badges (these are usually the main status)
            if (!compliance.status) {
                const allElements = document.querySelectorAll('div, span, button, p');
                const statusCandidates = [];
                
                for (const el of allElements) {
                    const text = el.textContent.trim();
                    const textUpper = text.toUpperCase();
                    const style = window.getComputedStyle(el);
                    const bgColor = style.backgroundColor;
                    const fontSize = parseFloat(style.fontSize);
                    
                    // Look for prominent status displays
                    if (text.length <= 15 && (textUpper === 'HALAL' || textUpper === 'NOT HALAL' || 
                        textUpper === 'NOT_HALAL' || textUpper === 'DOUBTFUL')) {
                        // Score by prominence (font size, background color, etc.)
                        let score = 0;
                        if (fontSize >= 18) score += 10;
                        if (bgColor.includes('rgb(34, 197') || bgColor.includes('#22c55e')) score += 5; // Green
                        if (bgColor.includes('rgb(239, 68') || bgColor.includes('#ef4444')) score += 5; // Red
                        if (el.classList.toString().toLowerCase().includes('status')) score += 5;
                        if (el.classList.toString().toLowerCase().includes('badge')) score += 5;
                        
                        if (score > 0) {
                            statusCandidates.push({ el, text: textUpper, score });
                        }
                    }
                }
                
                // Sort by score and use the most prominent one
                statusCandidates.sort((a, b) => b.score - a.score);
                if (statusCandidates.length > 0) {
                    const topCandidate = statusCandidates[0].text;
                    console.log('🎯 Musaffa Page: Found status candidate:', topCandidate, 'score:', statusCandidates[0].score);
                    if (topCandidate.includes('NOT')) {
                        compliance.status = 'NOT_HALAL';
                    } else if (topCandidate === 'DOUBTFUL') {
                        compliance.status = 'DOUBTFUL';
                    } else if (topCandidate === 'HALAL') {
                        compliance.status = 'HALAL';
                    }
                } else {
                    console.log('🎯 Musaffa Page: No prominent status candidates found');
                }
            }

            // Method 4: Fallback - Full page text search near "Shariah Compliance"
            if (!compliance.status) {
                const bodyText = document.body.innerText;
                // Look for the status near "Shariah Compliance" text
                const complianceMatch = bodyText.match(/Shariah Compliance[\s\S]{0,200}(NOT\s*HALAL|DOUBTFUL|HALAL)/i);
                if (complianceMatch) {
                    const statusText = complianceMatch[1].toUpperCase().replace(/\s+/g, '_');
                    if (statusText.includes('NOT')) {
                        compliance.status = 'NOT_HALAL';
                    } else if (statusText === 'DOUBTFUL') {
                        compliance.status = 'DOUBTFUL';
                    } else {
                        compliance.status = 'HALAL';
                    }
                }
            }

            // Extract grade (A+, A, B, C, D, F) - appears near compliance status
            const gradePattern = /\b([A-F][+-]?)\b/;
            
            // Helper function to extract grade from a container
            const extractGradeFromContainer = (container) => {
                if (!container) return null;
                
                const gradeCandidates = container.querySelectorAll('button, span, div, p');
                for (const el of gradeCandidates) {
                    const text = el.textContent.trim();
                    // Grade should be 1-2 characters (A, B, C, D, F, or A+, B+, etc.)
                    if (text.length <= 2 && gradePattern.test(text)) {
                        const match = text.match(gradePattern);
                        if (match) {
                            const grade = match[1];
                            // Verify it's styled like a badge (has border-radius, specific colors, etc.)
                            const style = window.getComputedStyle(el);
                            const borderRadius = parseInt(style.borderRadius);
                            const fontSize = parseFloat(style.fontSize);
                            
                            // Grade badges usually have styling
                            if (borderRadius > 0 || fontSize >= 12 || 
                                el.classList.toString().toLowerCase().includes('grade') ||
                                el.classList.toString().toLowerCase().includes('rating') ||
                                el.classList.toString().toLowerCase().includes('badge')) {
                                return grade;
                            }
                        }
                    }
                }
                return null;
            };

            // Priority 1: Look for grade within compliance section
            if (complianceSection) {
                compliance.grade = extractGradeFromContainer(complianceSection);
            }

            // Priority 2: Look for grade badges/buttons near compliance status
            if (!compliance.grade) {
                const gradeCandidates = document.querySelectorAll('button, span, div');
                for (const el of gradeCandidates) {
                    const text = el.textContent.trim();
                    if (text.length <= 2 && gradePattern.test(text)) {
                        const match = text.match(gradePattern);
                        if (match) {
                            // Verify it's likely a grade (near compliance info)
                            const parent = el.closest('section') || el.closest('article') || el.parentElement?.parentElement;
                            if (parent && parent.innerText.toLowerCase().includes('compliance')) {
                                compliance.grade = match[1];
                                break;
                            }
                            // Or if styled like a badge
                            const style = window.getComputedStyle(el);
                            if (style.borderRadius && parseInt(style.borderRadius) > 0) {
                                compliance.grade = match[1];
                                break;
                            }
                        }
                    }
                }
            }

            // Fallback grade from full text near compliance section
            if (!compliance.grade) {
                const searchText = complianceSection ? complianceSection.innerText : document.body.innerText;
                const gradeMatch = searchText.match(/(?:Grade|Rating|Score)?[\s:]*([A-F][+-]?)(?:\s|$)/);
                if (gradeMatch && gradeMatch[1].length <= 2) {
                    compliance.grade = gradeMatch[1];
                }
            }

            // Extract methodology (e.g., "Screening Methodology: AAOIFI")
            const methodologyMatch = document.body.innerText.match(/(?:Screening\s*)?Methodology[\s:]+(\w+)/i);
            if (methodologyMatch) {
                compliance.methodology = methodologyMatch[1].toUpperCase();
            }

            // Extract last updated date (e.g., "Last Updated: September 16, 2025")
            const lastUpdatedMatch = document.body.innerText.match(/Last\s*Updated[\s:]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i);
            if (lastUpdatedMatch) {
                compliance.lastUpdated = lastUpdatedMatch[1].trim();
            }

            // Extract report source (e.g., "Report Source: 2025 Annual Report")
            const reportSourceMatch = document.body.innerText.match(/Report\s*Source[\s:]+(.+?)(?:\n|View|$)/i);
            if (reportSourceMatch) {
                compliance.reportSource = reportSourceMatch[1].trim();
            }

        } catch (e) {
            console.error('🎯 Musaffa Page: Error extracting compliance status:', e);
        }

        console.log('🎯 Musaffa Page: Final compliance data:', compliance);
        return compliance;
    },

    /**
     * Extract Key Statistics from the Overview section
     * Data includes: Market Cap, P/E, Volume, Dividend Yield, etc.
     * @returns {Object} Key statistics data
     */
    extractKeyStatistics() {
        const stats = {
            marketCapValue: null,    // e.g., "1.30B" → 1300000000
            marketCapDisplay: null,  // e.g., "1.30B"
            peRatio: null,           // P/E Ratio TTM
            volume: null,            // Today's volume
            avgVolume: null,         // Average volume
            dividendYield: null,     // Dividend yield %
            todaysOpen: null,        // Today's open price
            todaysLow: null,         // Today's low
            todaysHigh: null,        // Today's high
            fiftyTwoWeekLow: null,   // 52-week low
            fiftyTwoWeekHigh: null,  // 52-week high
            currentPrice: null       // Current price
        };

        try {
            // Find Key Statistics section
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            let statsSection = null;
            
            for (const h of headings) {
                const text = h.textContent.toLowerCase();
                if (text.includes('key statistics') || text.includes('key stats')) {
                    statsSection = h.closest('section') || h.closest('article') || h.parentElement?.parentElement?.parentElement;
                    break;
                }
            }

            // Helper to parse shorthand values like "1.30B", "238.31K"
            const parseValue = (str) => {
                if (!str) return null;
                str = str.toString().trim().replace(/[$,]/g, '');
                const match = str.match(/^([\d.]+)\s*([KMBT])?$/i);
                if (!match) return parseFloat(str) || null;
                
                let num = parseFloat(match[1]);
                const suffix = (match[2] || '').toUpperCase();
                
                switch (suffix) {
                    case 'K': num *= 1000; break;
                    case 'M': num *= 1000000; break;
                    case 'B': num *= 1000000000; break;
                    case 'T': num *= 1000000000000; break;
                }
                return num;
            };

            // Search in stats section or entire body
            const searchContainer = statsSection || document.body;
            const paragraphs = searchContainer.querySelectorAll('p, div, span');
            const innerText = searchContainer.innerText;

            // Extract Market Cap
            const marketCapMatch = innerText.match(/Market\s*Cap[:\s]*\$?\s*([\d.]+[KMBT]?)/i);
            if (marketCapMatch) {
                stats.marketCapDisplay = marketCapMatch[1];
                stats.marketCapValue = parseValue(marketCapMatch[1]);
            }

            // Extract P/E Ratio
            const peMatch = innerText.match(/P[/\\]?E\s*(?:Ratio)?\s*(?:\(TTM\))?[:\s]*([\d.]+)/i);
            if (peMatch) {
                stats.peRatio = parseFloat(peMatch[1]);
            }

            // Extract Volume
            const volumeMatch = innerText.match(/(?<!Avg\.?\s*)Volume[:\s]*([\d.,]+[KMBT]?)/i);
            if (volumeMatch) {
                stats.volume = parseValue(volumeMatch[1].replace(/,/g, ''));
            }

            // Extract Average Volume
            const avgVolumeMatch = innerText.match(/Avg\.?\s*Volume[:\s]*([\d.,]+[KMBT]?)/i);
            if (avgVolumeMatch) {
                stats.avgVolume = parseValue(avgVolumeMatch[1].replace(/,/g, ''));
            }

            // Extract Dividend Yield
            const divYieldMatch = innerText.match(/Dividend\s*Yield[:\s]*([\d.]+)\s*%?/i);
            if (divYieldMatch) {
                stats.dividendYield = parseFloat(divYieldMatch[1]);
            }

            // Extract Today's Open
            const openMatch = innerText.match(/Today['']?s?\s*Open[:\s]*\$?\s*([\d.]+)/i);
            if (openMatch) {
                stats.todaysOpen = parseFloat(openMatch[1]);
            }

            // Extract Today's Range (low - high)
            const rangeMatch = innerText.match(/Today['']?s?\s*Range[:\s]*\$?\s*([\d.]+)[^\d]+([\d.]+)/i);
            if (rangeMatch) {
                stats.todaysLow = parseFloat(rangeMatch[1]);
                stats.todaysHigh = parseFloat(rangeMatch[2]);
            }

            // Extract 52 Week Range
            const weekRangeMatch = innerText.match(/52\s*Week\s*Range[:\s]*\$?\s*([\d.]+)[^\d]+([\d.]+)/i);
            if (weekRangeMatch) {
                stats.fiftyTwoWeekLow = parseFloat(weekRangeMatch[1]);
                stats.fiftyTwoWeekHigh = parseFloat(weekRangeMatch[2]);
            }

            // Extract current price from TradingView widget or page
            // Look for price display near ticker
            const priceMatch = innerText.match(/(?:Price|Last)[:\s]*\$?\s*([\d.]+)/i) ||
                              innerText.match(/\b([\d.]+)\s*(?:USD|D|\+|\-)/);
            if (priceMatch) {
                stats.currentPrice = parseFloat(priceMatch[1]);
            }

            console.log('🎯 Musaffa Page: Extracted key statistics:', stats);

        } catch (e) {
            console.error('🎯 Musaffa Page: Error extracting key statistics:', e);
        }

        return stats;
    },

    /**
     * Extract detailed Financial Metrics from Financials tab
     * Data includes: EPS, Revenue/Share, Margins, Ratios, etc.
     * @returns {Object} Detailed financial metrics
     */
    extractFinancialMetrics() {
        const metrics = {
            // Per Share Data
            revenuePerShare: null,
            ebitPerShare: null,
            eps: null,
            epsForward: null,
            dividendPerShare: null,
            // Ratios
            netMargin: null,
            grossMargin: null,
            operatingMargin: null,
            quickRatio: null,
            currentRatio: null,
            priceToBook: null,
            returnOnAssets: null,
            returnOnEquity: null,
            freeCashFlowMargin: null
        };

        try {
            // Try to find the Financials section tables
            const tables = document.querySelectorAll('table');
            
            for (const table of tables) {
                const rows = table.querySelectorAll('tr');
                
                for (const row of rows) {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length < 2) continue;
                    
                    const label = cells[0].textContent.trim().toLowerCase();
                    // Get the most recent non-empty value (usually last column)
                    let value = null;
                    for (let i = cells.length - 1; i >= 1; i--) {
                        const cellText = cells[i].textContent.trim();
                        if (cellText && cellText !== '-') {
                            value = parseFloat(cellText.replace(/[,$%]/g, ''));
                            if (!isNaN(value)) break;
                        }
                    }
                    
                    if (value === null || isNaN(value)) continue;

                    // Map labels to fields
                    if (label.includes('revenue per share')) metrics.revenuePerShare = value;
                    else if (label.includes('ebit per share')) metrics.ebitPerShare = value;
                    else if (label.includes('earnings per share') || label === 'eps (ttm)') metrics.eps = value;
                    else if (label.includes('eps forward')) metrics.epsForward = value;
                    else if (label.includes('dividend per share')) metrics.dividendPerShare = value;
                    else if (label.includes('net margin')) metrics.netMargin = value;
                    else if (label.includes('gross margin')) metrics.grossMargin = value;
                    else if (label.includes('operating margin')) metrics.operatingMargin = value;
                    else if (label.includes('quick ratio')) metrics.quickRatio = value;
                    else if (label.includes('current ratio')) metrics.currentRatio = value;
                    else if (label.includes('price to book') || label.includes('p/b')) metrics.priceToBook = value;
                    else if (label.includes('return on assets') || label.includes('roa')) metrics.returnOnAssets = value;
                    else if (label.includes('return on equity') || label.includes('roe')) metrics.returnOnEquity = value;
                    else if (label.includes('free cash flow margin')) metrics.freeCashFlowMargin = value;
                }
            }

            // Also try to extract from inline text if tables didn't work well
            const bodyText = document.body.innerText;
            
            // Only fill in missing values from text search
            if (!metrics.eps) {
                const epsMatch = bodyText.match(/EPS\s*(?:\(TTM\))?[:\s]*([\d.]+)/i);
                if (epsMatch) metrics.eps = parseFloat(epsMatch[1]);
            }
            
            if (!metrics.priceToBook) {
                const pbMatch = bodyText.match(/Price\s*to\s*Book[:\s]*([\d.]+)/i);
                if (pbMatch) metrics.priceToBook = parseFloat(pbMatch[1]);
            }

            console.log('🎯 Musaffa Page: Extracted financial metrics:', metrics);

        } catch (e) {
            console.error('🎯 Musaffa Page: Error extracting financial metrics:', e);
        }

        return metrics;
    },

    /**
     * Extract business activity breakdown from the page
     * @returns {Object} Business breakdown percentages
     */
    extractBusinessBreakdown() {
        const breakdown = {
            halalPercent: null,
            doubtfulPercent: null,
            notHalalPercent: null,
            businessActivity: null // Pass/Fail
        };

        try {
            // Look for percentage values in business screening section
            const percentPatterns = /(\d+\.?\d*)\s*%/g;
            
            // Find business screening section
            const businessSection = document.querySelector('[class*="business"], [class*="screening"]');
            if (businessSection) {
                const text = businessSection.innerText;
                
                // Look for labeled percentages
                const halalMatch = text.match(/Halal[:\s]*(\d+\.?\d*)\s*%/i);
                if (halalMatch) breakdown.halalPercent = parseFloat(halalMatch[1]);
                
                const doubtfulMatch = text.match(/Doubtful[:\s]*(\d+\.?\d*)\s*%/i);
                if (doubtfulMatch) breakdown.doubtfulPercent = parseFloat(doubtfulMatch[1]);
                
                const notHalalMatch = text.match(/(?:Not\s*Halal|Haram)[:\s]*(\d+\.?\d*)\s*%/i);
                if (notHalalMatch) breakdown.notHalalPercent = parseFloat(notHalalMatch[1]);
            }

            // Check for Pass/Fail status
            const passFailElements = document.querySelectorAll('[class*="pass"], [class*="fail"]');
            passFailElements.forEach(el => {
                const text = el.textContent.trim().toUpperCase();
                if (text === 'PASS' || text === 'FAIL') {
                    if (el.closest('[class*="business"]')) {
                        breakdown.businessActivity = text;
                    }
                }
            });

        } catch (e) {
            console.error('🎯 Musaffa Page: Error extracting business breakdown:', e);
        }

        return breakdown;
    },

    /**
     * Extract financial screening data from the page
     * @returns {Object} Financial screening data
     */
    extractFinancialData() {
        const financial = {
            debtRatio: null,
            interestBearingSecurities: null,
            interestBearingDebt: null,
            debtStatus: null, // Pass/Fail
            securitiesStatus: null // Pass/Fail
        };

        try {
            const financialSection = document.querySelector('[class*="financial"], [class*="screening"]');
            if (financialSection) {
                const text = financialSection.innerText;
                
                // Look for debt ratio
                const debtMatch = text.match(/(?:Interest[- ]bearing\s*)?Debt[:\s]*(\d+\.?\d*)\s*%/i);
                if (debtMatch) financial.debtRatio = parseFloat(debtMatch[1]);
                
                // Look for securities percentage
                const securitiesMatch = text.match(/(?:Interest[- ]bearing\s*)?Securities[:\s]*(\d+\.?\d*)\s*%/i);
                if (securitiesMatch) financial.interestBearingSecurities = parseFloat(securitiesMatch[1]);
            }

            // Check for Pass/Fail statuses
            const statusElements = document.querySelectorAll('[class*="status"], [class*="pass"], [class*="fail"]');
            statusElements.forEach(el => {
                const text = el.textContent.trim().toUpperCase();
                const parent = el.closest('[class*="debt"], [class*="securities"]');
                if (parent) {
                    if (parent.className.includes('debt')) {
                        financial.debtStatus = text === 'PASS' ? 'Pass' : 'Fail';
                    } else if (parent.className.includes('securities')) {
                        financial.securitiesStatus = text === 'PASS' ? 'Pass' : 'Fail';
                    }
                }
            });

        } catch (e) {
            console.error('🎯 Musaffa Page: Error extracting financial data:', e);
        }

        return financial;
    },

    /**
     * Extract all data from the current page
     * @returns {Object} Complete page data
     */
    extractAllData() {
        const pageType = this.detectPageType();
        
        if (pageType.type !== 'stock' && pageType.type !== 'etf') {
            return { pageType, data: null };
        }

        const companyInfo = this.extractCompanyInfo();
        const compliance = this.extractComplianceStatus();
        const businessBreakdown = this.extractBusinessBreakdown();
        const financialData = this.extractFinancialData();
        const keyStatistics = this.extractKeyStatistics();
        const financialMetrics = this.extractFinancialMetrics();

        return {
            pageType,
            data: {
                ...companyInfo,
                compliance,
                businessBreakdown,
                financialData,
                keyStatistics,
                financialMetrics,
                extractedAt: new Date().toISOString()
            }
        };
    },

    /**
     * Wait for page to fully load and extract data
     * @returns {Promise<Object>} Page data
     */
    waitAndExtract() {
        return new Promise((resolve) => {
            const maxWait = 10000; // 10 seconds max
            const checkInterval = 500;
            const startTime = Date.now();

            const checkReady = () => {
                // Check if compliance section is loaded
                const complianceSection = document.querySelector('[class*="compliance"], [class*="shariah"]');
                const hasHalalText = document.body.innerText.includes('HALAL') || 
                                     document.body.innerText.includes('NOT HALAL') ||
                                     document.body.innerText.includes('DOUBTFUL');

                if (complianceSection || hasHalalText || Date.now() - startTime > maxWait) {
                    // Wait a bit more for dynamic content
                    setTimeout(() => {
                        resolve(this.extractAllData());
                    }, 500);
                } else {
                    setTimeout(checkReady, checkInterval);
                }
            };

            if (document.readyState === 'complete') {
                checkReady();
            } else {
                window.addEventListener('load', checkReady);
            }
        });
    }
};

// Make available globally
window.MusaffaPage = MusaffaPage;

