/**
 * API Client Tests
 *
 * Comprehensive test suite for API endpoints and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { APIClient, apiClient, authAPI, resumeAPI, jdAPI, mockAPI } from '../api-client';

// Mock fetch for testing
global.fetch = vi.fn();

describe('APIClient', () => {
  let client: APIClient;

  beforeEach(() => {
    client = new APIClient('https://api.test.com', 5000, 2);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('request handling', () => {
    it('should make successful GET requests', async () => {
      const mockData = { message: 'Success' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await client.get('/test');

      expect(result.data).toEqual(mockData);
      expect(result.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should make successful POST requests', async () => {
      const mockData = { created: true };
      const postData = { name: 'Test' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockData,
      });

      const result = await client.post('/test', postData);

      expect(result.data).toEqual(mockData);
      expect(result.status).toBe(201);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
        })
      );
    });

    it('should handle HTTP errors properly', async () => {
      const errorResponse = { message: 'Not found' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => errorResponse,
      });

      const result = await client.get('/not-found');

      expect(result.error).toBe('Not found');
      expect(result.status).toBe(404);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await client.get('/test');

      expect(result.error).toBe('Network error');
      expect(result.status).toBe(500);
    });

    it('should handle timeout errors', async () => {
      // Mock slow response
      (global.fetch as any).mockImplementationOnce(() =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({}),
            });
          }, 6000); // Longer than 5s timeout
        })
      );

      const result = await client.get('/slow');

      expect(result.error).toBe('请求超时，请稍后重试');
      expect(result.status).toBe(408);
    });
  });

  describe('error handling', () => {
    it('should handle malformed error responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await client.get('/error');

      expect(result.error).toContain('HTTP error!');
      expect(result.status).toBe(500);
    });

    it('should handle unknown errors', async () => {
      (global.fetch as any).mockRejectedValueOnce('Unknown error type');

      const result = await client.get('/test');

      expect(result.error).toBe('未知错误');
      expect(result.status).toBe(500);
    });
  });
});

describe('authAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register user successfully', async () => {
    const mockResponse = {
      userId: 'user-123',
      token: 'jwt-token',
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockResponse,
    });

    const result = await authAPI.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123',
    });

    expect(result.data).toEqual(mockResponse);
    expect(result.status).toBe(201);
  });

  it('should handle registration errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Email already exists' }),
    });

    const result = await authAPI.register({
      name: 'John Doe',
      email: 'existing@example.com',
      password: 'SecurePass123',
    });

    expect(result.error).toBe('Email already exists');
    expect(result.status).toBe(400);
  });

  it('should login user successfully', async () => {
    const mockResponse = {
      userId: 'user-123',
      token: 'jwt-token',
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await authAPI.login({
      email: 'john@example.com',
      password: 'SecurePass123',
    });

    expect(result.data).toEqual(mockResponse);
  });

  it('should handle login errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    const result = await authAPI.login({
      email: 'john@example.com',
      password: 'WrongPass123',
    });

    expect(result.error).toBe('Invalid credentials');
    expect(result.status).toBe(401);
  });
});

describe('resumeAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list resumes successfully', async () => {
    const mockResumes = [
      { id: 'resume-1', name: 'Resume.pdf', uploadedAt: '2024-01-01' },
      { id: 'resume-2', name: 'Resume2.pdf', uploadedAt: '2024-01-02' },
    ];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResumes,
    });

    const result = await resumeAPI.list();

    expect(result.data).toEqual(mockResumes);
    expect(result.status).toBe(200);
  });

  it('should handle file upload', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const mockResponse = {
      id: 'resume-123',
      name: 'test.pdf',
      uploadedAt: '2024-01-01',
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockResponse,
    });

    const response = await resumeAPI.upload(mockFile);

    expect(response.status).toBe(201);
  });

  it('should export resume to PDF', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ url: '/temp/resume-123.pdf' }),
    });

    const result = await resumeAPI.export('resume-123', 'pdf');

    expect(result.data).toEqual({ url: '/temp/resume-123.pdf' });
  });
});

describe('jdAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should analyze job description', async () => {
    const mockAnalysis = {
      score: 75,
      skills: ['JavaScript', 'React'],
      missingSkills: ['GraphQL'],
      recommendations: ['Add more projects'],
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAnalysis,
    });

    const result = await jdAPI.analyze({
      description: 'Senior React Developer',
      requirements: ['React', 'TypeScript'],
    });

    expect(result.data).toEqual(mockAnalysis);
    expect(result.status).toBe(200);
  });

  it('should parse job description text', async () => {
    const mockParsed = {
      title: 'Senior React Developer',
      company: 'Tech Corp',
      description: 'We are looking for...',
      requirements: ['React', 'TypeScript', 'Node.js'],
    };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockParsed,
    });

    const result = await jdAPI.parse('Senior React Developer at Tech Corp...');

    expect(result.data).toEqual(mockParsed);
  });
});

describe('mockAPI', () => {
  it('should mock registration with delay', async () => {
    const startTime = Date.now();
    const result = await mockAPI.mockRegister({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123',
    });
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(1500);
    expect(result.data.userId).toBe('mock-user-123');
    expect(result.data.token).toBe('mock-jwt-token');
  });

  it('should mock login with delay', async () => {
    const startTime = Date.now();
    const result = await mockAPI.mockLogin({
      email: 'test@example.com',
      password: 'Password123',
    });
    const endTime = Date.now();

    expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
    expect(result.data.token).toBeDefined();
  });

  it('should mock JD analysis', async () => {
    const result = await mockAPI.mockAnalyzeJD({
      description: 'React Developer',
      requirements: ['React', 'TypeScript'],
    });

    expect(result.data.score).toBe(75);
    expect(result.data.skills).toContain('JavaScript');
    expect(result.data.missingSkills).toContain('GraphQL');
    expect(result.data.recommendations).toHaveLength(3);
  });

  it('should mock file upload', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const result = await mockAPI.mockUpload(mockFile);

    expect(result.data.id).toContain('resume-');
    expect(result.data.name).toBe('test.pdf');
  });

  it('should mock PDF generation', async () => {
    const result = await mockAPI.mockGeneratePDF('<html>...</html>');

    expect(result.data.url).toContain('/temp/resume-');
    expect(result.data.url).toContain('.pdf');
  });
});
