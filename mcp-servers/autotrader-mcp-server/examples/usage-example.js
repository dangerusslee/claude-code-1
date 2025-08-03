#!/usr/bin/env node

/**
 * AutoTrader MCP Server Usage Example
 * 
 * This example demonstrates how to use the AutoTrader MCP server
 * to search for vehicles, filter results, and get detailed information.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPClient {
  constructor() {
    this.server = null;
    this.requestId = 1;
  }

  async start() {
    const serverPath = join(__dirname, '../src/index.js');
    this.server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Initialize the MCP server
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'autotrader-example',
        version: '1.0.0'
      }
    });

    await this.sendRequest('initialized', {});
  }

  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    this.server.stdin.write(JSON.stringify(request) + '\n');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      const onData = (data) => {
        try {
          const response = JSON.parse(data.toString().trim());
          if (response.id === request.id) {
            clearTimeout(timeout);
            this.server.stdout.off('data', onData);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (error) {
          // Ignore parse errors, wait for complete response
        }
      };

      this.server.stdout.on('data', onData);
    });
  }

  async callTool(name, arguments_) {
    return this.sendRequest('tools/call', {
      name,
      arguments: arguments_
    });
  }

  async stop() {
    if (this.server) {
      this.server.kill();
    }
  }
}

async function runExample() {
  const client = new MCPClient();
  
  try {
    console.log('🚀 Starting AutoTrader MCP Server Example...\n');
    
    await client.start();
    console.log('✅ MCP Server started successfully\n');

    // Example 1: Search for Toyota Camry vehicles
    console.log('📋 Example 1: Searching for Toyota Camry vehicles in Los Angeles...');
    const searchResult = await client.callTool('search_inventory', {
      make: 'Toyota',
      model: 'Camry',
      zip_code: '90210',
      max_price: 35000,
      min_year: 2020,
      radius: 25,
      limit: 5
    });

    const searchData = JSON.parse(searchResult.content[0].text);
    console.log(`Found ${searchData.total_results} vehicles`);
    
    if (searchData.results && searchData.results.length > 0) {
      console.log('First result:', {
        title: searchData.results[0].title,
        price: searchData.results[0].price_display,
        mileage: searchData.results[0].mileage_display,
        location: searchData.results[0].location
      });
    }
    console.log('');

    // Example 2: Filter results for hybrid vehicles
    if (searchData.results && searchData.results.length > 0) {
      console.log('🔍 Example 2: Filtering for hybrid vehicles with specific features...');
      const filterResult = await client.callTool('filter_by_criteria', {
        vehicles: searchData.results,
        criteria: {
          fuel_type: 'hybrid',
          transmission: 'automatic',
          features: ['Navigation', 'Backup Camera']
        }
      });

      const filterData = JSON.parse(filterResult.content[0].text);
      console.log(`Filtered from ${filterData.original_count} to ${filterData.filtered_count} vehicles`);
      console.log('Filter statistics:', filterData.filter_statistics);
      console.log('');
    }

    // Example 3: Get detailed vehicle information
    if (searchData.results && searchData.results.length > 0 && searchData.results[0].listing_id) {
      console.log('📄 Example 3: Getting detailed vehicle information...');
      const detailsResult = await client.callTool('get_vehicle_details', {
        listing_id: searchData.results[0].listing_id
      });

      const detailsData = JSON.parse(detailsResult.content[0].text);
      if (detailsData.success) {
        console.log('Vehicle details retrieved:');
        console.log('- Title:', detailsData.vehicle.title);
        console.log('- VIN:', detailsData.vehicle.vin || 'N/A');
        console.log('- Features count:', detailsData.vehicle.features?.length || 0);
        console.log('- Specifications count:', Object.keys(detailsData.vehicle.specifications || {}).length);
      }
      console.log('');
    }

    // Example 4: Search for electric vehicles
    console.log('⚡ Example 4: Searching for electric vehicles...');
    const electricSearchResult = await client.callTool('search_inventory', {
      zip_code: '10001', // New York
      max_price: 60000,
      min_year: 2021,
      radius: 50,
      limit: 3
    });

    const electricSearchData = JSON.parse(electricSearchResult.content[0].text);
    
    if (electricSearchData.results && electricSearchData.results.length > 0) {
      // Filter for electric vehicles
      const electricFilterResult = await client.callTool('filter_by_criteria', {
        vehicles: electricSearchData.results,
        criteria: {
          fuel_type: 'electric'
        }
      });

      const electricFilterData = JSON.parse(electricFilterResult.content[0].text);
      console.log(`Found ${electricFilterData.filtered_count} electric vehicles out of ${electricFilterData.original_count} total`);
      
      if (electricFilterData.filtered_results.length > 0) {
        console.log('First electric vehicle:', {
          title: electricFilterData.filtered_results[0].title,
          price: electricFilterData.filtered_results[0].price_display
        });
      }
    }
    console.log('');

    // Example 5: Dealer information lookup
    if (searchData.results && searchData.results.length > 0) {
      // Extract dealer ID from first result (this is simplified - in real usage you'd get this from the vehicle listing)
      const dealerId = 'example-dealer-123'; // Placeholder since we can't extract real dealer ID
      
      console.log('🏢 Example 5: Looking up dealer information...');
      try {
        const dealerResult = await client.callTool('get_dealer_info', {
          dealer_id: dealerId
        });

        const dealerData = JSON.parse(dealerResult.content[0].text);
        if (dealerData.success) {
          console.log('Dealer information retrieved:');
          console.log('- Name:', dealerData.dealer.name || 'N/A');
          console.log('- Address:', dealerData.dealer.address || 'N/A');
          console.log('- Phone:', dealerData.dealer.phone || 'N/A');
        } else {
          console.log('Note: Dealer lookup failed (expected with placeholder ID)');
        }
      } catch (error) {
        console.log('Note: Dealer lookup failed (expected with placeholder ID)');
      }
    }

    console.log('\n🎉 Example completed successfully!');
    console.log('\n💡 Tips:');
    console.log('- Use real ZIP codes for your area');
    console.log('- Experiment with different search criteria');
    console.log('- The server includes caching to improve performance');
    console.log('- Check the README.md for more detailed usage information');

  } catch (error) {
    console.error('❌ Error running example:', error.message);
  } finally {
    await client.stop();
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample().catch(console.error);
}

export { runExample, MCPClient };