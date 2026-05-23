# @synchire/mcp-interview-prep

Model Context Protocol server for generating interview preparation questions and materials.

## Features

- **HR Screening Questions**: Employment gaps, job changes, career progression
- **Technical Deep-Dives**: Project-specific questions based on experience
- **Behavioral Questions**: Leadership, conflict resolution, challenges
- **Self-Introduction Template**: Customized to role and company
- **Reverse Questions**: Insightful questions for candidates to ask interviewers
- **Preparation Checklist**: Research, practice, logistics, and follow-up items

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
    "interview-prep": {
      "command": "node",
      "args": ["/path/to/mcp-servers/interview-prep/build/index.js"]
    }
  }
}
```

### Tool: `generate_interview_prep`

Generates comprehensive interview preparation materials.

**Input:**
```json
{
  "resume": {
    "personalInfo": { "name": "John Doe" },
    "skills": [
      { "name": "TypeScript", "category": "programming" },
      { "name": "React", "category": "framework" }
    ],
    "experience": [
      {
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "achievements": ["Led team of 5 developers"],
        "technologies": ["React", "TypeScript", "Node.js"]
      }
    ],
    "education": [...],
    "careerLevel": "senior",
    "totalYearsExperience": 5
  },
  "jd": {
    "title": "Senior Software Engineer",
    "company": "Acme Corp",
    "hardSkills": [
      { "name": "TypeScript", "required": true },
      { "name": "React", "required": true }
    ],
    "softSkills": [...],
    "responsibilities": [...],
    "experienceLevel": { "level": "senior", "minYears": 5 }
  }
}
```

**Output:**
```json
{
  "hrQuestions": [
    {
      "question": "Tell me about yourself.",
      "category": "hr",
      "priority": "high",
      "talkingPoints": [
        "Current role and background",
        "Key achievements",
        "Why you're interested in this role"
      ]
    }
  ],
  "technicalQuestions": [
    {
      "question": "Tell me about your experience with TypeScript at Tech Corp.",
      "category": "technical",
      "priority": "high",
      "talkingPoints": [...]
    }
  ],
  "behavioralQuestions": [...],
  "selfIntroduction": {
    "hook": "Start with your current role + one impressive achievement",
    "structure": [...],
    "customization": {...},
    "example": "Hi, I'm John Doe..."
  },
  "reverseQuestions": [
    {
      "question": "What does success look like in the first 90 days?",
      "category": "role",
      "whenToAsk": "When asked about your goals or timeline"
    }
  ],
  "checklist": [...],
  "generatedAt": "2026-05-21T...",
  "targetRole": "Senior Software Engineer",
  "targetCompany": "Acme Corp"
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
- `mcp-resume-analyzer` - Parse resumes
- `mcp-jd-parser` - Parse job descriptions
- `mcp-job-matcher` - Calculate match scores
