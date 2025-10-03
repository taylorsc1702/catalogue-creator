import type { NextApiRequest, NextApiResponse } from "next";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, ExternalHyperlink } from "docx";
import { downloadImageAsBase64, calculateImageDimensions } from "@/lib/image-utils";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

// const SITE = process.env.SITE_BASE_URL || "https://b27202-c3.myshopify.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, title = "Product Catalogue", layout = 4, hyperlinkToggle = 'woodslane', utmParams } = req.body as {
      items: Item[];
      title?: string;
      layout?: number;
      hyperlinkToggle?: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
      utmParams?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        utmContent?: string;
        utmTerm?: string;
      };
    };
    
    if (!items?.length) throw new Error("No items provided");

    // Download images for all items
    console.log("Downloading images for DOCX export...");
    const imagePromises = items.map(async (item) => {
      if (item.imageUrl) {
        const imageData = await downloadImageAsBase64(item.imageUrl);
        return { item, imageData };
      }
      return { item, imageData: null };
    });
    
    const itemsWithImages = await Promise.all(imagePromises);
    console.log(`Downloaded ${itemsWithImages.filter(i => i.imageData).length} images successfully`);

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

    // Create pages with 2, 3, or 4 products each based on layout
    const productsPerPage = layout === 2 ? 2 : layout === 3 ? 3 : 4;
    const pages = [];
    
    for (let i = 0; i < itemsWithImages.length; i += productsPerPage) {
      const pageItems = itemsWithImages.slice(i, i + productsPerPage);
      
      if (layout === 2) {
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
                  children: createProductCell(pageItems[0]?.item, i + 1, layout, pageItems[0]?.imageData, generateProductUrl),
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
                  children: createProductCell(pageItems[1]?.item, i + 2, layout, pageItems[1]?.imageData, generateProductUrl),
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
        pages.push(pageTable);
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
                  children: createProductCell(pageItems[0]?.item, i + 1, layout, pageItems[0]?.imageData, generateProductUrl),
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
                  children: createProductCell(pageItems[1]?.item, i + 2, layout, pageItems[1]?.imageData, generateProductUrl),
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
                  children: createProductCell(pageItems[2]?.item, i + 3, layout, pageItems[2]?.imageData, generateProductUrl),
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
        pages.push(pageTable);
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
                  children: createProductCell(pageItems[0]?.item, i + 1, layout, pageItems[0]?.imageData, generateProductUrl),
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
                  children: createProductCell(pageItems[1]?.item, i + 2, layout, pageItems[1]?.imageData, generateProductUrl),
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
                  children: createProductCell(pageItems[2]?.item, i + 3, layout, pageItems[2]?.imageData, generateProductUrl),
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
                  children: createProductCell(pageItems[3]?.item, i + 4, layout, pageItems[3]?.imageData, generateProductUrl),
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
        pages.push(pageTable);
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
          
          // Pages with 4 products each
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
  layout: number, 
  imageData?: { base64: string; width: number; height: number; mimeType: string } | null,
  generateProductUrl?: (handle: string) => string
): Paragraph[] {
  if (!item) {
    return [new Paragraph({ text: "" })];
  }

  // Adjust font sizes based on layout
  const is2PerPage = layout === 2;
  const is3PerPage = layout === 3;
  const titleSize = is2PerPage ? 18 : is3PerPage ? 16 : 14;
  const subtitleSize = is2PerPage ? 14 : is3PerPage ? 12 : 12;
  const authorSize = is2PerPage ? 13 : is3PerPage ? 12 : 11;
  const descSize = is2PerPage ? 12 : is3PerPage ? 11 : 10;
  const specSize = is2PerPage ? 11 : is3PerPage ? 10 : 9;
  const metaSize = is2PerPage ? 10 : is3PerPage ? 9 : 9;
  const priceSize = is2PerPage ? 14 : is3PerPage ? 13 : 12;
  const isbnSize = is2PerPage ? 10 : is3PerPage ? 9 : 9;

  const paragraphs: Paragraph[] = [];

  // Add image if available
  if (imageData) {
    const maxWidth = is2PerPage ? 120 : is3PerPage ? 100 : 80;
    const maxHeight = is2PerPage ? 180 : is3PerPage ? 150 : 120;
    
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

  return paragraphs;
}

