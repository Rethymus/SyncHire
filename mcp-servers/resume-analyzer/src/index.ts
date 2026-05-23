#!/usr/bin/env node

/**
 * Resume Analyzer MCP Server
 *
 * Model Context Protocol server for parsing and analyzing resumes
 * into structured data for AI-powered job matching.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { parseResumeFromPDF, parseResumeFromText, parseResume } from './parser.js';
import type { ResumeStructure } from './types.js';

// Create MCP server instance
const server = new Server(
  {
    name: '@synchire/mcp-resume-analyzer',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register the list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'parse_resume',
        description: `Parse a resume/CV into structured data.

Supports:
- PDF files (provide file path)
- Text files (provide file path)
- Raw text (provide text content)

Extracts:
- Personal information (name, email, phone, LinkedIn, GitHub)
- Work experience with dates and responsibilities
- Education history
- Skills (categorized by type)
- Projects and achievements
- Certifications

Returns structured JSON with all candidate information.`,
        inputSchema: {
          type: 'object',
          properties: {
            file_path: {
              type: 'string',
              description: 'Path to the resume file (PDF or TXT)',
            },
            resume_text: {
              type: 'string',
              description: 'Raw resume text (alternative to file_path)',
            },
          },
        },
      },
    ],
  };
});

// Register the call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'parse_resume') {
    const { file_path, resume_text } = args as { file_path?: string; resume_text?: string };

    if (!file_path && !resume_text) {
      throw new Error('Either file_path or resume_text must be provided');
    }

    let result: ResumeStructure;

    if (file_path) {
      if (typeof file_path !== 'string') {
        throw new Error('file_path must be a string');
      }

      const lowerPath = file_path.toLowerCase();
      if (lowerPath.endsWith('.pdf')) {
        result = await parseResumeFromPDF(file_path);
      } else if (lowerPath.endsWith('.txt') || lowerPath.endsWith('.md')) {
        result = await parseResumeFromText(file_path);
      } else {
        throw new Error('Unsupported file format. Only PDF and TXT files are supported.');
      }
    } else if (resume_text) {
      if (typeof resume_text !== 'string') {
        throw new Error('resume_text must be a string');
      }
      result = parseResume(resume_text);
    } else {
      throw new Error('Invalid arguments');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Resume Analyzer MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
