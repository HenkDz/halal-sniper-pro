// =========================================================================
// 📄 PDF EXPORT MODULE - Professional Report Generation v2
// Clean, readable PDF reports with proper contrast and complete data
// =========================================================================

const SniperPDF = {
    jsPDF: null,

    /**
     * Initialize PDF library (jsPDF is bundled locally via manifest.json)
     */
    async init() {
        if (this.jsPDF) return true;

        if (window.jspdf?.jsPDF) {
            this.jsPDF = window.jspdf.jsPDF;
            console.log('📄 PDF Export: jsPDF ready');
            return true;
        }

        console.error('📄 PDF Export: jsPDF not found');
        return false;
    },

    // Color palette - Light theme for print readability
    colors: {
        primary: [37, 99, 235],       // Blue
        primaryLight: [219, 234, 254], // Light blue bg
        success: [22, 163, 74],       // Green
        successLight: [220, 252, 231], // Light green bg
        danger: [220, 38, 38],        // Red
        dangerLight: [254, 226, 226], // Light red bg
        warning: [202, 138, 4],       // Yellow/amber
        warningLight: [254, 249, 195], // Light yellow bg
        text: [17, 24, 39],           // Near black
        textMuted: [107, 114, 128],   // Gray
        textLight: [156, 163, 175],   // Light gray
        border: [229, 231, 235],      // Light border
        bgLight: [249, 250, 251],     // Very light gray
        white: [255, 255, 255],
    },

    /**
     * Generate a professional PDF report
     * @param {Object} reportData - Report data
     * @param {string} templateId - Optional template ID (quick, fundamentals, full, news)
     */
    async generateReport(reportData, templateId = null) {
        const loaded = await this.init();
        if (!loaded) {
            alert('Failed to load PDF library. Please try again.');
            return;
        }

        // Get template configuration
        const currentTemplate = templateId || SniperTemplates?.getCurrentTemplate() || 'full';
        const template = SniperTemplates?.getTemplate(currentTemplate) || { sections: {}, pdfPages: 'auto' };
        
        console.log('📄 PDF Export: Using template', currentTemplate, template.pdfPages);

        const {
            ticker,
            companyName,
            stats,
            signals,
            score,
            structured,
            markdown,
            halalData,
            sources,
            timestamp,
            financialRatios
        } = reportData;

        // For Quick Scan template, generate condensed 1-page PDF
        if (currentTemplate === 'quick') {
            return this.generateQuickScanPDF(reportData);
        }

        const doc = new this.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        let y = margin;

        // Helper functions
        const setColor = (c) => doc.setTextColor(c[0], c[1], c[2]);
        const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
        const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2]);

        const checkPageBreak = (needed = 25) => {
            if (y + needed > pageHeight - 20) {
                doc.addPage();
                y = margin;
                return true;
            }
            return false;
        };

        const drawLine = () => {
            setDraw(this.colors.border);
            doc.setLineWidth(0.3);
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;
        };

        // ═══════════════════════════════════════════════════════════════
        // HEADER
        // ═══════════════════════════════════════════════════════════════
        
        // Header background
        setFill(this.colors.primary);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Brand
        setColor(this.colors.white);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('HALAL SNIPER PRO', margin, 12);

        // Ticker
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text(ticker || 'N/A', margin, 28);

        // Company name
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const name = (companyName || 'Unknown').substring(0, 60);
        doc.text(name, margin, 36);

        // Date (right side)
        const dateStr = new Date(timestamp || Date.now()).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
        doc.setFontSize(9);
        doc.text(dateStr, pageWidth - margin, 12, { align: 'right' });

        // Decision badge
        if (structured?.decision) {
            const decision = structured.decision.toUpperCase();
            let badgeColor = this.colors.warning;
            if (decision.includes('BUY')) badgeColor = this.colors.success;
            else if (decision.includes('SELL') || decision.includes('AVOID')) badgeColor = this.colors.danger;
            
            setFill(this.colors.white);
            doc.roundedRect(pageWidth - margin - 40, 22, 40, 16, 3, 3, 'F');
            
            doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(decision, pageWidth - margin - 20, 29, { align: 'center' });
            
            if (structured.confidence) {
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.text(structured.confidence, pageWidth - margin - 20, 35, { align: 'center' });
            }
        }

        y = 55;

        // ═══════════════════════════════════════════════════════════════
        // KEY METRICS ROW
        // ═══════════════════════════════════════════════════════════════
        
        const metrics = [
            { 
                label: 'TOTAL BOUGHT', 
                value: this.formatMoney(stats?.totalBuy || 0),
                sub: `${stats?.uniqueBuyers?.size || 0} buyers`,
                color: this.colors.success
            },
            { 
                label: 'TOTAL SOLD', 
                value: this.formatMoney(stats?.totalSell || 0),
                sub: `${stats?.uniqueSellers?.size || 0} sellers`,
                color: this.colors.danger
            },
            { 
                label: 'NET FLOW', 
                value: this.formatMoney((stats?.totalBuy || 0) - (stats?.totalSell || 0), true),
                sub: `${stats?.countBuy || 0} buys / ${stats?.countSell || 0} sells`,
                color: ((stats?.totalBuy || 0) - (stats?.totalSell || 0)) >= 0 ? this.colors.success : this.colors.danger
            },
            { 
                label: 'SCORE', 
                value: score != null ? `${score}/100` : 'N/A',
                sub: this.getScoreLabel(score),
                color: score >= 60 ? this.colors.success : score >= 40 ? this.colors.warning : this.colors.danger
            }
        ];

        const boxW = (contentWidth - 9) / 4;
        const boxH = 22;

        metrics.forEach((m, i) => {
            const x = margin + (i * (boxW + 3));
            
            setFill(this.colors.bgLight);
            doc.roundedRect(x, y, boxW, boxH, 2, 2, 'F');
            
            setDraw(this.colors.border);
            doc.setLineWidth(0.3);
            doc.roundedRect(x, y, boxW, boxH, 2, 2, 'S');
            
            // Label
            setColor(this.colors.textMuted);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(m.label, x + boxW/2, y + 6, { align: 'center' });
            
            // Value
            doc.setTextColor(m.color[0], m.color[1], m.color[2]);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(m.value, x + boxW/2, y + 14, { align: 'center' });
            
            // Sub text
            setColor(this.colors.textLight);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(m.sub, x + boxW/2, y + 19, { align: 'center' });
        });

        y += boxH + 10;

        // ═══════════════════════════════════════════════════════════════
        // HALAL COMPLIANCE SECTION
        // ═══════════════════════════════════════════════════════════════
        
        this.drawSectionTitle(doc, 'HALAL COMPLIANCE', margin, y);
        y += 12;

        // Status badge
        let status = 'UNKNOWN';
        let statusColor = this.colors.textMuted;
        let statusBg = this.colors.bgLight;
        
        if (halalData?.status === 'HALAL') {
            status = 'HALAL COMPLIANT';
            statusColor = this.colors.success;
            statusBg = this.colors.successLight;
        } else if (halalData?.status === 'NOT_HALAL') {
            status = 'NOT HALAL';
            statusColor = this.colors.danger;
            statusBg = this.colors.dangerLight;
        } else if (halalData?.status === 'DOUBTFUL') {
            status = 'DOUBTFUL';
            statusColor = this.colors.warning;
            statusBg = this.colors.warningLight;
        }

        setFill(statusBg);
        doc.roundedRect(margin, y, 55, 10, 2, 2, 'F');
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(status, margin + 27.5, y + 7, { align: 'center' });

        // Grade
        if (halalData?.grade) {
            setFill(this.colors.bgLight);
            doc.roundedRect(margin + 58, y, 15, 10, 2, 2, 'F');
            doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(halalData.grade, margin + 65.5, y + 7, { align: 'center' });
        }

        // Halal score from structured data
        if (structured?.halalScore) {
            setColor(this.colors.text);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Score: ${structured.halalScore}`, margin + 80, y + 7);
        }

        y += 15;

        // Criteria breakdown (if available from markdown)
        const criteriaMatch = markdown?.match(/### Criterion Breakdown:([\s\S]*?)(?=---|\n##|$)/);
        if (criteriaMatch) {
            const criteriaText = criteriaMatch[1];
            
            // Parse each criterion block (starts with emoji)
            const criteriaBlocks = criteriaText.split(/(?=✅|❌|⚠)/);
            
            const parsedCriteria = criteriaBlocks
                .filter(block => block.trim())
                .map(block => {
                    const passed = block.startsWith('✅');
                    const failed = block.startsWith('❌');
                    
                    // Extract name: **1. Business Activity** or similar
                    const nameMatch = block.match(/\*\*\d+\.\s*([^*]+)\*\*/);
                    const name = nameMatch ? nameMatch[1].trim() : '';
                    
                    // Extract value
                    const valueMatch = block.match(/Value:\s*([^\n]+)/);
                    const value = valueMatch ? valueMatch[1].trim() : '';
                    
                    // Extract description
                    const descMatch = block.match(/\*\*\s*\n\s*([^\n]+)/);
                    const desc = descMatch ? descMatch[1].trim() : '';
                    
                    return { passed, failed, name, value, desc };
                })
                .filter(c => c.name);
            
            if (parsedCriteria.length > 0) {
                checkPageBreak(parsedCriteria.length * 7 + 5);
                
                parsedCriteria.forEach(c => {
                    // Pass/Fail indicator (colored circle)
                    if (c.passed) {
                        doc.setFillColor(this.colors.success[0], this.colors.success[1], this.colors.success[2]);
                    } else {
                        doc.setFillColor(this.colors.danger[0], this.colors.danger[1], this.colors.danger[2]);
                    }
                    doc.circle(margin + 3, y + 1.5, 1.8, 'F');
                    
                    // Name
                    setColor(this.colors.text);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text(c.name, margin + 8, y + 3);
                    
                    // Value (right aligned)
                    setColor(c.passed ? this.colors.success : this.colors.danger);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text(c.value, pageWidth - margin, y + 3, { align: 'right' });
                    
                    y += 6;
                });
                
                y += 2;
            }
        }

        y += 5;
        drawLine();

        // ═══════════════════════════════════════════════════════════════
        // INSIDER SIGNALS SECTION
        // ═══════════════════════════════════════════════════════════════
        
        checkPageBreak(40);
        this.drawSectionTitle(doc, 'INSIDER SIGNALS', margin, y);
        y += 12;

        // Signal badges (no emojis - they don't render in PDF)
        const signalList = [];
        if (signals?.clusterBuying) signalList.push({ text: 'Cluster Buying', color: [249, 115, 22] });
        if (signals?.whaleTrades?.length > 0) signalList.push({ text: `${signals.whaleTrades.length} Whale Trade(s)`, color: [234, 179, 8] });
        if (signals?.executiveBuys?.length > 0) signalList.push({ text: `${signals.executiveBuys.length} Executive Buy(s)`, color: [168, 85, 247] });
        if (signals?.reversalSignal) signalList.push({ text: 'Reversal Signal', color: [56, 189, 248] });
        if (signals?.freshEntries?.length > 0) signalList.push({ text: `${signals.freshEntries.length} New Entry`, color: [45, 212, 191] });
        if (signals?.buyStreak >= 3) signalList.push({ text: `${signals.buyStreak}d Buy Streak`, color: [34, 197, 94] });
        if (signals?.isPennyStock) signalList.push({ text: 'Penny Stock', color: [239, 68, 68] });
        if (signals?.priceDrawdown > 0.5) signalList.push({ text: 'Downtrend', color: [239, 68, 68] });

        if (signalList.length > 0) {
            let badgeX = margin;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            
            signalList.forEach(s => {
                // Calculate proper width for text
                const textWidth = doc.getTextWidth(s.text);
                const w = textWidth + 6; // padding
                const h = 6;
                
                // Wrap to next line if needed
                if (badgeX + w > pageWidth - margin) {
                    badgeX = margin;
                    y += h + 3;
                }
                
                // Badge background (lighter version)
                doc.setFillColor(
                    Math.min(255, s.color[0] + 120),
                    Math.min(255, s.color[1] + 120),
                    Math.min(255, s.color[2] + 120)
                );
                doc.roundedRect(badgeX, y, w, h, 1.5, 1.5, 'F');
                
                // Badge border
                doc.setDrawColor(s.color[0], s.color[1], s.color[2]);
                doc.setLineWidth(0.4);
                doc.roundedRect(badgeX, y, w, h, 1.5, 1.5, 'S');
                
                // Text (centered)
                doc.setTextColor(s.color[0], s.color[1], s.color[2]);
                doc.text(s.text, badgeX + 3, y + 4.2);
                
                badgeX += w + 4;
            });
            y += 12;
        } else {
            setColor(this.colors.textMuted);
            doc.setFontSize(9);
            doc.text('No significant signals detected', margin, y + 4);
            y += 10;
        }

        // Insider stats grid
        const insiderStats = [
            { label: 'Recent Activity (30d)', value: `${signals?.recentActivity || 0} trades` },
            { label: 'Buy Streak', value: `${signals?.buyStreak || 0} days` },
            { label: 'Unique Buyers', value: stats?.uniqueBuyers?.size || 0 },
            { label: 'Unique Sellers', value: stats?.uniqueSellers?.size || 0 }
        ];

        setFill(this.colors.bgLight);
        doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');

        const statW = contentWidth / 4;
        insiderStats.forEach((s, i) => {
            const x = margin + (i * statW);
            
            setColor(this.colors.textMuted);
            doc.setFontSize(7);
            doc.text(s.label, x + statW/2, y + 4, { align: 'center' });
            
            setColor(this.colors.text);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(String(s.value), x + statW/2, y + 10, { align: 'center' });
            doc.setFont('helvetica', 'normal');
        });

        y += 17;
        drawLine();

        // ═══════════════════════════════════════════════════════════════
        // AI ANALYSIS SECTION
        // ═══════════════════════════════════════════════════════════════
        
        checkPageBreak(40);
        this.drawSectionTitle(doc, 'AI ANALYSIS', margin, y);
        y += 12;

        // Actionable Take box
        if (structured?.actionableTake) {
            setFill(this.colors.primaryLight);
            const takeLines = doc.splitTextToSize(structured.actionableTake, contentWidth - 10);
            const takeHeight = Math.min(takeLines.length * 4.5 + 10, 30);
            
            doc.roundedRect(margin, y, contentWidth, takeHeight, 2, 2, 'F');
            setDraw(this.colors.primary);
            doc.setLineWidth(0.5);
            doc.roundedRect(margin, y, contentWidth, takeHeight, 2, 2, 'S');
            
            setColor(this.colors.primary);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text('ACTIONABLE TAKE', margin + 4, y + 5);
            
            setColor(this.colors.text);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(takeLines.slice(0, 4), margin + 4, y + 11);
            
            y += takeHeight + 5;
        }

        // Full analysis text - render all sections from markdown
        if (markdown) {
            const sections = this.parseMarkdownSections(markdown);
            
            sections.forEach(section => {
                checkPageBreak(20);
                
                // Section header
                if (section.title) {
                    y += 4;
                    doc.setFillColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2]);
                    doc.rect(margin, y - 2, 2, 8, 'F');
                    
                    setColor(this.colors.primary);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(section.title.toUpperCase(), margin + 5, y + 4);
                    y += 10;
                }
                
                // Section content
                if (section.content) {
                    const cleanContent = this.cleanSectionContent(section.content);
                    const lines = doc.splitTextToSize(cleanContent, contentWidth);
                    
                    setColor(this.colors.text);
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    
                    const lineH = 4.2;
                    
                    for (let i = 0; i < lines.length; i++) {
                        if (checkPageBreak(lineH + 3)) {
                            // Continued header on new page
                            setColor(this.colors.textMuted);
                            doc.setFontSize(8);
                            doc.setFont('helvetica', 'italic');
                            doc.text(section.title ? `${section.title} (continued)` : 'Report (continued)', margin, y);
                            y += 6;
                            setColor(this.colors.text);
                            doc.setFontSize(9);
                            doc.setFont('helvetica', 'normal');
                        }
                        
                        doc.text(lines[i], margin, y);
                        y += lineH;
                    }
                    
                    y += 3;
                }
            });
        }

        y += 5;

        // ═══════════════════════════════════════════════════════════════
        // SOURCES
        // ═══════════════════════════════════════════════════════════════
        
        if (sources && sources.length > 0) {
            checkPageBreak(25);
            drawLine();
            
            this.drawSectionTitle(doc, 'SOURCES', margin, y);
            y += 12;
            
            const validSources = sources.filter(s => s && /^https?:\/\//i.test(s)).slice(0, 8);
            
            setColor(this.colors.textMuted);
            doc.setFontSize(7);
            
            validSources.forEach((src, i) => {
                if (checkPageBreak(5)) {}
                
                try {
                    const url = new URL(src);
                    const display = url.hostname.includes('vertexaisearch') 
                        ? `Google Source ${i + 1}`
                        : url.hostname.replace('www.', '');
                    doc.text(`${i + 1}. ${display}`, margin, y);
                } catch {
                    doc.text(`${i + 1}. ${src.substring(0, 50)}...`, margin, y);
                }
                y += 4;
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // FOOTER ON ALL PAGES
        // ═══════════════════════════════════════════════════════════════
        
        const totalPages = doc.internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            
            // Footer line
            setDraw(this.colors.border);
            doc.setLineWidth(0.3);
            doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
            
            // Disclaimer
            setColor(this.colors.textLight);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('Generated by Halal Sniper Pro • For educational purposes only • Not financial advice', pageWidth / 2, pageHeight - 7, { align: 'center' });
            
            // Page number
            doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
        }

        // Save
        const filename = `${ticker}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        console.log('📄 PDF saved:', filename);
        return filename;
    },

    /**
     * Draw section title with accent bar
     */
    drawSectionTitle(doc, title, x, y) {
        // Accent bar
        doc.setFillColor(this.colors.primary[0], this.colors.primary[1], this.colors.primary[2]);
        doc.rect(x, y - 3, 3, 10, 'F');
        
        // Title text
        doc.setTextColor(this.colors.text[0], this.colors.text[1], this.colors.text[2]);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, x + 6, y + 4);
    },

    /**
     * Format money
     */
    formatMoney(n, showSign = false) {
        if (n == null) return '$0';
        const sign = showSign && n > 0 ? '+' : '';
        const abs = Math.abs(n);
        if (abs >= 1000000) return sign + '$' + (n / 1000000).toFixed(1) + 'M';
        if (abs >= 1000) return sign + '$' + (n / 1000).toFixed(0) + 'K';
        return sign + '$' + Math.round(n);
    },

    /**
     * Get score label
     */
    getScoreLabel(score) {
        if (score == null) return 'Unknown';
        if (score >= 75) return 'Strong Buy';
        if (score >= 60) return 'Buy';
        if (score >= 45) return 'Watch';
        if (score >= 30) return 'Weak';
        return 'Avoid';
    },

    /**
     * Parse markdown into sections for better rendering
     */
    parseMarkdownSections(text) {
        if (!text) return [];
        
        // Remove the first highlights/halal sections (we render those separately)
        let content = text
            .replace(/## ⚡ Highlights[\s\S]*?---/gi, '')
            .replace(/## Halal Compliance Score[\s\S]*?---/gi, '');
        
        const sections = [];
        
        // Split by ## headers
        const parts = content.split(/^##\s+/gm);
        
        parts.forEach(part => {
            if (!part.trim()) return;
            
            // First line is the title
            const lines = part.split('\n');
            let title = lines[0].trim();
            let sectionContent = lines.slice(1).join('\n').trim();
            
            // Remove emojis from title
            title = title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|⚡|🔍|📰|🎯|💰|📎|🛡️|🤖/gu, '').trim();
            
            // Skip empty sections or source sections (we handle those separately)
            if (!sectionContent || title.toLowerCase().includes('source')) return;
            
            sections.push({ title, content: sectionContent });
        });
        
        // If no sections found, treat the whole thing as one section
        if (sections.length === 0 && content.trim()) {
            sections.push({ title: '', content: content });
        }
        
        return sections;
    },

    /**
     * Clean section content for PDF rendering
     */
    cleanSectionContent(text) {
        if (!text) return '';
        
        return text
            // Remove emojis
            .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|⚡|🔍|📰|🎯|💰|📎|🛡️|🤖|✅|❌|⚠️|✓|✗/gu, '')
            // Remove markdown bold/italic but keep text
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            // Remove links but keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/\[\[\d+\]\]\([^)]+\)/g, '')
            // Clean bullets
            .replace(/^[\-\*•]\s+/gm, '- ')
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            // Remove sub-headers (###)
            .replace(/^###\s+/gm, '')
            // Clean whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    },

    /**
     * Generate Quick Scan PDF - condensed 1-page summary
     */
    async generateQuickScanPDF(reportData) {
        const {
            ticker,
            companyName,
            stats,
            signals,
            score,
            structured,
            halalData,
            timestamp
        } = reportData;

        const doc = new this.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let y = margin;

        const setColor = (c) => doc.setTextColor(c[0], c[1], c[2]);
        const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);

        // ══════════════════════════════════════════════════════════════
        // COMPACT HEADER
        // ══════════════════════════════════════════════════════════════
        
        setFill(this.colors.primary);
        doc.rect(0, 0, pageWidth, 35, 'F');

        setColor(this.colors.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('HALAL SNIPER PRO • QUICK SCAN', margin, 10);

        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(ticker || 'N/A', margin, 24);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const name = (companyName || 'Unknown').substring(0, 50);
        doc.text(name, margin, 31);

        // Date
        const dateStr = new Date(timestamp || Date.now()).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
        doc.setFontSize(8);
        doc.text(dateStr, pageWidth - margin, 10, { align: 'right' });

        y = 45;

        // ══════════════════════════════════════════════════════════════
        // VERDICT BOX (centered, prominent)
        // ══════════════════════════════════════════════════════════════
        
        let verdict = 'WATCH';
        let verdictColor = this.colors.warning;
        let verdictBg = this.colors.warningLight;

        if (halalData?.status === 'NOT_HALAL') {
            verdict = 'SKIP (Not Halal)';
            verdictColor = this.colors.danger;
            verdictBg = this.colors.dangerLight;
        } else if (score >= 75 && halalData?.status === 'HALAL') {
            verdict = 'STRONG BUY';
            verdictColor = this.colors.success;
            verdictBg = this.colors.successLight;
        } else if (score >= 60 && halalData?.status !== 'NOT_HALAL') {
            verdict = 'BUY';
            verdictColor = this.colors.success;
            verdictBg = this.colors.successLight;
        } else if (score < 30) {
            verdict = 'AVOID';
            verdictColor = this.colors.danger;
            verdictBg = this.colors.dangerLight;
        }

        const verdictBoxH = 35;
        setFill(verdictBg);
        doc.roundedRect(margin, y, contentWidth, verdictBoxH, 4, 4, 'F');
        doc.setDrawColor(verdictColor[0], verdictColor[1], verdictColor[2]);
        doc.setLineWidth(1);
        doc.roundedRect(margin, y, contentWidth, verdictBoxH, 4, 4, 'S');

        doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(verdict, pageWidth / 2, y + 15, { align: 'center' });

        setColor(this.colors.text);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Score: ${score}/100`, pageWidth / 2, y + 28, { align: 'center' });

        y += verdictBoxH + 15;

        // ══════════════════════════════════════════════════════════════
        // KEY METRICS (2x2 grid)
        // ══════════════════════════════════════════════════════════════
        
        const net = (stats?.totalBuy || 0) - (stats?.totalSell || 0);
        const metrics = [
            { label: 'Net Flow', value: this.formatMoney(net, true), color: net >= 0 ? this.colors.success : this.colors.danger },
            { label: 'Compliance', value: halalData?.status || 'Unknown', color: halalData?.status === 'HALAL' ? this.colors.success : halalData?.status === 'NOT_HALAL' ? this.colors.danger : this.colors.warning },
            { label: 'Buyers', value: String(stats?.uniqueBuyers?.size || 0), color: this.colors.success },
            { label: 'Sellers', value: String(stats?.uniqueSellers?.size || 0), color: this.colors.danger }
        ];

        const boxW = (contentWidth - 10) / 2;
        const boxH = 25;

        metrics.forEach((m, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = margin + (col * (boxW + 10));
            const boxY = y + (row * (boxH + 8));

            setFill(this.colors.bgLight);
            doc.roundedRect(x, boxY, boxW, boxH, 3, 3, 'F');

            setColor(this.colors.textMuted);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(m.label.toUpperCase(), x + boxW / 2, boxY + 8, { align: 'center' });

            doc.setTextColor(m.color[0], m.color[1], m.color[2]);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(m.value, x + boxW / 2, boxY + 19, { align: 'center' });
        });

        y += (boxH + 8) * 2 + 15;

        // ══════════════════════════════════════════════════════════════
        // SIGNALS (horizontal badges)
        // ══════════════════════════════════════════════════════════════
        
        const signalList = [];
        if (signals?.clusterBuying) signalList.push('Cluster Buying');
        if (signals?.whaleTrades?.length > 0) signalList.push('Whale Activity');
        if (signals?.executiveBuys?.length > 0) signalList.push('Executive Buys');
        if (signals?.reversalSignal) signalList.push('Reversal Signal');
        if (signals?.buyStreak >= 3) signalList.push('Buy Streak');

        if (signalList.length > 0) {
            setColor(this.colors.textMuted);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('SIGNALS DETECTED:', margin, y);
            y += 8;

            setColor(this.colors.primary);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(signalList.join(' • '), margin, y);
            y += 10;
        }

        // ══════════════════════════════════════════════════════════════
        // ACTIONABLE TAKE (if available)
        // ══════════════════════════════════════════════════════════════
        
        if (structured?.actionableTake) {
            y += 5;
            setFill(this.colors.primaryLight);
            const takeLines = doc.splitTextToSize(structured.actionableTake, contentWidth - 16);
            const takeH = takeLines.length * 5 + 14;
            
            doc.roundedRect(margin, y, contentWidth, takeH, 3, 3, 'F');
            
            setColor(this.colors.primary);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text('ACTIONABLE TAKE', margin + 8, y + 8);
            
            setColor(this.colors.text);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(takeLines, margin + 8, y + 16);
        }

        // ══════════════════════════════════════════════════════════════
        // FOOTER
        // ══════════════════════════════════════════════════════════════
        
        setColor(this.colors.textLight);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Generated by Halal Sniper Pro • Quick Scan • Not financial advice', pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Save
        const filename = `${ticker}_QuickScan_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        console.log('📄 Quick Scan PDF saved:', filename);
        return filename;
    },

    /**
     * Clean markdown to plain text (removes emojis which don't render in PDF)
     */
    cleanMarkdown(text) {
        if (!text) return '';
        
        return text
            // Remove the highlights/criteria section (we render separately)
            .replace(/## ⚡ Highlights[\s\S]*?---/gi, '')
            .replace(/## Halal Compliance Score[\s\S]*?---/gi, '')
            // Remove all emojis (they don't render properly in jsPDF)
            .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|⚡|🛡️|🤖|📎|✅|❌|⚠️|✓|✗/gu, '')
            // Remove HTML
            .replace(/<[^>]+>/g, '')
            // Remove markdown formatting
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/__([^_]+)__/g, '$1')
            .replace(/_([^_]+)_/g, '$1')
            // Remove links but keep text
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/\[\[\d+\]\]\([^)]+\)/g, '')
            // Clean bullets - use dash instead of bullet
            .replace(/^[\-\*•]\s+/gm, '- ')
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            // Clean whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
};

window.SniperPDF = SniperPDF;
