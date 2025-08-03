import { AutoTraderURLBuilder } from '../src/utils/urlBuilder.js';

describe('AutoTraderURLBuilder', () => {
  let urlBuilder;

  beforeEach(() => {
    urlBuilder = new AutoTraderURLBuilder();
  });

  describe('buildSearchURL', () => {
    test('should build basic search URL with required zip code', () => {
      const params = { zip_code: '90210' };
      const url = urlBuilder.buildSearchURL(params);
      
      expect(url).toContain('zip=90210');
      expect(url).toContain('autotrader.com/cars-for-sale');
    });

    test('should include make and model parameters', () => {
      const params = {
        zip_code: '90210',
        make: 'Toyota',
        model: 'Camry'
      };
      const url = urlBuilder.buildSearchURL(params);
      
      expect(url).toContain('makeCodeList=TOYOTA');
      expect(url).toContain('modelCodeList=CAMRY');
    });

    test('should include price range parameters', () => {
      const params = {
        zip_code: '90210',
        min_price: 10000,
        max_price: 30000
      };
      const url = urlBuilder.buildSearchURL(params);
      
      expect(url).toContain('minPrice=10000');
      expect(url).toContain('maxPrice=30000');
    });

    test('should include year range parameters', () => {
      const params = {
        zip_code: '90210',
        min_year: 2020,
        max_year: 2024
      };
      const url = urlBuilder.buildSearchURL(params);
      
      expect(url).toContain('minYear=2020');
      expect(url).toContain('maxYear=2024');
    });

    test('should include mileage and radius parameters', () => {
      const params = {
        zip_code: '90210',
        max_mileage: 50000,
        radius: 25
      };
      const url = urlBuilder.buildSearchURL(params);
      
      expect(url).toContain('maxMileage=50000');
      expect(url).toContain('searchRadius=25');
    });

    test('should limit results to maximum of 100', () => {
      const params = {
        zip_code: '90210',
        limit: 150
      };
      const url = urlBuilder.buildSearchURL(params);
      
      expect(url).toContain('numRecords=100');
    });
  });

  describe('buildVehicleURL', () => {
    test('should build vehicle details URL', () => {
      const listingId = '12345678';
      const url = urlBuilder.buildVehicleURL(listingId);
      
      expect(url).toBe('https://www.autotrader.com/cars-for-sale/vehicledetails.xhtml?listingId=12345678');
    });
  });

  describe('buildDealerURL', () => {
    test('should build dealer URL', () => {
      const dealerId = 'dealer123';
      const url = urlBuilder.buildDealerURL(dealerId);
      
      expect(url).toBe('https://www.autotrader.com/dealers/dealerdetails.xhtml?dealerId=dealer123');
    });
  });

  describe('extractListingIdFromURL', () => {
    test('should extract listing ID from URL', () => {
      const url = 'https://www.autotrader.com/cars-for-sale/vehicledetails.xhtml?listingId=12345678&other=param';
      const listingId = urlBuilder.extractListingIdFromURL(url);
      
      expect(listingId).toBe('12345678');
    });

    test('should return null for URL without listing ID', () => {
      const url = 'https://www.autotrader.com/cars-for-sale/';
      const listingId = urlBuilder.extractListingIdFromURL(url);
      
      expect(listingId).toBeNull();
    });
  });

  describe('extractDealerIdFromURL', () => {
    test('should extract dealer ID from URL', () => {
      const url = 'https://www.autotrader.com/dealers/dealerdetails.xhtml?dealerId=dealer123&other=param';
      const dealerId = urlBuilder.extractDealerIdFromURL(url);
      
      expect(dealerId).toBe('dealer123');
    });

    test('should return null for URL without dealer ID', () => {
      const url = 'https://www.autotrader.com/dealers/';
      const dealerId = urlBuilder.extractDealerIdFromURL(url);
      
      expect(dealerId).toBeNull();
    });
  });
});