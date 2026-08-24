/**
 * 填表引擎（fill-engine）e2e
 *
 * 注入引擎（electron/job-browser/fill-engine.iife.js，esbuild IIFE，
 * 与 Electron <webview> 里 executeJavaScript 注入的是同一份产物）到
 * 静态测试表单页（electron/job-browser/test-form.html，file:// 打开），
 * 验证检测与填充行为。这是无头环境下对 <webview> 注入路径的等价自动化
 * 验证：真实 DOM、真实脚本注入，只是不启动 Electron 主进程。
 *
 * 覆盖点：
 *  - 引擎按约定暴露全局对象 SynchireFillEngine（IIFE globalName）
 *  - 中英文字段均被识别，controlType / 档案映射（profileKey）正确
 *  - input[type=submit] 被「绝不自动提交」约束排除在可填字段之外
 *  - planFromProfile → applyFillPlan 端到端填充：原生 setter + 事件派发
 *    后，DOM 值真实落盘（React/Vue 受控组件可见的同一路径）
 *
 * 前置：beforeAll 内用 child_process 重新执行 scripts/build-fill-engine.mjs，
 * 保证测试验证的 bundle 与 frontend/src/lib/form-fill-engine.ts 同步，
 * 消除「源码已改、产物过期仍然通过」的假阳性（等价于先跑
 * `npm run build:fill-engine`）。本测试走 file://，不依赖 webServer。
 */

import { test, expect, Page } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// playwright 从 frontend/ 目录启动（process.cwd() 即 frontend）
const repoRoot = path.resolve(process.cwd(), '..')
const buildScript = path.join(repoRoot, 'scripts', 'build-fill-engine.mjs')
const enginePath = path.join(repoRoot, 'electron', 'job-browser', 'fill-engine.iife.js')
const formPath = path.join(repoRoot, 'electron', 'job-browser', 'test-form.html')

/**
 * 测试表单中的可填控件：
 *  - 中文区 10 个（含 3 个单选）+ 英文区 4 个 + srcdoc iframe 内 3 个 = 17 个
 *  - 跨源（沙箱唯一源）iframe 内的字段不可读、必须被静默跳过，不计数
 *  - input[type=submit] × 3（主文档/iframe 内/沙箱 iframe 内）均被排除
 */
const EXPECTED_FIELD_COUNT = 17

/** 主文档（非 iframe）字段的 name 顺序：index 0-13，iframe 字段追加在其后 */
const MAIN_DOC_FIELD_NAMES = [
  'name', 'email', 'phone',
  'gender', 'gender', 'gender',
  'education', 'salary', 'self_introduction', 'agree_terms',
  'full_name', 'email_address', 'phone_number', 'linkedin',
]

test.beforeAll(() => {
  if (!existsSync(buildScript)) {
    throw new Error(`未找到构建脚本 ${buildScript}，请从 frontend/ 目录运行 playwright`)
  }
  // 用 process.execPath 直接跑脚本，避免 Windows 下 .cmd shim 解析问题
  const result = spawnSync(process.execPath, [buildScript], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(`build-fill-engine 失败:\n${result.stdout}\n${result.stderr}`)
  }
  if (!existsSync(enginePath)) {
    throw new Error(`构建后仍未找到 ${enginePath}`)
  }
})

/** 打开静态测试表单并注入与 Electron 注入路径相同的引擎 bundle */
async function openFormWithEngine(page: Page) {
  await page.goto(pathToFileURL(formPath).href)
  await page.addScriptTag({ path: enginePath })
}

test('引擎以 IIFE 约定暴露全局 API', async ({ page }) => {
  await openFormWithEngine(page)

  const api = await page.evaluate(() => {
    const engine = (window as any).SynchireFillEngine
    return {
      hasGlobal: !!engine,
      functions: ['detectFormFields', 'fillField', 'applyFillPlan', 'planFromProfile'].map(
        (name) => typeof engine?.[name],
      ),
      fieldMapIsArray: Array.isArray(engine?.FIELD_MAP),
      fieldMapKeys: (engine?.FIELD_MAP ?? []).map((m: any) => m.key),
    }
  })

  expect(api.hasGlobal, 'window.SynchireFillEngine 全局对象').toBe(true)
  expect(
    api.functions.every((t) => t === 'function'),
    'detectFormFields/fillField/applyFillPlan/planFromProfile 均为函数',
  ).toBe(true)
  expect(api.fieldMapIsArray, 'FIELD_MAP 双语映射表随 bundle 导出').toBe(true)
  expect(api.fieldMapKeys).toContain('fullName')
  expect(api.fieldMapKeys).toContain('salaryExpectation')
})

test('检测：中英文字段全部识别且类型正确，提交按钮被忽略', async ({ page }) => {
  await openFormWithEngine(page)

  // 与 panel.js 相同的调用方式（root = document），element 为存活引用，
  // 在页面内投影成可序列化结构（含底层 input type，用于区分 text/email/tel/url）
  const fields = await page.evaluate(() => {
    const engine = (window as any).SynchireFillEngine
    return engine.detectFormFields(document).map((f: any) => ({
      index: f.index,
      controlType: f.controlType,
      label: f.label,
      name: f.name,
      profileKey: f.profileKey,
      options: f.options ?? null,
      needsManualAction: f.needsManualAction,
      inputType: f.element instanceof HTMLInputElement ? f.element.type : null,
    }))
  })

  expect(fields.length, '可填字段总数（不含提交按钮）').toBe(EXPECTED_FIELD_COUNT)

  // 「绝不自动提交」：submit 控件不得进入可填字段
  expect(
    fields.some((f) => f.name === 'submit' || f.inputType === 'submit'),
    'input[type=submit] 必须被检测忽略',
  ).toBe(false)
  // 原生控件全部可自动填充，无需人工介入
  expect(fields.every((f) => !f.needsManualAction)).toBe(true)

  const byName = (name: string) => {
    const hit = fields.filter((f) => f.name === name)
    expect(hit, `字段 name=${name} 应被检出`).not.toHaveLength(0)
    return hit.length === 1 ? hit[0] : hit
  }

  // —— 中文字段：类型 + 档案映射 ——
  expect(byName('name')).toMatchObject({
    controlType: 'text',
    profileKey: 'fullName',
    inputType: 'text',
    label: '姓名',
  })
  expect(byName('email')).toMatchObject({
    controlType: 'text', // 引擎把 email/tel/url 等文本输入统一归为 text
    profileKey: 'email',
    inputType: 'email',
    label: '邮箱',
  })
  expect(byName('phone')).toMatchObject({
    controlType: 'text',
    profileKey: 'phone',
    inputType: 'tel',
    label: '手机号',
  })

  const genderRadios = byName('gender')
  expect(genderRadios).toHaveLength(3)
  for (const radio of genderRadios as any[]) {
    expect(radio.controlType).toBe('radio')
    // 性别不在 FIELD_MAP 中：应检出为可手动填充，但无档案映射
    expect(radio.profileKey).toBeNull()
  }

  expect(byName('education')).toMatchObject({
    controlType: 'select',
    profileKey: 'education',
    label: '学历',
  })
  expect((byName('education') as any).options).toEqual([
    '',
    'high_school',
    'associate',
    'bachelor',
    'master',
    'doctorate',
  ])

  expect(byName('salary')).toMatchObject({
    controlType: 'text',
    profileKey: 'salaryExpectation',
    label: '期望薪资',
  })
  expect(byName('self_introduction')).toMatchObject({
    controlType: 'textarea',
    profileKey: 'personalSummary',
    label: '自我介绍',
  })
  const agree = byName('agree_terms') as any
  expect(agree.controlType).toBe('checkbox')
  expect(agree.profileKey).toBeNull()
  expect(agree.label).toContain('同意')

  // —— 英文字段 ——
  expect(byName('full_name')).toMatchObject({
    controlType: 'text',
    profileKey: 'fullName',
    label: 'Full Name',
  })
  expect(byName('email_address')).toMatchObject({
    controlType: 'text',
    profileKey: 'email',
    inputType: 'email',
  })
  expect(byName('phone_number')).toMatchObject({
    controlType: 'text',
    profileKey: 'phone',
    inputType: 'tel',
  })
  expect(byName('linkedin')).toMatchObject({
    controlType: 'text',
    profileKey: 'linkedinUrl',
    inputType: 'url',
  })
})

test('填充：planFromProfile → applyFillPlan 端到端写入 DOM 并派发事件', async ({ page }) => {
  await openFormWithEngine(page)

  const profile = {
    fullName: '张三',
    email: 'zhangsan@example.com',
    phone: '13800001234',
    education: '本科', // 按可见文本匹配到 <option value="bachelor">
    salaryExpectation: '25k-35k',
    personalSummary: '前端应届生，熟悉 React 与 Playwright 自动化测试。',
    linkedinUrl: 'https://www.linkedin.com/in/zhangsan',
  }

  const result = await page.evaluate(async (values) => {
    const engine = (window as any).SynchireFillEngine
    // 记录引擎派发/触发的 input 与 change 事件（冒泡阶段，capture 记录）
    ;(window as any).__fillEvents = []
    for (const type of ['input', 'change']) {
      document.addEventListener(type, (e: any) => {
        const key = e.target?.name || e.target?.id || ''
        ;(window as any).__fillEvents.push(`${type}@${key}`)
      }, true)
    }

    const plan = engine.planFromProfile(document, values)
    const outcomes = engine.applyFillPlan(document, plan)

    // 未映射字段走单字段填充：性别单选（按 value 选组内目标）、同意条款（勾选）
    const detected = engine.detectFormFields(document)
    const genderIndex = detected.find((f: any) => f.name === 'gender').index
    const agreeIndex = detected.find((f: any) => f.name === 'agree_terms').index
    const radioOutcome = engine.fillField(document, genderIndex, 'female')
    const checkboxOutcome = engine.fillField(document, agreeIndex, 'true')

    return {
      planIndexes: plan.map((p: any) => p.index).sort((a: number, b: number) => a - b),
      statuses: outcomes.map((o: any) => o.status),
      radioOutcome,
      checkboxOutcome,
      events: (window as any).__fillEvents,
    }
  }, profile)

  // 档案映射字段：中文 6 个（姓名/邮箱/手机号/学历/期望薪资/自我介绍）
  // + 英文 4 个（Full Name/Email/Phone/LinkedIn）
  // + iframe 内「姓氏」（last_name 命中 fullName 映射，证明档案填充穿透 iframe）
  // 性别与条款不在此列
  expect(result.planIndexes).toHaveLength(11)
  expect(
    result.statuses.every((s: string) => s === 'filled'),
    '批量填充结果全部为 filled',
  ).toBe(true)
  expect(result.radioOutcome.status).toBe('filled')
  expect(result.checkboxOutcome.status).toBe('filled')

  // DOM 真实落盘（受控组件可见路径：原生 setter 赋值）
  await expect(page.locator('#zh-name')).toHaveValue(profile.fullName)
  await expect(page.locator('#zh-email')).toHaveValue(profile.email)
  await expect(page.locator('#zh-phone')).toHaveValue(profile.phone)
  await expect(page.locator('#zh-education')).toHaveValue('bachelor')
  await expect(page.locator('#zh-salary')).toHaveValue(profile.salaryExpectation)
  await expect(page.locator('#zh-summary')).toHaveValue(profile.personalSummary)
  await expect(page.locator('#en-name')).toHaveValue(profile.fullName)
  await expect(page.locator('#en-email')).toHaveValue(profile.email)
  await expect(page.locator('#en-phone')).toHaveValue(profile.phone)
  await expect(page.locator('#en-linkedin')).toHaveValue(profile.linkedinUrl)
  // iframe 内字段同样落盘：plan 管线（element 活引用跨文档）直达 iframe DOM
  await expect(page.frameLocator('#embedded-frame').locator('#if-last-name'))
    .toHaveValue(profile.fullName)

  // 单选按 value 命中组内目标，其余保持未选
  await expect(page.locator('input[name="gender"][value="female"]')).toBeChecked()
  await expect(page.locator('input[name="gender"][value="male"]')).not.toBeChecked()
  await expect(page.locator('#zh-agree')).toBeChecked()

  // 原型 setter + 事件派发：框架监听的 input/change 均已触发
  const events: string[] = result.events
  for (const expected of [
    'input@name',
    'change@name', // 姓名文本输入
    'change@education', // 学历下拉（文本匹配）
    'input@self_introduction', // 自我介绍 textarea
    'change@gender', // 单选（click 激活行为触发）
    'change@agree_terms', // 复选框（click 激活行为触发）
  ]) {
    expect(events, `应派发事件 ${expected}`).toContain(expected)
  }
})

test('iframe 穿透：srcdoc 同源 iframe 字段被检出，跨源 iframe 静默跳过，index 连续', async ({ page }) => {
  await openFormWithEngine(page)

  const fields = await page.evaluate(() => {
    const engine = (window as any).SynchireFillEngine
    return {
      // 前置事实：沙箱 iframe 确实跨源（contentDocument 为 null），
      // 证明它不是伪跨源——引擎对它只能也只会静默跳过
      crossOriginFrameUnreadable:
        (document.getElementById('cross-origin-frame') as HTMLIFrameElement).contentDocument === null,
      fields: engine.detectFormFields(document).map((f: any) => ({
        index: f.index,
        controlType: f.controlType,
        label: f.label,
        name: f.name,
        profileKey: f.profileKey,
        options: f.options ?? null,
        needsManualAction: f.needsManualAction,
        // 跨 realm 下 instanceof 不可靠，用 tagName + getAttribute 取 type
        inputType: f.element && f.element.tagName === 'INPUT' ? f.element.getAttribute('type') : null,
        // element 活引用必须指向 iframe 自己的文档（跨文档引用）
        elementInIframeDoc:
          f.element !== null &&
          f.element.ownerDocument !== document &&
          f.element.ownerDocument ===
            (document.getElementById('embedded-frame') as HTMLIFrameElement).contentDocument,
      })),
    }
  })

  expect(fields.crossOriginFrameUnreadable, '沙箱 iframe 对父文档确实不可读（真跨源）').toBe(true)

  const all = fields.fields
  expect(all.length).toBe(EXPECTED_FIELD_COUNT)
  // index 与数组位置一致（追加语义：无空洞、不重排）
  expect(all.every((f: any, i: number) => f.index === i)).toBe(true)

  // —— 主文档字段 index 不受 iframe 影响：前 14 个仍是原有顺序 ——
  expect(all.slice(0, 14).map((f: any) => f.name)).toEqual(MAIN_DOC_FIELD_NAMES)

  // —— srcdoc iframe 字段追加在主文档之后（index 14-16）——
  const iframeFields = all.slice(14)
  expect(iframeFields.map((f: any) => f.name)).toEqual(['last_name', 'id_type', 'id_number'])
  expect(iframeFields.every((f: any) => f.elementInIframeDoc), 'element 活引用指向 iframe 文档').toBe(true)
  expect(iframeFields.every((f: any) => !f.needsManualAction)).toBe(true)

  // 类型 / label（在 iframe 文档内经 label[for] 解析）/ options
  expect(iframeFields[0]).toMatchObject({
    controlType: 'text',
    inputType: 'text',
    label: '姓氏',
    // last_name 命中 FIELD_MAP 的 "name" 标签 → fullName（模糊匹配的既有语义）
    profileKey: 'fullName',
  })
  expect(iframeFields[1]).toMatchObject({
    controlType: 'select',
    label: '证件类型',
    profileKey: null,
  })
  expect(iframeFields[1].options).toEqual(['', 'id_card', 'passport'])
  expect(iframeFields[2]).toMatchObject({
    controlType: 'text',
    label: '证件号码',
    profileKey: null,
  })

  // —— iframe 内提交按钮被忽略（“绝不自动提交”同样穿透到 iframe）——
  expect(
    all.some((f: any) => f.name === 'iframe_submit' || f.inputType === 'submit'),
    'iframe 内 input[type=submit] 必须被检测忽略',
  ).toBe(false)

  // —— 跨源 iframe 静默跳过：其字段不可见，检测不崩溃（上面已完整返回）——
  expect(
    all.some((f: any) => f.name === 'sandboxed_field' || f.name === 'sandboxed_submit'),
    '跨源（沙箱唯一源）iframe 字段不得出现',
  ).toBe(false)
})

test('iframe 填充：fillField 端到端写入 iframe 内 DOM 并在其文档内派发事件', async ({ page }) => {
  await openFormWithEngine(page)

  const result = await page.evaluate(() => {
    const engine = (window as any).SynchireFillEngine
    const detected = engine.detectFormFields(document)
    const idType = detected.find((f: any) => f.name === 'id_type')
    const idNumber = detected.find((f: any) => f.name === 'id_number')
    const lastName = detected.find((f: any) => f.name === 'last_name')

    // 在 iframe 自己的文档里挂监听：引擎派发的 input/change 必须落在这个文档
    const iframeDoc = (document.getElementById('embedded-frame') as HTMLIFrameElement).contentDocument!
    const events: string[] = []
    for (const type of ['input', 'change']) {
      iframeDoc.addEventListener(type, (e: any) => {
        events.push(`${type}@${e.target?.name || e.target?.id || ''}`)
      }, true)
    }

    const selectOutcome = engine.fillField(document, idType.index, '护照') // 按可见文本匹配
    const numberOutcome = engine.fillField(document, idNumber.index, '110101199001011234')
    const nameOutcome = engine.fillField(document, lastName.index, '张')

    return {
      indexes: { idType: idType.index, idNumber: idNumber.index, lastName: lastName.index },
      selectOutcome,
      numberOutcome,
      nameOutcome,
      events,
      // element 活引用跨文档直接可操作：从主文档上下文读取 iframe 内当前值
      valuesThroughLiveRefs: {
        idType: idType.element.value,
        idNumber: idNumber.element.value,
        lastName: lastName.element.value,
      },
    }
  })

  // iframe 字段 index（14/15/16）与上一用例一致
  expect(result.indexes).toEqual({ idType: 15, idNumber: 16, lastName: 14 })
  expect(result.selectOutcome.status).toBe('filled')
  expect(result.numberOutcome.status).toBe('filled')
  expect(result.nameOutcome.status).toBe('filled')

  // 事件在 iframe 文档内派发（主文档监听看不到，跨文档不冒泡）
  expect(result.events).toContain('input@id_number')
  expect(result.events).toContain('change@id_number')
  expect(result.events).toContain('change@id_type')

  // element 活引用跨文档读写成立
  expect(result.valuesThroughLiveRefs).toEqual({
    idType: 'passport', // 「护照」按文本匹配到 value="passport"
    idNumber: '110101199001011234',
    lastName: '张',
  })

  // 独立视角复核：Playwright frameLocator 直查 iframe 内 DOM 真实落盘
  const frame = page.frameLocator('#embedded-frame')
  await expect(frame.locator('#if-id-type')).toHaveValue('passport')
  await expect(frame.locator('#if-id-number')).toHaveValue('110101199001011234')
  await expect(frame.locator('#if-last-name')).toHaveValue('张')

  // iframe 填充不外溢：主文档同语义字段保持未填
  await expect(page.locator('#zh-name')).toHaveValue('')
  await expect(page.locator('#zh-education')).toHaveValue('')
})
