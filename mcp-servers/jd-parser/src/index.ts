#!/usr/bin/env node

/**
 * JD Parser MCP Server
 *
 * Model Context Protocol server for parsing job descriptions
 * into structured data for AI-powered job matching.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { parseJD } from './parser.js';
import type { JDStructure } from './types.js';

// Create MCP server instance
const server = new Server(
  {
    name: '@synchire/mcp-jd-parser',
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
        name: 'parse_jd',
        description: `Parse a job description text into structured data.

Extracts and categorizes:
- Hard and soft skills (with required flags)
- Requirements (education, experience, certifications)
- Keywords for matching
- Experience level (with confidence)
- Responsibilities and benefits

Input: Raw job description text (from job board, company site, etc.)
Output: Structured JSON with all extracted information`,
        inputSchema: {
          type: 'object',
          properties: {
            jd_text: {
              type: 'string',
              description: 'The raw job description text to parse',
            },
          },
          required: ['jd_text'],
        },
      },
    ],
  };
});

// Register the call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'parse_jd') {
    const { jd_text } = args as { jd_text: string };

    if (typeof jd_text !== 'string') {
      throw new Error('jd_text must be a string');
    }

    if (jd_text.length < 50) {
      throw new Error('jd_text is too short to be a valid job description');
    }

    const result: JDStructure = parseJD(jd_text);

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
  console.error('JD Parser MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
