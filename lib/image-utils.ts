/**
 * Utility functions for handling images in exports
 */

export interface ImageData {
  url: string;
  base64: string;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Download an image from URL and convert to base64 (Node.js version)
 */
export async function downloadImageAsBase64(url: string): Promise<ImageData | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to download image: ${url}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Detect MIME type from response headers
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0];
    
    // Convert to base64 (Node.js way)
    const base64 = Buffer.from(uint8Array).toString('base64');
    
    // For now, use fallback dimensions since we can't easily get image dimensions in Node.js
    // In a production app, you might want to use a library like 'sharp' or 'jimp'
    const width = 200; // fallback
    const height = 300; // fallback
    
    return {
      url,
      base64: `data:${mimeType};base64,${base64}`,
      width,
      height,
      mimeType
    };
  } catch (error) {
    console.error(`Error downloading image ${url}:`, error);
    return null;
  }
}

/**
 * Download multiple images in parallel
 */
export async function downloadImages(images: string[]): Promise<ImageData[]> {
  const results = await Promise.allSettled(
    images.map(url => downloadImageAsBase64(url))
  );
  
  return results
    .filter((result): result is PromiseFulfilledResult<ImageData | null> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value!);
}

/**
 * Create a data URL for an image (for Google Docs)
 */
export function createDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Resize image dimensions while maintaining aspect ratio
 */
export function calculateImageDimensions(
  originalWidth: number, 
  originalHeight: number, 
  maxWidth: number, 
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  let width = maxWidth;
  let height = maxWidth / aspectRatio;
  
  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}
