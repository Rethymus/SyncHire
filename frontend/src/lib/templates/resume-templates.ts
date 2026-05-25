/**
 * Resume Template System
 * Provides professional resume templates with customization options
 */

export interface ResumeTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: 'minimal' | 'professional' | 'creative' | 'executive' | 'technical';
  cssFile: string;
  previewImage: string;
  features: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: 'single-column' | 'two-column' | 'sidebar' | 'modern';
  atsFriendly: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const resumeTemplates: ResumeTemplate[] = [
  {
    id: 'minimal',
    name: '简约风格',
    nameEn: 'Minimal Clean',
    description: '简洁大方，适合大多数行业，注重内容而非装饰',
    descriptionEn: 'Clean and minimalist, suitable for most industries, content-focused',
    category: 'minimal',
    cssFile: '/templates/minimal.css',
    previewImage: '/templates/previews/minimal.svg',
    features: [
      'ATS友好',
      '单栏布局',
      '简洁专业',
      '易于阅读'
    ],
    colors: {
      primary: '#1a1a1a',
      secondary: '#666666',
      accent: '#2563eb',
      background: '#ffffff',
      text: '#1a1a1a'
    },
    fonts: {
      heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif',
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif'
    },
    layout: 'single-column',
    atsFriendly: true,
    difficulty: 'beginner'
  },
  {
    id: 'professional',
    name: '商务风格',
    nameEn: 'Professional Executive',
    description: '专业正式，适合金融、法律、咨询等传统行业',
    descriptionEn: 'Professional and formal, ideal for finance, law, consulting',
    category: 'professional',
    cssFile: '/templates/professional.css',
    previewImage: '/templates/previews/professional.svg',
    features: [
      '专业正式',
      '经典设计',
      '头部强调',
      '结构清晰'
    ],
    colors: {
      primary: '#1e3a5f',
      secondary: '#374151',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#111827'
    },
    fonts: {
      heading: '"Times New Roman", "Noto Serif SC", serif',
      body: '"Times New Roman", "Noto Serif SC", serif'
    },
    layout: 'single-column',
    atsFriendly: true,
    difficulty: 'beginner'
  },
  {
    id: 'creative',
    name: '创意风格',
    nameEn: 'Creative Modern',
    description: '个性鲜明，适合设计、创意、市场营销等行业',
    descriptionEn: 'Unique and creative, perfect for design, creative, marketing',
    category: 'creative',
    cssFile: '/templates/creative.css',
    previewImage: '/templates/previews/creative.svg',
    features: [
      '现代设计',
      '侧边栏布局',
      '渐变色彩',
      '突出个性'
    ],
    colors: {
      primary: '#7c3aed',
      secondary: '#4b5563',
      accent: '#f59e0b',
      background: '#ffffff',
      text: '#1f2937'
    },
    fonts: {
      heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif',
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif'
    },
    layout: 'sidebar',
    atsFriendly: false,
    difficulty: 'intermediate'
  },
  {
    id: 'executive',
    name: '高管风格',
    nameEn: 'Executive Leader',
    description: '成熟稳重，适合高管、资深专业人士',
    descriptionEn: 'Mature and sophisticated, for executives and senior professionals',
    category: 'executive',
    cssFile: '/templates/executive.css',
    previewImage: '/templates/previews/executive.svg',
    features: [
      '高端大气',
      '经典配色',
      '强调成就',
      '领导力展示'
    ],
    colors: {
      primary: '#1f2937',
      secondary: '#6b7280',
      accent: '#dc2626',
      background: '#ffffff',
      text: '#111827'
    },
    fonts: {
      heading: '"Georgia", "Noto Serif SC", serif',
      body: '"Georgia", "Noto Serif SC", serif'
    },
    layout: 'single-column',
    atsFriendly: true,
    difficulty: 'advanced'
  },
  {
    id: 'technical',
    name: '技术风格',
    nameEn: 'Technical Professional',
    description: '简洁清晰，适合软件工程师、数据科学家等技术岗位',
    descriptionEn: 'Clean and structured, ideal for software engineers, data scientists',
    category: 'technical',
    cssFile: '/templates/technical.css',
    previewImage: '/templates/previews/technical.svg',
    features: [
      '技术导向',
      '技能突出',
      '项目展示',
      '简洁布局'
    ],
    colors: {
      primary: '#0f172a',
      secondary: '#475569',
      accent: '#0891b2',
      background: '#ffffff',
      text: '#0f172a'
    },
    fonts: {
      heading: '"Courier New", "Noto Sans SC", monospace',
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif'
    },
    layout: 'two-column',
    atsFriendly: true,
    difficulty: 'intermediate'
  },
  {
    id: 'modern',
    name: '现代风格',
    nameEn: 'Modern Contemporary',
    description: '时尚现代，适合互联网、新媒体、教育等行业',
    descriptionEn: 'Modern and stylish, suitable for internet, media, education',
    category: 'creative',
    cssFile: '/templates/modern.css',
    previewImage: '/templates/previews/modern.svg',
    features: [
      '现代感强',
      '色彩丰富',
      '布局灵活',
      '视觉冲击'
    ],
    colors: {
      primary: '#4f46e5',
      secondary: '#7c3aed',
      accent: '#ec4899',
      background: '#ffffff',
      text: '#1f2937'
    },
    fonts: {
      heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif',
      body: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif'
    },
    layout: 'modern',
    atsFriendly: false,
    difficulty: 'intermediate'
  }
];

export const getTemplateById = (id: string): ResumeTemplate | undefined => {
  return resumeTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: ResumeTemplate['category']): ResumeTemplate[] => {
  return resumeTemplates.filter(template => template.category === category);
};

export const getATSFriendlyTemplates = (): ResumeTemplate[] => {
  return resumeTemplates.filter(template => template.atsFriendly);
};

export const getTemplatesByDifficulty = (difficulty: ResumeTemplate['difficulty']): ResumeTemplate[] => {
  return resumeTemplates.filter(template => template.difficulty === difficulty);
};

export const searchTemplates = (query: string): ResumeTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return resumeTemplates.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.nameEn.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.descriptionEn.toLowerCase().includes(lowerQuery) ||
    template.features.some(feature => feature.toLowerCase().includes(lowerQuery))
  );
};

export interface TemplateCustomization {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  spacing?: {
    compact: boolean;
  };
  layout?: {
    showPhoto: boolean;
    showContact: boolean;
    showSkills: boolean;
  };
}

export const createCustomizedTemplate = (
  template: ResumeTemplate,
  customization: TemplateCustomization
): ResumeTemplate => {
  return {
    ...template,
    id: `${template.id}-custom-${Date.now()}`,
    name: `${template.name} (自定义)`,
    nameEn: `${template.nameEn} (Custom)`,
    colors: {
      ...template.colors,
      ...customization.colors
    },
    fonts: {
      ...template.fonts,
      ...customization.fonts
    }
  };
};