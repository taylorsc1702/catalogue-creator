// pages/index.tsx
import { useMemo, useState } from "react";

type Item = {
  title: string; subtitle?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  imageUrl?: string; handle: string; vendor?: string; tags?: string[];
};

// Matches what /api/products now returns: { items, query }
type ProductsResponse = {
  items: Item[];
  query?: string; // the final server-side Shopify search string
};

export default function Home() {
  const [tag, setTag] = useState("");
  const [vendor, setVendor] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [metafieldKey, setMetafieldKey] = useState("my_fields.author");
  const [metafieldContains, setMetafieldContains] = useState("");
  const [freeText, setFreeText] = useState("");
  const [layout, setLayout] = useState<1|2|4|8>(4);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [serverQuery, setServerQuery] = useState<string>(""); // <— NEW: shows the query used by API

  const queryPreview = useMemo(() => {
    const parts: string[] = [];
    if (tag) parts.push(`tag:'${tag}'`);
    if (vendor) parts.push(`vendor:'${vendor}'`);
    if (collectionId) parts.push(`collection_id:${collectionId}`);
    if (metafieldKey) {
      if (metafieldContains) parts.push(`metafield:'${metafieldKey}:${metafieldContains}*'`);
      else parts.push(`metafield:'${metafieldKey}:*'`);
    }
    if (freeText) parts.push(freeText);
    return parts.join(" AND ") || "status:active";
  }, [tag, vendor, collectionId, metafieldKey, metafieldContains, freeText]);

  async function fetchItems() {
    setLoading(true);
    try {
      const resp = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, vendor, collectionId, metafieldKey, metafieldContains, freeText }),
      });

      const data: ProductsResponse & { error?: string } = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed");

      setItems(data.items || []);
      setServerQuery(data.query || ""); // <— NEW: capture the server-side query
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
      setItems([]);
      setServerQuery("");
    } finally {
      setLoading(false);
    }
  }

  async function openPrintView() {
    if (!items.length) { alert("Fetch products first."); return; }
    const resp = await fetch("/api/render/html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, layout, showFields: { authorBio: false } })
    });
    const html = await resp.text();
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  }

  async function openBarcodeView() {
    if (!items.length) { alert("Fetch products first."); return; }
    const resp = await fetch("/api/render/barcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, layout, includeBarcodes: true })
    });
    const html = await resp.text();
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (w) { w.document.open(); w.document.write(html); w.document.close(); }
  }

  async function downloadDocx() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      const resp = await fetch("/api/render/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items, 
          title: `Catalogue - ${new Date().toLocaleDateString()}` 
        })
      });
      
      if (!resp.ok) throw new Error("Failed to generate DOCX");
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogue-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Error generating DOCX: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, Arial" }}>
      <h1>Catalogue Creator</h1>
      <p style={{ color: "#656F91" }}>Filter by Tag/Vendor/Collection/Metafield, preview, then generate HTML, DOCX, or QR code catalogues.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <Field label="Tag"><input value={tag} onChange={e=>setTag(e.target.value)} placeholder="education" /></Field>
        <Field label="Vendor"><input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="Human Kinetics" /></Field>
        <Field label="Collection ID"><input value={collectionId} onChange={e=>setCollectionId(e.target.value)} placeholder="numeric id" /></Field>
        <Field label="Metafield key"><input value={metafieldKey} onChange={e=>setMetafieldKey(e.target.value)} placeholder="my_fields.author" /></Field>
        <Field label="Metafield contains"><input value={metafieldContains} onChange={e=>setMetafieldContains(e.target.value)} placeholder="Smith" /></Field>
        <Field label="Free text"><input value={freeText} onChange={e=>setFreeText(e.target.value)} placeholder="published_status:any" /></Field>
      </div>

      {/* Local preview of what YOU typed */}
      <div style={{ marginTop: 8, color: "#656F91", fontSize: 12 }}>
        <strong>Local preview</strong>: {queryPreview}
      </div>

      {/* What the SERVER really used (from /api/products) */}
      {serverQuery !== "" && (
        <div style={{ marginTop: 4, color: "#656F91", fontSize: 12 }}>
          <strong>Server query</strong>: {serverQuery}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={fetchItems} disabled={loading} style={btn()}>{loading ? "Loading..." : "Fetch Products"}</button>
        <span>Layout:</span>
        {[1,2,4,8].map(n => (
          <button key={n} onClick={()=>setLayout(n as 1|2|4|8)} style={btn(n===layout)}>{n}-up</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={openPrintView} disabled={!items.length} style={btn()}>📄 HTML Print View</button>
        <button onClick={openBarcodeView} disabled={!items.length} style={btn()}>📱 With QR Codes</button>
        <button onClick={downloadDocx} disabled={!items.length} style={btn()}>📝 Download DOCX</button>
      </div>

      <hr style={{ margin: "20px 0" }} />
      <Preview items={items} layout={layout} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#192C6B", fontWeight: 600 }}>{label}</span>
      {children}
      <style jsx>{`input { border:1px solid #e7eef3; border-radius:8px; padding:8px 10px; font-size:14px; }`}</style>
    </label>
  );
}

function btn(active = false): React.CSSProperties {
  return { border:"1px solid #e7eef3", background: active?"#A8DCF6":"#F1F6F7", color:"#192C6B", padding:"8px 12px", borderRadius:8, cursor:"pointer", fontWeight:600 };
}

function Preview({ items, layout }: { items: Item[]; layout: 1|2|4|8 }) {
  const cols = layout === 1 ? 1 : layout === 2 ? 2 : layout === 4 ? 2 : 4;
  return (
    <div style={{ display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:12 }}>
      {items.map((it, i) => (
        <div key={i} style={{ border:"1px solid #e7eef3", borderRadius:10, padding:12, display:"grid", gridTemplateColumns:"95px 1fr", gap:12 }}>
          <img src={it.imageUrl || "https://via.placeholder.com/95x140?text=No+Image"} alt={it.title}
            style={{ width:95, height:140, objectFit:"cover", borderRadius:6, background:"#F1F6F7" }}/>
          <div>
            <div style={{ fontWeight:700 }}>{it.title}</div>
            {it.subtitle && <div style={{ color:"#656F91", fontSize:12 }}>{it.subtitle}</div>}
            {it.author && <div style={{ color:"#656F91", fontSize:12 }}>By {it.author}</div>}
            <div style={{ color:"#656F91", fontSize:12 }}>
              {[it.binding, it.pages && `${it.pages} pages`, it.dimensions].filter(Boolean).join(" • ")}
            </div>
            {it.imprint && <div style={{ color:"#656F91", fontSize:12 }}>{it.imprint}</div>}
            {it.releaseDate && <div style={{ color:"#656F91", fontSize:12 }}>Release: {it.releaseDate}</div>}
            {it.price && <div style={{ marginTop:6, fontWeight:600 }}>AUD$ {it.price}</div>}
            <div style={{ color:"#656F91", fontSize:12, marginTop:6 }}>/products/{it.handle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
