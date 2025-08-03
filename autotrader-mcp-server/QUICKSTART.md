# AutoTrader MCP Server - Quick Start Guide

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Server

### Option 1: Standalone (for testing)
```bash
npm start
```

### Option 2: With Claude Desktop

1. Add the server to your Claude Desktop configuration:

   **On macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   **On Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

   ```json
   {
     "mcpServers": {
       "autotrader": {
         "command": "node",
         "args": ["/path/to/autotrader-mcp-server/src/index.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

2. Restart Claude Desktop

3. The AutoTrader tools will now be available in Claude

## Basic Usage Examples

### Search for Vehicles
```
Use the search_inventory tool to find Toyota Camrys near ZIP code 90210 
with a max price of $30,000
```

### Get Vehicle Details
```
Use the get_vehicle_details tool to get full information about 
vehicle ID 123456789, including history and price analysis
```

### Filter Results
```
Use the filter_by_criteria tool to filter the previous search results 
to only show vehicles with less than 30,000 miles and automatic transmission
```

### Get Dealer Information
```
Use the get_dealer_info tool to get information about dealer ABC123, 
including their inventory summary and recent reviews
```

## Tool Reference

### search_inventory
- **Purpose**: Search AutoTrader inventory
- **Required**: `zipCode` (5 digits)
- **Optional**: `make`, `model`, `radius`, `priceMin`, `priceMax`, `yearMin`, `yearMax`, `mileageMax`, `condition`, `limit`

### get_vehicle_details
- **Purpose**: Get detailed vehicle information
- **Required**: `vehicleId`
- **Optional**: `includeHistory`, `includePriceAnalysis`

### filter_by_criteria
- **Purpose**: Filter a list of vehicles
- **Required**: `vehicles` (array), `criteria` (object)
- **Criteria options**: price range, year range, mileage, makes, models, body types, colors, features, etc.

### get_dealer_info
- **Purpose**: Get dealer information
- **Required**: `dealerId`
- **Optional**: `includeInventory`, `includeReviews`

## Troubleshooting

### Server won't start
- Make sure you've run `npm install`
- Check that port 3000 is available (or set PORT env variable)
- Verify Node.js version is 18 or higher

### No results returned
- Verify the ZIP code is valid (5 digits)
- Check that search criteria aren't too restrictive
- Note that AutoTrader may block requests if too frequent

### Rate limiting
- The server includes a 30-minute cache
- Avoid making identical requests repeatedly
- Consider adding delays between requests

## Development

### Running in development mode (with auto-reload):
```bash
npm run dev
```

### Running tests:
```bash
npm test
```

## Legal Notice

This tool is for educational purposes. Please respect AutoTrader's terms of service and implement appropriate rate limiting for production use.