/**
 * API Integration Testing Utilities
 *
 * Provides utilities for testing API endpoints in development and production.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authAPI, resumeAPI, jdAPI, applicationAPI } from '../api-client';

interface TestConfig {
  baseURL: string;
  timeout: number;
  authToken?: string;
}

class APIIntegrationTester {
  private config: TestConfig;
  private testResults: Map<string, any> = new Map();

  constructor(config: TestConfig) {
    this.config = config;
  }

  /**
   * Test API endpoint health
   */
  async testHealthEndpoint(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseURL}/health`);
      const isHealthy = response.ok;

      this.testResults.set('health', {
        status: response.status,
        healthy: isHealthy,
        timestamp: new Date().toISOString(),
      });

      return isHealthy;
    } catch (error) {
      this.testResults.set('health', {
        error: error instanceof Error ? error.message : 'Unknown error',
        healthy: false,
      });
      return false;
    }
  }

  /**
   * Test authentication endpoints
   */
  async testAuthEndpoints() {
    const results = {
      register: null as any,
      login: null as any,
      verifyEmail: null as any,
    };

    // Test registration
    try {
      const timestamp = Date.now();
      const registerResult = await authAPI.register({
        name: `Test User ${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'TestPass123!',
      });

      results.register = {
        success: registerResult.status === 201,
        status: registerResult.status,
        hasToken: !!registerResult.data?.token,
        hasUserId: !!registerResult.data?.userId,
        error: registerResult.error,
      };

      // Store token for subsequent tests
      if (registerResult.data?.token) {
        this.config.authToken = registerResult.data.token;
      }
    } catch (error) {
      results.register = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Test login
    try {
      const loginResult = await authAPI.login({
        email: 'test@example.com',
        password: 'TestPass123!',
      });

      results.login = {
        success: loginResult.status === 200,
        status: loginResult.status,
        hasToken: !!loginResult.data?.token,
        error: loginResult.error,
      };
    } catch (error) {
      results.login = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    this.testResults.set('auth', results);
    return results;
  }

  /**
   * Test resume endpoints
   */
  async testResumeEndpoints() {
    const results = {
      list: null as any,
      upload: null as any,
      get: null as any,
      export: null as any,
      delete: null as any,
    };

    // Test list resumes
    try {
      const listResult = await resumeAPI.list();
      results.list = {
        success: listResult.status === 200,
        status: listResult.status,
        isArray: Array.isArray(listResult.data),
        count: Array.isArray(listResult.data) ? listResult.data.length : 0,
        error: listResult.error,
      };
    } catch (error) {
      results.list = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Test file upload
    try {
      const mockFile = new File(['Test resume content'], 'test-resume.pdf', {
        type: 'application/pdf',
      });
      const uploadResult = await resumeAPI.upload(mockFile);

      results.upload = {
        success: uploadResult.status === 201 || uploadResult.status === 200,
        status: uploadResult.status,
        hasId: !!(uploadResult.data as any)?.id,
        error: uploadResult.error,
      };

      // Test get resume if upload succeeded
      if ((uploadResult.data as any)?.id) {
        const resumeId = (uploadResult.data as any).id;
        try {
          const getResult = await resumeAPI.get(resumeId);
          results.get = {
            success: getResult.status === 200,
            status: getResult.status,
            hasData: !!getResult.data,
            error: getResult.error,
          };
        } catch (error) {
          results.get = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }

        // Test export
        try {
          const exportResult = await resumeAPI.export(resumeId, 'pdf');
          results.export = {
            success: exportResult.status === 200,
            status: exportResult.status,
            hasUrl: !!(exportResult.data as any)?.url,
            error: exportResult.error,
          };
        } catch (error) {
          results.export = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }

        // Test delete
        try {
          const deleteResult = await resumeAPI.delete(resumeId);
          results.delete = {
            success: deleteResult.status === 200 || deleteResult.status === 204,
            status: deleteResult.status,
            error: deleteResult.error,
          };
        } catch (error) {
          results.delete = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    } catch (error) {
      results.upload = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    this.testResults.set('resumes', results);
    return results;
  }

  /**
   * Test job description endpoints
   */
  async testJDEndpoints() {
    const results = {
      analyze: null as any,
      parse: null as any,
    };

    // Test JD analysis
    try {
      const analyzeResult = await jdAPI.analyze({
        description: 'Senior React Developer with 5+ years of experience',
        requirements: ['React', 'TypeScript', 'Node.js'],
      });

      results.analyze = {
        success: analyzeResult.status === 200,
        status: analyzeResult.status,
        hasScore: typeof (analyzeResult.data as any)?.score === 'number',
        hasSkills: Array.isArray((analyzeResult.data as any)?.skills),
        error: analyzeResult.error,
      };
    } catch (error) {
      results.analyze = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Test JD parsing
    try {
      const parseResult = await jdAPI.parse(
        'Senior React Developer at Tech Corp. Requirements: React, TypeScript, Node.js'
      );

      results.parse = {
        success: parseResult.status === 200,
        status: parseResult.status,
        hasTitle: !!(parseResult.data as any)?.title,
        hasCompany: !!(parseResult.data as any)?.company,
        error: parseResult.error,
      };
    } catch (error) {
      results.parse = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    this.testResults.set('jd', results);
    return results;
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    const results = {
      notFound: null as any,
      unauthorized: null as any,
      invalidData: null as any,
      timeout: null as any,
    };

    // Test 404 Not Found
    try {
      const response = await fetch(`${this.config.baseURL}/nonexistent`);
      results.notFound = {
        status: response.status,
        handledCorrectly: response.status === 404,
      };
    } catch (error) {
      results.notFound = {
        error: error instanceof Error ? error.message : 'Unknown error',
        handledCorrectly: false,
      };
    }

    // Test 401 Unauthorized
    try {
      const response = await fetch(`${this.config.baseURL}/api/protected`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });
      results.unauthorized = {
        status: response.status,
        handledCorrectly: response.status === 401,
      };
    } catch (error) {
      results.unauthorized = {
        error: error instanceof Error ? error.message : 'Unknown error',
        handledCorrectly: false,
      };
    }

    // Test invalid data
    try {
      const response = await fetch(`${this.config.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' }),
      });
      const data = await response.json();
      results.invalidData = {
        status: response.status,
        handledCorrectly: response.status === 400,
        hasErrorMessage: !!data.error,
      };
    } catch (error) {
      results.invalidData = {
        error: error instanceof Error ? error.message : 'Unknown error',
        handledCorrectly: false,
      };
    }

    this.testResults.set('errorHandling', results);
    return results;
  }

  /**
   * Test request/response formats
   */
  async testDataFormats() {
    const results = {
      jsonRequest: null as any,
      jsonResponse: null as any,
      formDataRequest: null as any,
      fileUpload: null as any,
    };

    // Test JSON request/response
    try {
      const response = await fetch(`${this.config.baseURL}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      });
      const data = await response.json();

      results.jsonRequest = {
        success: true,
        status: response.status,
        correctContentType: response.headers.get('content-type')?.includes('application/json'),
        validResponse: typeof data === 'object',
      };
    } catch (error) {
      results.jsonRequest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Test FormData request
    try {
      const formData = new FormData();
      formData.append('field', 'value');

      const response = await fetch(`${this.config.baseURL}/api/test`, {
        method: 'POST',
        body: formData,
      });

      results.formDataRequest = {
        success: response.ok,
        status: response.status,
      };
    } catch (error) {
      results.formDataRequest = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    this.testResults.set('dataFormats', results);
    return results;
  }

  /**
   * Generate test report
   */
  generateReport(): string {
    let report = '# API Integration Test Report\n\n';
    report += `**Base URL**: ${this.config.baseURL}\n`;
    report += `**Test Time**: ${new Date().toISOString()}\n\n`;

    let totalTests = 0;
    let passedTests = 0;

    for (const [category, results] of this.testResults.entries()) {
      report += `## ${category.toUpperCase()}\n\n`;

      for (const [test, result] of Object.entries(results)) {
        if (result === null) continue;

        totalTests++;
        const passed = result.success || result.healthy || result.handledCorrectly;
        if (passed) passedTests++;

        report += `### ${test}\n`;
        report += `- **Status**: ${passed ? '✅ PASS' : '❌ FAIL'}\n`;

        for (const [key, value] of Object.entries(result)) {
          if (key !== 'success' && key !== 'healthy' && key !== 'handledCorrectly') {
            report += `- **${key}**: ${JSON.stringify(value)}\n`;
          }
        }
        report += '\n';
      }
    }

    report += `## Summary\n\n`;
    report += `- **Total Tests**: ${totalTests}\n`;
    report += `- **Passed**: ${passedTests}\n`;
    report += `- **Failed**: ${totalTests - passedTests}\n`;
    report += `- **Success Rate**: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`;

    return report;
  }

  /**
   * Get all test results
   */
  getResults() {
    return Object.fromEntries(this.testResults);
  }
}

/**
 * Run all API integration tests
 */
export async function runAPIIntegrationTests(baseURL: string = '/api') {
  const tester = new APIIntegrationTester({
    baseURL,
    timeout: 30000,
  });

  console.log('Starting API integration tests...');

  // Run all tests
  await tester.testHealthEndpoint();
  await tester.testAuthEndpoints();
  await tester.testResumeEndpoints();
  await tester.testJDEndpoints();
  await tester.testErrorHandling();
  await tester.testDataFormats();

  // Generate and return report
  const report = tester.generateReport();
  console.log(report);

  return {
    report,
    results: tester.getResults(),
  };
}

// Export for testing
export { APIIntegrationTester };
