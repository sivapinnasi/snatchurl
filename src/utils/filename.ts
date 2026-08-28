import path from 'path';

const MIME_MAP: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/ogg': '.ogv',
  'video/quicktime': '.mov',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'audio/webm': '.weba',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'text/html': '.html',
  'text/plain': '.txt',
  'application/json': '.json'
};

export function parseContentDisposition(header: string): string | null {
  if (!header) return null;
  
  // RFC 6266 filename* parameter
  const utf8Match = header.match(/filename\*=\s*utf-8''([^;\n]*)/i);
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // Decode error, fallback to normal filename match
    }
  }
  
  // Standard filename parameter
  const standardMatch = header.match(/filename=\s*["']?([^;"'\n]+)["']?/i);
  if (standardMatch && standardMatch[1]) {
    return standardMatch[1].trim();
  }
  
  return null;
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '_') // Replace invalid OS chars with underscore
    .replace(/\s+/g, ' ')          // Collapse multi-spaces
    .trim();
}

export function getSafeFilename(options: {
  url: string;
  suggestedName?: string;
  contentDisposition?: string;
  contentType?: string;
}): string {
  let name = '';
  let ext = '';

  // 1. User suggested name
  if (options.suggestedName) {
    const parsed = path.parse(options.suggestedName);
    name = parsed.name;
    ext = parsed.ext; // Preserve provided extension if any
  }

  // 2. Content-Disposition header
  if (!name && options.contentDisposition) {
    const filenameFromHeader = parseContentDisposition(options.contentDisposition);
    if (filenameFromHeader) {
      const parsed = path.parse(filenameFromHeader);
      name = parsed.name;
      ext = parsed.ext;
    }
  }

  // 3. Fallback to URL path base
  if (!name) {
    try {
      const urlObj = new URL(options.url);
      const pathname = decodeURIComponent(urlObj.pathname);
      const base = path.basename(pathname);
      if (base && base !== '/' && !base.startsWith('.')) {
        const parsed = path.parse(base);
        name = parsed.name;
        ext = parsed.ext;
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  // 4. Default fallback name
  if (!name) {
    name = `download_${Math.floor(Date.now() / 1000)}`;
  }

  // 5. Map content type to extension if not resolved yet
  if (!ext && options.contentType) {
    const cleanType = options.contentType.split(';')[0].trim().toLowerCase();
    ext = MIME_MAP[cleanType] || '';
  }

  const safeName = sanitizeFilename(name);
  return ext ? `${safeName}${ext}` : safeName;
}
