# AutoTrader MCP Server API Documentation

## Overview

The AutoTrader MCP Server provides a Model Context Protocol interface for searching and retrieving vehicle inventory data from AutoTrader.com. This document details the available tools and their usage.

## Base Configuration

The server can be configured through environment variables:

- `PORT`: Server port (default: 3000)
- `CACHE_TTL`: Cache time-to-live in minutes (default: 30)
- `MAX_RETRIES`: Maximum retry attempts for failed requests (default: 3)

## Tools Reference

### search_inventory

Search for vehicles on AutoTrader with various filtering criteria.

#### Input Schema

```typescript
{
  make?: string;           // Vehicle manufacturer (e.g., "Toyota", "Ford")
  model?: string;          // Vehicle model (e.g., "Camry", "F-150")
  zipCode: string;         // 5-digit ZIP code (required)
  radius?: number;         // Search radius in miles (0-500, default: 50)
  priceMin?: number;       // Minimum price filter
  priceMax?: number;       // Maximum price filter
  yearMin?: number;        // Minimum year (1900-2025)
  yearMax?: number;        // Maximum year (1900-2025)
  mileageMax?: number;     // Maximum mileage
  condition?: "new" | "used" | "certified";  // Vehicle condition
  limit?: number;          // Results limit (1-100, default: 20)
}
```

#### Response

```typescript
{
  success: boolean;
  data?: {
    searchCriteria: object;  // Echo of search parameters
    totalResults: number;    // Total matching vehicles
    vehicles: Array<{
      id: string;
      title: string;
      price: number | null;
      year: number | null;
      make: string;
      model: string;
      mileage: number | null;
      location: string;
      dealer: string;
      imageUrl: string;
      listingUrl: string;
      condition: string;
      features: string[];
    }>;
  };
  error?: string;
}
```

### get_vehicle_details

Retrieve comprehensive information about a specific vehicle listing.

#### Input Schema

```typescript
{
  vehicleId: string;              // AutoTrader listing ID (required)
  includeHistory?: boolean;       // Include vehicle history (default: false)
  includePriceAnalysis?: boolean; // Include price analysis (default: false)
}
```

#### Response

```typescript
{
  success: boolean;
  data?: {
    vehicle: {
      id: string;
      vin: string;
      title: string;
      price: number | null;
      year: number | null;
      make: string;
      model: string;
      trim: string;
      mileage: number | null;
      condition: string;
      bodyType: string;
      exteriorColor: string;
      interiorColor: string;
      transmission: string;
      drivetrain: string;
      engine: string;
      mpg: {
        city: number | null;
        highway: number | null;
      };
      features: string[];
      description: string;
      images: string[];
      dealer: {
        name: string;
        address: string;
        phone: string;
        rating: number | null;
      };
      location: string;
    };
    vehicleHistory?: {
      owners: number | null;
      accidents: string;
      serviceRecords: string;
    };
    priceAnalysis?: {
      fairPrice: number | null;
      marketAverage: number | null;
      priceRating: string;
    };
  };
  error?: string;
}
```

### filter_by_criteria

Apply advanced filtering to a list of vehicles.

#### Input Schema

```typescript
{
  vehicles: Array<any>;    // Array of vehicles to filter (required)
  criteria: {              // Filter criteria object (required)
    priceMin?: number;
    priceMax?: number;
    yearMin?: number;
    yearMax?: number;
    mileageMax?: number;
    makes?: string[];      // Acceptable makes
    models?: string[];     // Acceptable models
    bodyTypes?: string[];  // e.g., ["sedan", "suv", "truck"]
    colors?: string[];     // Exterior colors
    features?: string[];   // Required features (all must match)
    fuelTypes?: string[];  // e.g., ["gas", "hybrid", "electric"]
    transmissions?: string[]; // e.g., ["automatic", "manual"]
    drivetrains?: string[];   // e.g., ["fwd", "rwd", "awd", "4wd"]
  };
}
```

#### Response

```typescript
{
  success: boolean;
  data?: {
    originalCount: number;    // Count before filtering
    filteredCount: number;    // Count after filtering
    vehicles: Array<any>;     // Filtered vehicles
    appliedCriteria: object;  // Criteria that were applied
  };
  error?: string;
}
```

### get_dealer_info

Get detailed information about a dealer.

#### Input Schema

```typescript
{
  dealerId: string;            // Dealer identifier (required)
  includeInventory?: boolean;  // Include inventory summary (default: false)
  includeReviews?: boolean;    // Include recent reviews (default: false)
}
```

#### Response

```typescript
{
  success: boolean;
  data?: {
    dealer: {
      id: string;
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      website: string;
      hours: {
        [day: string]: string;  // e.g., "monday": "9:00 AM - 7:00 PM"
      };
      rating: number | null;
      reviewCount: number;
      services: string[];
      certifications: string[];
      logo: string;
    };
    inventoryCount?: number;
    inventorySummary?: {
      new: number;
      used: number;
      certified: number;
    };
    recentReviews?: Array<{
      rating: number | null;
      date: string;
      author: string;
      text: string;
    }>;
  };
  error?: string;
}
```

## Error Handling

All tools follow a consistent error handling pattern:

1. **Validation Errors**: Return `{success: false, error: "validation message"}`
2. **Scraping Errors**: Return `{success: false, error: "scraping error message"}`
3. **Network Errors**: Return `{success: false, error: "network error message"}`

## Best Practices

1. **Rate Limiting**: Implement appropriate delays between requests to avoid overwhelming AutoTrader's servers
2. **Caching**: The server implements a 30-minute cache by default to reduce redundant requests
3. **Error Handling**: Always check the `success` field before accessing response data
4. **Batch Operations**: When searching for multiple vehicles, use broader search criteria and filter locally
5. **Data Freshness**: Cached data may be up to 30 minutes old; for real-time data, consider implementing cache invalidation

## Example Workflow

```javascript
// 1. Search for vehicles
const searchResults = await mcp.call('search_inventory', {
  make: 'Honda',
  model: 'Accord',
  zipCode: '94105',
  radius: 50,
  yearMin: 2020,
  priceMax: 35000
});

// 2. Get details for interesting vehicles
const vehicleIds = searchResults.data.vehicles.slice(0, 5).map(v => v.id);
const detailsPromises = vehicleIds.map(id => 
  mcp.call('get_vehicle_details', { vehicleId: id, includeHistory: true })
);
const details = await Promise.all(detailsPromises);

// 3. Filter by specific features
const filtered = await mcp.call('filter_by_criteria', {
  vehicles: searchResults.data.vehicles,
  criteria: {
    features: ['leather seats', 'sunroof'],
    transmissions: ['automatic']
  }
});

// 4. Get dealer information
const dealerIds = [...new Set(filtered.data.vehicles.map(v => v.dealerId))];
const dealerInfo = await Promise.all(
  dealerIds.map(id => mcp.call('get_dealer_info', { dealerId: id }))
);
```

## Limitations

1. **Data Accuracy**: Information is scraped from AutoTrader.com and may not always be 100% accurate
2. **Rate Limits**: Excessive requests may result in temporary blocking by AutoTrader
3. **Geographic Restrictions**: Some features may not be available in all regions
4. **Real-time Updates**: Inventory changes frequently; cached data may be outdated

## Legal Considerations

This server is intended for educational and personal use. For commercial applications:

1. Review AutoTrader's Terms of Service
2. Respect robots.txt directives
3. Consider contacting AutoTrader for official API access
4. Implement appropriate rate limiting and caching
5. Do not use for competitive intelligence or data harvesting