import { describe, it, expect } from 'vitest';
import { parseContentDisposition, sanitizeFilename, getSafeFilename } from '../src/utils/filename.js';

describe('filename utilities', () => {
  describe('parseContentDisposition', () => {
    it('should parse standard filename parameter', () => {
      expect(parseContentDisposition('attachment; filename="video.mp4"')).toBe('video.mp4');
      expect(parseContentDisposition('inline; filename=file.txt')).toBe('file.txt');
    });

    it('should parse RFC 6266 filename* parameter', () => {
      expect(parseContentDisposition("attachment; filename*=UTF-8''my-video.mp4")).toBe('my-video.mp4');
      expect(parseContentDisposition("attachment; filename*=utf-8''%E6%B5%8B%E8%AF%95.mp4")).toBe('测试.mp4');
    });

    it('should fallback to standard filename if filename* is corrupt', () => {
      expect(parseContentDisposition("attachment; filename*=UTF-8''%invalid; filename=\"fallback.mp4\"")).toBe('fallback.mp4');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid filesystem characters', () => {
      expect(sanitizeFilename('my/cool\\video:name*.mp4')).toBe('my_cool_video_name_.mp4');
    });
  });

  describe('getSafeFilename', () => {
    it('should prioritize user suggested name', () => {
      const name = getSafeFilename({
        url: 'https://example.com/foo.mp4',
        suggestedName: 'custom-name',
        contentType: 'video/mp4'
      });
      expect(name).toBe('custom-name.mp4');
    });

    it('should parse from content-disposition header if no suggestion', () => {
      const name = getSafeFilename({
        url: 'https://example.com/foo.mp4',
        contentDisposition: 'attachment; filename="header-name.mp4"',
        contentType: 'video/mp4'
      });
      expect(name).toBe('header-name.mp4');
    });

    it('should fall back to URL path base if headers are missing', () => {
      const name = getSafeFilename({
        url: 'https://example.com/path/to/media-file.mp4'
      });
      expect(name).toBe('media-file.mp4');
    });

    it('should append correct extension from Content-Type if missing in path', () => {
      const name = getSafeFilename({
        url: 'https://example.com/api/get-video',
        contentType: 'video/mp4'
      });
      expect(name).toBe('get-video.mp4');
    });
  });
});
