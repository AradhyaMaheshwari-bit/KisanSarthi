const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Load .env file if present (no dependency required) ──────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq < 1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

const PORT = 3001;

// ── Server-side AI gateway (e.g. OmniRoute) ────────────────
const GATEWAY_URL   = process.env.KISANSARTHI_AI_BASE_URL || process.env.ANTHROPIC_BASE_URL || '';
const GATEWAY_TOKEN = process.env.KISANSARTHI_AI_AUTH_TOKEN || process.env.ANTHROPIC_AUTH_TOKEN || '';
const AI_MODEL      = process.env.KISANSARTHI_AI_MODEL || 'auto/multimodal';
const HAS_GATEWAY   = !!(GATEWAY_URL && GATEWAY_TOKEN);

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ── Connectivity test on startup ─────────────────────────────
function testConnection() {
  if (HAS_GATEWAY) {
    console.log('  Testing connection to AI gateway (' + GATEWAY_URL + ')...');
    const url = new URL(GATEWAY_URL);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request(
      { hostname: url.hostname, port: url.port, path: '/v1/messages', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' } },
      res => {
        // 401/415 = gateway reachable (auth/config issue is fine, means server is up)
        if (res.statusCode >= 200 && res.statusCode < 500) {
          console.log('  ✅ AI gateway is reachable (status ' + res.statusCode + ')\n');
        } else {
          console.log('  ⚠️  AI gateway responded with status ' + res.statusCode + '\n');
        }
      }
    );
    req.on('error', err => {
      console.error('  ❌ CANNOT REACH AI gateway at ' + GATEWAY_URL + ':', err.message);
      console.error('  → AI Chat will require a browser-provided API key as fallback.\n');
    });
    req.write(JSON.stringify({ model: AI_MODEL, max_tokens: 5, messages: [{ role: 'user', content: 'test' }] }));
    req.end();
  } else {
    console.log('  Testing connection to api.anthropic.com...');
    const req = https.request(
      { hostname: 'api.anthropic.com', path: '/v1/models', method: 'GET',
        headers: { 'anthropic-version': '2023-06-01', 'x-api-key': 'test' } },
      res => {
        if (res.statusCode === 401 || res.statusCode === 200) {
          console.log('  ✅ Anthropic API is reachable (status ' + res.statusCode + ')\n');
        } else {
          console.log('  ⚠️  Anthropic responded with status ' + res.statusCode + ' (browser-provided key needed)\n');
        }
      }
    );
    req.on('error', err => {
      console.error('  ❌ CANNOT REACH api.anthropic.com:', err.message);
      console.error('  → Check your internet connection or firewall/VPN settings.\n');
    });
    req.end();
  }
}

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // ── CORS preflight ───────────────────────────────────────
  if (req.method === 'OPTIONS') {
    console.log('  CORS preflight OK');
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Gateway health check (browser polls this) ────────────
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ gateway: HAS_GATEWAY }));
    return;
  }

  // ── Diagnostic test endpoint ─────────────────────────────
  if (req.method === 'GET' && req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html><html><body style="font-family:sans-serif;padding:30px;max-width:500px">
      <h2>✅ Proxy is running!</h2>
      <p>Server is working on port ${PORT}.</p>
      <p>Now testing Anthropic connection from this server...</p>
      <button onclick="testApi()" style="padding:10px 20px;font-size:14px;cursor:pointer;background:#1D9E75;color:white;border:none;border-radius:8px">
        Test API Connection
      </button>
      <pre id="out" style="background:#f4f4f4;padding:12px;border-radius:8px;margin-top:16px;min-height:40px"></pre>
      <script>
        async function testApi() {
          const key = prompt('Enter your Anthropic API key to test:');
          if (!key) return;
          document.getElementById('out').textContent = 'Testing...';
          try {
            const r = await fetch('/api', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 20, messages: [{ role: 'user', content: 'Say OK' }] })
            });
            const d = await r.json();
            document.getElementById('out').textContent = JSON.stringify(d, null, 2);
          } catch(e) {
            document.getElementById('out').textContent = 'ERROR: ' + e.message;
          }
        }
      </script>
      </body></html>
    `);
    return;
  }

  // ── Main API proxy ───────────────────────────────────────
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const browserKey = req.headers['x-api-key'];

      // Validate body is proper JSON
      try { JSON.parse(body); } catch(e) {
        console.error('  REJECTED: invalid JSON body');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid request body.' } }));
        return;
      }

      if (HAS_GATEWAY) {
        // ── Gateway mode: forward to server-side AI gateway ──
        // Override the model with server-configured AI_MODEL (frontend may send
        // a model name that the gateway doesn't recognise).
        let gwBody = body;
        try {
          const parsed = JSON.parse(body);
          if (parsed.model !== AI_MODEL) {
            parsed.model = AI_MODEL;
            gwBody = JSON.stringify(parsed);
          }
        } catch(_) { /* body already validated above */ }

        console.log('  Forwarding to AI gateway (' + GATEWAY_URL + ', model=' + AI_MODEL + ')...');
        const url = new URL(GATEWAY_URL);
        const mod = url.protocol === 'https:' ? https : http;
        const options = {
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     '/v1/messages',
          method:   'POST',
          headers: {
            'Content-Type':      'application/json',
            'Content-Length':    Buffer.byteLength(gwBody),
            'Authorization':     'Bearer ' + GATEWAY_TOKEN,
            'anthropic-version': '2023-06-01',
          },
        };

        const proxyReq = mod.request(options, proxyRes => {
          console.log('  Gateway status:', proxyRes.statusCode);
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          proxyRes.pipe(res);
        });

        proxyReq.on('error', err => {
          console.error('  ❌ Gateway error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Cannot reach AI gateway: ' + err.message + '. AI provider may be unavailable.' } }));
        });

        proxyReq.write(gwBody);
        proxyReq.end();
      } else {
        // ── Direct mode: forward to Anthropic with browser key ──
        if (!browserKey || !browserKey.startsWith('sk-ant')) {
          console.log('  REJECTED: missing or invalid key');
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Missing or invalid API key.' } }));
          return;
        }

        console.log('  Forwarding to Anthropic...');
        const options = {
          hostname: 'api.anthropic.com',
          path:     '/v1/messages',
          method:   'POST',
          headers: {
            'Content-Type':      'application/json',
            'Content-Length':    Buffer.byteLength(body),
            'x-api-key':         browserKey,
            'anthropic-version': '2023-06-01',
          },
        };

        const proxyReq = https.request(options, proxyRes => {
          console.log('  Anthropic status:', proxyRes.statusCode);
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          proxyRes.pipe(res);
        });

        proxyReq.on('error', err => {
          console.error('  ❌ Upstream error:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Cannot reach Anthropic API: ' + err.message + '. Check internet/firewall on the machine running proxy.js.' } }));
        });

        proxyReq.write(body);
        proxyReq.end();
      }
    });
    return;
  }

  // ── Static file server ───────────────────────────────────
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';
  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log('  404:', urlPath);
      res.writeHead(404);
      res.end('Not found: ' + urlPath);
      return;
    }
    const mime = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log('\n  ✅ KisanAI proxy running!');
  console.log('  Open http://localhost:' + PORT);
  console.log('  Diagnose at http://localhost:' + PORT + '/test');
  if (HAS_GATEWAY) {
    console.log('  AI mode: Server-side gateway (' + GATEWAY_URL + ')\n');
  } else {
    console.log('  AI mode: Direct Anthropic (browser-provided key required)\n');
  }
  testConnection();
});