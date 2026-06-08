# Resume Template Previews

This directory contains resume template preview assets.

## Active Preview Assets

- `minimal.svg` - Minimal template preview
- `professional.svg` - Professional template preview
- `creative.svg` - Creative template preview
- `executive.svg` - Executive template preview
- `technical.svg` - Technical template preview
- `modern.svg` - Modern template preview

The frontend template registry references the SVG files directly.

## Future Raster Preview Specifications

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

### Automated Generation
```bash
npm run generate:template-previews
```

## Current Status

The template system currently uses lightweight SVG previews. Generate raster PNGs only when the frontend registry is changed to reference them.

## Template Color Schemes (for placeholders)

- **Minimal**: Primary #1a1a1a, Accent #2563eb
- **Professional**: Primary #1e3a5f, Accent #3b82f6
- **Creative**: Primary #7c3aed, Accent #f59e0b
- **Executive**: Primary #1f2937, Accent #dc2626
- **Technical**: Primary #0f172a, Accent #0891b2
- **Modern**: Primary #4f46e5, Accent #ec4899
