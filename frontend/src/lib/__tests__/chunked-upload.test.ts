/**
 * Chunked Upload Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createChunkedUpload, formatBytes, formatTime, formatUploadSpeed } from '../chunked-upload';

// Mock fetch globally
global.fetch = vi.fn();

describe('Chunked Upload Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createChunkedUpload', () => {
    it('should create a chunked upload instance', () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const instance = createChunkedUpload(file, '/api/upload/chunk');

      expect(instance).toBeDefined();
      expect(instance.start).toBeInstanceOf(Function);
      expect(instance.pause).toBeInstanceOf(Function);
      expect(instance.resume).toBeInstanceOf(Function);
      expect(instance.cancel).toBeInstanceOf(Function);
      expect(instance.getProgress).toBeInstanceOf(Function);
    });

    it('should calculate correct chunk size for small files', () => {
      const file = new File(['small'], 'small.txt', { type: 'text/plain' });
      const instance = createChunkedUpload(file, '/api/upload/chunk', {
        chunkSize: 1024 // 1KB
      });

      const progress = instance.getProgress();
      expect(progress.totalChunks).toBe(1); // Small file should be 1 chunk
    });

    it('should calculate correct chunk size for large files', () => {
      const largeContent = 'x'.repeat(3 * 1024 * 1024); // 3MB
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' });
      const instance = createChunkedUpload(file, '/api/upload/chunk', {
        chunkSize: 1024 * 1024 // 1MB
      });

      const progress = instance.getProgress();
      expect(progress.totalChunks).toBe(3); // 3MB file with 1MB chunks = 3 chunks
    });

    it('should provide initial progress state', () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const instance = createChunkedUpload(file, '/api/upload/chunk');
      const progress = instance.getProgress();

      expect(progress.percentage).toBe(0);
      expect(progress.uploadedBytes).toBe(0);
      expect(progress.totalBytes).toBe(file.size);
      expect(progress.currentChunk).toBe(0);
      expect(progress.state).toBe('idle');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1536 * 1024)).toBe('1.5 MB');
    });
  });

  describe('formatTime', () => {
    it('should format seconds correctly', () => {
      expect(formatTime(30)).toBe('30s');
      expect(formatTime(90)).toBe('1m 30s');
      expect(formatTime(3661)).toBe('1h 1m');
    });

    it('should handle edge cases', () => {
      expect(formatTime(0)).toBe('0s');
      expect(formatTime(59)).toBe('59s');
      expect(formatTime(60)).toBe('1m 0s');
    });
  });

  describe('formatUploadSpeed', () => {
    it('should format upload speed correctly', () => {
      expect(formatUploadSpeed(1024)).toBe('1 KB/s');
      expect(formatUploadSpeed(1024 * 1024)).toBe('1 MB/s');
      expect(formatUploadSpeed(1024 * 1024 * 1024)).toBe('1 GB/s');
    });
  });
});
