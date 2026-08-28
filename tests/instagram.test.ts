import { describe, it, expect } from 'vitest';
import { getInstagramShortcode } from '../src/providers/instagram.js';

describe('Instagram Provider Utilities', () => {
  describe('getInstagramShortcode', () => {
    it('should parse post shortcodes', () => {
      expect(getInstagramShortcode('https://www.instagram.com/p/C-XYZ/')).toBe('C-XYZ');
      expect(getInstagramShortcode('https://instagram.com/p/C-XYZ')).toBe('C-XYZ');
    });

    it('should parse reel shortcodes', () => {
      expect(getInstagramShortcode('https://www.instagram.com/reel/C-XYZ/')).toBe('C-XYZ');
      expect(getInstagramShortcode('https://www.instagram.com/reel/C-XYZ/?igsh=123')).toBe('C-XYZ');
    });

    it('should parse IG TV shortcodes', () => {
      expect(getInstagramShortcode('https://www.instagram.com/tv/C-XYZ/')).toBe('C-XYZ');
    });

    it('should return null for invalid Instagram paths or hosts', () => {
      expect(getInstagramShortcode('https://example.com/p/C-XYZ')).toBeNull();
      expect(getInstagramShortcode('https://www.instagram.com/invalid/C-XYZ')).toBeNull();
      expect(getInstagramShortcode('invalid')).toBeNull();
    });
  });
});
