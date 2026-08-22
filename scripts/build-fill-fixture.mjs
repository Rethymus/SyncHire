/**
 * Builds a real-React controlled-form fixture page for fill-engine e2e.
 *
 * Why a bundler-generated fixture: React 19 dropped the UMD build, so a
 * <script src="react..."> page is no longer possible. Instead we bundle a
 * TSX entry (stdin, no intermediate file) against the react/react-dom
 * copies already in this repo's node_modules — zero network access — and
 * inline the resulting IIFE into a self-contained HTML page that opens
 * via file://, exactly like electron/job-browser/test-form.html.
 *
 * The form is the controlled-component worst case for a fill engine:
 * every field's value/checked comes from useState, and a live-preview
 * panel re-renders from that same state. DOM-only value writes that skip
 * the input/change events leave the preview stale — proof that the
 * engine's prototype-setter + event-dispatch path actually updates
 * React state (not just the DOM node).
 *
 * Run: npm run build:fill-fixture
 * Out: electron/job-browser/fixtures/react-form.html (committed on
 * purpose, same as fill-engine.iife.js / test-form.html, so e2e can run
 * from a fresh checkout without a build step; regenerate via the script).
 */

import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(rootDir, 'electron/job-browser/fixtures');
const outfile = path.join(outDir, 'react-form.html');

// Fixture app source. Constraints of the stdin-embed approach: keep it
// free of backticks and ${ } so it can live verbatim in the template
// literal below (no intermediate source file needed).
const FIXTURE_TSX = `
import { useState } from 'react';
import { createRoot } from 'react-dom/client';

const EDUCATION_OPTIONS = [
  { value: '', label: '请选择' },
  { value: 'high_school', label: '高中' },
  { value: 'associate', label: '大专' },
  { value: 'bachelor', label: '本科' },
  { value: 'master', label: '硕士' },
  { value: 'doctorate', label: '博士' },
];

function App() {
  // 受控组件：每个字段的 value/checked 都来自 state，
  // 改 DOM 不改 state 就等于没改（下次渲染会被覆盖回去）。
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [education, setEducation] = useState('');
  const [gender, setGender] = useState('');
  const [agree, setAgree] = useState(false);
  const [summary, setSummary] = useState('');
  const [submits, setSubmits] = useState(0);

  return (
    <main>
      <h1>React 受控表单</h1>
      <p className="hint">
        本页由仓库内 react/react-dom 打包渲染（React 19，无 UMD，esbuild 内联）。
        所有字段均为受控组件；右侧「实时预览」直接渲染 React state——
        只有引擎正确派发 input/change 事件，预览才会跟进。
      </p>

      <form action="#" onSubmit={(e) => { e.preventDefault(); setSubmits((n) => n + 1); }}>
        <div className="field-row">
          <label htmlFor="name">姓名</label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="请输入真实姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field-row">
          <label htmlFor="email">邮箱</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field-row">
          <label htmlFor="phone">手机号</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="13800000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="field-row">
          <label htmlFor="education">学历</label>
          <select
            id="education"
            name="education"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
          >
            {EDUCATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="choice-group">
          <span className="group-label">性别</span>
          <label>
            <input
              type="radio"
              name="gender"
              value="male"
              checked={gender === 'male'}
              onChange={(e) => setGender(e.target.value)}
            />{' '}男
          </label>
          <label>
            <input
              type="radio"
              name="gender"
              value="female"
              checked={gender === 'female'}
              onChange={(e) => setGender(e.target.value)}
            />{' '}女
          </label>
          <label>
            <input
              type="radio"
              name="gender"
              value="secret"
              checked={gender === 'secret'}
              onChange={(e) => setGender(e.target.value)}
            />{' '}保密
          </label>
        </div>

        <div className="field-row">
          <label htmlFor="self_introduction">自我介绍</label>
          <textarea
            id="self_introduction"
            name="self_introduction"
            placeholder="简要介绍教育背景、技能与项目经历"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>

        <div className="choice-group">
          <label htmlFor="agree_terms">
            <input
              type="checkbox"
              id="agree_terms"
              name="agree_terms"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />{' '}我已阅读并同意招聘条款与隐私政策
          </label>
        </div>

        {/* 引擎「绝不自动提交」约束的边界用例：type=submit 命中
            FILLABLE_SELECTOR(input) 但必须被检测排除 */}
        <input type="submit" id="submit-btn" name="submit" value="提交申请 Submit Application" />
        <span id="submit-count">已提交 {submits} 次</span>
      </form>

      <section id="live-preview" aria-label="实时预览（React state）">
        <h2>实时预览（React state）</h2>
        <p data-testid="preview-name">姓名：{name || '（未填写）'}</p>
        <p data-testid="preview-email">邮箱：{email || '（未填写）'}</p>
        <p data-testid="preview-phone">手机号：{phone || '（未填写）'}</p>
        <p data-testid="preview-education">学历：{education || '（未选择）'}</p>
        <p data-testid="preview-gender">性别：{gender || '（未选择）'}</p>
        <p data-testid="preview-agree">同意条款：{agree ? '是' : '否'}</p>
        <p data-testid="preview-summary">自我介绍：{summary || '（未填写）'}</p>
      </section>
    </main>
  );
}

const container = document.getElementById('react-root');
createRoot(container).render(<App />);
`;

const result = await build({
  stdin: {
    contents: FIXTURE_TSX,
    loader: 'tsx',
    resolveDir: rootDir, // so react/react-dom resolve from repo node_modules
    sourcefile: 'react-form-fixture.tsx',
  },
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  platform: 'browser',
  jsx: 'automatic',
  // React/scheduler CJS entries branch on process.env.NODE_ENV; pin to
  // production so the browser bundle has no `process` references.
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  minify: true,
  write: false,
});

const js = result.outputFiles[0].text;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SyncHire 填表引擎 · React 受控表单 fixture</title>
  <!-- 本文件由 scripts/build-fill-fixture.mjs 生成（npm run build:fill-fixture），请勿手改 -->
  <style>
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; margin: 24px auto; max-width: 760px; color: #111827; }
    h1 { font-size: 18px; margin-bottom: 6px; }
    h2 { font-size: 14px; margin: 0 0 8px; }
    .hint { font-size: 12px; color: #6b7280; margin-bottom: 18px; line-height: 1.5; }
    .field-row { display: flex; flex-direction: column; margin-bottom: 10px; }
    .field-row > label { font-size: 13px; margin-bottom: 4px; }
    input[type="text"], input[type="email"], input[type="tel"], select, textarea {
      padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 5px; font-size: 13px; font-family: inherit;
    }
    textarea { min-height: 72px; resize: vertical; }
    .choice-group { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; font-size: 13px; }
    .choice-group > .group-label, .choice-group > label[for] { font-weight: 600; }
    .choice-group label { display: inline-flex; gap: 4px; align-items: center; }
    input[type="submit"] {
      padding: 8px 18px; border: 1px solid #4f46e5; border-radius: 6px;
      background: #4f46e5; color: #fff; font-size: 14px; cursor: pointer;
    }
    #submit-count { margin-left: 12px; font-size: 13px; color: #10b981; }
    #live-preview {
      margin-top: 22px; border: 1px dashed #9ca3af; border-radius: 8px;
      padding: 12px 16px; background: #f9fafb; font-size: 13px; line-height: 1.7;
    }
    #live-preview p { margin: 0; }
  </style>
</head>
<body>
  <div id="react-root"></div>
  <script>${js}</script>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(outfile, html, 'utf8');

console.log(
  `[build-fill-fixture] wrote ${path.relative(rootDir, outfile)} (${(html.length / 1024).toFixed(1)} kB)`,
);
