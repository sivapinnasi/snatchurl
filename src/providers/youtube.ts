import type { Provider, MediaInfo } from './index.js';
import ytdl from '@distube/ytdl-core';

export function getYoutubeVideoId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1).split('/')[0];
    }
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2];
      }
      return url.searchParams.get('v');
    }
  } catch {
    // Ignore URL parsing errors
  }
  return null;
}

export function extractJsonFromHtml(html: string, prefix: string): any {
  const index = html.indexOf(prefix);
  if (index === -1) return null;

  const start = html.indexOf('{', index);
  if (start === -1) return null;

  let braceCount = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          const jsonStr = html.substring(start, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

export class YoutubeProvider implements Provider {
  name = 'youtube';

  canHandle(url: URL): boolean {
    const host = url.hostname;
    return host.includes('youtube.com') || host.includes('youtu.be');
  }

  async resolve(urlStr: string): Promise<MediaInfo> {
    try {
      const info = await ytdl.getInfo(urlStr);
      const title = info.videoDetails?.title || 'youtube-video';
      
      // Filter for progressive formats (video + audio in one stream)
      const formats = ytdl.filterFormats(info.formats, 'audioandvideo');
      
      if (formats.length === 0) {
        throw new Error('No progressive video formats found.');
      }

      // Sort formats by quality resolution (highest first)
      const getQualityNum = (label?: string) => {
        if (!label) return 0;
        const num = parseInt(label.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
      };

      const bestFormat = formats.sort((a, b) => {
        return getQualityNum(b.qualityLabel) - getQualityNum(a.qualityLabel);
      })[0];

      let contentType = 'video/mp4';
      if (bestFormat.mimeType) {
        contentType = bestFormat.mimeType.split(';')[0].trim();
      }

      return {
        url: bestFormat.url,
        filename: title,
        contentType,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      };
    } catch (err: any) {
      throw new Error(`Failed to resolve YouTube video: ${err.message}`);
    }
  }
}
