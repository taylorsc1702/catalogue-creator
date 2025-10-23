import React from 'react';
import { Paragraph } from 'docx';
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
  return (
    <div className="table-layout">
      <table className="product-table">
        <thead>
          <tr>
            <th>ISBN</th>
            <th>Author</th>
            <th>Title</th>
            <th>AURRP</th>
            <th>IMDIS</th>
            <th>Quantity</th>
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
      // For table layout, we'll create a simple paragraph with the item data
      return [
        new Paragraph({
          children: [
            { text: `${item.sku || ''} | ${item.author || ''} | ${item.title} | ${item.price || ''} | ${item.imidis || ''}` }
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
        border-collapse: collapse;
        font-size: 10px;
        margin: 0;
      }
      
      .table-cell {
        border: 1px solid #dee2e6;
        padding: 6px;
        vertical-align: top;
        font-size: 9px;
        line-height: 1.2;
      }
      
      .quantity-cell {
        width: 60px;
        text-align: center;
        background-color: #f8f9fa;
      }
      
      .product-table th:nth-child(1), .product-table td:nth-child(1) { width: 12%; }
      .product-table th:nth-child(2), .product-table td:nth-child(2) { width: 18%; }
      .product-table th:nth-child(3), .product-table td:nth-child(3) { width: 35%; }
      .product-table th:nth-child(4), .product-table td:nth-child(4) { width: 10%; }
      .product-table th:nth-child(5), .product-table td:nth-child(5) { width: 10%; }
      .product-table th:nth-child(6), .product-table td:nth-child(6) { width: 15%; }
    `,
    getPerPage: () => 50
  };
}
