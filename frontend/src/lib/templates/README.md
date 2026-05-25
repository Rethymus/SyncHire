# Resume Template System Documentation

## Overview

The SyncHire Resume Template System provides a comprehensive, professional template management solution for job seekers. It offers 6 carefully designed templates covering various industries and experience levels, with extensive customization options and template reuse functionality.

## Features

### 🎨 Professional Template Collection

- **6 Template Designs**: Minimal, Professional, Creative, Executive, Technical, and Modern styles
- **Industry-Specific**: Templates optimized for different industries and experience levels
- **ATS-Friendly**: Most templates are optimized for Applicant Tracking Systems
- **Responsive**: Templates work well in both digital and print formats

### 🔧 Customization Options

- **Color Schemes**: Predefined color palettes and custom color selection
- **Layout Controls**: Toggle photo, contact info, and skills sections
- **Spacing Options**: Compact vs. spacious layouts
- **Font Selection**: Template-specific font choices

### 💾 Save & Reuse

- **Template Storage**: Save custom templates to local storage
- **Import/Export**: Share templates between devices or with others
- **Version Management**: Clone and modify existing templates
- **Default Templates**: Pre-installed templates for quick start

### 🎯 Smart Features

- **Template Recommendations**: Industry-based template suggestions
- **Compatibility Scores**: ATS, readability, and modernity ratings
- **Usage Analytics**: Track template popularity and effectiveness
- **Best Practices Guide**: Built-in tips and recommendations

## Architecture

```
src/lib/templates/
├── resume-templates.ts       # Template definitions and metadata
├── template-manager.ts       # Save/load/export/import functionality
├── template-guide.ts         # Recommendations and best practices
└── README.md                # This file

src/components/
├── template-gallery.tsx      # Template selection interface
├── saved-templates-manager.tsx  # Template management interface
├── resume-preview.tsx        # Updated with template system
└── resume-editor.tsx         # Updated with template integration

public/templates/
├── minimal.css               # Minimal template styles
├── professional.css          # Professional template styles
├── creative.css              # Creative template styles
├── executive.css             # Executive template styles
├── technical.css             # Technical template styles
├── modern.css                # Modern template styles
└── previews/                 # Template preview images
    └── README.md            # Preview image guidelines
```

## Usage Guide

### Basic Template Selection

```typescript
import { resumeTemplates, getTemplateById } from '@/lib/templates/resume-templates';

// Get all templates
const templates = resumeTemplates;

// Get specific template
const minimalTemplate = getTemplateById('minimal');

// Filter by category
const professionalTemplates = getTemplatesByCategory('professional');

// Search templates
const results = searchTemplates('简约');
```

### Template Customization

```typescript
import { createCustomizedTemplate, type TemplateCustomization } from '@/lib/templates/resume-templates';

const customization: TemplateCustomization = {
  colors: {
    primary: '#3b82f6',
    accent: '#ec4899'
  },
  layout: {
    showPhoto: true,
    showContact: true,
    showSkills: true
  },
  spacing: {
    compact: false
  }
};

const customTemplate = createCustomizedTemplate(baseTemplate, customization);
```

### Save and Load Templates

```typescript
import {
  saveTemplate,
  getSavedTemplates,
  deleteTemplate,
  exportTemplates,
  importTemplates
} from '@/lib/templates/template-manager';

// Save a custom template
const saved = saveTemplate('My Custom Template', 'minimal', customization);

// Get all saved templates
const templates = getSavedTemplates();

// Delete a template
deleteTemplate(saved.id);

// Export all templates
exportTemplates();

// Import templates
await importTemplates(file);
```

### Template Recommendations

```typescript
import {
  getTemplateRecommendation,
  getTemplateCompatibility,
  getTemplateComparison
} from '@/lib/templates/template-guide';

// Get industry-specific recommendations
const recommendations = getTemplateRecommendation('technology', 'senior');

// Get compatibility scores
const compatibility = getTemplateCompatibility('minimal');
console.log(compatibility.atsScore); // 90

// Compare multiple templates
const comparison = getTemplateComparison(['minimal', 'professional']);
```

## Component Integration

### Template Gallery Component

```tsx
import { TemplateGallery } from '@/components/template-gallery';

function MyComponent() {
  const handleSelectTemplate = (templateId: string) => {
    console.log('Selected template:', templateId);
  };

  return (
    <TemplateGallery
      onSelectTemplate={handleSelectTemplate}
      onClose={() => {}}
    />
  );
}
```

### Saved Templates Manager

```tsx
import { SavedTemplatesManager } from '@/components/saved-templates-manager';

function MyComponent() {
  const handleLoadTemplate = (templateId: string) => {
    console.log('Load template:', templateId);
  };

  return (
    <SavedTemplatesManager
      onLoadTemplate={handleLoadTemplate}
      onClose={() => {}}
    />
  );
}
```

## Template Customization System

### Color Schemes

Each template includes predefined color schemes:

- **Primary Color**: Main text and headers
- **Secondary Color**: Subtitles and metadata
- **Accent Color**: Highlights and interactive elements
- **Background**: Page background color
- **Text**: Body text color

### Layout Options

Templates support various layout options:

- **Single Column**: Traditional vertical layout
- **Two Column**: Side-by-side content
- **Sidebar**: Fixed sidebar with main content
- **Modern**: Asymmetric, grid-based layouts

### Difficulty Levels

- **Beginner**: Simple structure, easy to fill out
- **Intermediate**: Moderate customization options
- **Advanced**: Complex layouts requiring more content

## Best Practices

### For Users

1. **Match Industry**: Choose templates appropriate for your target industry
2. **ATS Priority**: Use ATS-friendly templates for corporate positions
3. **Content First**: Focus on content quality, template is secondary
4. **Test Print**: Always test print quality before submitting
5. **Backup**: Export custom templates regularly

### For Developers

1. **Type Safety**: Use TypeScript types for all template operations
2. **Performance**: Memoize template rendering to prevent re-renders
3. **Accessibility**: Ensure templates meet WCAG 2.1 AA standards
4. **Validation**: Validate customizations before applying
5. **Error Handling**: Handle template loading failures gracefully

## Template Development

### Creating New Templates

1. **CSS File**: Create new CSS file in `/public/templates/`
2. **Template Definition**: Add to `resumeTemplates` array
3. **Preview Image**: Add preview to `/public/templates/previews/`
4. **Testing**: Test with various content lengths and languages
5. **Documentation**: Update template features and descriptions

### Template CSS Guidelines

```css
/* Use CSS custom properties for theming */
:root {
  --primary-color: #1a1a1a;
  --secondary-color: #666666;
  --accent-color: #2563eb;
  --bg-color: #ffffff;
  --text-color: #1a1a1a;
}

/* Responsive typography */
.resume {
  font-size: 11pt;
  line-height: 1.6;
}

/* Print optimization */
@media print {
  .resume {
    width: 100%;
    max-width: none;
  }
}
```

## API Reference

### ResumeTemplate Interface

```typescript
interface ResumeTemplate {
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
```

### TemplateCustomization Interface

```typescript
interface TemplateCustomization {
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
```

## Troubleshooting

### Common Issues

**Template not loading:**
- Check CSS file exists in `/public/templates/`
- Verify template ID matches filename
- Check browser console for errors

**Custom colors not applying:**
- Ensure color values are valid hex codes
- Check CSS custom properties are properly defined
- Verify template supports color customization

**Layout issues on print:**
- Test print preview before final output
- Check `@media print` CSS rules
- Verify page breaks don't cut content

### Performance Optimization

- Lazy load template CSS files
- Memoize template rendering
- Cache template customizations
- Optimize preview image sizes

## Future Enhancements

- [ ] AI-powered template recommendations
- [ ] Collaborative template editing
- [ ] Template usage analytics
- [ ] Industry-specific template packs
- [ ] Multi-language template support
- [ ] Advanced font customization
- [ ] Template marketplace
- [ ] Real-time template preview
- [ ] Bulk template operations
- [ ] Template versioning

## Contributing

When adding new templates or features:

1. Follow existing code style and patterns
2. Add TypeScript types for all new interfaces
3. Include comprehensive error handling
4. Test across different browsers and devices
5. Update documentation and examples
6. Ensure accessibility compliance

## License

This template system is part of the SyncHire project and follows the same license terms.

## Support

For issues, questions, or contributions related to the template system, please refer to the main project documentation or contact the development team.