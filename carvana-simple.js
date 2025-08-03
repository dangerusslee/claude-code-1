const { chromium } = require('playwright');

async function scrapeCarvanaWithProxy() {
  console.log('🚗 Testing Carvana access...\n');
  
  // Different approaches to try
  const approaches = [
    {
      name: 'Standard Playwright',
      config: {
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
      }
    },
    {
      name: 'With more anti-detection flags',
      config: {
        headless: false,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--window-size=1920,1080'
        ]
      }
    },
    {
      name: 'Mobile user agent',
      config: {
        headless: false,
        args: ['--disable-blink-features=AutomationControlled'],
        isMobile: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      }
    }
  ];

  for (const approach of approaches) {
    console.log(`\n🔧 Trying approach: ${approach.name}`);
    
    const browser = await chromium.launch(approach.config);
    
    try {
      const context = await browser.newContext({
        viewport: approach.config.isMobile ? { width: 390, height: 844 } : { width: 1920, height: 1080 },
        userAgent: approach.config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });
      
      const page = await context.newPage();
      
      // Add script to remove webdriver property
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });
      });
      
      console.log('📡 Navigating to Carvana...');
      const response = await page.goto('https://www.carvana.com/cars', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      console.log(`   Status: ${response.status()}`);
      console.log(`   URL: ${page.url()}`);
      
      await page.waitForTimeout(5000);
      
      const title = await page.title();
      console.log(`   Title: ${title}`);
      
      if (title.includes('Just a moment') || title.includes('Checking')) {
        console.log('   ⚠️  Cloudflare detected');
        
        // Wait more to see if it resolves
        await page.waitForTimeout(10000);
        const newTitle = await page.title();
        console.log(`   Title after wait: ${newTitle}`);
        
        if (newTitle.includes('Carvana')) {
          console.log('   ✅ Cloudflare bypassed!');
        }
      } else if (title.includes('Carvana')) {
        console.log('   ✅ Direct access successful!');
      }
      
      // Take screenshot
      const screenshotName = `carvana-${approach.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      await page.screenshot({ path: screenshotName });
      console.log(`   📸 Screenshot: ${screenshotName}`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } finally {
      await browser.close();
    }
  }
  
  console.log('\n\n💡 Additional Options to Consider:');
  console.log('1. Use a residential proxy service (Bright Data, Oxylabs, etc.)');
  console.log('2. Try Carvana\'s mobile API endpoints directly');
  console.log('3. Use a web scraping API service (ScrapingBee, ScrapFly, etc.)');
  console.log('4. Check for Carvana API in their mobile app traffic');
}

// Check for alternative data sources
async function checkAlternatives() {
  console.log('\n\n🔍 Checking alternative car inventory sources...\n');
  
  const alternatives = [
    {
      name: 'NHTSA VIN API (Free)',
      url: 'https://vpic.nhtsa.dot.gov/api/',
      description: 'Free VIN decoder but no inventory'
    },
    {
      name: 'Marketcheck API',
      url: 'https://www.marketcheck.com/apis/',
      description: 'Comprehensive inventory API (paid)'
    },
    {
      name: 'CarQuery API',
      url: 'https://www.carqueryapi.com/',
      description: 'Vehicle specs database'
    },
    {
      name: 'Chrome Data',
      url: 'https://www.chromedata.com/',
      description: 'Enterprise vehicle data'
    }
  ];
  
  console.log('Recommended alternatives to web scraping:');
  alternatives.forEach(alt => {
    console.log(`\n${alt.name}`);
    console.log(`  URL: ${alt.url}`);
    console.log(`  ${alt.description}`);
  });
}

// Run the scraper
(async () => {
  await scrapeCarvanaWithProxy();
  await checkAlternatives();
})();