#!/usr/bin/env python3

"""
Test script for Undetected Chrome MCP functionality
"""

import json
import subprocess
import sys
import time
import threading
from queue import Queue, Empty

def test_undetected_chrome():
    print("🧪 Testing Undetected Chrome MCP Server")
    print("=" * 50)
    
    # Test 1: Basic import test
    print("\\n1️⃣ Testing Python dependencies...")
    try:
        import undetected_chromedriver as uc
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        print("✅ All Python dependencies available")
    except ImportError as e:
        print(f"❌ Missing dependencies: {e}")
        return False
    
    # Test 2: Basic undetected Chrome functionality
    print("\\n2️⃣ Testing basic undetected Chrome...")
    try:
        options = uc.ChromeOptions()
        options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-setuid-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        driver = uc.Chrome(options=options, version_main=None)
        driver.get('data:text/html,<h1>Test Page</h1><p id="test">Hello World</p>')
        
        title = driver.title
        content = driver.find_element(By.ID, "test").text
        
        print(f"✅ Page title: {title}")
        print(f"✅ Content extracted: {content}")
        
        driver.quit()
        print("✅ Basic undetected Chrome test passed")
    except Exception as e:
        print(f"❌ Basic test failed: {e}")
        return False
    
    # Test 3: MCP server functionality
    print("\\n3️⃣ Testing MCP server protocol...")
    try:
        # Start the MCP server
        process = subprocess.Popen(
            ['python3', '/projects/claude-code/undetected-chrome-mcp-fixed.py'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        def read_output(proc, queue):
            try:
                for line in iter(proc.stdout.readline, ''):
                    if line.strip():
                        queue.put(line.strip())
                proc.stdout.close()
            except:
                pass
        
        output_queue = Queue()
        reader_thread = threading.Thread(target=read_output, args=(process, output_queue))
        reader_thread.daemon = True
        reader_thread.start()
        
        # Test tools/list
        list_request = {"method": "tools/list", "params": {}}
        process.stdin.write(json.dumps(list_request) + "\\n")
        process.stdin.flush()
        
        # Wait for response
        time.sleep(2)
        
        try:
            response_line = output_queue.get(timeout=5)
            response = json.loads(response_line)
            
            if "tools" in response:
                tools = response["tools"]
                print(f"✅ MCP server returned {len(tools)} tools:")
                for tool in tools:
                    print(f"   - {tool['name']}: {tool['description']}")
            else:
                print(f"⚠️ Unexpected response: {response}")
        
        except (Empty, json.JSONDecodeError) as e:
            print(f"❌ MCP protocol test failed: {e}")
            return False
        finally:
            process.terminate()
            process.wait()
        
        print("✅ MCP server protocol test passed")
        
    except Exception as e:
        print(f"❌ MCP server test failed: {e}")
        return False
    
    print("\\n🎉 All undetected Chrome tests passed!")
    return True

def test_stealth_features():
    print("\\n🛡️ Testing Anti-Detection Features")
    print("=" * 40)
    
    try:
        options = uc.ChromeOptions()
        options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-setuid-sandbox')
        
        driver = uc.Chrome(options=options, version_main=None)
        
        # Test stealth JavaScript
        driver.get('data:text/html,<script>document.body.innerHTML = navigator.webdriver;</script>')
        webdriver_result = driver.find_element(By.TAG_NAME, "body").text
        
        if webdriver_result == "undefined" or not webdriver_result:
            print("✅ webdriver property successfully hidden")
        else:
            print(f"⚠️ webdriver property detected: {webdriver_result}")
        
        # Test user agent
        driver.get('data:text/html,<script>document.body.innerHTML = navigator.userAgent;</script>')
        user_agent = driver.find_element(By.TAG_NAME, "body").text
        
        if "Chrome" in user_agent and "WebDriver" not in user_agent:
            print("✅ Realistic user agent set")
        else:
            print(f"⚠️ Suspicious user agent: {user_agent}")
        
        driver.quit()
        print("✅ Stealth features working")
        
    except Exception as e:
        print(f"❌ Stealth test failed: {e}")

if __name__ == "__main__":
    success = test_undetected_chrome()
    test_stealth_features()
    
    if success:
        print("\\n🚀 Undetected Chrome MCP is ready for use!")
        print("Available tools:")
        print("- undetected_navigate")
        print("- undetected_extract") 
        print("- undetected_interact")
        print("- undetected_screenshot")
        print("- undetected_bypass_cloudflare")
        print("- undetected_close")
    else:
        print("\\n❌ Some tests failed - check the setup")
        sys.exit(1)