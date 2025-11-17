import React from 'react';
import Image from 'next/image';
import { LayoutHandler, Item, esc, formatDateAndBadge, htmlToText } from '../layout-handlers';
import { Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, TextRun, ExternalHyperlink } from 'docx';

export function create1LLayoutHandler(): LayoutHandler {
  return {
    name: '1L',
    getPerPage: () => 1,
    
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
            
            {/* Internals/Additional Images - Landscape optimized, show 2 */}
            {item.additionalImages && item.additionalImages.length > 0 && (
              <div style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid #E9ECEF"
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#495057",
                  marginBottom: 6
                }}>
                  📸 Internals ({item.additionalImages.length}):
                </div>
                <div style={{
                  display: "flex",
                  gap: 4,
                  flexWrap: "wrap"
                }}>
                  {item.additionalImages.slice(0, 2).map((img, idx) => (
                    <Image
                      key={idx}
                      src={img}
                      alt={`Internal ${idx + 1}`}
                      width={40}
                      height={60}
                      style={{
                        objectFit: "cover",
                        borderRadius: 3,
                        border: "1px solid #DEE2E6"
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string, bannerColor?: string, websiteName?: string) => {
      return `
        <div class="product-card layout-1up-content layout-1L">
          <!-- Left Column -->
          <div class="left-column">
            <!-- Book Cover -->
            <div class="book-cover-container">
              <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" alt="${esc(item.title)}" class="book-cover-large">
            </div>
            
            <!-- Author Bio -->
            ${item.authorBio ? `
              <div class="author-bio-box">
                <div class="author-bio-title">Author Bio:</div>
                <div class="author-bio-content" id="author-bio-${index}">
                  ${item.authorBio.length >= 1000 ? 
                    `<span class="author-bio-truncated">${esc(htmlToText(item.authorBio.substring(0, 1000)))}...</span>
                     <span class="author-bio-full" style="display: none;">${esc(htmlToText(item.authorBio))}</span>
                     <button class="read-more-btn" onclick="toggleAuthorBio(${index})">Read more</button>` :
                    esc(htmlToText(item.authorBio))
                  }
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Right Column -->
          <div class="right-column">
            <!-- Title Section -->
            <div class="title-section">
              <h1 class="product-title-large">
                <a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">${esc(item.title)}</a>
              </h1>
              ${item.subtitle ? `<h2 class="product-subtitle-large">${esc(item.subtitle)}</h2>` : ''}
              ${item.author ? `<div class="product-author-large">${esc(item.author)}</div>` : ''}
              ${item.icauth ? `<span class="icauth-badge" style="background-color: #FFD700; color: black; padding: 4px 8px; border-radius: 8px; display: inline-block; width: fit-content; font-size: 11px; font-weight: 600; margin-top: 4px;">${esc(item.icauth)}</span>` : ''}
            </div>

            <!-- Description -->
            ${item.description ? `
              <div class="product-description-large">
                ${esc(htmlToText(item.description))}
              </div>
            ` : ''}

            <!-- Product Details Grid -->
            <div class="product-details-grid">
              ${item.vendor ? `<div class="detail-item"><strong>Vendor:</strong> ${esc(item.vendor)}</div>` : ''}
              ${item.dimensions ? `<div class="detail-item"><strong>Dimensions:</strong> ${esc(item.dimensions)}</div>` : ''}
              ${item.releaseDate ? `
                <div class="detail-item">
                  <strong>Release Date:</strong> ${esc(item.releaseDate)}
                  ${item.releaseDate.includes('/') ? `
                    <span class="date-badge ${new Date(item.releaseDate.split('/')[1] + '-' + item.releaseDate.split('/')[0] + '-01') < new Date() ? 'current' : 'future'}">
                      ${new Date(item.releaseDate.split('/')[1] + '-' + item.releaseDate.split('/')[0] + '-01') < new Date() ? 'CURRENT' : 'FUTURE'}
                    </span>
                  ` : ''}
                </div>
              ` : ''}
              ${item.pages ? `<div class="detail-item"><strong>Pages:</strong> ${esc(item.pages)}</div>` : ''}
            </div>

            <!-- Bottom Section -->
            <div class="bottom-section">
              ${item.icrkdt ? `
                <div class="barcode-section">
                  <div class="barcode-label">Barcode:</div>
                  <div class="barcode-value">${esc(item.icrkdt)}</div>
                </div>
              ` : ''}
              <div class="handle-section">
                <div class="handle-label">Handle (ISBN):</div>
                <div class="handle-value">${esc(item.handle)}</div>
              </div>
              ${item.price ? `
                <div class="price-section">
                  AUD$ ${esc(item.price)}
                </div>
              ` : ''}
              ${barcodeHtml || ''}
            </div>
          </div>
          
          <!-- Internals section - same structure as 1-up but with 2 bigger images -->
          ${item.additionalImages && item.additionalImages.length > 0 ? `
            <div class="internals-section-full">
              <div class="internals-title">Internals:</div>
              <div class="internals-thumbnails-full">
                ${item.additionalImages.slice(0, 2).map((img, idx) => 
                  `<img src="${esc(img)}" alt="Internal ${idx + 1}" class="internal-thumbnail-full">`
                ).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    },

    createDocxExport: (item: Item, index: number, imageData?: { base64: string; width: number; height: number; mimeType: string } | null, generateProductUrl?: (handle: string) => string, barcodeData?: { base64: string; width: number; height: number; mimeType: string } | null) => {
      const productUrl = generateProductUrl ? generateProductUrl(item.handle) : `https://woodslane.com.au/products/${item.handle}`;
      
      // Create a 2-column table for 1L layout (similar to 1-up)
      const table = new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: [
          // Single row with two cells
          new TableRow({
            children: [
              // Left column - Image, Author Bio
              new TableCell({
                width: {
                  size: 40,
                  type: WidthType.PERCENTAGE,
                },
                children: [
                  // Book cover image
                  ...(imageData ? [
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: imageData.base64,
                          transformation: {
                            width: 200,
                            height: 300,
                          },
                          type: "png",
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 300 },
                    }),
                  ] : []),
                  
                  // Author Bio
                  ...(item.authorBio ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Author Bio:",
                          bold: true,
                          size: 14,
                          color: "0D47A1",
                        }),
                      ],
                      spacing: { after: 200 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: htmlToText(item.authorBio),
                          size: 12,
                          color: "1565C0",
                        }),
                      ],
                      spacing: { after: 300 },
                    }),
                  ] : []),
                  
                  // Internals section - 2 landscape images
                  ...(item.additionalImages && item.additionalImages.length > 0 ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Internals:",
                          bold: true,
                          size: 14,
                          color: "495057",
                        }),
                      ],
                      spacing: { after: 200 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `${item.additionalImages.length} internal image${item.additionalImages.length > 1 ? 's' : ''} available (showing first 2 optimized for landscape)`,
                          size: 12,
                          color: "6C757D",
                          italics: true,
                        }),
                      ],
                      spacing: { after: 100 },
                    }),
                  ] : []),
                ],
              }),
              
              // Right column - Product details
              new TableCell({
                width: {
                  size: 60,
                  type: WidthType.PERCENTAGE,
                },
                children: [
                  // Title
                  new Paragraph({
                    children: [
                      new ExternalHyperlink({
                        children: [
                          new TextRun({
                            text: item.title,
                            bold: true,
                            size: 24,
                            color: "2C3E50",
                            underline: {},
                          }),
                        ],
                        link: productUrl,
                      }),
                    ],
                    spacing: { after: 200 },
                  }),
                  
                  // Subtitle
                  ...(item.subtitle ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: item.subtitle,
                          italics: true,
                          size: 18,
                          color: "7F8C8D",
                        }),
                      ],
                      spacing: { after: 200 },
                    }),
                  ] : []),
                  
                  // Author
                  ...(item.author ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: item.author,
                          size: 16,
                          color: "667eea",
                          bold: true,
                        }),
                      ],
                      spacing: { after: 300 },
                    }),
                  ] : []),
                  
                  // Description
                  ...(item.description ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: htmlToText(item.description),
                          size: 14,
                          color: "495057",
                        }),
                      ],
                      spacing: { after: 300 },
                    }),
                  ] : []),
                  
                  // Product details grid
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: [
                          item.vendor ? `Vendor: ${item.vendor}` : '',
                          item.dimensions ? `Dimensions: ${item.dimensions}` : '',
                          item.releaseDate ? `Release Date: ${item.releaseDate}` : '',
                          item.pages ? `Pages: ${item.pages}` : '',
                        ].filter(Boolean).join('\n'),
                        size: 14,
                        color: "495057",
                      }),
                    ],
                    spacing: { after: 400 },
                  }),
                  
                  // Bottom section with barcode, handle, and price
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: [
                          item.icrkdt ? `Barcode: ${item.icrkdt}` : '',
                          `Handle (ISBN): ${item.handle}`,
                          item.price ? `AUD$ ${item.price}` : '',
                        ].filter(Boolean).join('\n'),
                        size: 16,
                        color: "495057",
                        bold: true,
                      }),
                    ],
                    spacing: { after: 200 },
                  }),
                  
                  // Add barcode image if available
                  ...(barcodeData ? [
                    new Paragraph({
                      children: [
                        new ImageRun({
                          data: barcodeData.base64,
                          transformation: {
                            width: barcodeData.width * 0.5, // Scale down 50%
                            height: barcodeData.height * 0.5,
                          },
                          type: "png",
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 200 },
                    }),
                  ] : []),
                ],
              }),
            ],
          }),
        ],
      });

      return [new Paragraph({ children: [table] })];
    },

    getCssStyles: () => `
      /* 1L layout styles - optimized for landscape photos */
      @page {
        size: A4 portrait !important;
        margin: 15mm !important;
      }
      
      .layout-1L-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 24px;
        padding: 24px;
        min-height: 400px;
        box-sizing: border-box !important;
      }
      
      .layout-1L-content .main-content {
        display: flex !important;
        flex-direction: row !important;
        gap: 24px;
      }
      
      .layout-1L-content .left-column {
        flex-shrink: 0;
        width: 350px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      
      .layout-1L-content .right-column {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
      }
      
      .book-cover-container {
        text-align: center;
      }
      
      .book-cover-large {
        width: 200px;
        height: 300px;
        object-fit: cover;
        border-radius: 8px;
        background: #F8F9FA;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      
      .author-bio-box {
        background: #E3F2FD;
        padding: 20px;
        border-radius: 8px;
        font-size: 15px;
        line-height: 1.5;
        color: #1565C0;
        min-height: 150px;
      }
      
      .author-bio-title {
        font-weight: 600;
        margin-bottom: 8px;
        color: #0D47A1;
        font-size: 15px;
      }
      
      .author-bio-content {
        color: #1565C0;
        white-space: pre-line;
        max-height: none !important;
        overflow: visible !important;
        height: auto !important;
        display: block !important;
        font-size: 16px;
        line-height: 1.6;
      }
      
      /* 1L uses same internals structure as layout 1-up, but with 2 bigger landscape-optimized images spanning full width */
      .layout-1L .internals-thumbnails-full {
        flex-wrap: nowrap;
        gap: 30px;
        width: 100%;
        justify-content: center;
      }
      
      .layout-1L .internal-thumbnail-full {
        width: calc(50% - 15px);
        height: auto;
        aspect-ratio: 3 / 2;
        object-fit: cover;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        max-width: none;
      }
      
      /* Landscape vs Portrait handling for 1L internal images */
      .layout-1L .internal-thumbnail-full.image-portrait {
        object-fit: contain;
        aspect-ratio: 2 / 3;
      }
      
      .layout-1L .internal-thumbnail-full.image-landscape {
        object-fit: cover;
        aspect-ratio: 3 / 2;
      }
      
      @media print {
        .layout-1L .internals-thumbnails-full {
          flex-wrap: nowrap !important;
          display: flex !important;
        }
        
        .layout-1L .page-header {
          page-break-after: avoid;
        }
        
        .layout-1L {
          page-break-inside: avoid;
        }
      }
      
      .internals-title {
        font-weight: 600;
        margin-bottom: 16px;
        font-size: 16px;
        color: #495057;
      }
      
      .title-section {
        margin-bottom: 16px;
      }
      
      .product-title-large {
        font-size: 26px;
        font-weight: 700;
        color: #2C3E50;
        margin: 0 0 4px 0;
      }
      
      .product-subtitle-large {
        font-size: 20px;
        font-weight: 500;
        color: #7F8C8D;
        font-style: italic;
        margin: 0 0 8px 0;
      }
      
      .product-author-large {
        font-size: 18px;
        color: #667eea;
        font-weight: 600;
        margin-bottom: 16px;
      }
      
      .product-description-large {
        font-size: 16px;
        line-height: 1.6;
        color: #495057;
        margin-bottom: 16px;
        white-space: pre-line;
      }
      
      .product-details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        font-size: 16px;
        margin-bottom: 16px;
      }
      
      .detail-item {
        color: #495057;
      }
      
      .date-badge {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
        text-transform: uppercase;
        margin-left: 8px;
      }
      
      .date-badge.current {
        background-color: #28A745;
        color: white;
      }
      
      .date-badge.future {
        background-color: #007BFF;
        color: white;
      }
      
      .bottom-section {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: auto;
        padding-top: 16px;
        border-top: 1px solid #E9ECEF;
      }
      
      .barcode-section,
      .handle-section {
        text-align: center;
      }
      
      .barcode-label,
      .handle-label {
        font-size: 14px;
        margin-bottom: 4px;
        color: #6C757D;
      }
      
      .barcode-value,
      .handle-value {
        font-family: monospace;
        font-size: 18px;
        font-weight: 600;
        color: #495057;
      }
      
      .price-section {
        margin-left: auto;
        background: #ffffff;
        color: #000000;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 20px;
        font-weight: 600;
        border: 1px solid #E9ECEF;
      }
      @media print {
        .product-card, .layout-1L-content {
          border: none !important;
          box-shadow: none !important;
        }
      }
      
      
      /* Force portrait display in browser */
      @media screen {
        .layout-1L-content {
          max-width: 800px !important;
          margin: 0 auto !important;
        }
      }
      
      .read-more-btn {
        background: #17A2B8;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        margin-top: 8px;
        font-weight: 600;
        transition: background-color 0.2s ease;
      }
      
      .read-more-btn:hover {
        background: #138496;
      }
      
      .author-bio-truncated {
        display: inline;
      }
      
      .author-bio-full {
        display: none;
      }
    </style>
    
    <script>
      function toggleAuthorBio(index) {
        const bioContent = document.getElementById('author-bio-' + index);
        const truncatedSpan = bioContent.querySelector('.author-bio-truncated');
        const fullSpan = bioContent.querySelector('.author-bio-full');
        const button = bioContent.querySelector('.read-more-btn');
        
        if (truncatedSpan.style.display !== 'none') {
          truncatedSpan.style.display = 'none';
          fullSpan.style.display = 'inline';
          button.textContent = 'Read less';
        } else {
          truncatedSpan.style.display = 'inline';
          fullSpan.style.display = 'none';
          button.textContent = 'Read more';
        }
      }
      
      // Detect image orientation for landscape-optimized internals
      (function() {
        function detectImageOrientation() {
          const images = document.querySelectorAll('img.internal-thumbnail-full');
          images.forEach(img => {
            if (img.classList.contains('image-portrait') || img.classList.contains('image-landscape')) {
              return;
            }
            
            if (img.complete && img.naturalWidth && img.naturalHeight) {
              if (img.naturalWidth > img.naturalHeight) {
                img.classList.add('image-landscape');
              } else {
                img.classList.add('image-portrait');
              }
            } else {
              img.addEventListener('load', function() {
                if (this.naturalWidth > this.naturalHeight) {
                  this.classList.add('image-landscape');
                } else {
                  this.classList.add('image-portrait');
                }
              }, { once: true });
            }
          });
        }
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', detectImageOrientation);
        } else {
          detectImageOrientation();
        }
        
        setTimeout(detectImageOrientation, 100);
      })();
    </script>
    `
  };
}
