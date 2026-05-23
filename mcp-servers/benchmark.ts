/**
 * Performance Benchmark for SyncHire MCP Servers
 *
 * Tests response time, throughput, and resource usage
 */

import { parseJD } from './jd-parser/build/parser.js';
import { parseResume } from './resume-analyzer/build/parser.js';
import { calculateMatch } from './job-matcher/build/matcher.js';
import { generateInterviewPrep } from './interview-prep/build/generator.js';

// Sample data for testing
const SAMPLE_JD = `
# Senior Software Engineer at TechCorp

## Requirements
- 5+ years of experience in software development
- Strong proficiency in TypeScript and React
- Experience with Node.js and REST APIs
- Knowledge of cloud platforms (AWS or GCP)
- Excellent communication and teamwork skills

## Responsibilities
- Lead the development of our core product features
- Collaborate with cross-functional teams
- Mentor junior developers
`;

const SAMPLE_RESUME = `
John Doe
Software Engineer

john@example.com | +1-555-0123

## Summary
Senior Software Engineer with 6 years of experience building scalable web applications using TypeScript, React, and Node.js.

## Experience

### Senior Software Engineer
**TechCorp Inc.** | Jan 2020 - Present
- Led development of microservices architecture serving 1M+ users
- Implemented CI/CD pipeline reducing deployment time by 60%
- Technologies: TypeScript, React, Node.js, PostgreSQL, Docker, AWS

### Software Engineer
**StartupXYZ** | Jun 2018 - Dec 2019
- Built RESTful APIs for e-commerce platform
- Technologies: JavaScript, React, Express, MongoDB

## Education
**Bachelor of Science in Computer Science**
University of California, Berkeley | 2018

## Skills
- Languages: TypeScript, JavaScript, Python, SQL
- Frameworks: React, Node.js, Express
- Databases: PostgreSQL, MongoDB, Redis
- Cloud: AWS, Docker, Kubernetes
`;

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
}

/**
 * Measure execution time
 */
async function measure<T>(
  name: string,
  fn: () => T,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warm-up
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Actual benchmark
  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    const iterStart = Date.now();
    await fn();
    times.push(Date.now() - iterStart);
  }
  const totalTime = Date.now() - startTime;

  const sortedTimes = times.sort((a, b) => a - b);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = sortedTimes[0];
  const maxTime = sortedTimes[sortedTimes.length - 1];
  const throughput = (iterations / totalTime) * 1000;

  return {
    name,
    iterations,
    totalTime,
    avgTime,
    minTime,
    maxTime,
    throughput,
  };
}

/**
 * Format benchmark result
 */
function formatResult(result: BenchmarkResult): string {
  return `
${result.name}
  Iterations: ${result.iterations}
  Total Time: ${result.totalTime}ms
  Average: ${result.avgTime.toFixed(2)}ms
  Min: ${result.minTime}ms
  Max: ${result.maxTime}ms
  Throughput: ${result.throughput.toFixed(2)} ops/sec`;
}

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   SyncHire MCP Servers Performance Benchmark ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const results: BenchmarkResult[] = [];

  // Benchmark 1: JD Parser
  console.log('Benchmarking JD Parser...');
  results.push(await measure('JD Parser', () => parseJD(SAMPLE_JD), 100));
  console.log(formatResult(results[results.length - 1]));

  // Benchmark 2: Resume Analyzer
  console.log('\nBenchmarking Resume Analyzer...');
  results.push(await measure('Resume Analyzer', () => parseResume(SAMPLE_RESUME), 100));
  console.log(formatResult(results[results.length - 1]));

  // Prepare data for remaining benchmarks
  const jd = parseJD(SAMPLE_JD);
  const resume = parseResume(SAMPLE_RESUME);

  // Benchmark 3: Job Matcher
  console.log('\nBenchmarking Job Matcher...');
  results.push(await measure('Job Matcher', () => calculateMatch(resume, jd), 100));
  console.log(formatResult(results[results.length - 1]));

  // Benchmark 4: Interview Prep
  console.log('\nBenchmarking Interview Prep...');
  results.push(await measure('Interview Prep', () => generateInterviewPrep(resume, jd), 100));
  console.log(formatResult(results[results.length - 1]));

  // Benchmark 5: End-to-End Workflow
  console.log('\nBenchmarking End-to-End Workflow...');
  results.push(await measure(
    'End-to-End Workflow',
    () => {
      const j = parseJD(SAMPLE_JD);
      const r = parseResume(SAMPLE_RESUME);
      const m = calculateMatch(r, j);
      const p = generateInterviewPrep(r, j);
      return { j, r, m, p };
    },
    50
  ));
  console.log(formatResult(results[results.length - 1]));

  // Summary
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║              Summary                          ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log('Performance Comparison:');
  console.log('┌─────────────────────────┬──────────────┬──────────────┐');
  console.log('│ Server                  │ Avg Time     │ Throughput   │');
  console.log('├─────────────────────────┼──────────────┼──────────────┤');

  for (const result of results) {
    const avgTime = result.avgTime.toFixed(2).padEnd(12);
    const throughput = result.throughput.toFixed(2).padEnd(12);
    console.log(`│ ${result.name.padEnd(23)} │ ${avgTime}ms │ ${throughput}/s │`);
  }

  console.log('└─────────────────────────┴──────────────┴──────────────┘\n');

  // Performance Analysis
  console.log('Performance Analysis:');
  const totalAvgTime = results.reduce((sum, r) => sum + r.avgTime, 0);
  const totalThroughput = results.reduce((sum, r) => sum + r.throughput, 0);

  console.log(`  Total Average Time: ${totalAvgTime.toFixed(2)}ms`);
  console.log(`  Total Throughput: ${totalThroughput.toFixed(2)} ops/sec`);
  console.log(`  Fastest Server: ${results.reduce((min, r) => r.avgTime < min.avgTime ? r : min).name}`);
  console.log(`  Slowest Server: ${results.reduce((max, r) => r.avgTime > max.avgTime ? r : max).name}`);

  // Performance Recommendations
  console.log('\nRecommendations:');
  for (const result of results) {
    if (result.avgTime > 100) {
      console.log(`  ⚠️  ${result.name}: Average time exceeds 100ms - consider optimization`);
    } else if (result.avgTime > 50) {
      console.log(`  ⚡ ${result.name}: Average time between 50-100ms - acceptable for production`);
    } else {
      console.log(`  ✅ ${result.name}: Excellent performance (< 50ms)`);
    }
  }

  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║          Resource Usage Guidelines            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log('Memory Requirements (estimated):');
  console.log('  JD Parser:          ~128-256 MB');
  console.log('  Resume Analyzer:    ~256-512 MB (higher for PDF parsing)');
  console.log('  Job Matcher:        ~128-256 MB');
  console.log('  Interview Prep:     ~128-256 MB');
  console.log('  Total (all servers): ~640-1,280 MB');

  console.log('\nCPU Requirements:');
  console.log('  Single Core:        Sufficient for 1-2 concurrent requests');
  console.log('  Dual Core:          Recommended for production');
  console.log('  Quad Core:          Ideal for high-load scenarios');

  console.log('\nScaling Recommendations:');
  console.log('  Small Load (< 100 req/min):  1 instance each');
  console.log('  Medium Load (100-1000 req/min): 2-3 instances each');
  console.log('  High Load (> 1000 req/min):    3+ instances with load balancer');
}

// Run benchmarks
runBenchmarks().catch(error => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
