import { z } from 'zod';
import { urlBuilder } from '../utils/urlBuilder.js';
import { scraper } from '../utils/scraper.js';
import { cache } from '../utils/cache.js';

const SearchInventorySchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  zip_code: z.string(),
  max_price: z.number().optional(),
  min_price: z.number().optional(),
  max_year: z.number().optional(),
  min_year: z.number().optional(),
  max_mileage: z.number().optional(),
  radius: z.number().default(50),
  limit: z.number().default(25),
}).refine(data => !data.limit || data.limit <= 100, {
  message: "Limit must be 100 or less",
});

export async function searchInventoryTool(args) {
  try {
    // Validate input parameters
    const params = SearchInventorySchema.parse(args);
    
    // Generate cache key
    const cacheKey = cache.generateKey({ tool: 'search_inventory', ...params });
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              results: cached,
              source: 'cache',
              total_results: cached.length,
              search_parameters: params,
            }, null, 2),
          },
        ],
      };
    }

    // Build search URL
    const searchURL = urlBuilder.buildSearchURL(params);
    
    // Fetch search results page
    const html = await scraper.fetchPage(searchURL);
    
    // Parse vehicle listings
    const vehicles = scraper.parseSearchResults(html);
    
    // Apply limit
    const limitedResults = vehicles.slice(0, params.limit);
    
    // Enhance results with additional data
    const enhancedResults = limitedResults.map(vehicle => ({
      ...vehicle,
      search_url: searchURL,
      last_updated: new Date().toISOString(),
    }));

    // Cache results
    cache.set(cacheKey, enhancedResults);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            results: enhancedResults,
            total_results: enhancedResults.length,
            search_parameters: params,
            search_url: searchURL,
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
            error: 'Search failed',
            message: error.message,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}