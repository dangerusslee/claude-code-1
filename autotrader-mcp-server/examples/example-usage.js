import { searchInventory } from '../src/tools/searchInventory.js';
import { getVehicleDetails } from '../src/tools/getVehicleDetails.js';
import { filterByCriteria } from '../src/tools/filterByCriteria.js';
import { getDealerInfo } from '../src/tools/getDealerInfo.js';

// Example 1: Search for Toyota Camrys near Beverly Hills
async function searchExample() {
  console.log('=== Search Example ===');
  const searchResults = await searchInventory.execute({
    make: 'Toyota',
    model: 'Camry',
    zipCode: '90210',
    radius: 25,
    priceMax: 35000,
    yearMin: 2020,
    condition: 'used',
    limit: 10
  });
  
  if (searchResults.success) {
    console.log(`Found ${searchResults.data.totalResults} vehicles`);
    console.log(`Showing first ${searchResults.data.vehicles.length} results:`);
    
    searchResults.data.vehicles.forEach((vehicle, index) => {
      console.log(`\n${index + 1}. ${vehicle.title}`);
      console.log(`   Price: $${vehicle.price?.toLocaleString() || 'N/A'}`);
      console.log(`   Mileage: ${vehicle.mileage?.toLocaleString() || 'N/A'} miles`);
      console.log(`   Location: ${vehicle.location}`);
      console.log(`   Dealer: ${vehicle.dealer}`);
    });
  } else {
    console.error('Search failed:', searchResults.error);
  }
  
  return searchResults;
}

// Example 2: Get detailed information about a specific vehicle
async function detailsExample(vehicleId) {
  console.log('\n=== Vehicle Details Example ===');
  const details = await getVehicleDetails.execute({
    vehicleId: vehicleId,
    includeHistory: true,
    includePriceAnalysis: true
  });
  
  if (details.success) {
    const vehicle = details.data.vehicle;
    console.log(`\nVehicle: ${vehicle.title}`);
    console.log(`VIN: ${vehicle.vin || 'N/A'}`);
    console.log(`Price: $${vehicle.price?.toLocaleString() || 'N/A'}`);
    console.log(`Mileage: ${vehicle.mileage?.toLocaleString() || 'N/A'} miles`);
    console.log(`Exterior/Interior: ${vehicle.exteriorColor} / ${vehicle.interiorColor}`);
    console.log(`Transmission: ${vehicle.transmission}`);
    console.log(`MPG: ${vehicle.mpg.city} city / ${vehicle.mpg.highway} highway`);
    
    if (details.data.vehicleHistory) {
      console.log('\nVehicle History:');
      console.log(`  Owners: ${details.data.vehicleHistory.owners || 'N/A'}`);
      console.log(`  Accidents: ${details.data.vehicleHistory.accidents || 'N/A'}`);
    }
    
    if (details.data.priceAnalysis) {
      console.log('\nPrice Analysis:');
      console.log(`  Fair Price: $${details.data.priceAnalysis.fairPrice?.toLocaleString() || 'N/A'}`);
      console.log(`  Market Average: $${details.data.priceAnalysis.marketAverage?.toLocaleString() || 'N/A'}`);
      console.log(`  Rating: ${details.data.priceAnalysis.priceRating || 'N/A'}`);
    }
  } else {
    console.error('Failed to get vehicle details:', details.error);
  }
  
  return details;
}

// Example 3: Filter vehicles by specific criteria
async function filterExample(vehicles) {
  console.log('\n=== Filter Example ===');
  const filtered = await filterByCriteria.execute({
    vehicles: vehicles,
    criteria: {
      priceMax: 30000,
      yearMin: 2021,
      mileageMax: 30000,
      bodyTypes: ['sedan'],
      features: ['backup camera', 'bluetooth'],
      transmissions: ['automatic']
    }
  });
  
  if (filtered.success) {
    console.log(`\nFiltered from ${filtered.data.originalCount} to ${filtered.data.filteredCount} vehicles`);
    console.log('Applied criteria:', filtered.data.appliedCriteria);
    
    filtered.data.vehicles.forEach((vehicle, index) => {
      console.log(`\n${index + 1}. ${vehicle.title}`);
      console.log(`   Price: $${vehicle.price?.toLocaleString() || 'N/A'}`);
      console.log(`   Mileage: ${vehicle.mileage?.toLocaleString() || 'N/A'} miles`);
    });
  } else {
    console.error('Filter failed:', filtered.error);
  }
  
  return filtered;
}

// Example 4: Get dealer information
async function dealerExample(dealerId) {
  console.log('\n=== Dealer Info Example ===');
  const dealerInfo = await getDealerInfo.execute({
    dealerId: dealerId,
    includeInventory: true,
    includeReviews: true
  });
  
  if (dealerInfo.success) {
    const dealer = dealerInfo.data.dealer;
    console.log(`\nDealer: ${dealer.name}`);
    console.log(`Address: ${dealer.address}, ${dealer.city}, ${dealer.state} ${dealer.zipCode}`);
    console.log(`Phone: ${dealer.phone}`);
    console.log(`Rating: ${dealer.rating} (${dealer.reviewCount} reviews)`);
    
    if (dealerInfo.data.inventoryCount) {
      console.log(`\nInventory: ${dealerInfo.data.inventoryCount} vehicles`);
      if (dealerInfo.data.inventorySummary) {
        console.log(`  New: ${dealerInfo.data.inventorySummary.new}`);
        console.log(`  Used: ${dealerInfo.data.inventorySummary.used}`);
        console.log(`  Certified: ${dealerInfo.data.inventorySummary.certified}`);
      }
    }
    
    if (dealerInfo.data.recentReviews?.length > 0) {
      console.log('\nRecent Reviews:');
      dealerInfo.data.recentReviews.forEach((review, index) => {
        console.log(`\n${index + 1}. ${review.rating} stars - ${review.author} (${review.date})`);
        console.log(`   "${review.text}"`);
      });
    }
  } else {
    console.error('Failed to get dealer info:', dealerInfo.error);
  }
  
  return dealerInfo;
}

// Run all examples
async function runExamples() {
  try {
    // 1. Search for vehicles
    const searchResults = await searchExample();
    
    // 2. Get details for the first vehicle found (if any)
    if (searchResults.success && searchResults.data.vehicles.length > 0) {
      const firstVehicleId = searchResults.data.vehicles[0].id;
      await detailsExample(firstVehicleId);
      
      // 3. Filter the search results
      await filterExample(searchResults.data.vehicles);
      
      // 4. Get info about the first dealer (if any)
      const firstDealer = searchResults.data.vehicles[0].dealer;
      if (firstDealer) {
        // Note: You would need to extract the dealer ID from the listing
        // This is a placeholder
        await dealerExample('dealer-id-placeholder');
      }
    }
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}

export { searchExample, detailsExample, filterExample, dealerExample };