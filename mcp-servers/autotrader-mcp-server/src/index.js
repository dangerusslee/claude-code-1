#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { searchInventoryTool } from './tools/searchInventory.js';
import { getVehicleDetailsTool } from './tools/getVehicleDetails.js';
import { filterByCriteriaTool } from './tools/filterByCriteria.js';
import { getDealerInfoTool } from './tools/getDealerInfo.js';

class AutoTraderMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'autotrader-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_inventory',
            description: 'Search AutoTrader inventory by make, model, location, price range, year, and mileage',
            inputSchema: {
              type: 'object',
              properties: {
                make: {
                  type: 'string',
                  description: 'Vehicle make (e.g., Toyota, Ford, BMW)',
                },
                model: {
                  type: 'string',
                  description: 'Vehicle model (e.g., Camry, F-150, 3 Series)',
                },
                zip_code: {
                  type: 'string',
                  description: 'ZIP code for location-based search',
                },
                max_price: {
                  type: 'number',
                  description: 'Maximum price in USD',
                },
                min_price: {
                  type: 'number',
                  description: 'Minimum price in USD',
                },
                max_year: {
                  type: 'number',
                  description: 'Maximum model year',
                },
                min_year: {
                  type: 'number',
                  description: 'Minimum model year',
                },
                max_mileage: {
                  type: 'number',
                  description: 'Maximum mileage',
                },
                radius: {
                  type: 'number',
                  description: 'Search radius in miles (default: 50)',
                  default: 50,
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results (default: 25, max: 100)',
                  default: 25,
                },
              },
              required: ['zip_code'],
            },
          },
          {
            name: 'get_vehicle_details',
            description: 'Get detailed information about a specific vehicle by its listing ID',
            inputSchema: {
              type: 'object',
              properties: {
                listing_id: {
                  type: 'string',
                  description: 'AutoTrader listing ID',
                },
              },
              required: ['listing_id'],
            },
          },
          {
            name: 'filter_by_criteria',
            description: 'Apply advanced filters to a list of vehicle results',
            inputSchema: {
              type: 'object',
              properties: {
                vehicles: {
                  type: 'array',
                  description: 'Array of vehicle objects to filter',
                },
                criteria: {
                  type: 'object',
                  description: 'Filter criteria',
                  properties: {
                    fuel_type: {
                      type: 'string',
                      enum: ['gas', 'hybrid', 'electric', 'diesel'],
                    },
                    transmission: {
                      type: 'string',
                      enum: ['automatic', 'manual', 'cvt'],
                    },
                    drivetrain: {
                      type: 'string',
                      enum: ['fwd', 'rwd', 'awd', '4wd'],
                    },
                    exterior_color: {
                      type: 'string',
                    },
                    interior_color: {
                      type: 'string',
                    },
                    features: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Required features (e.g., "Navigation", "Backup Camera")',
                    },
                  },
                },
              },
              required: ['vehicles', 'criteria'],
            },
          },
          {
            name: 'get_dealer_info',
            description: 'Get information about a specific dealer',
            inputSchema: {
              type: 'object',
              properties: {
                dealer_id: {
                  type: 'string',
                  description: 'Dealer ID from vehicle listing',
                },
              },
              required: ['dealer_id'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'search_inventory':
            return await searchInventoryTool(args);

          case 'get_vehicle_details':
            return await getVehicleDetailsTool(args);

          case 'filter_by_criteria':
            return await filterByCriteriaTool(args);

          case 'get_dealer_info':
            return await getDealerInfoTool(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error.message}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AutoTrader MCP server running on stdio');
  }
}

const server = new AutoTraderMCPServer();
server.run().catch(console.error);