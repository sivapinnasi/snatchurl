let isJsonMode = false;

export function setJsonMode(enabled: boolean) {
  isJsonMode = enabled;
}

export function logInfo(message: string, emoji = '🔍') {
  if (isJsonMode) {
    console.log(JSON.stringify({ status: 'info', message }));
  } else {
    console.log(`${emoji}  ${message}`);
  }
}

export function logSuccess(message: string, emoji = '✓') {
  if (isJsonMode) {
    console.log(JSON.stringify({ status: 'success', message }));
  } else {
    console.log(`\x1b[32m${emoji}  ${message}\x1b[0m`);
  }
}

export function logError(message: string, error?: any) {
  const errMsg = error ? `${message}: ${error.message || error}` : message;
  if (isJsonMode) {
    console.error(JSON.stringify({ status: 'error', message: errMsg }));
  } else {
    console.error(`\x1b[31m✗  Error: ${errMsg}\x1b[0m`);
  }
}

let lastProgressPercentage = -1;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function logProgress(current: number, total: number, width = 30) {
  if (total <= 0) {
    if (isJsonMode) {
      if (current !== lastProgressPercentage) {
        console.log(JSON.stringify({ status: 'progress', current, total: 0 }));
        lastProgressPercentage = current;
      }
    } else {
      process.stdout.write(`\r⬇️  Downloading... ${formatBytes(current)}`);
    }
    return;
  }

  const percentage = Math.min(100, Math.max(0, Math.floor((current / total) * 100)));

  if (isJsonMode) {
    // Only log JSON progress if the percentage has changed to avoid flooding stdout
    if (percentage !== lastProgressPercentage) {
      console.log(JSON.stringify({ status: 'progress', current, total, percentage }));
      lastProgressPercentage = percentage;
    }
  } else {
    const filledLength = Math.round((width * percentage) / 100);
    const emptyLength = width - filledLength;
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    
    // Clear current line and write progress with byte counts
    process.stdout.write(`\r⬇️  Downloading... [${filled}${empty}] ${percentage}% (${formatBytes(current)} / ${formatBytes(total)})`);
    if (current >= total) {
      process.stdout.write('\n');
    }
  }
}

export function endProgress(finalBytes?: number) {
  if (isJsonMode) {
    if (finalBytes !== undefined) {
      console.log(JSON.stringify({ status: 'progress', current: finalBytes, total: finalBytes, percentage: 100 }));
    }
  } else {
    process.stdout.write('\n');
  }
}

