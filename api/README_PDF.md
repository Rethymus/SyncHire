# PDF Export System for SyncHire

## Overview

This PDF export system allows users to generate beautifully formatted resumes in multiple templates. It supports Chinese-English mixed content, smart pagination, and high-DPI export for print.

## Features

- **Multiple Templates**: 4 professionally designed templates
  - Minimal: Clean, single-column, ATS-friendly
  - Professional: Two-column with sidebar
  - Creative: Modern with accent colors
  - Executive: Conservative for senior roles

- **Chinese Font Support**: Noto Sans SC for proper Chinese character rendering
- **Smart Pagination**: Prevents content cutoff at page breaks
- **High DPI Export**: 300 DPI for print-quality output
- **Batch Export**: Generate multiple templates at once

## Installation

1. Install dependencies:
```bash
pip install playwright==1.48.0
playwright install chromium
```

2. The templates are located in `/api/templates/` directory

## API Usage

### Export Resume as PDF

```bash
POST /api/resumes/{resume_id}/export
Content-Type: application/json

{
  "template": "professional",
  "dpi": 300
}
```

Response: PDF file download

### List Available Templates

```bash
GET /api/resumes/templates
```

Response:
```json
{
  "templates": [
    {
      "id": "minimal",
      "name": "Minimal",
      "description": "Clean single-column, ATS-friendly design"
    },
    {
      "id": "professional",
      "name": "Professional",
      "description": "Two-column layout with sidebar for contact and skills"
    }
  ]
}
```

## Template Development

To create a new template:

1. Create a new HTML file in `/api/templates/`
2. Use CSS for styling (can use Tailwind classes)
3. Include placeholder variables: `{{content}}`, `{{sidebar}}`, `{{name}}`, etc.
4. Follow the page break rules to prevent cutoff

### Template Structure

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        /* Your CSS here */
        @page {
            margin: 0.75in;
            size: letter;
        }
        .no-break {
            page-break-inside: avoid;
            break-inside: avoid;
        }
    </style>
</head>
<body>
    <div class="page">
        {{content}}
    </div>
</body>
</html>
```

## Testing

Run the test script:

```bash
python -m api.tests.test_pdf_generator
```

This will generate sample PDFs in the `/test_outputs/` directory using all templates.

## Architecture

```
api/
├── templates/           # HTML templates
│   ├── minimal.html
│   ├── professional.html
│   ├── creative.html
│   └── executive.html
├── app/
│   ├── services/
│   │   └── pdf_generator.py    # Main PDF generation logic
│   ├── api/
│   │   └── resumes.py          # API endpoints
│   └── schemas/
│       └── resume.py           # Request/response schemas
└── tests/
    └── test_pdf_generator.py   # Test script
```

## Performance

- Average generation time: 2-3 seconds per resume
- Memory usage: ~200MB per Chromium instance
- Browser reuse via singleton pattern

## Future Enhancements

- [ ] Custom color schemes per template
- [ ] LinkedIn/Indeed integration
- [ ] Real-time preview with WebSockets
- [ ] Template customization UI
- [ ] PDF/A compliance for archival
