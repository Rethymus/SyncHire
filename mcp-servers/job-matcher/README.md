# @synchire/mcp-job-matcher

Model Context Protocol server for calculating job match scores between resumes and job descriptions.

## Features

- **Multi-category scoring**: Hard Skills, Soft Skills, Experience, Education
- **Weighted scoring**: Hard Skills (35%), Experience (35%), Soft Skills (15%), Education (15%)
- **Skill matching**: Exact and partial matching with similarity analysis
- **Gap analysis**: Identifies missing skills and required competencies
- **Radar chart data**: Ready-to-use data for visualizations
- **Recommendations**: Actionable feedback for candidates

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
    "job-matcher": {
      "command": "node",
      "args": ["/path/to/mcp-servers/job-matcher/build/index.js"]
    }
  }
}
```

### Tool: `calculate_match`

Calculates compatibility score between a resume and job description.

**Input:**
```json
{
  "resume": {
    "skills": [
      { "name": "TypeScript", "category": "programming" },
      { "name": "React", "category": "framework" }
    ],
    "totalYearsExperience": 5,
    "careerLevel": "senior",
    "experience": [...],
    "education": [...]
  },
  "jd": {
    "hardSkills": [
      { "name": "TypeScript", "required": true },
      { "name": "React", "required": true }
    ],
    "softSkills": [...],
    "allSkills": [...],
    "experienceLevel": {
      "level": "senior",
      "minYears": 5,
      "confidence": 0.9
    },
    "requirements": [...]
  }
}
```

**Output:**
```json
{
  "overallScore": 82.5,
  "overallPercentage": 87.5,
  "matchLevel": "excellent",
  "hardSkillsScore": {
    "category": "Hard Skills",
    "score": 35,
    "maxScore": 35,
    "percentage": 100,
    "details": ["Matched 8/8 skills"]
  },
  "softSkillsScore": {...},
  "experienceScore": {...},
  "educationScore": {...},
  "skillMatches": [...],
  "missingSkills": [],
  "missingRequiredSkills": [],
  "additionalSkills": ["Python", "Docker"],
  "strengths": ["Strong technical skills match (100%)"],
  "weaknesses": [],
  "recommendations": [],
  "radarChartData": [
    { "category": "Hard Skills", "score": 100, "maxScore": 100 },
    { "category": "Soft Skills", "score": 80, "maxScore": 100 },
    { "category": "Experience", "score": 90, "maxScore": 100 },
    { "category": "Education", "score": 100, "maxScore": 100 }
  ]
}
```

## Scoring Algorithm

### Hard Skills (35%)
- Exact match: 10 points per skill
- Partial match: 7 points per skill
- Missing required: 0 points

### Soft Skills (15%)
- Match: 5 points per skill
- Missing required: 0 points

### Experience (35%)
- Years of experience: Up to 10 points
- Career level match: Up to 10 points

### Education (15%)
- Meets requirements: 10 points
- Preferred but not required: 7 points
- Missing required: 2 points

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
- `mcp-interview-prep` - Generate interview questions
