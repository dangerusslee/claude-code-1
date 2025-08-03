/**
 * URL builder for AutoTrader search queries
 */
export class AutoTraderURLBuilder {
  constructor() {
    this.baseURL = 'https://www.autotrader.com/cars-for-sale';
  }

  buildSearchURL(params) {
    const url = new URL(this.baseURL);
    
    // Location parameters
    if (params.zip_code) {
      url.searchParams.set('zip', params.zip_code);
    }
    if (params.radius) {
      url.searchParams.set('searchRadius', params.radius.toString());
    }

    // Vehicle parameters
    if (params.make) {
      url.searchParams.set('makeCodeList', params.make.toUpperCase());
    }
    if (params.model) {
      url.searchParams.set('modelCodeList', params.model.toUpperCase());
    }

    // Price parameters
    if (params.min_price) {
      url.searchParams.set('minPrice', params.min_price.toString());
    }
    if (params.max_price) {
      url.searchParams.set('maxPrice', params.max_price.toString());
    }

    // Year parameters
    if (params.min_year) {
      url.searchParams.set('minYear', params.min_year.toString());
    }
    if (params.max_year) {
      url.searchParams.set('maxYear', params.max_year.toString());
    }

    // Mileage parameters
    if (params.max_mileage) {
      url.searchParams.set('maxMileage', params.max_mileage.toString());
    }

    // Results parameters
    if (params.limit) {
      url.searchParams.set('numRecords', Math.min(params.limit, 100).toString());
    }

    // Sort by relevance
    url.searchParams.set('sortBy', 'relevance');
    
    // Set to first page
    url.searchParams.set('firstRecord', '0');

    return url.toString();
  }

  buildVehicleURL(listingId) {
    return `https://www.autotrader.com/cars-for-sale/vehicledetails.xhtml?listingId=${listingId}`;
  }

  buildDealerURL(dealerId) {
    return `https://www.autotrader.com/dealers/dealerdetails.xhtml?dealerId=${dealerId}`;
  }

  extractListingIdFromURL(url) {
    const match = url.match(/listingId=([^&]+)/);
    return match ? match[1] : null;
  }

  extractDealerIdFromURL(url) {
    const match = url.match(/dealerId=([^&]+)/);
    return match ? match[1] : null;
  }
}

export const urlBuilder = new AutoTraderURLBuilder();