// utils/browserlessContext.js
import { chromium } from 'playwright-core';
// If you want stealth, you can use playwright-extra and a stealth plugin here
// import { chromium } from 'playwright-extra';
// import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// chromium.use(StealthPlugin());

let browser;
let isConnecting = false;

const DEFAULT_TIMEOUT = 30000; // Increased timeout

// Function to get the WebSocket endpoint with current API key
function getWSEndpoint() {
  const apiKey = process.env.BROWSERLESS_API_KEY;
  if (!apiKey) {
    throw new Error('BROWSERLESS_API_KEY not found in environment variables');
  }
  console.log('[Browserless] Using API key:', apiKey.substring(0, 10) + '...');
  return `wss://production-sfo.browserless.io?token=${apiKey}`;
}

export async function getBrowserlessContext(options = {}) {
  if (!browser && !isConnecting) {
    isConnecting = true;
    try {
      browser = await withRetry(async () => {
        console.log('[Browserless] Connecting...');
        const wsEndpoint = getWSEndpoint();
        console.log('[Browserless] WebSocket endpoint:', wsEndpoint.substring(0, 50) + '...');
        
        const newBrowser = await chromium.connectOverCDP({ 
          wsEndpoint,
          timeout: DEFAULT_TIMEOUT
        });
        
        // Add error handlers to the browser
        newBrowser.on('disconnected', () => {
          console.warn('[Browserless] Browser disconnected');
          browser = null;
        });
        
        return newBrowser;
      });
      console.log('[Browserless] Connected and cached.');
    } catch (error) {
      console.error('[Browserless] Failed to connect:', error.message);
      isConnecting = false;
      throw error;
    } finally {
      isConnecting = false;
    }
  }

  if (!browser) {
    throw new Error('Failed to establish browser connection');
  }

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      ...options,
    });

    // Add error handlers to the context
    context.on('close', () => {
      console.log('[Browserless] Context closed');
    });

    return context;
  } catch (error) {
    console.error('[Browserless] Failed to create context:', error.message);
    // If context creation fails, reset browser and retry once
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.warn('[Browserless] Error closing browser:', closeError.message);
      }
      browser = null;
    }
    throw error;
  }
}

async function withRetry(fn, retries = 3, delay = 5000) {
  let lastError;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`[Browserless] Attempt ${i + 1} failed:`, err.message);
      
      if (i < retries) {
        if (err.message && err.message.includes('429')) {
          console.warn(`[Browserless] 429 detected, retrying in ${delay / 1000}s...`);
        } else {
          console.warn(`[Browserless] Retrying in ${delay / 1000}s...`);
        }
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError;
}

// Cleanup function for graceful shutdown
export async function cleanupBrowser() {
  if (browser) {
    try {
      await browser.close();
      console.log('[Browserless] Browser closed successfully');
    } catch (error) {
      console.warn('[Browserless] Error during cleanup:', error.message);
    } finally {
      browser = null;
    }
  }
} 