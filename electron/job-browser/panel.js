/**
 * Job Browser Panel
 *
 * The assistant sidebar: detects form fields inside the <webview>,
 * pre-fills suggested values from the local SyncHire profile, and
 * applies fills through the injected fill engine. Never submits.
 */

(function () {
  'use strict';

  const webview = document.getElementById('webview');
  const urlInput = document.getElementById('url-input');
  const fieldsEl = document.getElementById('fields');
  const detectBtn = document.getElementById('detect-btn');
  const fillAllBtn = document.getElementById('fill-all-btn');

  let engineInjected = false;
  let detectedFields = [];
  /** Editable values keyed by field index (rendered inputs). */
  const valueByIndex = new Map();

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
    );

  async function init() {
    const initialUrl = await window.synchireJobBrowser.getInitialUrl();
    if (initialUrl) {
      urlInput.value = initialUrl;
      webview.src = initialUrl;
    }

    webview.addEventListener('dom-ready', () => {
      engineInjected = false;
      urlInput.value = webview.getURL();
      // Inject once per page load; detection can then be called cheaply
      injectEngine().catch(() => {});
    });

    document.getElementById('url-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const url = urlInput.value.trim();
      if (url) webview.src = url;
    });

    detectBtn.addEventListener('click', () => detectFields());
    fillAllBtn.addEventListener('click', () => fillAll());
    document.getElementById('log-apply-btn').addEventListener('click', () => logApplication());
  }

  /**
   * After manually submitting in the webview, file a SUBMITTED
   * application linked to this page (stub JD created when the page is
   * not from the feed) so progress tracking stays complete.
   */
  async function logApplication() {
    const btn = document.getElementById('log-apply-btn');
    const url = webview.getURL();
    if (!url || !/^https?:\/\//i.test(url)) {
      window.alert('请先在左侧打开一个网申页面');
      return;
    }
    btn.disabled = true;
    btn.textContent = '记录中…';
    try {
      const base = await window.synchireJobBrowser.getApiBase();
      const res = await fetch(`${base}/api/job-sources/log-application`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title: webview.getTitle() || null,
          company: null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        window.alert('记录失败：' + (body.detail || res.status));
      } else {
        const data = await res.json();
        btn.textContent = '已记录 ✓';
        window.setTimeout(() => { btn.textContent = '✓ 记录投递'; }, 2500);
        console.log('[job-browser] application logged:', data.application_id);
      }
    } catch (err) {
      window.alert('记录失败：' + err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function injectEngine() {
    if (engineInjected) return;
    const source = window.synchireJobBrowser.getEngineSource();
    await webview.executeJavaScript(source, true);
    engineInjected = true;
  }

  async function callEngine(expression) {
    await injectEngine();
    return webview.executeJavaScript(expression, true);
  }

  async function fetchProfileValues() {
    const base = await window.synchireJobBrowser.getApiBase();
    const values = {};
    try {
      const res = await fetch(`${base}/api/profile`);
      if (res.ok) {
        const profiles = await res.json();
        const profile = Array.isArray(profiles) ? profiles[0] : profiles;
        if (profile) {
          if (profile.display_name) values.fullName = profile.display_name;
          if (profile.email) values.email = profile.email;
          if (profile.phone) values.phone = profile.phone;
          if (profile.location) values.location = profile.location;
          if (profile.target_title) values.targetTitle = profile.target_title;
          if (profile.summary) values.personalSummary = profile.summary;
          for (const link of profile.links || []) {
            const href = String(link.url || '');
            if (/linkedin\.com/i.test(href) && !values.linkedinUrl) values.linkedinUrl = href;
            else if (/github\.com/i.test(href) && !values.githubUrl) values.githubUrl = href;
            else if (href && !values.portfolioUrl) values.portfolioUrl = href;
          }
        }
      }
      // Skills from the most recent role card, if any
      const cardsRes = await fetch(`${base}/api/career-cards`);
      if (cardsRes.ok) {
        const cards = await cardsRes.json();
        const card = Array.isArray(cards) && cards.length ? cards[cards.length - 1] : null;
        const skills = card && Array.isArray(card.core_skills) ? card.core_skills : [];
        if (skills.length) values.skills = skills.slice(0, 12).join(', ');
      }
    } catch (err) {
      // Profile is best-effort; manual entry in the panel still works
      console.warn('[job-browser] profile fetch failed:', err);
    }
    return values;
  }

  async function detectFields() {
    fieldsEl.innerHTML = '<div class="empty-state">检测中…</div>';
    try {
      const raw = await callEngine(
        'JSON.stringify(SynchireFillEngine.detectFormFields(document)' +
          '.map(function (f) { var c = Object.assign({}, f); c.element = null; return c; }))',
      );
      detectedFields = JSON.parse(raw);
      const profileValues = await fetchProfileValues();
      renderFields(profileValues);
    } catch (err) {
      fieldsEl.innerHTML =
        '<div class="empty-state">检测失败：页面可能限制了脚本注入（' + esc(err.message) + '）</div>';
    }
  }

  function renderFields(profileValues) {
    valueByIndex.clear();
    if (!detectedFields.length) {
      fieldsEl.innerHTML = '<div class="empty-state">此页面未检测到可填充的表单字段</div>';
      return;
    }

    fieldsEl.innerHTML = '';
    for (const field of detectedFields) {
      const suggested =
        (field.profileKey && profileValues[field.profileKey]) || '';
      if (suggested) valueByIndex.set(field.index, suggested);

      const card = document.createElement('div');
      card.className = 'field-card';
      if (field.needsManualAction) card.classList.add('needs-review');

      const kindText =
        field.controlType === 'custom' ? '自定义控件·需人工'
          : field.controlType === 'select' || field.controlType === 'select-multiple' ? '下拉'
            : field.controlType === 'checkbox' || field.controlType === 'radio' ? '选择'
              : field.controlType === 'textarea' ? '长文本' : '文本';

      card.innerHTML =
        '<div class="meta"><span class="label" title="' + esc(field.label) + '">' +
        esc(field.label || field.name || '未命名字段') + '</span>' +
        '<span class="kind">' + esc(kindText) + '</span></div>' +
        '<div class="row"><input type="text" aria-label="填充值" />' +
        '<button type="button" class="fill-one">填充</button></div>' +
        '<div class="status-note">' +
        (field.profileKey
          ? '已映射档案字段: ' + esc(field.profileKey)
          : '未映射档案字段（可手动填写）') +
        '</div>';

      const input = card.querySelector('input');
      input.value = suggested;
      input.addEventListener('input', () => valueByIndex.set(field.index, input.value));

      card.querySelector('.fill-one').addEventListener('click', async () => {
        const outcome = await fillOne(field.index, input.value);
        card.classList.toggle('filled', outcome.status === 'filled');
        card.querySelector('.status-note').textContent =
          outcome.status === 'filled' ? '已填充 ✓'
            : outcome.status === 'needs-review' ? '需人工处理（' + esc(outcome.reason || '') + '）'
              : '跳过（' + esc(outcome.reason || '') + '）';
      });

      fieldsEl.appendChild(card);
    }
  }

  async function fillOne(index, value) {
    const expression =
      'JSON.stringify(SynchireFillEngine.fillField(document, ' + Number(index) + ', ' +
      JSON.stringify(String(value ?? '')) + '))';
    return JSON.parse(await callEngine(expression));
  }

  async function fillAll() {
    if (!detectedFields.length) return;
    const cards = fieldsEl.querySelectorAll('.field-card');
    let filled = 0;
    for (const field of detectedFields) {
      const value = valueByIndex.get(field.index);
      if (value == null || value === '') continue;
      const outcome = await fillOne(field.index, value);
      const card = cards[field.index];
      if (card) {
        card.classList.toggle('filled', outcome.status === 'filled');
        card.querySelector('.status-note').textContent =
          outcome.status === 'filled' ? '已填充 ✓'
            : outcome.status === 'needs-review' ? '需人工处理（' + esc(outcome.reason || '') + '）'
              : '跳过（' + esc(outcome.reason || '') + '）';
      }
      if (outcome.status === 'filled') filled += 1;
    }
    const note = document.createElement('div');
    note.className = 'status-note';
    note.textContent = '批量填充完成：' + filled + ' 个字段，请检查后手动提交。';
    fieldsEl.prepend(note);
  }

  init().catch((err) => console.error('[job-browser] init failed:', err));
})();
