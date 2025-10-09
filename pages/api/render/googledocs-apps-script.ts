import type { NextApiRequest, NextApiResponse } from "next";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  sku?: string; icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layout = 4, title = "Product Catalogue", showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams } = req.body as {
      items: Item[]; 
      layout: 1 | 2 | 3 | 4 | 8; 
      title?: string;
      showFields?: Record<string, boolean>;
      hyperlinkToggle?: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
      itemBarcodeTypes?: {[key: number]: "EAN-13" | "QR Code" | "None"};
      barcodeType?: "EAN-13" | "QR Code" | "None";
      bannerColor?: string;
      websiteName?: string;
      utmParams?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmTerm?: string;
      };
    };
    
    if (!items?.length) throw new Error("No items provided");

    // Get Google Apps Script URL from environment variable
    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
    
    if (!googleAppsScriptUrl) {
      throw new Error("Google Apps Script URL not configured. Please set GOOGLE_APPS_SCRIPT_URL environment variable.");
    }

    // Prepare data for Google Apps Script
    const scriptData = {
      items: items.map(item => ({
        ...item,
        // Convert additional images to full URLs if they're relative
        additionalImages: item.additionalImages?.map(img => 
          img.startsWith('http') ? img : `${process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com'}${img}`
        )
      })),
      layout,
      title,
      showFields: showFields || {},
      bannerColor,
      websiteName,
      utmParams: utmParams || {}
    };

    console.log('Calling Google Apps Script with data:', JSON.stringify(scriptData, null, 2));

    // Call Google Apps Script
    const response = await fetch(googleAppsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(scriptData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Apps Script error:', errorText);
      throw new Error(`Google Apps Script failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Google Apps Script error: ${result.error}`);
    }

    console.log('Google Apps Script success:', result);

    // Return the Google Doc information
    res.status(200).json({
      success: true,
      message: "Google Doc created successfully!",
      documentId: result.documentId,
      documentUrl: result.documentUrl,
      documentName: result.documentName,
      instructions: "Your Google Doc has been created and is ready to view and edit."
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create Google Doc";
    console.error('Google Apps Script export error:', message);
    res.status(400).json({ 
      success: false,
      error: message,
      instructions: "Please check that the Google Apps Script is properly configured and deployed."
    });
  }
}
