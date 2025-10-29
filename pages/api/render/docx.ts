import type { NextApiRequest, NextApiResponse } from "next";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, ExternalHyperlink } from "docx";
import { downloadImageAsBase64, calculateImageDimensions } from "@/lib/image-utils";
import QRCode from "qrcode-generator";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";
import { layoutRegistry, LayoutType } from "@/lib/layout-registry";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  sku?: string; icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

// const SITE = process.env.SITE_BASE_URL || "https://b27202-c3.myshopify.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, title = "Product Catalogue", layout = 4, showFields, hyperlinkToggle = 'woodslane', itemBarcodeTypes = {}, barcodeType = "None", bannerColor = '#F7981D', websiteName = 'www.woodslane.com.au', utmParams } = req.body as {
      items: Item[];
      title?: string;
      layout?: number | '2-int';
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

    // Function to generate product URLs with UTM parameters
    const generateProductUrl = (handle: string): string => {
      const baseUrls = {
        woodslane: 'https://woodslane.com.au',
        woodslanehealth: 'https://www.woodslanehealth.com.au',
        woodslaneeducation: 'https://www.woodslaneeducation.com.au',
        woodslanepress: 'https://www.woodslanepress.com.au'
      };
      
      const baseUrl = `${baseUrls[hyperlinkToggle]}/products/${handle}`;
      
      // Add UTM parameters if any are provided
      if (utmParams) {
        const utmUrlParams = new URLSearchParams();
        if (utmParams.utmSource) utmUrlParams.set('utm_source', utmParams.utmSource);
        if (utmParams.utmMedium) utmUrlParams.set('utm_medium', utmParams.utmMedium);
        if (utmParams.utmCampaign) utmUrlParams.set('utm_campaign', utmParams.utmCampaign);
        if (utmParams.utmContent) utmUrlParams.set('utm_content', utmParams.utmContent);
        if (utmParams.utmTerm) utmUrlParams.set('utm_term', utmParams.utmTerm);
        
        return utmUrlParams.toString() ? `${baseUrl}?${utmUrlParams.toString()}` : baseUrl;
      }
      
      return baseUrl;
    };

    // Barcode generation functions
    const generateQRCode = (text: string) => {
      try {
        const qr = QRCode(0, 'M');
        qr.addData(text);
        qr.make();
        const dataUrl = qr.createDataURL(4, 0);
        // Convert data URL to base64
        const base64 = dataUrl.split(',')[1];
        return base64;
      } catch (error) {
        console.error('QR Code generation error:', error);
        return null;
      }
    };

    const generateEAN13Barcode = (code: string) => {
      try {
        // Clean the code - remove non-digits
        let cleanCode = code.replace(/[^0-9]/g, '');
        
        console.log('DOCX - Raw code:', code, 'Cleaned:', cleanCode);
        
        // If no numeric data, generate a placeholder barcode
        if (cleanCode.length === 0) {
          console.log('DOCX - No numeric data found, generating placeholder barcode');
          cleanCode = '1234567890123'; // Placeholder EAN-13
        }
        
        // EAN-13 needs exactly 13 digits
        if (cleanCode.length < 13) {
          cleanCode = cleanCode.padStart(13, '0');
        } else if (cleanCode.length > 13) {
          cleanCode = cleanCode.substring(0, 13);
        }
        
        console.log('DOCX - Final EAN-13 code:', cleanCode);
        
        const canvas = createCanvas(150, 60);
        JsBarcode(canvas, cleanCode, {
          format: "EAN13",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2
        });
        
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        return base64;
      } catch (error) {
        console.error('EAN-13 barcode generation error:', error);
        return null;
      }
    };

    // HTML to plain text conversion
    const htmlToPlainText = (html: string): string => {
      if (!html) return '';
      
      let text = html;
      
      // Convert line breaks
      text = text.replace(/<br\s*\/?>/gi, '\n');
      text = text.replace(/<\/p>/gi, '\n');
      text = text.replace(/<p[^>]*>/gi, '');
      
      // Remove all other HTML tags
      text = text.replace(/<[^>]+>/g, '');
      
      // Decode HTML entities
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/&lt;/g, '<');
      text = text.replace(/&gt;/g, '>');
      text = text.replace(/&quot;/g, '"');
      text = text.replace(/&#39;/g, "'");
      
      // Clean up extra whitespace
      text = text.replace(/\n\s*\n/g, '\n\n');
      text = text.trim();
      
      return text;
    };

    // Download images and generate barcodes for all items
    console.log("Downloading images and generating barcodes for DOCX export...");
    const imagePromises = items.map(async (item, index) => {
      let imageData = null;
      if (item.imageUrl) {
        imageData = await downloadImageAsBase64(item.imageUrl);
      }
      
      // Download additional images (internals) - max 4
      let additionalImagesData: Array<{ base64: string; width: number; height: number; mimeType: string }> = [];
      if (item.additionalImages && item.additionalImages.length > 0) {
        const internalPromises = item.additionalImages.slice(0, 4).map(url => downloadImageAsBase64(url));
        const internalResults = await Promise.all(internalPromises);
        additionalImagesData = internalResults.filter(img => img !== null) as Array<{ base64: string; width: number; height: number; mimeType: string }>;
      }
      
      // Determine barcode type for this item
      const itemBarcodeType = itemBarcodeTypes?.[index] || barcodeType;
      let barcodeData = null;
      
      if (itemBarcodeType && itemBarcodeType !== "None") {
        if (itemBarcodeType === "EAN-13") {
          // Use EAN-13 format for 13-digit barcodes
          const barcodeCode = item.sku || item.handle;
          console.log(`DOCX - Generating EAN-13 for item ${index}: sku="${item.sku}", handle="${item.handle}", using="${barcodeCode}"`);
          const barcodeBase64 = generateEAN13Barcode(barcodeCode);
          if (barcodeBase64) {
            barcodeData = {
              base64: barcodeBase64,
              width: 150,
              height: 60,
              mimeType: 'image/png'
            };
          }
        } else if (itemBarcodeType === "QR Code") {
          const productUrl = generateProductUrl(item.handle);
          const qrBase64 = generateQRCode(productUrl);
          if (qrBase64) {
            barcodeData = {
              base64: qrBase64,
              width: 60,
              height: 60,
              mimeType: 'image/png'
            };
          }
        }
      }
      
      return { item, imageData, barcodeData, additionalImagesData };
    });
    
    const itemsWithImages = await Promise.all(imagePromises);
    console.log(`Downloaded ${itemsWithImages.filter(i => i.imageData).length} images and generated ${itemsWithImages.filter(i => i.barcodeData).length} barcodes successfully`);

    // Create pages with 1, 2, 3, or 4 products each based on layout
    const productsPerPage = layout === 1 ? 1 : layout === 2 || layout === '2-int' ? 2 : layout === 3 ? 3 : 4;
    const pages = [];
    
    // Helper function to create banner paragraph
    const createBannerParagraph = (isHeader: boolean): Paragraph => {
      return new Paragraph({
        children: [
          new TextRun({
            text: websiteName,
            bold: true,
            size: 20,
            color: "FFFFFF",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { 
          before: isHeader ? 200 : 400, 
          after: isHeader ? 200 : 200 
        },
        shading: {
          type: "solid",
          color: bannerColor.replace('#', ''),
        },
      });
    };
    
    for (let i = 0; i < itemsWithImages.length; i += productsPerPage) {
      const pageItems = itemsWithImages.slice(i, i + productsPerPage);
      
      if (layout === 1) {
        // 1-per-page layout (single product, full page)
        const pageContent = createProductCell(
          pageItems[0]?.item, 
          i + 1, 
          layout, 
          pageItems[0]?.imageData, 
          generateProductUrl, 
          pageItems[0]?.barcodeData,
          showFields,
          htmlToPlainText,
          pageItems[0]?.additionalImagesData
        );
        
        // Add header banner, page content, and footer banner
        pages.push(createBannerParagraph(true)); // Header banner
        pages.push(...pageContent);
        pages.push(createBannerParagraph(false)); // Footer banner
      } else if (layout === 2 || layout === '2-int') {
        // 2-per-page layout (side by side)
        const pageTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: createProductCell(pageItems[0]?.item, i + 1, layout, pageItems[0]?.imageData, generateProductUrl, pageItems[0]?.barcodeData, showFields, htmlToPlainText, pageItems[0]?.additionalImagesData),
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
                new TableCell({
                  children: createProductCell(pageItems[1]?.item, i + 2, layout, pageItems[1]?.imageData, generateProductUrl, pageItems[1]?.barcodeData, showFields, htmlToPlainText, pageItems[1]?.additionalImagesData),
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
              ],
            }),
          ],
        });
        
        // Add header banner, page content, and footer banner
        pages.push(createBannerParagraph(true)); // Header banner
        pages.push(pageTable);
        pages.push(createBannerParagraph(false)); // Footer banner
      } else if (layout === 3) {
        // 3-per-page layout (3 columns)
        const pageTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: createProductCell(pageItems[0]?.item, i + 1, layout, pageItems[0]?.imageData, generateProductUrl, pageItems[0]?.barcodeData, showFields, htmlToPlainText, pageItems[0]?.additionalImagesData),
                  width: { size: 33.33, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
                new TableCell({
                  children: createProductCell(pageItems[1]?.item, i + 2, layout, pageItems[1]?.imageData, generateProductUrl, pageItems[1]?.barcodeData, showFields, htmlToPlainText, pageItems[1]?.additionalImagesData),
                  width: { size: 33.33, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
                new TableCell({
                  children: createProductCell(pageItems[2]?.item, i + 3, layout, pageItems[2]?.imageData, generateProductUrl, pageItems[2]?.barcodeData, showFields, htmlToPlainText, pageItems[2]?.additionalImagesData),
                  width: { size: 33.33, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
              ],
            }),
          ],
        });
        
        // Add header banner, page content, and footer banner
        pages.push(createBannerParagraph(true)); // Header banner
        pages.push(pageTable);
        pages.push(createBannerParagraph(false)); // Footer banner
      } else {
        // 4-per-page layout (2x2 grid)
        const pageTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
          },
          rows: [
            // Top row - 2 products
            new TableRow({
              children: [
                new TableCell({
                  children: createProductCell(pageItems[0]?.item, i + 1, layout, pageItems[0]?.imageData, generateProductUrl, pageItems[0]?.barcodeData, showFields, htmlToPlainText, pageItems[0]?.additionalImagesData),
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
                new TableCell({
                  children: createProductCell(pageItems[1]?.item, i + 2, layout, pageItems[1]?.imageData, generateProductUrl, pageItems[1]?.barcodeData, showFields, htmlToPlainText, pageItems[1]?.additionalImagesData),
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
              ],
            }),
            // Bottom row - 2 products
            new TableRow({
              children: [
                new TableCell({
                  children: createProductCell(pageItems[2]?.item, i + 3, layout, pageItems[2]?.imageData, generateProductUrl, pageItems[2]?.barcodeData, showFields, htmlToPlainText, pageItems[2]?.additionalImagesData),
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
                new TableCell({
                  children: createProductCell(pageItems[3]?.item, i + 4, layout, pageItems[3]?.imageData, generateProductUrl, pageItems[3]?.barcodeData, showFields, htmlToPlainText, pageItems[3]?.additionalImagesData),
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  verticalAlign: "top",
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                }),
              ],
            }),
          ],
        });
        
        // Add header banner, page content, and footer banner
        pages.push(createBannerParagraph(true)); // Header banner
        pages.push(pageTable);
        pages.push(createBannerParagraph(false)); // Footer banner
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 28,
                color: "2C3E50",
              }),
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on ${new Date().toLocaleDateString()}`,
                size: 18,
                color: "7F8C8D",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          
          // Pages with banners included
          ...pages,
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx"`);
    res.status(200).send(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate DOCX";
    res.status(400).json({ error: message });
  }
}


function createProductCell(
  item: Item | undefined, 
  index: number, 
  layout: number | '2-int', 
  imageData?: { base64: string; width: number; height: number; mimeType: string } | null,
  generateProductUrl?: (handle: string) => string,
  barcodeData?: { base64: string; width: number; height: number; mimeType: string } | null,
  showFields?: Record<string, boolean>,
  htmlToPlainText?: (html: string) => string,
  additionalImagesData?: Array<{ base64: string; width: number; height: number; mimeType: string }>
): Paragraph[] {
  if (!item) {
    return [new Paragraph({ text: "" })];
  }

  // Use handler system if available, otherwise fall back to legacy code
  const layoutHandler = layoutRegistry.getHandler(layout.toString() as LayoutType);
  if (layoutHandler) {
    return layoutHandler.createDocxExport(item, index, imageData, generateProductUrl, barcodeData);
  }

  // Legacy fallback for layouts not yet converted

  // Adjust font sizes based on layout
  const is1PerPage = layout === 1;
  const is2PerPage = layout === 2 || layout === '2-int';
  const is3PerPage = layout === 3;
  const titleSize = is1PerPage ? 24 : is2PerPage ? 18 : is3PerPage ? 16 : 14;
  const subtitleSize = is1PerPage ? 18 : is2PerPage ? 14 : is3PerPage ? 12 : 12;
  const authorSize = is1PerPage ? 16 : is2PerPage ? 13 : is3PerPage ? 12 : 11;
  const descSize = is1PerPage ? 14 : is2PerPage ? 12 : is3PerPage ? 11 : 10;
  const specSize = is1PerPage ? 12 : is2PerPage ? 11 : is3PerPage ? 10 : 9;
  const metaSize = is1PerPage ? 12 : is2PerPage ? 10 : is3PerPage ? 9 : 9;
  const priceSize = is1PerPage ? 20 : is2PerPage ? 14 : is3PerPage ? 13 : 12;

  const paragraphs: Paragraph[] = [];

  // Add image if available
  if (imageData) {
    const maxWidth = is1PerPage ? 200 : is2PerPage ? 120 : is3PerPage ? 100 : 80;
    const maxHeight = is1PerPage ? 300 : is2PerPage ? 180 : is3PerPage ? 150 : 120;
    
    const dimensions = calculateImageDimensions(
      imageData.width, 
      imageData.height, 
      maxWidth, 
      maxHeight
    );

    try {
      const imageRun = new ImageRun({
        data: imageData.base64,
        transformation: {
          width: dimensions.width,
          height: dimensions.height,
        },
        type: "png", // or "jpeg" based on mimeType
      });
      
      paragraphs.push(new Paragraph({
        children: [imageRun],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }));
    } catch (error) {
      console.warn(`Failed to create image for ${item.title}:`, error);
      // Continue without image
    }
  }

  // Title (clickable)
  const productUrl = generateProductUrl ? generateProductUrl(item.handle) : `https://woodslane.com.au/products/${item.handle}`;
  paragraphs.push(new Paragraph({
      children: [
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: item.title,
              bold: true,
              size: titleSize,
              color: "2C3E50",
              underline: {},
            }),
          ],
          link: productUrl,
        }),
      ],
      spacing: { after: is2PerPage ? 150 : 100 },
    }));
    
    // Subtitle
    if (item.subtitle) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: item.subtitle,
            italics: true,
            size: subtitleSize,
            color: "7F8C8D",
          }),
        ],
        spacing: { after: is2PerPage ? 150 : 100 },
      }));
    }
    
    // Author
    if (item.author) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `By ${item.author}`,
            size: authorSize,
            color: "000000",
          }),
        ],
        spacing: { after: is2PerPage ? 150 : 100 },
      }));
    }
    
    // Description
    if (item.description) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: item.description,
            size: descSize,
            color: "333333",
          }),
        ],
        spacing: { after: is2PerPage ? 200 : 100 },
      }));
    }
    
    // Specs
    if (item.binding || item.pages || item.dimensions) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: [
              item.binding,
              item.pages && `${item.pages} pages`,
              item.dimensions
            ].filter(Boolean).join(" • "),
            size: specSize,
            color: "666666",
          }),
        ],
        spacing: { after: is2PerPage ? 150 : 100 },
      }));
    }
    
    // Publisher
    if (item.imprint) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `Publisher: ${item.imprint}`,
            size: metaSize,
            color: "666666",
          }),
        ],
        spacing: { after: is2PerPage ? 100 : 50 },
      }));
    }
    
    // Release Date
    if (item.releaseDate) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `Release: ${item.releaseDate}`,
            size: metaSize,
            color: "666666",
          }),
        ],
        spacing: { after: is2PerPage ? 100 : 50 },
      }));
    }
    
    // Weight
    if (item.weight) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `Weight: ${item.weight}`,
            size: metaSize,
            color: "666666",
          }),
        ],
        spacing: { after: is2PerPage ? 100 : 50 },
      }));
    }
    
    // Illustrations
    if (item.illustrations) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `Illustrations: ${item.illustrations}`,
            size: metaSize,
            color: "666666",
          }),
        ],
        spacing: { after: is2PerPage ? 100 : 50 },
      }));
    }
    
    // Price
    if (item.price) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: `AUD$ ${item.price}`,
            bold: true,
            size: priceSize,
            color: "D63384",
          }),
        ],
        spacing: { after: is2PerPage ? 150 : 100 },
      }));
    }
    
    // Product URL removed - title is now clickable

  // Add author bio for 1-up layout
  if (is1PerPage && showFields?.authorBio && item.authorBio && htmlToPlainText) {
    const plainTextBio = htmlToPlainText(item.authorBio);
    if (plainTextBio) {
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: "Author Bio:",
            bold: true,
            size: 12,
            color: "1565C0",
          }),
        ],
        spacing: { before: 200, after: 100 },
      }));
      
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: plainTextBio,
            size: 11,
            color: "333333",
          }),
        ],
        spacing: { after: 150 },
        shading: {
          type: "solid",
          color: "E3F2FD",
        },
      }));
    }
  }

  // Add internals for 1-up layout
  if (is1PerPage && additionalImagesData && additionalImagesData.length > 0) {
    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: "Internals:",
          bold: true,
          size: 12,
          color: "495057",
        }),
      ],
      spacing: { before: 200, after: 100 },
    }));
    
    // Add internal images (max 4, 10% bigger than HTML = 39x55px)
    const internalImageRuns: ImageRun[] = [];
    for (const imgData of additionalImagesData.slice(0, 4)) {
      try {
        const dimensions = calculateImageDimensions(
          imgData.width,
          imgData.height,
          39,  // 10% bigger than original 35px
          55   // 10% bigger than original 50px
        );
        
        internalImageRuns.push(new ImageRun({
          data: imgData.base64,
          transformation: {
            width: dimensions.width,
            height: dimensions.height,
          },
          type: "png",
        }));
      } catch (error) {
        console.warn('Failed to add internal image:', error);
      }
    }
    
    if (internalImageRuns.length > 0) {
      paragraphs.push(new Paragraph({
        children: internalImageRuns,
        spacing: { after: 150 },
        shading: {
          type: "solid",
          color: "F5F5F5",
        },
      }));
    }
  }

  // Add internal image for 2-int layout
  if (layout === '2-int' && additionalImagesData && additionalImagesData.length > 0) {
    try {
      const internalImageRun = new ImageRun({
        data: additionalImagesData[0].base64,
        transformation: {
          width: 60,  // Same size as HTML
          height: 80,
        },
        type: "png",
      });
      
      paragraphs.push(new Paragraph({
        children: [internalImageRun],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 150 },
      }));
    } catch (error) {
      console.warn(`Failed to create internal image for ${item.title}:`, error);
    }
  }

  // Add barcode if available
  if (barcodeData) {
    try {
      const barcodeRun = new ImageRun({
        data: barcodeData.base64,
        transformation: {
          width: barcodeData.width * 0.5,  // 50% smaller
          height: barcodeData.height * 0.5,
        },
        type: "png",
      });
      
      paragraphs.push(new Paragraph({
        children: [barcodeRun],
        alignment: AlignmentType.CENTER,
        spacing: { before: 150, after: 150 },
      }));
    } catch (error) {
      console.error('Error adding barcode to DOCX:', error);
    }
  }

  return paragraphs;
}

