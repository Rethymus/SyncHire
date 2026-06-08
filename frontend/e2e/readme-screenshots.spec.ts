import { test, expect, type Page } from '@playwright/test'

const now = new Date('2026-06-07T12:00:00.000Z').toISOString()

function buildSeedStorage(locale: 'en-US' | 'zh-CN') {
  const isZh = locale === 'zh-CN'

  return {
    version: 1,
    state: {
      resumes: [
        {
          id: 'resume-new-grad',
          name: isZh ? '陈宇-前端工程师简历.txt' : 'chen-yu-frontend-resume.txt',
          content: isZh
            ? [
                '陈宇 - 应届前端工程师',
                'React TypeScript Next.js Playwright 无障碍体验',
                '构建本地优先的求职管理工作流，并为核心页面补充自动化 UI 回归测试。',
              ].join('\n')
            : 'Chen Yu - Frontend Engineer\nReact TypeScript Next.js Playwright Accessibility\nBuilt local-first job application workflows and automated UI tests.',
          uploadedAt: now,
          skills: ['React', 'TypeScript', 'Next.js', 'Playwright', 'Accessibility'],
          experience: ['Built local-first job application workflows', 'Automated UI quality gates'],
        },
        {
          id: 'resume-ai-product',
          name: isZh ? '陈宇-AI产品运营简历.txt' : 'chen-yu-ai-product-resume.txt',
          content: isZh
            ? 'AI 产品运营实习简历，关注提示词评测、数据看板、用户痛点分析和隐私边界。'
            : 'AI product intern resume focused on prompt evaluation, analytics dashboards, and data privacy.',
          uploadedAt: now,
          skills: ['Prompt evaluation', 'Analytics', 'Privacy'],
          experience: ['Created product QA dashboards'],
        },
      ],
      currentResume: null,
      jobDescriptions: [
        {
          id: 'jd-frontend',
          title: isZh ? '应届前端工程师' : 'Graduate Frontend Engineer',
          company: isZh ? '北极星实验室' : 'Northstar Labs',
          description:
            isZh
              ? '使用 React、TypeScript、无障碍体验、本地优先数据处理和 Playwright 回归测试构建可靠的求职者工作流。'
              : 'Build reliable applicant-facing workflows with React, TypeScript, accessibility, local-first data handling, and Playwright regression coverage.',
          requirements: ['React', 'TypeScript', 'Accessibility', 'Playwright', 'Local-first data'],
          skills: ['React', 'TypeScript', 'Playwright', 'Accessibility'],
          createdAt: now,
        },
        {
          id: 'jd-ai-product',
          title: isZh ? 'AI 产品运营助理' : 'AI Product Operations Associate',
          company: isZh ? '启明职业' : 'Helio Career',
          description:
            isZh
              ? '运营 AI 评测闭环，分析候选人痛点，并持续优化求职产品体验。'
              : 'Operate AI evaluation loops, analyze customer pain points, and improve candidate job-search experiences.',
          requirements: ['AI evaluation', 'User research', 'Product analytics'],
          skills: ['AI evaluation', 'Analytics', 'User research'],
          createdAt: now,
        },
      ],
      currentJD: null,
      applications: [
        {
          id: 'app-frontend',
          companyName: isZh ? '北极星实验室' : 'Northstar Labs',
          position: isZh ? '应届前端工程师' : 'Graduate Frontend Engineer',
          status: 'optimized',
          jobId: 'jd-frontend',
          resumeId: 'resume-new-grad',
          matchScore: 86,
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-07T12:00:00.000Z',
          tags: isZh ? ['应届生', '高优先级', '简历已定制'] : ['new-grad', 'high-priority', 'resume-tailored'],
        },
        {
          id: 'app-product',
          companyName: isZh ? '启明职业' : 'Helio Career',
          position: isZh ? 'AI 产品运营助理' : 'AI Product Operations Associate',
          status: 'interview',
          jobId: 'jd-ai-product',
          resumeId: 'resume-ai-product',
          matchScore: 74,
          createdAt: '2026-06-03T09:00:00.000Z',
          updatedAt: '2026-06-06T10:30:00.000Z',
          tags: isZh ? ['面试中', '产品方向'] : ['interview', 'product'],
        },
        {
          id: 'app-platform',
          companyName: isZh ? '轨道工场' : 'Orbit Works',
          position: isZh ? '初级平台 UI 工程师' : 'Junior Platform UI Engineer',
          status: 'applied',
          jobId: 'jd-frontend',
          resumeId: 'resume-new-grad',
          matchScore: 68,
          createdAt: '2026-06-05T08:30:00.000Z',
          updatedAt: '2026-06-05T18:00:00.000Z',
          tags: isZh ? ['待跟进', '前端'] : ['follow-up', 'frontend'],
        },
      ],
      candidateProfile: {
        fullName: isZh ? '陈宇' : 'Chen Yu',
        email: 'chenyu@example.com',
        phone: '+86 138 0000 0000',
        location: isZh ? '中国上海' : 'Shanghai, China',
        targetTitle: isZh ? '应届前端工程师' : 'Graduate Frontend Engineer',
        education: isZh ? '计算机科学本科' : 'B.S. Computer Science',
        school: isZh ? '华东理工大学' : 'East China University of Science and Technology',
        graduationYear: '2026',
        portfolioUrl: 'https://portfolio.example.com/chenyu',
        linkedinUrl: 'https://www.linkedin.com/in/chenyu',
        githubUrl: 'https://github.com/chenyu',
        workAuthorization: isZh ? '具备本地就业资格，接受远程或混合办公' : 'Authorized to work locally; open to remote roles',
        availability: isZh ? '两周内可到岗' : 'Available within 2 weeks',
        salaryExpectation: isZh ? '根据岗位职责开放沟通' : 'Open to discuss based on role scope',
        personalSummary: isZh
          ? '应届前端工程师，关注 React、TypeScript、无障碍体验和可靠用户工作流。'
          : 'Fresh graduate frontend engineer focused on React, TypeScript, accessibility, and reliable user workflows.',
        skills: ['React', 'TypeScript', 'Next.js', 'Playwright', 'Accessibility'],
        projects: [
          isZh
            ? '构建本地优先的求职管理器，覆盖简历、JD 和申请管线。'
            : 'Built a local-first job application tracker with resume, JD, and pipeline management.',
          isZh
            ? '使用 Playwright 和 Vitest 落地自动化 UI 回归测试。'
            : 'Implemented automated UI regression tests with Playwright and Vitest.',
        ],
        updatedAt: now,
      },
      browserFillSessions: [],
      selectedTemplate: 'minimal',
      templateCustomization: {},
      onboarding: {
        isOnboarded: true,
        currentStep: 7,
        completedSteps: ['welcome', 'profile', 'resume-upload', 'first-jd', 'first-analysis'],
        skipped: false,
        startedAt: now,
        completedAt: now,
      },
    },
  }
}

async function seed(page: Page, locale: 'en-US' | 'zh-CN') {
  await page.addInitScript(
    ({ storage, localeValue }) => {
      if (!window.localStorage.getItem('synchire-readme-seeded')) {
        window.localStorage.setItem('synchire-storage', JSON.stringify(storage))
        window.localStorage.setItem('synchire-lite-locale', localeValue)
        window.localStorage.setItem(
          'synchire-backups',
          JSON.stringify([
            {
              id: 'backup-readme',
              created_at: '2026-06-07T12:30:00.000Z',
              size: 8421,
              files_count: 6,
            },
          ])
        )
        window.localStorage.setItem(
          'synchire-saved-searches',
          JSON.stringify([
            {
              id: 'saved-react-new-grad',
              name: localeValue === 'zh-CN' ? 'React 应届生岗位' : 'React new-grad roles',
              search_query: localeValue === 'zh-CN' ? 'React TypeScript 应届生' : 'React TypeScript graduate',
              filters: {
                type: 'application',
                location: localeValue === 'zh-CN' ? '上海' : 'Shanghai',
                status: 'optimized',
              },
              notify_matches: true,
              notification_frequency: 'daily',
              last_notified_at: '2026-06-07T09:00:00.000Z',
              created_at: '2026-06-01T08:00:00.000Z',
              updated_at: '2026-06-07T09:00:00.000Z',
            },
            {
              id: 'saved-ai-product',
              name: localeValue === 'zh-CN' ? 'AI 产品运营机会' : 'AI product operations',
              search_query: localeValue === 'zh-CN' ? 'AI 评测 产品分析' : 'AI evaluation product analytics',
              filters: {
                type: 'jd',
                status: 'interview',
              },
              notify_matches: false,
              notification_frequency: 'weekly',
              last_notified_at: null,
              created_at: '2026-06-02T08:00:00.000Z',
              updated_at: '2026-06-06T11:00:00.000Z',
            },
          ])
        )
        window.localStorage.setItem(
          'synchire-local-notifications',
          JSON.stringify([
            {
              id: 'notification-interview',
              type: 'success',
              title: localeValue === 'zh-CN' ? '面试邀请' : 'Interview invite',
              message:
                localeValue === 'zh-CN'
                  ? '北极星实验室已进入面试阶段，请准备项目亮点。'
                  : 'Northstar Labs moved to interview. Prepare project highlights.',
              read: false,
              created_at: '2026-06-07T10:00:00.000Z',
              action_url: '/applications/detail?id=app-frontend',
            },
            {
              id: 'notification-weekly-digest',
              type: 'info',
              title: localeValue === 'zh-CN' ? '每周求职摘要' : 'Weekly job-search digest',
              message:
                localeValue === 'zh-CN'
                  ? '本周新增 3 个申请，平均匹配度 76%。'
                  : 'This week added 3 applications with a 76% average match score.',
              read: true,
              created_at: '2026-06-06T10:00:00.000Z',
              action_url: '/analytics',
            },
          ])
        )
        window.localStorage.setItem(
          'synchire-interviews',
          JSON.stringify([
            {
              id: 'interview-northstar-tech',
              title:
                localeValue === 'zh-CN'
                  ? '北极星实验室 - 技术面试'
                  : 'Northstar Labs - Technical Interview',
              description:
                localeValue === 'zh-CN'
                  ? '重点准备 React 架构、无障碍体验和 Playwright 项目证据。'
                  : 'Focus on React architecture, accessibility, and Playwright project evidence.',
              interview_type: 'technical',
              status: 'confirmed',
              scheduled_date: '2026-06-10T02:00:00.000Z',
              duration_minutes: 60,
              timezone: 'Asia/Shanghai',
              location_type: 'remote',
              location_url: 'https://meet.example.com/northstar',
              meeting_platform: localeValue === 'zh-CN' ? '视频会议' : 'Video call',
              meeting_id: 'northstar-tech',
              meeting_password: '',
              interviewers: [
                {
                  name: localeValue === 'zh-CN' ? 'Maya Chen' : 'Maya Chen',
                  role: localeValue === 'zh-CN' ? '前端负责人' : 'Frontend Lead',
                  email: 'maya@example.com',
                },
              ],
              preparation_notes:
                localeValue === 'zh-CN'
                  ? '准备角色卡摘要和本地优先工作流演示。'
                  : 'Prepare role-card summary and local-first workflow demo.',
              reminder_enabled: true,
              reminder_timings: [60, 1440],
              created_at: '2026-06-07T08:00:00.000Z',
              updated_at: '2026-06-07T09:00:00.000Z',
              job_title: localeValue === 'zh-CN' ? '应届前端工程师' : 'Graduate Frontend Engineer',
              company_name: localeValue === 'zh-CN' ? '北极星实验室' : 'Northstar Labs',
              resume_title: localeValue === 'zh-CN' ? '陈宇-前端工程师简历.txt' : 'chen-yu-frontend-resume.txt',
            },
            {
              id: 'interview-helio-screen',
              title:
                localeValue === 'zh-CN'
                  ? '启明职业 - 产品初筛'
                  : 'Helio Career - Product Screen',
              description:
                localeValue === 'zh-CN'
                  ? '沟通 AI 评测闭环和候选人痛点发现。'
                  : 'Discuss AI evaluation loops and candidate pain-point discovery.',
              interview_type: 'screening',
              status: 'completed',
              scheduled_date: '2026-06-06T03:30:00.000Z',
              duration_minutes: 45,
              timezone: 'Asia/Shanghai',
              location_type: 'phone',
              interviewers: [
                {
                  name: 'Alex Wu',
                  role: localeValue === 'zh-CN' ? '产品经理' : 'Product Manager',
                },
              ],
              preparation_notes:
                localeValue === 'zh-CN'
                  ? '复盘数据分析看板案例。'
                  : 'Review analytics dashboard examples.',
              feedback:
                localeValue === 'zh-CN'
                  ? '产品意识较强；后续补充看板案例。'
                  : 'Strong product sense; follow up with a dashboard case study.',
              rating: 4,
              next_steps: localeValue === 'zh-CN' ? '发送作品集链接。' : 'Send portfolio links.',
              reminder_enabled: false,
              reminder_timings: [],
              created_at: '2026-06-04T08:00:00.000Z',
              updated_at: '2026-06-06T05:00:00.000Z',
              job_title: localeValue === 'zh-CN' ? 'AI 产品运营助理' : 'AI Product Operations Associate',
              company_name: localeValue === 'zh-CN' ? '启明职业' : 'Helio Career',
              resume_title: localeValue === 'zh-CN' ? '陈宇-AI产品运营简历.txt' : 'chen-yu-ai-product-resume.txt',
            },
          ])
        )
        window.localStorage.setItem('synchire-readme-seeded', 'true')
      }
    },
    { storage: buildSeedStorage(locale), localeValue: locale }
  )
}

async function capture(page: Page, route: string, path: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.locator('body').waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByRole('navigation').first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path, fullPage: false })
}

async function prepareProfileAssistant(page: Page) {
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 })
  const fillDemoButton = page.getByTestId('fill-demo-form')
  await expect(fillDemoButton).toBeEnabled({ timeout: 15_000 })
  await fillDemoButton.click()
  await expect(page.getByText(/Agent instruction|Agent 执行指令/).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/Demo application form|演示申请表/).first()).toBeVisible({ timeout: 10_000 })
  const phoneField = page.locator('#review-phone')
  await expect(phoneField).toBeVisible({ timeout: 10_000 })
  await phoneField.fill('+86 139 1111 2222')
  await page.locator('#agentReport').fill(JSON.stringify({
    fields: [
      {
        fieldId: 'phone',
        inputName: 'phone',
        fieldLabel: 'Phone',
        value: '+86 139 1111 2222',
      },
    ],
  }))
  await page.getByRole('button', { name: /Apply browser report|应用浏览器回传/ }).click()
  await expect(page.getByText(/After user edit|用户修改后/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
}

async function prepareApplicationDetail(page: Page, path: string) {
  await page.goto('/applications/detail?id=app-frontend', { waitUntil: 'domcontentloaded' })
  await page.locator('main, body').first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.getByRole('tab', { name: /优化建议/ }).click()
  await page.getByRole('button', { name: /优化简历/ }).click()
  await expect(page.getByText(/岗位化简历|优化完成/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareResumeEditor(page: Page, path: string) {
  await page.goto('/applications/detail?id=app-frontend', { waitUntil: 'domcontentloaded' })
  await page.getByRole('tab', { name: /优化建议/ }).click()
  await page.getByRole('button', { name: /优化简历/ }).click()
  await expect(page.getByText(/岗位化简历|优化完成/).first()).toBeVisible({ timeout: 10_000 })
  const pdfResponse = await page.request.post('/api/generate-pdf', {
    data: {
      filename: 'readme-tailored-resume',
      html: '<main><h1>Chen Yu</h1><p>Graduate Frontend Engineer</p></main>',
    },
  })
  expect(pdfResponse.ok()).toBeTruthy()
  expect(pdfResponse.headers()['content-type']).toContain('application/pdf')
  await page.goto('/editor?applicationId=app-frontend', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/求职意向|Graduate Frontend Engineer/).first()).toBeVisible({ timeout: 15_000 })
  const previewButton = page.getByRole('button', { name: /Preview|预览/ })
  await expect(previewButton).toBeEnabled({ timeout: 10_000 })
  await previewButton.click()
  await expect(page.getByText(/岗位匹配亮点|项目经历|Graduate Frontend Engineer/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path, fullPage: false })
}

async function prepareInterviewPrep(page: Page, path: string) {
  await page.goto('/interview-prep?applicationId=app-frontend', { waitUntil: 'domcontentloaded' })
  const generateButton = page.getByRole('button', { name: /Generate Interview Prep|生成面试准备/ })
  await expect(generateButton).toBeEnabled({ timeout: 15_000 })
  await generateButton.click()
  await expect(page.getByText(/Self-Introduction Template|自我介绍模板/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareSearch(page: Page, route: string, query: string, path: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const searchInput = page.getByRole('combobox', { name: /Search|搜索/ })
  await expect(searchInput).toBeEditable({ timeout: 10_000 })
  await searchInput.fill(query)
  await expect(searchInput).toHaveValue(query, { timeout: 10_000 })
  await expect(page.getByText(/Found|找到|Northstar|北极星|chen-yu|陈宇|Graduate Frontend Engineer|应届前端工程师/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareGlobalSearch(page: Page, path: string) {
  await page.goto('/search', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)
  const searchInput = page.getByLabel(/Search query|搜索关键词/)
  await expect(searchInput).toBeEditable({ timeout: 10_000 })
  await searchInput.fill('React')
  await expect(searchInput).toHaveValue('React', { timeout: 10_000 })
  await expect(page.getByText(/Found|找到|chen-yu|陈宇|Graduate Frontend Engineer|应届前端工程师|Northstar|北极星/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function openSettings(page: Page) {
  await page.goto('/settings', { waitUntil: 'domcontentloaded' })
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /AI Runtime Settings|AI 运行时设置/ })).toBeVisible({
    timeout: 15_000,
  })
  await page.waitForTimeout(300)
}

async function prepareSettingsAI(page: Page, overviewPath: string, providerPath: string) {
  await openSettings(page)
  await expect(page.getByRole('heading', { name: /Provider and model routing|供应商与模型路由/ })).toBeVisible({
    timeout: 15_000,
  })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
  await page.screenshot({ path: overviewPath, fullPage: false })

  await page.getByTestId('openai-api-key').fill('sk-readme-local-demo-key')
  await page.getByRole('button', { name: /Save AI settings|保存 AI 设置/ }).first().click()
  await expect(page.getByText(/AI runtime settings saved locally|AI 运行时设置已保存在本地/)).toBeVisible({
    timeout: 10_000,
  })
  await page.getByTestId('openai-api-key').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: providerPath, fullPage: false })
}

async function prepareSettingsSkills(page: Page, path: string) {
  await openSettings(page)
  const isZh = await page.evaluate(() => document.documentElement.lang === 'zh-CN')
  await page.getByRole('tab', { name: /Skills|技能/ }).click()
  await expect(page.getByRole('heading', { name: /Skill switchboard|技能开关面板/ })).toBeVisible({
    timeout: 10_000,
  })
  await page.locator('#skill-filter').fill(isZh ? '简历' : 'resume')
  await expect(page.getByText(/JD Resume Tailor|Resume PDF Export|JD 简历定制|简历 PDF 导出/).first()).toBeVisible({
    timeout: 10_000,
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareSettingsMcp(page: Page, path: string) {
  await openSettings(page)
  const isZh = await page.evaluate(() => document.documentElement.lang === 'zh-CN')
  await page.getByRole('tab', { name: /^MCP$/ }).click()
  await expect(page.getByRole('heading', { name: /MCP switchboard|MCP 开关面板/ })).toBeVisible({
    timeout: 10_000,
  })
  await page.locator('#mcp-filter').fill(isZh ? '浏览器' : 'browser')
  await expect(page.getByText(/Review-Only WebBridge|审核式 WebBridge/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareSettingsDiscovery(page: Page, discoverPath: string, repositoriesPath: string) {
  await openSettings(page)
  const isZh = await page.evaluate(() => document.documentElement.lang === 'zh-CN')
  await page.getByRole('tab', { name: /Discover|发现/ }).click()
  await expect(page.getByRole('heading', { name: /Discovery and repository management|发现与仓库管理/ })).toBeVisible({
    timeout: 10_000,
  })
  await page.getByRole('button', { name: /Refresh metadata|刷新元数据/ }).first().click()
  await expect(page.getByText(/Catalog metadata refreshed locally|目录元数据已在本地刷新/)).toBeVisible({
    timeout: 10_000,
  })
  await page.locator('#catalog-search').fill(isZh ? '浏览器' : 'browser')
  await expect(page.getByText(/Review-Only WebBridge|审核式 WebBridge/).first()).toBeVisible({ timeout: 10_000 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: discoverPath, fullPage: false })

  await page.getByLabel(/Repository name|仓库名称/).fill(isZh ? '私有求职能力目录' : 'Private Job Search Catalog')
  await page.getByLabel(/Repository URL|仓库 URL/).fill('https://example.com/synchire/catalog.json')
  await page.getByLabel(/Description|描述/).fill(
    isZh ? '用于已审核求职技能与 MCP 的私有元数据目录。' : 'Private metadata catalog for reviewed job-search skills and MCPs.'
  )
  await page.getByRole('button', { name: /Add source|添加来源/ }).click()
  await expect(page.getByText(isZh ? '私有求职能力目录' : 'Private Job Search Catalog')).toBeVisible({ timeout: 10_000 })
  await page.getByText(isZh ? '私有求职能力目录' : 'Private Job Search Catalog').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: repositoriesPath, fullPage: false })
}

async function prepareSettingsNotifications(page: Page, path: string) {
  await openSettings(page)
  await page.getByRole('tab', { name: /Notifications|通知/ }).click()
  await expect(page.getByRole('heading', { name: /Notification Settings|通知设置/ })).toBeVisible({
    timeout: 10_000,
  })
  await page.getByRole('button', { name: /Test Interview Reminder|测试面试提醒/ }).click()
  await expect(page.getByText(/Test notification recorded locally|测试通知已在本地记录/)).toBeVisible({
    timeout: 10_000,
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

async function prepareSettingsHistory(page: Page, path: string) {
  await openSettings(page)
  await page.getByRole('tab', { name: /History|历史/ }).click()
  await expect(page.getByRole('heading', { name: /Notifications|通知历史/ })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText(/Interview invite|面试邀请|Weekly job-search digest|每周求职摘要/).first()).toBeVisible({
    timeout: 10_000,
  })
  await page.waitForTimeout(300)
  await page.screenshot({ path, fullPage: false })
}

test.describe('README screenshots', () => {
  test('capture English product workflow screenshots', async ({ page }) => {
    test.setTimeout(90_000)
    await seed(page, 'en-US')

    await capture(page, '/dashboard', '../docs/assets/readme/en-linux-dashboard.png')
    await capture(page, '/upload', '../docs/assets/readme/en-linux-resumes.png')
    await capture(page, '/jd-input', '../docs/assets/readme/en-linux-job-descriptions.png')
    await capture(page, '/applications', '../docs/assets/readme/en-linux-applications.png')
    await prepareApplicationDetail(page, '../docs/assets/readme/en-linux-application-detail.png')
    await prepareResumeEditor(page, '../docs/assets/readme/en-linux-tailored-resume-pdf.png')
    await prepareProfileAssistant(page)
    await page.screenshot({ path: '../docs/assets/readme/en-linux-profile.png', fullPage: false })
    await capture(page, '/applications/match?id=app-frontend', '../docs/assets/readme/en-linux-match-analysis.png')
    await prepareInterviewPrep(page, '../docs/assets/readme/en-linux-interview-prep.png')
    await capture(page, '/analytics', '../docs/assets/readme/en-linux-analytics.png')
    await capture(page, '/interviews', '../docs/assets/readme/en-linux-interviews.png')
    await capture(page, '/interviews/new?applicationId=app-frontend', '../docs/assets/readme/en-linux-interview-schedule.png')
    await prepareGlobalSearch(page, '../docs/assets/readme/en-linux-search.png')
    await prepareSearch(page, '/search/resumes', 'React', '../docs/assets/readme/en-linux-search-resumes.png')
    await prepareSearch(page, '/search/jds', 'React', '../docs/assets/readme/en-linux-search-jds.png')
    await prepareSearch(page, '/search/applications', 'Northstar', '../docs/assets/readme/en-linux-search-applications.png')
    await capture(page, '/saved-searches', '../docs/assets/readme/en-linux-saved-searches.png')
    await capture(page, '/data', '../docs/assets/readme/en-linux-data-management.png')
    await prepareSettingsAI(
      page,
      '../docs/assets/readme/en-linux-settings.png',
      '../docs/assets/readme/en-linux-settings-ai.png'
    )
    await prepareSettingsSkills(page, '../docs/assets/readme/en-linux-settings-skills.png')
    await prepareSettingsMcp(page, '../docs/assets/readme/en-linux-settings-mcp.png')
    await prepareSettingsDiscovery(
      page,
      '../docs/assets/readme/en-linux-settings-discover.png',
      '../docs/assets/readme/en-linux-settings-repositories.png'
    )
    await prepareSettingsNotifications(page, '../docs/assets/readme/en-linux-settings-notifications.png')
    await prepareSettingsHistory(page, '../docs/assets/readme/en-linux-settings-history.png')
  })

  test('capture Chinese product workflow screenshots', async ({ page }) => {
    test.setTimeout(90_000)
    await seed(page, 'zh-CN')

    await capture(page, '/dashboard', '../docs/assets/readme/zh-linux-dashboard.png')
    await capture(page, '/upload', '../docs/assets/readme/zh-linux-resumes.png')
    await capture(page, '/jd-input', '../docs/assets/readme/zh-linux-job-descriptions.png')
    await capture(page, '/applications', '../docs/assets/readme/zh-linux-applications.png')
    await prepareApplicationDetail(page, '../docs/assets/readme/zh-linux-application-detail.png')
    await prepareResumeEditor(page, '../docs/assets/readme/zh-linux-tailored-resume-pdf.png')
    await prepareProfileAssistant(page)
    await page.screenshot({ path: '../docs/assets/readme/zh-linux-profile.png', fullPage: false })
    await capture(page, '/applications/match?id=app-frontend', '../docs/assets/readme/zh-linux-match-analysis.png')
    await prepareInterviewPrep(page, '../docs/assets/readme/zh-linux-interview-prep.png')
    await capture(page, '/analytics', '../docs/assets/readme/zh-linux-analytics.png')
    await capture(page, '/interviews', '../docs/assets/readme/zh-linux-interviews.png')
    await capture(page, '/interviews/new?applicationId=app-frontend', '../docs/assets/readme/zh-linux-interview-schedule.png')
    await prepareGlobalSearch(page, '../docs/assets/readme/zh-linux-search.png')
    await prepareSearch(page, '/search/resumes', 'React', '../docs/assets/readme/zh-linux-search-resumes.png')
    await prepareSearch(page, '/search/jds', 'React', '../docs/assets/readme/zh-linux-search-jds.png')
    await prepareSearch(page, '/search/applications', '北极星', '../docs/assets/readme/zh-linux-search-applications.png')
    await capture(page, '/saved-searches', '../docs/assets/readme/zh-linux-saved-searches.png')
    await capture(page, '/data', '../docs/assets/readme/zh-linux-data-management.png')
    await prepareSettingsAI(
      page,
      '../docs/assets/readme/zh-linux-settings.png',
      '../docs/assets/readme/zh-linux-settings-ai.png'
    )
    await prepareSettingsSkills(page, '../docs/assets/readme/zh-linux-settings-skills.png')
    await prepareSettingsMcp(page, '../docs/assets/readme/zh-linux-settings-mcp.png')
    await prepareSettingsDiscovery(
      page,
      '../docs/assets/readme/zh-linux-settings-discover.png',
      '../docs/assets/readme/zh-linux-settings-repositories.png'
    )
    await prepareSettingsNotifications(page, '../docs/assets/readme/zh-linux-settings-notifications.png')
    await prepareSettingsHistory(page, '../docs/assets/readme/zh-linux-settings-history.png')
  })
})
