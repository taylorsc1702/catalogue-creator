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
      const { formattedDate: releaseFormatted, badgeType } = formatDateAndBadge(item.releaseDate);
      const releaseValue = releaseFormatted ? `${releaseFormatted}${badgeType ? ` (${badgeType.toUpperCase()})` : ''}` : '';
      const illustrationValue = item.icillus || item.illustrations;
      const metadataEntries = [
        item.vendor ? { label: 'Publisher', value: item.vendor } : null,
        item.imprint ? { label: 'Imprint', value: item.imprint } : null,
        (item.imidis || item.discount) ? { label: 'Discount', value: (item.imidis || item.discount)! } : null,
        item.binding ? { label: 'Binding', value: item.binding } : null,
        item.pages ? { label: 'Pages', value: item.pages } : null,
        item.dimensions ? { label: 'Dimensions', value: item.dimensions } : null,
        releaseValue ? { label: 'Release Date', value: releaseValue } : null,
        item.weight ? { label: 'Weight', value: item.weight } : null,
        illustrationValue ? { label: 'Illustrations', value: illustrationValue } : null,
        item.sku ? { label: 'ISBN', value: item.sku } : null,
        item.icrkdt ? { label: 'Barcode', value: item.icrkdt } : null
      ].filter((entry): entry is { label: string; value: string } => !!entry && !!entry.value?.toString().trim().length);
      const priceEntry = item.price ? `AUD$ ${item.price}` : null;

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
            alignItems: "flex-start",
            justifyContent: "center"
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
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            gap: 8
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
              {(item.author || item.icauth) && (
                <div style={{ 
                  fontSize: 11, 
                  color: "#495057",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap"
                }}>
                  {item.author && <span>{item.author}</span>}
                  {item.icauth && (
                    <span style={{
                      backgroundColor: "#FFD700",
                      color: "black",
                      padding: "2px 6px",
                      borderRadius: 8,
                      fontSize: 10,
                      fontWeight: 600
                    }}>
                      {item.icauth}
                    </span>
                  )}
                </div>
              )}
            </div>

            {descriptionText && (
              <div style={{ flex: 1, minHeight: 0 }}>
                <div style={{
                  fontSize: 11,
                  lineHeight: 1.45,
                  color: "#495057",
                  whiteSpace: "pre-line"
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

          <div style={{
            flexShrink: 0,
            width: 170,
            background: "#F8F9FA",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}>
            {metadataEntries.map((entry) => (
              <div key={`${entry.label}-${entry.value}`} style={{ fontSize: 11, color: "#495057", lineHeight: 1.4 }}>
                <span style={{ fontWeight: 600, display: 'block' }}>{entry.label}</span>
                <span>{entry.value}</span>
              </div>
            ))}
            {priceEntry && (
              <div style={{
                marginTop: 'auto',
                fontSize: 13,
                fontWeight: 700,
                color: '#2C3E50'
              }}>
                {priceEntry}
              </div>
            )}
          </div>
        </div>
      );
    },

    createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string, bannerColor?: string, websiteName?: string) => {
      const { formattedDate: releaseFormatted, badgeType } = formatDateAndBadge(item.releaseDate);
      const releaseValue = releaseFormatted ? `${releaseFormatted}${badgeType ? ` (${badgeType.toUpperCase()})` : ''}` : (item.releaseDate || '');
      const illustrationValue = item.icillus || item.illustrations;
      const metadataHtml = [
        item.vendor ? `<div class="meta-row"><span class="meta-label">Publisher</span><span class="meta-value">${esc(item.vendor)}</span></div>` : '',
        item.imprint ? `<div class="meta-row"><span class="meta-label">Imprint</span><span class="meta-value">${esc(item.imprint)}</span></div>` : '',
        (item.imidis || item.discount) ? `<div class="meta-row"><span class="meta-label">Discount</span><span class="meta-value">${esc(item.imidis || item.discount)}</span></div>` : '',
        item.binding ? `<div class="meta-row"><span class="meta-label">Binding</span><span class="meta-value">${esc(item.binding)}</span></div>` : '',
        item.pages ? `<div class="meta-row"><span class="meta-label">Pages</span><span class="meta-value">${esc(item.pages)}</span></div>` : '',
        item.dimensions ? `<div class="meta-row"><span class="meta-label">Dimensions</span><span class="meta-value">${esc(item.dimensions)}</span></div>` : '',
        releaseValue ? `<div class="meta-row"><span class="meta-label">Release Date</span><span class="meta-value">${esc(releaseValue)}</span></div>` : '',
        item.weight ? `<div class="meta-row"><span class="meta-label">Weight</span><span class="meta-value">${esc(item.weight)}</span></div>` : '',
        illustrationValue ? `<div class="meta-row"><span class="meta-label">Illustrations</span><span class="meta-value">${esc(illustrationValue)}</span></div>` : '',
        (item.sku || item.handle) ? `<div class="meta-row"><span class="meta-label">ISBN</span><span class="meta-value">${esc(item.sku || item.handle)}</span></div>` : '',
        item.icrkdt ? `<div class="meta-row"><span class="meta-label">Barcode</span><span class="meta-value">${esc(item.icrkdt)}</span></div>` : ''
      ].join('');

      return `
        <div class="product-card">
          <div class="product-image">
            <img src="${esc(item.imageUrl || 'https://via.placeholder.com/96x144?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
          </div>
          <div class="product-main">
            <div class="product-header">
              <h2 class="product-title"><a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a></h2>
              ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
              ${(item.author || item.icauth) ? `
                <div class="product-author-line">
                  ${item.author ? `<span class="product-author">${esc(item.author)}</span>` : ''}
                  ${item.icauth ? `<span class="icauth-badge">${esc(item.icauth)}</span>` : ''}
                </div>
              ` : ''}
            </div>
            <div class="product-description-wrapper">
              ${item.description ? `<div class="product-description">${esc(item.description)}</div>` : ""}
            </div>
            ${item.footerNote ? `<div class="product-note">${esc(item.footerNote).replace(/\n/g, '<br>')}</div>` : ""}
          </div>
          <div class="product-sidebar">
            ${metadataHtml}
            ${item.price ? `<div class="meta-row price"><span class="meta-label">Price</span><span class="meta-value">AUD$ ${esc(item.price)}</span></div>` : ""}
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
        gap: 16px;
        margin-bottom: 0;
        page-break-inside: avoid;
        min-height: 220px;
        font-family: 'Calibri', sans-serif;
        margin: 0 5px;
        border: 1px solid #E9ECEF;
        border-radius: 12px;
        padding: 12px 16px;
        box-sizing: border-box;
        background: #ffffff;
      }
      .product-image {
        flex-shrink: 0;
        width: 96px;
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }
      .book-cover {
        width: 96px;
        height: 144px;
        object-fit: cover;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
      }
      .product-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        gap: 12px;
      }
      .product-header {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: ${HEADER_MAX_HEIGHT_PX}px;
        overflow: hidden;
      }
      .product-title {
        font-size: 22px;
        font-weight: bold;
        margin: 0;
        color: #2C3E50;
      }
      .product-subtitle {
        font-size: 18px;
        color: #7F8C8D;
        font-style: italic;
        margin: 0;
      }
      .product-author-line {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 15px;
        color: #495057;
      }
      .product-author-line .icauth-badge {
        background: #FFD700;
        color: #000;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
      }
      .product-description-wrapper {
        flex: 1 1 auto;
        min-height: 0;
        margin-top: 4px;
      }
      .product-description {
        font-size: 16px;
        line-height: 1.4;
        color: #495057;
        white-space: pre-line;
      }
      .product-note {
        font-size: 14px;
        color: #343A40;
        background: #F1F3F5;
        padding: 6px 8px;
        border-radius: 6px;
        white-space: pre-line;
      }
      .product-sidebar {
        flex-shrink: 0;
        width: 170px;
        background: #F8F9FA;
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 14px;
        color: #495057;
      }
      .meta-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
        line-height: 1.35;
      }
      .meta-label {
        font-weight: 600;
        text-transform: none;
      }
      .meta-value {
        font-weight: 400;
      }
      .meta-row.price {
        margin-top: auto;
        font-size: 16px;
        font-weight: 700;
        color: #2C3E50;
      }
      .product-sidebar .barcode-wrapper {
        margin-top: 6px;
      }
    `
  };
}
