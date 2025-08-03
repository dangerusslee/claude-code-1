const https = require('https');
const fs = require('fs').promises;

// Direct API access to Carvana's search API
async function searchCarvanaAPI(options = {}) {
  console.log('🚗 Accessing Carvana API directly...\n');
  
  const {
    make = '',
    model = '',
    minPrice = 0,
    maxPrice = 100000,
    minYear = 2010,
    maxYear = 2025,
    limit = 20,
    offset = 0
  } = options;

  // Carvana's search API endpoint
  const searchPayload = {
    analyticsData: {
      browser: "Chrome",
      clientId: "srp_ui",
      deviceName: "",
      isFirstActiveSearchSession: false,
      isMobileDevice: false,
      refSource: "home",
      requestSourceLabel: "ui_user_event",
      sessionId: Date.now().toString(),
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    applyVerboseLogging: false,
    browserCookieId: generateUUID(),
    clientName: "srp_ui",
    filters: {
      makes: make ? [make] : [],
      models: model ? [model] : [],
      minPrice: minPrice,
      maxPrice: maxPrice,
      minYear: minYear,
      maxYear: maxYear
    },
    limit: limit,
    offset: offset,
    sortBy: "BestMatch",
    userFlowType: "Search"
  };

  const options_req = {
    hostname: 'apik.carvana.io',
    path: '/merch/search/api/v1/suggest/filters',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://www.carvana.com',
      'Referer': 'https://www.carvana.com/'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options_req, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ API Response Status: ${res.statusCode}`);
          
          if (result.vehicles) {
            console.log(`📊 Found ${result.vehicles.length} vehicles\n`);
            
            // Display results
            result.vehicles.forEach((vehicle, i) => {
              console.log(`${i + 1}. ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
              console.log(`   Price: $${vehicle.price?.toLocaleString() || 'N/A'}`);
              console.log(`   Miles: ${vehicle.mileage?.toLocaleString() || 'N/A'}`);
              console.log(`   VIN: ${vehicle.vin}`);
              console.log(`   Stock: ${vehicle.stockNumber}`);
              console.log(`   Link: https://www.carvana.com/vehicle/${vehicle.stockNumber}`);
              console.log('');
            });
            
            // Save full results
            fs.writeFile('carvana-api-results.json', JSON.stringify(result, null, 2))
              .then(() => console.log('💾 Full results saved to carvana-api-results.json'));
          }
          
          resolve(result);
        } catch (error) {
          console.error('❌ Error parsing response:', error.message);
          console.log('Raw response:', data.substring(0, 500));
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(JSON.stringify(searchPayload));
    req.end();
  });
}

// Alternative: Try the pricing API with vehicle IDs
async function getPricingInfo(vehicleIds) {
  console.log('💰 Getting pricing info for vehicles...\n');
  
  const payload = {
    applyVerboseLogging: false,
    browserCookieId: generateUUID(),
    vehicleIds: vehicleIds
  };

  const options = {
    hostname: 'apik.carvana.io',
    path: '/merch/search/api/v2/pricing',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://www.carvana.com',
      'Referer': 'https://www.carvana.com/'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ Pricing API Response Status: ${res.statusCode}`);
          console.log('Pricing data:', result);
          resolve(result);
        } catch (error) {
          console.error('❌ Error parsing pricing response:', error.message);
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Helper function to generate UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Main execution
(async () => {
  try {
    // Search for Toyota Camry
    console.log('🔍 Searching for Toyota Camry...\n');
    await searchCarvanaAPI({
      make: 'Toyota',
      model: 'Camry',
      minYear: 2018,
      maxYear: 2024,
      limit: 10
    });
    
    // Try pricing API with sample vehicle IDs from the screenshot
    console.log('\n💰 Testing pricing API...\n');
    await getPricingInfo([3751518, 3764226, 3490827]);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    console.log('\n💡 If the API fails, it might be because:');
    console.log('1. CORS restrictions (need proper headers)');
    console.log('2. Authentication required (session cookies)');
    console.log('3. Rate limiting');
    console.log('4. API changes');
    
    console.log('\n🔧 Alternative: Use Playwright to intercept API responses');
  }
})();