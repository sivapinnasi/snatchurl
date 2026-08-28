# graburl

A lightweight, zero-dependency CLI URL downloader framework for Node.js.

## Features

- 🚀 **Zero external production dependencies**: Leverages standard Node.js streaming HTTP clients.
- 🔄 **Redirection Handling**: Seamlessly follows standard HTTP redirects (up to configurable limits).
- 📊 **Animated CLI Progress Bar**: Beautiful real-time progress bar (`██████████░░░░░░ 60%`) including current and total sizes.
- ⚙️ **JSON Output Mode**: Output events as structured JSON lines (`--json`) for machine consumption.
- 🧩 **Provider-Based Architecture**: Designed to easily extend and route to platform-specific adapters (YouTube, Instagram, etc.) in subsequent releases.

## Installation

### Globally or Locally via NPM
```bash
npm install -g graburl
```

### Or run directly with npx
```bash
npx graburl <url>
```

## CLI Usage

### Basic usage
```bash
npx graburl "https://example.com/video.mp4"
```

### Options
```bash
# Save to a specific folder
npx graburl "https://example.com/video.mp4" --output ./my-videos

# Rename the downloaded file
npx graburl "https://example.com/video.mp4" --filename sample-video

# Output progress and events as JSON lines
npx graburl "https://example.com/video.mp4" --json
```

## Programmatic API Usage

```typescript
import { downloadFile, detectSource } from 'graburl';

// 1. Detect source
const { providerName, mediaInfo } = await detectSource('https://example.com/file.zip');
console.log(`Detected: ${mediaInfo.contentType} via provider: ${providerName}`);

// 2. Download file
const result = await downloadFile(mediaInfo.url, {
  outputDir: './downloads',
  filename: mediaInfo.filename,
  onProgress: (current, total) => {
    const percent = total > 0 ? `${Math.round((current / total) * 100)}%` : `${current} bytes`;
    console.log(`Downloaded ${percent}`);
  }
});

console.log(`Saved to ${result.filePath}`);
```

## License

MIT
