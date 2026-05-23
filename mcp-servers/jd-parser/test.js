/**
 * Simple test script for JD Parser
 */

import { parseJD } from './build/parser.js';

const sampleJD = `
# Senior Software Engineer at Acme Corp

Acme Corp is hiring a Senior Software Engineer to join our growing team.

## Location
San Francisco, CA (Remote options available)

## Requirements
- Bachelor's degree in Computer Science or related field
- 5+ years of experience in software development
- Strong proficiency in TypeScript and React
- Experience with Node.js and REST APIs
- Knowledge of cloud platforms (AWS or GCP)
- Excellent communication and teamwork skills

## Responsibilities
- Lead the development of our core product features
- Collaborate with cross-functional teams
- Mentor junior developers
- Own the technical architecture decisions

## Benefits
- Competitive salary ($150k - $200k)
- Equity package
- Health insurance
- Flexible work arrangements
`;

const result = parseJD(sampleJD);
console.log(JSON.stringify(result, null, 2));
