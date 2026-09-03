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
import { parseResume } from './parser.js';
import pdf from 'pdf-parse';
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
- Raw text (provide resume_text)
- PDF files (provide file_name + file_content_base64 — the tool is
  stateless and never reads the filesystem, so no file paths)

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
            resume_text: {
              type: 'string',
              description: 'Raw resume text (preferred)',
            },
            file_name: {
              type: 'string',
              description:
                'Original file name (extension only is used to pick the parser)',
            },
            file_content_base64: {
              type: 'string',
              description: 'Base64-encoded resume file bytes',
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
    const { resume_text, file_name, file_content_base64 } = args as {
      resume_text?: string;
      file_name?: string;
      file_content_base64?: string;
    };

    let result: ResumeStructure;

    if (typeof resume_text === 'string' && resume_text.length > 0) {
      result = parseResume(resume_text);
    } else if (
      typeof file_content_base64 === 'string' &&
      file_content_base64.length > 0
    ) {
      // Stateless PDF path: the bytes come in the request, so the server
      // never opens anything from the filesystem.
      const lowerName = (file_name ?? '').toLowerCase();
      if (!lowerName.endsWith('.pdf')) {
        throw new Error(
          'file_name must end with .pdf when file_content_base64 is provided',
        );
      }
      const dataBuffer = Buffer.from(file_content_base64, 'base64');
      const data = await pdf(dataBuffer);
      result = parseResume(data.text, 'pdf');
    } else {
      throw new Error(
        'Either resume_text or file_name + file_content_base64 must be provided',
      );
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
