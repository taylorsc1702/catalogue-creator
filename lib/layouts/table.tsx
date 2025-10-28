import React from 'react';
import { Paragraph, TextRun } from 'docx';
import { Item, LayoutHandler, esc } from '../layout-handlers';

interface TableLayoutProps {
  items: Item[];
  showOrderEditor: boolean;
  moveItemUp: (index: number) => void;
  moveItemDown: (index: number) => void;
  moveItemToPosition: (index: number, newPosition: number) => void;
  itemLayouts: {[key: number]: 1|2|3|4|8};
  setItemLayout: (index: number, layout: 1|2|3|4|8) => void;
  clearItemLayout: (index: number) => void;
  itemBarcodeTypes: {[key: number]: "EAN-13" | "QR Code" | "None"};
  setItemBarcodeType: (index: number, type: "EAN-13" | "QR Code" | "None") => void;
  clearItemBarcodeType: (index: number) => void;
  hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
  generateProductUrl: (handle: string) => string;
}

export function TableLayout({ 
  items, 
  showOrderEditor, 
  moveItemUp, 
  moveItemDown, 
  moveItemToPosition, 
  itemLayouts, 
  setItemLayout, 
  clearItemLayout, 
  itemBarcodeTypes, 
  setItemBarcodeType, 
  clearItemBarcodeType, 
  hyperlinkToggle, 
  generateProductUrl 
}: TableLayoutProps) {
  // Suppress unused parameter warnings
  void showOrderEditor;
  void moveItemUp;
  void moveItemDown;
  void moveItemToPosition;
  void itemLayouts;
  void setItemLayout;
  void clearItemLayout;
  void itemBarcodeTypes;
  void setItemBarcodeType;
  void clearItemBarcodeType;
  void hyperlinkToggle;
  
  return (
    <div className="table-layout">
      <table className="product-table">
        <thead>
          <tr>
            <th>ISBN</th>
            <th>Author</th>
            <th>Title</th>
            <th>AURRP</th>
            <th>Disc</th>
            <th>QTY</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td>{item.sku || ''}</td>
              <td>{item.author || ''}</td>
              <td>
                <a 
                  href={generateProductUrl(item.handle)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {item.title}
                </a>
              </td>
              <td>{item.price || ''}</td>
              <td>{item.imidis || ''}</td>
              <td className="quantity-cell"></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function createTableLayoutHandler(): LayoutHandler {
  return {
    name: 'Table',
    createPreview: (item: Item, index: number, generateProductUrl: (handle: string) => string) => {
      return React.createElement('tr', { key: index },
        React.createElement('td', null, item.sku || ''),
        React.createElement('td', null, item.author || ''),
        React.createElement('td', null,
          React.createElement('a', {
            href: generateProductUrl(item.handle),
            target: '_blank',
            rel: 'noopener noreferrer',
            style: { color: 'inherit', textDecoration: 'none' }
          }, item.title)
        ),
        React.createElement('td', null, item.price || ''),
        React.createElement('td', null, item.imidis || ''),
        React.createElement('td', { className: 'quantity-cell' })
      );
    },
    createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string, bannerColor?: string, websiteName?: string) => {
      // Suppress unused parameter warnings
      void barcodeHtml;
      void bannerColor;
      void websiteName;
      
      return `
        <tr>
          <td class="table-cell">${esc(item.sku || '')}</td>
          <td class="table-cell">${esc(item.author || '')}</td>
          <td class="table-cell">
            <a href="${generateProductUrl(item.handle)}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">
              ${esc(item.title)}
            </a>
          </td>
          <td class="table-cell">${esc(item.price || '')}</td>
          <td class="table-cell">${esc(item.imidis || '')}</td>
          <td class="table-cell quantity-cell"></td>
        </tr>
      `;
    },
    createDocxExport: (item: Item, index: number, _imageData?: { base64: string; width: number; height: number; mimeType: string } | null, _generateProductUrl?: (handle: string) => string, _barcodeData?: { base64: string; width: number; height: number; mimeType: string } | null) => {
      // Suppress unused parameter warnings
      void index;
      void _imageData;
      void _generateProductUrl;
      void _barcodeData;
      // For table layout, we'll create a simple paragraph with the item data
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: `${item.sku || ''} | ${item.author || ''} | ${item.title} | ${item.price || ''} | ${item.imidis || ''}`
            })
          ]
        })
      ];
    },
    getCssStyles: () => `
      .table-layout {
        width: 100%;
      }
      
      .product-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 10px;
        margin: 0;
      }
      
      .table-header {
        background-color: #f8f9fa;
        border-left: none;
        border-right: none;
        border-top: 1px solid #dee2e6;
        border-bottom: 1px solid #dee2e6;
        padding: 2px 0;
        margin: 0;
        text-align: left;
        font-weight: 600;
        font-size: 8px;
        color: #495057;
        line-height: 1.1;
      }
      
      .table-cell {
        border-left: none;
        border-right: none;
        border-top: none;
        border-bottom: 1px solid #dee2e6;
        padding: 2px 0;
        margin: 0;
        vertical-align: top;
        font-size: 7px;
        line-height: 1.1;
        height: auto;
      }
      
      .quantity-cell {
        width: 60px;
        text-align: center;
        background-color: #f8f9fa;
      }
      
      .product-table th:nth-child(1), .product-table td:nth-child(1) { width: 12%; }
      .product-table th:nth-child(2), .product-table td:nth-child(2) { width: 18%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .product-table th:nth-child(3), .product-table td:nth-child(3) { width: 45%; }
      .product-table th:nth-child(4), .product-table td:nth-child(4) { width: 8%; }
      .product-table th:nth-child(5), .product-table td:nth-child(5) { width: 4%; }
      .product-table th:nth-child(6), .product-table td:nth-child(6) { width: 5%; }
      
      /* Remove spacing between table rows */
      .product-table tbody tr {
        margin: 0 !important;
        padding: 0 !important;
        height: auto;
        line-height: 0.8;
      }
      
      /* Remove any default spacing */
      .product-table td, .product-table th {
        padding: 0 !important;
        margin: 0 !important;
        border-spacing: 0 !important;
      }
    `,
    getPerPage: () => 50
  };
}
