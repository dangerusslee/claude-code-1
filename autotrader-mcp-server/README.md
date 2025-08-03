# AutoTrader MCP Server

A Model Context Protocol (MCP) server for searching and retrieving vehicle inventory data from AutoTrader.com. This server provides tools to search for vehicles, get detailed vehicle information, filter results, and retrieve dealer information.

## Features

- **🚗 Vehicle Search**: Search AutoTrader inventory by make, model, location, price, year, and mileage
- **📋 Vehicle Details**: Get comprehensive details about specific vehicles
- **🔍 Advanced Filtering**: Apply filters for fuel type, transmission, drivetrain, colors, and features
- **🏢 Dealer Information**: Retrieve dealer details, ratings, and contact information
- **⚡ Performance**: Built-in caching and rate limiting for optimal performance
- **🛡️ Error Handling**: Robust error handling and input validation

## Installation

```bash
npm install autotrader-mcp-server
```

## Quick Start

### Configuration for Claude Desktop

Add the following to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "autotrader": {
      "command": "node",
      "args": ["/path/to/autotrader-mcp-server/src/index.js"]
    }
  }
}
```

### Standalone Usage

```bash
# Install dependencies
npm install

# Start the server
npm start
```

## Available Tools

### 1. search_inventory

Search AutoTrader inventory with flexible criteria.

**Parameters:**
- `zip_code` (required): ZIP code for location-based search
- `make` (optional): Vehicle make (e.g., "Toyota", "Ford")
- `model` (optional): Vehicle model (e.g., "Camry", "F-150")
- `max_price` (optional): Maximum price in USD
- `min_price` (optional): Minimum price in USD
- `max_year` (optional): Maximum model year
- `min_year` (optional): Minimum model year
- `max_mileage` (optional): Maximum mileage
- `radius` (optional): Search radius in miles (default: 50)
- `limit` (optional): Maximum results (default: 25, max: 100)

**Example:**
```json
{
  "make": "Toyota",
  "model": "Camry",
  "zip_code": "90210",
  "max_price": 30000,
  "min_year": 2020,
  "radius": 25,
  "limit": 10
}
```

### 2. get_vehicle_details

Get detailed information about a specific vehicle by its listing ID.

**Parameters:**
- `listing_id` (required): AutoTrader listing ID

**Example:**
```json
{
  "listing_id": "12345678"
}
```

### 3. filter_by_criteria

Apply advanced filters to a list of vehicle results.

**Parameters:**
- `vehicles` (required): Array of vehicle objects to filter
- `criteria` (required): Filter criteria object

**Supported filter criteria:**
- `fuel_type`: "gas", "hybrid", "electric", "diesel"
- `transmission`: "automatic", "manual", "cvt"
- `drivetrain`: "fwd", "rwd", "awd", "4wd"
- `exterior_color`: Color name (e.g., "red", "blue")
- `interior_color`: Interior color name
- `features`: Array of required features
- `min_price`/`max_price`: Price range
- `min_year`/`max_year`: Year range
- `min_mileage`/`max_mileage`: Mileage range
- `body_style`: Body style (e.g., "sedan", "suv")
- `doors`: Number of doors

**Example:**
```json
{
  "vehicles": [...],
  "criteria": {
    "fuel_type": "hybrid",
    "transmission": "automatic",
    "max_price": 35000,
    "features": ["Navigation", "Backup Camera"]
  }
}
```

### 4. get_dealer_info

Get information about a specific dealer.

**Parameters:**
- `dealer_id` (required): Dealer ID from vehicle listing

**Example:**
```json
{
  "dealer_id": "dealer123"
}
```

## Response Format

All tools return responses in the following format:

```json
{
  "success": true,
  "results": [...],  // or "vehicle", "dealer", "filtered_results"
  "total_results": 25,
  "cached": false,
  "last_updated": "2025-01-26T22:05:57.399Z"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Example Workflow

Here's a typical workflow for finding vehicles:

1. **Search for vehicles:**
```json
{
  "tool": "search_inventory",
  "args": {
    "make": "Honda",
    "zip_code": "10001",
    "max_price": 25000,
    "min_year": 2019
  }
}
```

2. **Filter results:**
```json
{
  "tool": "filter_by_criteria",
  "args": {
    "vehicles": [...],
    "criteria": {
      "fuel_type": "hybrid",
      "features": ["Backup Camera"]
    }
  }
}
```

3. **Get vehicle details:**
```json
{
  "tool": "get_vehicle_details",
  "args": {
    "listing_id": "12345678"
  }
}
```

4. **Get dealer information:**
```json
{
  "tool": "get_dealer_info",
  "args": {
    "dealer_id": "dealer123"
  }
}
```

## Performance Features

### Caching
- 30-minute cache for search results and vehicle details
- Reduces load on AutoTrader servers
- Improves response times for repeated queries

### Rate Limiting
- 1-second delay between requests to AutoTrader
- Prevents overwhelming their servers
- Ensures stable performance

### Error Handling
- Comprehensive input validation using Zod schemas
- Graceful handling of network errors
- Detailed error messages for debugging

## Development

### Project Structure

```
autotrader-mcp-server/
├── src/
│   ├── index.js           # Main MCP server
│   ├── tools/             # Tool implementations
│   │   ├── searchInventory.js
│   │   ├── getVehicleDetails.js
│   │   ├── filterByCriteria.js
│   │   └── getDealerInfo.js
│   └── utils/             # Utility modules
│       ├── cache.js       # Caching system
│       ├── scraper.js     # Web scraping logic
│       └── urlBuilder.js  # URL construction
├── tests/                 # Unit tests
├── docs/                  # Documentation
└── examples/              # Usage examples
```

### Running Tests

```bash
npm test
```

### Development Mode

```bash
npm run dev
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP SDK for server implementation
- `cheerio`: HTML parsing for web scraping
- `zod`: Input validation and type safety
- `node-fetch`: HTTP requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for educational and research purposes. Please respect AutoTrader's terms of service and use responsibly. The authors are not responsible for any misuse of this software.

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/autotrader-mcp-server/issues)
- **Documentation**: See `/docs` folder for detailed API documentation
- **Examples**: See `/examples` folder for usage examples

---

Built with ❤️ for the MCP ecosystem