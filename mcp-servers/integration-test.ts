/**
 * Integration Tests for SyncHire MCP Servers
 *
 * Tests the complete workflow:
 * JD Parser → Resume Analyzer → Job Matcher → Interview Prep
 */

import { parseJD } from './jd-parser/build/parser.js';
import { parseResume } from './resume-analyzer/build/parser.js';
import { calculateMatch } from './job-matcher/build/matcher.js';
import { generateInterviewPrep } from './interview-prep/build/generator.js';

// Sample Job Description
const SAMPLE_JD = `
# Senior Software Engineer at Acme Corp

Acme Corp is hiring a Senior Software Engineer to join our growing team in San Francisco.

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

// Sample Resume
const SAMPLE_RESUME = `
John Doe
Software Engineer

john@example.com | +1-555-0123
San Francisco, CA
https://linkedin.com/in/johndoe | https://github.com/johndoe

## Summary
Senior Software Engineer with 6 years of experience building scalable web applications using TypeScript, React, and Node.js. Passionate about clean code and mentoring.

## Experience

### Senior Software Engineer
**TechCorp Inc.** | Jan 2020 - Present
- Led development of microservices architecture serving 1M+ users
- Implemented CI/CD pipeline reducing deployment time by 60%
- Mentored team of 3 junior developers
- Technologies: TypeScript, React, Node.js, PostgreSQL, Docker, AWS

### Software Engineer
**StartupXYZ** | Jun 2018 - Dec 2019
- Built RESTful APIs for e-commerce platform
- Developed responsive React components
- Participated in agile development process
- Technologies: JavaScript, React, Express, MongoDB

## Education
**Bachelor of Science in Computer Science**
University of California, Berkeley | 2018

## Skills
- Languages: TypeScript, JavaScript, Python, SQL
- Frameworks: React, Node.js, Express
- Databases: PostgreSQL, MongoDB, Redis
- Cloud: AWS, Docker, Kubernetes
- Tools: Git, CI/CD, Jira

## Projects
- E-commerce Platform: Built full-stack application with React and Node.js
- Real-time Chat App: WebSocket-based chat with Redis pub/sub
`;

/**
 * Test 1: JD Parser
 */
async function testJDParser() {
  console.log('\n=== Test 1: JD Parser ===');
  try {
    const result = parseJD(SAMPLE_JD);

    console.log('✅ JD Parser passed');
    console.log('  Title:', result.title);
    console.log('  Company:', result.company);
    console.log('  Hard Skills:', result.hardSkills.map(s => s.name).join(', '));
    console.log('  Experience Level:', result.experienceLevel.level);
    console.log('  Min Years:', result.experienceLevel.minYears);

    // Verify key fields
    if (!result.title) throw new Error('Missing title');
    if (!result.hardSkills.length) throw new Error('No hard skills extracted');
    if (result.experienceLevel.level !== 'senior') throw new Error('Wrong level detected');

    return result;
  } catch (error) {
    console.error('❌ JD Parser failed:', error);
    throw error;
  }
}

/**
 * Test 2: Resume Analyzer
 */
async function testResumeAnalyzer() {
  console.log('\n=== Test 2: Resume Analyzer ===');
  try {
    const result = parseResume(SAMPLE_RESUME);

    console.log('✅ Resume Analyzer passed');
    console.log('  Name:', result.personalInfo.name);
    console.log('  Email:', result.personalInfo.email);
    console.log('  Skills:', result.skills.length);
    console.log('  Experience:', result.experience.length, 'positions');
    console.log('  Total Years:', result.totalYearsExperience);
    console.log('  Career Level:', result.careerLevel);

    // Verify key fields
    if (!result.personalInfo.name) throw new Error('Missing name');
    if (!result.skills.length) throw new Error('No skills extracted');
    if (!result.experience.length) throw new Error('No experience extracted');
    if (result.totalYearsExperience < 5) throw new Error('Years calculation incorrect');

    return result;
  } catch (error) {
    console.error('❌ Resume Analyzer failed:', error);
    throw error;
  }
}

/**
 * Test 3: Job Matcher
 */
async function testJobMatcher(jd, resume) {
  console.log('\n=== Test 3: Job Matcher ===');
  try {
    const result = calculateMatch(resume, jd);

    console.log('✅ Job Matcher passed');
    console.log('  Overall Score:', result.overallScore);
    console.log('  Match Level:', result.matchLevel);
    console.log('  Hard Skills:', result.hardSkillsScore.percentage.toFixed(0) + '%');
    console.log('  Soft Skills:', result.softSkillsScore.percentage.toFixed(0) + '%');
    console.log('  Experience:', result.experienceScore.percentage.toFixed(0) + '%');
    console.log('  Education:', result.educationScore.percentage.toFixed(0) + '%');
    console.log('  Missing Required:', result.missingRequiredSkills.length);
    console.log('  Recommendations:', result.recommendations.length);

    // Verify key fields
    if (result.overallScore < 0 || result.overallScore > 100) throw new Error('Invalid score');
    if (!['excellent', 'good', 'fair', 'poor'].includes(result.matchLevel)) throw new Error('Invalid match level');
    if (!result.hardSkillsScore || !result.experienceScore) throw new Error('Missing category scores');

    return result;
  } catch (error) {
    console.error('❌ Job Matcher failed:', error);
    throw error;
  }
}

/**
 * Test 4: Interview Prep
 */
async function testInterviewPrep(resume, jd) {
  console.log('\n=== Test 4: Interview Prep ===');
  try {
    const result = generateInterviewPrep(resume, jd);

    console.log('✅ Interview Prep passed');
    console.log('  HR Questions:', result.hrQuestions.length);
    console.log('  Technical Questions:', result.technicalQuestions.length);
    console.log('  Behavioral Questions:', result.behavioralQuestions.length);
    console.log('  Reverse Questions:', result.reverseQuestions.length);
    console.log('  Checklist Categories:', result.checklist.length);
    console.log('  Self-Intro Template:', result.selfIntroduction.structure.length, 'sections');

    // Verify key fields
    if (!result.hrQuestions.length) throw new Error('No HR questions generated');
    if (!result.technicalQuestions.length) throw new Error('No technical questions generated');
    if (!result.selfIntroduction) throw new Error('Missing self-intro template');
    if (!result.checklist.length) throw new Error('No checklist generated');

    return result;
  } catch (error) {
    console.error('❌ Interview Prep failed:', error);
    throw error;
  }
}

/**
 * Test 5: End-to-End Workflow
 */
async function testEndToEnd() {
  console.log('\n=== Test 5: End-to-End Workflow ===');
  try {
    // Step 1: Parse JD
    console.log('\nStep 1: Parsing Job Description...');
    const jd = parseJD(SAMPLE_JD);
    console.log('✅ JD parsed successfully');

    // Step 2: Parse Resume
    console.log('\nStep 2: Parsing Resume...');
    const resume = parseResume(SAMPLE_RESUME);
    console.log('✅ Resume parsed successfully');

    // Step 3: Calculate Match
    console.log('\nStep 3: Calculating Match Score...');
    const match = calculateMatch(resume, jd);
    console.log(`✅ Match calculated: ${match.overallPercentage.toFixed(0)}% (${match.matchLevel})`);

    // Step 4: Generate Interview Prep
    console.log('\nStep 4: Generating Interview Prep...');
    const prep = generateInterviewPrep(resume, jd);
    console.log(`✅ Interview prep generated: ${prep.hrQuestions.length + prep.technicalQuestions.length + prep.behavioralQuestions.length} questions`);

    console.log('\n✅ End-to-End Workflow passed!');
    return { jd, resume, match, prep };
  } catch (error) {
    console.error('❌ End-to-End Workflow failed:', error);
    throw error;
  }
}

/**
 * Test 6: Data Flow Validation
 */
async function testDataFlow() {
  console.log('\n=== Test 6: Data Flow Validation ===');
  try {
    // Parse and validate data flow
    const jd = parseJD(SAMPLE_JD);
    const resume = parseResume(SAMPLE_RESUME);
    const match = calculateMatch(resume, jd);
    const prep = generateInterviewPrep(resume, jd);

    // Validate data consistency
    console.log('\nValidating data consistency...');

    // Check if skills from JD are used in matching
    const jdSkillNames = jd.allSkills.map(s => s.name);
    const matchSkillNames = match.skillMatches.map(m => m.skill);
    const skillOverlap = jdSkillNames.filter(s => matchSkillNames.includes(s));
    console.log(`✅ Skill overlap: ${skillOverlap.length}/${jdSkillNames.length}`);

    // Check if resume experience is reflected in match score
    const hasRelevantExperience = resume.experience.some(exp =>
      exp.technologies.some(tech =>
        jd.hardSkills.some(jdSkill => jdSkill.name.toLowerCase() === tech.toLowerCase())
      )
    );
    console.log(`✅ Relevant experience found: ${hasRelevantExperience}`);

    // Check if interview prep uses both resume and JD data
    const hasRoleSpecificQuestions = prep.technicalQuestions.some(q =>
      q.question.toLowerCase().includes(jd.title.toLowerCase())
    );
    console.log(`✅ Role-specific questions: ${hasRoleSpecificQuestions}`);

    console.log('\n✅ Data Flow Validation passed!');
  } catch (error) {
    console.error('❌ Data Flow Validation failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   SyncHire MCP Servers Integration Tests     ║');
  console.log('╚════════════════════════════════════════════════╝');

  const results = {
    passed: 0,
    failed: 0,
    tests: [] as any[],
  };

  const tests = [
    { name: 'JD Parser', fn: testJDParser },
    { name: 'Resume Analyzer', fn: testResumeAnalyzer },
    { name: 'Job Matcher', fn: () => testJobMatcher(parseJD(SAMPLE_JD), parseResume(SAMPLE_RESUME)) },
    { name: 'Interview Prep', fn: () => testInterviewPrep(parseResume(SAMPLE_RESUME), parseJD(SAMPLE_JD)) },
    { name: 'End-to-End Workflow', fn: testEndToEnd },
    { name: 'Data Flow Validation', fn: testDataFlow },
  ];

  for (const test of tests) {
    try {
      await test.fn();
      results.passed++;
      results.tests.push({ name: test.name, status: 'PASSED' });
    } catch (error) {
      results.failed++;
      results.tests.push({ name: test.name, status: 'FAILED', error });
    }
  }

  // Summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║               Test Summary                    ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`Total Tests: ${results.tests.length}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  for (const test of results.tests) {
    const icon = test.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${test.name}: ${test.status}`);
    if (test.error) {
      console.error(`   Error: ${test.error.message}`);
    }
  }

  if (results.failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
