const { chromium } = require('playwright');
const fs = require('fs').promises;

async function interceptCarvanaAPI(searchOptions = {}) {
  console.log('🚗 Intercepting Carvana API calls...\n');
  
  const {
    make = '',
    model = '',
    zipCode = '10001',
    maxPrice = 50000,
    saveResults = true
  } = searchOptions;

  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Storage for intercepted data
    const apiData = {
      searchResults: null,
      pricingData: null,
      deliveryInfo: null,
      vehicleDetails: []
    };
    
    // Intercept responses
    page.on('response', async response => {
      const url = response.url();
      
      try {
        // Main search API
        if (url.includes('/merch/search/api/v1/search')) {
          console.log('📡 Intercepted search API response');
          const data = await response.json();
          apiData.searchResults = data;
          console.log(`   Found ${data.vehicles?.length || 0} vehicles`);
          console.log(`   Total inventory: ${data.totalMatchedVehicleCount || 'Unknown'}`);
        }
        
        // Pricing API
        if (url.includes('/merch/search/api/v2/pricing')) {
          console.log('💰 Intercepted pricing API response');
          const data = await response.json();
          apiData.pricingData = data;
        }
        
        // Delivery API
        if (url.includes('/delivery')) {
          console.log('🚚 Intercepted delivery API response');
          const data = await response.json();
          apiData.deliveryInfo = data;
        }
        
        // Suggest filters API (contains vehicle data)
        if (url.includes('/suggest/filters')) {
          console.log('🔍 Intercepted filter suggestions API');
          const data = await response.json();
          if (data.vehicles) {
            console.log(`   Contains ${data.vehicles.length} vehicle suggestions`);
          }
        }
      } catch (e) {
        // Ignore non-JSON responses
      }
    });
    
    // Intercept requests to see what parameters are sent
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/') && request.method() === 'POST') {
        const postData = request.postData();
        if (postData) {
          try {
            const payload = JSON.parse(postData);
            if (url.includes('search')) {
              console.log('\n📤 Search request payload:');
              console.log(`   Filters: ${JSON.stringify(payload.filters || {})}`);
              console.log(`   Sort: ${payload.sortBy}`);
              console.log(`   Limit: ${payload.limit}`);
            }
          } catch (e) {}
        }
      }
    });
    
    // Build search URL
    let searchUrl = 'https://www.carvana.com/cars';
    if (make && model) {
      searchUrl = `https://www.carvana.com/cars/${make.toLowerCase()}-${model.toLowerCase()}`;
    } else if (make) {
      searchUrl = `https://www.carvana.com/cars/${make.toLowerCase()}`;
    }
    
    // Add filters
    const params = new URLSearchParams();
    if (maxPrice) params.append('price', maxPrice);
    if (params.toString()) {
      searchUrl += '?' + params.toString();
    }
    
    console.log(`🌐 Navigating to: ${searchUrl}\n`);
    
    // Navigate and wait for API calls
    await page.goto(searchUrl, { waitUntil: 'networkidle' });
    
    // Wait a bit more for all API calls to complete
    await page.waitForTimeout(5000);
    
    // Try to trigger more results by scrolling
    console.log('📜 Scrolling to load more results...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(3000);
    
    // Extract visible vehicle data from the page
    console.log('\n📊 Extracting visible vehicle data...');
    const pageVehicles = await page.evaluate(() => {
      const vehicles = [];
      const links = document.querySelectorAll('a[href*="/vehicle/"]');
      
      links.forEach(link => {
        const container = link.closest('article') || link.parentElement;
        if (!container) return;
        
        const text = container.innerText;
        const href = link.href;
        const vehicleId = href.match(/vehicle\/(\d+)/)?.[1];
        
        // Extract details from text
        const yearMatch = text.match(/20\d{2}/);
        const priceMatch = text.match(/\$[\d,]+/);
        const milesMatch = text.match(/([\d,]+)\s*(?:k\s*)?miles/i);
        const makeModelMatch = text.match(/20\d{2}\s+(\w+)\s+([A-Za-z0-9\s-]+)/);
        
        if (vehicleId) {
          vehicles.push({
            id: vehicleId,
            url: href,
            year: yearMatch?.[0],
            price: priceMatch?.[0],
            miles: milesMatch?.[1],
            make: makeModelMatch?.[1],
            model: makeModelMatch?.[2]?.trim(),
            fullText: text.replace(/\n/g, ' ').substring(0, 200)
          });
        }
      });
      
      return vehicles;
    });
    
    console.log(`✅ Found ${pageVehicles.length} vehicles on page\n`);
    
    // Display results
    if (pageVehicles.length > 0) {
      console.log('🚗 Sample vehicles:');
      pageVehicles.slice(0, 5).forEach((v, i) => {
        console.log(`\n${i + 1}. ${v.year} ${v.make} ${v.model}`);
        console.log(`   ID: ${v.id}`);
        console.log(`   Price: ${v.price}`);
        console.log(`   Miles: ${v.miles}`);
        console.log(`   URL: ${v.url}`);
      });
    }
    
    // Save all data
    if (saveResults) {
      const allData = {
        timestamp: new Date().toISOString(),
        searchUrl,
        searchOptions,
        pageVehicles,
        apiData,
        totalVehiclesFound: pageVehicles.length
      };
      
      await fs.writeFile('carvana-intercepted-data.json', JSON.stringify(allData, null, 2));
      console.log('\n💾 All data saved to carvana-intercepted-data.json');
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser staying open for 20 seconds...');
    console.log('Check Network tab in DevTools to see all API calls');
    await page.waitForTimeout(20000);
    
    return { pageVehicles, apiData };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Example: Search for specific vehicles and intercept API
(async () => {
  try {
    // Search for Toyota Camry
    console.log('🔍 Example 1: Toyota Camry\n');
    await interceptCarvanaAPI({
      make: 'Toyota',
      model: 'Camry',
      maxPrice: 30000
    });
    
    // Uncomment to search for other vehicles:
    // await interceptCarvanaAPI({ make: 'Honda', model: 'Accord' });
    // await interceptCarvanaAPI({ make: 'Tesla' });
    
  } catch (error) {
    console.error('Final error:', error.message);
  }
})();