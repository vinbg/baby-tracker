import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';

const bind = process.env.BIND ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 8082);
const upstream = process.env.UPSTREAM ?? 'http://127.0.0.1:8081';
const loginApiUrl = process.env.LOGIN_API_URL ?? 'http://127.0.0.1:3101/api/login';
const username = process.env.AUTH_USER ?? process.env.PGWEB_AUTH_USER ?? 'veli';
const upstreamAuthUser = process.env.PGWEB_AUTH_USER ?? 'veli';
const upstreamAuthPass = process.env.PGWEB_AUTH_PASS ?? '';
const secret = process.env.SESSION_SECRET ?? upstreamAuthPass;
const cookieName = 'baby_pgweb_session';

if (!upstreamAuthPass || !secret) {
  console.error('PGWEB_AUTH_PASS/SESSION_SECRET is required for upstream pgweb auth/session signing');
  process.exit(1);
}

function sign(value) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function safeEqual(a, b) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

function makeSession() {
  const payload = JSON.stringify({ u: username, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  const value = Buffer.from(payload).toString('base64url');
  return `${value}.${sign(value)}`;
}

function isSessionValid(req) {
  const cookie = req.headers.cookie ?? '';
  const match = cookie.match(new RegExp(`(?:^|; )${cookieName}=([^;]+)`));
  if (!match) return false;
  const [value, sig] = decodeURIComponent(match[1]).split('.');
  if (!value || !sig || !safeEqual(sig, sign(value))) return false;
  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return payload.u === username && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function html(error = '') {
  return `<!doctype html>
<html lang="bg">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Baby DB — вход</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #f7f3ee; color: #27211d; }
    .card { width: min(360px, calc(100vw - 32px)); background: white; border: 1px solid #eadfd4; border-radius: 22px; box-shadow: 0 18px 55px rgba(93,64,42,.12); padding: 28px; }
    h1 { margin: 0; font-size: 24px; text-align: center; }
    .emoji { font-size: 42px; text-align: center; margin-bottom: 8px; }
    p { text-align: center; color: #776b61; margin: 6px 0 22px; }
    label { display: block; font-size: 14px; color: #776b61; margin: 12px 0 6px; }
    input { width: 100%; box-sizing: border-box; border: 1px solid #eadfd4; border-radius: 14px; padding: 12px 14px; font-size: 16px; outline: none; }
    input:focus { border-color: #d28a54; }
    button { width: 100%; border: 0; border-radius: 14px; margin-top: 18px; padding: 12px 14px; background: #d28a54; color: white; font-size: 16px; font-weight: 700; cursor: pointer; }
    .error { color: #c2410c; font-size: 14px; min-height: 20px; margin-top: 12px; }
    @media (prefers-color-scheme: dark) { body { background: #17130f; color: #f8efe6; } .card { background: #211b16; border-color: #3a2d23; } p,label { color: #b9aa9d; } input { background: #17130f; color: #f8efe6; border-color: #3a2d23; } }
  </style>
</head>
<body>
  <form class="card" method="post" action="/login">
    <div class="emoji">🗄️</div>
    <h1>Baby DB</h1>
    <p>Вход към pgweb</p>
    <label>Потребител</label>
    <input name="username" value="${username}" autocomplete="username" />
    <label>Парола</label>
    <input name="password" type="password" autocomplete="current-password" autofocus />
    ${error ? `<div class="error">${error}</div>` : '<div class="error"></div>'}
    <button type="submit">Вход</button>
  </form>
</body>
</html>`;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

async function isLoginValid(loginUsername, loginPassword) {
  const response = await fetch(loginApiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: loginUsername, password: loginPassword }),
  });
  return response.ok;
}

async function proxy(req, res) {
  const target = new URL(req.url ?? '/', upstream);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (['host', 'connection', 'keep-alive', 'transfer-encoding', 'content-length', 'upgrade'].includes(lower)) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set('authorization', `Basic ${Buffer.from(`${upstreamAuthUser}:${upstreamAuthPass}`).toString('base64')}`);

  const hasBody = !['GET', 'HEAD'].includes(req.method ?? 'GET');
  const body = hasBody ? await readBody(req) : undefined;
  const upstreamResponse = await fetch(target, { method: req.method, headers, body });

  const outHeaders = {};
  upstreamResponse.headers.forEach((value, key) => {
    if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) outHeaders[key] = value;
  });
  res.writeHead(upstreamResponse.status, outHeaders);
  if (upstreamResponse.body) {
    const reader = upstreamResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  }
  res.end();
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname === '/login' && req.method === 'GET') return send(res, 200, html());
    if (url.pathname === '/login' && req.method === 'POST') {
      const params = new URLSearchParams((await readBody(req)).toString('utf8'));
      if (await isLoginValid(params.get('username') ?? '', params.get('password') ?? '')) {
        const session = encodeURIComponent(makeSession());
        res.writeHead(303, {
          location: '/',
          'set-cookie': `${cookieName}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        });
        return res.end();
      }
      return send(res, 401, html('Грешно име или парола.'));
    }
    if (url.pathname === '/logout') {
      res.writeHead(303, {
        location: '/login',
        'set-cookie': `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      });
      return res.end();
    }
    if (!isSessionValid(req)) return send(res, 200, html());
    return proxy(req, res);
  } catch (error) {
    console.error(error);
    send(res, 500, 'Internal Server Error', { 'content-type': 'text/plain; charset=utf-8' });
  }
}).listen(port, bind, () => {
  console.log(`Baby pgweb login proxy listening on http://${bind}:${port}`);
});
