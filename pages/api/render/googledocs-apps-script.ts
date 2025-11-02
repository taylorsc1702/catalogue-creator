import type { NextApiRequest, NextApiResponse } from "next";
import { generateProductUrl, generateQRCode, generateEAN13Barcode, type HyperlinkToggle, type BarcodeType, type UtmParams } from "../../../utils/product-card-renderer";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse the request body
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Missing JSON body' });
    }

    // Generate barcode URLs for items before passing to Google Apps Script
    const items = payload.items || [];
    const itemBarcodeTypes: {[key: number]: BarcodeType} = payload.itemBarcodeTypes || {};
    const barcodeType: BarcodeType = payload.barcodeType || 'None';
    const hyperlinkToggle: HyperlinkToggle = payload.hyperlinkToggle || 'woodslane';
    const utmParams: UtmParams = payload.utmParams || {};

    // Add barcode image URLs to each item
    const itemsWithBarcodes = items.map((item: any, index: number) => {
      const itemBarcodeType = itemBarcodeTypes[index] || barcodeType;
      
      if (itemBarcodeType && itemBarcodeType !== 'None') {
        if (itemBarcodeType === 'QR Code') {
          const productUrl = generateProductUrl(item.handle, hyperlinkToggle, utmParams);
          const qrDataUrl = generateQRCode(productUrl);
          return { ...item, barcodeImageUrl: qrDataUrl, barcodeType: 'QR Code' };
        } else if (itemBarcodeType === 'EAN-13') {
          // Extract ISBN/SKU for barcode
          const idObj = item as { isbn13?: string; sku?: string };
          let ean13 = idObj.isbn13 || item.sku || item.handle.replace(/[^0-9]/g, '');
          if (!ean13 || ean13.length < 10) {
            ean13 = ''.padStart(13, '0');
          }
          if (ean13.length < 13) ean13 = ean13.padStart(13, '0');
          if (ean13.length > 13) ean13 = ean13.substring(0, 13);
          
          const barcodeDataUrl = generateEAN13Barcode(ean13);
          return { ...item, barcodeImageUrl: barcodeDataUrl, barcodeCode: ean13, barcodeType: 'EAN-13' };
        }
      }
      
      return item;
    });

    // Update payload with items that have barcode URLs
    const updatedPayload = {
      ...payload,
      items: itemsWithBarcodes
    };

    console.log('Received request with barcode URLs generated');

    // Get Google Apps Script URL from environment variable
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!url) {
      console.error('Missing GOOGLE_APPS_SCRIPT_URL environment variable');
      return res.status(500).json({ error: 'Missing GOOGLE_APPS_SCRIPT_URL env' });
    }

    console.log('Calling Google Apps Script:', url);

    // Call Google Apps Script with pass-through approach (with barcode URLs)
    const gasResponse = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(updatedPayload),
      cache: 'no-store', // no cache to avoid stale behavior
    });

    console.log('Google Apps Script response status:', gasResponse.status);

    const responseText = await gasResponse.text();
    console.log('Google Apps Script response text:', responseText);

    // Try to parse JSON but don't crash if it's plain text
    let jsonResponse: unknown;
    try { 
      jsonResponse = JSON.parse(responseText); 
    } catch { 
      jsonResponse = { raw: responseText }; 
    }

    console.log('Parsed response:', jsonResponse);

    // Always bubble up GAS status & body so you can see errors in Network tab
    // Return 200 to your UI even if GAS failed, so frontend can handle the response
    return res.status(200).json({ 
      status: gasResponse.status, 
      body: jsonResponse,
      gasSuccess: gasResponse.ok,
      originalResponse: responseText
    });

  } catch (e: unknown) {
    const error = e as Error;
    console.error('Route error:', error);
    return res.status(500).json({ 
      error: error?.message || String(e),
      type: 'route_error'
    });
  }
}
