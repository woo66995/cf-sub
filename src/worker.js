// ═══════════════════════════════════════════════════════════════════════
// CF-Sub — Cloudflare Workers 订阅转换器
// 支持 VMess / VLESS / Trojan 协议解析
// 输出格式: Raw (Base64) / Clash / Surge
// 可选: 优选 IP 替换、Google Ads 注入、访问令牌保护
// ═══════════════════════════════════════════════════════════════════════

// ── 工具函数 ──────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });
}

function textResponse(body, status = 200, contentType = 'text/plain; charset=utf-8') {
  return new Response(body, {
    status,
    headers: {
      'content-type': contentType,
      'access-control-allow-origin': '*',
    },
  });
}

function b64Encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64Decode(str) {
  return decodeURIComponent(escape(atob(str)));
}

function escapeYaml(str = '') {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ');
}

// ── 优选地址解析 ──────────────────────────────────────────────────────

function parsePreferredEndpoints(input) {
  const lines = String(input || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  return lines.map((line) => {
    const [raw, remark = ''] = line.split('#');
    const value = raw.trim();
    const hashRemark = remark.trim();
    const match = value.match(/^(.*?)(?::(\d+))?$/);
    return {
      server: match?.[1] || value,
      port: match?.[2] ? Number(match[2]) : undefined,
      remark: hashRemark,
    };
  });
}

// ── 协议解析器 ────────────────────────────────────────────────────────

function parseVmess(link) {
  const raw = link.slice('vmess://'.length).trim();
  const obj = JSON.parse(b64Decode(raw));
  return {
    type: 'vmess',
    name: obj.ps || 'vmess',
    server: obj.add,
    port: Number(obj.port || 443),
    uuid: obj.id,
    cipher: obj.scy || 'auto',
    network: obj.net || 'ws',
    tls: obj.tls === 'tls',
    host: obj.host || '',
    path: obj.path || '/',
    sni: obj.sni || obj.host || '',
    alpn: obj.alpn || '',
    fp: obj.fp || '',
  };
}

function parseUrlLike(link, type) {
  const u = new URL(link);
  return {
    type,
    name: decodeURIComponent(u.hash.replace(/^#/, '')) || type,
    server: u.hostname,
    port: Number(u.port || 443),
    password: type === 'trojan' ? decodeURIComponent(u.username) : undefined,
    uuid: type === 'vless' ? decodeURIComponent(u.username) : undefined,
    network: u.searchParams.get('type') || 'tcp',
    tls: (u.searchParams.get('security') || '').toLowerCase() === 'tls',
    host: u.searchParams.get('host') || u.searchParams.get('sni') || '',
    path: u.searchParams.get('path') || '/',
    sni: u.searchParams.get('sni') || u.searchParams.get('host') || '',
    fp: u.searchParams.get('fp') || '',
    alpn: u.searchParams.get('alpn') || '',
    flow: u.searchParams.get('flow') || '',
  };
}

function parseRawLinks(input) {
  const lines = String(input || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result = [];
  for (const line of lines) {
    try {
      if (line.startsWith('vmess://')) { result.push(parseVmess(line)); continue; }
      if (line.startsWith('vless://'))  { result.push(parseUrlLike(line, 'vless')); continue; }
      if (line.startsWith('trojan://')) { result.push(parseUrlLike(line, 'trojan')); continue; }
      // 尝试 base64 解码
      const decoded = b64Decode(line);
      if (/^(vmess|vless|trojan):\/\//m.test(decoded)) {
        result.push(...parseRawLinks(decoded));
      }
    } catch { /* 忽略无法解析的行 */ }
  }
  return result;
}

// ── 节点构建 ──────────────────────────────────────────────────────────

function buildNodes(baseNodes, preferredEndpoints, options = {}) {
  const prefix = (options.namePrefix || '').trim();

  // 如果没有优选地址，直接返回原始节点（纯格式转换模式）
  if (!preferredEndpoints || !preferredEndpoints.length) {
    return baseNodes.map((node, i) => ({
      ...node,
      name: prefix ? `${node.name} | ${prefix}` : node.name,
    }));
  }

  const output = [];
  let counter = 0;

  for (const node of baseNodes) {
    for (const ep of preferredEndpoints) {
      counter += 1;
      const nameParts = [];
      if (node.name) nameParts.push(node.name);
      if (prefix) nameParts.push(prefix);
      if (ep.remark) nameParts.push(ep.remark);
      else nameParts.push(String(counter));

      output.push({
        ...node,
        name: nameParts.join(' | '),
        server: ep.server,
        port: ep.port || node.port,
        host: options.keepOriginalHost ? node.host : '',
        sni: options.keepOriginalHost ? node.sni : '',
      });
    }
  }
  return output;
}

// ── 编码器 ────────────────────────────────────────────────────────────

function encodeVmess(node) {
  const obj = {
    v: '2', ps: node.name, add: node.server,
    port: String(node.port), id: node.uuid, aid: '0',
    scy: node.cipher || 'auto', net: node.network || 'ws',
    type: 'none', host: node.host || '', path: node.path || '/',
    tls: node.tls ? 'tls' : '', sni: node.sni || '',
    alpn: node.alpn || '', fp: node.fp || '',
  };
  return 'vmess://' + b64Encode(JSON.stringify(obj));
}

function encodeVless(node) {
  const url = new URL(`vless://${encodeURIComponent(node.uuid)}@${node.server}:${node.port}`);
  url.searchParams.set('type', node.network || 'ws');
  if (node.tls) url.searchParams.set('security', 'tls');
  if (node.host) url.searchParams.set('host', node.host);
  if (node.sni) url.searchParams.set('sni', node.sni);
  if (node.path) url.searchParams.set('path', node.path);
  if (node.alpn) url.searchParams.set('alpn', node.alpn);
  if (node.fp) url.searchParams.set('fp', node.fp);
  if (node.flow) url.searchParams.set('flow', node.flow);
  url.hash = node.name;
  return url.toString();
}

function encodeTrojan(node) {
  const url = new URL(`trojan://${encodeURIComponent(node.password)}@${node.server}:${node.port}`);
  if (node.network) url.searchParams.set('type', node.network);
  if (node.tls) url.searchParams.set('security', 'tls');
  if (node.host) url.searchParams.set('host', node.host);
  if (node.sni) url.searchParams.set('sni', node.sni);
  if (node.path) url.searchParams.set('path', node.path);
  if (node.alpn) url.searchParams.set('alpn', node.alpn);
  if (node.fp) url.searchParams.set('fp', node.fp);
  url.hash = node.name;
  return url.toString();
}

// ── 订阅格式渲染器 ───────────────────────────────────────────────────

function renderRaw(nodes) {
  const lines = nodes.map((n) => {
    if (n.type === 'vmess')  return encodeVmess(n);
    if (n.type === 'vless')  return encodeVless(n);
    if (n.type === 'trojan') return encodeTrojan(n);
    return '';
  }).filter(Boolean);
  return b64Encode(lines.join('\n'));
}

function renderClash(nodes) {
  const proxies = nodes.map((node) => {
    const common = [
      `  - name: "${escapeYaml(node.name)}"`,
      `    server: ${node.server}`,
      `    port: ${node.port}`,
    ];

    if (node.type === 'vmess') {
      return [
        ...common,
        `    type: vmess`,
        `    uuid: ${node.uuid}`,
        `    alterId: 0`,
        `    cipher: ${node.cipher || 'auto'}`,
        `    tls: ${node.tls}`,
        `    network: ${node.network || 'ws'}`,
        `    servername: "${escapeYaml(node.sni || '')}"`,
        `    ws-opts:`,
        `      path: "${escapeYaml(node.path || '/')}"`,
        `      headers:`,
        `        Host: "${escapeYaml(node.host || '')}"`,
      ].join('\n');
    }

    if (node.type === 'vless') {
      return [
        ...common,
        `    type: vless`,
        `    uuid: ${node.uuid}`,
        `    tls: ${node.tls}`,
        `    network: ${node.network || 'ws'}`,
        `    servername: "${escapeYaml(node.sni || '')}"`,
        `    ws-opts:`,
        `      path: "${escapeYaml(node.path || '/')}"`,
        `      headers:`,
        `        Host: "${escapeYaml(node.host || '')}"`,
      ].join('\n');
    }

    if (node.type === 'trojan') {
      return [
        ...common,
        `    type: trojan`,
        `    password: "${escapeYaml(node.password || '')}"`,
        `    sni: "${escapeYaml(node.sni || '')}"`,
        `    network: ${node.network || 'ws'}`,
        `    ws-opts:`,
        `      path: "${escapeYaml(node.path || '/')}"`,
        `      headers:`,
        `        Host: "${escapeYaml(node.host || '')}"`,
      ].join('\n');
    }
    return '';
  }).filter(Boolean);

  return ['proxies:', ...proxies].join('\n');
}

function renderSurge(nodes, baseUrl, accessToken) {
  const proxies = nodes
    .filter((n) => n.type === 'vmess' || n.type === 'trojan')
    .map((node) => {
      if (node.type === 'vmess') {
        return `${node.name} = vmess, ${node.server}, ${node.port}, username=${node.uuid}, ws=true, ws-path=${node.path || '/'}, ws-headers=Host:${node.host || ''}, tls=${node.tls}, sni=${node.sni || ''}`;
      }
      return `${node.name} = trojan, ${node.server}, ${node.port}, password=${node.password || ''}, sni=${node.sni || ''}`;
    });

  return [
    '[General]', 'skip-proxy = 127.0.0.1, localhost', '',
    '[Proxy]', ...proxies, '',
    '[Proxy Group]',
    'Proxy = select, ' + nodes.filter((n) => n.type === 'vmess' || n.type === 'trojan').map((n) => n.name).join(', '),
    '', '[Rule]', 'FINAL,Proxy', '',
    `; ${baseUrl}?token=${accessToken}`,
  ].join('\n');
}

// ── KV 短链接 ─────────────────────────────────────────────────────────

function createShortId(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function createUniqueShortId(env, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const id = createShortId(10);
    const exists = await env.SUB_STORE.get(`sub:${id}`);
    if (!exists) return id;
  }
  throw new Error('无法生成唯一短链接，请稍后再试');
}

function normalizeLines(value = '') {
  return String(value).split(/\r?\n/).map((l) => l.trim()).filter(Boolean).sort().join('\n');
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function buildDedupHash(body) {
  const normalized = {
    nodeLinks: normalizeLines(body.nodeLinks || ''),
    preferredIps: normalizeLines(body.preferredIps || ''),
    namePrefix: String(body.namePrefix || '').trim(),
    keepOriginalHost: body.keepOriginalHost !== false,
  };
  return sha256Hex(JSON.stringify(normalized));
}

// ── Google Ads 注入 ───────────────────────────────────────────────────

function injectAdsIntoHtml(html, env) {
  const adsClient = env.GOOGLE_ADS_CLIENT || '';
  const adsSlot = env.GOOGLE_ADS_SLOT || '';
  const siteTitle = env.SITE_TITLE || '';
  const siteDesc = env.SITE_DESCRIPTION || '';

  // 注入自定义标题和描述
  if (siteTitle) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${siteTitle}</title>`);
    html = html.replace(/property="og:title"\s+content="[^"]*"/, `property="og:title" content="${siteTitle}"`);
  }
  if (siteDesc) {
    html = html.replace(/name="description"\s+content="[^"]*"/, `name="description" content="${siteDesc}"`);
    html = html.replace(/property="og:description"\s+content="[^"]*"/, `property="og:description" content="${siteDesc}"`);
  }

  // 未配置广告则不注入
  if (!adsClient || !adsSlot) return html;

  const adsenseScript = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsClient}" crossorigin="anonymous"></script>`;

  const adUnit = `
    <div class="ad-container" style="margin:20px auto;text-align:center;min-height:90px;">
      <ins class="adsbygoogle"
        style="display:block"
        data-ad-client="${adsClient}"
        data-ad-slot="${adsSlot}"
        data-ad-format="auto"
        data-full-width-responsive="true"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    </div>`;

  // 在 </head> 前注入 adsense script
  html = html.replace('</head>', adsenseScript + '\n</head>');

  // 替换广告占位符
  html = html.replace('<!-- AD_PLACEHOLDER_TOP -->', adUnit);
  html = html.replace('<!-- AD_PLACEHOLDER_BOTTOM -->', adUnit);

  return html;
}

// ── 访问令牌验证 ──────────────────────────────────────────────────────

function validateAccessToken(url, env) {
  const expected = env.SUB_ACCESS_TOKEN;
  if (!expected) return { ok: true };
  const provided = url.searchParams.get('token') || '';
  if (!provided || provided !== expected) {
    return { ok: false, response: textResponse('Forbidden: invalid token', 403) };
  }
  return { ok: true };
}

// ── 路由处理器 ────────────────────────────────────────────────────────

async function handleGenerate(request, env, url) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求体不是合法 JSON' }, 400);
  }

  const baseNodes = parseRawLinks(body.nodeLinks || '');
  const preferredEndpoints = parsePreferredEndpoints(body.preferredIps || '');

  if (!baseNodes.length) {
    return json({ ok: false, error: '没有识别到可用节点链接' }, 400);
  }

  const options = {
    namePrefix: body.namePrefix || '',
    keepOriginalHost: body.keepOriginalHost !== false,
  };

  const nodes = buildNodes(baseNodes, preferredEndpoints, options);

  // 如果有 KV 绑定，存储到 KV
  if (env.SUB_STORE) {
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      options,
      nodes,
    };

    const dedupHash = await buildDedupHash(body);
    const dedupKey = `dedup:${dedupHash}`;
    let id = await env.SUB_STORE.get(dedupKey);

    if (!id) {
      id = await createUniqueShortId(env);
      const ttl = 60 * 60 * 24 * 7; // 7 天
      await env.SUB_STORE.put(`sub:${id}`, JSON.stringify(payload), { expirationTtl: ttl });
      await env.SUB_STORE.put(dedupKey, id, { expirationTtl: ttl });
    }

    const origin = url.origin;
    const accessToken = env.SUB_ACCESS_TOKEN || '';
    const withToken = (target) =>
      `${origin}/sub/${id}${
        target
          ? `?target=${target}&token=${encodeURIComponent(accessToken)}`
          : `?token=${encodeURIComponent(accessToken)}`
      }`;

    return json({
      ok: true,
      storage: 'kv',
      shortId: id,
      urls: {
        auto: withToken(''),
        raw: withToken('raw'),
        clash: withToken('clash'),
        surge: withToken('surge'),
      },
      counts: {
        inputNodes: baseNodes.length,
        preferredEndpoints: preferredEndpoints.length,
        outputNodes: nodes.length,
      },
      preview: nodes.slice(0, 20).map((n) => ({
        name: n.name, type: n.type, server: n.server,
        port: n.port, host: n.host || '', sni: n.sni || '',
      })),
      warnings: accessToken ? [] : ['未检测到 SUB_ACCESS_TOKEN，订阅链接将没有访问保护。'],
    });
  }

  // 没有 KV 绑定时，直接返回结果（内联模式）
  return json({
    ok: true,
    storage: 'inline',
    inline: {
      raw: renderRaw(nodes),
      clash: renderClash(nodes),
      surge: renderSurge(nodes, url.origin, ''),
    },
    counts: {
      inputNodes: baseNodes.length,
      preferredEndpoints: preferredEndpoints.length,
      outputNodes: nodes.length,
    },
    preview: nodes.slice(0, 20).map((n) => ({
      name: n.name, type: n.type, server: n.server,
      port: n.port, host: n.host || '', sni: n.sni || '',
    })),
    warnings: ['未绑定 KV 命名空间，使用内联模式（无短链接）。'],
  });
}

async function handleSub(url, env) {
  const tokenCheck = validateAccessToken(url, env);
  if (!tokenCheck.ok) return tokenCheck.response;

  if (!env.SUB_STORE) return textResponse('KV not configured', 500);

  const id = url.pathname.split('/').pop();
  if (!id) return textResponse('missing id', 400);

  const raw = await env.SUB_STORE.get(`sub:${id}`);
  if (!raw) return textResponse('not found — 订阅已过期或不存在', 404);

  const record = JSON.parse(raw);
  const nodes = record.nodes || [];
  const target = (url.searchParams.get('target') || 'raw').toLowerCase();

  if (target === 'clash') {
    return textResponse(renderClash(nodes), 200, 'text/yaml; charset=utf-8');
  }
  if (target === 'surge') {
    return textResponse(
      renderSurge(nodes, url.origin + url.pathname, env.SUB_ACCESS_TOKEN || ''),
      200, 'text/plain; charset=utf-8'
    );
  }
  return textResponse(renderRaw(nodes), 200, 'text/plain; charset=utf-8');
}

// ── 主入口 ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      });
    }

    // API: 生成订阅
    if (request.method === 'POST' && url.pathname === '/api/generate') {
      return handleGenerate(request, env, url);
    }

    // API: 获取订阅
    if (request.method === 'GET' && url.pathname.startsWith('/sub/')) {
      return handleSub(url, env);
    }

    // 静态资源 — 注入 Google Ads
    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.headers.get('content-type')?.includes('text/html')) {
      const html = await assetResponse.text();
      const injected = injectAdsIntoHtml(html, env);
      return new Response(injected, {
        status: assetResponse.status,
        headers: {
          ...Object.fromEntries(assetResponse.headers),
          'content-type': 'text/html; charset=utf-8',
        },
      });
    }

    return assetResponse;
  },
};
