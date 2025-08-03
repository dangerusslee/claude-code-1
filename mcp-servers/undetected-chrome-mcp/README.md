# Undetected Chrome MCP Server

A Model Context Protocol (MCP) server that provides web scraping capabilities using undetected Chrome with maximum stealth features.

## Features

- **Maximum Stealth**: Uses undetected-chromedriver to bypass anti-bot detection
- **Container Optimized**: Works in headless Linux containers
- **Anti-Detection**: Includes JavaScript stealth injection and realistic user agents
- **Multiple Tools**: Navigation, data extraction, screenshots, and Cloudflare bypass

## Available Tools

- `undetected_navigate` - Navigate to URLs with maximum stealth
- `undetected_extract` - Extract data from page elements
- `undetected_screenshot` - Take stealth screenshots
- `undetected_status` - Check driver status
- `undetected_close` - Close browser session

## Installation

### Prerequisites

- Python 3.8+
- Chromium browser (`sudo apt-get install chromium`)
- ChromeDriver (`sudo apt-get install chromium-driver`)

### Install Dependencies

```bash
pip3 install --break-system-packages selenium undetected-chromedriver webdriver-manager
```

### Global Installation

```bash
# Install the package globally
sudo cp -r /path/to/undetected-chrome-mcp /usr/local/lib/
sudo ln -s /usr/local/lib/undetected-chrome-mcp/bin/undetected-chrome-mcp /usr/local/bin/

# Or install via npm (if package.json is configured)
npm install -g .
```

## Usage with Claude Code

Add to Claude Code MCP configuration:

```bash
claude mcp add undetected-chrome undetected-chrome-mcp
```

Or manually in `.claude.json`:

```json
{
  "mcpServers": {
    "undetected-chrome": {
      "command": "undetected-chrome-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

## Example Usage

```python
# Navigate to a website
undetected_navigate(url="https://example.com", headless=True)

# Extract data
undetected_extract(selector=".product-title", multiple=True)

# Take screenshot
undetected_screenshot(filename="/tmp/screenshot.png")
```

## Configuration

The server automatically:
- Copies ChromeDriver to writable location for patching
- Applies container-optimized Chrome arguments
- Injects anti-detection JavaScript
- Uses realistic user agents

## Troubleshooting

### ChromeDriver Issues
- Ensure ChromeDriver is installed: `which chromedriver`
- Check Chromium is available: `which chromium`
- Verify permissions on `/tmp/chromedriver`

### Container Issues
- Use headless mode in containers
- Ensure necessary packages are installed
- Check firewall allows target domains

## License

MIT License - See package.json for details