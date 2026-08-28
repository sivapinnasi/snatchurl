import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpengraphProvider } from '../src/providers/opengraph.js';

describe('OpengraphProvider', () => {
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should parse og:video secure url tag and return absolute path', async () => {
    const mockHtml = `
      <html>
        <head>
          <title>Test Page Title</title>
          <meta property="og:video:secure_url" content="https://example.com/asset.mp4" />
        </head>
        <body></body>
      </html>
    `;

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key.toLowerCase() === 'content-type') return 'text/html; charset=utf-8';
            return null;
          }
        },
        text: () => Promise.resolve(mockHtml),
      } as any)
    );

    const provider = new OpengraphProvider();
    const media = await provider.resolve('https://example.com/test-article');
    
    expect(media.url).toBe('https://example.com/asset.mp4');
    expect(media.filename).toBe('Test Page Title');
    expect(media.contentType).toBe('video/mp4');
  });

  it('should parse og:image tag as fallback and resolve relative URLs', async () => {
    const mockHtml = `
      <html>
        <head>
          <title>Image Page</title>
          <meta property="og:image" content="/img/cover.jpg" />
        </head>
        <body></body>
      </html>
    `;

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key.toLowerCase() === 'content-type') return 'text/html';
            return null;
          }
        },
        text: () => Promise.resolve(mockHtml),
      } as any)
    );

    const provider = new OpengraphProvider();
    const media = await provider.resolve('https://example.com/gallery/123');
    
    expect(media.url).toBe('https://example.com/img/cover.jpg');
    expect(media.filename).toBe('Image Page');
    expect(media.contentType).toBe('image/jpeg');
  });

  it('should return direct media content type if response is binary stream instead of HTML', async () => {
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: {
          get: (key: string) => {
            if (key.toLowerCase() === 'content-type') return 'application/zip';
            return null;
          }
        },
      } as any)
    );

    const provider = new OpengraphProvider();
    const media = await provider.resolve('https://example.com/api/get-binary');
    
    expect(media.url).toBe('https://example.com/api/get-binary');
    expect(media.contentType).toBe('application/zip');
    expect(media.filename).toBeUndefined();
  });
});
