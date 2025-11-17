import React from 'react';
import Image from 'next/image';
import { LayoutHandler, Item, esc, formatDateAndBadge, getDiscountProductDetails } from '../layout-handlers';
import { Paragraph, AlignmentType, ImageRun, TextRun, ExternalHyperlink } from 'docx';

export function create2UpLayoutHandler(): LayoutHandler {
  return {
    name: '2-up',
    getPerPage: () => 2,
    
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
            width: "80px"
          }}>
            <Image 
              src={item.imageUrl || "https://via.placeholder.com/80x120?text=No+Image"} 
              alt={item.title}
              width={80}
              height={120}
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
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #E9ECEF"
            }}>
              ${item.price}
            </div>
          )}
          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 4,
            flex: 1,
            minWidth: 0
          }}>
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
                display: "block",
                marginBottom: 2
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
                lineHeight: 1.2,
                marginBottom: 2
              }}>
                {item.subtitle}
              </div>
            )}
            {item.author && (
              <div style={{ 
                fontSize: 11, 
                color: "#667eea",
                fontWeight: 600,
                marginBottom: 4
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
                  marginBottom: 2,
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
        </div>
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string, bannerColor?: string, websiteName?: string) => {
      return `
        <div class="product-card">
          <div class="product-image">
            <img src="${esc(item.imageUrl || 'https://via.placeholder.com/80x120?text=No+Image')}" alt="${esc(item.title)}" class="book-cover">
          </div>
          <div class="product-details">
            <h2 class="product-title"><a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a></h2>
            ${item.subtitle ? `<div class="product-subtitle">${esc(item.subtitle)}</div>` : ""}
            ${item.author ? `<div class="product-author">By ${esc(item.author)}</div>` : ""}
            ${item.description ? `<div class="product-description">${esc(item.description)}</div>` : ""}
            <div class="product-specs">
              ${item.binding ? `<span class="spec-item">${esc(item.binding)}</span>` : ""}
              ${item.pages ? `<span class="spec-item">${esc(item.pages)} pages</span>` : ""}
              ${item.dimensions ? `<span class="spec-item">${esc(item.dimensions)}</span>` : ""}
              ${item.icauth ? `<span class="spec-item icauth-badge" style="background-color: #FFD700; color: black; padding: 2px 6px; border-radius: 8px; font-weight: 600;">${esc(item.icauth)}</span>` : ""}
            </div>
            <div class="product-meta">
              ${getDiscountProductDetails(item.discount) ? `<div class="meta-item"><strong>Product Details:</strong> ${esc(getDiscountProductDetails(item.discount))}</div>` : ""}
              ${item.previousEditionIsbn ? `<div class="meta-item"><strong>Previous Edition:</strong> ${esc(item.previousEditionIsbn)}</div>` : ""}
              ${item.moreFromAuthorIsbns && item.moreFromAuthorIsbns.length > 0 && item.moreFromAuthorIsbns[0] ? `
                <div class="meta-item">
                  <strong>More from this Author:</strong>
                  ${item.moreFromAuthorImages && item.moreFromAuthorImages[0] ? `
                    <div style="margin-top: 8px;">
                      <img src="${esc(item.moreFromAuthorImages[0])}" alt="More from Author" style="width: 60px; height: 90px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 4px;">
                      <div style="font-size: 10px; color: #666;">ISBN: ${esc(item.moreFromAuthorIsbns[0])}</div>
                    </div>
                  ` : `ISBN: ${esc(item.moreFromAuthorIsbns[0])}`}
                </div>
              ` : ""}
              ${item.imprint ? `<div class="meta-item"><strong>Publisher:</strong> ${esc(item.imprint)}</div>` : ""}
              ${item.releaseDate ? `<div class="meta-item"><strong>Release Date:</strong> ${esc(item.releaseDate)}</div>` : ""}
              ${item.weight ? `<div class="meta-item"><strong>Weight:</strong> ${esc(item.weight)}</div>` : ""}
              ${item.illustrations ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.illustrations)}</div>` : ""}
              ${item.icillus ? `<div class="meta-item"><strong>Illustrations:</strong> ${esc(item.icillus)}</div>` : ""}
            </div>
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
              width: 120, // Larger for 2-up
              height: 180,
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
                size: 18, // Larger for 2-up
                color: "2C3E50",
                underline: {},
              }),
            ],
            link: productUrl,
          }),
        ],
        spacing: { after: 150 },
      }));
      
      // Subtitle
      if (item.subtitle) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: item.subtitle,
              italics: true,
              size: 14, // Larger for 2-up
              color: "7F8C8D",
            }),
          ],
          spacing: { after: 150 },
        }));
      }
      
      // Author
      if (item.author) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: `By ${item.author}`,
              size: 13, // Larger for 2-up
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
              size: 12, // Larger for 2-up
              color: "495057",
            }),
          ],
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
              size: 11, // Larger for 2-up
              color: "6C757D",
            }),
          ],
          spacing: { after: 150 },
        }));
      }

      // Meta information
      const metaItems = [];
      if (getDiscountProductDetails(item.discount)) metaItems.push(`Product Details: ${getDiscountProductDetails(item.discount)}`);
      if (item.previousEditionIsbn) metaItems.push(`Previous Edition: ${item.previousEditionIsbn}`);
      if (item.imprint) metaItems.push(`Publisher: ${item.imprint}`);
      if (item.releaseDate) metaItems.push(`Release Date: ${item.releaseDate}`);
      if (item.weight) metaItems.push(`Weight: ${item.weight}`);
      
      if (metaItems.length > 0) {
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({
              text: metaItems.join('\n'),
              size: 10, // Larger for 2-up
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
              size: 14, // Larger for 2-up
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
              width: barcodeData.width * 0.5,
              height: barcodeData.height * 0.5,
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
        flex-direction: column;
        gap: 6px;
        margin-bottom: 0;
        page-break-inside: avoid;
        height: fit-content;
      }
      @media print {
        .product-card {
          border: none !important;
          box-shadow: none !important;
        }
      }
      .product-image {
        flex-shrink: 0;
        width: 60px;
      }
      .book-cover {
        width: 60px;
        height: 90px;
        object-fit: cover;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .product-title {
        font-size: 16px;
        font-weight: bold;
        margin: 0 0 8px 0;
        color: #2C3E50;
      }
      .product-subtitle {
        font-size: 14px;
        color: #7F8C8D;
        font-style: italic;
        margin-bottom: 6px;
      }
      .product-author {
        font-size: 13px;
        color: #667eea;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .product-description {
        font-size: 12px;
        line-height: 1.4;
        color: #495057;
        margin-bottom: 8px;
      }
      .product-specs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 8px;
      }
      .spec-item {
        font-size: 10px;
        color: #6C757D;
        background: #F8F9FA;
        padding: 2px 6px;
        border-radius: 4px;
      }
      .product-meta {
        font-size: 10px;
        color: #6C757D;
        line-height: 1.3;
      }
      .meta-item {
        margin-bottom: 2px;
      }
      .product-price {
        font-size: 14px;
        font-weight: bold;
        color: #000000;
        margin-top: 8px;
      }
    `
  };
}
