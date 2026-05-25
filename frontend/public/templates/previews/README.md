# Resume Template Preview Images

This directory contains preview images for resume templates.

## Required Preview Images

- `minimal.png` - Preview of minimal template
- `professional.png` - Preview of professional template
- `creative.png` - Preview of creative template
- `executive.png` - Preview of executive template
- `technical.png` - Preview of technical template
- `modern.png` - Preview of modern template

## Image Specifications

- **Dimensions**: 800x600 pixels (4:3 aspect ratio)
- **Format**: PNG with transparent background
- **Resolution**: 72 DPI (web optimized)
- **File Size**: Under 200KB per image

## Preview Image Guidelines

1. **Show complete template header**: Include name, title, and contact info section
2. **Demonstrate key features**: Highlight unique design elements
3. **Use realistic content**: Show actual resume sections, not lorem ipsum
4. **Maintain aspect ratio**: Ensure the preview represents the actual template proportions
5. **Professional appearance**: Clean, sharp images with no artifacts

## Creating Preview Images

### Option 1: Screenshot Method
1. Create a sample resume using the template
2. Take a screenshot of the top portion (header + first section)
3. Crop to 800x600 pixels
4. Save as PNG

### Option 2: Design Tool Method
1. Use Figma/Sketch/Photoshop to recreate template design
2. Export high-quality PNG at specified dimensions
3. Ensure accurate representation of colors and fonts

### Option 3: Automated Generation
```bash
# Use puppeteer or similar tool to generate previews
npm run generate:template-previews
```

## Current Status

⚠️ **Preview images not yet generated**

The template system currently uses colored placeholders. To create actual preview images:

1. Navigate to `/editor` in the application
2. Apply each template to a sample resume
3. Take screenshots of the preview area
4. Crop and save to this directory

## Template Color Schemes (for placeholders)

- **Minimal**: Primary #1a1a1a, Accent #2563eb
- **Professional**: Primary #1e3a5f, Accent #3b82f6
- **Creative**: Primary #7c3aed, Accent #f59e0b
- **Executive**: Primary #1f2937, Accent #dc2626
- **Technical**: Primary #0f172a, Accent #0891b2
- **Modern**: Primary #4f46e5, Accent #ec4899