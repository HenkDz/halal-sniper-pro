/**
 * Halal Sniper Pro - Backend API (FREE)
 * 
 * Cloudflare Worker that provides:
 * - AI API proxying (optional - users can also use BYOK)
 * - Health check endpoint
 * 
 * This backend is OPTIONAL. The extension works fully standalone with BYOK.
 * This exists as a convenience for users who prefer not to manage API keys.
 */

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

// Helper to create JSON responses
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// Helper to create error responses
function errorResponse(message, code, status = 400) {
  return jsonResponse({ error: code, message }, status);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      switch (url.pathname) {
        case '/':
          return jsonResponse({ 
            service: 'Halal Sniper Pro API',
            version: '2.0.0',
            status: 'operational',
            pricing: 'FREE',
            note: 'This backend is optional. Extension works with BYOK (Bring Your Own Keys).'
          });
          
        case '/api/analyze':
          return handleAnalyze(request, env);
          
        case '/api/health':
          return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
          
        default:
          return errorResponse('Not Found', 'not_found', 404);
      }
    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('Internal Server Error', 'internal_error', 500);
    }
  },
};

/**
 * Proxy AI analysis request (NO LIMITS - FREE)
 * POST /api/analyze
 * Body: { ticker, insiderData, provider, prompt }
 */
async function handleAnalyze(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 'method_not_allowed', 405);
  }

  const body = await request.json();
  const { ticker, insiderData, provider = 'gemini', prompt } = body;

  if (!ticker) {
    return errorResponse('Ticker is required', 'missing_ticker', 400);
  }

  // Call AI provider (using server-side API keys from env)
  let aiResponse;
  try {
    if (provider === 'gemini') {
      if (!env.GEMINI_API_KEY) {
        return errorResponse('Gemini API key not configured on server. Use BYOK mode instead.', 'gemini_not_configured', 503);
      }
      aiResponse = await callGemini(prompt || buildPrompt(ticker, insiderData), env);
    } else if (provider === 'grok') {
      if (!env.GROK_API_KEY) {
        return errorResponse('Grok API key not configured on server. Use BYOK mode instead.', 'grok_not_configured', 503);
      }
      aiResponse = await callGrok(prompt || buildPrompt(ticker, insiderData), env);
    } else {
      return errorResponse('Invalid AI provider. Use "gemini" or "grok".', 'invalid_provider', 400);
    }
  } catch (error) {
    console.error('AI API error:', error);
    return errorResponse('AI service temporarily unavailable: ' + error.message, 'ai_error', 503);
  }

  return jsonResponse({
    success: true,
    ticker,
    analysis: aiResponse,
  });
}

// ============================================================
// AI Provider Functions
// ============================================================

/**
 * Call Google Gemini API
 */
async function callGemini(prompt, env) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API error:', error);
    throw new Error('Gemini API request failed');
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
}

/**
 * Call xAI Grok API
 */
async function callGrok(prompt, env) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Grok API error:', error);
    throw new Error('Grok API request failed');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated';
}

/**
 * Build default analysis prompt
 */
function buildPrompt(ticker, insiderData) {
  return `Analyze ${ticker} stock based on the following insider trading data:

${JSON.stringify(insiderData, null, 2)}

Provide:
1. Summary of insider activity
2. Halal compliance assessment (IFG 5 criteria)
3. Buy/Hold/Sell recommendation with confidence level
4. Key risks
5. Entry/exit strategy if bullish

Format as structured JSON.`;
}
