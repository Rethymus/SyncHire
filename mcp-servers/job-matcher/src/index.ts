#!/usr/bin/env node

/**
 * Job Matcher MCP Server
 *
 * Model Context Protocol server for calculating job match scores
 * between resumes and job descriptions.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { calculateMatch } from './matcher.js';
import type { MatchResult, ResumeMatchInput, JDMatchInput } from './types.js';

// Create MCP server instance
const server = new Server(
  {
    name: '@synchire/mcp-job-matcher',
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
        name: 'calculate_match',
        description: `Calculate compatibility score between a resume and job description.

Computes match scores across multiple categories:
- Hard Skills (35% weight) - Technical abilities and tools
- Soft Skills (15% weight) - Interpersonal and communication skills
- Experience (35% weight) - Years and level of experience
- Education (15% weight) - Degrees and certifications

Returns:
- Overall match score and percentage
- Match level (excellent/good/fair/poor)
- Detailed breakdown by category
- Skill matching analysis with gaps
- Recommendations for improvement
- Radar chart data for visualization

Input: Structured resume and JD data from parse_resume and parse_jd tools`,
        inputSchema: {
          type: 'object',
          properties: {
            resume: {
              type: 'object',
              description: 'Structured resume data from parse_resume tool',
              properties: {
                skills: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      category: { type: 'string' },
                    },
                  },
                },
                totalYearsExperience: { type: 'number' },
                careerLevel: { type: 'string' },
                experience: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      technologies: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
                education: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      degree: { type: 'string' },
                      institution: { type: 'string' },
                    },
                  },
                },
              },
              required: ['skills', 'totalYearsExperience', 'careerLevel'],
            },
            jd: {
              type: 'object',
              description: 'Structured JD data from parse_jd tool',
              properties: {
                hardSkills: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      required: { type: 'boolean' },
                    },
                  },
                },
                softSkills: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      required: { type: 'boolean' },
                    },
                  },
                },
                allSkills: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      category: { type: 'string' },
                      required: { type: 'boolean' },
                    },
                  },
                },
                experienceLevel: {
                  type: 'object',
                  properties: {
                    level: { type: 'string' },
                    minYears: { type: 'number' },
                    confidence: { type: 'number' },
                  },
                },
                requirements: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      description: { type: 'string' },
                      required: { type: 'boolean' },
                    },
                  },
                },
              },
              required: ['hardSkills', 'softSkills', 'allSkills', 'experienceLevel', 'requirements'],
            },
          },
          required: ['resume', 'jd'],
        },
      },
    ],
  };
});

// Register the call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'calculate_match') {
    const { resume, jd } = args as { resume: ResumeMatchInput; jd: JDMatchInput };

    if (!resume || typeof resume !== 'object') {
      throw new Error('resume must be a valid object');
    }

    if (!jd || typeof jd !== 'object') {
      throw new Error('jd must be a valid object');
    }

    // Validate required fields
    if (!resume.skills || !Array.isArray(resume.skills)) {
      throw new Error('resume.skills is required and must be an array');
    }

    if (!resume.totalYearsExperience || typeof resume.totalYearsExperience !== 'number') {
      throw new Error('resume.totalYearsExperience is required and must be a number');
    }

    if (!resume.careerLevel || typeof resume.careerLevel !== 'string') {
      throw new Error('resume.careerLevel is required and must be a string');
    }

    if (!jd.hardSkills || !Array.isArray(jd.hardSkills)) {
      throw new Error('jd.hardSkills is required and must be an array');
    }

    if (!jd.softSkills || !Array.isArray(jd.softSkills)) {
      throw new Error('jd.softSkills is required and must be an array');
    }

    if (!jd.allSkills || !Array.isArray(jd.allSkills)) {
      throw new Error('jd.allSkills is required and must be an array');
    }

    if (!jd.experienceLevel || typeof jd.experienceLevel !== 'object') {
      throw new Error('jd.experienceLevel is required and must be an object');
    }

    if (!jd.requirements || !Array.isArray(jd.requirements)) {
      throw new Error('jd.requirements is required and must be an array');
    }

    const result: MatchResult = calculateMatch(resume, jd);

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
  console.error('Job Matcher MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
