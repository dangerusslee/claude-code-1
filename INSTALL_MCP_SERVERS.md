# Installing MCP Servers for Claude Code

This document provides instructions for adding the globally installed MCP servers to your Claude Code configuration.

## Available MCP Servers

The following MCP servers are pre-installed globally in the devcontainer:

### 1. Selenium MCP Server
- **Command**: `selenium-mcp`
- **Description**: Web automation with advanced stealth features
- **Tools**: Navigate, click, type, extract text, screenshot, scroll, bypass Cloudflare

### 2. Undetected Chrome MCP Server  
- **Command**: `undetected-chrome-mcp`
- **Description**: Maximum stealth web scraping using undetected Chrome
- **Tools**: Navigate, extract data, screenshot with anti-bot detection

### 3. AutoTrader MCP Server
- **Command**: `autotrader-mcp-server`
- **Description**: Vehicle inventory search and filtering
- **Tools**: Search inventory, get vehicle details, filter by criteria, dealer info

## Adding to Claude Code Configuration

### Option 1: Global Installation (Recommended)

Install MCP servers globally so they're available across all Claude Code sessions:

```bash
# Add Selenium MCP server globally
claude mcp add --scope user selenium selenium-mcp

# Add Undetected Chrome MCP server globally
claude mcp add --scope user undetected-chrome undetected-chrome-mcp

# Add AutoTrader MCP server globally
claude mcp add --scope user autotrader autotrader-mcp-server
```

### Option 2: Local Project Installation

Install MCP servers for the current project only:

```bash
# Add Selenium MCP server locally
claude mcp add selenium selenium-mcp

# Add Undetected Chrome MCP server locally
claude mcp add undetected-chrome undetected-chrome-mcp

# Add AutoTrader MCP server locally
claude mcp add autotrader autotrader-mcp-server
```

### Option 3: Manual Configuration (Advanced)

Edit your `.claude/settings.json` file to include:

```json
{
  "mcpServers": {
    "selenium": {
      "command": "selenium-mcp",
      "args": [],
      "env": {}
    },
    "undetected-chrome": {
      "command": "undetected-chrome-mcp", 
      "args": [],
      "env": {}
    },
    "autotrader": {
      "command": "autotrader-mcp-server",
      "args": [],
      "env": {}
    }
  }
}
```

## Verification

To verify the MCP servers are working:

```bash
# Check if commands are available globally
which selenium-mcp
which undetected-chrome-mcp
which autotrader-mcp-server

# Test MCP server functionality
claude mcp list
```

## Usage Examples

### Selenium MCP Server
```javascript
// Navigate to a website with stealth mode
selenium_navigate({
  url: "https://example.com",
  stealth_mode: true,
  headless: true
})

// Extract text from elements
selenium_extract_text({
  selector: ".product-title",
  multiple: true
})
```

### Undetected Chrome MCP Server
```javascript
// Navigate with maximum stealth
undetected_navigate({
  url: "https://example.com",
  headless: true,
  user_agent: "custom agent"
})

// Extract data with anti-detection
undetected_extract({
  selector: ".data-element",
  multiple: true
})
```

### AutoTrader MCP Server
```javascript
// Search vehicle inventory
autotrader_search_inventory({
  zip_code: "10001",
  make: "Toyota",
  model: "Camry",
  max_price: 25000
})

// Get vehicle details
autotrader_get_vehicle_details({
  listing_id: "12345678"
})
```

## Troubleshooting

### Common Issues

1. **MCP server not found**: Ensure the devcontainer has been rebuilt after adding the servers
2. **Permission denied**: Check that executable permissions are set correctly
3. **Import errors**: Verify all dependencies are installed in the container

### Debug Commands

```bash
# Check if executables exist and have proper permissions
ls -la /usr/local/bin/*mcp*

# Test individual MCP servers
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | selenium-mcp
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | undetected-chrome-mcp
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | autotrader-mcp-server
```

## Dependencies

All required dependencies are pre-installed in the devcontainer:

- **Python**: selenium, undetected-chromedriver, webdriver-manager
- **Node.js**: @modelcontextprotocol/sdk, selenium-webdriver, playwright
- **System**: chromium, chromium-driver, google-chrome-stable

The MCP servers are ready to use immediately after container startup.