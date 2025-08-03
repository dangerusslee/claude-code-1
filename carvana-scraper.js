const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin
chromium.use(StealthPlugin());

async function scrapeCarvana(options = {}) {
  const {
    headless = false,
    searchUrl = 'https://www.carvana.com/cars',
    maxRetries = 3,
    timeout = 60000
  } = options;

  console.log('🚗 Starting Carvana scraper...');
  
  let browser;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`\n📍 Attempt ${attempt}/${maxRetries}`);
      
      // Launch browser with anti-detection measures
      browser = await chromium.launch({
        headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--disable-features=CrossSiteDocumentBlockingAlways,CrossSiteDocumentBlockingIfIsolating',
          '--disable-site-isolation-trials',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--window-size=1920,1080',
          '--start-maximized'
        ]
      });

      // Create context with realistic settings
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        geolocation: { latitude: 40.7128, longitude: -74.0060 }, // New York
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="121", "Google Chrome";v="121"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const page = await context.newPage();
      
      // Override navigator properties
      await page.evaluateOnNewDocument(() => {
        // Override webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
        
        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        });
        
        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );
      });

      console.log('🌐 Navigating to Carvana...');
      
      // Navigate with multiple strategies
      const response = await page.goto(searchUrl, { 
        waitUntil: 'networkidle',
        timeout 
      });
      
      console.log(`📊 Response status: ${response.status()}`);
      console.log(`🔗 Current URL: ${page.url()}`);
      
      // Check for Cloudflare challenge
      await page.waitForTimeout(3000); // Initial wait
      
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
      
      // Look for signs of Cloudflare
      const pageContent = await page.textContent('body').catch(() => '');
      
      if (pageContent.includes('Checking your browser') || 
          pageContent.includes('Just a moment') ||
          title.includes('Just a moment')) {
        console.log('⚠️  Cloudflare challenge detected!');
        console.log('⏳ Waiting for challenge to complete...');
        
        // Wait for challenge to resolve
        await page.waitForFunction(
          () => !document.title.includes('Just a moment'),
          { timeout: 30000 }
        ).catch(() => console.log('⏱️  Challenge timeout'));
        
        // Additional wait
        await page.waitForTimeout(5000);
      }
      
      // Try to detect if we're on the actual Carvana site
      const finalUrl = page.url();
      const finalTitle = await page.title();
      
      if (finalUrl.includes('carvana.com') && !finalTitle.includes('Just a moment')) {
        console.log('✅ Successfully accessed Carvana!');
        
        // Wait for content to load
        await page.waitForSelector('[data-qa*="vehicle"], [data-qa*="car"], .vehicle-card, .inventory-listing', 
          { timeout: 10000 }
        ).catch(() => console.log('⚠️  Could not find vehicle selectors'));
        
        // Try multiple selectors for vehicles
        const vehicleSelectors = [
          '[data-qa="inventory-listing"]',
          '[data-qa="vehicle-card"]',
          '.vehicle-card',
          '.inventory-listing',
          '[class*="vehicle"]',
          '[class*="car-tile"]',
          'article[data-qa*="vehicle"]'
        ];
        
        let vehicles = [];
        for (const selector of vehicleSelectors) {
          vehicles = await page.$$(selector).catch(() => []);
          if (vehicles.length > 0) {
            console.log(`✅ Found ${vehicles.length} vehicles using selector: ${selector}`);
            break;
          }
        }
        
        if (vehicles.length === 0) {
          console.log('❌ No vehicles found with any selector');
          // Take screenshot for debugging
          await page.screenshot({ path: `carvana-content-${attempt}.png`, fullPage: true });
          console.log(`📸 Screenshot saved as carvana-content-${attempt}.png`);
        }
        
        // Extract some vehicle data if found
        if (vehicles.length > 0) {
          console.log('\n🚗 Sample vehicle data:');
          const vehicleData = await page.evaluate(() => {
            const items = document.querySelectorAll('[data-qa*="vehicle"], .vehicle-card, [class*="vehicle"]');
            return Array.from(items).slice(0, 3).map(item => ({
              text: item.innerText?.slice(0, 100),
              classes: item.className
            }));
          });
          console.log(vehicleData);
        }
        
        await browser.close();
        return { success: true, vehicleCount: vehicles.length };
        
      } else {
        console.log('❌ Failed to bypass Cloudflare protection');
        await page.screenshot({ path: `carvana-blocked-${attempt}.png` });
        console.log(`📸 Screenshot saved as carvana-blocked-${attempt}.png`);
      }
      
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (browser) {
        await browser.close().catch(() => {});
      }
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      console.log(`⏳ Waiting 5 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Alternative approach using direct API investigation
async function investigateCarvanaAPI() {
  console.log('\n🔍 Investigating Carvana API endpoints...');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Monitor network requests
  const apiCalls = [];
  page.on('request', request => {
    const url = request.url();
    if (url.includes('api') || url.includes('graphql') || url.includes('inventory')) {
      apiCalls.push({
        url,
        method: request.method(),
        headers: request.headers()
      });
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('api') || url.includes('graphql') || url.includes('inventory')) {
      console.log(`📡 API Response: ${response.status()} - ${url}`);
    }
  });
  
  try {
    await page.goto('https://www.carvana.com/cars/filters', { 
      waitUntil: 'networkidle' 
    });
    
    await page.waitForTimeout(10000);
    
    console.log('\n📊 Captured API calls:');
    apiCalls.forEach(call => {
      console.log(`- ${call.method} ${call.url}`);
    });
    
  } catch (error) {
    console.error('Error investigating API:', error.message);
  }
  
  console.log('\n💡 Keep DevTools open to inspect network traffic manually');
  console.log('Press Ctrl+C to close when done...');
  
  // Keep browser open for manual inspection
  await new Promise(() => {});
}

// Run the scraper
(async () => {
  try {
    // Try stealth scraping first
    await scrapeCarvana({ headless: false });
    
    // Uncomment to investigate API endpoints
    // await investigateCarvanaAPI();
    
  } catch (error) {
    console.error('❌ Final error:', error.message);
    
    console.log('\n💡 Suggestions:');
    console.log('1. Try using a residential proxy');
    console.log('2. Consider using a web scraping API service');
    console.log('3. Check if Carvana has an official API or data partnership');
    console.log('4. Use the investigateCarvanaAPI() function to find API endpoints');
  }
})();