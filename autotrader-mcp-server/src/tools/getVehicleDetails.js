import { z } from 'zod';
import { urlBuilder } from '../utils/urlBuilder.js';
import { scraper } from '../utils/scraper.js';
import { cache } from '../utils/cache.js';

const GetVehicleDetailsSchema = z.object({
  listing_id: z.string(),
});

export async function getVehicleDetailsTool(args) {
  try {
    // Validate input parameters
    const params = GetVehicleDetailsSchema.parse(args);
    
    // Generate cache key
    const cacheKey = cache.generateKey({ tool: 'get_vehicle_details', ...params });
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              vehicle: cached,
              source: 'cache',
              listing_id: params.listing_id,
            }, null, 2),
          },
        ],
      };
    }

    // Build vehicle details URL
    const vehicleURL = urlBuilder.buildVehicleURL(params.listing_id);
    
    // Fetch vehicle details page
    const html = await scraper.fetchPage(vehicleURL);
    
    // Parse vehicle details
    const vehicleDetails = scraper.parseVehicleDetails(html);
    
    // Also extract basic info from the page
    const $ = await import('cheerio').then(m => m.load(html));
    
    // Extract basic vehicle information that might be on the details page
    const basicInfo = extractBasicVehicleInfo($);
    
    // Combine all information
    const completeVehicle = {
      listing_id: params.listing_id,
      details_url: vehicleURL,
      ...basicInfo,
      ...vehicleDetails,
      last_updated: new Date().toISOString(),
    };

    // Cache results
    cache.set(cacheKey, completeVehicle);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            vehicle: completeVehicle,
            listing_id: params.listing_id,
            cached: false,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Invalid parameters',
              details: error.errors,
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Failed to get vehicle details',
            message: error.message,
            listing_id: args.listing_id,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

function extractBasicVehicleInfo($) {
  const info = {};

  // Extract title/name
  const title = $('h1, .vehicle-title, .listing-title').first().text().trim();
  if (title) {
    info.title = title;
    
    // Parse year, make, model from title
    const titleMatch = title.match(/(\d{4})\s+([A-Za-z-]+)\s+(.+)/);
    if (titleMatch) {
      info.year = parseInt(titleMatch[1]);
      info.make = titleMatch[2];
      info.model = titleMatch[3];
    }
  }

  // Extract price
  const priceElement = $('.price-section, .vehicle-price, .listing-price, .price').first();
  if (priceElement.length) {
    const priceText = priceElement.text().trim();
    info.price_display = priceText;
    
    const priceMatch = priceText.match(/\$?([\d,]+)/);
    if (priceMatch) {
      info.price = parseInt(priceMatch[1].replace(/,/g, ''));
    }
  }

  // Extract mileage
  const mileageElement = $('.mileage, .vehicle-mileage, .listing-mileage').first();
  if (mileageElement.length) {
    const mileageText = mileageElement.text().trim();
    info.mileage_display = mileageText;
    
    const mileageMatch = mileageText.match(/([\d,]+)/);
    if (mileageMatch) {
      info.mileage = parseInt(mileageMatch[1].replace(/,/g, ''));
    }
  }

  // Extract exterior color
  const colorElement = $('.exterior-color, .vehicle-color, .color').first();
  if (colorElement.length) {
    info.exterior_color = colorElement.text().trim();
  }

  // Extract VIN
  const vinElement = $('.vin, .vehicle-vin').first();
  if (vinElement.length) {
    info.vin = vinElement.text().trim();
  }

  // Extract stock number
  const stockElement = $('.stock, .stock-number, .vehicle-stock').first();
  if (stockElement.length) {
    info.stock_number = stockElement.text().trim();
  }

  // Extract dealer information
  const dealerElement = $('.dealer-name, .dealership-name').first();
  if (dealerElement.length) {
    info.dealer_name = dealerElement.text().trim();
  }

  const dealerLocationElement = $('.dealer-location, .dealership-location').first();
  if (dealerLocationElement.length) {
    info.dealer_location = dealerLocationElement.text().trim();
  }

  const dealerPhoneElement = $('.dealer-phone, .dealership-phone, .phone').first();
  if (dealerPhoneElement.length) {
    info.dealer_phone = dealerPhoneElement.text().trim();
  }

  // Extract images
  const images = [];
  $('.vehicle-images img, .gallery img, .photo-gallery img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !src.includes('placeholder')) {
      images.push(src);
    }
  });
  if (images.length > 0) {
    info.images = images;
    info.primary_image = images[0];
  }

  return info;
}