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

    const html = renderListView(items, title);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render list view";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

function renderListView(items: Item[], title: string) {
  const esc = (s?: string) =>
    (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const rows = items.map((item, index) => `
    <tr>
      <td class="col-number">${index + 1}</td>
      <td class="col-isbn">${esc(item.handle)}</td>
      <td class="col-image">
        <img src="${esc(item.imageUrl || 'https://via.placeholder.com/60x90?text=No+Image')}" 
             alt="${esc(item.title)}" 
             class="thumbnail">
      </td>
      <td class="col-author">${esc(item.author || '-')}</td>
      <td class="col-title">
        <div class="title">${esc(item.title)}</div>
        ${item.subtitle ? `<div class="subtitle">${esc(item.subtitle)}</div>` : ''}
      </td>
      <td class="col-binding">${esc(item.binding || '-')}</td>
      <td class="col-pages">${esc(item.pages || '-')}</td>
      <td class="col-price">${item.price ? `$${esc(item.price)}` : '-'}</td>
      <td class="col-publisher">${esc(item.imprint || '-')}</td>
      <td class="col-date">${esc(item.releaseDate || '-')}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)} - List View</title>
  <style>
    @page { 
      size: A4 landscape; 
      margin: 10mm; 
    }
    
    * { 
      box-sizing: border-box; 
      margin: 0;
      padding: 0;
    }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
      background: white;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 24pt;
      font-weight: bold;
      color: #2C3E50;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .header .date {
      font-size: 12pt;
      color: #7F8C8D;
    }
    
    .controls {
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: center;
    }
    
    .controls button {
      padding: 8px 16px;
      border: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 11pt;
    }
    
    .controls button:hover {
      opacity: 0.9;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    th {
      padding: 12px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #5a67d8;
    }
    
    td {
      padding: 10px 8px;
      border-bottom: 1px solid #e9ecef;
      font-size: 9pt;
      vertical-align: middle;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    .col-number {
      width: 40px;
      text-align: center;
      font-weight: 600;
      color: #667eea;
    }
    
    .col-isbn {
      width: 110px;
      font-family: 'Courier New', monospace;
      font-size: 8pt;
      color: #666;
    }
    
    .col-image {
      width: 70px;
      text-align: center;
    }
    
    .thumbnail {
      width: 40px;
      height: 60px;
      object-fit: cover;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    
    .col-author {
      width: 150px;
      font-weight: 500;
    }
    
    .col-title {
      min-width: 200px;
    }
    
    .title {
      font-weight: 600;
      color: #2C3E50;
      margin-bottom: 2px;
    }
    
    .subtitle {
      font-size: 8pt;
      color: #7F8C8D;
      font-style: italic;
    }
    
    .col-binding {
      width: 100px;
      color: #666;
    }
    
    .col-pages {
      width: 70px;
      text-align: center;
      color: #666;
    }
    
    .col-price {
      width: 80px;
      text-align: right;
      font-weight: 600;
      color: #d63384;
    }
    
    .col-publisher {
      width: 150px;
      color: #666;
    }
    
    .col-date {
      width: 100px;
      color: #666;
    }
    
    .summary {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      text-align: center;
      font-size: 11pt;
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
    <h1>${esc(title)}</h1>
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
        <th>Image</th>
        <th>Author</th>
        <th>Title</th>
        <th>Binding</th>
        <th>Pages</th>
        <th>Price</th>
        <th>Publisher</th>
        <th>Release Date</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  
  <div class="summary">
    Total Items: ${items.length}
  </div>
  
  <script>
    function exportToCSV() {
      const rows = [
        ['#', 'ISBN', 'Author', 'Title', 'Subtitle', 'Binding', 'Pages', 'Price', 'Publisher', 'Release Date']
      ];
      
      const items = ${JSON.stringify(items.map((item, index) => ({
        number: index + 1,
        handle: item.handle,
        author: item.author || '-',
        title: item.title,
        subtitle: item.subtitle || '',
        binding: item.binding || '-',
        pages: item.pages || '-',
        price: item.price || '-',
        imprint: item.imprint || '-',
        releaseDate: item.releaseDate || '-'
      })))};
      
      items.forEach(item => {
        rows.push([
          item.number,
          item.handle,
          item.author,
          item.title,
          item.subtitle,
          item.binding,
          item.pages,
          item.price,
          item.imprint,
          item.releaseDate
        ]);
      });
      
      const csvContent = rows.map(row => 
        row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
      ).join('\\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'catalogue-list-' + new Date().toISOString().split('T')[0] + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}

