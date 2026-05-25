/**
 * Template Preview Generator
 * Generates preview images for resume templates using Puppeteer
 */

import { ResumeTemplate, resumeTemplates } from './resume-templates';

const sampleResume = {
  name: "李明",
  title: "高级软件工程师",
  contact: {
    email: "liming@example.com",
    phone: "+86 138-0000-0000",
    location: "北京市朝阳区"
  },
  summary: "8年全栈开发经验，专注于React生态系统和云原生架构。曾带领团队完成多个大型项目，具有丰富的技术管理和架构设计经验。",
  experience: [
    {
      company: "字节跳动",
      position: "高级前端工程师",
      period: "2020年3月 - 至今",
      description: [
        "负责抖音电商前端架构设计与开发",
        "使用Next.js和TypeScript重构核心模块，性能提升40%",
        "建立前端监控体系，线上故障率降低60%",
        "带领10人前端团队，制定技术规范"
      ]
    },
    {
      company: "腾讯",
      position: "前端开发工程师",
      period: "2017年7月 - 2020年2月",
      description: [
        "开发微信小程序平台核心功能",
        "优化首屏加载性能，FCP从1.8s降至0.9s",
        "实现组件库系统，提升开发效率30%"
      ]
    }
  ],
  education: [
    {
      school: "北京大学",
      degree: "计算机科学与技术 - 本科",
      period: "2013年9月 - 2017年6月",
      details: ["GPA: 3.7/4.0", "主修课程：数据结构、算法、操作系统"]
    }
  ],
  skills: [
    "JavaScript", "TypeScript", "React", "Vue.js", "Node.js",
    "Python", "Go", "Docker", "Kubernetes", "AWS"
  ],
  projects: [
    {
      name: "实时协作白板",
      tech: "Next.js, WebSocket, Canvas",
      description: "支持多人实时协作的在线白板系统"
    }
  ]
};

/**
 * Generate HTML for a template preview
 */
export function generateTemplatePreviewHTML(template: ResumeTemplate): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.name} - Template Preview</title>
  <link rel="stylesheet" href="${template.cssFile}">
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .preview-container {
      width: 800px;
      height: 600px;
      overflow: hidden;
      background: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="resume">
      <div class="resume-header">
        <div class="resume-name">${sampleResume.name}</div>
        <div class="resume-title">${sampleResume.title}</div>
        <div class="resume-contact">
          <div class="resume-contact-item">${sampleResume.contact.email}</div>
          <div class="resume-contact-item">${sampleResume.contact.phone}</div>
          <div class="resume-contact-item">${sampleResume.contact.location}</div>
        </div>
      </div>

      <div class="resume-section">
        <div class="resume-section-title">个人简介</div>
        <div class="resume-item-description">${sampleResume.summary}</div>
      </div>

      <div class="resume-section">
        <div class="resume-section-title">工作经历</div>
        ${sampleResume.experience.map(exp => `
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
            <div class="resume-skill-category-title">前端开发</div>
            <div class="resume-skill-list">
              ${sampleResume.skills.slice(0, 5).map(skill =>
                `<div class="resume-skill-item">${skill}</div>`
              ).join('')}
            </div>
          </div>
          <div class="resume-skill-category">
            <div class="resume-skill-category-title">后端开发</div>
            <div class="resume-skill-list">
              ${sampleResume.skills.slice(5, 8).map(skill =>
                `<div class="resume-skill-item">${skill}</div>`
              ).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate all template previews
 * This would be used with Puppeteer in a Node.js environment
 */
export async function generateAllTemplatePreviews(): Promise<void> {
  // In a real implementation, this would use Puppeteer to:
  // 1. Load each template's HTML
  // 2. Render it in a headless browser
  // 3. Take a screenshot
  // 4. Save it to the previews directory

  console.log('Template preview generation requires Node.js environment with Puppeteer');
  console.log('Templates to generate:', resumeTemplates.map(t => t.id).join(', '));

  // For now, we'll create placeholder instructions
  const instructions = `
# Template Preview Generation Instructions

## Prerequisites
- Node.js 18+
- Puppeteer: npm install puppeteer

## Usage
1. Run the preview generation script:
   \`\`\`bash
   node scripts/generate-template-previews.js
   \`\`\`

2. The script will:
   - Load each template CSS file
   - Generate HTML with sample content
   - Render in headless Chrome
   - Save screenshots to /public/templates/previews/

## Manual Preview Generation
If automatic generation fails, you can manually create previews:

1. Open the resume editor
2. Select a template
3. Add sample resume content
4. Take a screenshot of the preview area (800x600)
5. Save as PNG in /public/templates/previews/

## Current Templates
${resumeTemplates.map(t => `- ${t.id}: ${t.name} (${t.nameEn})`).join('\n')}
`;

  console.log(instructions);
}

/**
 * Get template preview URL
 */
export function getTemplatePreviewUrl(templateId: string): string {
  const template = resumeTemplates.find(t => t.id === templateId);
  return template?.previewImage || '/templates/previews/placeholder.png';
}

/**
 * Check if preview image exists
 */
export function previewExists(templateId: string): boolean {
  // This would check if the preview file exists
  // For now, return false to indicate previews need to be generated
  return false;
}