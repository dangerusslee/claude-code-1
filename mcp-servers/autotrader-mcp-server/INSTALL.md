# AutoTrader MCP Server - Global Installation

## 🚀 Global Installation

### Option 1: Install from this directory
```bash
# Clone or download this repository
cd autotrader-mcp-server
npm install -g .
```

### Option 2: Install from npm (if published)
```bash
npm install -g autotrader-mcp-server
```

## 🔧 Claude Desktop Configuration

After global installation, add this to your Claude Desktop configuration file:

### Configuration Location:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

### Configuration Content:
```json
{
  "mcpServers": {
    "autotrader": {
      "command": "autotrader-mcp-server"
    }
  }
}
```

### Alternative Configuration (using node directly):
If you prefer to use the full path or have issues with the global command:
```json
{
  "mcpServers": {
    "autotrader": {
      "command": "node",
      "args": ["/usr/local/share/npm-global/lib/node_modules/autotrader-mcp-server/src/index.js"]
    }
  }
}
```

## 📋 Verification

After adding the configuration:

1. **Restart Claude Desktop**
2. **Verify the server is loaded** - You should see the AutoTrader tools available
3. **Test with a search** - Try: "Search for Toyota Camrys under $30,000 in ZIP code 90210"

## 🔧 Available Tools

Once configured, you'll have access to:

- **🔍 search_inventory** - Search AutoTrader by make, model, location, price, year, mileage
- **📋 get_vehicle_details** - Get detailed vehicle information by listing ID
- **🎯 filter_by_criteria** - Apply advanced filters to vehicle results  
- **🏢 get_dealer_info** - Get dealer information and contact details

## 🛠️ Troubleshooting

### Command not found
If `autotrader-mcp-server` command is not found:
```bash
# Check if npm global bin is in PATH
npm config get prefix
# Add to PATH if needed: export PATH=$PATH:/usr/local/share/npm-global/bin
```

### Permission issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}
```

### Alternative installation path
```bash
# Install to user directory
npm install -g --prefix ~/.local autotrader-mcp-server
# Then use: ~/.local/bin/autotrader-mcp-server
```

## 📚 Usage Examples

### Basic Vehicle Search
"Find Honda Civics under $25,000 within 25 miles of ZIP code 10001"

### Advanced Filtering  
"Search for electric vehicles, then filter for ones with backup cameras and navigation"

### Detailed Information
"Get full details about AutoTrader listing ID 12345678"

### Dealer Information
"Tell me about the dealer for this vehicle listing"

## 🔄 Updates

To update the global installation:
```bash
cd autotrader-mcp-server
git pull  # if using git
npm install -g .
```

## 📞 Support

- **Issues**: Report problems in the GitHub repository
- **Documentation**: See README.md for detailed API documentation
- **Examples**: Check examples/ directory for usage patterns