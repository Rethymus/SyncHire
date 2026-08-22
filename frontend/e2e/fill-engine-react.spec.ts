/**
 * 填表引擎（fill-engine）e2e · 真实 React 受控组件页
 *
 * fill-engine.spec.ts 验证的是静态 DOM + 事件派发机制的「静态一半」：
 * DOM 值落盘、事件冒泡可被监听。但它无法证明 React 真的把填充当成了
 * 用户输入——受控组件的判定标准是 React state 是否更新。本套件补上
 * 这个盲区：
 *
 *  - fixture 由 scripts/build-fill-fixture.mjs 用仓库内 react/react-dom
 *    （React 19 无 UMD，只能 esbuild 打包内联）生成自包含 HTML，
 *    file:// 打开，与 Electron <webview> 场景同为真实浏览器运行时；
 *  - 表单全部字段由 useState 驱动（受控组件），旁边 live-preview 直接
 *    渲染 React state：只改 DOM 不派发事件时 preview 纹丝不动，事件
 *    派发正确时 preview 跟进——这是受控组件的铁证；
 *  - 引擎 bundle 与静态套件注入的是同一份 fill-engine.iife.js，
 *    beforeAll 重新构建，保证测试对象与源码同步。
 *
 * 覆盖点：
 *  1. 检测：React 渲染的真实 DOM 上 controlType / profileKey / select
 *     options / label 全部正确，input[type=submit] 仍被忽略；
 *  2. 受控填充：planFromProfile → applyFillPlan + 单选/勾选单字段填充后，
 *     DOM 值与 React state（live preview）同时落盘，表单从未被提交；
 *  3. 受控铁证（负向对照）：绕过引擎、用原生 setter 只改 DOM 值不派发
 *     事件时 React state 不更新，随后引擎填充同字段才真正生效。
 *
 * 前置：本测试走 file://，不依赖 webServer 与后端。
 */

import { test, expect, Page } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// playwright 从 frontend/ 目录启动（process.cwd() 即 frontend）
const repoRoot = path.resolve(process.cwd(), '..')
const fixtureBuildScript = path.join(repoRoot, 'scripts', 'build-fill-fixture.mjs')
const engineBuildScript = path.join(repoRoot, 'scripts', 'build-fill-engine.mjs')
const enginePath = path.join(repoRoot, 'electron', 'job-browser', 'fill-engine.iife.js')
const fixturePath = path.join(repoRoot, 'electron', 'job-browser', 'fixtures', 'react-form.html')

/**
 * React 渲染的受控表单中的可填控件：
 * 姓名/邮箱/手机号/学历 select/性别 3 个单选/自我介绍/同意条款 = 9 个。
 * input[type=submit]（name="submit"）被「绝不自动提交」约束排除。
 */
const EXPECTED_FIELD_COUNT = 9

test.beforeAll(() => {
  for (const script of [fixtureBuildScript, engineBuildScript]) {
    if (!existsSync(script)) {
      throw new Error(`未找到构建脚本 ${script}，请从 frontend/ 目录运行 playwright`)
    }
  }
  // 用 process.execPath 直接跑脚本，避免 Windows 下 .cmd shim 解析问题
  for (const [label, script] of [
    ['build-fill-fixture', fixtureBuildScript],
    ['build-fill-engine', engineBuildScript],
  ] as const) {
    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    if (result.status !== 0) {
      throw new Error(`${label} 失败:\n${result.stdout}\n${result.stderr}`)
    }
  }
  for (const artifact of [enginePath, fixturePath]) {
    if (!existsSync(artifact)) {
      throw new Error(`构建后仍未找到 ${artifact}`)
    }
  }
})

/** 打开 React 受控表单，等 React 完成首帧渲染后注入引擎 bundle */
async function openReactFormWithEngine(page: Page) {
  await page.goto(pathToFileURL(fixturePath).href)
  // live-preview 只在 React 渲染后出现：它是「React 真的在跑」的哨兵
  await page.locator('#live-preview').waitFor()
  await page.addScriptTag({ path: enginePath })
}

test('检测：React 受控表单字段识别正确，提交按钮仍被忽略', async ({ page }) => {
  await openReactFormWithEngine(page)

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

  // React 渲染的原生控件与静态 DOM 同等可自动填充
  expect(fields.every((f: any) => !f.needsManualAction)).toBe(true)
  // 「绝不自动提交」在 React 页同样成立
  expect(
    fields.some((f: any) => f.name === 'submit' || f.inputType === 'submit'),
    'input[type=submit] 必须被检测忽略',
  ).toBe(false)

  const byName = (name: string) => {
    const hit = fields.filter((f: any) => f.name === name)
    expect(hit, `字段 name=${name} 应被检出`).not.toHaveLength(0)
    return hit.length === 1 ? hit[0] : hit
  }

  // 受控组件不改变检测语义：类型、档案映射、label（label[for] 关联）
  // 与 select options 均与静态表单一致
  expect(byName('name')).toMatchObject({
    controlType: 'text',
    profileKey: 'fullName',
    inputType: 'text',
    label: '姓名',
  })
  expect(byName('email')).toMatchObject({
    controlType: 'text',
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
  expect(byName('education')).toMatchObject({
    controlType: 'select',
    profileKey: 'education',
    label: '学历',
  })
  // React 由 state 生成的 <option> 列表照常收集为候选值
  expect((byName('education') as any).options).toEqual([
    '',
    'high_school',
    'associate',
    'bachelor',
    'master',
    'doctorate',
  ])

  const genderRadios = byName('gender')
  expect(genderRadios).toHaveLength(3)
  for (const radio of genderRadios as any[]) {
    expect(radio.controlType).toBe('radio')
    expect(radio.profileKey).toBeNull()
  }

  expect(byName('self_introduction')).toMatchObject({
    controlType: 'textarea',
    profileKey: 'personalSummary',
    label: '自我介绍',
  })
  const agree = byName('agree_terms') as any
  expect(agree.controlType).toBe('checkbox')
  expect(agree.profileKey).toBeNull()
  expect(agree.label).toContain('同意')
})

test('受控填充：applyFillPlan 后 React state 真实更新（live preview 与填充值一致）', async ({ page }) => {
  await openReactFormWithEngine(page)

  const profile = {
    fullName: '李四',
    email: 'lisi@example.com',
    phone: '13911112222',
    education: '本科', // 按可见文本匹配到 <option value="bachelor">
    personalSummary: 'React 受控组件填充验证：state 必须与 DOM 同步更新。',
  }

  const result = await page.evaluate((values) => {
    const engine = (window as any).SynchireFillEngine
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
    }
  }, profile)

  // 5 个映射字段（姓名/邮箱/手机号/学历/自我介绍@7，性别 4-6 与条款 8 不在此列）
  expect(result.planIndexes).toEqual([0, 1, 2, 3, 7])
  expect(
    result.statuses.every((s: string) => s === 'filled'),
    '批量填充结果全部为 filled',
  ).toBe(true)
  expect(result.radioOutcome.status).toBe('filled')
  expect(result.checkboxOutcome.status).toBe('filled')

  // —— DOM 值落盘（受控组件下 React 会用 state 重新渲染同一值）——
  await expect(page.locator('#name')).toHaveValue(profile.fullName)
  await expect(page.locator('#email')).toHaveValue(profile.email)
  await expect(page.locator('#phone')).toHaveValue(profile.phone)
  await expect(page.locator('#education')).toHaveValue('bachelor')
  await expect(page.locator('#self_introduction')).toHaveValue(profile.personalSummary)

  // —— React state 真实更新：live preview 直接渲染 useState，值必须一致 ——
  // 这才是受控组件的判据：若引擎只改了 DOM 而没触发 onChange，
  // 下一帧 React 会把 value 渲染回旧 state，preview 也停留在占位文案。
  await expect(page.getByTestId('preview-name')).toHaveText(`姓名：${profile.fullName}`)
  await expect(page.getByTestId('preview-email')).toHaveText(`邮箱：${profile.email}`)
  await expect(page.getByTestId('preview-phone')).toHaveText(`手机号：${profile.phone}`)
  await expect(page.getByTestId('preview-education')).toHaveText('学历：bachelor')
  await expect(page.getByTestId('preview-summary')).toHaveText(`自我介绍：${profile.personalSummary}`)

  // 单选按 value 命中组内目标，React state 同步（preview 显示「女」）
  await expect(page.locator('input[name="gender"][value="female"]')).toBeChecked()
  await expect(page.locator('input[name="gender"][value="male"]')).not.toBeChecked()
  await expect(page.locator('input[name="gender"][value="secret"]')).not.toBeChecked()
  await expect(page.getByTestId('preview-gender')).toHaveText('性别：female')

  // 受控 checkbox：click 激活行为触发 React onChange，state 翻转为 true
  await expect(page.locator('#agree_terms')).toBeChecked()
  await expect(page.getByTestId('preview-agree')).toHaveText('同意条款：是')

  // 「绝不自动提交」：填充流程结束后表单一次都没被提交
  await expect(page.locator('#submit-count')).toHaveText('已提交 0 次')
})

test('受控铁证：只改 DOM 不派发事件时 React state 不动，引擎填充后才更新', async ({ page }) => {
  await openReactFormWithEngine(page)

  // 负向对照：用引擎同款「原生原型 setter」直接改 DOM 值，但不派发
  // input/change 事件。受控组件下 React 感知不到这次改动——
  // state 与 live preview 必须保持初始占位文案。
  const before = await page.evaluate(() => {
    const input = document.getElementById('name') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, '野值：未派发事件')
    const select = document.getElementById('education') as HTMLSelectElement
    const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
    selectSetter.call(select, 'master')
    return {
      domName: input.value,
      domEducation: select.value,
      previewName: document.querySelector('[data-testid="preview-name"]')!.textContent,
      previewEducation: document.querySelector('[data-testid="preview-education"]')!.textContent,
    }
  })

  expect(before.domName, '原生 setter 确实改了 DOM').toBe('野值：未派发事件')
  expect(before.domEducation).toBe('master')
  expect(before.previewName, '未派发事件 → React state 未更新').toBe('姓名：（未填写）')
  expect(before.previewEducation).toBe('学历：（未选择）')

  // React 在任何后续渲染中也不会把 state 覆盖回 DOM 之外的东西：
  // 强制走一次 React 渲染（点一下与字段无关的受控控件触发 setState），
  // 野值所在的 name/education 不受影响，仍由 state 主导。
  await page.locator('#agree_terms').click()
  await expect(page.getByTestId('preview-agree')).toHaveText('同意条款：是')

  // 引擎上场：对同两个字段走完整路径（setter + input/change 派发），
  // React state 必须更新——野值被引擎值取代，preview 跟进。
  const outcome = await page.evaluate(() => {
    const engine = (window as any).SynchireFillEngine
    const detected = engine.detectFormFields(document)
    const nameIndex = detected.find((f: any) => f.name === 'name').index
    const educationIndex = detected.find((f: any) => f.name === 'education').index
    return {
      name: engine.fillField(document, nameIndex, '王五'),
      education: engine.fillField(document, educationIndex, '博士'),
    }
  })

  expect(outcome.name.status).toBe('filled')
  expect(outcome.education.status).toBe('filled')

  await expect(page.locator('#name')).toHaveValue('王五')
  await expect(page.locator('#education')).toHaveValue('doctorate')
  await expect(page.getByTestId('preview-name')).toHaveText('姓名：王五')
  await expect(page.getByTestId('preview-education')).toHaveText('学历：doctorate')

  // 全程未触发表单提交
  await expect(page.locator('#submit-count')).toHaveText('已提交 0 次')
})
