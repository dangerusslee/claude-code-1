import { z } from 'zod';
import { urlBuilder } from '../utils/urlBuilder.js';
import { scraper } from '../utils/scraper.js';
import { cache } from '../utils/cache.js';

const GetDealerInfoSchema = z.object({
  dealer_id: z.string(),
});

export async function getDealerInfoTool(args) {
  try {
    // Validate input parameters
    const params = GetDealerInfoSchema.parse(args);
    
    // Generate cache key
    const cacheKey = cache.generateKey({ tool: 'get_dealer_info', ...params });
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              dealer: cached,
              source: 'cache',
              dealer_id: params.dealer_id,
            }, null, 2),
          },
        ],
      };
    }

    // Build dealer URL
    const dealerURL = urlBuilder.buildDealerURL(params.dealer_id);
    
    // Fetch dealer page
    const html = await scraper.fetchPage(dealerURL);
    
    // Parse dealer information
    const dealerInfo = scraper.parseDealerInfo(html);
    
    // Extract additional dealer details
    const additionalInfo = await extractAdditionalDealerInfo(html);
    
    // Combine all information
    const completeDealerInfo = {
      dealer_id: params.dealer_id,
      dealer_url: dealerURL,
      ...dealerInfo,
      ...additionalInfo,
      last_updated: new Date().toISOString(),
    };

    // Cache results
    cache.set(cacheKey, completeDealerInfo);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            dealer: completeDealerInfo,
            dealer_id: params.dealer_id,
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
            error: 'Failed to get dealer information',
            message: error.message,
            dealer_id: args.dealer_id,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

async function extractAdditionalDealerInfo(html) {
  const { load } = await import('cheerio');
  const $ = load(html);
  
  const info = {};

  // Extract business hours
  const hoursSection = $('.hours, .business-hours, .dealer-hours');
  if (hoursSection.length) {
    const hours = {};
    hoursSection.find('tr, .hour-row').each((i, el) => {
      const $row = $(el);
      const day = $row.find('td:first, .day').text().trim();
      const time = $row.find('td:last, .time').text().trim();
      if (day && time) {
        hours[day.toLowerCase()] = time;
      }
    });
    if (Object.keys(hours).length > 0) {
      info.business_hours = hours;
    }
  }

  // Extract services offered
  const services = [];
  $('.services li, .dealer-services .service, .amenities li').each((i, el) => {
    const service = $(el).text().trim();
    if (service) {
      services.push(service);
    }
  });
  if (services.length > 0) {
    info.services = services;
  }

  // Extract certifications
  const certifications = [];
  $('.certifications li, .dealer-certifications .cert').each((i, el) => {
    const cert = $(el).text().trim();
    if (cert) {
      certifications.push(cert);
    }
  });
  if (certifications.length > 0) {
    info.certifications = certifications;
  }

  // Extract website URL
  const websiteLink = $('a[href*="http"]').filter((i, el) => {
    const href = $(el).attr('href');
    return href && !href.includes('autotrader.com') && !href.includes('phone') && !href.includes('mailto');
  }).first();
  if (websiteLink.length) {
    info.website = websiteLink.attr('href');
  }

  // Extract email if available
  const emailLink = $('a[href^="mailto:"]').first();
  if (emailLink.length) {
    info.email = emailLink.attr('href').replace('mailto:', '');
  }

  // Extract social media links
  const socialLinks = {};
  $('a[href*="facebook"], a[href*="twitter"], a[href*="instagram"], a[href*="linkedin"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href) {
      if (href.includes('facebook')) socialLinks.facebook = href;
      if (href.includes('twitter')) socialLinks.twitter = href;
      if (href.includes('instagram')) socialLinks.instagram = href;
      if (href.includes('linkedin')) socialLinks.linkedin = href;
    }
  });
  if (Object.keys(socialLinks).length > 0) {
    info.social_media = socialLinks;
  }

  // Extract inventory count
  const inventoryCountElement = $('.inventory-count, .total-vehicles, .vehicle-count');
  if (inventoryCountElement.length) {
    const countText = inventoryCountElement.text().trim();
    const countMatch = countText.match(/(\d+)/);
    if (countMatch) {
      info.inventory_count = parseInt(countMatch[1]);
    }
  }

  // Extract years in business
  const yearsElement = $('.years-in-business, .established, .since');
  if (yearsElement.length) {
    const yearsText = yearsElement.text().trim();
    const yearMatch = yearsText.match(/(\d{4})/);
    if (yearMatch) {
      const establishedYear = parseInt(yearMatch[1]);
      info.established_year = establishedYear;
      info.years_in_business = new Date().getFullYear() - establishedYear;
    }
  }

  // Extract specializations
  const specializations = [];
  $('.specializations li, .dealer-specialties .specialty').each((i, el) => {
    const spec = $(el).text().trim();
    if (spec) {
      specializations.push(spec);
    }
  });
  if (specializations.length > 0) {
    info.specializations = specializations;
  }

  // Extract financing information
  const financingElement = $('.financing, .finance-options, .lending-partners');
  if (financingElement.length) {
    info.financing_available = true;
    
    const lenders = [];
    financingElement.find('li, .lender').each((i, el) => {
      const lender = $(el).text().trim();
      if (lender) {
        lenders.push(lender);
      }
    });
    if (lenders.length > 0) {
      info.financing_partners = lenders;
    }
  }

  // Extract warranty information
  const warrantyElement = $('.warranty, .warranties, .warranty-info');
  if (warrantyElement.length) {
    const warrantyText = warrantyElement.text().trim();
    if (warrantyText) {
      info.warranty_info = warrantyText;
    }
  }

  return info;
}