// pages/api/render/html.ts
import type { NextApiRequest, NextApiResponse } from "next";
type Item = {
  title: string; subtitle?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};
const SITE = process.env.SITE_BASE_URL || "https://b27202-c3.myshopify.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { items, layout = 4, showFields } = req.body as {
      items: Item[]; layout: 1|2|4|8; showFields?: Record<string, boolean>;
    };
    if (!items?.length) throw new Error("No items provided");
    const html = renderHtml(items, layout, showFields || {});
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (e: any) {
    res.status(400).send(`<pre>${e.message ?? "Failed to render HTML"}</pre>`);
  }
}

function renderHtml(items: Item[], layout: 1|2|4|8, show: Record<string, boolean>) {
  const cols = layout === 1 ? "1fr" : layout === 2 ? "1fr 1fr" : layout === 4 ? "1fr 1fr" : "1fr 1fr 1fr 1fr";
  const perPage = layout;
  const chunks: Item[][] = [];
  for (let i = 0; i < items.length; i += perPage) chunks.push(items.slice(i, i + perPage));

  const esc = (s?: string) => (s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[c]!));

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/><title>Catalogue (HTML)</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#192C6B; }
  h1,h2,h3,p { margin:0; }
  .muted { color:#656F91; }
  .noprint { margin-bottom: 10px; }
  .page { display:grid; grid-template-columns:${cols}; gap:16px; page-break-after: always; }
  .card { border:1px solid #e7eef3; border-radius:10px; padding:12px; display:grid; grid-template-columns:95px 1fr; gap:12px; }
  .thumb { width:95px; height:140px; object-fit:cover; border-radius:6px; background:#F1F6F7; }
  .title { font-weight:700; line-height:1.2; margin:0 0 2px; }
  .subtitle { font-size:12px; color:#656F91; margin:0 0 6px; }
  .meta { font-size:12px; color:#656F91; margin:2px 0; }
  .price { font-weight:600; margin-top:6px; }
  .url { margin-top:6px; font-size:11px; color:#656F91; word-break: break-all; }
  @media print { .noprint { display:none !important; } }
</style>
</head>
<body>
  <div class="noprint">
    <button onclick="window.print()">Print / Save as PDF</button>
    <span class="muted">Use A4, ~14mm margins, hide headers/footers.</span>
  </div>

  <div class="page">
    ${items.length === 0 ? "" : ""}
  </div>

  ${chunks.map(page => `
    <div class="page">
      ${page.map(it => `
        <div class="card">
          <img class="thumb" src="${esc(it.imageUrl)}" alt="${esc(it.title)}">
          <div>
            <h3 class="title">${esc(it.title)}</h3>
            ${it.subtitle ? `<div class="subtitle">${esc(it.subtitle)}</div>` : ``}
            ${it.author ? `<div class="meta">By ${esc(it.author)}</div>` : ``}
            <div class="meta">
              ${[
                it.binding,
                it.pages && \`\${it.pages} pages\`,
                it.dimensions,
                it.edition && \`Edition: \${esc(it.edition)}\`
              ].filter(Boolean).join(" • ")}
            </div>
            ${it.imprint ? `<div class="meta">Imprint: ${esc(it.imprint)}</div>` : ``}
            ${it.releaseDate ? `<div class="meta">Release: ${esc(it.releaseDate)}</div>` : ``}
            ${it.weight ? `<div class="meta">Weight: ${esc(it.weight)}</div>` : ``}
            ${it.illustrations ? `<div class="meta">Illustrations: ${esc(it.illustrations)}</div>` : ``}
            ${it.price ? `<div class="price">AUD$ ${esc(it.price)}</div>` : ``}
            <div class="url">${esc(`${SITE}/products/${it.handle}`)}</div>
            ${show?.authorBio && it.authorBio ? `<div class="meta" style="margin-top:6px;">${esc(it.authorBio)}</div>` : ``}
          </div>
        </div>
      `).join("")}
    </div>
  `).join("")}
</body>
</html>`;
}
