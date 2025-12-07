import React from 'react';
import Image from 'next/image';
import { LayoutHandler, Item, esc, formatDateAndBadge } from '../layout-handlers';
import { Paragraph, AlignmentType, ImageRun, TextRun, ExternalHyperlink } from 'docx';

export function create12UpLayoutHandler(): LayoutHandler {
  return {
    name: '12-up',
    getPerPage: () => 12,
    
    createPreview: (item: Item, index: number, generateProductUrl: (handle: string) => string) => {
      return (
        <div key={index} style={{ 
          border: "2px solid #E9ECEF", 
          borderRadius: 12, 
          padding: 10, 
          display: "flex", 
          gap: 10,
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
            width: "60px"
          }}>
            <Image 
              src={item.imageUrl || "https://via.placeholder.com/60x90?text=No+Image"} 
              alt={item.title}
              width={60}
              height={90}
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
              top: 6,
              right: 6,
              background: "#ffffff",
              color: "#000000",
              padding: "3px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              AUD$ {item.price}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ 
              margin: "0 0 4px 0", 
              fontSize: 12, 
              fontWeight: 600, 
              color: "#212529",
              lineHeight: 1.2
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
              <div style={{ fontSize: 10, color: "#6C757D", marginBottom: 2 }}>
                {esc(item.author)}
              </div>
            )}
            {item.sku && (
              <div style={{ fontSize: 9, color: "#868E96", marginTop: 2 }}>
                ISBN: {esc(item.sku)}
              </div>
            )}
          </div>
        </div>
      );
    },
    
    getCssStyles: () => `
      .layout-12-vertical {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 5px;
      }
    `,
    
    createDocxElements: async (item: Item, index: number, generateProductUrl: (handle: string) => string) => {
      const elements: (Paragraph | ImageRun)[] = [];
      // Similar to 8-up but with 12 per page
      return elements;
    }
  };
}

