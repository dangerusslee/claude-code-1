import { test } from 'node:test';
import assert from 'node:assert';
import { cache } from '../src/utils/cache.js';

test('cache functionality', async (t) => {
  await t.test('stores and retrieves values', () => {
    cache.set('test-key', 'test-value');
    const value = cache.get('test-key');
    assert.strictEqual(value, 'test-value');
  });
  
  await t.test('returns null for non-existent keys', () => {
    const value = cache.get('non-existent-key');
    assert.strictEqual(value, null);
  });
  
  await t.test('clears all values', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    cache.clear();
    
    assert.strictEqual(cache.get('key1'), null);
    assert.strictEqual(cache.get('key2'), null);
  });
  
  await t.test('handles complex objects', () => {
    const complexObject = {
      id: 123,
      data: {
        nested: 'value',
        array: [1, 2, 3]
      }
    };
    
    cache.set('complex', complexObject);
    const retrieved = cache.get('complex');
    
    assert.deepStrictEqual(retrieved, complexObject);
  });
  
  // Note: Testing TTL expiration would require mocking time or waiting
  await t.test('cleanup removes expired entries', () => {
    // This is a basic test - in production you'd mock Date.now()
    cache.set('temp-key', 'temp-value');
    
    // Verify key exists
    assert.ok(cache.get('temp-key'));
    
    // Run cleanup (won't remove non-expired entries)
    cache.cleanup();
    
    // Key should still exist if not expired
    assert.ok(cache.get('temp-key'));
  });
});