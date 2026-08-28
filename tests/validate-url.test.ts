import { describe, it, expect } from 'vitest';
import { validateUrl } from '../src/core/validate-url.js';

describe('validateUrl', () => {
  it('should parse valid http and https URLs', () => {
    const url = validateUrl('https://example.com/test.mp4');
    expect(url.href).toBe('https://example.com/test.mp4');
  });

  it('should throw for empty URLs', () => {
    expect(() => validateUrl('')).toThrow('URL is required');
  });

  it('should throw for invalid URL syntax', () => {
    expect(() => validateUrl('invalid-url')).toThrow('Invalid URL structure');
  });

  it('should throw for unsupported protocols', () => {
    expect(() => validateUrl('ftp://example.com/test.zip')).toThrow('Unsupported protocol');
  });
});
