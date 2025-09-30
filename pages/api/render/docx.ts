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

    // Create pages with 4 products each (2x2 grid)
    const productsPerPage = 4;
    const pages = [];
    
    for (let i = 0; i < items.length; i += productsPerPage) {
      const pageItems = items.slice(i, i + productsPerPage);
      
      // Create 2x2 grid table for this page
      const pageTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          // Top row - 2 products
          new TableRow({
            children: [
              new TableCell({
                children: createProductCell(pageItems[0], i + 1),
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: "top",
              }),
              new TableCell({
                children: createProductCell(pageItems[1], i + 2),
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: "top",
              }),
            ],
          }),
          // Bottom row - 2 products
          new TableRow({
            children: [
              new TableCell({
                children: createProductCell(pageItems[2], i + 3),
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: "top",
              }),
              new TableCell({
                children: createProductCell(pageItems[3], i + 4),
                width: { size: 50, type: WidthType.PERCENTAGE },
                verticalAlign: "top",
              }),
            ],
          }),
        ],
      });
      
      pages.push(pageTable);
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

function createProductCell(item: Item | undefined, index: number): Paragraph[] {
  if (!item) {
    return [new Paragraph({ text: "" })];
  }

  return [
    // Title
    new Paragraph({
      children: [
        new TextRun({
          text: item.title,
          bold: true,
          size: 14,
          color: "2C3E50",
        }),
      ],
      spacing: { after: 100 },
    }),
    
    // Subtitle
    ...(item.subtitle ? [new Paragraph({
      children: [
        new TextRun({
          text: item.subtitle,
          italics: true,
          size: 12,
          color: "7F8C8D",
        }),
      ],
      spacing: { after: 100 },
    })] : []),
    
    // Author
    ...(item.author ? [new Paragraph({
      children: [
        new TextRun({
          text: `By ${item.author}`,
          size: 11,
          color: "000000",
        }),
      ],
      spacing: { after: 100 },
    })] : []),
    
    // Description
    ...(item.description ? [new Paragraph({
      children: [
        new TextRun({
          text: item.description,
          size: 10,
          color: "333333",
        }),
      ],
      spacing: { after: 100 },
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
          size: 9,
          color: "666666",
        }),
      ],
      spacing: { after: 100 },
    })] : []),
    
    // Publisher
    ...(item.imprint ? [new Paragraph({
      children: [
        new TextRun({
          text: `Publisher: ${item.imprint}`,
          size: 9,
          color: "666666",
        }),
      ],
      spacing: { after: 50 },
    })] : []),
    
    // Release Date
    ...(item.releaseDate ? [new Paragraph({
      children: [
        new TextRun({
          text: `Release: ${item.releaseDate}`,
          size: 9,
          color: "666666",
        }),
      ],
      spacing: { after: 50 },
    })] : []),
    
    // Price
    ...(item.price ? [new Paragraph({
      children: [
        new TextRun({
          text: `AUD$ ${item.price}`,
          bold: true,
          size: 12,
          color: "D63384",
        }),
      ],
      spacing: { after: 100 },
    })] : []),
    
    // ISBN
    new Paragraph({
      children: [
        new TextRun({
          text: `ISBN: ${item.handle}`,
          size: 9,
          color: "666666",
        }),
      ],
      spacing: { after: 0 },
    }),
  ];
}

