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
          
          // Products - simplified
          ...items.flatMap((item, index) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${index + 1}. ${item.title}`,
                  bold: true,
                  size: 24,
                  color: "2C3E50",
                }),
              ],
              spacing: { after: 200 },
            }),
            ...(item.subtitle ? [new Paragraph({
              children: [
                new TextRun({
                  text: item.subtitle,
                  italics: true,
                  size: 20,
                  color: "7F8C8D",
                }),
              ],
              spacing: { after: 200 },
            })] : []),
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
            ...(item.author ? [new Paragraph({
              children: [
                new TextRun({
                  text: `Author: ${item.author}`,
                  size: 16,
                  color: "667eea",
                }),
              ],
              spacing: { after: 100 },
            })] : []),
            ...(item.price ? [new Paragraph({
              children: [
                new TextRun({
                  text: `Price: AUD$ ${item.price}`,
                  bold: true,
                  size: 18,
                  color: "E74C3C",
                }),
              ],
              spacing: { after: 100 },
            })] : []),
            new Paragraph({
              children: [
                new TextRun({
                  text: `URL: ${SITE}/products/${item.handle}`,
                  size: 14,
                  color: "3498DB",
                }),
              ],
              spacing: { after: 400 },
            }),
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
          ]),
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

