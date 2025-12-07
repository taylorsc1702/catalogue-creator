import React from 'react';
import Image from 'next/image';
import { LayoutHandler, Item, esc, formatDateAndBadge } from '../layout-handlers';
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
    
    getCssStyles: () => `
      .layout-9-vertical {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        padding: 6px;
      }
    `,
    
    createDocxElements: async (item: Item, index: number, generateProductUrl: (handle: string) => string) => {
      const elements: (Paragraph | ImageRun)[] = [];
      // Similar to 8-up but with 9 per page
      return elements;
    }
  };
}

