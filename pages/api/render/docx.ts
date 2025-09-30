import type { NextApiRequest, NextApiResponse } from "next";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, ExternalHyperlink } from "docx";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

const SITE = process.env.SITE_BASE_URL || "https://b27202-c3.myshopify.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, title = "Product Catalogue" } = req.body as {
      items: Item[];
      title?: string;
    };
    
    if (!items?.length) throw new Error("No items provided");

    // Create pages with 2 or 4 products each based on layout
    const layout = req.body.layout || 4; // Default to 4-per-page
    const productsPerPage = layout === 2 ? 2 : 4;
    const pages = [];
    
    for (let i = 0; i < items.length; i += productsPerPage) {
      const pageItems = items.slice(i, i + productsPerPage);
      
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
                  children: createProductCell(pageItems[0], i + 1, layout),
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
                  children: createProductCell(pageItems[1], i + 2, layout),
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
                  children: createProductCell(pageItems[0], i + 1, layout),
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
                  children: createProductCell(pageItems[1], i + 2, layout),
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
                  children: createProductCell(pageItems[2], i + 3, layout),
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
                  children: createProductCell(pageItems[3], i + 4, layout),
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

function createProductCell(item: Item | undefined, index: number, layout: number): Paragraph[] {
  if (!item) {
    return [new Paragraph({ text: "" })];
  }

  // Adjust font sizes based on layout
  const is2PerPage = layout === 2;
  const titleSize = is2PerPage ? 18 : 14;
  const subtitleSize = is2PerPage ? 14 : 12;
  const authorSize = is2PerPage ? 13 : 11;
  const descSize = is2PerPage ? 12 : 10;
  const specSize = is2PerPage ? 11 : 9;
  const metaSize = is2PerPage ? 10 : 9;
  const priceSize = is2PerPage ? 14 : 12;
  const isbnSize = is2PerPage ? 10 : 9;

  return [
    // Title
    new Paragraph({
      children: [
        new TextRun({
          text: item.title,
          bold: true,
          size: titleSize,
          color: "2C3E50",
        }),
      ],
      spacing: { after: is2PerPage ? 150 : 100 },
    }),
    
    // Subtitle
    ...(item.subtitle ? [new Paragraph({
      children: [
        new TextRun({
          text: item.subtitle,
          italics: true,
          size: subtitleSize,
          color: "7F8C8D",
        }),
      ],
      spacing: { after: is2PerPage ? 150 : 100 },
    })] : []),
    
    // Author
    ...(item.author ? [new Paragraph({
      children: [
        new TextRun({
          text: `By ${item.author}`,
          size: authorSize,
          color: "000000",
        }),
      ],
      spacing: { after: is2PerPage ? 150 : 100 },
    })] : []),
    
    // Description
    ...(item.description ? [new Paragraph({
      children: [
        new TextRun({
          text: item.description,
          size: descSize,
          color: "333333",
        }),
      ],
      spacing: { after: is2PerPage ? 200 : 100 },
    })] : []),
    
    // Specs
    ...(item.binding || item.pages || item.dimensions ? [new Paragraph({
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
    })] : []),
    
    // Publisher
    ...(item.imprint ? [new Paragraph({
      children: [
        new TextRun({
          text: `Publisher: ${item.imprint}`,
          size: metaSize,
          color: "666666",
        }),
      ],
      spacing: { after: is2PerPage ? 100 : 50 },
    })] : []),
    
    // Release Date
    ...(item.releaseDate ? [new Paragraph({
      children: [
        new TextRun({
          text: `Release: ${item.releaseDate}`,
          size: metaSize,
          color: "666666",
        }),
      ],
      spacing: { after: is2PerPage ? 100 : 50 },
    })] : []),
    
    // Weight
    ...(item.weight ? [new Paragraph({
      children: [
        new TextRun({
          text: `Weight: ${item.weight}`,
          size: metaSize,
          color: "666666",
        }),
      ],
      spacing: { after: is2PerPage ? 100 : 50 },
    })] : []),
    
    // Illustrations
    ...(item.illustrations ? [new Paragraph({
      children: [
        new TextRun({
          text: `Illustrations: ${item.illustrations}`,
          size: metaSize,
          color: "666666",
        }),
      ],
      spacing: { after: is2PerPage ? 100 : 50 },
    })] : []),
    
    // Price
    ...(item.price ? [new Paragraph({
      children: [
        new TextRun({
          text: `AUD$ ${item.price}`,
          bold: true,
          size: priceSize,
          color: "D63384",
        }),
      ],
      spacing: { after: is2PerPage ? 150 : 100 },
    })] : []),
    
    // ISBN
    new Paragraph({
      children: [
        new TextRun({
          text: `ISBN: ${item.handle}`,
          size: isbnSize,
          color: "666666",
        }),
      ],
      spacing: { after: 0 },
    }),
  ];
}

