# 🔐 Halal Sniper Pro - Backend Setup

## Quick Start

Your Cloudflare Worker is deployed at:
**https://halal-sniper-api.noonou7.workers.dev**

## 📋 Required Secrets

Run these commands in the `backend/` folder to add your API keys:

```bash
# Google Gemini API Key (get from https://aistudio.google.com/apikey)
npx wrangler secret put GEMINI_API_KEY

# xAI Grok API Key (get from https://console.x.ai/)
npx wrangler secret put GROK_API_KEY

# Polar.sh Access Token (get from https://polar.sh/settings/developers)
npx wrangler secret put POLAR_ACCESS_TOKEN

# Polar.sh Webhook Secret (generated when creating webhook)
npx wrangler secret put POLAR_WEBHOOK_SECRET
```

## 🐻‍❄️ Polar.sh Setup

### 1. Create Your Product

1. Go to [polar.sh](https://polar.sh) and sign in
2. Create an organization (e.g., `halal-sniper`)
3. Create a new Product:
   - **Name**: Halal Sniper Pro
   - **Price**: $9.99/month (or your preferred price)
   - **Description**: Unlimited AI analysis, whale alerts, and more

### 2. Get Access Token

1. Go to **Settings → Developers**
2. Click **"New Token"**
3. Configure:
   - **Name**: `Halal Sniper API`
   - **Expiration**: 1 year (recommended) or No expiration
   - **Scopes** (check these boxes):
     - ✅ `subscriptions:read` — Check subscription status
     - ✅ `customers:read` — Look up customers by email
     - ✅ `orders:read` — Verify purchase history
     - ✅ `checkouts:write` — Generate checkout links (optional)
4. Click **Create** and copy the token (starts with `polar_oat_...`)
5. Run:
   ```bash
   npx wrangler secret put POLAR_ACCESS_TOKEN
   # Paste your token when prompted
   ```

### 3. Set Up Webhook

1. Go to Settings → Webhooks
2. Click "Add Webhook"
3. **URL**: `https://halal-sniper-api.noonou7.workers.dev/api/webhook/polar`
4. **Events**: Select:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
   - `subscription.revoked`
5. Copy the webhook secret and run:
   ```bash
   npx wrangler secret put POLAR_WEBHOOK_SECRET
   # Paste your secret when prompted
   ```

### 4. Update Organization Slug

Edit `wrangler.toml` and update:
```toml
POLAR_ORGANIZATION = "your-org-slug"  # Your Polar.sh organization
```

Then redeploy:
```bash
npx wrangler deploy
```

## 🧪 Testing the API

### Health Check
```bash
curl https://halal-sniper-api.noonou7.workers.dev/
# {"service":"Halal Sniper Pro API","version":"1.0.0","status":"operational"}
```

### Validate Subscription
```bash
curl -X POST https://halal-sniper-api.noonou7.workers.dev/api/validate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Check Usage
```bash
curl -X POST https://halal-sniper-api.noonou7.workers.dev/api/usage \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 📁 File Structure

```
backend/
├── src/
│   └── index.js       # Main worker code
├── wrangler.toml      # Configuration
├── package.json       # Dependencies
└── SETUP.md           # This file
```

## 🔄 Deployment Commands

```bash
# Deploy to production
npx wrangler deploy

# View real-time logs
npx wrangler tail

# Run locally for testing
npx wrangler dev

# List KV namespaces
npx wrangler kv:namespace list

# View stored licenses (for debugging)
npx wrangler kv:key list --binding=LICENSES_KV
```

## 🛡️ Security Notes

1. **Never commit secrets** - API keys are stored in Cloudflare's secret manager
2. **Webhook verification** - TODO: Implement signature verification in production
3. **Rate limiting** - Cloudflare provides built-in DDoS protection
4. **CORS** - Currently allows all origins; tighten for production if needed

## 📊 KV Namespaces

| Namespace | ID | Purpose |
|-----------|-----|---------|
| LICENSES_KV | bb53f6d402a94396bd3d8a35c324161c | Store license keys & subscriptions |
| USAGE_KV | efb4b037c9524310911873743d359558 | Track API usage per user |

## 🆘 Troubleshooting

### "Gemini API key not configured"
Run: `npx wrangler secret put GEMINI_API_KEY`

### Webhook not working
1. Check webhook URL is correct
2. Verify webhook secret matches
3. Check Cloudflare logs: `npx wrangler tail`

### Usage not tracking
1. Verify KV namespaces are bound in `wrangler.toml`
2. Redeploy: `npx wrangler deploy`

