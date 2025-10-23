import React from 'react';
import { Item } from '../../pages/index';

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

export function createTableLayoutHandler() {
  return {
    name: 'Table',
    component: TableLayout,
    description: 'Tabular view with ISBN, Author, Title, AURRP, IMDIS, and Quantity columns'
  };
}
