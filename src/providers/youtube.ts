import type { Provider, MediaInfo } from './index.js';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

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

function getBinaryPath(): string {
  const snatchDir = path.join(os.homedir(), '.snatchurl');
  if (!fs.existsSync(snatchDir)) {
    fs.mkdirSync(snatchDir, { recursive: true });
  }
  const isWindows = process.platform === 'win32';
  return path.join(snatchDir, isWindows ? 'yt-dlp.exe' : 'yt-dlp');
}

async function ensureBinary(): Promise<string> {
  const binaryPath = getBinaryPath();
  if (fs.existsSync(binaryPath)) {
    return binaryPath;
  }

  console.log('\n📥  Downloading YouTube helper binary (yt-dlp) from GitHub...');
  
  let downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  if (process.platform === 'win32') {
    downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
  } else if (process.platform === 'darwin') {
    downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
  }

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download YouTube helper binary: HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(binaryPath, Buffer.from(buffer));
  
  if (process.platform !== 'win32') {
    fs.chmodSync(binaryPath, '755'); // Make executable
  }
  
  console.log('✓  Helper binary downloaded successfully.\n');
  return binaryPath;
}

export class YoutubeProvider implements Provider {
  name = 'youtube';

  canHandle(url: URL): boolean {
    const host = url.hostname;
    return host.includes('youtube.com') || host.includes('youtu.be');
  }

  async resolve(urlStr: string): Promise<MediaInfo> {
    const binaryPath = await ensureBinary();
    
    try {
      // 1. Get the direct progressive video URL using -g (with format selection "-f b" to suppress warning and select best pre-merged stream)
      const cmd = `"${binaryPath}" -g -f b "${urlStr}" --no-playlist --no-warnings`;
      const streamUrl = execSync(cmd, { encoding: 'utf8' }).trim();
      
      if (!streamUrl || !streamUrl.startsWith('http')) {
        throw new Error('Could not resolve direct stream link');
      }

      // 2. Get the video title using --get-title
      const titleCmd = `"${binaryPath}" --get-title "${urlStr}" --no-playlist --no-warnings`;
      const title = execSync(titleCmd, { encoding: 'utf8' }).trim() || 'youtube-video';

      return {
        url: streamUrl,
        filename: title,
        contentType: 'video/mp4',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      };
    } catch (err: any) {
      throw new Error(`Failed to resolve YouTube video: ${err.message}`);
    }
  }
}
