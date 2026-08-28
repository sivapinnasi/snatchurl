import { YoutubeProvider } from './youtube.js';
import { InstagramProvider } from './instagram.js';
import { OpengraphProvider } from './opengraph.js';
import { GenericProvider } from './generic.js';

export interface MediaInfo {
  url: string;
  filename?: string;
  contentType?: string;
}

export interface Provider {
  name: string;
  canHandle(url: URL): boolean;
  resolve(url: string): Promise<MediaInfo>;
}

export const PROVIDERS: Provider[] = [
  new YoutubeProvider(),
  new InstagramProvider(),
  new GenericProvider(),
  new OpengraphProvider(),
];

export function findProvider(url: URL): Provider {
  for (const provider of PROVIDERS) {
    if (provider.canHandle(url)) {
      return provider;
    }
  }
  return new GenericProvider();
}
