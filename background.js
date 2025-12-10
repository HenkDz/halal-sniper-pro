// Background Service Worker for Halal Sniper Pro
// Handles cross-origin requests to Musaffa.com and AI APIs (Gemini/Grok)
// 
// FREE & OPEN SOURCE - BYOK (Bring Your Own Keys)
// https://github.com/AhmedSniper/halal-sniper-pro

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // =========================================================================
    // 📡 MESSAGE HANDLERS
    // =========================================================================

    if (request.action === 'fetchMusaffa') {
        const ticker = request.ticker.toUpperCase();
        // Add timestamp to bust cache
        const url = `https://musaffa.com/stock/${ticker}?t=${Date.now()}`;

        // STRATEGY CHECK:
        // Use a "Hidden Tab" approach because Musaffa has strict bot protections/SSR differences.
        // Fetching from background (even with headers) often yields a default "HALAL" template.
        // Opening a tab ensures we get the real client-side rendered state.

        console.log('🎯 Sniper Background: Opening hidden tab for', ticker);

        chrome.tabs.create({ url: url, active: false }, (tab) => {
            const tabId = tab.id;

            // Increased timeout for slow pages and retries
            const TIMEOUT_MS = 30000; // 30 seconds
            const MAX_RETRIES = 3;
            let retryCount = 0;
            let timeoutId = null;
            let listener = null;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (listener) chrome.tabs.onUpdated.removeListener(listener);
            };

            const attemptScrape = () => {
                // Set timeout for this attempt
                timeoutId = setTimeout(() => {
                    retryCount++;
                    if (retryCount < MAX_RETRIES) {
                        console.log(`🎯 Sniper Background: Retry ${retryCount}/${MAX_RETRIES} for ${ticker}`);
                        attemptScrape();
                    } else {
                        console.error('🎯 Sniper Background: All retries exhausted for', ticker);
                        cleanup();
                        chrome.tabs.remove(tabId);
                        sendResponse({ success: false, error: 'Timeout: Page did not load properly after multiple attempts' });
                    }
                }, TIMEOUT_MS);

                // Execute script to scrape the REAL DOM with improved waiting logic
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        // This runs inside the Musaffa page context
                        return new Promise((resolve) => {
                            const MAX_WAIT_MS = 10000; // Wait up to 10 seconds for elements
                            const CHECK_INTERVAL = 500; // Check every 500ms
                            const startTime = Date.now();

                            const checkForStatus = () => {
                                try {
                                    // Wait for page to be interactive
                                    if (document.readyState !== 'complete') {
                                        if (Date.now() - startTime < MAX_WAIT_MS) {
                                            setTimeout(checkForStatus, CHECK_INTERVAL);
                                            return;
                                        }
                                    }

                                    // Additional wait for React/Angular to render (common on Musaffa)
                                    // Check if compliance card exists, indicating page is rendered
                                    const hasComplianceCard = document.querySelector('.compliance-status-card') ||
                                        document.querySelector('[class*="compliance"]') ||
                                        document.body.innerText.includes('Compliance') ||
                                        document.body.innerText.includes('Shariah');

                                    if (!hasComplianceCard && Date.now() - startTime < MAX_WAIT_MS) {
                                        setTimeout(checkForStatus, CHECK_INTERVAL);
                                        return;
                                    }

                                    // Now perform comprehensive status checks
                                    const debugInfo = { found: [], htmlSnippet: '', waitTime: Date.now() - startTime };

                                    // 1. Critical visual checks - NOT_HALAL takes priority
                                    const notHalalChip = document.querySelector('.not-halal-chip') ||
                                        document.querySelector('[class*="not-halal"]') ||
                                        document.querySelector('[class*="nothalal"]');
                                    if (notHalalChip) {
                                        debugInfo.found.push('not-halal-chip element');
                                        resolve({ status: 'NOT_HALAL', reason: 'Found .not-halal-chip class', debug: debugInfo });
                                        return;
                                    }

                                    // 2. Check for doubtful chip
                                    const doubtfulChip = document.querySelector('.doubtful-chip') ||
                                        document.querySelector('[class*="doubtful"]');
                                    if (doubtfulChip) {
                                        debugInfo.found.push('doubtful-chip element');
                                        resolve({ status: 'DOUBTFUL', reason: 'Found .doubtful-chip class', debug: debugInfo });
                                        return;
                                    }

                                    // 3. Status text elements - comprehensive check
                                    const statusTexts = Array.from(document.querySelectorAll('.status-text, [class*="status"]'))
                                        .map(el => el.innerText.trim().toUpperCase())
                                        .filter(text => text.length > 0 && text.length < 50); // Filter out noise

                                    // Check status texts for NOT_HALAL first
                                    const hasNotHalalText = statusTexts.some(t => 
                                        t.includes('NOT HALAL') || t.includes('NOT_HALAL') || 
                                        (t.includes('NOT') && t.includes('HALAL'))
                                    );
                                    if (hasNotHalalText) {
                                        debugInfo.found.push('NOT HALAL in status text');
                                        resolve({ status: 'NOT_HALAL', reason: 'Found "NOT HALAL" in status-text', debug: debugInfo });
                                        return;
                                    }

                                    // Check for DOUBTFUL in status text
                                    const hasDoubtfulText = statusTexts.some(t => t.includes('DOUBTFUL') || t.includes('DOUBT'));
                                    if (hasDoubtfulText) {
                                        debugInfo.found.push('DOUBTFUL in status text');
                                        resolve({ status: 'DOUBTFUL', reason: 'Found "DOUBTFUL" in status-text', debug: debugInfo });
                                        return;
                                    }

                                    // Check for HALAL in status text
                                    const hasHalalText = statusTexts.some(t => 
                                        t === 'HALAL' || (t.includes('HALAL') && !t.includes('NOT'))
                                    );
                                    if (hasHalalText) {
                                        debugInfo.found.push('HALAL in status text');
                                        resolve({ status: 'HALAL', reason: 'Found status-text "HALAL"', debug: debugInfo });
                                        return;
                                    }

                                    // 4. Global text check (fallback) - more comprehensive
                                    const bodyText = document.body.innerText.toUpperCase();
                                    const bodyHtml = document.body.innerHTML.toUpperCase();

                                    // Check for NOT HALAL patterns
                                    if (bodyText.includes('NOT HALAL') || bodyText.includes('NOT_HALAL') ||
                                        bodyHtml.includes('NOT HALAL') || bodyHtml.includes('NOT_HALAL')) {
                                        // But make sure it's not in a comment or script
                                        const notHalalIndex = Math.min(
                                            bodyText.indexOf('NOT HALAL'),
                                            bodyText.indexOf('NOT_HALAL')
                                        );
                                        if (notHalalIndex > -1) {
                                            const context = bodyText.substring(Math.max(0, notHalalIndex - 50), notHalalIndex + 100);
                                            if (!context.includes('EXAMPLE') && !context.includes('TEMPLATE')) {
                                                debugInfo.found.push('NOT HALAL in body text');
                                                resolve({ status: 'NOT_HALAL', reason: 'Found "NOT HALAL" text in body', debug: debugInfo });
                                                return;
                                            }
                                        }
                                    }

                                    // Check for DOUBTFUL patterns
                                    if (bodyText.includes('DOUBTFUL') || bodyHtml.includes('DOUBTFUL')) {
                                        const doubtfulIndex = bodyText.indexOf('DOUBTFUL');
                                        if (doubtfulIndex > -1) {
                                            const context = bodyText.substring(Math.max(0, doubtfulIndex - 50), doubtfulIndex + 100);
                                            if (!context.includes('EXAMPLE') && !context.includes('TEMPLATE')) {
                                                debugInfo.found.push('DOUBTFUL in body text');
                                                resolve({ status: 'DOUBTFUL', reason: 'Found "DOUBTFUL" text in body', debug: debugInfo });
                                                return;
                                            }
                                        }
                                    }

                                    // 5. Check halal chip (only if no negative indicators found)
                                    const halalChip = document.querySelector('.halal-chip') ||
                                        document.querySelector('[class*="halal-chip"]');
                                    if (halalChip) {
                                        // Verify it's not part of a "not-halal-chip" parent
                                        const parent = halalChip.closest('[class*="not"]');
                                        if (!parent || !parent.className.toLowerCase().includes('not')) {
                                            debugInfo.found.push('halal-chip element');
                                            resolve({ status: 'HALAL', reason: 'Found .halal-chip class', debug: debugInfo });
                                            return;
                                        }
                                    }

                                    // 6. Check compliance status text patterns
                                    const compliancePatterns = [
                                        /Compliance\s+Status:\s*(NOT\s+)?HALAL/i,
                                        /Status:\s*(NOT\s+)?HALAL/i,
                                        />\s*(NOT\s+)?HALAL\s*</i
                                    ];

                                    for (const pattern of compliancePatterns) {
                                        const match = bodyText.match(pattern);
                                        if (match) {
                                            const statusText = match[0].toUpperCase();
                                            if (statusText.includes('NOT')) {
                                                debugInfo.found.push('NOT HALAL in compliance pattern');
                                                resolve({ status: 'NOT_HALAL', reason: 'Compliance Status Text indicates NOT HALAL', debug: debugInfo });
                                                return;
                                            } else if (statusText.includes('HALAL')) {
                                                debugInfo.found.push('HALAL in compliance pattern');
                                                resolve({ status: 'HALAL', reason: 'Compliance Status Text indicates HALAL', debug: debugInfo });
                                                return;
                                            }
                                        }
                                    }

                                    // 7. Get HTML for advanced parsing fallback
                                    const html = document.documentElement.outerHTML;
                                    debugInfo.htmlSnippet = html.substring(0, 5000); // First 5KB for debugging
                                    debugInfo.bodyTextLength = bodyText.length;
                                    debugInfo.statusTextsFound = statusTexts.length;

                                    // If we've waited long enough and still can't find anything, return UNKNOWN
                                    if (Date.now() - startTime >= MAX_WAIT_MS) {
                                        resolve({ status: 'UNKNOWN', reason: 'No clear status indicators found after waiting', debug: debugInfo });
                                    } else {
                                        // Continue waiting
                                        setTimeout(checkForStatus, CHECK_INTERVAL);
                                    }
                                } catch (e) {
                                    resolve({ status: 'ERROR', error: e.toString(), debug: { error: e.message } });
                                }
                            };

                            // Start checking
                            checkForStatus();
                        });
                    }
                })
                    .then(results => {
                        const result = results[0].result;
                        console.log('🎯 Sniper Background: Scraped Status =', result);

                        cleanup();

                        if (result.status === 'ERROR') {
                            retryCount++;
                            if (retryCount < MAX_RETRIES) {
                                console.log(`🎯 Sniper Background: Retry ${retryCount}/${MAX_RETRIES} due to error`);
                                setTimeout(attemptScrape, 2000 * retryCount); // Exponential backoff
                                return;
                            }
                            sendResponse({ success: false, error: result.error || 'Unknown error during scraping' });
                            chrome.tabs.remove(tabId);
                            return;
                        }

                        // Parse response to match expected format
                        let status = result.status;
                        if (status !== 'NOT_HALAL' && status !== 'HALAL' && status !== 'DOUBTFUL') {
                            // If we got UNKNOWN, try to get full HTML and parse it
                            chrome.scripting.executeScript({
                                target: { tabId: tabId },
                                func: () => document.documentElement.outerHTML
                            })
                                .then(htmlResults => {
                                    const html = htmlResults[0].result;
                                    // Use the robust HTML parser
                                    const parsed = parseMusaffaHtml(html, ticker);
                                    if (parsed.status) {
                                        status = parsed.status;
                                        result.debug = { ...result.debug, ...parsed.debug, fallbackParsing: true };
                                    } else {
                                        status = 'DOUBTFUL'; // Default to DOUBTFUL if truly unknown
                                    }

                                    sendResponse({
                                        success: true,
                                        status: status,
                                        debug: { 
                                            method: 'Hidden Tab Scrape + HTML Parse', 
                                            reason: result.reason || 'HTML parsing fallback',
                                            waitTime: result.debug?.waitTime,
                                            retries: retryCount,
                                            ...result.debug
                                        }
                                    });

                                    chrome.tabs.remove(tabId);
                                })
                                .catch(() => {
                                    // If HTML fetch fails, default to DOUBTFUL
                                    status = 'DOUBTFUL';
                                    sendResponse({
                                        success: true,
                                        status: status,
                                        debug: { 
                                            method: 'Hidden Tab Scrape', 
                                            reason: result.reason || 'Unknown status, defaulted to DOUBTFUL',
                                            waitTime: result.debug?.waitTime,
                                            retries: retryCount,
                                            ...result.debug
                                        }
                                    });
                                    chrome.tabs.remove(tabId);
                                });
                            return; // Don't send response yet, wait for HTML parsing
                        }

                        sendResponse({
                            success: true,
                            status: status,
                            debug: { 
                                method: 'Hidden Tab Scrape', 
                                reason: result.reason,
                                waitTime: result.debug?.waitTime,
                                retries: retryCount,
                                ...result.debug
                            }
                        });

                        // Close the tab to cleanup
                        chrome.tabs.remove(tabId);
                    })
                    .catch(err => {
                        console.error('🎯 Sniper Background: Scripting error', err);
                        cleanup();
                        retryCount++;
                        if (retryCount < MAX_RETRIES) {
                            console.log(`🎯 Sniper Background: Retry ${retryCount}/${MAX_RETRIES} due to scripting error`);
                            setTimeout(attemptScrape, 2000 * retryCount);
                        } else {
                            sendResponse({ success: false, error: err.message });
                            chrome.tabs.remove(tabId);
                        }
                    });
            };

            // Listener for tab update
            listener = (tid, changeInfo, tabInfo) => {
                if (tid === tabId && changeInfo.status === 'complete') {
                    // Wait a bit for JavaScript to render before attempting scrape
                    setTimeout(() => {
                        attemptScrape();
                    }, 2000); // 2 second initial wait
                }
            };

            chrome.tabs.onUpdated.addListener(listener);
        });

        // Return true to indicate we'll respond asynchronously
        return true;
    }

    // AI Analysis using Google Gemini
    if (request.action === 'aiAnalyze') {
        const provider = request.provider || 'gemini';
        if (provider === 'xai') {
            return handleXaiAnalyze({ ...request, withSearch: false, sendResponse });
        }
        return handleGeminiAnalyze({ ...request, withSearch: false, sendResponse });
    }

    if (request.action === 'aiAnalyzeWithSearch') {
        const provider = request.provider || 'gemini';
        if (provider === 'xai') {
            return handleXaiAnalyze({ ...request, withSearch: true, sendResponse });
        }
        return handleGeminiAnalyze({ ...request, withSearch: true, sendResponse });
    }

    // AI News Summary - Condensed news digest for rapid screening
    if (request.action === 'aiNewsSummary') {
        const provider = request.provider || 'gemini';
        const newsPrompt = buildNewsSummaryPrompt(
            request.ticker,
            request.companyName,
            request.insiderData
        );
        
        // Always use search for news summary
        if (provider === 'xai') {
            return handleXaiAnalyze({ 
                ...request, 
                withSearch: true, 
                customPrompt: newsPrompt,
                sendResponse 
            });
        }
        return handleGeminiAnalyze({ 
            ...request, 
            withSearch: true, 
            customPrompt: newsPrompt,
            sendResponse 
        });
    }

    // =========================================================================
    // 📊 ALPHA VANTAGE API HANDLERS
    // =========================================================================
    
    // Fetch comprehensive financial data from Alpha Vantage
    if (request.action === 'fetchAlphaVantageData') {
        const ticker = request.ticker.toUpperCase();
        const apiKey = request.apiKey;
        const dataType = request.dataType || 'comprehensive'; // 'overview', 'balance', 'income', 'comprehensive'
        
        console.log(`📊 Alpha Vantage: Fetching ${dataType} data for ${ticker}`);
        
        handleAlphaVantageRequest(ticker, apiKey, dataType)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        
        return true; // Async response
    }

    // Fetch insider trading data from OpenInsider
    if (request.action === 'fetchInsiderData') {
        const ticker = request.ticker.toUpperCase();
        const url = `http://openinsider.com/${ticker}`;

        console.log('🎯 Sniper Background: Fetching insider data for', ticker);

        chrome.tabs.create({ url: url, active: false }, (tab) => {
            const tabId = tab.id;
            const TIMEOUT_MS = 20000; // 20 seconds
            let timeoutId = null;
            let listener = null;

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (listener) chrome.tabs.onUpdated.removeListener(listener);
            };

            const scrapeInsiderData = () => {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        return new Promise((resolve) => {
                            const MAX_WAIT_MS = 5000;
                            const startTime = Date.now();

                            const checkReady = () => {
                                const table = document.querySelector('table.tinytable');
                                if (table || Date.now() - startTime > MAX_WAIT_MS) {
                                    extractData();
                                } else {
                                    setTimeout(checkReady, 500);
                                }
                            };

                            const extractData = () => {
                                try {
                                    const result = {
                                        totalBuy: 0,
                                        totalSell: 0,
                                        buyCount: 0,
                                        sellCount: 0,
                                        recentActivity: 0,
                                        recentTrades: []
                                    };

                                    const rows = document.querySelectorAll('table.tinytable tbody tr');
                                    if (!rows || rows.length === 0) {
                                        resolve(result);
                                        return;
                                    }

                                    const now = new Date();

                                    rows.forEach((row, idx) => {
                                        if (row.cells.length < 8 || idx > 50) return; // Limit to 50 rows

                                        // Column indices (may vary)
                                        const tradeTypeIdx = 6;
                                        const valueIdx = 11;
                                        const insiderIdx = 4;
                                        const titleIdx = 5;
                                        const tradeDateIdx = 2;

                                        const tradeType = row.cells[tradeTypeIdx]?.innerText.trim() || "";
                                        const valueCell = row.cells[valueIdx]?.innerText.trim() || "0";
                                        const insiderName = row.cells[insiderIdx]?.innerText.trim() || "Unknown";
                                        const title = row.cells[titleIdx]?.innerText.trim() || "";
                                        const tradeDateStr = row.cells[tradeDateIdx]?.innerText.trim() || "";

                                        const valMatch = valueCell.replace(/[,$]/g, '').match(/-?\d+/);
                                        const val = valMatch ? Math.abs(parseInt(valMatch[0])) : 0;

                                        // Parse date
                                        let daysAgo = 999;
                                        if (tradeDateStr) {
                                            const tradeDate = new Date(tradeDateStr);
                                            if (!isNaN(tradeDate.getTime())) {
                                                daysAgo = Math.floor((now - tradeDate) / (1000 * 60 * 60 * 24));
                                            }
                                        }

                                        const isPurchase = tradeType.includes("P -") || tradeType.toLowerCase().includes("purchase");
                                        const isSale = tradeType.includes("S -") || tradeType.toLowerCase().includes("sale");

                                        if (isPurchase) {
                                            result.totalBuy += val;
                                            result.buyCount++;
                                            if (daysAgo <= 30) result.recentActivity++;
                                            if (result.recentTrades.length < 5) {
                                                result.recentTrades.push({
                                                    type: 'buy',
                                                    value: val,
                                                    insiderName,
                                                    title,
                                                    daysAgo
                                                });
                                            }
                                        } else if (isSale) {
                                            result.totalSell += val;
                                            result.sellCount++;
                                            if (result.recentTrades.length < 5) {
                                                result.recentTrades.push({
                                                    type: 'sell',
                                                    value: val,
                                                    insiderName,
                                                    title,
                                                    daysAgo
                                                });
                                            }
                                        }
                                    });

                                    resolve(result);
                                } catch (e) {
                                    resolve({ error: e.message });
                                }
                            };

                            if (document.readyState === 'complete') {
                                checkReady();
                            } else {
                                window.addEventListener('load', checkReady);
                            }
                        });
                    }
                })
                .then(results => {
                    cleanup();
                    const data = results[0]?.result;
                    chrome.tabs.remove(tabId);
                    
                    if (data && !data.error) {
                        console.log('🎯 Sniper Background: Insider data extracted', data);
                        sendResponse({ success: true, data });
                    } else {
                        sendResponse({ success: false, error: data?.error || 'No data found' });
                    }
                })
                .catch(err => {
                    cleanup();
                    chrome.tabs.remove(tabId);
                    console.error('🎯 Sniper Background: Insider scrape error', err);
                    sendResponse({ success: false, error: err.message });
                });
            };

            // Timeout
            timeoutId = setTimeout(() => {
                cleanup();
                chrome.tabs.remove(tabId);
                sendResponse({ success: false, error: 'Timeout fetching insider data' });
            }, TIMEOUT_MS);

            // Listen for page load
            listener = (tid, changeInfo) => {
                if (tid === tabId && changeInfo.status === 'complete') {
                    setTimeout(scrapeInsiderData, 1500);
                }
            };

            chrome.tabs.onUpdated.addListener(listener);
        });

        return true;
    }
});

function handleGeminiAnalyze({ ticker, companyName, insiderData, apiKey, withSearch, customPrompt, sendResponse }) {
    if (!apiKey) {
        sendResponse({ success: false, error: 'No API key configured' });
        return true;
    }

    console.log('🤖 Sniper AI: Gemini analyze', ticker, 'search=', withSearch, 'customPrompt=', !!customPrompt);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`;
    const prompt = customPrompt || (withSearch ? buildSearchPrompt(ticker, companyName, insiderData) : buildAnalysisPrompt(ticker, companyName, insiderData));

    const requestBody = {
        contents: [{
            role: "user",
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: withSearch ? 0.3 : 0.4,
            maxOutputTokens: withSearch ? 8000 : 4500
        }
    };

    if (withSearch) {
        requestBody.tools = [{ googleSearch: {} }];
    } else {
        requestBody.safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ];
    }

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error?.message || 'API Error ' + response.status); });
            }
            return response.json();
        })
        .then(data => {
            console.log('🤖 Sniper AI: Gemini response', data);
            if (data.candidates && data.candidates[0]?.content?.parts) {
                const parts = data.candidates[0].content.parts;
                const analysis = parts.map(p => p.text || '').join('\n');
                const groundingMeta = data.candidates[0]?.groundingMetadata;
                
                // Extract sources from grounding metadata
                let sources = [];
                
                if (withSearch && groundingMeta) {
                    // Extract grounding chunks (citations) - prefer real URLs, but keep redirects as fallback
                    if (groundingMeta.groundingChunks) {
                        groundingMeta.groundingChunks.forEach(chunk => {
                            const url = chunk.web?.uri || chunk.retrievedContext?.uri;
                            if (url) {
                                // Prefer non-redirect URLs
                                if (!url.includes('vertexaisearch.cloud.google.com')) {
                                    sources.push(url);
                                }
                            }
                        });
                        
                        // If no real URLs found, use redirect URLs as fallback (they do work when clicked)
                        if (sources.length === 0) {
                            groundingMeta.groundingChunks.forEach(chunk => {
                                const url = chunk.web?.uri || chunk.retrievedContext?.uri;
                                if (url && !sources.includes(url)) {
                                    sources.push(url);
                                }
                            });
                        }
                    }
                    
                    // NOTE: Do NOT include searchEntryPoint.renderedContent - it's an HTML widget, not a URL
                }
                
                // Extract inline citation URLs from the markdown text [[#]](url) or [[#.#]](url)
                const inlineCitations = [...analysis.matchAll(/\[\[\d+(?:\.\d+)?\]\]\(([^)]+)\)/g)]
                    .map(m => m[1])
                    .filter(url => url && !sources.includes(url));
                
                // Only add inline citations if we don't already have enough sources
                if (sources.length < 5) {
                    inlineCitations.forEach(url => {
                        if (!sources.includes(url)) sources.push(url);
                    });
                }
                
                // Remove duplicates and limit to 15
                sources = [...new Set(sources)].slice(0, 15);
                
                if (withSearch) {
                    sendResponse({ 
                        success: true, 
                        analysis: analysis, 
                        grounded: true, 
                        sources: sources 
                    });
                } else {
                    sendResponse({ success: true, analysis: analysis });
                }
            } else {
                sendResponse({ success: false, error: 'Unexpected API response format' });
            }
        })
        .catch(error => {
            console.error('🤖 Sniper AI: Gemini error', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}

function handleXaiAnalyze({ ticker, companyName, insiderData, musaffaData, apiKey, withSearch, customPrompt, sendResponse }) {
    if (!apiKey) {
        sendResponse({ success: false, error: 'No xAI API key configured' });
        return true;
    }

    console.log('🤖 Sniper AI: Grok analyze', ticker, 'search=', withSearch, 'musaffaData=', !!musaffaData, 'customPrompt=', !!customPrompt);

    const prompt = customPrompt || buildGrokPrompt({ ticker, companyName, insiderData, musaffaData, withSearch: !!withSearch });
    const tools = withSearch ? [{ type: 'web_search' }, { type: 'x_search' }] : [];
    // Increased timeout for deep research with web search (Grok can take longer)
    const timeoutMs = withSearch ? 120000 : 65000; // 2 minutes for search, 65s for quick

    const body = {
        model: 'grok-4-1-fast',
        input: prompt,
        temperature: withSearch ? 0.25 : 0.35,
        max_output_tokens: withSearch ? 8000 : 4500
    };

    if (withSearch) {
        body.tools = tools;
    }

    const request = fetch('https://api.x.ai/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    }).then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                try {
                    const err = JSON.parse(text);
                    throw new Error(err.error?.message || err.message || 'API Error ' + response.status);
                } catch {
                    throw new Error(text || 'API Error ' + response.status);
                }
            });
        }
        return response.json();
    });

    Promise.race([
        request,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Grok search timeout')), timeoutMs))
    ])
        .then(data => {
            console.log('🤖 Sniper AI: Grok response', data);

            const output = Array.isArray(data?.output) ? data.output : [];
            const contentItem = output.find(i => Array.isArray(i.content) && i.content.length > 0);
            const text = contentItem?.content?.find(c => c.type === 'output_text' || c.type === 'text')?.text || '';

            if (!text) {
                console.error('🤖 Sniper AI: Unexpected response structure', data);
                sendResponse({ success: false, error: 'Unexpected xAI response format' });
                return;
            }

            const explicitCitations = (data.citations || []).map(c => c.url || c.title).filter(Boolean);
            const inlineCitations = [...text.matchAll(/\((?:Source|source):\s*([^)]+)\)/g)].map(m => m[1].trim());
            const citations = [...new Set([...explicitCitations, ...inlineCitations])];

            let fullResponse = text.trim();
            if (citations.length > 0) {
                fullResponse += '\n\nSources:\n' + citations.slice(0, 5).map((url, i) => `${i + 1}. ${url}`).join('\n');
            }

            sendResponse({ success: true, analysis: fullResponse, grounded: !!withSearch, sources: citations });
        })
        .catch(error => {
            console.error('🤖 Sniper AI: Grok error', error);
            sendResponse({ success: false, error: error.message });
        });

    return true;
}

// =========================================================================
// 📊 ALPHA VANTAGE API HANDLER
// =========================================================================

async function handleAlphaVantageRequest(ticker, apiKey, dataType) {
    const BASE_URL = 'https://www.alphavantage.co/query';
    
    if (!apiKey) {
        return { success: false, error: 'Alpha Vantage API key not configured' };
    }
    
    const parseNum = (val) => {
        if (!val || val === 'None' || val === '-' || val === 'N/A') return null;
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
    };
    
    const fetchEndpoint = async (func) => {
        const url = `${BASE_URL}?function=${func}&symbol=${ticker}&apikey=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        // Check for errors
        if (data['Error Message']) {
            throw new Error(data['Error Message']);
        }
        if (data['Note']) {
            throw new Error('API_RATE_LIMIT');
        }
        return data;
    };
    
    try {
        let result = { success: true, ticker };
        
        // Fetch based on dataType
        if (dataType === 'overview' || dataType === 'comprehensive') {
            const overview = await fetchEndpoint('OVERVIEW');
            if (!overview.Symbol) {
                return { success: false, error: `No data found for ${ticker}` };
            }
            
            result.overview = {
                symbol: overview.Symbol,
                name: overview.Name,
                description: overview.Description,
                sector: overview.Sector,
                industry: overview.Industry,
                exchange: overview.Exchange,
                marketCap: parseNum(overview.MarketCapitalization),
                
                // Analyst Data (THE GOLD!)
                analyst: {
                    targetPrice: parseNum(overview.AnalystTargetPrice),
                    strongBuy: parseNum(overview.AnalystRatingStrongBuy) || 0,
                    buy: parseNum(overview.AnalystRatingBuy) || 0,
                    hold: parseNum(overview.AnalystRatingHold) || 0,
                    sell: parseNum(overview.AnalystRatingSell) || 0,
                    strongSell: parseNum(overview.AnalystRatingStrongSell) || 0
                },
                
                // Financials
                profitMargin: parseNum(overview.ProfitMargin),
                operatingMargin: parseNum(overview.OperatingMarginTTM),
                returnOnEquity: parseNum(overview.ReturnOnEquityTTM),
                returnOnAssets: parseNum(overview.ReturnOnAssetsTTM),
                revenueTTM: parseNum(overview.RevenueTTM),
                eps: parseNum(overview.EPS),
                peRatio: parseNum(overview.PERatio),
                forwardPE: parseNum(overview.ForwardPE),
                priceToBook: parseNum(overview.PriceToBookRatio),
                beta: parseNum(overview.Beta),
                high52Week: parseNum(overview['52WeekHigh']),
                low52Week: parseNum(overview['52WeekLow']),
                movingAvg50: parseNum(overview['50DayMovingAverage']),
                movingAvg200: parseNum(overview['200DayMovingAverage']),
                
                // Ownership
                percentInsiders: parseNum(overview.PercentInsiders),
                percentInstitutions: parseNum(overview.PercentInstitutions),
                sharesOutstanding: parseNum(overview.SharesOutstanding),
                
                // Dividends
                dividendYield: parseNum(overview.DividendYield),
                
                // Dates
                latestQuarter: overview.LatestQuarter
            };
            
            // Calculate analyst consensus
            const a = result.overview.analyst;
            a.totalAnalysts = a.strongBuy + a.buy + a.hold + a.sell + a.strongSell;
            if (a.totalAnalysts > 0) {
                const bullish = a.strongBuy + a.buy;
                const bearish = a.sell + a.strongSell;
                a.consensus = bullish > a.hold && bullish > bearish ? 'Buy' :
                             bearish > a.hold && bearish > bullish ? 'Sell' : 'Hold';
                a.score = ((a.strongBuy * 1 + a.buy * 2 + a.hold * 3 + a.sell * 4 + a.strongSell * 5) / a.totalAnalysts).toFixed(2);
            } else {
                a.consensus = 'N/A';
                a.score = null;
            }
        }
        
        if (dataType === 'balance' || dataType === 'comprehensive') {
            try {
                const balance = await fetchEndpoint('BALANCE_SHEET');
                if (balance.annualReports && balance.annualReports.length > 0) {
                    const latest = balance.annualReports[0];
                    
                    const totalCurrentAssets = parseNum(latest.totalCurrentAssets) || (
                        (parseNum(latest.cashAndShortTermInvestments) || 0) +
                        (parseNum(latest.inventory) || 0) +
                        (parseNum(latest.currentNetReceivables) || 0) +
                        (parseNum(latest.otherCurrentAssets) || 0)
                    );
                    
                    result.balanceSheet = {
                        fiscalDate: latest.fiscalDateEnding,
                        totalAssets: parseNum(latest.totalAssets) || (totalCurrentAssets + (parseNum(latest.totalNonCurrentAssets) || 0)),
                        totalCurrentAssets,
                        totalLiabilities: parseNum(latest.totalLiabilities),
                        totalCurrentLiabilities: parseNum(latest.totalCurrentLiabilities),
                        cashAndShortTerm: parseNum(latest.cashAndShortTermInvestments),
                        
                        // For Halal scoring
                        shortTermDebt: parseNum(latest.shortTermDebt),
                        longTermDebt: parseNum(latest.longTermDebt) || parseNum(latest.longTermDebtNoncurrent),
                        totalDebt: parseNum(latest.shortLongTermDebtTotal),
                        intangibleAssets: parseNum(latest.intangibleAssets),
                        goodwill: parseNum(latest.goodwill),
                        propertyPlantEquipment: parseNum(latest.propertyPlantEquipment),
                        
                        // Equity
                        totalShareholderEquity: parseNum(latest.totalShareholderEquity)
                    };
                    
                    // Calculate Halal-relevant ratios
                    const bs = result.balanceSheet;
                    bs.interestBearingDebt = (bs.shortTermDebt || 0) + (bs.longTermDebt || 0);
                    bs.illiquidAssets = (bs.propertyPlantEquipment || 0) + (bs.intangibleAssets || 0) + (bs.goodwill || 0);
                    bs.netLiquidAssets = (bs.totalCurrentAssets || 0) - (bs.totalCurrentLiabilities || 0);
                    
                    if (bs.totalAssets) {
                        bs.debtToAssetRatio = (bs.interestBearingDebt / bs.totalAssets) * 100;
                        bs.illiquidToAssetRatio = (bs.illiquidAssets / bs.totalAssets) * 100;
                    }
                }
            } catch (e) {
                if (e.message !== 'API_RATE_LIMIT') {
                    console.warn('Alpha Vantage: Could not fetch balance sheet:', e.message);
                } else {
                    throw e;
                }
            }
        }
        
        if (dataType === 'income' || dataType === 'comprehensive') {
            try {
                const income = await fetchEndpoint('INCOME_STATEMENT');
                if (income.annualReports && income.annualReports.length > 0) {
                    const latest = income.annualReports[0];
                    
                    result.incomeStatement = {
                        fiscalDate: latest.fiscalDateEnding,
                        totalRevenue: parseNum(latest.totalRevenue),
                        grossProfit: parseNum(latest.grossProfit),
                        operatingIncome: parseNum(latest.operatingIncome),
                        netIncome: parseNum(latest.netIncome),
                        interestIncome: parseNum(latest.interestIncome),
                        interestExpense: parseNum(latest.interestExpense)
                    };
                    
                    // Calculate haram income percentage
                    const is = result.incomeStatement;
                    if (is.totalRevenue && is.interestIncome) {
                        is.haramIncomePercent = (is.interestIncome / is.totalRevenue) * 100;
                    } else {
                        is.haramIncomePercent = 0;
                    }
                }
            } catch (e) {
                if (e.message !== 'API_RATE_LIMIT') {
                    console.warn('Alpha Vantage: Could not fetch income statement:', e.message);
                } else {
                    throw e;
                }
            }
        }
        
        // Build combined Halal data if comprehensive
        if (dataType === 'comprehensive' && result.overview) {
            result.halalData = {
                businessActivity: null, // Must come from Musaffa or AI
                haramIncomePercent: result.incomeStatement?.haramIncomePercent || 0,
                interestBearingDebt: result.balanceSheet?.interestBearingDebt || 0,
                totalAssets: result.balanceSheet?.totalAssets || null,
                illiquidAssets: result.balanceSheet?.illiquidAssets || null,
                netLiquidAssets: result.balanceSheet?.netLiquidAssets || null,
                marketCap: result.overview?.marketCap || null,
                grossRevenue: result.incomeStatement?.totalRevenue || result.overview?.revenueTTM || null,
                
                // Pre-calculated ratios
                debtRatio: result.balanceSheet?.debtToAssetRatio || null,
                illiquidRatio: result.balanceSheet?.illiquidToAssetRatio || null
            };
        }
        
        console.log(`📊 Alpha Vantage: Successfully fetched ${dataType} data for ${ticker}`);
        return result;
        
    } catch (error) {
        if (error.message === 'API_RATE_LIMIT') {
            console.warn('📊 Alpha Vantage: Rate limit reached');
            return { 
                success: false, 
                error: 'Alpha Vantage API rate limit reached (25 calls/day on free tier). Try again later.',
                rateLimited: true 
            };
        }
        console.error('📊 Alpha Vantage: Error', error);
        return { success: false, error: error.message };
    }
}

// Build analysis prompt for AI - Expert trader perspective
function buildAnalysisPrompt(ticker, companyName, insiderData) {
    return `You are a senior hedge fund analyst with 20+ years of experience specializing in insider trading signals. You've successfully predicted major stock moves by reading insider behavior patterns. You think like a professional trader - focused on edge, risk/reward, and actionable intelligence.

ANALYZING: ${ticker} - ${companyName}

RAW INSIDER DATA FROM SEC FORM 4 FILINGS:
${insiderData}

Provide your expert analysis in this EXACT format:

## 🎯 VERDICT
[One line: BULLISH SIGNAL / BEARISH SIGNAL / NEUTRAL / MIXED - with confidence: High/Medium/Low]

## 📊 SIGNAL BREAKDOWN

**What Insiders Are Telling Us:**
[2-3 sentences interpreting the buying/selling pattern. What does this behavior typically indicate? Are insiders voting with their wallets?]

**Key Patterns I'm Seeing:**
- [Pattern 1 - e.g., "Executive cluster buying often precedes positive catalysts"]
- [Pattern 2 - e.g., "Fresh entries from directors suggest renewed confidence"]
- [Pattern 3 if applicable]

## ⚠️ RISK ASSESSMENT

**Red Flags:**
[List any concerning patterns, or "None significant" if clean]

**What Could Go Wrong:**
[1-2 realistic risks to consider]

## 💡 SMART MONEY PLAYBOOK

**If I Were Trading This:**
[2-3 sentences on how a professional would approach this - entry considerations, position sizing thoughts, what to watch for]

**Bottom Line:**
[One powerful closing sentence - the key takeaway a trader needs to remember]

    Be specific, use numbers from the data, and think like a trader who needs to make money. No generic advice - only insights derived from THIS specific insider activity.
    
    Finally, at the very end of your response, print a single JSON block wrapped in triple backticks with this exact structure:
    \`\`\`json
    {
      "decision": "Buy" | "Sell" | "Hold",
      "confidence": "High" | "Medium" | "Low",
      "halalScore": "85%" (or "N/A"),
      "actionableTake": "Short summarized take",
      "halalData": {
        "businessActivity": "HALAL" | "HARAM" | "DOUBTFUL" | null,
        "haramIncomePercent": 0.5 (or null if unavailable),
        "debtRatio": 15.5 (or null),
        "illiquidRatio": 69.4 (or null),
        "netLiquidToMarketCap": 26.1 (or null)
      }
    }
    \`\`\``;
}

// Build search-enhanced prompt - Deep research mode
function buildSearchPrompt(ticker, companyName, insiderData) {
    // Get current date for prompt injection
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });
    const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return `You are a senior equity research analyst preparing a rapid intelligence brief.

📅 TODAY'S DATE: ${currentDate}
⚠️ IMPORTANT: The current year is ${currentYear}. Search for and report ONLY the most recent data from ${currentYear}.
Do NOT use outdated ${currentYear - 1} data if ${currentYear} data is available.

⚠️ CRITICAL: You are analyzing ticker "${ticker}" which is "${companyName}". 
DO NOT confuse this with any other ticker. Only search for and report on ${ticker}.
If search results return a different company, IGNORE THEM and search again with "${ticker}".

Use Google Search to find the LATEST news about ${ticker}, then synthesize with insider trading data.

COMPANY: ${ticker} - ${companyName}

INSIDER TRADING DATA (from SEC Form 4):
${insiderData}

YOUR TASK:
1. Search for: "${ticker} stock news ${currentYear}" - find the most recent developments (last 30 days)
2. Search for: "${companyName} earnings ${currentYear}" - latest earnings and upcoming events
3. Search for: "${ticker} analyst rating ${currentMonth} ${currentYear}" - recent analyst actions
4. Search for: "${companyName} business activities halal haram" - Check business model (Alcohol, Interest/Riba, Pork, Gambling, Pornography, Weapons, Tobacco).
   CRITICAL: Strictly distinguish between:
   - Asset Management/Advisory Services (HALAL): Companies that manage funds, provide investment advisory, charge management fees. These are PERMISSIBLE.
   - Lending/Banking (HARAM): Companies that lend money and earn interest income. These are NOT PERMISSIBLE.
   - Do NOT confuse asset managers with banks. If the company earns "Management Fees" or "Advisory Fees", classify as HALAL. Only classify as HARAM if primary revenue is from interest/riba.
   - If unsure or data unavailable, use "DOUBTFUL" or null. NEVER guess or hallucinate.
5. Search for: "${ticker} SEC filing 10-Q ${currentYear}" or "${ticker} quarterly report ${currentYear}" - Extract LATEST financial data for halal compliance screening:
   REQUIRED RAW COMPONENTS (provide these separately - do NOT calculate Net Liquid Assets yourself):
   - Total Assets (from balance sheet)
   - Total Liabilities (from balance sheet)
   - Current Assets (from balance sheet)
   - Current Liabilities (from balance sheet)
   - Illiquid assets (property, plant, equipment, intangible assets)
   - Interest-bearing debt (from balance sheet notes)
   - Gross revenue
   - Interest income (for haram income calculation)
   IMPORTANT: Provide ONLY facts from SEC filings. If a number is unavailable, use null. Do NOT estimate or guess.
6. Synthesize search results with insider data

CITATION FORMAT: When citing sources, use inline numbered citations like [[1]](URL) format.
Example: "Revenue grew 15% YoY[[1]](https://sec.gov/filing123)"
Number sources sequentially. Do NOT include a separate "Sources:" section at the end - inline citations are sufficient.

DELIVER YOUR INTELLIGENCE BRIEF IN THIS EXACT FORMAT:

## ⚡ HIGHLIGHTS
**Actionable Take:** [One sentence: BUY/SELL/HOLD and why, based on data.][[source#]](url)
**Halal Score:** [Score 0-100%] (Based on comprehensive 5-criteria IFG methodology: Business Activity, Haram Income <5%, Debt <33%, Illiquid Assets >20%, Liquid Assets < Market Cap. If financial data unavailable, estimate based on business activities only.)

## 🔍 LATEST INTELLIGENCE
[What did your search reveal? Key news, events, analyst moves. Be specific with dates. Include [[#]](url) citations.]

## 📰 NEWS + INSIDER ALIGNMENT

**Do Insiders Know Something?**
[Compare the insider activity timing with recent news. Are they buying before good news? Selling before problems?]

**Catalyst Watch:**
[Any upcoming events (earnings, FDA decisions, contracts) that might explain insider behavior?]

## 🎯 COMBINED ASSESSMENT

**Signal Strength:** [Strong/Moderate/Weak]
**News Sentiment:** [Positive/Negative/Neutral]  
**Alignment:** [Insiders align with news / Insiders contradict news / Insufficient data]

## 💰 TRADING STRATEGY

[2-3 sentences: Detailed execution plan. What specifically should a trader do?]

**Risk Level:** [LOW / MEDIUM / HIGH] - [One line explanation]

Use ONLY information from your search results and the provided insider data. Use inline [[#]](url) citations throughout.

CRITICAL: You MUST include financial data in the JSON below. Extract actual numbers from SEC filings/balance sheets you found.

Finally, at the very end of your response, print a single JSON block wrapped in triple backticks with this exact structure:
\`\`\`json
{
  "decision": "Buy" | "Sell" | "Hold",
  "confidence": "High" | "Medium" | "Low",
  "halalScore": "40%" (IMPORTANT: Calculate ONLY based on criteria you can VERIFY. Each passed criterion = 20pts. If data is unavailable for a criterion, it counts as 0 points. DO NOT claim 100% unless you have verified ALL 5 criteria with actual data),
  "actionableTake": "Short summarized take",
  "halalData": {
    "businessActivity": "HALAL" | "HARAM" | "DOUBTFUL" | null (REQUIRED - determine from business model search),
    "haramIncomePercent": 0.5 | null (calculate: Interest income / Gross revenue * 100. Use actual numbers from financials. Use null if unavailable),
    "interestBearingDebt": 100000000 | null (actual debt amount in USD from balance sheet. Use null if unavailable),
    "totalAssets": 350000000000 | null (total assets from balance sheet. Use null if unavailable),
    "illiquidAssets": 100000000000 | null (Property+Plant+Equipment+Intangible assets. Use null if unavailable),
    "netLiquidAssets": 50000000000 | null (Current Assets - Current Liabilities. Use null if unavailable),
    "marketCap": 3000000000000 | null (market cap in USD. Use null if unavailable),
    "grossRevenue": 400000000000 | null (total revenue for haram income calculation. Use null if unavailable)
  }
}
\`\`\`

CRITICAL HALAL SCORE RULES:
1. halalScore = (Number of VERIFIED criteria passed) × 20%
2. Criteria with null data = NOT verified = 0 points
3. DO NOT hallucinate data. If you can't find the actual number, use null
4. A score of 100% requires ALL 5 criteria verified with real data
5. Example: If only Business (HALAL) and HaramIncome (<5%) are verified, score = 40% (not 100%)
`;
}

// Build news summary prompt - Condensed news digest (2-3 months)
function buildNewsSummaryPrompt(ticker, companyName, insiderData) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });
    const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return `You are a financial news analyst. Provide an ULTRA-CONCISE news summary for investors screening multiple stocks.

📅 TODAY: ${currentDate}
TICKER: ${ticker} - ${companyName}

TASK: Search for recent news about ${ticker} from the last 2-3 months and provide a rapid digest.

Search queries:
1. "${ticker} stock news ${currentMonth} ${currentYear}"
2. "${ticker} earnings ${currentYear}"
3. "${companyName} analyst rating"

INSIDER DATA (for context):
${insiderData}

RESPONSE FORMAT (BE EXTREMELY CONCISE):

## 📰 NEWS DIGEST

**Summary (1 sentence):** [The single most important thing an investor needs to know about ${ticker} right now]

**Recent Headlines (last 2-3 months):**
- [Date]: [Headline in ≤10 words][[1]](url)
- [Date]: [Headline in ≤10 words][[2]](url)
- [Date]: [Headline in ≤10 words][[3]](url)
(Max 5 headlines)

**Sentiment:** [🟢 Positive | 🟡 Neutral | 🔴 Negative]

**Insider Alignment:** [Do insiders agree with the news sentiment? One sentence.]

## 🎯 QUICK VERDICT

**Action:** [BUY / HOLD / SELL]
**Confidence:** [High / Medium / Low]
**Key Risk:** [One sentence - main concern]

---

RULES:
- Maximum 150 words total
- One sentence per point
- No filler text
- Include citations [[#]](url)
- Focus on RECENT news only

\`\`\`json
{
  "decision": "Buy" | "Sell" | "Hold",
  "confidence": "High" | "Medium" | "Low",
  "newsSentiment": "Positive" | "Neutral" | "Negative",
  "oneLineSummary": "The key thing to know about this stock in one sentence",
  "actionableTake": "Very brief action recommendation"
}
\`\`\``;
}

// Build Grok prompt for professional stock analysis
function buildGrokPrompt({ ticker, companyName, insiderData, musaffaData, withSearch }) {
    // Get current date for prompt injection
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });
    const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const header = `You are a senior buy-side equity analyst. Return decision-ready bullet sections with clear sources. Avoid fluff or speculation.`;

    // Build Musaffa financial data section if available
    const buildMusaffaSection = (data) => {
        if (!data) return '';
        
        const lines = [];
        lines.push('\nMUSAFFA FINANCIAL DATA (pre-fetched):');
        
        // Halal compliance
        if (data.status) lines.push(`- Halal Status: ${data.status}${data.grade ? ` (Grade: ${data.grade})` : ''}`);
        if (data.methodology) lines.push(`- Screening Methodology: ${data.methodology}`);
        
        // Key financial metrics
        if (data.marketCapValue || data.marketCapDisplay) {
            lines.push(`- Market Cap: ${data.marketCapDisplay || ('$' + (data.marketCapValue / 1e9).toFixed(2) + 'B')}`);
        }
        if (data.peRatio) lines.push(`- P/E Ratio: ${data.peRatio}`);
        if (data.eps) lines.push(`- EPS (TTM): ${data.eps}`);
        if (data.epsForward) lines.push(`- EPS Forward: ${data.epsForward}`);
        if (data.dividendYield) lines.push(`- Dividend Yield: ${data.dividendYield}%`);
        if (data.currentPrice) lines.push(`- Current Price: $${data.currentPrice}`);
        
        // Volume
        if (data.volume) lines.push(`- Volume: ${(data.volume / 1000).toFixed(0)}K`);
        if (data.avgVolume) lines.push(`- Avg Volume: ${(data.avgVolume / 1000).toFixed(0)}K`);
        
        // 52-week range
        if (data.fiftyTwoWeekLow && data.fiftyTwoWeekHigh) {
            lines.push(`- 52-Week Range: $${data.fiftyTwoWeekLow} - $${data.fiftyTwoWeekHigh}`);
        }
        
        // Financial ratios
        if (data.netMargin) lines.push(`- Net Margin: ${(data.netMargin * 100).toFixed(1)}%`);
        if (data.grossMargin) lines.push(`- Gross Margin: ${(data.grossMargin * 100).toFixed(1)}%`);
        if (data.operatingMargin) lines.push(`- Operating Margin: ${(data.operatingMargin * 100).toFixed(1)}%`);
        if (data.priceToBook) lines.push(`- Price/Book: ${data.priceToBook}`);
        if (data.returnOnAssets) lines.push(`- ROA: ${(data.returnOnAssets * 100).toFixed(1)}%`);
        if (data.returnOnEquity) lines.push(`- ROE: ${(data.returnOnEquity * 100).toFixed(1)}%`);
        if (data.currentRatio) lines.push(`- Current Ratio: ${data.currentRatio}`);
        if (data.quickRatio) lines.push(`- Quick Ratio: ${data.quickRatio}`);
        
        // Halal screening ratios
        if (data.debtRatio) lines.push(`- Debt Ratio: ${data.debtRatio}%`);
        if (data.halalPercent) lines.push(`- Halal Business %: ${data.halalPercent}%`);
        
        // Company info
        if (data.sector) lines.push(`- Sector: ${data.sector}`);
        if (data.country) lines.push(`- Country: ${data.country}`);
        
        return lines.length > 1 ? lines.join('\n') + '\n' : '';
    };

    const musaffaSection = buildMusaffaSection(musaffaData);

    if (withSearch) {
        return `${header}

📅 TODAY'S DATE: ${currentDate}
⚠️ The current year is ${currentYear}. Search for and use ONLY the most recent ${currentYear} data. Ignore outdated ${currentYear - 1} results.

TICKER: ${ticker} (${companyName})
INSIDER FORM 4 DATA (from SEC):
${insiderData}
${musaffaSection}
TASK:
- Use browsing/search to pull the latest ${currentMonth} ${currentYear} data: company filings, press releases, macro/sector news, X/Twitter chatter, and analyst actions.
- Perform a specialized check on business activities for "Halal Compliance" (Alcohol, Pork, Interest, Gambling, Entertainment).
  CRITICAL: Strictly distinguish between:
  - Asset Management/Advisory Services (HALAL): Companies that manage funds, provide investment advisory, charge management fees. These are PERMISSIBLE.
  - Lending/Banking (HARAM): Companies that lend money and earn interest income. These are NOT PERMISSIBLE.
  - Do NOT confuse asset managers with banks. If the company earns "Management Fees" or "Advisory Fees", classify as HALAL. Only classify as HARAM if primary revenue is from interest/riba.
  - If unsure or data unavailable, use "DOUBTFUL" or null. NEVER guess or hallucinate.
- Extract financial data from SEC filings (10-Q/10-K ${currentYear}) for comprehensive halal screening:
  REQUIRED RAW COMPONENTS (provide these separately - do NOT calculate Net Liquid Assets yourself):
  * Total Assets (from balance sheet)
  * Total Liabilities (from balance sheet)
  * Current Assets (from balance sheet)
  * Current Liabilities (from balance sheet)
  * Interest-bearing debt (from balance sheet notes)
  * Illiquid assets (property, plant, equipment, intangible assets)
  * Gross revenue
  * Interest income (for haram income calculation)
  IMPORTANT: Provide ONLY facts from SEC filings. If a number is unavailable, use null. Do NOT estimate or guess.
- Prioritize primary sources and most recent dates.
- Combine with insider activity to explain sentiment, catalysts, and risk/reward.

OUTPUT (succinct bullets; keep exactly these sections):
Highlights:
- Actionable Take: [Buy/Sell/Hold decision] (Source: …)
- Halal Score: [0-100%] (Based on IFG 5-criteria methodology. If financial data unavailable, estimate from business activities.)

Market/News Context:
- Dated facts with numbers; (Source: site or URL)

Insider vs News:
- How insider timing aligns/conflicts; cite filings/earnings (Source: …)

Key Catalysts:
- Upcoming events/contracts and why they matter (Source: …)

Risks:
- Realistic downside or execution risks (Source: …)

Actionable Take:
- Buy/Sell/Hold + confidence + short rationale (Source: …)

Sources (numbered 1..N on new lines, URLs or site names, no duplicates).

CRITICAL: You MUST include financial data in the JSON below. Extract actual numbers from SEC filings/balance sheets you found.

ANTI-HALLUCINATION RULES:
- Provide ONLY facts from SEC filings, company reports, or verified sources
- If data is unavailable, use null. Do NOT estimate, guess, or make up numbers
- For businessActivity: Use "HALAL" only if verified halal business, "HARAM" only if verified haram business, "DOUBTFUL" if uncertain, null if no data
- For financial numbers: Use exact values from balance sheets/income statements. If not found, use null
- Do NOT calculate Net Liquid Assets - provide raw components (totalAssets, totalLiabilities, currentAssets, currentLiabilities, illiquidAssets) and the system will calculate it

Finally, at the very end of your response, print a single JSON block wrapped in triple backticks with this exact structure:
\`\`\`json
{
  "decision": "Buy" | "Sell" | "Hold",
  "confidence": "High" | "Medium" | "Low",
  "halalScore": "40%" (IMPORTANT: Calculate ONLY based on criteria you can VERIFY with actual data. Each passed criterion = 20pts. If data is null, that criterion = 0pts. DO NOT claim 100% unless ALL 5 criteria have verified data),
  "actionableTake": "Short summarized take",
  "halalData": {
    "businessActivity": "HALAL" | "HARAM" | "DOUBTFUL" | null (determine from business model search. Asset managers = HALAL. Banks/lenders = HARAM. If unsure, use DOUBTFUL or null),
    "haramIncomePercent": 0.5 | null (Interest income / Gross revenue * 100. Use actual numbers. Use null if unavailable),
    "interestBearingDebt": 100000000 | null (actual debt amount in USD from balance sheet. Use null if unavailable),
    "totalAssets": 350000000000 | null (total assets from balance sheet. Use null if unavailable),
    "totalLiabilities": 200000000000 | null (total liabilities from balance sheet. Use null if unavailable),
    "currentAssets": 50000000000 | null (current assets from balance sheet. Use null if unavailable),
    "currentLiabilities": 30000000000 | null (current liabilities from balance sheet. Use null if unavailable),
    "illiquidAssets": 100000000000 | null (Property+Plant+Equipment+Intangible assets. Use null if unavailable),
    "netLiquidAssets": null (DO NOT CALCULATE - leave as null. System will calculate from components),
    "marketCap": 3000000000000 | null (market cap in USD. Use null if unavailable),
    "grossRevenue": 400000000000 | null (total revenue for haram income calculation. Use null if unavailable)
  }
}
\`\`\`

CRITICAL HALAL SCORE RULES:
1. halalScore = (Number of VERIFIED criteria passed) × 20%
2. Criteria with null data = NOT verified = 0 points
3. DO NOT hallucinate data. If you can't find the actual number, use null
4. A score of 100% requires ALL 5 criteria verified with real data
5. Example: If only Business (HALAL) and HaramIncome (<5%) are verified, score = 40% (not 100%)
6. Do NOT guess or estimate financial numbers - use only verified data from SEC filings
`;
    }

    // Build halal JSON template based on available Musaffa data
    const halalDataJson = musaffaData ? `{
    "businessActivity": ${musaffaData.status === 'HALAL' ? '"HALAL"' : musaffaData.status === 'NOT_HALAL' ? '"HARAM"' : 'null'},
    "haramIncomePercent": ${musaffaData.notHalalPercent || 'null'},
    "debtRatio": ${musaffaData.debtRatio || 'null'},
    "illiquidRatio": null,
    "netLiquidToMarketCap": null,
    "marketCap": ${musaffaData.marketCapValue || 'null'},
    "peRatio": ${musaffaData.peRatio || 'null'},
    "eps": ${musaffaData.eps || 'null'},
    "dividendYield": ${musaffaData.dividendYield || 'null'}
  }` : `{
    "businessActivity": null,
    "haramIncomePercent": null,
    "debtRatio": null,
    "illiquidRatio": null,
    "netLiquidToMarketCap": null
  }`;

    // Calculate a basic halal score from Musaffa data if available
    let halalScoreHint = '"N/A"';
    if (musaffaData?.status) {
        if (musaffaData.status === 'HALAL') {
            halalScoreHint = musaffaData.grade === 'A' ? '"80-100%"' : musaffaData.grade === 'B' ? '"60-80%"' : '"50-70%"';
        } else if (musaffaData.status === 'NOT_HALAL') {
            halalScoreHint = '"0-30%"';
        } else {
            halalScoreHint = '"30-50%"';
        }
    }

    return `${header}

TICKER: ${ticker} (${companyName})
INSIDER FORM 4 DATA (from SEC):
${insiderData}
${musaffaSection}
OUTPUT (succinct bullets):
- Verdict — Bullish/Bearish/Neutral with confidence, based on insider patterns${musaffaData ? ' and available financial metrics' : ''}.
- Patterns — cluster buys/sells, size vs history, exec participation, timing.
${musaffaData ? '- Valuation Context — use P/E, EPS, dividend yield to assess fair value.\n' : ''}- Risks — what could invalidate the read.
- Watch — specific price/action or fundamental checkpoints.
Keep it short and directly usable by a portfolio manager.

Finally, at the very end of your response, print a single JSON block wrapped in triple backticks with this exact structure:
\`\`\`json
{
  "decision": "Buy" | "Sell" | "Hold",
  "confidence": "High" | "Medium" | "Low",
  "halalScore": ${halalScoreHint},
  "actionableTake": "Short summarized take",
  "halalData": ${halalDataJson}
}
\`\`\``;
}

// Parse Musaffa HTML response to extract halal status
// Parse Musaffa HTML response to extract halal status
function parseMusaffaHtml(html, ticker) {
    const started = Date.now();
    let lastScopedAnalysis = null;
    const debug = {
        ticker: ticker,
        htmlLength: html && html.length,
        matches: [],
        finalStatus: null,
        indicators: {}
    };

    if (!html) return { status: null, debug };

    // Debug: Check if the specific text exists ANYWHERE in the raw HTML
    // Normalize whitespace and hyphens (handles non-breaking hyphens)
    const normalized = html
        .replace(/[\u2010-\u2015]/g, '-') // fancy hyphens → standard
        .replace(/\s+/g, ' ');
    const normalizedLower = normalized.toLowerCase();
    const hasNotHalalText = /not\s*halal/.test(normalizedLower);
    debug.matches.push({ method: 'Raw Content Check', hasNotHalalText: hasNotHalalText });

    // ---------------------------------------------------------
    // METHOD 0: JSON State Data (Reliable & Preferred)
    // ---------------------------------------------------------
    // Look for: "EPSN" ... "status": "FAIL" or "compliance": "NOT_HALAL"
    const tickerUpper = ticker.toUpperCase();
    const jsonPattern = new RegExp('"' + tickerUpper + '"[\\s\\S]{0,4000}?"(?:compliance|status)":\\s*"([^"]+)"', 'i');
    const jsonMatch = html.match(jsonPattern);
    if (jsonMatch) {
        const statusText = jsonMatch[1].trim().toUpperCase();
        debug.matches.push({ method: 'JSON Match Context', preview: html.substring(Math.max(0, jsonMatch.index - 40), jsonMatch.index + 200) });

        if (statusText.includes('NOT') || statusText === 'FAIL' || statusText.includes('HARAM')) {
            debug.matches.push({ method: 'JSON Found NOT_HALAL', found: statusText });
            debug.finalStatus = 'NOT_HALAL';
            debug.parseMs = Date.now() - started;
            return { status: 'NOT_HALAL', debug };
        }
        if (statusText === 'HALAL' || statusText === 'PASS' || statusText === 'COMPLIANT') {
            debug.matches.push({ method: 'JSON Found HALAL', found: statusText });
            debug.finalStatus = 'HALAL';
            debug.parseMs = Date.now() - started;
            return { status: 'HALAL', debug };
        }
        if (statusText.includes('DOUBT')) {
            debug.matches.push({ method: 'JSON Found DOUBTFUL', found: statusText });
            debug.finalStatus = 'DOUBTFUL';
            debug.parseMs = Date.now() - started;
            return { status: 'DOUBTFUL', debug };
        }
    }

    // ---------------------------------------------------------
    // METHOD 0.5: Angular/Server App State (Fallback for SSR)
    // ---------------------------------------------------------
    // Sometimes the status is in a script tag or hidden element.
    // Check for "status-text" in close proximity to "compliance-chip"
    // This is distinct from the visual scraper because we search globally first.

    // Check for server-side rendered not-halal classes globally
    if (html.includes('compliance-chip not-halal-chip') || html.includes('compliance-status-chip not-halal')) {
        debug.matches.push({ method: 'Critical Class Detection', found: 'not-halal-chip found globally' });
        debug.finalStatus = 'NOT_HALAL';
        return { status: 'NOT_HALAL', debug };
    }

    // Check for explicit "NOT HALAL" text globally with simple normalization
    if (html.toUpperCase().includes('>NOT HALAL<')) {
        debug.matches.push({ method: 'Critical Text Detection', found: '>NOT HALAL< found globally' });
        debug.finalStatus = 'NOT_HALAL';
        return { status: 'NOT_HALAL', debug };
    }

    // =========================================================================
    // STEP 1: Find HTML class attributes containing chip classes (NOT CSS selectors)
    // CSS selectors look like: .compliance-chip.not-halal-chip { ... }
    // HTML attributes look like: class="... compliance-chip not-halal-chip ..."
    // Key difference: HTML has class= prefix, CSS has dot prefix
    // =========================================================================

    // Find ALL class attributes with chip/status classes (not just the first)
    const classAttrRegex = /class\s*=\s*["']([^"']+)["']/gi;
    let match;
    let firstHalalChipInHtml = -1;
    let firstNotHalalChipInHtml = -1;
    let halalChipContext = '';
    let notHalalChipContext = '';

    // Collect ALL chip class attributes for debugging
    const allChipClasses = [];
    const allNotHalalChips = [];
    const allHalalChips = [];
    const allNotHalalClasses = []; // Any class containing "not-halal" or "not_halal"

    while ((match = classAttrRegex.exec(html)) !== null) {
        const classValue = match[1].toLowerCase();
        const pos = match.index;

        // Check for ANY not-halal indicator in class (various patterns)
        // Patterns: not-halal-chip, not-halal, nothalal, not_halal, fail, haram
        const isNotHalalClass = /\b(not-?halal|nothalal|not_halal|haram)\b/.test(classValue) ||
            (/\bcompliance\b/.test(classValue) && /\b(fail|failed|non-compliant)\b/.test(classValue));

        if (isNotHalalClass) {
            allNotHalalClasses.push({ pos, classValue: match[0].substring(0, 200), rawSnippet: html.substring(Math.max(0, pos - 100), pos + 300) });
        }

        // Check for not-halal-chip FIRST (most specific)
        if (/\bnot-?halal-chip\b/.test(classValue)) {
            allNotHalalChips.push({ pos, classValue: match[0].substring(0, 150), rawSnippet: html.substring(Math.max(0, pos - 50), pos + 200) });
            if (firstNotHalalChipInHtml === -1) {
                firstNotHalalChipInHtml = pos;
                notHalalChipContext = match[0];
            }
        }
        // Check for halal-chip (but not if it's part of not-halal-chip)
        else if (/\bhalal-chip\b/.test(classValue) && !/\bnot-?halal-chip\b/.test(classValue)) {
            allHalalChips.push({ pos, classValue: match[0].substring(0, 150), rawSnippet: html.substring(Math.max(0, pos - 50), pos + 200) });
            if (firstHalalChipInHtml === -1) {
                firstHalalChipInHtml = pos;
                halalChipContext = match[0];
            }
        }

        // Track compliance-chip/status classes for debugging
        if (/\bcompliance[-_]?(chip|status)\b/.test(classValue)) {
            allChipClasses.push({ pos, classValue: match[0].substring(0, 150) });
        }
    }

    // =========================================================================
    // STEP 1b: Look for status indicators in the content around compliance card
    // =========================================================================

    // Find the compliance-status-card section and look for NOT HALAL nearby
    // Use raw html for index finding to ensure slice coordinates are correct
    const cardIdx = html.toLowerCase().indexOf('compliance-status-card');
    let cardSectionStatus = null;
    let cardSectionSnippet = '';

    if (cardIdx !== -1) {
        // Get a larger chunk around the card (5000 chars should capture the status)
        const cardSection = html.substring(cardIdx, cardIdx + 5000);
        cardSectionSnippet = cardSection.substring(0, 500);

        // Look for status text in the card section
        // Check for ">NOT HALAL<" or similar patterns
        if (/>[\s\n]*(NOT[\s\n]*HALAL|Not[\s\n]*Halal)[\s\n]*</i.test(cardSection)) {
            cardSectionStatus = 'NOT_HALAL';
        } else if (/>[\s\n]*(DOUBTFUL|Doubtful)[\s\n]*</i.test(cardSection)) {
            cardSectionStatus = 'DOUBTFUL';
        } else if (/>[\s\n]*(HALAL|Halal)[\s\n]*</i.test(cardSection) && !/>[\s\n]*NOT/i.test(cardSection.substring(0, 1000))) {
            cardSectionStatus = 'HALAL';
        }

        // Also check for class indicators in card section
        if (/class\s*=\s*["'][^"']*\bnot-?halal/i.test(cardSection)) {
            cardSectionStatus = 'NOT_HALAL';
        }
    }

    debug.indicators.firstHalalChip = firstHalalChipInHtml;
    debug.indicators.firstNotHalalChip = firstNotHalalChipInHtml;
    debug.indicators.halalChipContext = halalChipContext;
    debug.indicators.notHalalChipContext = notHalalChipContext;
    debug.indicators.firstStatusText = normalizedLower.search(/>\s*(halal|not\s*halal|doubtful)\s*</);
    debug.indicators.cardSectionStatus = cardSectionStatus;
    debug.indicators.cardSectionSnippet = cardSectionSnippet;

    // Add ALL found chips to debug
    debug.indicators.allNotHalalChips = allNotHalalChips;
    debug.indicators.allHalalChips = allHalalChips;
    debug.indicators.allNotHalalClasses = allNotHalalClasses.slice(0, 5);
    debug.indicators.allComplianceChips = allChipClasses.slice(0, 10);

    debug.matches.push({
        method: 'Class Attribute Scan',
        totalClassAttrs: classAttrRegex.lastIndex > 0 ? 'many' : 0,
        notHalalChipsFound: allNotHalalChips.length,
        halalChipsFound: allHalalChips.length,
        notHalalClassesFound: allNotHalalClasses.length,
        complianceChipsFound: allChipClasses.length,
        firstNotHalalAt: firstNotHalalChipInHtml,
        firstHalalAt: firstHalalChipInHtml,
        cardSectionStatus: cardSectionStatus
    });

    console.log('🎯 Sniper Background: DEBUG RAW CHIPS:', {
        allNotHalalChips,
        allHalalChips: allHalalChips.slice(0, 3)
    });
    console.log('🎯 Sniper Background: DEBUG CARD SECTION:', {
        status: cardSectionStatus,
        snippet: cardSectionSnippet && cardSectionSnippet.substring(0, 300).replace(/\n/g, ' ')
    });

    // =========================================================================
    // STEP 2: Find status text content (">HALAL<" or ">NOT HALAL<")
    // =========================================================================

    // Find all status text matches for debugging
    const statusTextMatches = [];
    const statusTextRegex = />[\s\n]*([^<]{0,50}(?:halal|not\s*halal|doubtful)[^<]{0,20})[\s\n]*</gi;
    let statusMatch;
    while ((statusMatch = statusTextRegex.exec(html)) !== null) {
        const text = statusMatch[1].trim();
        // Skip if it looks like CSS or JS code
        if (!text.includes('{') && !text.includes(':') && !text.includes('.') && text.length < 30) {
            statusTextMatches.push({
                pos: statusMatch.index,
                text: text,
                rawSnippet: html.substring(Math.max(0, statusMatch.index - 30), statusMatch.index + 80)
            });
        }
    }

    debug.indicators.statusTextMatches = statusTextMatches;
    debug.matches.push({
        method: 'Status Text Scan',
        matchesFound: statusTextMatches.length,
        texts: statusTextMatches.map(m => m.text)
    });

    // =========================================================================
    // STEP 3: Check for explicit NOT HALAL indicators
    // =========================================================================

    // Check 1: "compliance-chip not-halal-chip" in same class attribute (space-separated)
    const explicitCheck1 = normalizedLower.includes('compliance-chip not-halal-chip');

    // Check 2: Alternative class naming
    const explicitCheck2 = normalizedLower.includes('compliance-status-chip not-halal');

    // Check 3: Status text ">NOT HALAL<" (use normalized which collapses whitespace)
    const explicitCheck3 = />\s*not\s+halal\s*</i.test(normalized);

    // Check 4: Found not-halal-chip in an HTML class attribute
    const explicitCheck4 = firstNotHalalChipInHtml !== -1;

    // Check 5: Found "NOT HALAL" in status text matches
    const explicitCheck5 = statusTextMatches.some(m => /not\s*halal/i.test(m.text));

    // Check 6: Found any not-halal class variation (not-halal, nothalal, etc.)
    const explicitCheck6 = allNotHalalClasses.length > 0;

    // Check 7: Card section analysis found NOT_HALAL
    const explicitCheck7 = cardSectionStatus === 'NOT_HALAL';

    debug.matches.push({
        method: 'Explicit Checks',
        check1_classCombo: explicitCheck1,
        check2_statusChip: explicitCheck2,
        check3_statusText: explicitCheck3,
        check4_htmlClassAttr: explicitCheck4,
        check5_statusTextContent: explicitCheck5,
        check6_anyNotHalalClass: explicitCheck6,
        check7_cardSection: explicitCheck7,
        notHalalChipContext: notHalalChipContext,
        notHalalClassesFound: allNotHalalClasses.length
    });

    // If we found not-halal-chip in an HTML class attribute, it's definitely NOT HALAL
    if (explicitCheck4) {
        debug.matches.push({ method: 'Explicit NOT HALAL', reason: 'not-halal-chip found in HTML class attribute', context: notHalalChipContext });
        debug.finalStatus = 'NOT_HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'NOT_HALAL', debug };
    }

    // If we found any not-halal class variation
    if (explicitCheck6) {
        const firstNotHalal = allNotHalalClasses[0];
        debug.matches.push({ method: 'Explicit NOT HALAL', reason: 'not-halal class found', context: firstNotHalal?.classValue, snippet: firstNotHalal?.rawSnippet?.substring(0, 200) });
        debug.finalStatus = 'NOT_HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'NOT_HALAL', debug };
    }

    // If card section analysis found NOT_HALAL
    if (explicitCheck7) {
        debug.matches.push({ method: 'Explicit NOT HALAL', reason: 'Card section contains NOT HALAL', snippet: cardSectionSnippet?.substring(0, 200) });
        debug.finalStatus = 'NOT_HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'NOT_HALAL', debug };
    }

    // If we found "NOT HALAL" text content
    if (explicitCheck5) {
        const notHalalTextMatch = statusTextMatches.find(m => /not\s*halal/i.test(m.text));
        debug.matches.push({ method: 'Explicit NOT HALAL', reason: 'NOT HALAL text found in page', text: notHalalTextMatch?.text, snippet: notHalalTextMatch?.rawSnippet });
        debug.finalStatus = 'NOT_HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'NOT_HALAL', debug };
    }

    // Other explicit checks
    if (explicitCheck1 || explicitCheck2 || explicitCheck3) {
        debug.matches.push({ method: 'Explicit NOT HALAL', reason: explicitCheck1 ? 'compliance-chip not-halal-chip' : explicitCheck2 ? 'compliance-status-chip not-halal' : 'status text pattern' });
        debug.finalStatus = 'NOT_HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'NOT_HALAL', debug };
    }

    // =========================================================================
    // STEP 4: Check for explicit HALAL indicators (only if NO not-halal found)
    // =========================================================================

    // Check if we found halal-chip in an HTML class attribute
    const halalCheck1 = firstHalalChipInHtml !== -1;

    // Check if we found "HALAL" text (not "NOT HALAL") in status text
    // Filter to only exact "HALAL" matches, not generic text like "Halal stocks" or "Halal ETF"
    const halalCheck2 = statusTextMatches.some(m => {
        const text = m.text.toLowerCase().trim();
        // Must be exactly "halal" or very close (e.g., "halal " with trailing space)
        return text === 'halal' || /^halal\s*$/i.test(text);
    });

    // Check 3: Card section analysis found HALAL
    const halalCheck3 = cardSectionStatus === 'HALAL';

    debug.matches.push({
        method: 'HALAL Checks',
        check1_htmlClassAttr: halalCheck1,
        check2_statusTextContent: halalCheck2,
        check3_cardSection: halalCheck3,
        halalChipContext: halalChipContext,
        cardSectionStatus: cardSectionStatus
    });

    // Priority: Card section analysis is most reliable for live site
    if (halalCheck3 && halalCheck1) {
        debug.matches.push({ method: 'Explicit HALAL', reason: 'Card section and halal-chip both indicate HALAL', context: halalChipContext });
        debug.finalStatus = 'HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'HALAL', debug };
    }

    // If we found halal-chip in HTML class attribute AND exact "HALAL" text
    if (halalCheck1 && halalCheck2) {
        debug.matches.push({ method: 'Explicit HALAL', reason: 'halal-chip found and HALAL text confirmed', context: halalChipContext });
        debug.finalStatus = 'HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'HALAL', debug };
    }

    // Card section alone (if we found it)
    if (halalCheck3) {
        debug.matches.push({ method: 'Explicit HALAL', reason: 'Card section indicates HALAL', snippet: cardSectionSnippet?.substring(0, 200) });
        debug.finalStatus = 'HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'HALAL', debug };
    }

    // halal-chip alone (less reliable on live site - might be default template)
    if (halalCheck1) {
        // Check if the snippet around halal-chip shows it's the actual status, not a template
        const halalSnippet = allHalalChips[0]?.rawSnippet || '';
        const snippetHasStatusText = />[\s\n]*HALAL[\s\n]*</i.test(halalSnippet);

        if (snippetHasStatusText) {
            debug.matches.push({ method: 'Explicit HALAL', reason: 'halal-chip with HALAL status text nearby', context: halalChipContext, snippet: halalSnippet?.substring(0, 200) });
            debug.finalStatus = 'HALAL';
            debug.parseMs = Date.now() - started;
            return { status: 'HALAL', debug };
        } else {
            // Log warning but still return HALAL (might be template issue)
            debug.matches.push({ method: 'HALAL (uncertain)', reason: 'halal-chip found but no status text nearby - might be template', context: halalChipContext });
            debug.finalStatus = 'HALAL';
            debug.parseMs = Date.now() - started;
            return { status: 'HALAL', debug };
        }
    }

    // If we found exact "HALAL" text content only
    if (halalCheck2) {
        const halalTextMatch = statusTextMatches.find(m => {
            const text = m.text.toLowerCase().trim();
            return text === 'halal' || /^halal\s*$/i.test(text);
        });
        debug.matches.push({ method: 'Explicit HALAL', reason: 'HALAL text found in page', text: halalTextMatch?.text, snippet: halalTextMatch?.rawSnippet });
        debug.finalStatus = 'HALAL';
        debug.parseMs = Date.now() - started;
        return { status: 'HALAL', debug };
    }

    // Global NOT HALAL indicator (used as fallback, not immediate return to avoid false positives)
    const globalNotHalal =
        normalizedLower.includes('not-halal-chip') ||
        normalizedLower.includes('not_halal_chip') ||
        hasNotHalalText;
    if (globalNotHalal) {
        debug.matches.push({ method: 'Global Indicator', reason: 'not-halal text/class detected' });
    }

    // JSON Method moved to top


    // ---------------------------------------------------------
    // METHOD 1: Scoped Card Detection (primary card + history)
    // ---------------------------------------------------------
    const reClassNotHalal = /(?:class|className)\s*=\s*["'][^"']*\bnot-?halal-chip/i;
    const reClassDoubtful = /(?:class|className)\s*=\s*["'][^"']*\bdoubtful-chip/i;
    const reClassHalal = /(?:class|className)\s*=\s*["'][^"']*\bhalal-chip/i;

    const getScopedStatus = () => {
        // Find the compliance-status-card component which contains the actual status
        const cardIdx = normalizedLower.indexOf('compliance-status-card');
        debug.matches.push({ method: 'Card Index', cardIdx: cardIdx });

        // Use the chip positions we already detected to search around the actual status
        const notHalalChipPos = debug.indicators.firstNotHalalChip;
        const halalChipPos = debug.indicators.firstHalalChip;
        const statusTextPos = debug.indicators.firstStatusText;

        // CRITICAL: Check for NOT_HALAL indicators FIRST before accepting HALAL
        // This prevents false positives when multiple sections exist

        // First pass: Check for NOT_HALAL in the main compliance card
        if (cardIdx !== -1) {
            const cardChunk = normalizedLower.slice(cardIdx, cardIdx + 20000);
            const cardChunkRaw = html.slice(cardIdx, cardIdx + 20000);

            // Check if compliance-chip and not-halal-chip appear together in same class attribute
            // Use [\s\S]*? to match across newlines (non-greedy until closing quote)
            // Pattern: class="... compliance-chip ... not-halal-chip ..." OR class="... not-halal-chip ... compliance-chip ..."
            const sameClassNotHalal = /class\s*=\s*["'][\s\S]*?(?:\bcompliance-chip[\s\S]*?\bnot-?halal-chip|\bnot-?halal-chip[\s\S]*?\bcompliance-chip)[\s\S]*?["']/i.test(cardChunkRaw);

            // Also check for status text "NOT HALAL" near compliance-chip
            const hasNotHalalTextInCard = />\s*not\s*halal\s*</i.test(cardChunkRaw);

            // More direct check: Look for the actual HTML element structure
            // Pattern: <div ... class="... compliance-chip not-halal-chip ..."> ... NOT HALAL
            const directNotHalalMatch = cardChunkRaw.match(/<div[^>]*class\s*=\s*["'][\s\S]*?(?:\bcompliance-chip[\s\S]*?\bnot-?halal-chip|\bnot-?halal-chip[\s\S]*?\bcompliance-chip)[\s\S]*?["'][^>]*>[\s\S]{0,500}?>\s*not\s*halal\s*</i);

            // Find positions of compliance-chip and not-halal-chip in HTML (not CSS)
            const complianceChipMatch = cardChunkRaw.match(/class\s*=\s*["'][\s\S]*?\bcompliance-chip/i);
            const notHalalChipMatch = cardChunkRaw.match(/class\s*=\s*["'][\s\S]*?\bnot-?halal-chip/i);

            const complianceNotHalalNearby = complianceChipMatch && notHalalChipMatch &&
                Math.abs(complianceChipMatch.index - notHalalChipMatch.index) < 500 &&
                hasNotHalalTextInCard;

            if (sameClassNotHalal || complianceNotHalalNearby || directNotHalalMatch) {
                debug.matches.push({
                    method: 'Card: NOT HALAL (priority check)',
                    sameClassNotHalal,
                    complianceNotHalalNearby,
                    hasNotHalalTextInCard,
                    directNotHalalMatch: !!directNotHalalMatch,
                    complianceChipFound: !!complianceChipMatch,
                    notHalalChipFound: !!notHalalChipMatch
                });
                return 'NOT_HALAL';
            }
        }

        // Check around not-halal-chip position specifically (if found in HTML class attribute)
        // But first, try to find the actual HTML element position, not CSS
        const notHalalChipInHtml = html.search(/class\s*=\s*["'][\s\S]*?\bnot-?halal-chip/i);
        if (notHalalChipInHtml !== -1) {
            const notHalalWindow = normalizedLower.slice(Math.max(0, notHalalChipInHtml - 500), notHalalChipInHtml + 2000);
            const notHalalWindowRaw = html.slice(Math.max(0, notHalalChipInHtml - 500), notHalalChipInHtml + 2000);

            // Check if compliance-chip appears with not-halal-chip in same class (either order, multiline-safe)
            const sameClassPattern = /class\s*=\s*["'][\s\S]*?(?:\bcompliance-chip[\s\S]*?\bnot-?halal-chip|\bnot-?halal-chip[\s\S]*?\bcompliance-chip)[\s\S]*?["']/i.test(notHalalWindowRaw);
            const hasNotHalalText = />\s*not\s*halal\s*</i.test(notHalalWindowRaw);

            // Direct element check
            const directMatch = notHalalWindowRaw.match(/<div[^>]*class\s*=\s*["'][\s\S]*?(?:\bcompliance-chip[\s\S]*?\bnot-?halal-chip|\bnot-?halal-chip[\s\S]*?\bcompliance-chip)[\s\S]*?["'][^>]*>[\s\S]{0,500}?>\s*not\s*halal\s*</i);

            // Find HTML class attributes (not CSS)
            const complianceChipMatch = notHalalWindowRaw.match(/class\s*=\s*["'][\s\S]*?\bcompliance-chip/i);
            const notHalalChipMatch = notHalalWindowRaw.match(/class\s*=\s*["'][\s\S]*?\bnot-?halal-chip/i);

            const complianceNearby = complianceChipMatch && notHalalChipMatch &&
                Math.abs(complianceChipMatch.index - notHalalChipMatch.index) < 500 &&
                hasNotHalalText;

            if (sameClassPattern || complianceNearby || directMatch) {
                debug.matches.push({
                    method: 'Not-Halal Window: NOT HALAL (priority check)',
                    sameClassPattern,
                    complianceNearby,
                    hasNotHalalText,
                    directMatch: !!directMatch,
                    complianceChipFound: !!complianceChipMatch,
                    notHalalChipFound: !!notHalalChipMatch
                });
                return 'NOT_HALAL';
            }
        }

        // Second pass: Build search windows for comprehensive check
        let searchWindows = [];

        if (notHalalChipPos !== -1) {
            searchWindows.push({ start: Math.max(0, notHalalChipPos - 500), end: notHalalChipPos + 2000, type: 'not-halal-chip', priority: 1 });
        }
        if (statusTextPos !== -1) {
            searchWindows.push({ start: Math.max(0, statusTextPos - 500), end: statusTextPos + 500, type: 'status-text', priority: 1 });
        }
        if (halalChipPos !== -1 && (notHalalChipPos === -1 || Math.abs(halalChipPos - notHalalChipPos) > 100)) {
            searchWindows.push({ start: Math.max(0, halalChipPos - 500), end: halalChipPos + 2000, type: 'halal-chip', priority: 2 });
        }
        if (cardIdx !== -1) {
            searchWindows.push({ start: cardIdx, end: cardIdx + 20000, type: 'card-index', priority: 2 });
        }

        // Sort windows: priority 1 (NOT_HALAL checks) first
        searchWindows.sort((a, b) => (a.priority || 2) - (b.priority || 2));

        let foundHalal = false;
        let foundNotHalal = false;
        let foundDoubtful = false;

        // Check each search window
        for (const window of searchWindows) {
            const chunk = normalizedLower.slice(window.start, window.end);
            const chunkRaw = html.slice(window.start, window.end);

            // Debug: look for key patterns in the chunk
            const notHalalChipIdx = chunk.indexOf('not-halal-chip');
            const halalChipIdx = chunk.indexOf('halal-chip');
            const complianceChipIdx = chunk.indexOf('compliance-chip');

            // Extract what's around the compliance-chip to see the actual class string
            let chipContext = '';
            if (complianceChipIdx !== -1) {
                chipContext = chunk.substring(complianceChipIdx - 50, complianceChipIdx + 150);
            }

            debug.matches.push({
                method: 'Chip Positions in Window',
                windowType: window.type,
                windowStart: window.start,
                notHalalChipIdx: notHalalChipIdx !== -1 ? notHalalChipIdx : -1,
                halalChipIdx: halalChipIdx !== -1 ? halalChipIdx : -1,
                complianceChipIdx: complianceChipIdx !== -1 ? complianceChipIdx : -1,
                chunkLength: chunk.length,
                chipContext: chipContext.substring(0, 200)
            });

            // Check for chip classes - look for compliance-chip WITH the status chip
            // First check if they appear in the same class attribute (most reliable)
            // Handle both orders: compliance-chip ... not-halal-chip OR not-halal-chip ... compliance-chip
            // Use [\s\S]*? to match across newlines (multiline-safe)
            const sameClassNotHalal = /class\s*=\s*["'][\s\S]*?(?:\bcompliance-chip[\s\S]*?\bnot-?halal-chip|\bnot-?halal-chip[\s\S]*?\bcompliance-chip)[\s\S]*?["']/i.test(chunkRaw);
            const sameClassDoubtful = /class\s*=\s*["'][\s\S]*?(?:\bcompliance-chip[\s\S]*?\bdoubtful-chip|\bdoubtful-chip[\s\S]*?\bcompliance-chip)[\s\S]*?["']/i.test(chunkRaw);
            const sameClassHalal = /class\s*=\s*["'][\s\S]*?(?:\bcompliance-chip[\s\S]*?\bhalal-chip|\bhalal-chip[\s\S]*?\bcompliance-chip)[\s\S]*?["']/i.test(chunkRaw) &&
                !sameClassNotHalal;

            // Fallback: check proximity (within 200 chars)
            const complianceChipPos = chunk.indexOf('compliance-chip');
            const notHalalChipPos = chunk.indexOf('not-halal-chip');
            const halalChipPos = chunk.indexOf('halal-chip');
            const doubtfulChipPos = chunk.indexOf('doubtful-chip');

            const hasNotHalalChipInCard = sameClassNotHalal ||
                (complianceChipPos !== -1 && notHalalChipPos !== -1 &&
                    Math.abs(complianceChipPos - notHalalChipPos) < 200);
            const hasDoubtfulChipInCard = sameClassDoubtful ||
                (complianceChipPos !== -1 && doubtfulChipPos !== -1 &&
                    Math.abs(complianceChipPos - doubtfulChipPos) < 200);
            // halal-chip that isn't part of "not-halal-chip" and is near compliance-chip
            const hasHalalChipInCard = sameClassHalal ||
                (complianceChipPos !== -1 && halalChipPos !== -1 &&
                    Math.abs(complianceChipPos - halalChipPos) < 200 &&
                    notHalalChipPos === -1);

            // Check for status text - must be the actual status display, not just any mention
            const hasNotHalalText = />\s*not\s*halal\s*</i.test(chunk);
            const hasDoubtfulText = />\s*doubtful\s*</i.test(chunk);
            const halalTextMatch = />\s*halal\s*</i.test(chunk);
            const hasHalalText = halalTextMatch && !hasNotHalalText;

            debug.matches.push({
                method: 'Scoped Window Analysis',
                windowType: window.type,
                found: {
                    sameClassNotHalal, sameClassDoubtful, sameClassHalal,
                    hasNotHalalChipInCard, hasDoubtfulChipInCard, hasHalalChipInCard,
                    hasNotHalalText, hasDoubtfulText, hasHalalText
                }
            });

            // Priority: NOT_HALAL > DOUBTFUL > HALAL
            if (hasNotHalalChipInCard || hasNotHalalText) {
                const snippetStart = Math.max(0, (notHalalChipIdx !== -1 ? notHalalChipIdx : complianceChipIdx) - 60);
                const snippetEnd = (notHalalChipIdx !== -1 ? notHalalChipIdx : complianceChipIdx) + 200;
                debug.matches.push({
                    method: 'Scoped Window: NOT HALAL',
                    windowType: window.type,
                    snippet: chunk.substring(snippetStart, snippetEnd)
                });
                foundNotHalal = true;
                break; // Stop immediately on NOT_HALAL
            }
            if (hasDoubtfulChipInCard || hasDoubtfulText) {
                const snippetStart = Math.max(0, (chunk.indexOf('doubtful-chip') !== -1 ? chunk.indexOf('doubtful-chip') : complianceChipIdx) - 60);
                const snippetEnd = (chunk.indexOf('doubtful-chip') !== -1 ? chunk.indexOf('doubtful-chip') : complianceChipIdx) + 200;
                debug.matches.push({
                    method: 'Scoped Window: DOUBTFUL',
                    windowType: window.type,
                    snippet: chunk.substring(snippetStart, snippetEnd)
                });
                foundDoubtful = true;
                // Continue checking for NOT_HALAL
            }
            if ((hasHalalChipInCard || hasHalalText) && !foundNotHalal && !foundDoubtful) {
                const snippetStart = Math.max(0, (halalChipIdx !== -1 ? halalChipIdx : complianceChipIdx) - 60);
                const snippetEnd = (halalChipIdx !== -1 ? halalChipIdx : complianceChipIdx) + 200;
                debug.matches.push({
                    method: 'Scoped Window: HALAL Found',
                    windowType: window.type,
                    snippet: chunk.substring(snippetStart, snippetEnd)
                });
                foundHalal = true;
                // Continue checking other windows for NOT_HALAL
            }
        }

        // Return results in priority order
        if (foundNotHalal) {
            return 'NOT_HALAL';
        }
        if (foundDoubtful) {
            return 'DOUBTFUL';
        }
        if (foundHalal) {
            debug.matches.push({ method: 'Scoped: Final HALAL (no NOT HALAL found in any window)' });
            return 'HALAL';
        }

        // Fallback: check compliance-history sidebar
        const historyIdx = normalizedLower.indexOf('compliance-history');
        if (historyIdx !== -1) {
            const histChunk = normalizedLower.slice(historyIdx, historyIdx + 5000);

            // Check for chip classes and text in history
            if (histChunk.includes('not-halal') || histChunk.includes('>not halal<')) {
                debug.matches.push({ method: 'History: NOT HALAL' });
                return 'NOT_HALAL';
            }
            if (histChunk.includes('doubtful-chip') || histChunk.includes('>doubtful<')) {
                debug.matches.push({ method: 'History: DOUBTFUL' });
                return 'DOUBTFUL';
            }
            // Only match halal if no negative indicators
            if ((histChunk.includes('halal-chip') || histChunk.includes('>halal<')) &&
                !histChunk.includes('not-halal') && !histChunk.includes('>not halal')) {
                debug.matches.push({ method: 'History: HALAL' });
                return 'HALAL';
            }
        }
        return null;
    };

    const scopedStatus = getScopedStatus();
    if (scopedStatus) {
        debug.finalStatus = scopedStatus;

        // If only vague global NOT HALAL signals exist, we still trust scoped HALAL
        if (scopedStatus === 'HALAL' && globalNotHalal) {
            debug.matches.push({ method: 'Global NOT HALAL ignored (scoped HALAL trusted)' });
        }

        debug.parseMs = Date.now() - started;
        return { status: scopedStatus, debug };
    }

    // If scoped status not found but a global NOT HALAL indicator exists, use it
    if (globalNotHalal) {
        debug.finalStatus = 'NOT_HALAL';
        debug.matches.push({ method: 'Fallback: Global NOT HALAL', reason: 'global indicator without scoped status' });
        debug.parseMs = Date.now() - started;
        return { status: 'NOT_HALAL', debug };
    }

    // ---------------------------------------------------------
    // METHOD 2: Global Chip Priority Search (fallback)
    // ---------------------------------------------------------
    const hasNotHalalChip = reClassNotHalal.test(html) ||
        normalizedLower.includes('not-halal-chip') || normalizedLower.includes('not_halal_chip');
    const hasDoubtfulChip = reClassDoubtful.test(html) ||
        normalizedLower.includes('doubtful-chip') || normalizedLower.includes('doubtful_chip');
    const hasHalalChip = reClassHalal.test(html) ||
        normalizedLower.includes('halal-chip') || normalizedLower.includes('halal_chip');

    debug.matches.push({
        method: 'Global Chip Scan',
        results: { notHalalChip: hasNotHalalChip, doubtfulChip: hasDoubtfulChip, halalChip: hasHalalChip }
    });

    if (hasNotHalalChip) {
        debug.finalStatus = 'NOT_HALAL';
        debug.matches.push({ method: 'DETECTED: not-halal-chip class' });
        debug.parseMs = Date.now() - started;
        return { status: 'NOT_HALAL', debug };
    }

    if (hasDoubtfulChip && !hasNotHalalChip) {
        debug.finalStatus = 'DOUBTFUL';
        debug.matches.push({ method: 'DETECTED: doubtful-chip class' });
        debug.parseMs = Date.now() - started;
        return { status: 'DOUBTFUL', debug };
    }

    if (hasHalalChip && !hasNotHalalChip && !hasDoubtfulChip) {
        debug.finalStatus = 'HALAL';
        debug.matches.push({ method: 'DETECTED: halal-chip class (no negative signals)' });
        debug.parseMs = Date.now() - started;
        return { status: 'HALAL', debug };
    }

    // ---------------------------------------------------------
    // METHOD 3: Proximity Search with Shariah Compliance Header
    // ---------------------------------------------------------
    const headerPattern = /Shariah\s+Compliance/ig;
    let headerMatch;

    while ((headerMatch = headerPattern.exec(html)) !== null) {
        const startIndex = headerMatch.index;
        const contextChunk = html.substring(startIndex, startIndex + 2000);

        // Skip "Screening Methodology" sections
        if (/Screening\s+Methodology/i.test(contextChunk.substring(0, 100))) {
            debug.matches.push({ method: 'Skipped: Methodology Section', preview: contextChunk.substring(0, 50) });
            continue;
        }

        debug.matches.push({ method: 'Found Compliance Header', contextPreview: contextChunk.substring(0, 100) });

        // Check for status text in this specific context
        if (/>\s*NOT\s*HALAL\s*</i.test(contextChunk)) {
            debug.finalStatus = 'NOT_HALAL';
            debug.matches.push({ method: 'Proximity: Text "NOT HALAL"' });
            debug.parseMs = Date.now() - started;
            return { status: 'NOT_HALAL', debug };
        }

        if (/>\s*DOUBTFUL\s*</i.test(contextChunk)) {
            debug.finalStatus = 'DOUBTFUL';
            debug.matches.push({ method: 'Proximity: Text "DOUBTFUL"' });
            debug.parseMs = Date.now() - started;
            return { status: 'DOUBTFUL', debug };
        }

        // Only match HALAL if no negative keywords nearby
        if (/>\s*HALAL\s*</i.test(contextChunk) && !/NOT/i.test(contextChunk.substring(0, 200))) {
            debug.finalStatus = 'HALAL';
            debug.matches.push({ method: 'Proximity: Text "HALAL" (verified no NOT nearby)' });
            debug.parseMs = Date.now() - started;
            return { status: 'HALAL', debug };
        }
    }

    // ---------------------------------------------------------
    // METHOD 3: Text Search Fallback
    // ---------------------------------------------------------
    const tickerSection = html.match(new RegExp(tickerUpper + '[\\s\\S]{0,4000}?(?:HALAL|NOT HALAL|DOUBTFUL)', 'i'));
    if (tickerSection) {
        const section = tickerSection[0].toUpperCase();
        const notHalalIndex = section.lastIndexOf('NOT HALAL');
        const halalIndex = section.lastIndexOf('HALAL');
        const doubtfulIndex = section.lastIndexOf('DOUBTFUL');

        if (notHalalIndex > -1 && notHalalIndex >= halalIndex - 4) {
            debug.finalStatus = 'NOT_HALAL';
            debug.parseMs = Date.now() - started;
            return { status: 'NOT_HALAL', debug };
        }
        if (doubtfulIndex > Math.max(notHalalIndex, halalIndex)) {
            debug.finalStatus = 'DOUBTFUL';
            debug.parseMs = Date.now() - started;
            return { status: 'DOUBTFUL', debug };
        }
        if (halalIndex > -1 && halalIndex > notHalalIndex) {
            debug.finalStatus = 'HALAL';
            debug.parseMs = Date.now() - started;
            return { status: 'HALAL', debug };
        }
    }

    debug.matches.push({ method: 'NO CLEAR STATUS FOUND', found: null });
    console.log('🎯 Sniper Background: Could not determine status');

    debug.parseMs = Date.now() - started;
    return { status: null, debug };
}

console.log('🎯 Sniper Background: Service worker loaded');
