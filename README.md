# 🎯 Halal Sniper Pro

<div align="center">

![Version](https://img.shields.io/badge/version-2.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Price](https://img.shields.io/badge/price-FREE-brightgreen.svg)

**AI-Powered Stock Research for Muslim Traders**

*Filter for Halal. Spot the Whales. Analyze with AI.*

[Features](#-features) • [Installation](#-installation) • [API Keys](#-api-keys-byok) • [Usage](#-usage) • [Contributing](#-contributing)

</div>

---

## 🌟 What is Halal Sniper Pro?

A **free, open-source** Chrome extension that enhances [OpenInsider.com](http://openinsider.com) with:

- **🤖 AI Research Reports** — Generate deep analysis on insider trades using Gemini or Grok
- **☪️ Halal Filtering** — Instant compliance badges using IFG 5-criteria methodology
- **🐋 Whale Detection** — Highlights $100K+ insider purchases
- **📊 Real Financial Data** — Alpha Vantage integration for SEC filings

**100% Free. BYOK (Bring Your Own Keys). No subscriptions. No limits.**

---

## ✨ Features

### 🤖 AI-Powered Research (The Main Feature)

When you spot an insider buy, ask: *"Why are they buying?"*

Click the AI Analysis button to generate:
- **Buy/Hold/Sell Decision** with confidence score
- **Insider Signal Analysis** — What do they know?
- **Catalyst Correlation** — Recent news, earnings, SEC filings
- **Trading Strategy** — Entry price, target, stop-loss
- **Risk Assessment** — Low/Medium/High with factors
- **Halal Score** — IFG 5-criteria breakdown

### 🐋 Whale Detection

- Highlights purchases over $100K (customizable threshold)
- **Cluster Detection** — Multiple insiders buying = stronger signal
- Gold highlighting makes whales impossible to miss

### ☪️ Halal Compliance Filter

Every stock row gets a badge:
- ✅ **HALAL** (green) — Passes all 5 IFG criteria
- ⚠️ **DOUBTFUL** (yellow) — Passes 3-4 criteria
- ❌ **HARAM** (red) — Fails majority

One-click filter to hide non-compliant stocks.

### 📊 Data Sources

| Source | What It Provides |
|--------|-----------------|
| **Musaffa.com** | Halal compliance status |
| **Alpha Vantage** | Balance sheets, income statements, analyst ratings |
| **Google Gemini** | AI analysis with web search |
| **xAI Grok** | AI analysis with real-time X/Twitter data |

---

## 📥 Installation

### From Source (Developer Mode)

1. **Clone this repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/halal-sniper-pro.git
   ```

2. **Open Chrome Extensions:**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top right toggle)

3. **Load Extension:**
   - Click **Load unpacked**
   - Select the `halal-sniper-pro` folder

4. **Configure API Keys:**
   - Click the ⚙️ gear icon in the sidebar
   - Add your API keys (see below)

---

## 🔑 API Keys (BYOK)

**BYOK = Bring Your Own Keys.** You control your API usage and costs.

| API | Purpose | Free Tier | Get Key |
|-----|---------|-----------|---------|
| **Google Gemini** | AI analysis (recommended) | 15 requests/min | [Google AI Studio](https://aistudio.google.com/apikey) |
| **Alpha Vantage** | Financial data | 25 calls/day | [alphavantage.co](https://www.alphavantage.co/support/#api-key) |
| **xAI Grok** | Alternative AI | Varies | [xAI Console](https://console.x.ai/) |

> **Note:** Gemini is recommended for structured output. All keys are stored locally in your browser — we never see them.

---

## 🚀 Usage

### On OpenInsider Screener Pages

1. Browse any screener (Latest Buys, Top Officer Purchases, etc.)
2. Sidebar appears with whale count and Halal breakdown
3. Every row shows HALAL/HARAM/DOUBTFUL badge
4. Toggle filters to show only Halal whales

### AI Analysis

1. Click a ticker to go to its stock page
2. Click **"🤖 AI Analysis"** button
3. Choose Quick (no search) or Deep + Web (with search)
4. Get your research report in seconds

---

## 🕌 Halal Scoring Methodology

Based on **Islamic Finance Guru (IFG) 5-Criteria System** by Mufti Taqi Usmani:

| Criterion | Requirement |
|-----------|-------------|
| **Business Activity** | Main business must be halal |
| **Haram Income** | < 5% of gross revenue |
| **Interest-Bearing Debt** | < 33% of total assets |
| **Illiquid Assets** | > 20% of total assets |
| **Net Liquid Assets** | < Market Capitalization |

Each criterion = 20 points. Score of 100 = fully compliant.

---

## 🏗️ Project Structure

```
halal-sniper-pro/
├── manifest.json          # Extension config (MV3)
├── background.js          # Service worker
├── modules/
│   ├── ai.js              # AI analysis & report rendering
│   ├── analyzer.js        # Stock page sidebar
│   ├── screener.js        # Screener page enhancement
│   ├── halal-scorer.js    # IFG 5-criteria scoring
│   ├── alpha-vantage.js   # Financial data API
│   ├── musaffa.js         # Halal status fetching
│   └── ...
├── lib/
│   └── jspdf.umd.min.js   # PDF export
└── backend/               # Optional Cloudflare Worker
    └── src/index.js       # Free AI proxy (if you don't want BYOK)
```

---

## 🔒 Privacy

- **No data collection** — Everything runs locally in your browser
- **No analytics** — We don't track you
- **No servers required** — BYOK means API calls go directly to providers
- **Open source** — Audit the code yourself

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Ideas for Contributions

- [ ] Yahoo Finance support
- [ ] TradingView overlay
- [ ] More AI models (Claude, etc.)
- [ ] Portfolio tracking
- [ ] Mobile companion app

---

## 📜 License

MIT License — see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- **[Islamic Finance Guru](https://www.islamicfinanceguru.com/)** — Halal screening methodology
- **[Musaffa.com](https://musaffa.com)** — Halal compliance data
- **[OpenInsider.com](http://openinsider.com)** — Insider trading data
- **[Alpha Vantage](https://www.alphavantage.co/)** — Financial data API

---

<div align="center">

**Built by a Muslim investor, for Muslim investors.**

*"And do not consume one another's wealth unjustly"* — Quran 2:188

⭐ Star this repo if you find it useful!

</div>
