import React from 'react';
import Image from 'next/image';
import { LayoutHandler, Item, esc } from '../layout-handlers';
import { Paragraph, AlignmentType, ImageRun, TextRun, ExternalHyperlink } from 'docx';

export function create9UpLayoutHandler(): LayoutHandler {
  return {
    name: '9-up',
    getPerPage: () => 9,
    
    createPreview: (item: Item, index: number, generateProductUrl: (handle: string) => string) => {
      return (
        <div key={index} style={{ 
          border: "2px solid #E9ECEF", 
          borderRadius: 12, 
          padding: 12, 
          display: "flex", 
          gap: 12,
          background: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
          height: "fit-content",
          alignItems: "flex-start"
        }}>
          <div style={{ 
            flexShrink: 0,
            width: "70px"
          }}>
            <Image 
              src={item.imageUrl || "https://via.placeholder.com/70x105?text=No+Image"} 
              alt={item.title}
              width={70}
              height={105}
              style={{ 
                objectFit: "cover", 
                borderRadius: 6, 
                background: "#F8F9FA",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
              }}
            />
          </div>
          {item.price && (
            <div style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "#ffffff",
              color: "#000000",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              AUD$ {item.price}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ 
              margin: "0 0 6px 0", 
              fontSize: 13, 
              fontWeight: 600, 
              color: "#212529",
              lineHeight: 1.3
            }}>
              <a 
                href={generateProductUrl(item.handle)} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {esc(item.title)}
              </a>
            </h3>
            {item.author && (
              <div style={{ fontSize: 11, color: "#6C757D", marginBottom: 4 }}>
                {esc(item.author)}
              </div>
            )}
            {item.sku && (
              <div style={{ fontSize: 10, color: "#868E96", marginTop: 4 }}>
                ISBN: {esc(item.sku)}
              </div>
            )}
          </div>
        </div>
      );
    },
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string, bannerColor?: string, websiteName?: string) => {
      return `
        <div class="product-card layout-9-vertical">
          <div class="product-image-9up">
            <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover-9up">
          </div>
          <div class="product-title-9up">
            <h2 class="product-title"><a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a></h2>
          </div>
          <div class="product-biblio-9up">
            ${item.author ? `<div class="biblio-item" style="font-size: 12px;">${esc(item.author)}</div>` : ""}
            ${item.imprint ? `<div class="biblio-item" style="font-size: 12px;">${esc(item.imprint)}</div>` : ""}
            ${item.sku ? `<div class="biblio-item" style="font-size: 12px;">ISBN: ${esc(item.sku)}</div>` : ""}
            ${item.binding ? `<div class="biblio-item" style="font-size: 12px;">${esc(item.binding)}</div>` : ""}
            ${item.price ? `<div class="biblio-item" style="font-size: 12px;">AUD$ ${esc(item.price)}</div>` : ""}
          </div>
          <div class="barcode-9up">
            ${barcodeHtml || ''}
          </div>
        </div>
      `;
    },

    createDocxExport: (item: Item, index: number, imageData?: { base64: string; width: number; height: number; mimeType: string } | null, generateProductUrl?: (handle: string) => string, barcodeData?: { base64: string; width: number; height: number; mimeType: string } | null) => {
      const productUrl = generateProductUrl ? generateProductUrl(item.handle) : `https://woodslane.com.au/products/${item.handle}`;
      const paragraphs: Paragraph[] = [];

      // Add image if available
      if (imageData) {
        try {
          const imageRun = new ImageRun({
            data: imageData.base64,
            transformation: {
              width: 70,
              height: 105,
            },
            type: "png",
          });
          
          paragraphs.push(new Paragraph({
            children: [imageRun],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }));
        } catch (error) {
          console.warn(`Failed to create image for ${item.title}:`, error);
        }
      }

      // Title (clickable)
      paragraphs.push(new Paragraph({
        children: [
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: item.title,
                bold: true,
                size: 13,
                color: "2C3E50",
                underline: {},
              }),
            ],
            link: productUrl,
          }),
        ],
        spacing: { after: 100 },
      }));

      // Author
      if (item.author) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: item.author,
              size: 10,
              color: "667eea",
              bold: true,
            }),
          ],
          spacing: { after: 100 },
        }));
      }

      // Specs
      const specs = [item.imprint, item.sku && `ISBN: ${item.sku}`, item.binding].filter(Boolean);
      if (specs.length > 0) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: specs.join(" • "),
              size: 9,
              color: "6C757D",
            }),
          ],
          spacing: { after: 100 },
        }));
      }

      // Price
      if (item.price) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `AUD$ ${item.price}`,
              bold: true,
              size: 11,
              color: "2C3E50",
            }),
          ],
          spacing: { after: 200 },
        }));
      }

      // Add barcode image if available
      if (barcodeData) {
        try {
          const barcodeRun = new ImageRun({
            data: barcodeData.base64,
            transformation: {
              width: barcodeData.width * 0.4,
              height: barcodeData.height * 0.4,
            },
            type: "png",
          });
          
          paragraphs.push(new Paragraph({
            children: [barcodeRun],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }));
        } catch (error) {
          console.warn(`Failed to create barcode for ${item.title}:`, error);
        }
      }

      return paragraphs;
    },

    getCssStyles: () => `
      .layout-9-vertical {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        padding: 6px;
      }
      .product-image-9up {
        width: 100%;
        display: flex;
        justify-content: center;
        margin-bottom: 3px;
      }
      .book-cover-9up {
        width: 100%;
        max-width: 100px;
        height: auto;
        max-height: 150px;
        object-fit: contain;
        border: none;
        border-radius: 4px;
      }
      .product-title-9up {
        width: 100%;
        text-align: center;
        margin-bottom: 3px;
      }
      .product-title-9up .product-title {
        font-size: 8px;
        font-weight: bold;
        color: #000;
        margin: 0;
        line-height: 1.2;
      }
      .product-biblio-9up {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 2px;
        text-align: center;
        margin-bottom: 3px;
      }
      .product-biblio-9up .biblio-item {
        font-size: 7px;
        color: #333;
        line-height: 1.2;
      }
      .barcode-9up {
        width: 100%;
        text-align: center;
        margin-top: auto;
      }
    `
  };
}

