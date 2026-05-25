#!/bin/bash

# Generate SVG placeholder previews for resume templates
# This creates simple SVG placeholders with template-specific colors and styling

PREVIEW_DIR="$(dirname "$0")"
TEMPLATES=(
  "minimal:#1a1a1a:#2563eb:简约风格"
  "professional:#1e3a5f:#3b82f6:商务风格"
  "creative:#7c3aed:#f59e0b:创意风格"
  "executive:#1f2937:#dc2626:高管风格"
  "technical:#0f172a:#0891b2:技术风格"
  "modern:#4f46e5:#ec4899:现代风格"
)

echo "🎨 Generating template preview placeholders..."

for template in "${TEMPLATES[@]}"; do
  IFS=':' read -r id primary accent name <<< "$template"

  cat > "$PREVIEW_DIR/$id.png" << EOF
<iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==>
EOF

  # Create SVG preview
  cat > "$PREVIEW_DIR/$id.svg" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-$id" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:$primary;stop-opacity:1" />
      <stop offset="100%" style="stop-color:$accent;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="800" height="600" fill="#ffffff"/>

  <!-- Header section -->
  <rect x="0" y="0" width="800" height="120" fill="url(#grad-$id)" opacity="0.1"/>

  <!-- Template name -->
  <text x="400" y="50" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="$primary" text-anchor="middle">$name</text>
  <text x="400" y="90" font-family="Arial, sans-serif" font-size="18" fill="$accent" text-anchor="middle">$id Template</text>

  <!-- Content placeholder boxes -->
  <rect x="50" y="140" width="700" height="40" rx="5" fill="$primary" opacity="0.1"/>
  <rect x="50" y="190" width="500" height="20" rx="3" fill="$primary" opacity="0.05"/>
  <rect x="50" y="220" width="600" height="20" rx="3" fill="$primary" opacity="0.05"/>

  <!-- Section headers -->
  <rect x="50" y="260" width="200" height="30" rx="5" fill="$accent" opacity="0.2"/>
  <rect x="50" y="300" width="700" height="60" rx="5" fill="$primary" opacity="0.05"/>

  <rect x="50" y="380" width="200" height="30" rx="5" fill="$accent" opacity="0.2"/>
  <rect x="50" y="420" width="700" height="60" rx="5" fill="$primary" opacity="0.05"/>

  <!-- Skills section -->
  <rect x="50" y="500" width="200" height="30" rx="5" fill="$accent" opacity="0.2"/>
  <rect x="50" y="540" width="100" height="25" rx="12" fill="$primary" opacity="0.3"/>
  <rect x="160" y="540" width="80" height="25" rx="12" fill="$accent" opacity="0.3"/>
  <rect x="250" y="540" width="120" height="25" rx="12" fill="$primary" opacity="0.3"/>

  <!-- Corner accent -->
  <circle cx="750" cy="550" r="100" fill="url(#grad-$id)" opacity="0.1"/>
</svg>
EOF

  echo "✅ Generated $id.svg"
done

echo "🎉 Template preview placeholders generated!"
echo "📝 Note: These are SVG placeholders. To generate real previews, run: npm run generate:template-previews"