import type { Provider, MediaInfo } from './index.js';

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
    const videoId = getYoutubeVideoId(urlStr);
    if (!videoId) {
      throw new Error(`Could not extract video ID from YouTube URL: "${urlStr}"`);
    }

    // innerTube player endpoint
    const playerUrl = 'https://www.youtube.com/youtubei/v1/player';
    
    try {
      // Mimic TVHTML5 client which yields un-ciphered progressive stream URLs
      const response = await fetch(playerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (SmartTV; LN46C650) AppleWebKit/530.1 (KHTML, like Gecko) Version/4.0 Safari/530.1',
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: {
              clientName: 'TVHTML5',
              clientVersion: '7.20230405.08.01',
              clientScreen: 'WATCH',
              hl: 'en',
              gl: 'US',
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`InnerTube returned HTTP ${response.status}`);
      }

      const playerResponse = await response.json() as any;

      if (playerResponse?.playabilityStatus?.status === 'ERROR') {
        const reason = playerResponse.playabilityStatus.reason || 'Video unavailable';
        throw new Error(`YouTube API error: ${reason}`);
      }

      const title = playerResponse.videoDetails?.title || 'youtube-video';
      const formats = playerResponse.streamingData?.formats || [];
      const directFormats = formats.filter((f: any) => f.url);

      if (directFormats.length > 0) {
        // Sort by quality resolution
        const getQualityNum = (label?: string) => {
          if (!label) return 0;
          const num = parseInt(label.replace(/[^0-9]/g, ''), 10);
          return isNaN(num) ? 0 : num;
        };

        const bestFormat = directFormats.sort((a: any, b: any) => {
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
            'User-Agent': 'Mozilla/5.0 (SmartTV; LN46C650) AppleWebKit/530.1 (KHTML, like Gecko) Version/4.0 Safari/530.1',
          },
        };
      }
    } catch (err: any) {
      // Log InnerTube errors and fall back to scraping
    }

    // Fallback to page scraping if InnerTube TV context fails
    return this.resolveFallback(videoId);
  }

  private async resolveFallback(videoId: string): Promise<MediaInfo> {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube page. Status code: ${response.status}`);
    }

    const html = await response.text();
    const playerResponse = extractJsonFromHtml(html, 'ytInitialPlayerResponse');
    
    if (!playerResponse) {
      throw new Error('Could not find YouTube video player metadata. The page format may have changed.');
    }

    const title = playerResponse.videoDetails?.title || 'youtube-video';
    const formats = playerResponse.streamingData?.formats || [];
    
    // Filter to formats that contain direct URLs (not ciphered/signature restricted)
    const directFormats = formats.filter((f: any) => f.url);

    if (directFormats.length === 0) {
      throw new Error('No direct stream link available for this YouTube video (signature deciphering required).');
    }

    const getQualityNum = (label?: string) => {
      if (!label) return 0;
      const num = parseInt(label.replace(/[^0-9]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    };

    const bestFormat = directFormats.sort((a: any, b: any) => {
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
    };
  }
}
