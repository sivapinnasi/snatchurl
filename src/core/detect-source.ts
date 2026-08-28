import { validateUrl } from './validate-url.js';
import { findProvider, MediaInfo } from '../providers/index.js';

export interface DetectionResult {
  providerName: string;
  mediaInfo: MediaInfo;
}

export async function detectSource(urlStr: string): Promise<DetectionResult> {
  const url = validateUrl(urlStr);
  const provider = findProvider(url);
  const mediaInfo = await provider.resolve(urlStr);
  
  return {
    providerName: provider.name,
    mediaInfo,
  };
}
