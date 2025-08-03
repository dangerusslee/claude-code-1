#!/usr/bin/env node

/**
 * Installation verification script for AutoTrader MCP Server
 */

import { spawn } from 'child_process';
import { urlBuilder } from './src/utils/urlBuilder.js';
import { cache } from './src/utils/cache.js';

console.log('🔍 AutoTrader MCP Server Installation Verification\n');

async function verifyInstallation() {
  let allTestsPassed = true;

  // Test 1: Dependencies
  console.log('📦 Testing Dependencies...');
  try {
    await import('@modelcontextprotocol/sdk/server/index.js');
    await import('cheerio');
    await import('zod');
    await import('node-fetch');
    console.log('  ✅ All dependencies loaded successfully\n');
  } catch (error) {
    console.log('  ❌ Dependency error:', error.message);
    allTestsPassed = false;
  }

  // Test 2: Utilities
  console.log('🛠️  Testing Utilities...');
  try {
    // Test URL Builder
    const url = urlBuilder.buildSearchURL({ zip_code: '90210', make: 'Toyota' });
    if (!url.includes('zip=90210') || !url.includes('makeCodeList=TOYOTA')) {
      throw new Error('URL Builder not working correctly');
    }

    // Test Cache
    cache.set('test', 'value');
    if (cache.get('test') !== 'value') {
      throw new Error('Cache not working correctly');
    }

    console.log('  ✅ URL Builder and Cache working correctly\n');
  } catch (error) {
    console.log('  ❌ Utility error:', error.message);
    allTestsPassed = false;
  }

  // Test 3: MCP Server
  console.log('🚀 Testing MCP Server Startup...');
  try {
    const server = spawn('node', ['src/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverStarted = false;
    const timeout = setTimeout(() => {
      server.kill();
      if (!serverStarted) {
        console.log('  ❌ Server startup timeout');
        allTestsPassed = false;
      }
    }, 5000);

    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('AutoTrader MCP server running on stdio')) {
        serverStarted = true;
        clearTimeout(timeout);
        server.kill();
        console.log('  ✅ MCP Server starts successfully\n');
      }
    });

    server.on('error', (error) => {
      console.log('  ❌ Server error:', error.message);
      allTestsPassed = false;
      clearTimeout(timeout);
    });

    // Wait for server test to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!serverStarted && server.exitCode === null) {
      server.kill();
    }
  } catch (error) {
    console.log('  ❌ Server test error:', error.message);
    allTestsPassed = false;
  }

  // Results
  console.log('📋 Installation Verification Results:');
  if (allTestsPassed) {
    console.log('  🎉 ALL TESTS PASSED!\n');
    
    console.log('🚀 Your AutoTrader MCP Server is ready to use!\n');
    
    console.log('📝 To add to Claude Desktop, add this to your configuration:');
    console.log('```json');
    console.log('{');
    console.log('  "mcpServers": {');
    console.log('    "autotrader": {');
    console.log('      "command": "node",');
    console.log(`      "args": ["${process.cwd()}/src/index.js"]`);
    console.log('    }');
    console.log('  }');
    console.log('}');
    console.log('```\n');
    
    console.log('🔧 Available Tools:');
    console.log('  • search_inventory - Search vehicles by criteria');
    console.log('  • get_vehicle_details - Get detailed vehicle info');
    console.log('  • filter_by_criteria - Apply advanced filters');
    console.log('  • get_dealer_info - Get dealer information\n');
    
    console.log('📚 For usage examples, see: examples/usage-example.js');
    console.log('📖 For documentation, see: README.md');
    
    process.exit(0);
  } else {
    console.log('  ❌ SOME TESTS FAILED');
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Run: npm install');
    console.log('  2. Check Node.js version: node --version (requires 18+)');
    console.log('  3. Check for any error messages above');
    process.exit(1);
  }
}

verifyInstallation().catch(error => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});