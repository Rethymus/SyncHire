# MCP Servers Usage Documentation

Complete guide for using SyncHire's MCP servers in your application.

## Quick Start

### Installation

Install all MCP servers:

```bash
cd /home/re/code/SyncHire/mcp-servers
for dir in */; do
  cd "$dir" && npm install && npm run build && cd ..
done
```

### MCP Client Configuration

Add to your MCP client configuration (e.g., Claude Desktop, VS Code, or custom):

```json
{
  "mcpServers": {
    "jd-parser": {
      "command": "node",
      "args": ["/home/re/code/SyncHire/mcp-servers/jd-parser/build/index.js"]
    },
    "resume-analyzer": {
      "command": "node",
      "args": ["/home/re/code/SyncHire/mcp-servers/resume-analyzer/build/index.js"]
    },
    "job-matcher": {
      "command": "node",
      "args": ["/home/re/code/SyncHire/mcp-servers/job-matcher/build/index.js"]
    },
    "interview-prep": {
      "command": "node",
      "args": ["/home/re/code/SyncHire/mcp-servers/interview-prep/build/index.js"]
    }
  }
}
```

## API Reference

### 1. JD Parser

**Tool:** `parse_jd`

**Description:** Parse job description text into structured data

**Input:**
```typescript
{
  jd_text: string  // Raw job description text (min 50 chars)
}
```

**Output:**
```typescript
{
  title: string;
  company?: string;
  location?: string;
  employmentType?: string;
  hardSkills: Array<{
    name: string;
    category: 'technical' | 'soft' | 'domain' | 'language';
    required: boolean;
  }>;
  softSkills: Array<{...}>;
  allSkills: Array<{...}>;
  requirements: Array<{
    type: 'education' | 'experience' | 'certification' | 'location' | 'other';
    description: string;
    required: boolean;
  }>;
  experienceLevel: {
    level: 'entry' | 'mid' | 'senior' | 'lead';
    minYears?: number;
    confidence: number;
  };
  responsibilities: Array<{
    title: string;
    description: string;
    priority: 'core' | 'secondary' | 'optional';
  }>;
  benefits: Array<{
    category: 'salary' | 'equity' | 'healthcare' | 'perks' | 'work_life_balance';
    description: string;
  }>;
}
```

**Example:**
```typescript
const jd = await callTool('jd-parser', 'parse_jd', {
  jd_text: `
    Senior Software Engineer at TechCorp
    Requirements: 5+ years experience, TypeScript, React...
  `
});
```

### 2. Resume Analyzer

**Tool:** `parse_resume`

**Description:** Parse resume from file or text

**Input:**
```typescript
{
  file_path?: string;  // Path to PDF or TXT file
  resume_text?: string;  // Raw resume text
}
```

**Output:**
```typescript
{
  personalInfo: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedIn?: string;
    github?: string;
    website?: string;
  };
  skills: Array<{
    name: string;
    category: 'programming' | 'framework' | 'database' | 'tool' | 'soft' | 'language';
    proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  experience: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    responsibilities: string[];
    achievements: string[];
    technologies: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    endDate?: string;
    gpa?: string;
  }>;
  totalYearsExperience: number;
  careerLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
}
```

**Example:**
```typescript
// From file
const resume = await callTool('resume-analyzer', 'parse_resume', {
  file_path: '/path/to/resume.pdf'
});

// From text
const resume = await callTool('resume-analyzer', 'parse_resume', {
  resume_text: 'John Doe\nSoftware Engineer...'
});
```

### 3. Job Matcher

**Tool:** `calculate_match`

**Description:** Calculate compatibility score between resume and job description

**Input:**
```typescript
{
  resume: ResumeStructure;  // From parse_resume
  jd: JDStructure;          // From parse_jd
}
```

**Output:**
```typescript
{
  overallScore: number;
  overallPercentage: number;
  matchLevel: 'excellent' | 'good' | 'fair' | 'poor';
  hardSkillsScore: {
    category: string;
    score: number;
    maxScore: number;
    percentage: number;
    details: string[];
  };
  softSkillsScore: {...};
  experienceScore: {...};
  educationScore: {...};
  skillMatches: Array<{
    skill: string;
    hasSkill: boolean;
    required: boolean;
    matchQuality: 'exact' | 'partial' | 'missing';
  }>;
  missingSkills: string[];
  missingRequiredSkills: string[];
  additionalSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  radarChartData: Array<{
    category: string;
    score: number;
    maxScore: number;
  }>;
}
```

**Example:**
```typescript
const match = await callTool('job-matcher', 'calculate_match', {
  resume: resumeData,
  jd: jdData
});

console.log(`Match: ${match.overallPercentage}% (${match.matchLevel})`);
```

### 4. Interview Prep

**Tool:** `generate_interview_prep`

**Description:** Generate interview preparation materials

**Input:**
```typescript
{
  resume: ResumeStructure;  // From parse_resume
  jd: JDStructure;          // From parse_jd
}
```

**Output:**
```typescript
{
  hrQuestions: Array<{
    question: string;
    category: 'hr' | 'technical' | 'behavioral' | 'situational';
    priority: 'high' | 'medium' | 'low';
    talkingPoints: string[];
  }>;
  technicalQuestions: Array<{...}>;
  behavioralQuestions: Array<{...}>;
  selfIntroduction: {
    hook: string;
    structure: string[];
    customization: {
      highlightFromResume: string[];
      connectToJD: string[];
      demonstrateCulturalFit: string[];
    };
    example: string;
  };
  reverseQuestions: Array<{
    question: string;
    category: 'company' | 'role' | 'team' | 'growth' | 'culture';
    whenToAsk: string;
  }>;
  checklist: Array<{
    category: string;
    items: string[];
    completed: boolean;
  }>;
}
```

**Example:**
```typescript
const prep = await callTool('interview-prep', 'generate_interview_prep', {
  resume: resumeData,
  jd: jdData
});

console.log(`HR Questions: ${prep.hrQuestions.length}`);
console.log(`Technical Questions: ${prep.technicalQuestions.length}`);
console.log(`Self-Intro Template: ${prep.selfIntroduction.example}`);
```

## Complete Workflow Example

```typescript
// 1. Parse Job Description
const jd = await callTool('jd-parser', 'parse_jd', {
  jd_text: jobDescriptionText
});

// 2. Parse Resume
const resume = await callTool('resume-analyzer', 'parse_resume', {
  file_path: '/path/to/resume.pdf'
});

// 3. Calculate Match
const match = await callTool('job-matcher', 'calculate_match', {
  resume: resume,
  jd: jd
});

// 4. Generate Interview Prep
const prep = await callTool('interview-prep', 'generate_interview_prep', {
  resume: resume,
  jd: jd
});

// Use results
console.log(`Match Score: ${match.overallPercentage}%`);
console.log(`Missing Skills: ${match.missingRequiredSkills.join(', ')}`);
console.log(`Interview Questions: ${prep.hrQuestions.length + prep.technicalQuestions.length}`);
```

## Testing

Run integration tests:

```bash
cd /home/re/code/SyncHire/mcp-servers
npx tsx integration-test.ts
```

## Error Handling

All servers validate inputs and return descriptive errors:

```typescript
try {
  const result = await callTool('jd-parser', 'parse_jd', {
    jd_text: text
  });
} catch (error) {
  // Handle errors
  // - "jd_text must be a string"
  // - "jd_text is too short to be a valid job description"
}
```

## Performance Considerations

- **JD Parser**: ~10-50ms per JD
- **Resume Analyzer**: ~50-200ms per resume (PDF parsing is slower)
- **Job Matcher**: ~5-20ms per match
- **Interview Prep**: ~10-30ms per generation

## Best Practices

1. **Cache Results**: Parse results can be cached for faster repeated matching
2. **Batch Processing**: Process multiple resumes in parallel
3. **Error Recovery**: Implement retry logic for network issues
4. **Data Validation**: Always validate output before using in UI
5. **Progressive Enhancement**: Start with required skills only for faster matching

## Troubleshooting

### Common Issues

**Issue**: "jd_text is too short"
**Solution**: Ensure JD text is at least 50 characters

**Issue**: "Unsupported file format"
**Solution**: Only PDF and TXT files are supported for resumes

**Issue**: "Missing required skills"
**Solution**: Check that both resume and JD have skills extracted

**Issue**: "Invalid match score"
**Solution**: Verify data structures from previous steps

### Debug Mode

Enable debug logging:

```bash
DEBUG=mcp:* node /path/to/server/build/index.js
```

## Integration Examples

### React/Next.js

```typescript
import { useMCPServer } from '@/hooks/use-mcp';

export function JobMatcher() {
  const { callTool } = useMCPServer('job-matcher');

  const handleMatch = async (resume, jd) => {
    const match = await callTool('calculate_match', { resume, jd });
    return match;
  };

  return <div>...</div>;
}
```

### Python

```python
import subprocess
import json

def call_mcp_server(server_name, tool_name, params):
    result = subprocess.run([
        'node',
        f'/path/to/{server_name}/build/index.js',
        tool_name,
        json.dumps(params)
    ], capture_output=True, text=True)
    return json.loads(result.stdout)

# Usage
jd = call_mcp_server('jd-parser', 'parse_jd', {'jd_text': '...'})
```

## Support

For issues or questions:
- Check individual server README files
- Run integration tests to verify setup
- Review error messages for specific guidance
