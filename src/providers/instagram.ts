import type { Provider, MediaInfo } from './index.js';

export function getInstagramShortcode(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    if (!url.hostname.includes('instagram.com')) {
      return null;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    const typeIndex = parts.findIndex(p => p === 'p' || p === 'reel' || p === 'tv');
    if (typeIndex !== -1 && parts[typeIndex + 1]) {
      return parts[typeIndex + 1];
    }
  } catch {
    // Ignore URL parsing errors
  }
  return null;
}

function decodeEscapedUrl(url: string): string {
  return url
    .replace(/\\u0026/g, '&')
    .replace(/\\/g, '')
    .replace(/&amp;/g, '&');
}

export class InstagramProvider implements Provider {
  name = 'instagram';

  canHandle(url: URL): boolean {
    return url.hostname.includes('instagram.com');
  }

  async resolve(urlStr: string): Promise<MediaInfo> {
    const shortcode = getInstagramShortcode(urlStr);
    if (!shortcode) {
      throw new Error(`Could not extract shortcode from Instagram URL: "${urlStr}"`);
    }

    // Capture captioned embed page which is publicly readable
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram embed page. Status code: ${response.status}`);
    }

    const html = await response.text();

    // 1. Try to find a video tag in HTML
    const videoTagMatch = html.match(/<video[^>]*src="([^"]+)"/i);
    if (videoTagMatch && videoTagMatch[1]) {
      return {
        url: decodeEscapedUrl(videoTagMatch[1]),
        filename: `instagram_${shortcode}`,
        contentType: 'video/mp4',
      };
    }

    // 2. Try to find "video_url" in JSON block
    const videoJsonMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/i);
    if (videoJsonMatch && videoJsonMatch[1]) {
      return {
        url: decodeEscapedUrl(videoJsonMatch[1]),
        filename: `instagram_${shortcode}`,
        contentType: 'video/mp4',
      };
    }

    // 3. Fallback to image tag in HTML (e.g. for image posts)
    const imgTagMatch = html.match(/<img[^>]*class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i) ||
                        html.match(/<img[^>]*src="([^"]+)"/i);
    if (imgTagMatch && imgTagMatch[1]) {
      return {
        url: decodeEscapedUrl(imgTagMatch[1]),
        filename: `instagram_${shortcode}`,
        contentType: 'image/jpeg',
      };
    }

    // 4. Try to find "display_url" in JSON block
    const displayJsonMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/i);
    if (displayJsonMatch && displayJsonMatch[1]) {
      return {
        url: decodeEscapedUrl(displayJsonMatch[1]),
        filename: `instagram_${shortcode}`,
        contentType: 'image/jpeg',
      };
    }

    throw new Error('Could not find downloadable media (video or image) in the Instagram post.');
  }
}
