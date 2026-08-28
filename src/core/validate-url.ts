export function validateUrl(urlStr: string): URL {
  if (!urlStr) {
    throw new Error('URL is required');
  }

  let url: URL;
  try {
    url = new URL(urlStr);
  } catch (err) {
    throw new Error(`Invalid URL structure: "${urlStr}". Ensure you include the protocol (e.g., https://)`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: "${url.protocol}". Only HTTP and HTTPS protocols are supported.`);
  }

  return url;
}
