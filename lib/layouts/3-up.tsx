import React from 'react';
import Image from 'next/image';
import { LayoutHandler, Item, esc, formatDateAndBadge } from '../layout-handlers';
import { Paragraph, AlignmentType, ImageRun, TextRun, ExternalHyperlink } from 'docx';

const HEADER_MAX_HEIGHT_PX = 120;

export function create3UpLayoutHandler(): LayoutHandler {
  return {
    name: '3-up',
    getPerPage: () => 3,
    
    createPreview: (item: Item, index: number, generateProductUrl: (handle: string) => string) => {
      const descriptionText = item.description ? item.description.replace(/<[^>]*>/g, '') : '';
      const hasFooterNote = !!(item.footerNote && item.footerNote.trim().length > 0);
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
          alignItems: "stretch"
        }}>
          <div style={{ 
            flexShrink: 0,
            width: "96px",
            display: "flex",
            alignItems: "flex-start"
          }}>
            <Image 
              src={item.imageUrl || "https://via.placeholder.com/96x144?text=No+Image"} 
              alt={item.title}
              width={96}
              height={144}
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
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}>
              ${item.price}
            </div>
          )}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            flex: 1,
            minWidth: 0,
            minHeight: 0
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: HEADER_MAX_HEIGHT_PX, overflow: "hidden" }}>
              <a 
                href={generateProductUrl(item.handle)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  fontWeight: 700, 
                  fontSize: 14,
                  color: "#2C3E50",
                  lineHeight: 1.2,
                  textDecoration: "none",
                  display: "block"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#667eea"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#2C3E50"}
              >
                {item.title}
              </a>
              {item.subtitle && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#7F8C8D",
                  fontStyle: "italic",
                  lineHeight: 1.2
                }}>
                  {item.subtitle}
                </div>
              )}
              {item.author && (
                <div style={{ 
                  fontSize: 11, 
                  color: "#667eea",
                  fontWeight: 600
                }}>
                  👤 {item.author}
                </div>
              )}
              {item.releaseDate && (() => {
                const { formattedDate, badgeType } = formatDateAndBadge(item.releaseDate);
                return (
                  <div style={{
                    fontSize: 10,
                    color: "#6C757D",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap"
                  }}>
                    <span>📅 {formattedDate}</span>
                    {badgeType && (
                      <span style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        backgroundColor: badgeType === 'current' ? "#28A745" : "#007BFF",
                        color: "white",
                      }}>
                        {badgeType}
                      </span>
                    )}
                    {item.icauth && (
                      <span style={{
                        fontSize: 8,
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        backgroundColor: "#FFD700",
                        color: "black"
                      }}>
                        AUS-{item.icauth}
                      </span>
                    )}
                  </div>
                );
              })()}
              <div style={{ 
                fontSize: 10, 
                color: "#6C757D",
                display: "flex",
                gap: 8,
                flexWrap: "wrap"
              }}>
                {item.binding && <span>📖 {item.binding}</span>}
                {item.pages && <span>📄 {item.pages} pages</span>}
                {item.dimensions && <span>📐 {item.dimensions}</span>}
              </div>
              <div style={{ 
                fontSize: 10, 
                color: "#6C757D",
                display: "flex",
                gap: 8,
                flexWrap: "wrap"
              }}>
                {item.imprint && <span>🏢 {item.imprint}</span>}
                {item.weight && <span>⚖️ {item.weight}</span>}
              </div>
            </div>

            {descriptionText && (
              <div style={{ flex: 1, minHeight: 0, marginTop: 6 }}>
                <div style={{
                  fontSize: 11,
                  lineHeight: 1.45,
                  color: "#495057",
                  whiteSpace: "pre-line",
                  overflow: "visible"
                }}>
                  {descriptionText}
                </div>
              </div>
            )}
            {hasFooterNote && (
              <div style={{
                marginTop: 8,
                fontSize: 10,
                color: "#343A40",
                background: "#F1F3F5",
                padding: "6px 8px",
                borderRadius: 6,
                whiteSpace: "pre-line"
              }}>
                {item.footerNote}
              </div>
            )}
          </div>
        </div>
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string, bannerColor?: string, websiteName?: string) => {
      return `
        <div class="product-card">
          <div class="product-image">
            <img src="${esc(item.imageUrl || 'https://via.placeholder.com/96x144?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
          </div>
          <div class="product-details">
            <div class="product-header">
              <h2 class="product-title"><a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a></h2>
              ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
              ${item.author ? `<div class="product-author">By ${esc(item.author)}</div>` : ""}
              ${item.icauth ? `<span class="icauth-badge">${esc(item.icauth)}</span>` : ""}
              <div class="product-specs">
                ${item.binding ? `<span class="spec-item">${esc(item.binding)}</span>` : ""}
                ${item.pages ? `<span class="spec-item">${esc(item.pages)} pages</span>` : ""}
                ${item.dimensions ? `<span class="spec-item">${esc(item.dimensions)}</span>` : ""}
              </div>
              <div class="product-meta">
                ${item.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
                ${item.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(item.releaseDate)}</div>` : ""}
                ${item.weight ? `<div class="meta-item"><strong>Weight:</strong> ${esc(item.weight)}</div>` : ""}
                ${item.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.illustrations)}</div>` : ""}
              </div>
            </div>
            <div class="product-description-wrapper">
              ${item.description ? `<div class="product-description">${esc(item.description)}</div>` : ""}
            </div>
            ${item.footerNote ? `<div class="product-note">${esc(item.footerNote).replace(/\n/g, '<br>')}</div>` : ""}
            ${item.price ? `<div class="product-price">AUD$ ${esc(item.price)}</div>` : ""}
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
              width: 100, // Medium size for 3-up
              height: 150,
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
                size: 16, // Medium size for 3-up
                color: "2C3E50",
                underline: {},
              }),
            ],
            link: productUrl,
          }),
        ],
        spacing: { after: 100 },
      }));
      
      // Subtitle
      if (item.subtitle) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: item.subtitle,
              italics: true,
              size: 12, // Medium size for 3-up
              color: "7F8C8D",
            }),
          ],
          spacing: { after: 100 },
        }));
      }
      
      // Author
      if (item.author) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `By ${item.author}`,
              size: 12, // Medium size for 3-up
              color: "667eea",
              bold: true,
            }),
          ],
          spacing: { after: 200 },
        }));
      }

      // Description
      if (item.description) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: item.description.replace(/<[^>]*>/g, ''), // Strip HTML tags
              size: 11, // Medium size for 3-up
              color: "495057",
            }),
          ],
          spacing: { after: 200 },
        }));
      }

      if (item.footerNote) {
        const noteLines = item.footerNote.split(/\r?\n/);
        paragraphs.push(new Paragraph({
          children: noteLines.flatMap((line, idx) => {
            const runs = [new TextRun({
              text: line,
              size: 11,
              color: "343A40",
              italics: true,
            })];
            if (idx < noteLines.length - 1) {
              runs.push(new TextRun({ break: 1 }));
            }
            return runs;
          }),
          spacing: { after: 200 },
        }));
      }

      // Specs
      const specs = [item.binding, item.pages && `${item.pages} pages`, item.dimensions].filter(Boolean);
      if (specs.length > 0) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: specs.join(" • "),
              size: 10, // Medium size for 3-up
              color: "6C757D",
            }),
          ],
          spacing: { after: 150 },
        }));
      }

      // Meta information
      const metaItems = [];
      if (item.imprint) metaItems.push(`Publisher: ${item.imprint}`);
      if (item.releaseDate) metaItems.push(`Release Date: ${item.releaseDate}`);
      if (item.weight) metaItems.push(`Weight: ${item.weight}`);
      
      if (metaItems.length > 0) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: metaItems.join('\n'),
              size: 9, // Medium size for 3-up
              color: "6C757D",
            }),
          ],
          spacing: { after: 150 },
        }));
      }

      // Price
      if (item.price) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `AUD$ ${item.price}`,
              bold: true,
              size: 13, // Medium size for 3-up
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
              width: barcodeData.width * 0.65,
              height: barcodeData.height * 0.65,
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
      .product-card {
        display: flex;
        flex-direction: row;
        gap: 12px;
        margin-bottom: 0;
        page-break-inside: avoid;
        min-height: 260px;
        height: auto;
        font-family: 'Calibri', sans-serif;
        margin: 0 5px;
        border: 1px solid #E9ECEF;
        border-radius: 12px;
        padding: 12px;
        box-sizing: border-box;
      }
      .product-image {
        flex-shrink: 0;
        width: 72px;
      }
      .book-cover {
        width: 72px;
        height: 108px;
        object-fit: cover;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .product-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .product-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: ${HEADER_MAX_HEIGHT_PX}px;
        overflow: hidden;
      }
      .product-title {
        font-size: 22px;
        font-weight: bold;
        margin: 0 0 4px 0;
        color: #2C3E50;
        font-family: 'Calibri', sans-serif;
      }
      .product-subtitle {
        font-size: 19px;
        color: #7F8C8D;
        font-style: italic;
        margin-bottom: 3px;
        font-family: 'Calibri', sans-serif;
      }
      .product-author {
        font-size: 18px;
        color: #667eea;
        font-weight: 600;
        margin-bottom: 4px;
        font-family: 'Calibri', sans-serif;
      }
      .product-specs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .spec-item {
        font-size: 14px;
        color: #6C757D;
        background: #F8F9FA;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'Calibri', sans-serif;
      }
      .product-meta {
        font-size: 14px;
        color: #6C757D;
        line-height: 1.3;
        font-family: 'Calibri', sans-serif;
      }
      .meta-item {
        margin-bottom: 2px;
      }
      .product-description-wrapper {
        flex: 1 1 auto;
        min-height: 0;
        margin-top: 8px;
        overflow: visible;
      }
      .product-description {
        font-size: 17px;
        line-height: 1.4;
        color: #495057;
        font-family: 'Calibri', sans-serif;
        white-space: pre-line;
        overflow: visible;
      }
      .product-note {
        margin-top: 8px;
        font-size: 15px;
        color: #343A40;
        background: #F1F3F5;
        padding: 6px 8px;
        border-radius: 6px;
        font-family: 'Calibri', sans-serif;
        white-space: pre-line;
      }
      .product-price {
        font-size: 19px;
        font-weight: bold;
        color: #2C3E50;
        margin-top: 4px;
        font-family: 'Calibri', sans-serif;
      }
    `
  };
}
