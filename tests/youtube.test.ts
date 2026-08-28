import { describe, it, expect } from 'vitest';
import { getYoutubeVideoId, extractJsonFromHtml } from '../src/providers/youtube.js';

describe('YouTube Provider Utilities', () => {
  describe('getYoutubeVideoId', () => {
    it('should parse standard youtube watch URLs', () => {
      expect(getYoutubeVideoId('https://www.youtube.com/watch?v=aqz-KE-wZYw')).toBe('aqz-KE-wZYw');
      expect(getYoutubeVideoId('https://youtube.com/watch?v=aqz-KE-wZYw&feature=related')).toBe('aqz-KE-wZYw');
    });

    it('should parse short-URL format youtu.be', () => {
      expect(getYoutubeVideoId('https://youtu.be/aqz-KE-wZYw')).toBe('aqz-KE-wZYw');
      expect(getYoutubeVideoId('https://youtu.be/aqz-KE-wZYw?t=10')).toBe('aqz-KE-wZYw');
    });

    it('should parse embed format URLs', () => {
      expect(getYoutubeVideoId('https://www.youtube.com/embed/aqz-KE-wZYw')).toBe('aqz-KE-wZYw');
    });

    it('should parse shorts format URLs', () => {
      expect(getYoutubeVideoId('https://www.youtube.com/shorts/aqz-KE-wZYw')).toBe('aqz-KE-wZYw');
    });

    it('should return null for invalid YouTube URLs', () => {
      expect(getYoutubeVideoId('https://example.com/watch?v=aqz-KE-wZYw')).toBeNull();
      expect(getYoutubeVideoId('invalid')).toBeNull();
    });
  });

  describe('extractJsonFromHtml', () => {
    it('should extract JSON from HTML using a prefix key', () => {
      const html = `
        <html>
          <body>
            <script>
              var ytInitialPlayerResponse = {"videoDetails":{"title":"My Test Video"}};
              var otherVar = 10;
            </script>
          </body>
        </html>
      `;
      const data = extractJsonFromHtml(html, 'ytInitialPlayerResponse');
      expect(data).toBeDefined();
      expect(data.videoDetails.title).toBe('My Test Video');
    });

    it('should return null if prefix is missing', () => {
      const html = '<html><body></body></html>';
      const data = extractJsonFromHtml(html, 'ytInitialPlayerResponse');
      expect(data).toBeNull();
    });
  });
});
