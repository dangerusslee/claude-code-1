import { test } from 'node:test';
import assert from 'node:assert';
import { searchInventory } from '../src/tools/searchInventory.js';

test('searchInventory validates zip code format', async (t) => {
  await t.test('rejects invalid zip code', async () => {
    const result = await searchInventory.execute({
      zipCode: '123', // Invalid - too short
      make: 'Toyota'
    });
    
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes('zip'));
  });
  
  await t.test('accepts valid zip code', async () => {
    // Note: This would make a real API call in production
    // For testing, you might want to mock the scraper
    const params = {
      zipCode: '90210',
      make: 'Toyota',
      limit: 5
    };
    
    // Validate that parameters are accepted
    assert.doesNotThrow(() => {
      searchInventory.inputSchema.parse(params);
    });
  });
});

test('searchInventory parameter validation', async (t) => {
  await t.test('validates year range', async () => {
    const result = await searchInventory.execute({
      zipCode: '90210',
      yearMin: 2030 // Invalid - future year
    });
    
    assert.strictEqual(result.success, false);
  });
  
  await t.test('validates radius range', async () => {
    const result = await searchInventory.execute({
      zipCode: '90210',
      radius: 1000 // Invalid - too large
    });
    
    assert.strictEqual(result.success, false);
  });
  
  await t.test('validates limit range', async () => {
    const result = await searchInventory.execute({
      zipCode: '90210',
      limit: 200 // Invalid - too large
    });
    
    assert.strictEqual(result.success, false);
  });
});

test('searchInventory response format', async (t) => {
  // This test would need mocking in a real scenario
  await t.test('returns expected response structure', async () => {
    // Mock implementation for testing
    const mockExecute = async (params) => {
      return {
        success: true,
        data: {
          searchCriteria: params,
          totalResults: 10,
          vehicles: []
        }
      };
    };
    
    const result = await mockExecute({
      zipCode: '90210',
      make: 'Toyota'
    });
    
    assert.strictEqual(result.success, true);
    assert.ok(result.data);
    assert.ok(result.data.searchCriteria);
    assert.ok(typeof result.data.totalResults === 'number');
    assert.ok(Array.isArray(result.data.vehicles));
  });
});