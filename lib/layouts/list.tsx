import React from 'react';
import Image from 'next/image';
import { LayoutHandler, Item, esc, formatDateAndBadge } from '../layout-handlers';
import { Paragraph, AlignmentType, ImageRun, TextRun, ExternalHyperlink } from 'docx';

export function createListLayoutHandler(): LayoutHandler {
  return {
    name: 'list',
    getPerPage: () => 10, // List layouts typically show more items per page
    
    createPreview: (item: Item, index: number, generateProductUrl: (handle: string) => string) => {
      return (
        <div key={index} style={{ 
          border: "1px solid #E9ECEF", 
          borderRadius: 8, 
          padding: 16, 
          display: "flex", 
          gap: 16,
          background: "white",
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
          height: "fit-content",
          alignItems: "flex-start",
          marginBottom: 8
        }}>
          <div style={{ 
            flexShrink: 0,
            width: "100px"
          }}>
            <Image 
              src={item.imageUrl || "https://via.placeholder.com/100x150?text=No+Image"} 
              alt={item.title}
              width={100}
              height={150}
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
            gap: 8,
            flex: 1,
            minWidth: 0
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <a 
                  href={generateProductUrl(item.handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    fontWeight: 700, 
                    fontSize: 18,
                    color: "#2C3E50",
                    lineHeight: 1.3,
                    textDecoration: "none",
                    display: "block",
                    marginBottom: 4
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = "#667eea"}
                  onMouseLeave={(e) => e.currentTarget.style.color = "#2C3E50"}
                >
                  {item.title}
                </a>
                {item.subtitle && (
                  <div style={{ 
                    fontSize: 14, 
                    color: "#7F8C8D",
                    fontStyle: "italic",
                    lineHeight: 1.3,
                    marginBottom: 6
                  }}>
                    {item.subtitle}
                  </div>
                )}
                {item.author && (
                  <div style={{ 
                    fontSize: 14, 
                    color: "#667eea",
                    fontWeight: 600,
                    marginBottom: 8
                  }}>
                    By {item.author}
                  </div>
                )}
              </div>
              {item.price && (
                <div style={{
                  background: "#ffffff",
                  color: "#000000",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  marginLeft: 16,
                  border: "1px solid #E9ECEF"
                }}>
                  AUD$ {item.price}
                </div>
              )}
            </div>

            {item.description && (
              <div style={{
                fontSize: 14,
                lineHeight: 1.5,
                color: "#495057",
                marginBottom: 12
              }}>
                <div dangerouslySetInnerHTML={{ __html: item.description.substring(0, 200) + (item.description.length > 200 ? '...' : '') }} />
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {item.binding && (
                  <div style={{ fontSize: 12, color: "#6C757D" }}>
                    <strong>Format:</strong> {item.binding}
                  </div>
                )}
                {item.pages && (
                  <div style={{ fontSize: 12, color: "#6C757D" }}>
                    <strong>Pages:</strong> {item.pages}
                  </div>
                )}
                {item.dimensions && (
                  <div style={{ fontSize: 12, color: "#6C757D" }}>
                    <strong>Size:</strong> {item.dimensions}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {item.imprint && (
                  <div style={{ fontSize: 12, color: "#6C757D" }}>
                    <strong>Publisher:</strong> {item.imprint}
                  </div>
                )}
                {item.weight && (
                  <div style={{ fontSize: 12, color: "#6C757D" }}>
                    <strong>Weight:</strong> {item.weight}
                  </div>
                )}
              </div>
            </div>

            {item.releaseDate && (() => {
              const { formattedDate, badgeType } = formatDateAndBadge(item.releaseDate);
              return (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap"
                }}>
                  <span style={{ fontSize: 12, color: "#6C757D" }}>
                    <strong>Release Date:</strong> {formattedDate}
                  </span>
                  {badgeType && (
                    <span style={{
                      fontSize: 10,
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
                      fontSize: 10,
                      padding: "4px 8px",
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
          </div>
        </div>
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string, bannerColor?: string, websiteName?: string) => {
      return `
        <div class="list-item">
          <div class="list-image">
            <img src="${esc(item.imageUrl || 'https://via.placeholder.com/100x150?text=No+Image')}" alt="${esc(item.title)}" class="list-book-cover">
          </div>
          <div class="list-content">
            <div class="list-header">
              <div class="list-title-section">
                <h2 class="list-title">
                  <a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a>
                </h2>
                ${item.subtitle ? `<div class="list-subtitle">${esc(item.subtitle)}</div>` : ""}
                ${item.author ? `<div class="list-author">By ${esc(item.author)}</div>` : ""}
              </div>
              ${item.price ? `<div class="list-price">AUD$ ${esc(item.price)}</div>` : ""}
            </div>
            
            ${item.description ? `
              <div class="list-description">
                ${esc(item.description.substring(0, 200) + (item.description.length > 200 ? '...' : ''))}
              </div>
            ` : ""}
            
            <div class="list-details">
              <div class="list-details-row">
                ${item.binding ? `<span class="list-detail"><strong>Format:</strong> ${esc(item.binding)}</span>` : ""}
                ${item.pages ? `<span class="list-detail"><strong>Pages:</strong> ${esc(item.pages)}</span>` : ""}
                ${item.dimensions ? `<span class="list-detail"><strong>Size:</strong> ${esc(item.dimensions)}</span>` : ""}
              </div>
              <div class="list-details-row">
                ${item.imprint ? `<span class="list-detail"><strong>Publisher:</strong> ${esc(item.imprint)}</span>` : ""}
                ${item.weight ? `<span class="list-detail"><strong>Weight:</strong> ${esc(item.weight)}</span>` : ""}
              </div>
            </div>
            
            ${item.releaseDate ? `
              <div class="list-release">
                <strong>Release Date:</strong> ${esc(item.releaseDate)}
              </div>
            ` : ""}
            
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
              width: 100, // Larger for list view
              height: 150,
            },
            type: "png",
          });
          
          paragraphs.push(new Paragraph({
            children: [imageRun],
            alignment: AlignmentType.LEFT,
            spacing: { after: 300 }
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
                size: 20, // Larger for list view
                color: "2C3E50",
                underline: {},
              }),
            ],
            link: productUrl,
          }),
        ],
        spacing: { after: 200 },
      }));
      
      // Subtitle
      if (item.subtitle) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: item.subtitle,
              italics: true,
              size: 16, // Larger for list view
              color: "7F8C8D",
            }),
          ],
          spacing: { after: 200 },
        }));
      }
      
      // Author
      if (item.author) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `By ${item.author}`,
              size: 16, // Larger for list view
              color: "667eea",
              bold: true,
            }),
          ],
          spacing: { after: 300 },
        }));
      }

      // Description
      if (item.description) {
        const truncatedDescription = item.description.substring(0, 200) + (item.description.length > 200 ? '...' : '');
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: truncatedDescription.replace(/<[^>]*>/g, ''), // Strip HTML tags
              size: 14, // Larger for list view
              color: "495057",
            }),
          ],
          spacing: { after: 300 },
        }));
      }

      // Details in rows
      const detailsRow1 = [];
      if (item.binding) detailsRow1.push(`Format: ${item.binding}`);
      if (item.pages) detailsRow1.push(`Pages: ${item.pages}`);
      if (item.dimensions) detailsRow1.push(`Size: ${item.dimensions}`);
      
      if (detailsRow1.length > 0) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: detailsRow1.join(" • "),
              size: 12,
              color: "6C757D",
            }),
          ],
          spacing: { after: 200 },
        }));
      }

      const detailsRow2 = [];
      if (item.imprint) detailsRow2.push(`Publisher: ${item.imprint}`);
      if (item.weight) detailsRow2.push(`Weight: ${item.weight}`);
      
      if (detailsRow2.length > 0) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: detailsRow2.join(" • "),
              size: 12,
              color: "6C757D",
            }),
          ],
          spacing: { after: 200 },
        }));
      }

      // Release Date
      if (item.releaseDate) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `Release Date: ${item.releaseDate}`,
              size: 12,
              color: "6C757D",
            }),
          ],
          spacing: { after: 200 },
        }));
      }

      // Price
      if (item.price) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `AUD$ ${item.price}`,
              bold: true,
              size: 18, // Larger for list view
              color: "2C3E50",
            }),
          ],
          spacing: { after: 400 },
        }));
      }

      // Add barcode image if available
      if (barcodeData) {
        try {
          const barcodeRun = new ImageRun({
            data: barcodeData.base64,
            transformation: {
              width: barcodeData.width * 0.5,
              height: barcodeData.height * 0.5,
            },
            type: "png",
          });
          
          paragraphs.push(new Paragraph({
            children: [barcodeRun],
            alignment: AlignmentType.LEFT,
            spacing: { after: 400 },
          }));
        } catch (error) {
          console.warn(`Failed to create barcode for ${item.title}:`, error);
        }
      }

      return paragraphs;
    },

    getCssStyles: () => `
      .list-item {
        display: flex;
        gap: 16px;
        padding: 16px;
        border: 1px solid #E9ECEF;
        border-radius: 8px;
        margin-bottom: 8px;
        background: white;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      }
      
      .list-image {
        flex-shrink: 0;
        width: 100px;
      }
      
      .list-book-cover {
        width: 100px;
        height: 150px;
        object-fit: cover;
        border-radius: 6px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      }
      
      .list-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      
      .list-title-section {
        flex: 1;
      }
      
      .list-title {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 4px 0;
        color: #2C3E50;
        line-height: 1.3;
      }
      
      .list-subtitle {
        font-size: 14px;
        color: #7F8C8D;
        font-style: italic;
        margin-bottom: 6px;
        line-height: 1.3;
      }
      
      .list-author {
        font-size: 14px;
        color: #667eea;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .list-price {
        background: #ffffff;
        color: #000000;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        margin-left: 16px;
        border: 1px solid #E9ECEF;
      }
      @media print {
        .list-item {
          border: none !important;
          box-shadow: none !important;
        }
      }
      
      .list-description {
        font-size: 14px;
        line-height: 1.5;
        color: #495057;
        margin-bottom: 12px;
      }
      
      .list-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
      }
      
      .list-details-row {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      
      .list-detail {
        font-size: 12px;
        color: #6C757D;
      }
      
      .list-release {
        font-size: 12px;
        color: #6C757D;
      }
    `
  };
}
