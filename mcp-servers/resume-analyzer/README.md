# @synchire/mcp-resume-analyzer

Model Context Protocol server for parsing and analyzing resumes into structured data.

## Features

- Extract personal information (name, email, phone, LinkedIn, GitHub)
- Parse work experience with dates and achievements
- Extract education history with GPA and honors
- Identify and categorize skills (programming, framework, database, tool, soft, language)
- Calculate total years of experience
- Determine career level (entry, mid, senior, lead, executive)

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
    "resume-analyzer": {
      "command": "node",
      "args": ["/path/to/mcp-servers/resume-analyzer/build/index.js"]
    }
  }
}
```

### Tool: `parse_resume`

Parses a resume into structured data.

**Input (file path):**
```json
{
  "file_path": "/path/to/resume.pdf"
}
```

**Input (text):**
```json
{
  "resume_text": "John Doe\nSoftware Engineer\n\njohn@example.com..."
}
```

**Output:**
```json
{
  "personalInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "linkedIn": "https://linkedin.com/in/johndoe",
    "github": "https://github.com/johndoe"
  },
  "skills": [
    { "name": "TypeScript", "category": "programming" },
    { "name": "React", "category": "framework" }
  ],
  "experience": [
    {
      "company": "Tech Corp",
      "title": "Senior Software Engineer",
      "startDate": "Jan 2020",
      "endDate": "Present",
      "current": true,
      "responsibilities": [...],
      "achievements": [...],
      "technologies": ["React", "TypeScript"]
    }
  ],
  "education": [...],
  "totalYearsExperience": 5,
  "careerLevel": "senior"
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

This server works with:
- `mcp-jd-parser` - Parse job descriptions
- `mcp-job-matcher` - Calculate match scores
- `mcp-interview-prep` - Generate interview questions
