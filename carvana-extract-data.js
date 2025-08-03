const { chromium } = require('playwright');

async function extractCarvanaInventory() {
  console.log('🚗 Extracting Carvana inventory data...\n');
  
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Monitor API calls
    const apiCalls = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('api') || url.includes('graphql') || url.includes('search')) {
        console.log(`📡 API Request: ${request.method()} ${url.substring(0, 100)}...`);
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });
    
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('api') && url.includes('search')) {
        console.log(`📥 API Response: ${response.status()} ${url.substring(0, 100)}...`);
        try {
          const json = await response.json();
          console.log(`   Found ${json.vehicles?.length || 0} vehicles in response`);
        } catch (e) {}
      }
    });
    
    console.log('📡 Navigating to Carvana inventory...');
    await page.goto('https://www.carvana.com/cars', {
      waitUntil: 'networkidle'
    });
    
    // Wait for inventory to load
    console.log('⏳ Waiting for inventory to load...');
    
    // Try multiple selectors
    const selectors = [
      '[data-test="InventoryCard"]',
      '[data-qa^="vehicle-card"]',
      'article[data-qa*="tile"]',
      '.inventory-card',
      '[class*="vehicle-tile"]',
      'a[href^="/vehicle/"]'
    ];
    
    let vehicleElements = [];
    let usedSelector = '';
    
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        vehicleElements = await page.$$(selector);
        if (vehicleElements.length > 0) {
          usedSelector = selector;
          console.log(`✅ Found ${vehicleElements.length} vehicles using selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (vehicleElements.length === 0) {
      console.log('❌ No vehicles found with standard selectors');
      
      // Try to find any links to vehicles
      const vehicleLinks = await page.$$eval('a[href*="/vehicle/"]', links => 
        links.map(link => ({
          href: link.href,
          text: link.innerText
        }))
      );
      
      console.log(`Found ${vehicleLinks.length} vehicle links`);
      if (vehicleLinks.length > 0) {
        console.log('Sample links:', vehicleLinks.slice(0, 3));
      }
    }
    
    // Extract vehicle data
    console.log('\n📊 Extracting vehicle data...');
    
    const vehicles = await page.evaluate((selector) => {
      const elements = document.querySelectorAll(selector || 'a[href*="/vehicle/"]');
      return Array.from(elements).slice(0, 10).map(el => {
        // Try to extract as much data as possible
        const link = el.href || el.querySelector('a')?.href;
        const allText = el.innerText || '';
        const lines = allText.split('\n').filter(line => line.trim());
        
        // Common patterns in car listings
        const yearMatch = allText.match(/20\d{2}/);
        const priceMatch = allText.match(/\$[\d,]+/);
        const milesMatch = allText.match(/([\d,]+)\s*mi/i);
        
        return {
          link: link,
          year: yearMatch ? yearMatch[0] : null,
          price: priceMatch ? priceMatch[0] : null,
          miles: milesMatch ? milesMatch[1] : null,
          title: lines[0] || 'Unknown',
          fullText: lines.slice(0, 5).join(' | ')
        };
      });
    }, usedSelector);
    
    console.log(`\n🚗 Found ${vehicles.length} vehicles:\n`);
    vehicles.forEach((vehicle, i) => {
      console.log(`${i + 1}. ${vehicle.title}`);
      console.log(`   Year: ${vehicle.year || 'N/A'}`);
      console.log(`   Price: ${vehicle.price || 'N/A'}`);
      console.log(`   Miles: ${vehicle.miles || 'N/A'}`);
      console.log(`   Link: ${vehicle.link || 'N/A'}`);
      console.log('');
    });
    
    // Look for API endpoints in captured calls
    console.log('\n📡 Captured API calls:');
    const uniqueApis = [...new Set(apiCalls.map(call => {
      const url = new URL(call.url);
      return `${call.method} ${url.pathname}`;
    }))];
    
    uniqueApis.forEach(api => console.log(`   ${api}`));
    
    // Find GraphQL or search APIs
    const searchApis = apiCalls.filter(call => 
      call.url.includes('search') || 
      call.url.includes('graphql') || 
      call.url.includes('inventory')
    );
    
    if (searchApis.length > 0) {
      console.log('\n🔍 Interesting API endpoints found:');
      searchApis.forEach(api => {
        console.log(`\n   ${api.method} ${api.url}`);
        if (api.postData) {
          console.log(`   Body: ${api.postData.substring(0, 200)}...`);
        }
      });
    }
    
    // Save data
    const fs = require('fs').promises;
    await fs.writeFile('carvana-vehicles.json', JSON.stringify(vehicles, null, 2));
    console.log('\n💾 Data saved to carvana-vehicles.json');
    
    // Keep browser open for inspection
    console.log('\n🔍 Browser will stay open for 30 seconds for inspection...');
    console.log('Check Network tab in DevTools to see API calls');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Search for specific vehicle
async function searchCarvanaVehicle(make, model) {
  console.log(`🔍 Searching for ${make} ${model} on Carvana...\n`);
  
  const browser = await chromium.launch({
    headless: false
  });
  
  try {
    const page = await browser.newPage();
    
    // Go to Carvana with search filters
    const searchUrl = `https://www.carvana.com/cars/${make.toLowerCase()}-${model.toLowerCase()}`;
    console.log(`📡 Navigating to: ${searchUrl}`);
    
    await page.goto(searchUrl, {
      waitUntil: 'networkidle'
    });
    
    // Wait a bit for results
    await page.waitForTimeout(3000);
    
    // Check results count
    const resultsText = await page.textContent('body');
    const resultsMatch = resultsText.match(/(\d+)\s+used/i);
    
    if (resultsMatch) {
      console.log(`✅ Found ${resultsMatch[1]} ${make} ${model} vehicles`);
    }
    
    // Extract first few results
    const vehicles = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('a[href*="/vehicle/"]')).slice(0, 5);
      return items.map(item => ({
        text: item.innerText,
        link: item.href
      }));
    });
    
    console.log('\n🚗 Sample vehicles:');
    vehicles.forEach((v, i) => {
      console.log(`${i + 1}. ${v.text.split('\n')[0]}`);
      console.log(`   ${v.link}`);
    });
    
    await page.waitForTimeout(5000);
    
  } finally {
    await browser.close();
  }
}

// Main execution
(async () => {
  // Extract general inventory
  await extractCarvanaInventory();
  
  // Search for specific vehicle
  // await searchCarvanaVehicle('Toyota', 'Camry');
})();