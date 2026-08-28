import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { getSafeFilename } from '../utils/filename.js';

export interface DownloadResult {
  filePath: string;
  filename: string;
  contentType: string;
  size: number;
}

export interface DownloadOptions {
  outputDir: string;
  filename?: string;
  onProgress?: (downloaded: number, total: number) => void;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

async function getStream(
  urlStr: string,
  redirectCount = 0,
  maxRedirects = 5,
  customHeaders?: Record<string, string>
): Promise<{
  response: http.IncomingMessage;
  finalUrl: string;
}> {
  if (redirectCount > maxRedirects) {
    throw new Error(`Too many redirects (limit is ${maxRedirects})`);
  }

  const url = new URL(urlStr);
  const client = url.protocol === 'https:' ? https : http;

  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const headers = { ...defaultHeaders, ...customHeaders };
  const requestOptions = {
    method: 'GET',
    headers,
    timeout: 30000,
  };

  return new Promise((resolve, reject) => {
    const req = client.request(url, requestOptions, (res) => {
      const statusCode = res.statusCode || 0;

      // Handle redirect status codes (301, 302, 303, 307, 308)
      if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, urlStr).toString();
        res.resume(); // Consume the stream
        resolve(getStream(redirectUrl, redirectCount + 1, maxRedirects, customHeaders));
        return;
      }

      // Handle other non-2xx status codes
      if (statusCode < 200 || statusCode >= 300) {
        res.resume();
        reject(new Error(`Failed to download. Server returned status code: ${statusCode}`));
        return;
      }

      resolve({ response: res, finalUrl: urlStr });
    });

    req.on('error', (err) => {
      reject(err);
    });

    // Set a timeout of 30 seconds for the request
    req.setTimeout(30000, () => {
      req.destroy(new Error('Connection timeout (30 seconds)'));
    });

    req.end();
  });
}

export async function downloadFile(urlStr: string, options: DownloadOptions): Promise<DownloadResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  const { response, finalUrl } = await getStream(urlStr, 0, maxRedirects, options.headers);

  const contentType = response.headers['content-type'] || 'application/octet-stream';
  const contentDisposition = response.headers['content-disposition'];
  const contentLength = parseInt(response.headers['content-length'] || '0', 10);

  const filename = getSafeFilename({
    url: finalUrl,
    suggestedName: options.filename,
    contentDisposition,
    contentType,
  });

  // Ensure target folder exists
  const absoluteDir = path.resolve(options.outputDir);
  if (!fs.existsSync(absoluteDir)) {
    fs.mkdirSync(absoluteDir, { recursive: true });
  }

  const destPath = path.join(absoluteDir, filename);
  const fileStream = fs.createWriteStream(destPath);
  let downloadedBytes = 0;

  return new Promise<DownloadResult>((resolve, reject) => {
    response.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      if (options.onProgress) {
        options.onProgress(downloadedBytes, contentLength);
      }
    });

    response.pipe(fileStream);

    fileStream.on('finish', () => {
      fileStream.close();
      resolve({
        filePath: destPath,
        filename,
        contentType,
        size: downloadedBytes,
      });
    });

    const cleanupOnError = (err: Error) => {
      fileStream.close();
      fs.unlink(destPath, () => {
        // Suppress unlink errors if file didn't exist
      });
      reject(err);
    };

    fileStream.on('error', cleanupOnError);
    response.on('error', cleanupOnError);
  });
}
