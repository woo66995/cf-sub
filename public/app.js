// ── 多语言配置 ─────────────────────────────────────────────────────
const translations = {
  zh: {
    app_title: '订阅转换器',
    hero_lead: '极简、高效、安全的订阅转换工具。',
    info_eyebrow: '💡 说明',
    info_text: '支持 IP/域名:端口#备注 格式。留空优选 IP 则仅做纯格式转换。',
    label_node_links: '节点链接',
    placeholder_node_links: '粘贴 vmess:// / vless:// / trojan:// / tuic:// / hy2:// 链接，每行一个；也支持 Base64 编码内容',
    hint_node_links: '支持多行粘贴，会自动识别协议。转换结果 7 天后自动失效。',
    label_preferred_ips: '优选 IP',
    label_optional: '(可选)',
    placeholder_preferred_ips: '每行一个 IP/域名，例如: 104.16.1.2#美国 或者 cdn.example.com',
    label_name_prefix: '节点名称前缀',
    placeholder_name_prefix: '例如：CF、HK',
    label_keep_host: '保留原 Host/SNI',
    hint_keep_host: '建议保留，更适合CDN场景',
    btn_generate: '🚀 立即生成订阅链接',
    btn_generating: '⏳ 生成中...',
    btn_demo: '📋 填充示例',
    result_title: '📦 订阅结果',
    result_desc: '选择适合你的客户端格式，复制订阅链接或扫码导入。',
    stat_input: '输入节点',
    stat_endpoints: '优选地址',
    stat_output: '输出节点',
    client_auto: '自动识别',
    client_auto_desc: '适合支持自动识别的客户端',
    placeholder_waiting: '等待生成...',
    btn_copy: '复制',
    btn_copied: '✅ 已复制',
    btn_qrcode: '二维码',
    client_rocket_desc: 'iPhone / iPad 小火箭',
    preview_title: '📋 预览前 20 个生成节点',
    th_name: '名称',
    th_protocol: '协议',
    th_server: '服务器',
    th_port: '端口',
    footer_text: 'CF-Sub — 基于',
    footer_build: '构建',
    footer_note: '开源项目 · 仅供学习交流',
    error_generate: '生成失败',
    error_request: '请求失败',
    error_inline_qr: '内联模式不支持二维码，请先配置 KV 命名空间。',
    error_qr_fail: '二维码组件加载失败，请刷新页面后重试。',
    storage_inline: '内联模式：请直接复制下方内容'
  },
  en: {
    app_title: 'Sub Converter',
    hero_lead: 'Minimalist, efficient and secure subscription conversion tool.',
    info_eyebrow: '💡 Info',
    info_text: 'Supports IP/Domain:Port#Remark format. Leave Preferred IP empty for format conversion only.',
    label_node_links: 'Node Links',
    placeholder_node_links: 'Paste vmess:// / vless:// / trojan:// / tuic:// / hy2:// links, one per line; Base64 content is also supported.',
    hint_node_links: 'Auto-recognizes protocols. Conversion results expire after 7 days.',
    label_preferred_ips: 'Preferred IP',
    label_optional: '(Optional)',
    placeholder_preferred_ips: 'One IP/Domain per line, e.g.: 104.16.1.2#US or cdn.example.com',
    label_name_prefix: 'Node Name Prefix',
    placeholder_name_prefix: 'e.g.: CF, HK',
    label_keep_host: 'Keep Original Host/SNI',
    hint_keep_host: 'Recommended for CDN scenarios',
    btn_generate: '🚀 Generate Subscription',
    btn_generating: '⏳ Generating...',
    btn_demo: '📋 Fill Demo',
    result_title: '📦 Results',
    result_desc: 'Choose your client format, copy the link or scan the QR code.',
    stat_input: 'Input Nodes',
    stat_endpoints: 'Preferred IPs',
    stat_output: 'Output Nodes',
    client_auto: 'Auto Detect',
    client_auto_desc: 'For clients supporting auto-recognition',
    placeholder_waiting: 'Waiting for generation...',
    btn_copy: 'Copy',
    btn_copied: '✅ Copied',
    btn_qrcode: 'QR Code',
    client_rocket_desc: 'Shadowrocket for iOS',
    preview_title: '📋 Preview Top 20 Nodes',
    th_name: 'Name',
    th_protocol: 'Protocol',
    th_server: 'Server',
    th_port: 'Port',
    footer_text: 'CF-Sub — Built on',
    footer_build: '',
    footer_note: 'Open Source Project · For Educational Use Only',
    error_generate: 'Generation Failed',
    error_request: 'Request Failed',
    error_inline_qr: 'QR code not supported in inline mode. Please configure KV namespace.',
    error_qr_fail: 'QR code component failed to load. Please refresh.',
    storage_inline: 'Inline Mode: Copy content directly'
  }
};

// ── 主逻辑 ─────────────────────────────────────────────────────────

const form         = document.getElementById('generator-form');
const submitBtn    = document.getElementById('submitBtn');
const fillDemoBtn  = document.getElementById('fillDemoBtn');
const resultSection = document.getElementById('resultSection');
const warningBox   = document.getElementById('warningBox');
const previewBody  = document.getElementById('previewBody');

const autoUrl  = document.getElementById('autoUrl');
const rawUrl   = document.getElementById('rawUrl');
const rocketUrl = document.getElementById('rocketUrl');
const clashUrl = document.getElementById('clashUrl');
const surgeUrl = document.getElementById('surgeUrl');

const qrModal     = document.getElementById('qrModal');
const qrCanvas    = document.getElementById('qrCanvas');
const qrText      = document.getElementById('qrText');
const closeQrModal = document.getElementById('closeQrModal');

const langToggle  = document.getElementById('langToggle');
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');

// ── Managers ─────────────────────────────────────────────────────

const I18nManager = {
  lang: localStorage.getItem('cf_sub_lang') || (navigator.language.startsWith('zh') ? 'zh' : 'en'),
  
  init() {
    this.apply(this.lang);
    langToggle.addEventListener('click', () => {
      this.lang = this.lang === 'zh' ? 'en' : 'zh';
      this.apply(this.lang);
      localStorage.setItem('cf_sub_lang', this.lang);
    });
  },

  apply(lang) {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    langToggle.textContent = lang === 'zh' ? 'EN' : '中文';
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (translations[lang][key]) {
        el.placeholder = translations[lang][key];
      }
    });
  },

  get(key) {
    return translations[this.lang][key] || key;
  }
};

const ThemeManager = {
  theme: localStorage.getItem('cf_sub_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),

  init() {
    this.apply(this.theme);
    themeToggle.addEventListener('click', () => {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      this.apply(this.theme);
      localStorage.setItem('cf_sub_theme', this.theme);
    });
  },

  apply(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      themeIcon.innerHTML = '<path class="moon" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    } else {
      document.documentElement.classList.remove('light');
      themeIcon.innerHTML = '<path class="sun" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0z"/>';
    }
  }
};

I18nManager.init();
ThemeManager.init();

// ── Demo 数据 ──────────────────────────────────────────────────────

const demoVmess = [
  'vmess://ewogICJ2IjogIjIiLAogICJwcyI6ICJkZW1vLXdzLXRscyIsCiAgImFkZCI6ICJlZGdlLmV4YW1wbGUuY29tIiwKICAicG9ydCI6ICI0NDMiLAogICJpZCI6ICIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAwMDEiLAogICJzY3kiOiAiYXV0byIsCiAgIm5ldCI6ICJ3cyIsCiAgInRscyI6ICJ0bHMiLAogICJwYXRoIjogIi93cyIsCiAgImhvc3QiOiAiZWRnZS5leGFtcGxlLmNvbSIsCiAgInNuaSI6ICJlZGdlLmV4YW1wbGUuY29tIiwKICAiZnAiOiAiY2hyb21lIiwKICAiYWxwbiI6ICJoMixodHRwLzEuMSIKfQ=='
].join('\n');

const demoIps = [
  '104.16.1.2#HK-01',
  '104.17.2.3#HK-02',
  '104.18.3.4:2053#US-Edge'
].join('\n');

// ── 填充示例 ──────────────────────────────────────────────────────

fillDemoBtn.addEventListener('click', () => {
  document.getElementById('nodeLinks').value = demoVmess;
  document.getElementById('preferredIps').value = demoIps;
  document.getElementById('namePrefix').value = 'CF';
  document.getElementById('keepOriginalHost').checked = true;
});

// ── 表单提交 ──────────────────────────────────────────────────────

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  warningBox.classList.add('hidden');
  previewBody.innerHTML = '';

  const payload = {
    nodeLinks: document.getElementById('nodeLinks').value,
    preferredIps: document.getElementById('preferredIps').value,
    namePrefix: document.getElementById('namePrefix').value,
    keepOriginalHost: document.getElementById('keepOriginalHost').checked,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = I18nManager.get('btn_generating');

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || I18nManager.get('error_generate'));
    }

    // 根据存储模式设置 URL
    if (data.storage === 'kv') {
      autoUrl.value = data.urls.auto;
      rawUrl.value = data.urls.raw;
      rocketUrl.value = data.urls.raw;
      clashUrl.value = data.urls.clash;
      surgeUrl.value = data.urls.surge;
    } else if (data.storage === 'inline') {
      // 内联模式：在结果中直接显示内容提示
      autoUrl.value = '（' + I18nManager.get('storage_inline') + '）'; // Added a key or fallback
      rawUrl.value = autoUrl.value;
      rocketUrl.value = autoUrl.value;
      clashUrl.value = autoUrl.value;
      surgeUrl.value = autoUrl.value;

      // 存储内联数据以便复制
      window._inlineData = data.inline;
    }

    // 统计数据
    document.getElementById('statInputNodes').textContent = data.counts.inputNodes;
    document.getElementById('statEndpoints').textContent = data.counts.preferredEndpoints;
    document.getElementById('statOutputNodes').textContent = data.counts.outputNodes;

    // 预览表格
    previewBody.innerHTML = data.preview
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.type)}</td>
            <td>${escapeHtml(item.server)}</td>
            <td>${escapeHtml(String(item.port))}</td>
            <td>${escapeHtml(item.host || '-')}</td>
            <td>${escapeHtml(item.sni || '-')}</td>
          </tr>`,
      )
      .join('');

    // 警告
    if (Array.isArray(data.warnings) && data.warnings.length) {
      warningBox.textContent = data.warnings.join('\n');
      warningBox.classList.remove('hidden');
    }

    // 显示结果并滚动
    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (error) {
    warningBox.textContent = error.message || I18nManager.get('error_request');
    warningBox.classList.remove('hidden');
    resultSection.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = I18nManager.get('btn_generate');
  }
});

// ── 复制 & 二维码 ─────────────────────────────────────────────────

document.addEventListener('click', async (event) => {
  // 复制按钮
  const copyButton = event.target.closest('[data-copy-target]');
  if (copyButton) {
    const input = document.getElementById(copyButton.dataset.copyTarget);
    if (!input?.value) return;

    try {
      await navigator.clipboard.writeText(input.value);
      const originalText = copyButton.textContent;
      copyButton.textContent = I18nManager.get('btn_copied');
      copyButton.style.background = 'rgba(52, 211, 153, 0.2)';
      copyButton.style.color = 'var(--accent-2)';
      setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.style.background = '';
        copyButton.style.color = '';
      }, 1500);
    } catch {
      input.select();
      document.execCommand('copy');
    }
    return;
  }

  // QR 码按钮
  const qrButton = event.target.closest('[data-qrcode-target]');
  if (qrButton) {
    warningBox.classList.add('hidden');

    const input = document.getElementById(qrButton.dataset.qrcodeTarget);
    if (!input?.value || input.value.includes('（')) {
      warningBox.textContent = I18nManager.get('error_inline_qr');
      warningBox.classList.remove('hidden');
      return;
    }

    if (!window.QRCode) {
      warningBox.textContent = I18nManager.get('error_qr_fail');
      warningBox.classList.remove('hidden');
      return;
    }

    qrCanvas.innerHTML = '';
    qrText.textContent = input.value;
    qrModal.classList.remove('hidden');
    qrModal.setAttribute('aria-hidden', 'false');

    new window.QRCode(qrCanvas, {
      text: input.value,
      width: 220,
      height: 220,
      correctLevel: window.QRCode.CorrectLevel.M,
    });
    return;
  }

  // 关闭弹窗
  if (event.target.closest('[data-close-modal="true"]')) {
    closeQrDialog();
  }
});

closeQrModal.addEventListener('click', closeQrDialog);

// ESC 关闭弹窗
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !qrModal.classList.contains('hidden')) {
    closeQrDialog();
  }
});

function closeQrDialog() {
  qrModal.classList.add('hidden');
  qrModal.setAttribute('aria-hidden', 'true');
  qrCanvas.innerHTML = '';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
