// Load testing configuration for SyncHire using k6
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    errors: ['rate<0.1'],             // Custom error rate must be less than 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://synchire.com';

export function setup() {
  // Setup code - create test user, get auth token, etc.
  console.log(`Starting load test against ${BASE_URL}`);

  // Example: Create test user and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  let authToken = '';
  if (loginRes.status === 200) {
    authToken = loginRes.json('token');
  }

  return { authToken };
}

export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (data.authToken) {
    headers['Authorization'] = `Bearer ${data.authToken}`;
  }

  // Test 1: Health check
  const healthRes = http.get(`${BASE_URL}/api/health`, { headers });
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  // Test 2: List jobs
  const jobsRes = http.get(`${BASE_URL}/api/jobs?page=1&limit=20`, { headers });
  check(jobsRes, {
    'jobs list status is 200': (r) => r.status === 200,
    'jobs list has items': (r) => r.json('data.items.length') > 0,
  }) || errorRate.add(1);

  // Test 3: Get single job
  if (jobsRes.status === 200 && jobsRes.json('data.items.length') > 0) {
    const firstJobId = jobsRes.json('data.items[0].id');
    const jobRes = http.get(`${BASE_URL}/api/jobs/${firstJobId}`, { headers });
    check(jobRes, {
      'job detail status is 200': (r) => r.status === 200,
      'job detail has data': (r) => r.json('data.id') === firstJobId,
    }) || errorRate.add(1);
  }

  // Test 4: User profile (authenticated)
  if (data.authToken) {
    const profileRes = http.get(`${BASE_URL}/api/users/profile`, { headers });
    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
      'profile has email': (r) => r.json('data.email') !== undefined,
    }) || errorRate.add(1);
  }

  // Test 5: Resume upload (authenticated)
  if (data.authToken && Math.random() < 0.1) { // 10% of iterations
    const fileRes = http.post(`${BASE_URL}/api/resumes`, {
      file: http.file(open('./test-resume.pdf'), 'test-resume.pdf', 'application/pdf'),
    }, { headers });

    check(fileRes, {
      'upload status is 201 or 400': (r) => r.status === 201 || r.status === 400,
    }) || errorRate.add(1);
  }

  // Simulate user think time
  sleep(Math.random() * 3 + 1); // Sleep 1-4 seconds
}

export function teardown(data) {
  // Cleanup code - delete test user, etc.
  console.log('Load test completed');
}
