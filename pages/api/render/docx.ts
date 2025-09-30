import type { NextApiRequest, NextApiResponse } from "next";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from "docx";

type Item = {
  title: string; subtitle?: string; price?: string;
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
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Generated on ${new Date().toLocaleDateString()}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }), // Empty line
          
          // Create table for products
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Image", alignment: AlignmentType.CENTER })],
                    width: { size: 15, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Product Details", alignment: AlignmentType.CENTER })],
                    width: { size: 85, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              // Product rows
              ...items.map(item => createProductRow(item)),
            ],
          }),
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

function createProductRow(item: Item): TableRow {
  const details = [
    item.title,
    item.subtitle ? `Subtitle: ${item.subtitle}` : "",
    item.author ? `Author: ${item.author}` : "",
    item.binding ? `Binding: ${item.binding}` : "",
    item.pages ? `Pages: ${item.pages}` : "",
    item.dimensions ? `Dimensions: ${item.dimensions}` : "",
    item.releaseDate ? `Release Date: ${item.releaseDate}` : "",
    item.imprint ? `Imprint: ${item.imprint}` : "",
    item.weight ? `Weight: ${item.weight}` : "",
    item.illustrations ? `Illustrations: ${item.illustrations}` : "",
    item.edition ? `Edition: ${item.edition}` : "",
    item.price ? `Price: AUD$ ${item.price}` : "",
    `URL: ${SITE}/products/${item.handle}`,
  ].filter(Boolean);

  return new TableRow({
    children: [
      new TableCell({
        children: [
          new Paragraph({
            text: item.imageUrl ? "[Product Image]" : "[No Image]",
            alignment: AlignmentType.CENTER,
          }),
        ],
        width: { size: 15, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: details.map(detail => 
          new Paragraph({
            children: [new TextRun({ text: detail })],
            spacing: { after: 100 },
          })
        ),
        width: { size: 85, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}
