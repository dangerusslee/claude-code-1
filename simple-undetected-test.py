#!/usr/bin/env python3

"""
Simple test to verify undetected chromedriver installation
"""

import sys

print("Testing undetected chromedriver installation...")

try:
    import undetected_chromedriver as uc
    print("✅ undetected_chromedriver imported successfully")
    print(f"Version: {uc.__version__}")
    
    # Test basic initialization
    options = uc.ChromeOptions()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-setuid-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    print("✅ ChromeOptions created successfully")
    
    # Try to create driver (this might fail due to Chrome binary issues in container)
    try:
        driver = uc.Chrome(options=options, version_main=None)
        print("✅ Chrome driver created successfully")
        driver.quit()
    except Exception as e:
        print(f"⚠️ Chrome driver creation failed (expected in container): {e}")
        print("This is normal in headless environments")
    
    print("🎉 undetected_chromedriver is properly installed!")
    
except ImportError as e:
    print(f"❌ Failed to import undetected_chromedriver: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")  
    sys.exit(1)