// pages/index.tsx
import { useMemo, useState } from "react";
import Image from 'next/image';
import { layoutRegistry } from '@/lib/layout-registry';

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  icauth?: string; // Australian author metafield
  publicity?: string; reviews?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

// Matches what /api/products now returns: { items, query }
type ProductsResponse = {
  items: Item[];
  query?: string; // the final server-side Shopify search string
};

// Helper function to format date and determine badge type
function formatDateAndBadge(releaseDate?: string): { formattedDate: string; badgeType: 'current' | 'future' | null } {
  if (!releaseDate) return { formattedDate: '', badgeType: null };
  
  try {
    // Parse the date - handle various formats
    let date: Date;
    if (releaseDate.includes('/')) {
      // Handle MM/DD/YYYY or MM/YYYY format
      const parts = releaseDate.split('/');
      if (parts.length === 2) {
        // MM/YYYY format
        date = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
      } else {
        // MM/DD/YYYY format
        date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
    } else {
      // Try to parse as ISO date or other formats
      date = new Date(releaseDate);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { formattedDate: releaseDate, badgeType: null };
    }
    
    // Format as MM/YYYY
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${month}/${year}`;
    
    // Compare with current month/year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // Determine badge type - correct logic
    let badgeType: 'current' | 'future' | null = null;
    
    // If release date < current month/year, show CURRENT badge (past releases)
    if (date.getFullYear() < currentYear || 
        (date.getFullYear() === currentYear && date.getMonth() + 1 < currentMonth)) {
      badgeType = 'current';
    }
    // If release date >= current month/year, show FUTURE badge (current/future releases)
    else if (date.getFullYear() > currentYear || 
        (date.getFullYear() === currentYear && date.getMonth() + 1 >= currentMonth)) {
      badgeType = 'future';
    }
    
    return { formattedDate, badgeType };
  } catch {
    return { formattedDate: releaseDate, badgeType: null };
  }
}

export default function Home() {
  const [tag, setTag] = useState("");
  const [vendor, setVendor] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [publishingStatus, setPublishingStatus] = useState<"Active" | "Draft" | "All">("All");
  const [handleList, setHandleList] = useState("");
  const [layout, setLayout] = useState<1|2|3|4|8|'list'|'compact-list'>(4);
  const [barcodeType, setBarcodeType] = useState<"EAN-13" | "QR Code" | "None">("QR Code");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [serverQuery, setServerQuery] = useState<string>(""); // <— NEW: shows the query used by API
  const [useHandleList, setUseHandleList] = useState(false);
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [itemLayouts, setItemLayouts] = useState<{[key: number]: 1|2|3|4|8}>({});
  const [itemBarcodeTypes, setItemBarcodeTypes] = useState<{[key: number]: "EAN-13" | "QR Code" | "None"}>({});
  const [hyperlinkToggle, setHyperlinkToggle] = useState<'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress'>('woodslane');
  const [customBannerColor, setCustomBannerColor] = useState<string>("");
  
  // UTM Parameters
  const [catalogueName, setCatalogueName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [utmTerm, setUtmTerm] = useState("");

  // Banner color configuration based on website
  const getBannerColor = (website: string): string => {
    // Use custom color if provided, otherwise use default website color
    if (customBannerColor.trim()) {
      return customBannerColor.startsWith('#') ? customBannerColor : `#${customBannerColor}`;
    }
    
    const colors = {
      woodslane: '#F7981D',
      woodslanehealth: '#192C6B', 
      woodslaneeducation: '#E4506E',
      woodslanepress: '#1EADFF'
    };
    return colors[website as keyof typeof colors] || '#F7981D';
  };

  const getWebsiteName = (website: string): string => {
    const names = {
      woodslane: 'www.woodslane.com.au',
      woodslanehealth: 'www.woodslanehealth.com.au',
      woodslaneeducation: 'www.woodslaneeducation.com.au', 
      woodslanepress: 'www.woodslanepress.com.au'
    };
    return names[website as keyof typeof names] || 'www.woodslane.com.au';
  };

  const queryPreview = useMemo(() => {
    if (useHandleList && handleList.trim()) {
      const handles = handleList.split('\n').map(h => h.trim()).filter(Boolean);
      return `handle:(${handles.join(' OR ')})`;
    }
    
    const parts: string[] = [];
    if (tag) parts.push(`tag:'${tag}'`);
    if (vendor) parts.push(`vendor:'${vendor}'`);
    if (collectionId) parts.push(`collection_id:${collectionId}`);
    if (publishingStatus !== "All") {
      parts.push(`status:${publishingStatus.toLowerCase()}`);
    }
    return parts.join(" AND ") || "status:active";
  }, [tag, vendor, collectionId, publishingStatus, useHandleList, handleList]);

  async function fetchItems() {
    setLoading(true);
    try {
      const requestBody = useHandleList && handleList.trim() 
        ? { handleList: handleList.trim().split('\n').map(h => h.trim()).filter(Boolean) }
        : { tag, vendor, collectionId, publishingStatus };
        
      const resp = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
    try {
      const resp = await fetch("/api/render/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items, 
          layout, 
          showFields: { authorBio: layout === 1 }, 
          hyperlinkToggle,
          itemBarcodeTypes,
          barcodeType,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error generating HTML: ${error}`);
        return;
      }
      
      const html = await resp.text();
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (w) { 
        w.document.open(); 
        w.document.write(html); 
        w.document.close();
        w.focus();
      } else {
        // Fallback: create a blob URL and download
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogue-${layout}-per-page-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Popup blocked. HTML file downloaded instead.");
      }
    } catch (error) {
      alert("Error generating HTML: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }


  async function downloadDocx() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      const resp = await fetch("/api/render/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items, 
          layout,
          title: catalogueName || `Catalogue - ${new Date().toLocaleDateString()}`,
          hyperlinkToggle,
          itemBarcodeTypes,
          barcodeType,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          discountCode,
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
        })
      });
      
      if (!resp.ok) throw new Error("Failed to generate DOCX");
      
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogue-${layout}-per-page-${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("Error generating DOCX: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function openGoogleDocs() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      const resp = await fetch("/api/render/googledocs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items, 
          layout,
          title: catalogueName || `Catalogue - ${new Date().toLocaleDateString()}`,
          hyperlinkToggle,
          itemBarcodeTypes,
          barcodeType,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          discountCode,
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error generating Google Docs HTML: ${error}`);
        return;
      }
      
      const html = await resp.text();
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (w) { 
        w.document.open(); 
        w.document.write(html); 
        w.document.close();
        w.focus();
      } else {
        // Fallback: create a blob URL and download
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogue-google-docs-${layout}-per-page-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Popup blocked. HTML file downloaded instead. Import this into Google Docs.");
      }
    } catch (error) {
      alert("Error generating Google Docs HTML: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function openGoogleAppsScript() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      const resp = await fetch("/api/render/googledocs-apps-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items, 
          layout,
          title: catalogueName || `Catalogue - ${new Date().toLocaleDateString()}`,
          showFields: { authorBio: layout === 1 },
          hyperlinkToggle,
          itemBarcodeTypes,
          barcodeType,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error creating Google Doc: ${error}`);
        return;
      }
      
      const result = await resp.json();
      
      if (result.success) {
        // Open the Google Doc in a new tab
        window.open(result.documentUrl, '_blank');
        
        // Show success message with document info
        alert(`✅ Google Doc created successfully!\n\n📄 Document: ${result.documentName}\n🔗 URL: ${result.documentUrl}\n\nYour catalogue has been created with perfect formatting!`);
      } else {
        alert(`❌ Error creating Google Doc: ${result.error}\n\n${result.instructions || ''}`);
      }
    } catch (error) {
      alert("Error creating Google Doc: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function openListView() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      const resp = await fetch("/api/render/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items,
          title: catalogueName || `Catalogue - ${new Date().toLocaleDateString()}`,
          hyperlinkToggle,
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error generating list view: ${error}`);
        return;
      }
      
      const html = await resp.text();
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (w) { 
        w.document.open(); 
        w.document.write(html); 
        w.document.close();
        w.focus();
      } else {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogue-list-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Popup blocked. HTML file downloaded instead.");
      }
    } catch (error) {
      alert("Error generating list view: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function openCompactListView() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      const resp = await fetch("/api/render/list-compact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items,
          title: catalogueName || `Catalogue - ${new Date().toLocaleDateString()}`,
          hyperlinkToggle,
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error generating compact list view: ${error}`);
        return;
      }
      
      const html = await resp.text();
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (w) { 
        w.document.open(); 
        w.document.write(html); 
        w.document.close();
        w.focus();
      } else {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogue-compact-list-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Popup blocked. HTML file downloaded instead.");
      }
    } catch (error) {
      alert("Error generating compact list view: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  function moveItemUp(index: number) {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems);
  }

  function moveItemDown(index: number) {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems);
  }

  function moveItemToPosition(index: number, newPosition: number) {
    if (newPosition < 1 || newPosition > items.length) return;
    const newItems = [...items];
    const [item] = newItems.splice(index, 1);
    newItems.splice(newPosition - 1, 0, item);
    setItems(newItems);
  }

  function setItemLayout(index: number, layout: 1|2|3|4|8) {
    setItemLayouts({...itemLayouts, [index]: layout});
  }

  function clearItemLayout(index: number) {
    const newLayouts = {...itemLayouts};
    delete newLayouts[index];
    setItemLayouts(newLayouts);
  }

  function setItemBarcodeType(index: number, barcodeType: "EAN-13" | "QR Code" | "None") {
    setItemBarcodeTypes({...itemBarcodeTypes, [index]: barcodeType});
  }

  function clearItemBarcodeType(index: number) {
    const newBarcodeTypes = {...itemBarcodeTypes};
    delete newBarcodeTypes[index];
    setItemBarcodeTypes(newBarcodeTypes);
  }

  function generateProductUrl(handle: string): string {
    const baseUrls = {
      woodslane: 'https://woodslane.com.au',
      woodslanehealth: 'https://www.woodslanehealth.com.au',
      woodslaneeducation: 'https://www.woodslaneeducation.com.au',
      woodslanepress: 'https://www.woodslanepress.com.au'
    };
    
    const baseUrl = `${baseUrls[hyperlinkToggle]}/products/${handle}`;
    
    // Add discount code and UTM parameters if any are provided
    const urlParams = new URLSearchParams();
    
    // Add discount code first
    if (discountCode) {
      urlParams.set('discount', discountCode);
    }
    
    // Add UTM parameters
    if (utmSource) urlParams.set('utm_source', utmSource);
    if (utmMedium) urlParams.set('utm_medium', utmMedium);
    if (utmCampaign) urlParams.set('utm_campaign', utmCampaign);
    if (utmContent) urlParams.set('utm_content', utmContent);
    if (utmTerm) urlParams.set('utm_term', utmTerm);
    
    return urlParams.toString() ? `${baseUrl}?${urlParams.toString()}` : baseUrl;
  }


  async function openMixedLayout() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      // Create layout assignments array
      const layoutAssignments = items.map((_, i) => itemLayouts[i] || layout);
      
      const resp = await fetch("/api/render/mixed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items,
          layoutAssignments,
          showFields: { authorBio: true },
          hyperlinkToggle,
          itemBarcodeTypes,
          barcodeType,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error generating mixed layout: ${error}`);
        return;
      }
      
    const html = await resp.text();
    const w = window.open("", "_blank", "noopener,noreferrer");
      if (w) { 
        w.document.open(); 
        w.document.write(html); 
        w.document.close();
        w.focus();
      } else {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogue-mixed-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Popup blocked. HTML file downloaded instead.");
      }
    } catch (error) {
      alert("Error generating mixed layout: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  return (
    <div style={{ 
      padding: 32, 
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh"
    }}>
      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 32,
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        maxWidth: 1200,
        margin: "0 auto"
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ 
            fontSize: 36, 
            fontWeight: 700, 
            color: "#2C3E50", 
            margin: 0,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            📚 Catalogue Creator
          </h1>
          <p style={{ 
            color: "#7F8C8D", 
            fontSize: 18, 
            margin: "12px 0 0 0",
            fontWeight: 400
          }}>
            Create professional product catalogues from your Shopify store
          </p>
        </div>

        {/* Catalogue Name Input */}
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#4A5568", fontSize: "1.1rem" }}>
            Catalogue Name
          </label>
          <input
            type="text"
            value={catalogueName}
            onChange={(e) => setCatalogueName(e.target.value)}
            placeholder="Enter catalogue name (e.g., 'Spring 2025 Collection', 'B2B Medical Devices')"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "12px 16px",
              border: "2px solid #E2E8F0",
              borderRadius: "8px",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#805AD5"}
            onBlur={(e) => e.target.style.borderColor = "#E2E8F0"}
          />
        </div>

        {/* Discount Code Input */}
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#4A5568", fontSize: "1.1rem" }}>
            Discount Code (Optional)
          </label>
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            placeholder="Enter discount code (e.g., 'SAVE20', 'SPRING2025')"
            style={{
              width: "100%",
              maxWidth: "300px",
              padding: "12px 16px",
              border: "2px solid #E2E8F0",
              borderRadius: "8px",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#805AD5"}
            onBlur={(e) => e.target.style.borderColor = "#E2E8F0"}
          />
        </div>

      {/* Search Mode Toggle */}
      <div style={{ 
        marginBottom: 24, 
        display: "flex", 
        gap: 8, 
        alignItems: "center",
        background: "#F8F9FA",
        padding: 8,
        borderRadius: 12,
        border: "1px solid #E9ECEF"
      }}>
        <label style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 8, 
          cursor: "pointer",
          padding: "12px 20px",
          borderRadius: 8,
          background: !useHandleList ? "white" : "transparent",
          border: !useHandleList ? "2px solid #667eea" : "2px solid transparent",
          transition: "all 0.2s ease",
          flex: 1,
          justifyContent: "center"
        }}>
          <input 
            type="radio" 
            checked={!useHandleList} 
            onChange={() => setUseHandleList(false)}
            style={{ margin: 0, display: "none" }}
          />
          <span style={{ 
            fontWeight: 600, 
            color: !useHandleList ? "#667eea" : "#6C757D",
            fontSize: 14
          }}>
            🔍 Filter by Fields
          </span>
        </label>
        <label style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 8, 
          cursor: "pointer",
          padding: "12px 20px",
          borderRadius: 8,
          background: useHandleList ? "white" : "transparent",
          border: useHandleList ? "2px solid #667eea" : "2px solid transparent",
          transition: "all 0.2s ease",
          flex: 1,
          justifyContent: "center"
        }}>
          <input 
            type="radio" 
            checked={useHandleList} 
            onChange={() => setUseHandleList(true)}
            style={{ margin: 0, display: "none" }}
          />
          <span style={{ 
            fontWeight: 600, 
            color: useHandleList ? "#667eea" : "#6C757D",
            fontSize: 14
          }}>
            📋 Paste ISBN List
          </span>
        </label>
      </div>

      {!useHandleList ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <Field label="Tag"><input value={tag} onChange={e=>setTag(e.target.value)} placeholder="education" /></Field>
        <Field label="Vendor"><input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="Human Kinetics" /></Field>
        <Field label="Collection ID"><input value={collectionId} onChange={e=>setCollectionId(e.target.value)} placeholder="numeric id" /></Field>
        <Field label="Publishing Status">
          <select 
            value={publishingStatus} 
            onChange={e=>setPublishingStatus(e.target.value as "Active" | "Draft" | "All")}
            style={{
              border: "2px solid #E9ECEF", 
              borderRadius: "10px", 
              padding: "12px 16px", 
              fontSize: "14px",
              background: "#FAFBFC",
              transition: "all 0.2s ease",
              outline: "none",
              cursor: "pointer"
            }}
            onFocus={(e) => e.target.style.borderColor = "#667eea"}
            onBlur={(e) => e.target.style.borderColor = "#E9ECEF"}
          >
            <option value="All">All</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
          </select>
        </Field>
      </div>
      ) : (
        <div style={{ marginBottom: 16 }}>
          <Field label="ISBN/Handle List (one per line)">
            <textarea 
              value={handleList} 
              onChange={e=>setHandleList(e.target.value)} 
              placeholder="9781597842204&#10;9781597842181&#10;9781597842198"
              style={{ 
                width: "100%", 
                height: 120, 
                border: "1px solid #e7eef3", 
                borderRadius: 8, 
                padding: 12, 
                fontSize: 14,
                fontFamily: "monospace",
                resize: "vertical"
              }}
            />
          </Field>
          <div style={{ fontSize: 12, color: "#656F91", marginTop: 4 }}>
            💡 Paste a list of ISBNs or product handles (one per line). This will create a targeted catalogue with only these specific products.
          </div>
        </div>
      )}

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
        {[1,2,3,4,8].map(n => (
          <button key={n} onClick={()=>setLayout(n as 1|2|3|4|8)} style={btn(n===layout)}>{n}-up</button>
        ))}
        <button onClick={()=>setLayout('list')} style={btn(layout==='list')}>📋 List</button>
        <button onClick={()=>setLayout('compact-list')} style={btn(layout==='compact-list')}>📄 Compact</button>
        <span style={{ marginLeft: 16, fontSize: 14, fontWeight: 600, color: "#495057" }}>Barcode Type:</span>
        {["EAN-13", "QR Code", "None"].map(type => (
          <button 
            key={type}
            onClick={()=>setBarcodeType(type as "EAN-13" | "QR Code" | "None")} 
            style={{
              ...btn(barcodeType === type),
              fontSize: 12,
              padding: "6px 12px"
            }}
          >
            {type === "EAN-13" ? "📊 EAN-13" : type === "QR Code" ? "📱 QR Code" : "🚫 None"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#495057" }}>Hyperlink Domain:</span>
        {[
          { key: 'woodslane', label: 'Woodslane' },
          { key: 'woodslanehealth', label: 'Woodslane Health' },
          { key: 'woodslaneeducation', label: 'Woodslane Education' },
          { key: 'woodslanepress', label: 'Woodslane Press' }
        ].map(option => (
          <button 
            key={option.key}
            onClick={() => setHyperlinkToggle(option.key as 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress')}
            style={{
              ...btn(hyperlinkToggle === option.key),
              fontSize: 12,
              padding: "6px 12px"
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Banner Preview */}
      <div style={{ marginTop: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#495057", marginBottom: 8, display: "block" }}>Export Banner Preview:</span>
        <div style={{ 
          backgroundColor: getBannerColor(hyperlinkToggle), 
          color: "white", 
          padding: "8px 16px", 
          borderRadius: 4,
          textAlign: "center",
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 8
        }}>
          {getWebsiteName(hyperlinkToggle)}
        </div>
        <div style={{ fontSize: 12, color: "#6C757D", textAlign: "center" }}>
          This banner will appear at the header and footer of all exports
        </div>
        
        {/* Custom Color Selector */}
        <div style={{ marginTop: 16 }}>
          <Field label="Custom Banner Color (Optional)">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="text"
                placeholder="e.g., #FF5733 or FF5733"
                value={customBannerColor}
                onChange={(e) => setCustomBannerColor(e.target.value)}
                style={{ 
                  flex: 1,
                  border: "2px solid #E9ECEF", 
                  borderRadius: 8, 
                  padding: "8px 12px", 
                  fontSize: 14,
                  fontFamily: "monospace"
                }}
              />
              <input
                type="color"
                value={getBannerColor(hyperlinkToggle)}
                onChange={(e) => setCustomBannerColor(e.target.value)}
                style={{ 
                  width: 40, 
                  height: 40, 
                  border: "2px solid #E9ECEF", 
                  borderRadius: 8,
                  cursor: "pointer"
                }}
                title="Pick a color"
              />
              {customBannerColor && (
                <button
                  onClick={() => setCustomBannerColor("")}
                  style={{
                    background: "#6C757D",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 12,
                    cursor: "pointer"
                  }}
                  title="Reset to default color"
                >
                  Reset
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#6C757D", marginTop: 4 }}>
              Leave empty to use the default website color. Enter HEX code with or without #
            </div>
          </Field>
        </div>
      </div>

      {/* UTM Parameters Section */}
      <div style={{ 
        marginTop: 20, 
        padding: 16, 
        background: "#F8F9FA", 
        borderRadius: 12, 
        border: "1px solid #E9ECEF" 
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: 8, 
          marginBottom: 16 
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#495057" }}>📊 UTM Tracking Parameters</span>
          <span style={{ fontSize: 12, color: "#6C757D" }}>(Optional - for analytics tracking)</span>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <Field label="Source (utm_source)">
            <input 
              value={utmSource} 
              onChange={e => setUtmSource(e.target.value)} 
              placeholder="catalogue" 
              style={{ fontSize: 12 }}
            />
          </Field>
          <Field label="Medium (utm_medium)">
            <input 
              value={utmMedium} 
              onChange={e => setUtmMedium(e.target.value)} 
              placeholder="print" 
              style={{ fontSize: 12 }}
            />
          </Field>
          <Field label="Campaign (utm_campaign)">
            <input 
              value={utmCampaign} 
              onChange={e => setUtmCampaign(e.target.value)} 
              placeholder="spring2024" 
              style={{ fontSize: 12 }}
            />
          </Field>
          <Field label="Content (utm_content)">
            <input 
              value={utmContent} 
              onChange={e => setUtmContent(e.target.value)} 
              placeholder="qr_code" 
              style={{ fontSize: 12 }}
            />
          </Field>
          <Field label="Term (utm_term)">
            <input 
              value={utmTerm} 
              onChange={e => setUtmTerm(e.target.value)} 
              placeholder="keyword" 
              style={{ fontSize: 12 }}
            />
          </Field>
        </div>
        
        <div style={{ fontSize: 12, color: "#6C757D", marginTop: 8 }}>
          💡 These parameters will be added to all product URLs in QR codes and exports for tracking purposes.
        </div>
      </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={openPrintView} disabled={!items.length} style={btn()}>📄 HTML Print View</button>
            <button onClick={downloadDocx} disabled={!items.length} style={btn()}>📝 Download DOCX</button>
            <button onClick={openGoogleDocs} disabled={!items.length} style={btn()}>📊 Google Docs Import</button>
            <button onClick={openGoogleAppsScript} disabled={!items.length} style={btn()}>🚀 Create Google Doc</button>
            <button onClick={openListView} disabled={!items.length} style={btn()}>📋 List View</button>
            <button onClick={openCompactListView} disabled={!items.length} style={btn()}>📋 Compact List</button>
          </div>


          {items.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button 
                onClick={() => setShowOrderEditor(!showOrderEditor)} 
                style={btn(showOrderEditor)}
              >
                {showOrderEditor ? '✓ Reordering Mode' : '🔀 Reorder Items'}
              </button>
              <button onClick={openMixedLayout} disabled={!items.length} style={btn()}>
                🎨 Mixed Layout View
              </button>
              {showOrderEditor && (
                <span style={{ fontSize: 13, color: '#656F91' }}>
                  💡 Use arrows to reorder items, assign layouts, or enter position numbers
                </span>
              )}
            </div>
          )}


      <hr style={{ margin: "32px 0", border: "none", height: "2px", background: "linear-gradient(90deg, transparent, #E9ECEF, transparent)" }} />
      <Preview items={items} layout={layout} showOrderEditor={showOrderEditor} moveItemUp={moveItemUp} moveItemDown={moveItemDown} moveItemToPosition={moveItemToPosition} itemLayouts={itemLayouts} setItemLayout={setItemLayout} clearItemLayout={clearItemLayout} itemBarcodeTypes={itemBarcodeTypes} setItemBarcodeType={setItemBarcodeType} clearItemBarcodeType={clearItemBarcodeType} hyperlinkToggle={hyperlinkToggle} generateProductUrl={generateProductUrl} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ 
        fontSize: 13, 
        color: "#495057", 
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        {label}
      </span>
      {children}
      <style jsx>{`
        input { 
          border: 2px solid #E9ECEF; 
          border-radius: 10px; 
          padding: 12px 16px; 
          font-size: 14px;
          transition: all 0.2s ease;
          background: #FAFBFC;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        textarea {
          border: 2px solid #E9ECEF;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: #FAFBFC;
        }
        textarea:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        select {
          border: 2px solid #E9ECEF;
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: #FAFBFC;
        }
        select:focus {
          outline: none;
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
      `}</style>
    </label>
  );
}

function btn(active = false): React.CSSProperties {
  return { 
    border: active ? "2px solid #667eea" : "2px solid #E9ECEF", 
    background: active ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white", 
    color: active ? "white" : "#495057", 
    padding: "12px 24px", 
    borderRadius: 12, 
    cursor: "pointer", 
    fontWeight: 600,
    fontSize: 14,
    transition: "all 0.2s ease",
    boxShadow: active ? "0 4px 12px rgba(102, 126, 234, 0.3)" : "0 2px 4px rgba(0,0,0,0.1)",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  };
}

function Preview({ items, layout, showOrderEditor, moveItemUp, moveItemDown, moveItemToPosition, itemLayouts, setItemLayout, clearItemLayout, itemBarcodeTypes, setItemBarcodeType, clearItemBarcodeType, hyperlinkToggle, generateProductUrl }: { 
  items: Item[]; 
  layout: 1|2|3|4|8|'list'|'compact-list'; 
  showOrderEditor: boolean;
  moveItemUp: (index: number) => void;
  moveItemDown: (index: number) => void;
  moveItemToPosition: (index: number, newPosition: number) => void;
  itemLayouts: {[key: number]: 1|2|3|4|8};
  setItemLayout: (index: number, layout: 1|2|3|4|8) => void;
  clearItemLayout: (index: number) => void;
  itemBarcodeTypes: {[key: number]: "EAN-13" | "QR Code" | "None"};
  setItemBarcodeType: (index: number, barcodeType: "EAN-13" | "QR Code" | "None") => void;
  clearItemBarcodeType: (index: number) => void;
  hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
  generateProductUrl: (handle: string) => string;
}) {
  // Note: hyperlinkToggle is used indirectly through generateProductUrl which is already bound to it
  void hyperlinkToggle; // Explicitly mark as intentionally unused here
  const [positionInputs, setPositionInputs] = useState<{[key: number]: string}>({});
  
  // Convert layout to LayoutType format
  const layoutType = typeof layout === 'number' ? `${layout}-up` as const : layout;
  
  // Get the handler for the current layout
  const layoutHandler = layoutRegistry.getHandler(layoutType);
  
  if (layoutHandler) {
    // Use handler system for supported layouts
    return (
      <div style={{ marginTop: 24 }}>
        {items.map((it, i) => (
          <div key={i} style={{ 
            border: showOrderEditor ? "2px solid #667eea" : "none", 
            borderRadius: showOrderEditor ? 12 : 0, 
            padding: showOrderEditor ? 12 : 0, 
            background: showOrderEditor ? "white" : "transparent",
            boxShadow: showOrderEditor ? "0 4px 20px rgba(102, 126, 234, 0.2)" : "none",
            transition: "all 0.2s ease",
            position: "relative",
            marginBottom: showOrderEditor ? 16 : 0
          }}>
            {layoutHandler.createPreview(it, i, generateProductUrl)}
            
            {showOrderEditor && (
              <div style={{ 
                marginTop: 12,
                padding: 12,
                background: "#F8F9FA",
                borderRadius: 8,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8, paddingRight: 8, borderRight: "1px solid #DEE2E6" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#495057" }}>
                    Position: {i + 1}
                  </span>
                  {itemLayouts[i] && (
                    <span style={{ fontSize: 11, color: "#667eea", fontWeight: 600 }}>
                      (Custom: {itemLayouts[i]}-up)
                    </span>
                  )}
                </div>
                
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => moveItemUp(i)}
                    disabled={i === 0}
                    style={{
                      background: i === 0 ? "#E9ECEF" : "#667eea",
                      color: i === 0 ? "#ADB5BD" : "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 12,
                      cursor: i === 0 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      transition: "all 0.2s ease"
                    }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItemDown(i)}
                    disabled={i === items.length - 1}
                    style={{
                      background: i === items.length - 1 ? "#E9ECEF" : "#667eea",
                      color: i === items.length - 1 ? "#ADB5BD" : "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 10px",
                      fontSize: 12,
                      cursor: i === items.length - 1 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      transition: "all 0.2s ease"
                    }}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#6C757D" }}>Go to:</span>
                  <input
                    type="number"
                    min="1"
                    max={items.length}
                    placeholder={`1-${items.length}`}
                    value={positionInputs[i] || ""}
                    onChange={(e) => setPositionInputs({ ...positionInputs, [i]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newPos = parseInt(positionInputs[i]);
                        if (newPos >= 1 && newPos <= items.length) {
                          moveItemToPosition(i, newPos - 1);
                          setPositionInputs({ ...positionInputs, [i]: "" });
                        }
                      }
                    }}
                    style={{
                      width: 50,
                      padding: "4px 8px",
                      border: "1px solid #DEE2E6",
                      borderRadius: 4,
                      fontSize: 12,
                      textAlign: "center"
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #DEE2E6" }}>
                  <span style={{ fontSize: 11, color: "#6C757D" }}>Layout:</span>
                  {[1,2,3,4,8].map(n => (
                    <button
                      key={n}
                      onClick={() => itemLayouts[i] === n ? clearItemLayout(i) : setItemLayout(i, n as 1|2|3|4|8)}
                      style={{
                        background: itemLayouts[i] === n ? "#667eea" : "white",
                        color: itemLayouts[i] === n ? "white" : "#667eea",
                        border: "1px solid #667eea",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 600,
                        transition: "all 0.2s ease"
                      }}
                      title={`Set ${n}-up layout for this item`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #DEE2E6" }}>
                  <span style={{ fontSize: 11, color: "#6C757D" }}>Barcode:</span>
                  {["EAN-13", "QR Code", "None"].map(type => (
                    <button
                      key={type}
                      onClick={() => itemBarcodeTypes[i] === type ? clearItemBarcodeType(i) : setItemBarcodeType(i, type as "EAN-13" | "QR Code" | "None")}
                      style={{
                        background: itemBarcodeTypes[i] === type ? "#28A745" : "white",
                        color: itemBarcodeTypes[i] === type ? "white" : "#28A745",
                        border: "1px solid #28A745",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 10,
                        cursor: "pointer",
                        fontWeight: 600,
                        transition: "all 0.2s ease"
                      }}
                      title={`Set ${type} for this item`}
                    >
                      {type === "EAN-13" ? "EAN" : type === "QR Code" ? "QR" : "None"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
  
  // Fallback to legacy grid layout for numeric layouts (should not be reached now)
  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr 1fr", 
      gap: 20,
      marginTop: 24
    }}>
      {items.map((it, i) => (
        <div key={i} style={{ 
          border: showOrderEditor ? "2px solid #667eea" : "2px solid #E9ECEF", 
          borderRadius: 12, 
          padding: 12, 
          display: "flex", 
          gap: 12,
          background: "white",
          boxShadow: showOrderEditor ? "0 4px 20px rgba(102, 126, 234, 0.2)" : "0 2px 8px rgba(0,0,0,0.05)",
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
              src={it.imageUrl || "https://via.placeholder.com/80x120?text=No+Image"} 
              alt={it.title}
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
          {it.price && (
            <div style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600
            }}>
              ${it.price}
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
                href={generateProductUrl(it.handle)}
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
                {it.title}
              </a>
              {it.subtitle && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#7F8C8D",
                  fontStyle: "italic",
                  lineHeight: 1.2,
                  marginBottom: 2
                }}>
                  {it.subtitle}
                </div>
              )}
              {it.author && (
                <div style={{ 
                  fontSize: 11, 
                  color: "#667eea",
                  fontWeight: 600,
                  marginBottom: 4
                }}>
                  👤 {it.author}
                </div>
              )}
              
              <div style={{ 
                fontSize: 10, 
                color: "#6C757D",
                lineHeight: 1.2,
                marginBottom: 2
              }}>
              {[it.binding, it.pages && `${it.pages} pages`, it.dimensions].filter(Boolean).join(" • ")}
              </div>
              {it.imprint && (
                <div style={{ 
                  fontSize: 10, 
                  color: "#6C757D",
                  marginBottom: 1
                }}>
                  🏢 {it.imprint}
                </div>
              )}
              {it.releaseDate && (() => {
                const { formattedDate, badgeType } = formatDateAndBadge(it.releaseDate);
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
                        border: "2px solid red"
                      }}>
                        {badgeType}
                      </span>
                    )}
                    {it.icauth && (
                      <span style={{
                        fontSize: 8,
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        backgroundColor: "#FFD700",
                        color: "black"
                      }}>
                        AUS-{it.icauth}
                      </span>
                    )}
                  </div>
                );
              })()}
              {it.price && (
                <div style={{ 
                  fontSize: 12, 
                  color: "#D63384",
                  fontWeight: 600,
                  marginTop: 4
                }}>
                  ${it.price}
                </div>
              )}
              <div style={{ 
                fontSize: 8, 
                color: "#ADB5BD", 
                fontFamily: "monospace",
                marginTop: 4
              }}>
                {it.handle}
              </div>
            
            {showOrderEditor && (
              <div style={{ 
                marginTop: 12,
                padding: 12,
                background: "#F8F9FA",
                borderRadius: 8,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8, paddingRight: 8, borderRight: "1px solid #DEE2E6" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#495057" }}>
                    Position: {i + 1}
                  </span>
                  {itemLayouts[i] && (
                    <span style={{ 
                      fontSize: 10, 
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 600
                    }}>
                      {itemLayouts[i]}-up
                    </span>
                  )}
                </div>
                <button
                  onClick={() => moveItemUp(i)}
                  disabled={i === 0}
                  style={{
                    border: "none",
                    background: i === 0 ? "#E9ECEF" : "#667eea",
                    color: i === 0 ? "#ADB5BD" : "white",
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: i === 0 ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  ↑
                </button>
                <button
                  onClick={() => moveItemDown(i)}
                  disabled={i === items.length - 1}
                  style={{
                    border: "none",
                    background: i === items.length - 1 ? "#E9ECEF" : "#667eea",
                    color: i === items.length - 1 ? "#ADB5BD" : "white",
                    padding: "6px 10px",
                    borderRadius: 6,
                    cursor: i === items.length - 1 ? "not-allowed" : "pointer",
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  ↓
                </button>
                <span style={{ fontSize: 11, color: "#6C757D" }}>Move to:</span>
                <input
                  type="number"
                  min="1"
                  max={items.length}
                  placeholder="#"
                  value={positionInputs[i] || ""}
                  onChange={(e) => setPositionInputs({...positionInputs, [i]: e.target.value})}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const newPos = parseInt(positionInputs[i]);
                      if (newPos) {
                        moveItemToPosition(i, newPos);
                        setPositionInputs({...positionInputs, [i]: ""});
                      }
                    }
                  }}
                  style={{
                    width: 50,
                    padding: "6px 8px",
                    border: "1px solid #E9ECEF",
                    borderRadius: 6,
                    fontSize: 12,
                    textAlign: "center"
                  }}
                />
                <button
                  onClick={() => {
                    const newPos = parseInt(positionInputs[i]);
                    if (newPos) {
                      moveItemToPosition(i, newPos);
                      setPositionInputs({...positionInputs, [i]: ""});
                    }
                  }}
                  style={{
                    border: "none",
                    background: "#667eea",
                    color: "white",
                    padding: "6px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600
                  }}
                >
                  Go
                </button>
                
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #DEE2E6" }}>
                  <span style={{ fontSize: 11, color: "#6C757D", fontWeight: 600 }}>Layout:</span>
                  {[1, 2, 3, 4, 8].map(l => (
                    <button
                      key={l}
                      onClick={() => setItemLayout(i, l as 1|2|3|4|8)}
                      style={{
                        border: "1px solid",
                        borderColor: itemLayouts[i] === l ? "#667eea" : "#E9ECEF",
                        background: itemLayouts[i] === l ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white",
                        color: itemLayouts[i] === l ? "white" : "#495057",
                        padding: "4px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600
                      }}
                    >
                      {l}
                    </button>
                  ))}
                  {itemLayouts[i] && (
                    <button
                      onClick={() => clearItemLayout(i)}
                      style={{
                        border: "none",
                        background: "#E9ECEF",
                        color: "#6C757D",
                        padding: "4px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #DEE2E6" }}>
                  <span style={{ fontSize: 11, color: "#6C757D", fontWeight: "600" }}>Barcode:</span>
                  {["EAN-13", "QR Code", "None"].map(type => (
                  <button
                      key={type}
                      onClick={() => setItemBarcodeType(i, type as "EAN-13" | "QR Code" | "None")}
                    style={{
                      border: "1px solid",
                        borderColor: itemBarcodeTypes[i] === type ? "#28A745" : "#E9ECEF",
                        background: itemBarcodeTypes[i] === type ? "#28A745" : "white",
                        color: itemBarcodeTypes[i] === type ? "white" : "#495057",
                      padding: "4px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 600
                    }}
                  >
                      {type === "EAN-13" ? "EAN" : type === "QR Code" ? "QR" : "None"}
                  </button>
                  ))}
                  {itemBarcodeTypes[i] && itemBarcodeTypes[i] !== "None" && (
                    <button
                      onClick={() => clearItemBarcodeType(i)}
                      style={{
                        border: "none",
                        background: "#E9ECEF",
                        color: "#6C757D",
                        padding: "4px 8px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
