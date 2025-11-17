import React from 'react';
import Image from 'next/image';
import { LayoutHandler, Item, esc, formatDateAndBadge } from '../layout-handlers';
import { Paragraph, AlignmentType, ImageRun, TextRun, ExternalHyperlink } from 'docx';

export function createCompactListLayoutHandler(): LayoutHandler {
  return {
    name: 'compact-list',
    getPerPage: () => 20, // Compact list shows even more items per page
    
    createPreview: (item: Item, index: number, generateProductUrl: (handle: string) => string) => {
      return (
        <div key={index} style={{ 
          border: "1px solid #E9ECEF", 
          borderRadius: 6, 
          padding: 12, 
          display: "flex", 
          gap: 12,
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          transition: "all 0.2s ease",
          position: "relative",
          overflow: "hidden",
          height: "fit-content",
          alignItems: "center",
          marginBottom: 4
        }}>
          <div style={{ 
            flexShrink: 0,
            width: "60px"
          }}>
            <Image 
              src={item.imageUrl || "https://via.placeholder.com/60x90?text=No+Image"} 
              alt={item.title}
              width={60}
              height={90}
              style={{ 
                objectFit: "cover", 
                borderRadius: 4, 
                background: "#F8F9FA",
                boxShadow: "0 1px 4px rgba(0,0,0,0.1)"
              }}
            />
          </div>
          
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 4,
            flex: 1,
            minWidth: 0
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <a 
                href={generateProductUrl(item.handle)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  fontWeight: 600, 
                  fontSize: 14,
                  color: "#2C3E50",
                  lineHeight: 1.2,
                  textDecoration: "none",
                  display: "block",
                  flex: 1
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#667eea"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#2C3E50"}
              >
                {item.title}
              </a>
              {item.price && (
                <div style={{
                  background: "#ffffff",
                  color: "#000000",
                  padding: "4px 8px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  marginLeft: 12,
                  border: "1px solid #E9ECEF"
                }}>
                  AUD$ {item.price}
                </div>
              )}
            </div>

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
                By {item.author}
              </div>
            )}

            <div style={{ 
              display: "flex", 
              gap: 12, 
              flexWrap: "wrap",
              fontSize: 10,
              color: "#6C757D"
            }}>
              {item.binding && <span>📖 {item.binding}</span>}
              {item.pages && <span>📄 {item.pages}</span>}
              {item.dimensions && <span>📐 {item.dimensions}</span>}
              {item.imprint && <span>🏢 {item.imprint}</span>}
            </div>

            {item.releaseDate && (() => {
              const { formattedDate, badgeType } = formatDateAndBadge(item.releaseDate);
              return (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexWrap: "wrap"
                }}>
                  <span style={{ fontSize: 10, color: "#6C757D" }}>
                    📅 {formattedDate}
                  </span>
                  {badgeType && (
                    <span style={{
                      fontSize: 8,
                      padding: "2px 4px",
                      borderRadius: 3,
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
                      padding: "2px 4px",
                      borderRadius: 3,
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
        <div class="compact-list-item">
          <div class="compact-list-image">
            <img src="${esc(item.imageUrl || 'https://via.placeholder.com/60x90?text=No+Image')}" alt="${esc(item.title)}" class="compact-book-cover">
          </div>
          <div class="compact-list-content">
            <div class="compact-list-header">
              <h3 class="compact-list-title">
                <a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a>
              </h3>
              ${item.price ? `<div class="compact-list-price">AUD$ ${esc(item.price)}</div>` : ""}
            </div>
            
            ${item.subtitle ? `<div class="compact-list-subtitle">${esc(item.subtitle)}</div>` : ""}
            ${item.author ? `<div class="compact-list-author">By ${esc(item.author)}</div>` : ""}
            
            <div class="compact-list-details">
              ${item.binding ? `<span class="compact-detail">📖 ${esc(item.binding)}</span>` : ""}
              ${item.pages ? `<span class="compact-detail">📄 ${esc(item.pages)}</span>` : ""}
              ${item.dimensions ? `<span class="compact-detail">📐 ${esc(item.dimensions)}</span>` : ""}
              ${item.imprint ? `<span class="compact-detail">🏢 ${esc(item.imprint)}</span>` : ""}
            </div>
            
            ${item.releaseDate ? `
              <div class="compact-list-release">
                📅 ${esc(item.releaseDate)}
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
              width: 60, // Small for compact view
              height: 90,
            },
            type: "png",
          });
          
          paragraphs.push(new Paragraph({
            children: [imageRun],
            alignment: AlignmentType.LEFT,
            spacing: { after: 150 }
          }));
        } catch (error) {
          console.warn(`Failed to create image for ${item.title}:`, error);
        }
      }

      // Title and price in one line
      const titleText = item.price ? `${item.title} - AUD$ ${item.price}` : item.title;
      paragraphs.push(new Paragraph({
        children: [
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: titleText,
                bold: true,
                size: 14, // Small for compact view
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
              size: 12, // Small for compact view
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
              size: 11, // Small for compact view
              color: "667eea",
              bold: true,
            }),
          ],
          spacing: { after: 100 },
        }));
      }

      // Compact details
      const details = [];
      if (item.binding) details.push(item.binding);
      if (item.pages) details.push(`${item.pages} pages`);
      if (item.dimensions) details.push(item.dimensions);
      if (item.imprint) details.push(item.imprint);
      
      if (details.length > 0) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: details.join(" • "),
              size: 10, // Small for compact view
              color: "6C757D",
            }),
          ],
          spacing: { after: 100 },
        }));
      }

      // Release Date
      if (item.releaseDate) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `Release Date: ${item.releaseDate}`,
              size: 10, // Small for compact view
              color: "6C757D",
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
              width: barcodeData.width * 0.3, // Smaller for compact view
              height: barcodeData.height * 0.3,
            },
            type: "png",
          });
          
          paragraphs.push(new Paragraph({
            children: [barcodeRun],
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 },
          }));
        } catch (error) {
          console.warn(`Failed to create barcode for ${item.title}:`, error);
        }
      }

      return paragraphs;
    },

    getCssStyles: () => `
      .compact-list-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        border: 1px solid #E9ECEF;
        border-radius: 6px;
        margin-bottom: 4px;
        background: white;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        align-items: center;
      }
      
      .compact-list-image {
        flex-shrink: 0;
        width: 60px;
      }
      
      .compact-book-cover {
        width: 60px;
        height: 90px;
        object-fit: cover;
        border-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      }
      
      .compact-list-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .compact-list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .compact-list-title {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        color: #2C3E50;
        line-height: 1.2;
        flex: 1;
      }
      
      .compact-list-price {
        background: #ffffff;
        color: #000000;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        margin-left: 12px;
        border: 1px solid #E9ECEF;
      }
      @media print {
        .compact-list-item {
          border: none !important;
          box-shadow: none !important;
        }
      }
      
      .compact-list-subtitle {
        font-size: 12px;
        color: #7F8C8D;
        font-style: italic;
        line-height: 1.2;
      }
      
      .compact-list-author {
        font-size: 11px;
        color: #667eea;
        font-weight: 600;
      }
      
      .compact-list-details {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 10px;
        color: #6C757D;
      }
      
      .compact-detail {
        font-size: 10px;
        color: #6C757D;
      }
      
      .compact-list-release {
        font-size: 10px;
        color: #6C757D;
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
    `
  };
}
