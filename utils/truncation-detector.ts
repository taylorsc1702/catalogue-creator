// utils/truncation-detector.ts
// Utility for detecting if text fields exceed layout-specific character limits

export type LayoutType = 1 | 2 | '2-int' | 3 | 4 | 8;

export type TruncationLimits = {
  description?: number;
  authorBio?: number;
};

// Layout-specific character limits for descriptions and author bios
export const TRUNCATION_LIMITS: Record<string, TruncationLimits> = {
  '1-up': {
    description: 1000,
    authorBio: 752
  },
  '2-up': {
    description: 997
  },
  '2-int': {
    description: 997
  },
  '3-up': {
    // Mixed layout uses 1397, standalone uses 997
    // We'll use 1397 for mixed (default) and can override
    description: 1397
  },
  '3-up-standalone': {
    description: 997
  },
  '4-up': {
    description: 947
  },
  '8-up': {
    description: 997
  }
};

export interface TruncationResult {
  isTruncated: boolean;
  originalLength: number;
  limit: number;
  truncatedLength: number;
  percentOver: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
}

/**
 * Check if a text field is truncated for a given layout
 */
export function checkTruncation(
  text: string | undefined,
  fieldType: 'description' | 'authorBio',
  layout: LayoutType,
  isMixed: boolean = false
): TruncationResult {
  if (!text || text.trim().length === 0) {
    return {
      isTruncated: false,
      originalLength: 0,
      limit: 0,
      truncatedLength: 0,
      percentOver: 0,
      severity: 'none'
    };
  }

  // Get layout key
  let layoutKey = String(layout);
  
  // Special handling for 3-up in mixed layouts
  if (layout === 3 && isMixed) {
    layoutKey = '3-up';
  } else if (layout === 3 && !isMixed) {
    layoutKey = '3-up-standalone';
  }

  const limits = TRUNCATION_LIMITS[layoutKey] || {};
  const limit = limits[fieldType];

  if (!limit) {
    // No limit defined for this field/layout combination
    return {
      isTruncated: false,
      originalLength: text.length,
      limit: 0,
      truncatedLength: text.length,
      percentOver: 0,
      severity: 'none'
    };
  }

  const originalLength = text.length;
  const isTruncated = originalLength > limit;
  const truncatedLength = isTruncated ? limit : originalLength;
  const percentOver = isTruncated ? ((originalLength - limit) / limit) * 100 : 0;

  // Determine severity
  let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
  if (isTruncated) {
    if (percentOver > 50) {
      severity = 'severe';
    } else if (percentOver > 25) {
      severity = 'moderate';
    } else {
      severity = 'mild';
    }
  }

  return {
    isTruncated,
    originalLength,
    limit,
    truncatedLength,
    percentOver,
    severity
  };
}

/**
 * Get all truncation issues for an item
 */
export function getItemTruncations(
  item: { description?: string; authorBio?: string },
  layout: LayoutType,
  isMixed: boolean = false
): {
  description?: TruncationResult;
  authorBio?: TruncationResult;
} {
  const result: {
    description?: TruncationResult;
    authorBio?: TruncationResult;
  } = {};

  if (item.description !== undefined) {
    result.description = checkTruncation(item.description, 'description', layout, isMixed);
  }

  if (item.authorBio !== undefined) {
    result.authorBio = checkTruncation(item.authorBio, 'authorBio', layout, isMixed);
  }

  return result;
}

/**
 * Check if item has any truncation issues
 */
export function hasTruncationIssues(
  item: { description?: string; authorBio?: string },
  layout: LayoutType,
  isMixed: boolean = false
): boolean {
  const truncations = getItemTruncations(item, layout, isMixed);
  return (
    (truncations.description?.isTruncated ?? false) ||
    (truncations.authorBio?.isTruncated ?? false)
  );
}

