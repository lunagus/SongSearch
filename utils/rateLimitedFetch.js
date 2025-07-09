export function createRateLimitedFetcher({ requestsPerSecond = 10 } = {}) {
  let lastRequestTime = 0;
  const minInterval = 1000 / requestsPerSecond;

  return async function rateLimitedFetch(requestFn) {
    const now = Date.now();
    const wait = Math.max(0, lastRequestTime + minInterval - now);
    if (wait > 0) await new Promise(res => setTimeout(res, wait));
    lastRequestTime = Date.now();

    while (true) {
      const response = await requestFn();
      if (response.status !== 429) return response;
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      await new Promise(res => setTimeout(res, retryAfter * 1000));
    }
  };
} 