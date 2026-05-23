# @synchire/mcp-jd-parser

Model Context Protocol server for parsing job descriptions into structured data.

## Features

- Extracts hard and soft skills with categorization
- Identifies required vs. preferred skills
- Parses experience requirements (years and level)
- Extracts education and certification requirements
- Generates keyword frequency analysis
- Identifies responsibilities and benefits
- Provides confidence scores for extracted data

## Installation

```bash
npm install
npm run build
```

## Usage

### As an MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "jd-parser": {
      "command": "node",
      "args": ["/path/to/mcp-servers/jd-parser/build/index.js"]
    }
  }
}
```

### Tool: `parse_jd`

Parses job description text into structured data.

**Input:**
```json
{
  "jd_text": "Senior Software Engineer at Acme Corp...\n\nRequirements:\n- 5+ years of experience..."
}
```

**Output:**
```json
{
  "title": "Senior Software Engineer",
  "company": "Acme Corp",
  "hardSkills": [
    { "name": "React", "category": "technical", "required": true },
    { "name": "TypeScript", "category": "technical", "required": true }
  ],
  "softSkills": [
    { "name": "communication", "category": "soft", "required": false }
  ],
  "experienceLevel": {
    "level": "senior",
    "minYears": 5,
    "confidence": 0.9
  },
  "requirements": [...],
  "keywords": [...],
  "responsibilities": [...],
  "benefits": [...]
}
```

## Development

```bash
# Watch mode
npm run dev

# Type check
npm run type-check

# Run
npm start
```

## Integration

This server is part of the SyncHire (知遇) AI job matching system. It works with:
- `mcp-resume-analyzer` - Parse candidate resumes
- `mcp-job-matcher` - Calculate match scores
- `mcp-interview-prep` - Generate interview questions
