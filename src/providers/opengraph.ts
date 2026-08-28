import type { Provider, MediaInfo } from './index.js';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function findMetaTag(html: string, property: string): string | null {
  const regex1 = new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i');
  const regex3 = new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const regex4 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${property}["']`, 'i');
  
  const match = html.match(regex1) || html.match(regex2) || html.match(regex3) || html.match(regex4);
  return match ? decodeHtmlEntities(match[1]) : null;
}

export class OpengraphProvider implements Provider {
  name = 'opengraph';

  canHandle(url: URL): boolean {
    // Falls back to true to act as a general HTML metadata parser
    return true;
  }

  async resolve(urlStr: string): Promise<MediaInfo> {
    const response = await fetch(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage. Status code: ${response.status}`);
    }

    const contentTypeHeader = response.headers.get('content-type') || '';
    if (!contentTypeHeader.includes('text/html')) {
      return {
        url: urlStr,
        contentType: contentTypeHeader.split(';')[0].trim(),
      };
    }

    const html = await response.text();

    // Parse title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;

    // Search targets in priority order:
    // 1. Video Meta
    let mediaUrl = findMetaTag(html, 'og:video:secure_url') || findMetaTag(html, 'og:video');
    let contentType = 'video/mp4';

    // 2. Video HTML Tag
    if (!mediaUrl) {
      const videoTagMatch = html.match(/<video[^>]*src=["']([^"']+)["']/i);
      if (videoTagMatch && videoTagMatch[1]) {
        mediaUrl = decodeHtmlEntities(videoTagMatch[1]);
      }
    }

    // 3. Audio Meta / Tag
    if (!mediaUrl) {
      mediaUrl = findMetaTag(html, 'og:audio:secure_url') || findMetaTag(html, 'og:audio');
      contentType = 'audio/mpeg';

      if (!mediaUrl) {
        const audioTagMatch = html.match(/<audio[^>]*src=["']([^"']+)["']/i);
        if (audioTagMatch && audioTagMatch[1]) {
          mediaUrl = decodeHtmlEntities(audioTagMatch[1]);
        }
      }
    }

    // 4. Image Meta
    if (!mediaUrl) {
      mediaUrl = findMetaTag(html, 'og:image:secure_url') || findMetaTag(html, 'og:image');
      contentType = 'image/jpeg';
    }

    if (!mediaUrl) {
      throw new Error('No OpenGraph video, audio, or image tags found on the page.');
    }

    // Resolve relative URLs to absolute URLs
    const absoluteUrl = new URL(mediaUrl, urlStr).toString();

    return {
      url: absoluteUrl,
      filename: title,
      contentType,
    };
  }
}
