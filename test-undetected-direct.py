#!/usr/bin/env python3

"""
Direct test of undetected chromedriver without MCP wrapper
"""

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_undetected_chrome():
    print("🧪 Testing Undetected Chrome Direct")
    print("=" * 40)
    
    driver = None
    
    try:
        print("1️⃣ Setting up Chrome options...")
        options = uc.ChromeOptions()
        
        # Set Chromium binary path
        options.binary_location = '/usr/bin/chromium'
        
        # Container-friendly arguments
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-setuid-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--headless=new')
        options.add_argument('--disable-web-security')
        options.add_argument('--disable-features=VizDisplayCompositor')
        options.add_argument('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        print("2️⃣ Initializing undetected Chrome driver...")
        driver = uc.Chrome(
            options=options, 
            version_main=None,
            driver_executable_path='/tmp/chromedriver'
        )
        print("✅ Driver initialized successfully")
        
        print("3️⃣ Testing basic navigation...")
        driver.get('data:text/html,<h1>Test Page</h1><p id="test">Hello World</p>')
        
        title = driver.title
        print(f"✅ Page title: {title}")
        
        # Test element finding
        element = driver.find_element(By.ID, "test")
        text = element.text
        print(f"✅ Element text: {text}")
        
        print("4️⃣ Testing real website...")
        driver.get('https://httpbin.org/headers')
        time.sleep(3)
        
        current_url = driver.current_url
        page_title = driver.title
        print(f"✅ Navigated to: {current_url}")
        print(f"✅ Page title: {page_title}")
        
        # Check if we can get some content
        body = driver.find_element(By.TAG_NAME, "body")
        content = body.text[:200]
        print(f"✅ Page content preview: {content}...")
        
        print("🎉 Undetected Chrome is working!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        if driver:
            try:
                driver.quit()
                print("✅ Driver closed")
            except:
                pass

if __name__ == "__main__":
    test_undetected_chrome()