#!/usr/bin/env python3

"""
Test Carvana scraping with undetected chromedriver
"""

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import shutil
import os

def test_carvana_scraping():
    print("🚗 Testing Carvana Scraping")
    print("=" * 30)
    
    driver = None
    
    try:
        print("1️⃣ Setting up undetected Chrome...")
        
        # Copy chromedriver to writable location
        if not os.path.exists('/tmp/chromedriver'):
            shutil.copy('/usr/bin/chromedriver', '/tmp/chromedriver')
            os.chmod('/tmp/chromedriver', 0o755)
        
        options = uc.ChromeOptions()
        options.binary_location = '/usr/bin/chromium'
        
        # Container-friendly arguments
        container_args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--headless=new',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        for arg in container_args:
            options.add_argument(arg)
        
        prefs = {
            "profile.default_content_setting_values.notifications": 2,
            "profile.default_content_settings.popups": 0,
        }
        options.add_experimental_option("prefs", prefs)
        
        driver = uc.Chrome(
            options=options,
            version_main=None,
            driver_executable_path='/tmp/chromedriver'
        )
        
        wait = WebDriverWait(driver, 15)
        
        print("✅ Driver initialized")
        
        print("2️⃣ Navigating to Carvana...")
        driver.get('https://www.carvana.com/cars')
        time.sleep(5)  # Give page time to load
        
        title = driver.title
        url = driver.current_url
        print(f"✅ Page loaded: {title}")
        print(f"🔗 URL: {url}")
        
        print("3️⃣ Looking for vehicle listings...")
        
        # Try multiple selectors for vehicle cards
        selectors = [
            '[data-qa="base-vehicle-card"] .vehicle-card-title',
            '[data-qa="base-vehicle-card"] h3',
            '.result-tile h3',
            '.car-tile .title',
            '.vehicle-card h3',
            '.listing-card h3',
            '[data-testid="vehicle-card"] h3',
            'h3[data-qa*="vehicle"]',
            '.car-display h3',
            '.inventory-card h3'
        ]
        
        vehicles_found = []
        
        for selector in selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    print(f"✅ Found {len(elements)} vehicles with selector: {selector}")
                    
                    for i, element in enumerate(elements[:5]):  # Limit to first 5
                        try:
                            text = element.text.strip()
                            if text:
                                vehicles_found.append({
                                    'title': text,
                                    'selector': selector,
                                    'index': i
                                })
                        except:
                            continue
                    
                    if vehicles_found:
                        break
            except:
                continue
        
        if vehicles_found:
            print(f"\n🎉 Successfully found {len(vehicles_found)} vehicle listings:")
            for i, vehicle in enumerate(vehicles_found):
                print(f"{i+1}. {vehicle['title']}")
        else:
            print("❌ No vehicle listings found with standard selectors")
            
            # Debug: Check page source for vehicle-related content
            page_source = driver.page_source
            has_vehicles = any(word in page_source.lower() for word in ['vehicle', 'car', 'auto', 'price', '$'])
            
            print(f"🔍 Page contains vehicle-related content: {has_vehicles}")
            
            if has_vehicles:
                print("📝 Sample page content (first 500 chars):")
                print(page_source[:500] + "...")
                
                # Try to find any price or car-related text
                try:
                    price_elements = driver.find_elements(By.CSS_SELECTOR, '[data-qa*="price"], .price, [class*="price"]')
                    if price_elements:
                        print(f"💰 Found {len(price_elements)} price elements")
                        for price in price_elements[:3]:
                            try:
                                print(f"   Price: {price.text}")
                            except:
                                pass
                except:
                    pass
        
        print("4️⃣ Taking screenshot for debugging...")
        screenshot_path = '/tmp/carvana_screenshot.png'
        driver.save_screenshot(screenshot_path)
        print(f"📸 Screenshot saved to: {screenshot_path}")
        
        return len(vehicles_found) > 0
        
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
    success = test_carvana_scraping()
    if success:
        print("\n🎉 Carvana scraping successful!")
    else:
        print("\n❌ Carvana scraping failed")