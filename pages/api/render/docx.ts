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
                size: 32,
                color: "2C3E50",
              }),
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated on ${new Date().toLocaleDateString()}`,
                size: 20,
                color: "7F8C8D",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
          }),
          
          // Products
          ...items.map((item, index) => createProductSection(item, index + 1)),
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

function createProductSection(item: Item, index: number) {
  const elements = [
    // Product number and title
    new Paragraph({
      children: [
        new TextRun({
          text: `${index}. `,
          bold: true,
          size: 24,
          color: "34495E",
        }),
        new TextRun({
          text: item.title,
          bold: true,
          size: 24,
          color: "2C3E50",
        }),
      ],
      spacing: { after: 200 },
    }),

    // Subtitle
    ...(item.subtitle ? [new Paragraph({
      children: [
        new TextRun({
          text: item.subtitle,
          italic: true,
          size: 20,
          color: "7F8C8D",
        }),
      ],
      spacing: { after: 200 },
    })] : []),

    // Description
    ...(item.description ? [new Paragraph({
      children: [
        new TextRun({
          text: item.description,
          size: 18,
          color: "34495E",
        }),
      ],
      spacing: { after: 300 },
    })] : []),

    // Product details table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        // Image and basic info row
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.imageUrl ? "📖" : "📚",
                      size: 32,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.imageUrl ? "Product Image" : "No Image Available",
                      size: 14,
                      color: "7F8C8D",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              width: { size: 20, type: WidthType.PERCENTAGE },
              verticalAlign: "center",
            }),
            new TableCell({
              children: [
                // Author
                ...(item.author ? [new Paragraph({
                  children: [
                    new TextRun({
                      text: "👤 Author: ",
                      bold: true,
                      size: 16,
                      color: "2C3E50",
                    }),
                    new TextRun({
                      text: item.author,
                      size: 16,
                      color: "34495E",
                    }),
                  ],
                  spacing: { after: 100 },
                })] : []),
                
                // Price
                ...(item.price ? [new Paragraph({
                  children: [
                    new TextRun({
                      text: "💰 Price: ",
                      bold: true,
                      size: 16,
                      color: "2C3E50",
                    }),
                    new TextRun({
                      text: `AUD$ ${item.price}`,
                      bold: true,
                      size: 18,
                      color: "E74C3C",
                    }),
                  ],
                  spacing: { after: 100 },
                })] : []),
                
                // Binding and Pages
                ...(item.binding || item.pages ? [new Paragraph({
                  children: [
                    new TextRun({
                      text: "📖 ",
                      size: 16,
                    }),
                    new TextRun({
                      text: [item.binding, item.pages && `${item.pages} pages`].filter(Boolean).join(" • "),
                      size: 16,
                      color: "34495E",
                    }),
                  ],
                  spacing: { after: 100 },
                })] : []),
              ],
              width: { size: 80, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        
        // Additional details row
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "📋 Additional Details",
                      bold: true,
                      size: 16,
                      color: "2C3E50",
                    }),
                  ],
                  spacing: { after: 200 },
                }),
                ...getDetailParagraphs(item),
              ],
              colSpan: 2,
            }),
          ],
        }),
      ],
    }),

    // Product URL
    new Paragraph({
      children: [
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: `🔗 View Product: ${SITE}/products/${item.handle}`,
              size: 16,
              color: "3498DB",
              underline: {},
            }),
          ],
          link: `${SITE}/products/${item.handle}`,
        }),
      ],
      spacing: { after: 400 },
    }),

    // Separator line
    new Paragraph({
      children: [
        new TextRun({
          text: "─".repeat(50),
          size: 16,
          color: "BDC3C7",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  return elements;
}

function getDetailParagraphs(item: Item): Paragraph[] {
  const details = [
    item.dimensions && `📏 Dimensions: ${item.dimensions}`,
    item.releaseDate && `📅 Release Date: ${item.releaseDate}`,
    item.imprint && `🏢 Imprint: ${item.imprint}`,
    item.weight && `⚖️ Weight: ${item.weight}`,
    item.illustrations && `🎨 Illustrations: ${item.illustrations}`,
    item.edition && `📚 Edition: ${item.edition}`,
    item.authorBio && `👨‍💼 Author Bio: ${item.authorBio}`,
  ].filter(Boolean);

  return details.map(detail => 
    new Paragraph({
      children: [
        new TextRun({
          text: detail!,
          size: 14,
          color: "34495E",
        }),
      ],
      spacing: { after: 100 },
    })
  );
}
