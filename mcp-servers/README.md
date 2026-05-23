# SyncHire MCP Servers

Model Context Protocol (MCP) servers for powering the AI job matching functionality in SyncHire (知遇).

## Overview

This directory contains four specialized MCP servers that work together to provide intelligent job matching and interview preparation:

```
mcp-servers/
├── jd-parser/          # Parse job descriptions into structured data
├── resume-analyzer/    # Parse and analyze resumes
├── job-matcher/        # Calculate compatibility scores
└── interview-prep/     # Generate interview preparation materials
```

## Servers

### 1. JD Parser (`mcp-jd-parser`)

**Tool:** `parse_jd(jd_text: string) -> JD_Structure`

Extracts structured information from job descriptions:
- Hard and soft skills (categorized)
- Requirements (education, experience, certifications)
- Keywords for matching
- Experience level with confidence
- Responsibilities and benefits

**See:** [jd-parser/README.md](./jd-parser/README.md)

### 2. Resume Analyzer (`mcp-resume-analyzer`)

**Tool:** `parse_resume(file_path: string | resume_text: string) -> Resume_Structure`

Analyzes resumes from multiple formats:
- Personal information (name, email, phone, LinkedIn, GitHub)
- Work experience with dates and achievements
- Education history
- Skills (categorized by type)
- Projects and certifications

**See:** [resume-analyzer/README.md](./resume-analyzer/README.md)

### 3. Job Matcher (`mcp-job-matcher`)

**Tool:** `calculate_match(resume: Resume_Structure, jd: JD_Structure) -> Match_Result`

Computes compatibility between candidates and jobs:
- Weighted scoring across 4 categories
- Hard Skills (35%), Experience (35%), Soft Skills (15%), Education (15%)
- Gap analysis and missing skill identification
- Radar chart data for visualization
- Recommendations for improvement

**See:** [job-matcher/README.md](./job-matcher/README.md)

### 4. Interview Prep (`mcp-interview-prep`)

**Tool:** `generate_interview_prep(resume: Resume_Structure, jd: JD_Structure) -> Interview_Prep`

Generates comprehensive interview preparation:
- HR screening questions (employment gaps, job changes)
- Technical deep-dive questions
- Behavioral questions (STAR method)
- Customized self-introduction template
- Reverse questions for candidates to ask
- Preparation checklist

**See:** [interview-prep/README.md](./interview-prep/README.md)

## Usage

### Installing All Servers

```bash
cd mcp-servers
for dir in */; do
  cd "$dir" && npm install && npm run build && cd ..
done
```

### Testing

Run the integration test suite:

```bash
cd mcp-servers
npx tsx integration-test.ts
```

Expected output:
```
╔════════════════════════════════════════════════╗
║   SyncHire MCP Servers Integration Tests     ║
╚════════════════════════════════════════════════╝
...
🎉 All tests passed!
```

### Documentation

- **[USAGE.md](./USAGE.md)** - Complete API reference and integration examples
- **Server READMEs** - Individual server documentation

### MCP Client Configuration

Add all servers to your MCP client configuration:

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

## Workflow Example

```typescript
// 1. Parse a job description
const jd = await callTool('jd-parser', 'parse_jd', {
  jd_text: 'Senior Software Engineer at Acme Corp...'
});

// 2. Parse a resume
const resume = await callTool('resume-analyzer', 'parse_resume', {
  file_path: '/path/to/resume.pdf'
});

// 3. Calculate match score
const match = await callTool('job-matcher', 'calculate_match', {
  resume: resume,
  jd: jd
});

// 4. Generate interview prep
const prep = await callTool('interview-prep', 'generate_interview_prep', {
  resume: resume,
  jd: jd
});
```

## Development

Each server follows a consistent structure:

```
{server-name}/
├── src/
│   ├── index.ts      # MCP server entry point
│   ├── types.ts      # TypeScript type definitions
│   └── {parser|matcher|generator}.ts  # Core logic
├── build/            # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Common Commands

```bash
# Install dependencies
npm install

# Watch mode for development
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Run the server
npm start
```

## Technical Stack

- **Language:** TypeScript
- **Runtime:** Node.js (ES2022)
- **MCP SDK:** `@modelcontextprotocol/sdk` v1.0.4
- **Transport:** stdio (can be extended to SSE/WebSocket)

## Integration with SyncHire

These MCP servers are designed to be integrated with the main SyncHire application:

1. **Frontend:** Calls MCP tools through the AI agent
2. **Backend:** Uses MCP servers for data processing
3. **Database:** Stores structured results for caching and analytics

## Extending the Servers

To add new features or servers:

1. Follow the existing directory structure
2. Use TypeScript for type safety
3. Implement proper error handling
4. Add comprehensive README documentation
5. Update the main MCP client configuration

## Support

For issues or questions about the MCP servers, please refer to individual server README files or the main SyncHire documentation.
