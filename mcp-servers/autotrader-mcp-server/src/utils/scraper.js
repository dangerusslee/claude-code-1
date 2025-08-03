import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { cache } from './cache.js';

/**
 * Web scraper for AutoTrader pages
 */
export class AutoTraderScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
    this.rateLimitDelay = 1000; // 1 second between requests
    this.lastRequestTime = 0;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async rateLimitedFetch(url) {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await this.delay(this.rateLimitDelay - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    return fetch(url, { headers: this.headers });
  }

  async fetchPage(url, useCache = true) {
    if (useCache) {
      const cached = cache.get(url);
      if (cached) {
        return cached;
      }
    }

    try {
      const response = await this.rateLimitedFetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      if (useCache) {
        cache.set(url, html);
      }

      return html;
    } catch (error) {
      throw new Error(`Failed to fetch ${url}: ${error.message}`);
    }
  }

  parseSearchResults(html) {
    const $ = cheerio.load(html);
    const vehicles = [];

    // AutoTrader uses various selectors for vehicle listings
    const listingSelectors = [
      '[data-cmp="inventoryListing"]',
      '.inventory-listing',
      '[data-listing-id]',
      '.listing-item'
    ];

    let listings = $();
    for (const selector of listingSelectors) {
      listings = $(selector);
      if (listings.length > 0) break;
    }

    listings.each((index, element) => {
      try {
        const $listing = $(element);
        
        // Extract basic vehicle information
        const vehicle = this.extractVehicleData($listing);
        if (vehicle && vehicle.listing_id) {
          vehicles.push(vehicle);
        }
      } catch (error) {
        console.error('Error parsing vehicle listing:', error);
      }
    });

    return vehicles;
  }

  extractVehicleData($listing) {
    const vehicle = {};

    // Try to extract listing ID
    vehicle.listing_id = $listing.attr('data-listing-id') || 
                        $listing.find('[data-listing-id]').attr('data-listing-id') ||
                        this.extractIdFromHref($listing.find('a').attr('href'));

    // Extract title/name
    const titleSelectors = [
      '.listing-title',
      '.vehicle-title', 
      'h3',
      'h2',
      '[data-cmp="vehicleTitle"]'
    ];
    
    for (const selector of titleSelectors) {
      const title = $listing.find(selector).text().trim();
      if (title) {
        vehicle.title = title;
        this.parseTitle(title, vehicle);
        break;
      }
    }

    // Extract price
    const priceSelectors = [
      '.price-section',
      '.listing-price',
      '.vehicle-price',
      '[data-cmp="price"]'
    ];
    
    for (const selector of priceSelectors) {
      const priceText = $listing.find(selector).text().trim();
      if (priceText) {
        vehicle.price = this.parsePrice(priceText);
        vehicle.price_display = priceText;
        break;
      }
    }

    // Extract mileage
    const mileageSelectors = [
      '.listing-mileage',
      '.vehicle-mileage',
      '[data-cmp="mileage"]'
    ];
    
    for (const selector of mileageSelectors) {
      const mileageText = $listing.find(selector).text().trim();
      if (mileageText && mileageText.toLowerCase().includes('mile')) {
        vehicle.mileage = this.parseMileage(mileageText);
        vehicle.mileage_display = mileageText;
        break;
      }
    }

    // Extract location
    const locationSelectors = [
      '.listing-location',
      '.dealer-location',
      '[data-cmp="location"]'
    ];
    
    for (const selector of locationSelectors) {
      const location = $listing.find(selector).text().trim();
      if (location) {
        vehicle.location = location;
        break;
      }
    }

    // Extract dealer info
    const dealerSelectors = [
      '.dealer-name',
      '.listing-dealer',
      '[data-cmp="dealer"]'
    ];
    
    for (const selector of dealerSelectors) {
      const dealer = $listing.find(selector).text().trim();
      if (dealer) {
        vehicle.dealer_name = dealer;
        break;
      }
    }

    // Extract image URL
    const img = $listing.find('img').first();
    if (img.length) {
      vehicle.image_url = img.attr('src') || img.attr('data-src');
    }

    // Extract vehicle details URL
    const detailsLink = $listing.find('a').first();
    if (detailsLink.length) {
      vehicle.details_url = this.normalizeURL(detailsLink.attr('href'));
    }

    return vehicle;
  }

  parseTitle(title, vehicle) {
    // Parse year, make, model from title
    const titleMatch = title.match(/(\d{4})\s+([A-Za-z]+)\s+(.+)/);
    if (titleMatch) {
      vehicle.year = parseInt(titleMatch[1]);
      vehicle.make = titleMatch[2];
      vehicle.model = titleMatch[3].split(' ')[0]; // Take first word as model
    }
  }

  parsePrice(priceText) {
    const priceMatch = priceText.match(/\$?([\d,]+)/);
    return priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
  }

  parseMileage(mileageText) {
    const mileageMatch = mileageText.match(/([\d,]+)/);
    return mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : null;
  }

  extractIdFromHref(href) {
    if (!href) return null;
    const match = href.match(/listingId=([^&]+)/);
    return match ? match[1] : null;
  }

  normalizeURL(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return 'https://www.autotrader.com' + url;
    return url;
  }

  parseVehicleDetails(html) {
    const $ = cheerio.load(html);
    const details = {};

    // Extract detailed vehicle information
    const specs = {};
    
    // Look for specs in various formats
    $('.specifications table tr, .vehicle-specs .spec-row, .details-section .detail-item').each((i, el) => {
      const $el = $(el);
      const label = $el.find('td:first, .spec-label, .detail-label').text().trim();
      const value = $el.find('td:last, .spec-value, .detail-value').text().trim();
      
      if (label && value && label !== value) {
        const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        specs[key] = value;
      }
    });

    details.specifications = specs;

    // Extract features
    const features = [];
    $('.features li, .feature-list .feature, .amenities .amenity').each((i, el) => {
      const feature = $(el).text().trim();
      if (feature) {
        features.push(feature);
      }
    });
    details.features = features;

    // Extract description
    const description = $('.vehicle-description, .listing-description, .vehicle-comments').text().trim();
    if (description) {
      details.description = description;
    }

    return details;
  }

  parseDealerInfo(html) {
    const $ = cheerio.load(html);
    const dealer = {};

    // Extract dealer information
    dealer.name = $('.dealer-name, .dealership-name h1').text().trim();
    dealer.address = $('.dealer-address, .dealership-address').text().trim();
    dealer.phone = $('.dealer-phone, .phone-number').text().trim();
    
    // Extract ratings if available
    const rating = $('.dealer-rating, .dealership-rating .rating').text().trim();
    if (rating) {
      dealer.rating = rating;
    }

    // Extract review count
    const reviewCount = $('.review-count, .reviews-count').text().trim();
    if (reviewCount) {
      dealer.review_count = reviewCount;
    }

    return dealer;
  }
}

export const scraper = new AutoTraderScraper();