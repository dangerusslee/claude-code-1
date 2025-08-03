#!/usr/bin/env python3

"""
Detailed Carvana scraper that waits for dynamic content
"""

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import shutil
import os
import json

def scrape_carvana_vehicles():
    print("🚗 Advanced Carvana Scraper")
    print("=" * 35)
    
    driver = None
    
    try:
        # Setup undetected Chrome
        if not os.path.exists('/tmp/chromedriver'):
            shutil.copy('/usr/bin/chromedriver', '/tmp/chromedriver')
            os.chmod('/tmp/chromedriver', 0o755)
        
        options = uc.ChromeOptions()
        options.binary_location = '/usr/bin/chromium'
        
        container_args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--headless=new',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        for arg in container_args:
            options.add_argument(arg)
        
        options.add_experimental_option("prefs", {
            "profile.default_content_setting_values.notifications": 2,
            "profile.default_content_settings.popups": 0,
        })
        
        driver = uc.Chrome(
            options=options,
            version_main=None,
            driver_executable_path='/tmp/chromedriver'
        )
        
        wait = WebDriverWait(driver, 20)
        
        print("1️⃣ Navigating to Carvana...")
        driver.get('https://www.carvana.com/cars')
        
        print("2️⃣ Waiting for page to fully load...")
        time.sleep(10)  # Give React app time to initialize
        
        title = driver.title
        print(f"✅ Page title: {title}")
        
        print("3️⃣ Looking for dynamic content...")
        
        # Look for various elements that might contain vehicle data
        possible_selectors = [
            # Data attributes
            '[data-qa*="vehicle"]',
            '[data-testid*="vehicle"]', 
            '[data-cy*="vehicle"]',
            '[data-automation*="vehicle"]',
            
            # Class-based selectors
            '[class*="vehicle"]',
            '[class*="car"]',
            '[class*="inventory"]',
            '[class*="listing"]',
            '[class*="result"]',
            
            # Common patterns
            '.car-tile',
            '.vehicle-card',
            '.inventory-card',
            '.listing-item',
            '.search-result',
            '.product-card',
            
            # Generic containers that might have vehicles
            'article',
            '.card',
            '[role="button"]',
            'a[href*="/car/"]',
            'a[href*="/vehicle/"]'
        ]
        
        vehicles_data = []
        
        for selector in possible_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    print(f"🔍 Found {len(elements)} elements with '{selector}'")
                    
                    # Check first few elements for vehicle content
                    for i, element in enumerate(elements[:3]):
                        try:
                            text = element.text.strip()
                            html = element.get_attribute('outerHTML')[:200]
                            
                            # Look for car-like content
                            if any(word in text.lower() for word in ['20', 'honda', 'toyota', 'ford', 'chevrolet', 'bmw', 'mercedes', 'audi', 'nissan', 'hyundai', 'kia', 'jeep', 'subaru', 'mazda', 'volkswagen', 'tesla']):
                                vehicles_data.append({
                                    'selector': selector,
                                    'text': text[:100],
                                    'html_preview': html,
                                    'index': i
                                })
                                print(f"  🚗 Vehicle-like content: {text[:50]}...")
                                
                        except Exception as e:
                            continue
                            
                    if len(vehicles_data) >= 5:  # Stop after finding some good data
                        break
                        
            except Exception as e:
                continue
        
        if not vehicles_data:
            print("4️⃣ No obvious vehicle elements found, checking page structure...")
            
            # Look for any clickable elements or links
            try:
                links = driver.find_elements(By.CSS_SELECTOR, 'a[href]')
                print(f"🔗 Found {len(links)} links")
                
                car_links = []
                for link in links[:20]:  # Check first 20 links
                    try:
                        href = link.get_attribute('href')
                        text = link.text.strip()
                        
                        if href and ('/car/' in href or '/vehicle/' in href or any(word in text.lower() for word in ['20', '$', 'honda', 'toyota', 'ford'])):
                            car_links.append({
                                'href': href,
                                'text': text[:50]
                            })
                    except:
                        continue
                
                if car_links:
                    print(f"🚗 Found {len(car_links)} car-related links:")
                    for link in car_links[:5]:
                        print(f"   {link['text']} -> {link['href']}")
                        
            except Exception as e:
                print(f"Error checking links: {e}")
        
        print("5️⃣ Checking for JavaScript-rendered content...")
        
        # Execute JavaScript to look for React/Vue components
        try:
            js_result = driver.execute_script("""
                // Look for React or other framework components
                var reactElements = document.querySelectorAll('[data-reactroot], [data-react-class], .react-component');
                var vueElements = document.querySelectorAll('[data-v-]');
                var dataElements = document.querySelectorAll('[data-qa], [data-testid], [data-cy]');
                
                return {
                    reactElements: reactElements.length,
                    vueElements: vueElements.length,
                    dataElements: dataElements.length,
                    totalElements: document.querySelectorAll('*').length
                };
            """)
            
            print(f"🧠 JavaScript analysis:")
            print(f"   React elements: {js_result.get('reactElements', 0)}")
            print(f"   Vue elements: {js_result.get('vueElements', 0)}")
            print(f"   Data elements: {js_result.get('dataElements', 0)}")
            print(f"   Total DOM elements: {js_result.get('totalElements', 0)}")
            
        except Exception as e:
            print(f"JavaScript execution failed: {e}")
        
        # Save debug info
        print("6️⃣ Saving debug information...")
        
        with open('/tmp/carvana_page_source.html', 'w') as f:
            f.write(driver.page_source)
        print("💾 Page source saved to /tmp/carvana_page_source.html")
        
        driver.save_screenshot('/tmp/carvana_debug_screenshot.png')
        print("📸 Screenshot saved to /tmp/carvana_debug_screenshot.png")
        
        if vehicles_data:
            print(f"\n🎉 Successfully extracted {len(vehicles_data)} potential vehicle listings:")
            for i, vehicle in enumerate(vehicles_data):
                print(f"\n--- Vehicle {i+1} ---")
                print(f"Selector: {vehicle['selector']}")
                print(f"Text: {vehicle['text']}")
                print(f"HTML: {vehicle['html_preview']}...")
                
            return vehicles_data
        else:
            print("\n⚠️ No clear vehicle listings found")
            print("💡 The page may use heavy JavaScript rendering or different selectors")
            return []
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return []
        
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass

if __name__ == "__main__":
    results = scrape_carvana_vehicles()
    print(f"\n📊 Final result: {len(results)} vehicles found")
    
    if results:
        print("✅ Undetected Chrome successfully scraped Carvana!")
    else:
        print("❌ No vehicles extracted, but browser automation is working")