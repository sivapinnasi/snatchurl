#!/usr/bin/env node

import { detectSource } from '../core/detect-source.js';
import { downloadFile } from '../core/download.js';
import * as logger from '../utils/logger.js';
import path from 'path';
import os from 'os';
import readline from 'readline';

const VERSION = '0.2.0';

function getDefaultDownloadsDir(): string {
  return path.join(os.homedir(), 'Downloads');
}

function showBanner() {
  console.log(`\x1b[36m%s\x1b[0m`, `
  ███████╗███╗   ██╗ █████╗ ████████╗ ██████╗██╗  ██╗██╗   ██╗██████╗ ██╗     
  ██╔════╝████╗  ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║██║   ██║██╔══██╗██║     
  ███████╗██╔██╗ ██║███████║   ██║   ██║     ███████║██║   ██║██████╔╝██║     
  ╚════██║██║╚██╗██║██╔══██║   ██║   ██║     ██╔══██║██║   ██║██╔══██╗██║     
  ██████╔╝██║ ╚████║██║  ██║   ██║   ╚██████╗██║  ██║╚██████╔╝██║  ██║███████╗
  ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝
           Universal CLI Media Downloader - v${VERSION}
           Developed & Maintained by siva kumar pinnasi
           GitHub: https://github.com/sivapinnas
           LinkedIn: https://www.linkedin.com/in/pinnasi/
  `);
}

function showHelp() {
  console.log(`
Usage: snatchurl <url> [options]

Options:
  -o, --output <dir>    Specify output directory (default: OS Downloads folder)
  -f, --filename <name> Specify target filename
  -a, --audio           Download/extract audio only (not supported in v0.2.0)
  -j, --json            Output logs as structured JSON lines
  -v, --version         Show version
  -h, --help            Show help
`);
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION);
    process.exit(0);
  }

  const isInteractive = args.length === 0;

  let url: string | null = null;
  let outputDir = getDefaultDownloadsDir();
  let filename: string | undefined;
  let audio = false;
  let json = false;

  if (!isInteractive) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--output' || arg === '-o') {
        outputDir = args[++i];
        if (!outputDir) {
          console.error('Error: Option --output requires an directory path.');
          process.exit(1);
        }
      } else if (arg === '--filename' || arg === '-f') {
        filename = args[++i];
        if (!filename) {
          console.error('Error: Option --filename requires a filename.');
          process.exit(1);
        }
      } else if (arg === '--audio' || arg === '-a') {
        audio = true;
      } else if (arg === '--json' || arg === '-j') {
        json = true;
      } else if (arg.startsWith('-')) {
        console.error(`Error: Unknown option "${arg}".`);
        showHelp();
        process.exit(1);
      } else {
        url = arg;
      }
    }

    if (json) {
      logger.setJsonMode(true);
    } else {
      showBanner();
    }

    if (!url) {
      logger.logError('Missing required URL argument.');
      showHelp();
      process.exit(1);
    }

    if (audio) {
      logger.logError('Audio extraction is not supported in v0.2.0. It will be added in a future release.');
      process.exit(1);
    }

    try {
      logger.logInfo('Detecting content...', '🔍');
      const { providerName, mediaInfo } = await detectSource(url);
      
      const detectedType = mediaInfo.contentType || 'unknown media';
      logger.logInfo(`Found: ${detectedType} (via ${providerName} provider)`, '📦');

      if (!mediaInfo.url) {
        throw new Error('Provider failed to resolve media URL');
      }

      const downloadResult = await downloadFile(mediaInfo.url, {
        outputDir,
        filename: filename || mediaInfo.filename,
        headers: mediaInfo.headers,
        onProgress: (current, total) => {
          logger.logProgress(current, total);
        },
      });

      logger.endProgress(downloadResult.size);
      logger.logSuccess(`Saved to ${downloadResult.filePath}`, '✓');
      process.exit(0);
    } catch (error: any) {
      logger.logError('Failed to download content', error);
      process.exit(1);
    }
  } else {
    // Interactive Mode Loop
    showBanner();
    
    while (true) {
      console.log(`\x1b[1mPlease select the social media app/source:\x1b[0m`);
      console.log(`  1) YouTube`);
      console.log(`  2) Instagram`);
      console.log(`  3) Other / Direct Media URL`);
      console.log();

      const choice = await askQuestion('Select option (1-3): ');
      
      if (choice !== '1' && choice !== '2' && choice !== '3') {
        console.log('\x1b[31mError: Invalid option selected. Please select 1, 2, or 3.\x1b[0m\n');
        continue;
      }

      let appLabel = 'Direct/Webpage';
      if (choice === '1') appLabel = 'YouTube';
      if (choice === '2') appLabel = 'Instagram';

      const inputtedUrl = await askQuestion(`\nPaste the ${appLabel} URL: `);
      if (!inputtedUrl) {
        console.log('\x1b[31mError: URL cannot be empty.\x1b[0m\n');
        continue;
      }
      
      try {
        console.log(); // Spacing
        logger.logInfo('Detecting content...', '🔍');
        const { providerName, mediaInfo } = await detectSource(inputtedUrl);
        
        const detectedType = mediaInfo.contentType || 'unknown media';
        logger.logInfo(`Found: ${detectedType} (via ${providerName} provider)`, '📦');

        if (!mediaInfo.url) {
          throw new Error('Provider failed to resolve media URL');
        }

        const downloadResult = await downloadFile(mediaInfo.url, {
          outputDir,
          filename: filename || mediaInfo.filename,
          headers: mediaInfo.headers,
          onProgress: (current, total) => {
            logger.logProgress(current, total);
          },
        });

        logger.endProgress(downloadResult.size);
        logger.logSuccess(`Saved to ${downloadResult.filePath}`, '✓');
        
        const another = await askQuestion('\nDo you want to download another URL? (y/N): ');
        if (another.toLowerCase() === 'y') {
          console.log('\n----------------------------------------\n');
          continue;
        }
        process.exit(0);
      } catch (error: any) {
        logger.logError('Failed to download content', error);
        console.log('\n\x1b[33mPlease try entering the details again.\x1b[0m\n');
      }
    }
  }
}

main();
