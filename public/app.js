// ═══════════════════════════════════════════════════════════════════════
// CF-Sub — 前端交互逻辑
// ═══════════════════════════════════════════════════════════════════════

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
  submitBtn.textContent = '⏳ 生成中...';

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '生成失败');
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
      autoUrl.value = '（内联模式）请直接复制下方内容';
      rawUrl.value = '（内联模式）请直接复制下方内容';
      rocketUrl.value = '（内联模式）请直接复制下方内容';
      clashUrl.value = '（内联模式）请直接复制下方内容';
      surgeUrl.value = '（内联模式）请直接复制下方内容';

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
    warningBox.textContent = error.message || '请求失败';
    warningBox.classList.remove('hidden');
    resultSection.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '🚀 生成订阅';
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
      copyButton.textContent = '✅ 已复制';
      copyButton.style.background = 'rgba(52, 211, 153, 0.2)';
      copyButton.style.color = '#34d399';
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
    if (!input?.value || input.value.startsWith('（内联模式）')) {
      warningBox.textContent = '内联模式不支持二维码，请先配置 KV 命名空间。';
      warningBox.classList.remove('hidden');
      return;
    }

    if (!window.QRCode) {
      warningBox.textContent = '二维码组件加载失败，请刷新页面后重试。';
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
