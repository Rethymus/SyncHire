/**
 * Resume Template Guide
 * Provides comprehensive documentation for using resume templates
 */

import { resumeTemplates, type ResumeTemplate } from "./resume-templates";

export interface TemplateGuideSection {
  id: string;
  title: string;
  titleEn: string;
  content: string[];
  tips: string[];
}

export const templateGuide: TemplateGuideSection[] = [
  {
    id: "getting-started",
    title: "快速开始",
    titleEn: "Getting Started",
    content: [
      "简历模板系统提供6种专业设计，涵盖简约、商务、创意、高管、技术和现代风格",
      "每个模板都经过精心设计，确保专业性和可读性",
      "支持实时预览，在应用模板前即可看到效果",
      "提供自定义选项，可根据个人喜好调整颜色和布局"
    ],
    tips: [
      "初次使用建议从简约或商务模板开始",
      "不同行业适合不同风格，创意行业可尝试创意模板",
      "关注ATS友好性标记，确保通过 applicant tracking systems"
    ]
  },
  {
    id: "template-selection",
    title: "模板选择指南",
    titleEn: "Template Selection Guide",
    content: [
      "简约风格：适合大多数行业，注重内容，布局清晰",
      "商务风格：适合金融、法律、咨询等传统行业，专业正式",
      "创意风格：适合设计、创意、市场营销等行业，突出个性",
      "高管风格：适合高管和资深专业人士，成熟稳重",
      "技术风格：适合软件工程师、数据科学家等技术岗位",
      "现代风格：适合互联网、新媒体、教育等行业，时尚现代"
    ],
    tips: [
      "根据目标行业选择合适的模板风格",
      "查看模板的ATS友好性，这对通过初步筛选很重要",
      "考虑模板的布局方式，单栏适合内容较少，双栏适合内容较多",
      "技术岗位推荐使用技术风格模板，突出技能和项目经验"
    ]
  },
  {
    id: "customization",
    title: "自定义选项",
    titleEn: "Customization Options",
    content: [
      "颜色方案：可选择预设颜色或自定义主色调和强调色",
      "布局选项：控制照片、联系方式、技能列表的显示",
      "间距调整：紧凑布局适合内容较多的简历",
      "字体设置：部分模板支持自定义字体"
    ],
    tips: [
      "颜色选择应保守专业，避免过于鲜艳的颜色",
      "紧凑布局可节省空间，但可能影响可读性",
      "显示照片时请使用专业的职业照",
      "确保自定义后的模板仍然保持专业性"
    ]
  },
  {
    id: "best-practices",
    title: "最佳实践",
    titleEn: "Best Practices",
    content: [
      "保持一致性：在整个求职过程中使用相同的模板",
      "内容为王：模板只是框架，内容质量最重要",
      "测试打印：应用模板后务必测试打印效果",
      "保存版本：为不同职位创建不同的模板版本",
      "定期更新：随着经验积累，定期更新模板和内容"
    ],
    tips: [
      "为不同类型的职位准备不同的模板版本",
      "在申请前请朋友或同事帮忙检查模板效果",
      "确保模板在PDF格式下也能正确显示",
      "备份自定义模板，避免意外丢失"
    ]
  },
  {
    id: "ats-optimization",
    title: "ATS优化建议",
    titleEn: "ATS Optimization Tips",
    content: [
      "使用ATS友好的模板可提高通过率",
      "避免过度使用图形和复杂布局",
      "使用标准字体和简洁的排版",
      "确保关键信息使用清晰的标题",
      "测试模板的文本提取效果"
    ],
    tips: [
      "申请大公司时优先选择ATS友好模板",
      "避免使用图片和图表展示重要信息",
      "使用常见的section标题如工作经历、教育背景等",
      "确保联系方式以纯文本形式呈现"
    ]
  }
];

export function getTemplateGuideSection(id: string): TemplateGuideSection | undefined {
  return templateGuide.find(section => section.id === id);
}

export function getTemplateRecommendation(industry: string, experienceLevel: string): ResumeTemplate[] {
  const recommendations: ResumeTemplate[] = [];

  // Industry-based recommendations
  switch (industry.toLowerCase()) {
    case "finance":
    case "legal":
    case "consulting":
      recommendations.push(resumeTemplates.find(t => t.id === "professional")!);
      recommendations.push(resumeTemplates.find(t => t.id === "executive")!);
      break;
    case "design":
    case "creative":
    case "marketing":
      recommendations.push(resumeTemplates.find(t => t.id === "creative")!);
      recommendations.push(resumeTemplates.find(t => t.id === "modern")!);
      break;
    case "technology":
    case "software":
    case "data":
      recommendations.push(resumeTemplates.find(t => t.id === "technical")!);
      recommendations.push(resumeTemplates.find(t => t.id === "minimal")!);
      break;
    default:
      recommendations.push(resumeTemplates.find(t => t.id === "minimal")!);
      recommendations.push(resumeTemplates.find(t => t.id === "professional")!);
  }

  // Experience level adjustments
  if (experienceLevel.toLowerCase() === "senior" || experienceLevel.toLowerCase() === "executive") {
    const executive = resumeTemplates.find(t => t.id === "executive");
    if (executive && !recommendations.includes(executive)) {
      recommendations.push(executive);
    }
  }

  return recommendations.filter(Boolean);
}

export function getTemplateCompatibility(templateId: string): {
  atsScore: number;
  readabilityScore: number;
  modernityScore: number;
  recommendedUse: string[];
} {
  const template = resumeTemplates.find(t => t.id === templateId);
  if (!template) {
    return {
      atsScore: 0,
      readabilityScore: 0,
      modernityScore: 0,
      recommendedUse: []
    };
  }

  const atsScore = template.atsFriendly ? 90 : 60;
  const readabilityScore = template.difficulty === "beginner" ? 95 : 85;
  const modernityScore = template.category === "creative" ? 90 : 75;

  let recommendedUse: string[] = [];
  switch (template.category) {
    case "minimal":
      recommendedUse = ["大多数行业", "应届毕业生", "转行人士"];
      break;
    case "professional":
      recommendedUse = ["金融", "法律", "咨询", "传统行业"];
      break;
    case "creative":
      recommendedUse = ["设计", "创意", "市场营销", "广告", "互联网", "新媒体", "教育", "科技创业"];
      break;
    case "executive":
      recommendedUse = ["高管职位", "资深管理", "创业者"];
      break;
    case "technical":
      recommendedUse = ["软件工程", "数据科学", "IT", "研发"];
      break;
  }

  return {
    atsScore,
    readabilityScore,
    modernityScore,
    recommendedUse
  };
}

export function getTemplateComparison(templateIds: string[]): {
  template: ResumeTemplate;
  strengths: string[];
  weaknesses: string[];
}[] {
  return templateIds.map(id => {
    const template = resumeTemplates.find(t => t.id === id);
    if (!template) return null as any;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (template.atsFriendly) {
      strengths.push("ATS友好，通过率高");
    } else {
      weaknesses.push("可能不被ATS系统识别");
    }

    if (template.difficulty === "beginner") {
      strengths.push("易于填写和使用");
    } else if (template.difficulty === "advanced") {
      weaknesses.push("需要较多内容支持");
    }

    if (template.category === "minimal" || template.category === "professional") {
      strengths.push("适合大多数行业");
    } else if (template.category === "creative" || template.category === "executive" || template.category === "technical") {
      strengths.push("视觉吸引力强");
      weaknesses.push("可能不适合传统行业");
    }

    return { template, strengths, weaknesses };
  }).filter(Boolean);
}