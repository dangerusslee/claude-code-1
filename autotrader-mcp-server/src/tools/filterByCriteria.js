import { z } from 'zod';

const FilterByCriteriaSchema = z.object({
  vehicles: z.array(z.any()),
  criteria: z.object({
    fuel_type: z.enum(['gas', 'hybrid', 'electric', 'diesel']).optional(),
    transmission: z.enum(['automatic', 'manual', 'cvt']).optional(),
    drivetrain: z.enum(['fwd', 'rwd', 'awd', '4wd']).optional(),
    exterior_color: z.string().optional(),
    interior_color: z.string().optional(),
    features: z.array(z.string()).optional(),
    min_price: z.number().optional(),
    max_price: z.number().optional(),
    min_year: z.number().optional(),
    max_year: z.number().optional(),
    min_mileage: z.number().optional(),
    max_mileage: z.number().optional(),
    body_style: z.string().optional(),
    doors: z.number().optional(),
  }),
});

export async function filterByCriteriaTool(args) {
  try {
    // Validate input parameters
    const params = FilterByCriteriaSchema.parse(args);
    
    const { vehicles, criteria } = params;
    
    if (!Array.isArray(vehicles)) {
      throw new Error('Vehicles must be an array');
    }

    // Apply filters
    const filteredVehicles = vehicles.filter(vehicle => {
      return applyAllFilters(vehicle, criteria);
    });

    // Calculate filter statistics
    const stats = calculateFilterStats(vehicles, filteredVehicles, criteria);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            filtered_results: filteredVehicles,
            original_count: vehicles.length,
            filtered_count: filteredVehicles.length,
            filters_applied: criteria,
            filter_statistics: stats,
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
            error: 'Filter failed',
            message: error.message,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}

function applyAllFilters(vehicle, criteria) {
  // Price filters
  if (criteria.min_price && vehicle.price && vehicle.price < criteria.min_price) {
    return false;
  }
  if (criteria.max_price && vehicle.price && vehicle.price > criteria.max_price) {
    return false;
  }

  // Year filters
  if (criteria.min_year && vehicle.year && vehicle.year < criteria.min_year) {
    return false;
  }
  if (criteria.max_year && vehicle.year && vehicle.year > criteria.max_year) {
    return false;
  }

  // Mileage filters
  if (criteria.min_mileage && vehicle.mileage && vehicle.mileage < criteria.min_mileage) {
    return false;
  }
  if (criteria.max_mileage && vehicle.mileage && vehicle.mileage > criteria.max_mileage) {
    return false;
  }

  // Fuel type filter
  if (criteria.fuel_type) {
    if (!matchesFuelType(vehicle, criteria.fuel_type)) {
      return false;
    }
  }

  // Transmission filter
  if (criteria.transmission) {
    if (!matchesTransmission(vehicle, criteria.transmission)) {
      return false;
    }
  }

  // Drivetrain filter
  if (criteria.drivetrain) {
    if (!matchesDrivetrain(vehicle, criteria.drivetrain)) {
      return false;
    }
  }

  // Color filters
  if (criteria.exterior_color) {
    if (!matchesColor(vehicle.exterior_color, criteria.exterior_color)) {
      return false;
    }
  }
  if (criteria.interior_color) {
    if (!matchesColor(vehicle.interior_color, criteria.interior_color)) {
      return false;
    }
  }

  // Body style filter
  if (criteria.body_style) {
    if (!matchesBodyStyle(vehicle, criteria.body_style)) {
      return false;
    }
  }

  // Doors filter
  if (criteria.doors) {
    if (!matchesDoors(vehicle, criteria.doors)) {
      return false;
    }
  }

  // Features filter
  if (criteria.features && criteria.features.length > 0) {
    if (!hasRequiredFeatures(vehicle, criteria.features)) {
      return false;
    }
  }

  return true;
}

function matchesFuelType(vehicle, targetFuelType) {
  const specs = vehicle.specifications || {};
  const features = vehicle.features || [];
  const title = (vehicle.title || '').toLowerCase();
  const description = (vehicle.description || '').toLowerCase();

  const fuelIndicators = {
    electric: ['electric', 'ev', 'battery', 'plug-in'],
    hybrid: ['hybrid', 'prius', 'camry hybrid', 'accord hybrid'],
    diesel: ['diesel', 'tdi', 'turbodiesel'],
    gas: ['gas', 'gasoline', 'v6', 'v8', 'v4', 'turbo']
  };

  const indicators = fuelIndicators[targetFuelType] || [];
  
  // Check specifications
  for (const [key, value] of Object.entries(specs)) {
    const specText = `${key} ${value}`.toLowerCase();
    for (const indicator of indicators) {
      if (specText.includes(indicator)) {
        return true;
      }
    }
  }

  // Check features
  const featuresText = features.join(' ').toLowerCase();
  for (const indicator of indicators) {
    if (featuresText.includes(indicator)) {
      return true;
    }
  }

  // Check title and description
  const allText = `${title} ${description}`;
  for (const indicator of indicators) {
    if (allText.includes(indicator)) {
      return true;
    }
  }

  return false;
}

function matchesTransmission(vehicle, targetTransmission) {
  const specs = vehicle.specifications || {};
  const title = (vehicle.title || '').toLowerCase();
  
  const transmissionIndicators = {
    automatic: ['automatic', 'auto', 'cvt', 'a/t'],
    manual: ['manual', 'stick', 'mt', 'm/t', '5-speed', '6-speed manual'],
    cvt: ['cvt', 'continuously variable']
  };

  const indicators = transmissionIndicators[targetTransmission] || [];
  
  // Check specifications
  for (const [key, value] of Object.entries(specs)) {
    const specText = `${key} ${value}`.toLowerCase();
    for (const indicator of indicators) {
      if (specText.includes(indicator)) {
        return true;
      }
    }
  }

  // Check title
  for (const indicator of indicators) {
    if (title.includes(indicator)) {
      return true;
    }
  }

  return false;
}

function matchesDrivetrain(vehicle, targetDrivetrain) {
  const specs = vehicle.specifications || {};
  const title = (vehicle.title || '').toLowerCase();
  
  const drivetrainIndicators = {
    fwd: ['fwd', 'front-wheel drive', 'front wheel drive'],
    rwd: ['rwd', 'rear-wheel drive', 'rear wheel drive'],
    awd: ['awd', 'all-wheel drive', 'all wheel drive'],
    '4wd': ['4wd', '4x4', 'four-wheel drive', 'four wheel drive']
  };

  const indicators = drivetrainIndicators[targetDrivetrain] || [];
  
  // Check specifications
  for (const [key, value] of Object.entries(specs)) {
    const specText = `${key} ${value}`.toLowerCase();
    for (const indicator of indicators) {
      if (specText.includes(indicator)) {
        return true;
      }
    }
  }

  // Check title
  for (const indicator of indicators) {
    if (title.includes(indicator)) {
      return true;
    }
  }

  return false;
}

function matchesColor(vehicleColor, targetColor) {
  if (!vehicleColor) return false;
  
  const normalizedVehicleColor = vehicleColor.toLowerCase().trim();
  const normalizedTargetColor = targetColor.toLowerCase().trim();
  
  return normalizedVehicleColor.includes(normalizedTargetColor) || 
         normalizedTargetColor.includes(normalizedVehicleColor);
}

function matchesBodyStyle(vehicle, targetBodyStyle) {
  const specs = vehicle.specifications || {};
  const title = (vehicle.title || '').toLowerCase();
  const targetLower = targetBodyStyle.toLowerCase();
  
  // Check specifications
  for (const [key, value] of Object.entries(specs)) {
    const specText = `${key} ${value}`.toLowerCase();
    if (specText.includes(targetLower)) {
      return true;
    }
  }

  // Check title
  return title.includes(targetLower);
}

function matchesDoors(vehicle, targetDoors) {
  const specs = vehicle.specifications || {};
  
  // Check specifications for door count
  for (const [key, value] of Object.entries(specs)) {
    if (key.toLowerCase().includes('door')) {
      const doorMatch = value.toString().match(/(\d+)/);
      if (doorMatch && parseInt(doorMatch[1]) === targetDoors) {
        return true;
      }
    }
  }

  return false;
}

function hasRequiredFeatures(vehicle, requiredFeatures) {
  const features = vehicle.features || [];
  const specs = vehicle.specifications || {};
  const title = (vehicle.title || '').toLowerCase();
  const description = (vehicle.description || '').toLowerCase();
  
  // Combine all text to search
  const allText = [
    features.join(' '),
    Object.entries(specs).map(([k, v]) => `${k} ${v}`).join(' '),
    title,
    description
  ].join(' ').toLowerCase();

  // Check if all required features are present
  return requiredFeatures.every(feature => {
    const featureLower = feature.toLowerCase();
    return allText.includes(featureLower);
  });
}

function calculateFilterStats(originalVehicles, filteredVehicles, criteria) {
  const stats = {
    reduction_percentage: ((originalVehicles.length - filteredVehicles.length) / originalVehicles.length * 100).toFixed(1),
    filters_used: Object.keys(criteria).length,
    price_range: null,
    year_range: null,
  };

  if (filteredVehicles.length > 0) {
    // Calculate price range
    const prices = filteredVehicles
      .map(v => v.price)
      .filter(p => p && !isNaN(p))
      .sort((a, b) => a - b);
    
    if (prices.length > 0) {
      stats.price_range = {
        min: prices[0],
        max: prices[prices.length - 1],
        average: Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
      };
    }

    // Calculate year range
    const years = filteredVehicles
      .map(v => v.year)
      .filter(y => y && !isNaN(y))
      .sort((a, b) => a - b);
    
    if (years.length > 0) {
      stats.year_range = {
        min: years[0],
        max: years[years.length - 1]
      };
    }
  }

  return stats;
}