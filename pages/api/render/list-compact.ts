import type { NextApiRequest, NextApiResponse } from "next";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, title = "Product Catalogue" } = req.body as {
      items: Item[]; 
      title?: string;
    };
    
    if (!items?.length) throw new Error("No items provided");

    const html = renderCompactListView(items, title);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render compact list view";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

function renderCompactListView(items: Item[], title: string) {
  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const rows = items.map((item, index) => `
    <tr>
      <td class="col-number">${index + 1}</td>
      <td class="col-isbn">${esc(item.handle)}</td>
      <td class="col-author">${esc(item.author || '-')}</td>
      <td class="col-title">
        <div class="title">${esc(item.title)}</div>
        ${item.subtitle ? `<div class="subtitle">${esc(item.subtitle)}</div>` : ''}
        ${item.releaseDate ? `<div class="release-date">Release: ${esc(item.releaseDate)}</div>` : ''}
      </td>
      <td class="col-price">${item.price ? `$${esc(item.price)}` : '-'}</td>
      <td class="col-publisher">${esc(item.imprint || '-')}</td>
      <td class="col-barcode">
        <svg class="barcode" id="barcode-${index}"></svg>
      </td>
      <td class="col-qty">
        <div class="qty-box"></div>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)} - Compact List View</title>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 10mm; 
    }
    
    * { 
      box-sizing: border-box; 
      margin: 0;
      padding: 0;
    }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 9pt;
      line-height: 1.3;
      color: #333;
      background: white;
      padding: 15px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .header h1 {
      font-size: 20pt;
      font-weight: bold;
      color: #2C3E50;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .header .date {
      font-size: 10pt;
      color: #7F8C8D;
    }
    
    .controls {
      margin-bottom: 15px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: center;
    }
    
    .controls button {
      padding: 6px 14px;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 600;
      font-size: 10pt;
    }
    
    .controls button:hover {
      opacity: 0.9;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      font-size: 8pt;
    }
    
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    th {
      padding: 8px 6px;
      text-align: left;
      font-weight: 600;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 2px solid #5a67d8;
    }
    
    td {
      padding: 6px;
      border-bottom: 1px solid #e9ecef;
      font-size: 8pt;
      vertical-align: middle;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    .col-number {
      width: 30px;
      text-align: center;
      font-weight: 600;
      color: #667eea;
    }
    
    .col-isbn {
      width: 100px;
      font-family: 'Courier New', monospace;
      font-size: 7pt;
      color: #666;
    }
    
    .col-author {
      width: 120px;
      font-weight: 500;
    }
    
    .col-title {
      min-width: 200px;
      max-width: 300px;
    }
    
    .title {
      font-weight: 600;
      color: #2C3E50;
      margin-bottom: 2px;
      line-height: 1.2;
    }
    
    .subtitle {
      font-size: 7pt;
      color: #7F8C8D;
      font-style: italic;
      margin-bottom: 1px;
      line-height: 1.2;
    }
    
    .release-date {
      font-size: 7pt;
      color: #666;
      margin-top: 2px;
    }
    
    .col-price {
      width: 60px;
      text-align: right;
      font-weight: 600;
      color: #d63384;
    }
    
    .col-publisher {
      width: 110px;
      color: #666;
      font-size: 7pt;
    }
    
    .col-barcode {
      width: 100px;
      text-align: center;
      padding: 3px;
    }
    
    .barcode {
      width: 95px;
      height: 35px;
    }
    
    .col-qty {
      width: 45px;
      text-align: center;
    }
    
    .qty-box {
      width: 40px;
      height: 25px;
      border: 2px solid #333;
      border-radius: 3px;
      margin: 0 auto;
      background: white;
    }
    
    .summary {
      margin-top: 15px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .controls {
        display: none;
      }
      
      .header h1 {
        -webkit-text-fill-color: #2C3E50;
      }
      
      table {
        box-shadow: none;
      }
      
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${esc(title)} - Compact</h1>
    <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
  </div>
  
  <div class="controls">
    <button onclick="window.print()">🖨️ Print</button>
    <button onclick="exportToCSV()">📊 Export to CSV</button>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>ISBN</th>
        <th>Author</th>
        <th>Title / Release</th>
        <th>Price</th>
        <th>Publisher</th>
        <th>Barcode</th>
        <th>Qty</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  
  <div class="summary">
    Total Items: ${items.length}
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <script>
    // Generate barcodes for all ISBNs
    window.addEventListener('load', function() {
      const items = ${JSON.stringify(items.map((item, index) => ({ index, isbn: item.handle })))};
      
      items.forEach(item => {
        try {
          const isbn = item.isbn.replace(/[^0-9]/g, ''); // Remove any non-numeric characters
          const barcodeElement = document.getElementById('barcode-' + item.index);
          
          if (barcodeElement && isbn.length >= 12) {
            // Try EAN-13 format (13 digits) or UPC-A (12 digits)
            const format = isbn.length === 13 ? 'EAN13' : isbn.length === 12 ? 'UPC' : 'CODE128';
            JsBarcode(barcodeElement, isbn, {
              format: format,
              width: 1.2,
              height: 30,
              displayValue: true,
              fontSize: 8,
              margin: 1
            });
          } else if (barcodeElement) {
            // Fallback to CODE128 for non-standard ISBNs
            JsBarcode(barcodeElement, item.isbn, {
              format: 'CODE128',
              width: 1.2,
              height: 30,
              displayValue: true,
              fontSize: 8,
              margin: 1
            });
          }
        } catch (e) {
          console.error('Error generating barcode for', item.isbn, e);
        }
      });
    });
    
    function exportToCSV() {
      const rows = [
        ['#', 'ISBN', 'Author', 'Title', 'Subtitle', 'Release Date', 'Price', 'Publisher', 'Qty']
      ];
      
      const items = ${JSON.stringify(items.map((item, index) => ({
        number: index + 1,
        handle: item.handle,
        author: item.author || '-',
        title: item.title,
        subtitle: item.subtitle || '',
        releaseDate: item.releaseDate || '-',
        price: item.price || '-',
        imprint: item.imprint || '-'
      })))};
      
      items.forEach(item => {
        rows.push([
          item.number,
          item.handle,
          item.author,
          item.title,
          item.subtitle,
          item.releaseDate,
          item.price,
          item.imprint,
          '' // Empty Qty column for manual entry
        ]);
      });
      
      const csvContent = rows.map(row => 
        row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
      ).join('\\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'catalogue-compact-list-' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}

