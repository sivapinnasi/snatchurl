import path from 'path';
import type { Provider, MediaInfo } from './index.js';

const MEDIA_EXTENSIONS = [
  '.mp4', '.m4v', '.webm', '.ogv', '.mov',
  '.mp3', '.m4a', '.ogg', '.wav', '.flac',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.pdf', '.zip', '.tar', '.gz', '.txt', '.json', '.xml'
];

export class GenericProvider implements Provider {
  name = 'generic';

  canHandle(url: URL): boolean {
    const ext = path.parse(url.pathname).ext.toLowerCase();
    return MEDIA_EXTENSIONS.includes(ext);
  }

  async resolve(urlStr: string): Promise<MediaInfo> {
    try {
      const { contentType, filename } = await this.detectMetadata(urlStr);
      return {
        url: urlStr,
        contentType: contentType || undefined,
        filename: filename || undefined,
      };
    } catch {
      // Fallback to simple structure if network check fails
      return { url: urlStr };
    }
  }

  private async detectMetadata(urlStr: string): Promise<{ contentType: string | null; filename: string | null }> {
    // 1. Try HEAD request (efficient, doesn't download body)
    try {
      const response = await fetch(urlStr, { method: 'HEAD' });
      if (response.ok) {
        return {
          contentType: response.headers.get('content-type'),
          filename: response.headers.get('content-disposition'),
        };
      }
    } catch {
      // Ignore HEAD errors and try GET fallback
    }

    // 2. Try GET request and abort immediately to read headers only
    try {
      const controller = new AbortController();
      const response = await fetch(urlStr, {
        signal: controller.signal,
        method: 'GET',
      });
      const contentType = response.headers.get('content-type');
      const filename = response.headers.get('content-disposition');
      
      // Abort connection to avoid downloading the body
      controller.abort();
      
      return { contentType, filename };
    } catch (err: any) {
      // Abort throws an error (AbortError), which is expected if the request was active.
      // We can check if we successfully obtained headers before the abort.
      if (err.name === 'AbortError') {
        // If we got here, it's fine since we aborted intentionally
      }
      return { contentType: null, filename: null };
    }
  }
}
