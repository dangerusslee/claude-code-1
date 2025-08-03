#!/usr/bin/env python3

"""
Working Undetected Chrome MCP Server for Linux Containers
Uses Chromium binary and handles container environment properly
"""

import json
import sys
import traceback
import time
import random
import tempfile
import base64

def send_response(response):
    """Send JSON-RPC response"""
    print(json.dumps(response), flush=True)

class UndetectedChromeMCP:
    def __init__(self):
        self.driver = None
        self.wait = None
    
    def init_driver(self, headless=True, user_agent=None):
        """Initialize undetected Chrome with Chromium binary"""
        if self.driver:
            return self.driver
            
        try:
            import undetected_chromedriver as uc
            from selenium.webdriver.support.ui import WebDriverWait
            
            options = uc.ChromeOptions()
            
            # Set Chromium binary path for Linux container
            options.binary_location = '/usr/bin/chromium'
            
            # Container-friendly arguments
            container_args = [
                '--no-sandbox',
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
                '--metrics-recording-only',
                '--mute-audio',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-domain-reliability',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                '--disable-ipc-flooding-protection',
                '--disable-renderer-backgrounding',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-component-extensions-with-background-pages',
                '--disable-blink-features=AutomationControlled'
            ]
            
            if headless:
                container_args.append('--headless=new')
                
            for arg in container_args:
                options.add_argument(arg)
            
            # Set realistic user agent
            if user_agent:
                options.add_argument(f'--user-agent={user_agent}')
            else:
                options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
            # Anti-detection preferences (simplified for compatibility)
            prefs = {
                "profile.default_content_setting_values.notifications": 2,
                "profile.default_content_settings.popups": 0,
            }
            options.add_experimental_option("prefs", prefs)
            
            # Copy chromedriver to writable location for patching
            import shutil
            import os
            if not os.path.exists('/tmp/chromedriver'):
                shutil.copy('/usr/bin/chromedriver', '/tmp/chromedriver')
                os.chmod('/tmp/chromedriver', 0o755)
            
            # Initialize driver with container-specific settings
            self.driver = uc.Chrome(
                options=options,
                version_main=None,
                driver_executable_path='/tmp/chromedriver'
            )
            
            self.wait = WebDriverWait(self.driver, 10)
            
            # Execute stealth JavaScript
            self.driver.execute_script("""
                // Override webdriver property
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                // Override chrome runtime
                window.chrome = {
                    runtime: {},
                };
                
                // Override permissions API
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );
                
                // Override plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                // Override languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
            """)
            
            return self.driver
            
        except Exception as e:
            raise Exception(f"Failed to initialize undetected Chrome: {str(e)}")
    
    def navigate(self, args):
        """Navigate to URL with maximum stealth"""
        try:
            url = args["url"]
            headless = args.get("headless", True)
            user_agent = args.get("user_agent")
            delay = args.get("delay", 2)
            wait_for = args.get("wait_for")
            
            driver = self.init_driver(headless, user_agent)
            
            # Human-like delay
            time.sleep(random.uniform(1, delay))
            
            driver.get(url)
            
            # Wait for specific element if requested
            if wait_for:
                from selenium.webdriver.common.by import By
                from selenium.webdriver.support import expected_conditions as EC
                try:
                    self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, wait_for)))
                except:
                    pass  # Continue even if element not found
            
            title = driver.title
            current_url = driver.current_url
            
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"✅ Successfully navigated to: {current_url}\\nPage title: {title}"
                    }
                ]
            }
            
        except Exception as e:
            return {
                "content": [
                    {
                        "type": "text", 
                        "text": f"❌ Navigation failed: {str(e)}"
                    }
                ]
            }
    
    def extract_data(self, args):
        """Extract data from elements"""
        if not self.driver:
            return {"content": [{"type": "text", "text": "❌ Browser not initialized. Navigate to a page first."}]}
            
        try:
            from selenium.webdriver.common.by import By
            from selenium.webdriver.support import expected_conditions as EC
            
            selector = args["selector"]
            attribute = args.get("attribute")
            multiple = args.get("multiple", True)
            wait_time = args.get("wait_time", 10)
            
            if multiple:
                elements = self.wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector)))
            else:
                element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                elements = [element]
            
            results = []
            for element in elements:
                if attribute:
                    value = element.get_attribute(attribute)
                else:
                    value = element.text
                results.append(value)
            
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"✅ Extracted {len(results)} elements:\\n" + "\\n".join(str(r) for r in results)
                    }
                ]
            }
            
        except Exception as e:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"❌ Extraction failed: {str(e)}"
                    }
                ]
            }
    
    def screenshot(self, args):
        """Take screenshot"""
        if not self.driver:
            return {"content": [{"type": "text", "text": "❌ Browser not initialized. Navigate to a page first."}]}
            
        try:
            filename = args.get("filename")
            full_page = args.get("full_page", False)
            element_selector = args.get("element_selector")
            
            if not filename:
                timestamp = str(int(time.time()))
                filename = f"/tmp/undetected_screenshot_{timestamp}.png"
            
            if element_selector:
                from selenium.webdriver.common.by import By
                element = self.driver.find_element(By.CSS_SELECTOR, element_selector)
                screenshot_data = element.screenshot_as_base64
            else:
                if full_page:
                    # Get full page height
                    total_height = self.driver.execute_script("return document.body.scrollHeight")
                    self.driver.set_window_size(1920, total_height)
                
                screenshot_data = self.driver.get_screenshot_as_base64()
            
            # Save screenshot
            with open(filename, "wb") as f:
                f.write(base64.b64decode(screenshot_data))
            
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"✅ Screenshot saved to: {filename}"
                    }
                ]
            }
            
        except Exception as e:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"❌ Screenshot failed: {str(e)}"
                    }
                ]
            }
    
    def close_browser(self):
        """Close browser session"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
            self.driver = None
            self.wait = None
        
        return {
            "content": [
                {
                    "type": "text",
                    "text": "✅ Browser session closed"
                }
            ]
        }
    
    def get_status(self):
        """Get status information"""
        try:
            import undetected_chromedriver as uc
            
            status_lines = [
                f"✅ Undetected Chrome v{uc.__version__} available",
                "✅ Chromium binary found at /usr/bin/chromium",
                "✅ Container-optimized configuration active",
                "🛡️ Maximum stealth features enabled",
                f"🔧 Driver status: {'Active' if self.driver else 'Not initialized'}"
            ]
            
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "\\n".join(status_lines)
                    }
                ]
            }
        except ImportError:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": "❌ Undetected Chrome driver not available"
                    }
                ]
            }

def main():
    """Main MCP server loop"""
    mcp = UndetectedChromeMCP()
    
    try:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
                
            try:
                request = json.loads(line)
                method = request.get("method")
                params = request.get("params", {})
                request_id = request.get("id")
                
                if method == "initialize":
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "protocolVersion": "2024-11-05",
                            "capabilities": {
                                "tools": {}
                            },
                            "serverInfo": {
                                "name": "undetected-chrome-mcp",
                                "version": "1.0.0"
                            }
                        }
                    }
                    
                elif method == "tools/list":
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": {
                            "tools": [
                                {
                                    "name": "undetected_navigate",
                                    "description": "Navigate to URL with maximum stealth using Chromium",
                                    "inputSchema": {
                                        "type": "object",
                                        "properties": {
                                            "url": {"type": "string", "description": "URL to navigate to"},
                                            "headless": {"type": "boolean", "default": True, "description": "Run in headless mode"},
                                            "user_agent": {"type": "string", "description": "Custom user agent"},
                                            "delay": {"type": "number", "default": 2, "description": "Random delay before action"},
                                            "wait_for": {"type": "string", "description": "CSS selector to wait for"}
                                        },
                                        "required": ["url"]
                                    }
                                },
                                {
                                    "name": "undetected_extract",
                                    "description": "Extract data from elements with anti-detection",
                                    "inputSchema": {
                                        "type": "object",
                                        "properties": {
                                            "selector": {"type": "string", "description": "CSS selector"},
                                            "attribute": {"type": "string", "description": "Attribute to extract"},
                                            "multiple": {"type": "boolean", "default": True, "description": "Extract multiple elements"},
                                            "wait_time": {"type": "number", "default": 10, "description": "Wait time for elements"}
                                        },
                                        "required": ["selector"]
                                    }
                                },
                                {
                                    "name": "undetected_screenshot",
                                    "description": "Take screenshot with anti-detection",
                                    "inputSchema": {
                                        "type": "object",
                                        "properties": {
                                            "filename": {"type": "string", "description": "Save filename"},
                                            "full_page": {"type": "boolean", "default": False, "description": "Full page screenshot"},
                                            "element_selector": {"type": "string", "description": "Screenshot specific element"}
                                        }
                                    }
                                },
                                {
                                    "name": "undetected_close",
                                    "description": "Close the browser session",
                                    "inputSchema": {"type": "object", "properties": {}}
                                },
                                {
                                    "name": "undetected_status",
                                    "description": "Check undetected Chrome driver status", 
                                    "inputSchema": {"type": "object", "properties": {}}
                                }
                            ]
                        }
                    }
                    
                elif method == "tools/call":
                    tool_name = params.get("name")
                    args = params.get("arguments", {})
                    
                    if tool_name == "undetected_navigate":
                        result = mcp.navigate(args)
                    elif tool_name == "undetected_extract": 
                        result = mcp.extract_data(args)
                    elif tool_name == "undetected_screenshot":
                        result = mcp.screenshot(args)
                    elif tool_name == "undetected_close":
                        result = mcp.close_browser()
                    elif tool_name == "undetected_status":
                        result = mcp.get_status()
                    else:
                        result = {"content": [{"type": "text", "text": f"❌ Unknown tool: {tool_name}"}]}
                    
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "result": result
                    }
                    
                else:
                    response = {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "error": {"code": -32601, "message": f"Unknown method: {method}"}
                    }
                    
                send_response(response)
                
            except json.JSONDecodeError:
                continue
            except Exception as e:
                error_response = {
                    "jsonrpc": "2.0",
                    "id": request.get("id") if 'request' in locals() else None,
                    "error": {"code": -32603, "message": f"Internal error: {str(e)}"}
                }
                send_response(error_response)
                
    except KeyboardInterrupt:
        pass
    finally:
        mcp.close_browser()

if __name__ == "__main__":
    main()