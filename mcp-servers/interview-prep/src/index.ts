#!/usr/bin/env node

/**
 * Interview Prep MCP Server
 *
 * Model Context Protocol server for generating interview preparation
 * questions and materials based on resume and job description analysis.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { generateInterviewPrep } from './generator.js';
import type { InterviewPrep, ResumePrepInput, JDPrepInput } from './types.js';

// Create MCP server instance
const server = new Server(
  {
    name: '@synchire/mcp-interview-prep',
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
        name: 'generate_interview_prep',
        description: `Generate comprehensive interview preparation materials.

Analyzes resume and job description to create:
- HR screening questions (employment gaps, job changes, career progression)
- Technical deep-dive questions (project-specific, skill-based)
- Behavioral questions (leadership, conflict, challenges)
- Self-introduction template (customized to role and company)
- Reverse questions (for candidate to ask interviewer)
- Preparation checklist (research, practice, logistics, follow-up)

Each question includes:
- Priority level (high/medium/low)
- Suggested talking points
- Category classification

Input: Structured resume and JD data from parse_resume and parse_jd tools`,
        inputSchema: {
          type: 'object',
          properties: {
            resume: {
              type: 'object',
              description: 'Structured resume data from parse_resume tool',
              properties: {
                personalInfo: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                  },
                },
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
                experience: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      company: { type: 'string' },
                      achievements: { type: 'array', items: { type: 'string' } },
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
                projects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      result: { type: 'string' },
                      skillsUsed: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
                careerLevel: { type: 'string' },
                totalYearsExperience: { type: 'number' },
              },
              required: ['skills', 'experience', 'education', 'careerLevel', 'totalYearsExperience'],
            },
            jd: {
              type: 'object',
              description: 'Structured JD data from parse_jd tool',
              properties: {
                title: { type: 'string' },
                company: { type: 'string' },
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
                responsibilities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      priority: { type: 'string' },
                    },
                  },
                },
                experienceLevel: {
                  type: 'object',
                  properties: {
                    level: { type: 'string' },
                    minYears: { type: 'number' },
                  },
                },
              },
              required: ['title', 'hardSkills', 'softSkills', 'responsibilities', 'experienceLevel'],
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

  if (name === 'generate_interview_prep') {
    const { resume, jd } = args as { resume: ResumePrepInput; jd: JDPrepInput };

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

    if (!resume.experience || !Array.isArray(resume.experience)) {
      throw new Error('resume.experience is required and must be an array');
    }

    if (!resume.careerLevel || typeof resume.careerLevel !== 'string') {
      throw new Error('resume.careerLevel is required and must be a string');
    }

    if (!resume.totalYearsExperience || typeof resume.totalYearsExperience !== 'number') {
      throw new Error('resume.totalYearsExperience is required and must be a number');
    }

    if (!jd.title || typeof jd.title !== 'string') {
      throw new Error('jd.title is required and must be a string');
    }

    if (!jd.hardSkills || !Array.isArray(jd.hardSkills)) {
      throw new Error('jd.hardSkills is required and must be an array');
    }

    if (!jd.responsibilities || !Array.isArray(jd.responsibilities)) {
      throw new Error('jd.responsibilities is required and must be an array');
    }

    const result: InterviewPrep = generateInterviewPrep(resume, jd);

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
  console.error('Interview Prep MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
