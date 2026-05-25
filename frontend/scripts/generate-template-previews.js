/**
 * Template Preview Generator Script
 * Generates PNG preview images for all resume templates
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const templates = [
  { id: 'minimal', name: '简约风格', cssFile: 'minimal.css' },
  { id: 'professional', name: '商务风格', cssFile: 'professional.css' },
  { id: 'creative', name: '创意风格', cssFile: 'creative.css' },
  { id: 'executive', name: '高管风格', cssFile: 'executive.css' },
  { id: 'technical', name: '技术风格', cssFile: 'technical.css' },
  { id: 'modern', name: '现代风格', cssFile: 'modern.css' }
];

const sampleResume = {
  name: "李明",
  title: "高级软件工程师",
  email: "liming@example.com",
  phone: "+86 138-0000-0000",
  location: "北京市朝阳区",
  summary: "8年全栈开发经验，专注于React生态系统和云原生架构。曾带领团队完成多个大型项目，具有丰富的技术管理和架构设计经验。",
  experience: [
    {
      company: "字节跳动",
      position: "高级前端工程师",
      period: "2020年3月 - 至今",
      description: [
        "负责抖音电商前端架构设计与开发",
        "使用Next.js和TypeScript重构核心模块，性能提升40%",
        "建立前端监控体系，线上故障率降低60%"
      ]
    },
    {
      company: "腾讯",
      position: "前端开发工程师",
      period: "2017年7月 - 2020年2月",
      description: [
        "开发微信小程序平台核心功能",
        "优化首屏加载性能，FCP从1.8s降至0.9s"
      ]
    }
  ],
  skills: ["JavaScript", "TypeScript", "React", "Vue.js", "Node.js", "Python", "Go"]
};

function generateTemplateHTML(template, resume) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name}</title>
  <link rel="stylesheet" href="/templates/${template.cssFile}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .preview-container {
      width: 800px;
      height: 600px;
      overflow: hidden;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      position: relative;
    }
    /* Ensure template CSS loads properly */
    @import url('/templates/${template.cssFile}');
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="resume">
      <div class="resume-header">
        <div class="resume-name">${resume.name}</div>
        <div class="resume-title">${resume.title}</div>
        <div class="resume-contact">
          <div class="resume-contact-item">${resume.email}</div>
          <div class="resume-contact-item">${resume.phone}</div>
          <div class="resume-contact-item">${resume.location}</div>
        </div>
      </div>

      <div class="resume-section">
        <div class="resume-section-title">个人简介</div>
        <div class="resume-item-description">${resume.summary}</div>
      </div>

      <div class="resume-section">
        <div class="resume-section-title">工作经历</div>
        ${resume.experience.map(exp => `
          <div class="resume-item">
            <div class="resume-item-header">
              <div class="resume-item-title">${exp.position}</div>
              <div class="resume-item-company">${exp.company}</div>
              <div class="resume-item-date">${exp.period}</div>
            </div>
            <div class="resume-item-description">
              <ul>
                ${exp.description.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="resume-section">
        <div class="resume-section-title">专业技能</div>
        <div class="resume-skills-grid">
          <div class="resume-skill-category">
            <div class="resume-skill-category-title">技术栈</div>
            <div class="resume-skill-list">
              ${resume.skills.map(skill => `<div class="resume-skill-item">${skill}</div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

async function generatePreviews() {
  console.log('🚀 Starting template preview generation...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const previewsDir = path.join(__dirname, '../public/templates/previews');

  // Ensure previews directory exists
  if (!fs.existsSync(previewsDir)) {
    fs.mkdirSync(previewsDir, { recursive: true });
  }

  for (const template of templates) {
    console.log(`📄 Generating preview for ${template.name}...`);

    try {
      const page = await browser.newPage();
      const html = generateTemplateHTML(template, sampleResume);

      // Set viewport and content
      await page.setViewport({ width: 800, height: 600 });
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Wait for CSS to load
      await page.waitForTimeout(1000);

      // Take screenshot
      const screenshotPath = path.join(previewsDir, `${template.id}.png`);
      await page.screenshot({
        path: screenshotPath,
        type: 'png',
        clip: { x: 0, y: 0, width: 800, height: 600 }
      });

      console.log(`✅ Generated ${template.id}.png`);
      await page.close();

    } catch (error) {
      console.error(`❌ Error generating ${template.id}:`, error.message);
    }
  }

  await browser.close();
  console.log('🎉 Preview generation complete!');
}

// Run if called directly
if (require.main === module) {
  generatePreviews().catch(console.error);
}

module.exports = { generatePreviews, generateTemplateHTML };