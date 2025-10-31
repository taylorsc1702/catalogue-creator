// pages/index.tsx
import { useMemo, useState, useEffect } from "react";
import Image from 'next/image';
import { layoutRegistry } from '@/lib/layout-registry';
import { getItemTruncations, type LayoutType } from '@/utils/truncation-detector';

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
  const [layout, setLayout] = useState<1|'1L'|2|'2-int'|3|4|8|'list'|'compact-list'|'table'>(4);
  const [barcodeType, setBarcodeType] = useState<"EAN-13" | "QR Code" | "None">("QR Code");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [serverQuery, setServerQuery] = useState<string>(""); // <— NEW: shows the query used by API
  const [useHandleList, setUseHandleList] = useState(false);
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [itemLayouts, setItemLayouts] = useState<{[key: number]: 1|'1L'|2|'2-int'|3|4|8}>({});
  const [itemBarcodeTypes, setItemBarcodeTypes] = useState<{[key: number]: "EAN-13" | "QR Code" | "None"}>({});
  const [itemAuthorBioToggle, setItemAuthorBioToggle] = useState<{[key: number]: boolean}>({});
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

  // Cover system state
  const [showFrontCover, setShowFrontCover] = useState(false);
  const [showBackCover, setShowBackCover] = useState(false);
  const [frontCoverText1, setFrontCoverText1] = useState("");
  const [frontCoverText2, setFrontCoverText2] = useState("");
  const [backCoverText1, setBackCoverText1] = useState("");
  const [backCoverText2, setBackCoverText2] = useState("");
  const [coverImageUrls, setCoverImageUrls] = useState<string[]>(["", "", "", ""]);
  const [coverCatalogueName, setCoverCatalogueName] = useState("");

  // Email state
  const [emailGenerating, setEmailGenerating] = useState(false);
  // Append view for mixed exports
  const [appendView, setAppendView] = useState<'none'|'list'|'compact-list'|'table'>('none');
  // Preview & page reordering modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  type PageGroup = number[] | 'APPEND';
  const [pageGroups, setPageGroups] = useState<PageGroup[]>([]);
  const [reorderedPageGroups, setReorderedPageGroups] = useState<PageGroup[]>([]);
  const [appendInsertIndex, setAppendInsertIndex] = useState<number | null>(null);

  // Truncation detection and editing
  const [editedContent, setEditedContent] = useState<{[key: number]: {description?: string; authorBio?: string}}>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'description' | 'authorBio' | null>(null);
  const [isMixedView, setIsMixedView] = useState(false);

  // Get items with edited content applied
  const getItemsWithEdits = (): Item[] => {
    return items.map((item, index) => {
      const edits = editedContent[index];
      if (!edits) return item;
      return {
        ...item,
        description: edits.description !== undefined ? edits.description : item.description,
        authorBio: edits.authorBio !== undefined ? edits.authorBio : item.authorBio
      };
    });
  };

  // Open edit modal for a specific item and field
  function openEditModal(itemIndex: number, field: 'description' | 'authorBio') {
    setEditingItemIndex(itemIndex);
    setEditingField(field);
    setEditModalOpen(true);
  }

  // Close edit modal
  function closeEditModal() {
    setEditModalOpen(false);
    setEditingItemIndex(null);
    setEditingField(null);
  }

  // Save edited content
  function saveEditedContent(newText: string) {
    if (editingItemIndex === null || editingField === null) return;
    
    setEditedContent(prev => ({
      ...prev,
      [editingItemIndex]: {
        ...prev[editingItemIndex],
        [editingField]: newText
      }
    }));
    
    closeEditModal();
  }

  // Revert edited content to original
  function revertEditedContent(itemIndex: number, field: 'description' | 'authorBio') {
    setEditedContent(prev => {
      const updated = { ...prev };
      if (updated[itemIndex]) {
        const newContent = { ...updated[itemIndex] };
        delete newContent[field];
        if (Object.keys(newContent).length === 0) {
          delete updated[itemIndex];
        } else {
          updated[itemIndex] = newContent;
        }
      }
      return updated;
    });
  }

  // Logo URLs for different brands
  const getLogoUrl = (brand: string): string => {
    const logos = {
      woodslane: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/woodslane-square-logo-transparent_a9785ae1-b798-4ab4-963d-89a4fc3f3fdb.png?v=1755213158',
      woodslanehealth: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/WoodslaneHealth-logo-square_50093948-c033-48aa-8274-694237479a8a.jpg?v=1761655710',
      woodslaneeducation: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/WoodslaneEducation-logos-square_60e40eef-f666-4f6a-a8e0-f07efca5a9dd.jpg?v=1761655806',
      woodslanepress: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/woodslane_PRESS_logo_duo_1.jpg?v=1718778690'
    };
    return logos[brand as keyof typeof logos] || logos.woodslane;
  };

  // Suppress unused variable warning
  void getLogoUrl;

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
      const lines = handleList.split('\n').map(h => h.trim()).filter(Boolean);
      const handles = lines.map(line => {
        const parts = line.split(',');
        return parts[0].trim(); // Just the ISBN/handle part
      });
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
      let parsedHandles: string[] = [];
      const layoutMap: {[handle: string]: 1|'1L'|2|'2-int'|3|4|8} = {};
      
      if (useHandleList && handleList.trim()) {
        const lines = handleList.trim().split('\n').map(h => h.trim()).filter(Boolean);
        parsedHandles = lines.map(line => {
          const parts = line.split(',');
          const handle = parts[0].trim();
          // Check if format is specified
          if (parts.length > 1) {
            const formatStr = parts[1].trim();
            // Map format number to layout type
            // 1 = 1-up, 1L = 1L, 2 = 2-up, '2-int' = 2-int, 3 = 3-up, 4 = 4-up, 8 = 8-up
            if (formatStr === '1') layoutMap[handle] = 1;
            else if (formatStr === '1L' || formatStr === '1l') layoutMap[handle] = '1L';
            else if (formatStr === '2') layoutMap[handle] = 2;
            else if (formatStr === '2-int' || formatStr === '2int') layoutMap[handle] = '2-int';
            else if (formatStr === '3') layoutMap[handle] = 3;
            else if (formatStr === '4') layoutMap[handle] = 4;
            else if (formatStr === '8') layoutMap[handle] = 8;
          }
          return handle;
        });
      }
      
      const requestBody = useHandleList && handleList.trim() 
        ? { handleList: parsedHandles }
        : { tag, vendor, collectionId, publishingStatus };
        
      const resp = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data: ProductsResponse & { error?: string } = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed");

      const fetchedItems = data.items || [];
      setItems(fetchedItems);
      setServerQuery(data.query || ""); // <— NEW: capture the server-side query
      
      // Apply layout assignments from ISBN,format format
      if (Object.keys(layoutMap).length > 0) {
        const newItemLayouts: {[key: number]: 1|'1L'|2|'2-int'|3|4|8} = {};
        fetchedItems.forEach((item, index) => {
          if (layoutMap[item.handle]) {
            newItemLayouts[index] = layoutMap[item.handle];
          }
        });
        setItemLayouts(newItemLayouts);
      }
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
          showFields: { authorBio: layout === 1 || layout === '1L' }, 
          hyperlinkToggle,
          itemBarcodeTypes,
          barcodeType,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
          coverData: {
            showFrontCover,
            showBackCover,
            frontCoverText1,
            frontCoverText2,
            backCoverText1,
            backCoverText2,
            coverImageUrls,
            catalogueName: coverCatalogueName || catalogueName
          }
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
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
          coverData: {
            showFrontCover,
            showBackCover,
            frontCoverText1,
            frontCoverText2,
            backCoverText1,
            backCoverText2,
            coverImageUrls,
            catalogueName: coverCatalogueName || catalogueName
          }
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
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
          coverData: {
            showFrontCover,
            showBackCover,
            frontCoverText1,
            frontCoverText2,
            backCoverText1,
            backCoverText2,
            coverImageUrls,
            catalogueName: coverCatalogueName || catalogueName
          }
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

  async function openGoogleAppsScriptMixed() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      // Create layout assignments array
      const layoutAssignments = items.map((_, i) => itemLayouts[i] || layout);
      
      const resp = await fetch("/api/render/googledocs-apps-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items, 
          layoutAssignments, // Pass mixed layouts
          title: catalogueName || `Catalogue - Mixed Layout - ${new Date().toLocaleDateString()}`,
          showFields: { authorBio: true },
          hyperlinkToggle,
          itemBarcodeTypes,
          barcodeType,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
          coverData: {
            showFrontCover,
            showBackCover,
            frontCoverText1,
            frontCoverText2,
            backCoverText1,
            backCoverText2,
            coverImageUrls,
            catalogueName: coverCatalogueName || catalogueName
          }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error creating Google Doc: ${error}`);
        return;
      }
      
      const result = await resp.json();
      
      // Handle the new pass-through response format
      if (result.gasSuccess && result.body?.success) {
        const gasResult = result.body;
        
        // Open the Google Doc in a new tab
        window.open(gasResult.documentUrl, '_blank');
        
        // Show success message with clickable link
        const successMessage = document.createElement('div');
        successMessage.innerHTML = `
          <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #28a745;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 500px;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="color: #28a745; font-size: 24px; margin-bottom: 15px;">✅</div>
            <h3 style="color: #28a745; margin: 0 0 15px 0; font-size: 18px;">Google Doc Created Successfully!</h3>
            <p style="margin: 0 0 10px 0; color: #333;">📄 <strong>${gasResult.documentName}</strong></p>
            <p style="margin: 0 0 15px 0; color: #666;">Your mixed layout catalogue has been created with perfect formatting!</p>
            <a href="${gasResult.documentUrl}" target="_blank" style="
              display: inline-block;
              background: #007bff;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              font-weight: bold;
              margin: 10px 5px;
            ">📖 Open Google Doc</a>
            <button id="closeModalBtnMixed" style="
              background: #6c757d;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              font-weight: bold;
              margin: 10px 5px;
              cursor: pointer;
            ">Close</button>
          </div>
        `;
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 9999;
        `;
        
        const closeModal = () => {
          try {
            if (overlay.parentNode) document.body.removeChild(overlay);
            if (successMessage.parentNode) document.body.removeChild(successMessage);
          } catch (e) {
            console.error('Error closing modal:', e);
          }
        };
        
        overlay.onclick = closeModal;
        
        document.body.appendChild(overlay);
        document.body.appendChild(successMessage);
        
        // Add event listener to close button
        const closeBtn = document.getElementById('closeModalBtnMixed');
        if (closeBtn) closeBtn.onclick = closeModal;
        
      } else {
        // Handle error from Google Apps Script
        const errorMessage = result.body?.error || result.error || 'Unknown error';
        alert(`❌ Error creating Google Doc: ${errorMessage}\n\nGAS Status: ${result.status}\nResponse: ${JSON.stringify(result.body)}`);
      }
    } catch (error) {
      alert("Error creating Google Doc: " + (error instanceof Error ? error.message : "Unknown error"));
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
          showFields: { authorBio: layout === 1 || layout === '1L' },
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
          
          // Handle the new pass-through response format
          if (result.gasSuccess && result.body?.success) {
            const gasResult = result.body;
            
            // Open the Google Doc in a new tab
            window.open(gasResult.documentUrl, '_blank');
            
            // Show success message with clickable link
            const successMessage = document.createElement('div');
        successMessage.innerHTML = `
          <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #28a745;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 500px;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <div style="color: #28a745; font-size: 24px; margin-bottom: 15px;">✅</div>
            <h3 style="color: #28a745; margin: 0 0 15px 0; font-size: 18px;">Google Doc Created Successfully!</h3>
                 <p style="margin: 0 0 10px 0; color: #333;">📄 <strong>${gasResult.documentName}</strong></p>
            <p style="margin: 0 0 15px 0; color: #666;">Your catalogue has been created with perfect formatting!</p>
            <a href="${gasResult.documentUrl}" target="_blank" style="
              display: inline-block;
              background: #007bff;
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 5px;
              font-weight: bold;
              margin: 10px 5px;
            ">📖 Open Google Doc</a>
            <button id="closeModalBtn" style="
              background: #6c757d;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              font-weight: bold;
              margin: 10px 5px;
              cursor: pointer;
            ">Close</button>
          </div>
        `;
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 9999;
        `;
        
        const closeModal = () => {
          try {
            if (overlay.parentNode) document.body.removeChild(overlay);
            if (successMessage.parentNode) document.body.removeChild(successMessage);
          } catch (e) {
            console.error('Error closing modal:', e);
          }
        };
        
        overlay.onclick = closeModal;
        
        document.body.appendChild(overlay);
        document.body.appendChild(successMessage);
        
        // Add event listener to close button
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) closeBtn.onclick = closeModal;
        
          } else {
            // Handle error from Google Apps Script
            const errorMessage = result.body?.error || result.error || 'Unknown error';
            alert(`❌ Error creating Google Doc: ${errorMessage}\n\nGAS Status: ${result.status}\nResponse: ${JSON.stringify(result.body)}`);
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

  async function openTableView() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      const resp = await fetch("/api/render/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items,
          layout: 'table',
          title: catalogueName || `Catalogue - ${new Date().toLocaleDateString()}`,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          hyperlinkToggle,
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error generating table view: ${error}`);
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
        a.download = `catalogue-table-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Popup blocked. HTML file downloaded instead.");
      }
    } catch (error) {
      alert("Error generating table view: " + (error instanceof Error ? error.message : "Unknown error"));
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

  function setItemLayout(index: number, layout: 1|'1L'|2|'2-int'|3|4|8) {
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

  function setItemAuthorBioEnabled(index: number, enabled: boolean) {
    setItemAuthorBioToggle(prev => ({...prev, [index]: enabled}));
  }

  function clearItemAuthorBioToggle(index: number) {
    const newToggles = {...itemAuthorBioToggle};
    delete newToggles[index];
    setItemAuthorBioToggle(newToggles);
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
    setIsMixedView(true);
    try {
      // Use edited items if available
      const itemsToUse = getItemsWithEdits();
      // Create layout assignments array
      const layoutAssignments = itemsToUse.map((_, i) => itemLayouts[i] || layout);
      
      const resp = await fetch("/api/render/mixed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items: itemsToUse,
          layoutAssignments,
          showFields: { authorBio: true },
          hyperlinkToggle,
          itemBarcodeTypes,
          barcodeType,
          bannerColor: getBannerColor(hyperlinkToggle),
          websiteName: getWebsiteName(hyperlinkToggle),
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
          appendView,
          appendInsertIndex,
          coverData: {
            showFrontCover,
            showBackCover,
            frontCoverText1,
            frontCoverText2,
            backCoverText1,
            backCoverText2,
            coverImageUrls,
            catalogueName: coverCatalogueName || catalogueName
          }
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

  // Compute page groups based on current per-item layout assignments
  function computePageGroups(currentItems: Item[], currentItemLayouts: {[key:number]: 1|'1L'|2|'2-int'|3|4|8}): PageGroup[] {
    const groups: PageGroup[] = [];
    if (!currentItems.length) return groups;
    const layoutAssignments = currentItems.map((_, i) => currentItemLayouts[i] || layout);
    let current: number[] = [];
    let currentLayout = layoutAssignments[0];
    let capacity = currentLayout === '2-int' ? 2 : (currentLayout === '1L' ? 1 : (typeof currentLayout === 'number' ? currentLayout : 1));
    for (let i = 0; i < currentItems.length; i++) {
      const assigned = layoutAssignments[i];
      const assignedCapacity = assigned === '2-int' ? 2 : (assigned === '1L' ? 1 : (typeof assigned === 'number' ? assigned : 1));
      if (current.length === 0) {
        currentLayout = assigned;
        capacity = assignedCapacity;
      }
      if (assigned !== currentLayout || current.length >= capacity) {
        if (current.length) groups.push(current);
        current = [i];
        currentLayout = assigned;
        capacity = assignedCapacity;
      } else {
        current.push(i);
      }
    }
    if (current.length) groups.push(current);
    // If an appended view is selected, add a synthetic APPEND page at the end
    if (appendView !== 'none') groups.push('APPEND');
    return groups;
  }

  function openPreviewAndReorder() {
    const groups = computePageGroups(items, itemLayouts);
    setPageGroups(groups);
    setReorderedPageGroups(groups);
    setIsMixedView(true); // Enable truncation detection in preview modal
    setShowPreviewModal(true);
  }

  function movePage(upIndex: number, direction: -1 | 1) {
    setReorderedPageGroups(prev => {
      const idx = upIndex;
      const to = idx + direction;
      if (to < 0 || to >= prev.length) return prev;
      const copy = prev.map(pg => (pg === 'APPEND' ? 'APPEND' : [...pg] as PageGroup));
      const [moved] = copy.splice(idx, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function applyPageOrder() {
    // Flatten new order to a list of old indices
    const flatOldIndices = reorderedPageGroups.filter(g => g !== 'APPEND').flat() as number[];
    // Rebuild items
    const newItems = flatOldIndices.map(i => items[i]);
    // Rebuild per-index maps
    const newItemLayouts: {[key:number]: 1|'1L'|2|'2-int'|3|4|8} = {};
    const newItemBarcodeTypes: {[key:number]: "EAN-13"|"QR Code"|"None"} = {};
    const newItemAuthorBioToggle: {[key:number]: boolean} = {};
    flatOldIndices.forEach((oldIdx, newIdx) => {
      if (itemLayouts[oldIdx] !== undefined) newItemLayouts[newIdx] = itemLayouts[oldIdx];
      if (itemBarcodeTypes[oldIdx] !== undefined) newItemBarcodeTypes[newIdx] = itemBarcodeTypes[oldIdx];
      if (itemAuthorBioToggle[oldIdx] !== undefined) newItemAuthorBioToggle[newIdx] = itemAuthorBioToggle[oldIdx];
    });
    setItems(newItems);
    setItemLayouts(newItemLayouts);
    setItemBarcodeTypes(newItemBarcodeTypes);
    setItemAuthorBioToggle(newItemAuthorBioToggle);
    // Update append insertion index
    const idx = reorderedPageGroups.findIndex(g => g === 'APPEND');
    setAppendInsertIndex(idx >= 0 ? idx : null);
    setShowPreviewModal(false);
  }

  async function generatePDF(type: 'mixed' | 'single'): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        // Create a hidden iframe to load the HTML and generate PDF
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '-9999px';
        iframe.style.width = '210mm';
        iframe.style.height = '297mm';
        document.body.appendChild(iframe);

        // Load HTML content
        const loadHtml = async () => {
          let htmlUrl = '';
          if (type === 'mixed') {
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
                utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
                appendView,
                appendInsertIndex,
                coverData: {
                  showFrontCover,
                  showBackCover,
                  frontCoverText1,
                  frontCoverText2,
                  backCoverText1,
                  backCoverText2,
                  coverImageUrls,
                  catalogueName: coverCatalogueName || catalogueName
                }
              })
            });
            const html = await resp.text();
            const blob = new Blob([html], { type: 'text/html' });
            htmlUrl = URL.createObjectURL(blob);
          } else {
            const resp = await fetch("/api/render/html", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                items,
                layout,
                showFields: { authorBio: layout === 1 || layout === '1L' },
                hyperlinkToggle,
                itemBarcodeTypes,
                barcodeType,
                bannerColor: getBannerColor(hyperlinkToggle),
                websiteName: getWebsiteName(hyperlinkToggle),
                utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
                coverData: {
                  showFrontCover,
                  showBackCover,
                  frontCoverText1,
                  frontCoverText2,
                  backCoverText1,
                  backCoverText2,
                  coverImageUrls,
                  catalogueName: coverCatalogueName || catalogueName
                }
              })
            });
            const html = await resp.text();
            const blob = new Blob([html], { type: 'text/html' });
            htmlUrl = URL.createObjectURL(blob);
          }

          iframe.src = htmlUrl;
          
          iframe.onload = () => {
            setTimeout(() => {
              // Use html2canvas and jsPDF to generate PDF
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
              script.onload = () => {
                const pdfScript = document.createElement('script');
                pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.3/jspdf.umd.min.js';
                pdfScript.onload = () => {
                  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                  if (!iframeDoc) {
                    reject(new Error('Could not access iframe document'));
                    return;
                  }
                  
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const html2canvasLib = (window as Record<string, any>).html2canvas;
                  if (!html2canvasLib) {
                    reject(new Error('html2canvas library not loaded'));
                    return;
                  }
                  
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const jsPDF = (window as Record<string, any>).jspdf?.jsPDF;
                  if (!jsPDF) {
                    reject(new Error('jsPDF library not loaded'));
                    return;
                  }
                  
                  const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    compress: true
                  });
                  
                  // Find all page elements (including cover pages)
                  const bodyEl = iframeDoc.body;
                  const pages = bodyEl.querySelectorAll('.page, .cover-page');
                  
                  if (pages.length === 0) {
                    reject(new Error('No pages found in HTML'));
                    return;
                  }
                  
                  // Process each page individually
                  const processPage = async (pageIndex: number): Promise<void> => {
                    if (pageIndex >= pages.length) {
                      // All pages processed
                      const pdfBase64 = pdf.output('datauristring');
                      document.body.removeChild(iframe);
                      URL.revokeObjectURL(htmlUrl);
                      resolve(pdfBase64);
                      return;
                    }
                    
                    const page = pages[pageIndex];
                    
                    try {
                      const canvas = await html2canvasLib(page, {
                        scale: 2, // Doubled for better resolution
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff',
                        removeContainer: false,
                        width: 1588, // A4 width in pixels at 192dpi (794 * 2)
                        height: 2246, // A4 height in pixels at 192dpi (1123 * 2)
                        allowTaint: true,
                        foreignObjectRendering: true,
                        imageTimeout: 15000,
                        onclone: (clonedDoc: Document) => {
                          // Add PDF generation class to body
                          clonedDoc.body.classList.add('pdf-generation');
                          
                          // Ensure all page elements have white background
                          const clonedPage = clonedDoc.querySelector('.page, .cover-page') as HTMLElement;
                          if (clonedPage) {
                            clonedPage.style.backgroundColor = '#ffffff';
                            clonedPage.style.background = '#ffffff';
                          }
                          
                          // Ensure body has white background
                          clonedDoc.body.style.backgroundColor = '#ffffff';
                          clonedDoc.body.style.background = '#ffffff';
                          
                          // Force all elements to have white background
                          const allElements = clonedDoc.querySelectorAll('*');
                          allElements.forEach(el => {
                            const htmlEl = el as HTMLElement;
                            if (htmlEl.style.backgroundColor === '#f5f5f5' || htmlEl.style.background === '#f5f5f5') {
                              htmlEl.style.backgroundColor = '#ffffff';
                              htmlEl.style.background = '#ffffff';
                            }
                          });
                        }
                      });
                      
                      // Convert to JPEG with higher quality for better resolution
                      const imgData = canvas.toDataURL('image/jpeg', 0.95);
                      
                      // Add page to PDF (except for the first page which is already created)
                      if (pageIndex > 0) {
                        pdf.addPage();
                      }
                      
                      // Add image to PDF
                      const imgWidth = 210; // A4 width in mm
                      const imgHeight = 297; // A4 height in mm
                      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'MEDIUM');
                      
                      // Process next page
                      setTimeout(() => processPage(pageIndex + 1), 100);
                      
                    } catch (error) {
                      reject(new Error(`Failed to process page ${pageIndex + 1}: ${error}`));
                    }
                  };
                  
                  // Start processing pages
                  processPage(0);
                };
                document.head.appendChild(pdfScript);
              };
              document.head.appendChild(script);
            }, 2000); // Wait for images to load
          };
        };

        loadHtml();
      } catch (error) {
        reject(error);
      }
    });
  }

  async function openEmailWithOutlook(type: 'mixed' | 'single') {
    setEmailGenerating(true);
    try {
      // Generate PDF
      const pdfBase64 = await generatePDF(type);
      
      // Convert base64 to blob
      const base64Data = pdfBase64.split(',')[1] || pdfBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create download link and trigger download
      const url = URL.createObjectURL(blob);
      const filename = `catalogue-${type}-${new Date().toISOString().split('T')[0]}.pdf`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Wait a moment for download to start
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Open mailto: link with optional subject/body hints, but no recipients
      // User can select recipients from their Outlook contacts
      const subject = encodeURIComponent(`${type === 'mixed' ? 'Mixed Layout' : 'Single Layout'} Catalogue - ${catalogueName || new Date().toLocaleDateString()}`);
      const body = encodeURIComponent(`Please find the attached ${type === 'mixed' ? 'mixed layout' : 'single layout'} product catalogue.\n\nThe PDF file "${filename}" has been downloaded to your Downloads folder. Please attach it.`);
      
      // Open mailto: link (will open default email client - Outlook)
      const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
      window.location.href = mailtoLink;
      
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Error preparing email: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setEmailGenerating(false);
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
              placeholder="9781597842204&#10;9781597842181,3&#10;9781597842198,1"
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
            💡 Paste a list of ISBNs or product handles (one per line). Optionally add format: ISBN,format (e.g., 9781914961670,1). Formats: 1=1-up, 1L=1L, 2=2-up, 2-int=2-int, 3=3-up, 4=4-up, 8=8-up
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
        <button onClick={()=>setLayout('1L')} style={btn(layout==='1L')}>1L</button>
        <button onClick={()=>setLayout('2-int')} style={btn(layout==='2-int')}>2-int</button>
        <button onClick={()=>setLayout('list')} style={btn(layout==='list')}>📋 List</button>
        <button onClick={()=>setLayout('compact-list')} style={btn(layout==='compact-list')}>📄 Compact</button>
        <button onClick={()=>setLayout('table')} style={btn(layout==='table')}>📊 Table</button>
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

      {/* Cover System Section */}
      <div style={{ marginTop: 24 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#495057", marginBottom: 16, display: "block" }}>Cover System</span>
        
        {/* Catalogue Name */}
        <div style={{ marginBottom: 20, padding: 16, border: "2px solid #E9ECEF", borderRadius: 8 }}>
          <Field label="Catalogue Name">
            <input
              type="text"
              value={coverCatalogueName}
              onChange={(e) => setCoverCatalogueName(e.target.value)}
              placeholder="Enter catalogue name (e.g., Spring 2024 Catalogue)"
              style={{ 
                width: "100%", 
                border: "2px solid #E9ECEF", 
                borderRadius: 8, 
                padding: "8px 12px", 
                fontSize: 14
              }}
            />
          </Field>
        </div>
        
        {/* Front Cover Controls */}
        <div style={{ marginBottom: 20, padding: 16, border: "2px solid #E9ECEF", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={showFrontCover}
              onChange={(e) => setShowFrontCover(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#495057" }}>Include Front Cover</span>
          </div>
          
          {showFrontCover && (
            <div style={{ marginLeft: 24 }}>
              <Field label="Front Cover Text 1">
                <textarea
                  value={frontCoverText1}
                  onChange={(e) => setFrontCoverText1(e.target.value)}
                  placeholder="Enter first text block for front cover..."
                  style={{ 
                    width: "100%", 
                    border: "2px solid #E9ECEF", 
                    borderRadius: 8, 
                    padding: "8px 12px", 
                    fontSize: 14,
                    minHeight: 60,
                    resize: "vertical"
                  }}
                />
              </Field>
              
              <Field label="Front Cover Text 2">
                <textarea
                  value={frontCoverText2}
                  onChange={(e) => setFrontCoverText2(e.target.value)}
                  placeholder="Enter second text block for front cover..."
                  style={{ 
                    width: "100%", 
                    border: "2px solid #E9ECEF", 
                    borderRadius: 8, 
                    padding: "8px 12px", 
                    fontSize: 14,
                    minHeight: 60,
                    resize: "vertical"
                  }}
                />
              </Field>
              
              <Field label="Cover Images (URLs)">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {coverImageUrls.map((url, index) => (
                    <input
                      key={index}
                      type="url"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...coverImageUrls];
                        newUrls[index] = e.target.value;
                        setCoverImageUrls(newUrls);
                      }}
                      placeholder={`Image URL ${index + 1}`}
                      style={{ 
                        border: "2px solid #E9ECEF", 
                        borderRadius: 8, 
                        padding: "8px 12px", 
                        fontSize: 14
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                  Add 1-4 image URLs. Layout will automatically adjust based on number of images.
                </div>
              </Field>
            </div>
          )}
        </div>

        {/* Back Cover Controls */}
        <div style={{ marginBottom: 20, padding: 16, border: "2px solid #E9ECEF", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={showBackCover}
              onChange={(e) => setShowBackCover(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#495057" }}>Include Back Cover</span>
          </div>
          
          {showBackCover && (
            <div style={{ marginLeft: 24 }}>
              <Field label="Back Cover Text 1">
                <textarea
                  value={backCoverText1}
                  onChange={(e) => setBackCoverText1(e.target.value)}
                  placeholder="Enter first text block for back cover..."
                  style={{ 
                    width: "100%", 
                    border: "2px solid #E9ECEF", 
                    borderRadius: 8, 
                    padding: "8px 12px", 
                    fontSize: 14,
                    minHeight: 60,
                    resize: "vertical"
                  }}
                />
              </Field>
              
              <Field label="Back Cover Text 2">
                <textarea
                  value={backCoverText2}
                  onChange={(e) => setBackCoverText2(e.target.value)}
                  placeholder="Enter second text block for back cover..."
                  style={{ 
                    width: "100%", 
                    border: "2px solid #E9ECEF", 
                    borderRadius: 8, 
                    padding: "8px 12px", 
                    fontSize: 14,
                    minHeight: 60,
                    resize: "vertical"
                  }}
                />
              </Field>
            </div>
          )}
        </div>
      </div>

      {/* Cover Preview Section */}
      {(showFrontCover || showBackCover) && (
        <div style={{ marginTop: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#495057", marginBottom: 16, display: "block" }}>Cover Preview</span>
          <div style={{ padding: 16, border: "2px solid #E9ECEF", borderRadius: 8, background: "#F8F9FA" }}>
            <div style={{ fontSize: 14, color: "#6C757D", marginBottom: 12 }}>
              Covers will be included in HTML export. Preview shows layout structure.
            </div>
            
            {showFrontCover && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#495057", marginBottom: 8 }}>Front Cover:</div>
                <div style={{ 
                  border: "1px solid #ddd", 
                  borderRadius: 8, 
                  padding: 16, 
                  background: "white",
                  minHeight: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 12, color: "#666" }}>Logo</div>
                    <div style={{ flex: 1, marginLeft: 16 }}>
                      {frontCoverText1 && <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{frontCoverText1}</div>}
                      {frontCoverText2 && <div style={{ fontSize: 14 }}>{frontCoverText2}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 20, fontWeight: "bold" }}>
                    {coverCatalogueName || catalogueName || "Product Catalogue"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 200, margin: "0 auto" }}>
                    {coverImageUrls.filter(url => url.trim()).map((url, index) => (
                      <div key={index} style={{ 
                        height: 60, 
                        border: "1px dashed #ccc", 
                        borderRadius: 4, 
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#666",
                        background: "#f9f9f9"
                      }}>
                        <img 
                          src={url} 
                          alt={`Cover ${index + 1}`}
                          style={{ 
                            maxWidth: "100%", 
                            maxHeight: "100%", 
                            objectFit: "contain" 
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'block';
                            }
                          }}
                        />
                        <span style={{ display: 'none' }}>Image {index + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center" }}>
                    Footer with contact info
                  </div>
                </div>
              </div>
            )}
            
            {showBackCover && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#495057", marginBottom: 8 }}>Back Cover:</div>
                <div style={{ 
                  border: "1px solid #ddd", 
                  borderRadius: 8, 
                  padding: 16, 
                  background: "white",
                  minHeight: 200,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 12, color: "#666" }}>Logo</div>
                    <div style={{ flex: 1, marginLeft: 16 }}>
                      {backCoverText1 && <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{backCoverText1}</div>}
                      {backCoverText2 && <div style={{ fontSize: 14 }}>{backCoverText2}</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 20, fontWeight: "bold" }}>
                    {coverCatalogueName || catalogueName || "Product Catalogue"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 200, margin: "0 auto" }}>
                    {coverImageUrls.filter(url => url.trim()).map((url, index) => (
                      <div key={index} style={{ 
                        height: 60, 
                        border: "1px dashed #ccc", 
                        borderRadius: 4, 
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#666",
                        background: "#f9f9f9"
                      }}>
                        <img 
                          src={url} 
                          alt={`Cover ${index + 1}`}
                          style={{ 
                            maxWidth: "100%", 
                            maxHeight: "100%", 
                            objectFit: "contain" 
                          }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) {
                              nextElement.style.display = 'block';
                            }
                          }}
                        />
                        <span style={{ display: 'none' }}>Image {index + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "#666", textAlign: "center" }}>
                    Footer with contact info
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
            <button onClick={openTableView} disabled={!items.length} style={btn()}>📊 Table View</button>
            <button onClick={() => openEmailWithOutlook('single')} disabled={!items.length || emailGenerating} style={btn()}>
              {emailGenerating ? '⏳ Generating PDF...' : '📧 Outlook - PDF'}
            </button>
          </div>


          {items.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#495057', fontWeight: 600 }}>Append view</span>
                <select
                  value={appendView}
                  onChange={(e) => setAppendView(e.target.value as 'none'|'list'|'compact-list'|'table')}
                  style={{
                    border: '2px solid #E9ECEF',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: 13,
                    background: '#FAFBFC'
                  }}
                >
                  <option value="none">None</option>
                  <option value="list">List</option>
                  <option value="compact-list">Compact list</option>
                  <option value="table">Table</option>
                </select>
              </label>
              <button 
                onClick={() => setShowOrderEditor(!showOrderEditor)} 
                style={btn(showOrderEditor)}
              >
                {showOrderEditor ? '✓ Reordering Mode' : '🔀 Reorder Items'}
              </button>
              <button onClick={openMixedLayout} disabled={!items.length} style={btn()}>
                🎨 Mixed Layout View
              </button>
              <button onClick={openPreviewAndReorder} disabled={!items.length} style={btn()}>
                🧩 Preview & Reorder Pages
              </button>
              <button onClick={openPreviewAndReorder} disabled={!items.length} style={btn()}>
                🧩 Preview & Reorder Pages
              </button>
              <button onClick={openGoogleAppsScriptMixed} disabled={!items.length} style={btn()}>
                🚀 Mixed Google Doc
              </button>
              <button onClick={() => openEmailWithOutlook('mixed')} disabled={!items.length || emailGenerating} style={btn()}>
                {emailGenerating ? '⏳ Generating PDF...' : '📧 Outlook - Mixed Layout (PDF)'}
              </button>
              {showOrderEditor && (
                <span style={{ fontSize: 13, color: '#656F91' }}>
                  💡 Use arrows to reorder items, assign layouts, or enter position numbers
                </span>
              )}
            </div>
          )}


      <hr style={{ margin: "32px 0", border: "none", height: "2px", background: "linear-gradient(90deg, transparent, #E9ECEF, transparent)" }} />
      <Preview items={items} layout={layout} showOrderEditor={showOrderEditor} moveItemUp={moveItemUp} moveItemDown={moveItemDown} moveItemToPosition={moveItemToPosition} itemLayouts={itemLayouts} setItemLayout={setItemLayout} clearItemLayout={clearItemLayout} itemBarcodeTypes={itemBarcodeTypes} setItemBarcodeType={setItemBarcodeType} clearItemBarcodeType={clearItemBarcodeType} itemAuthorBioToggle={itemAuthorBioToggle} setItemAuthorBioToggle={setItemAuthorBioEnabled} clearItemAuthorBioToggle={clearItemAuthorBioToggle} hyperlinkToggle={hyperlinkToggle} generateProductUrl={generateProductUrl} isMixedView={isMixedView} openEditModal={openEditModal} />
      
      {/* Edit Modal */}
      {editModalOpen && editingItemIndex !== null && editingField !== null && <EditModal 
        item={items[editingItemIndex]}
        editedItem={editedContent[editingItemIndex]}
        editingField={editingField}
        itemLayout={itemLayouts[editingItemIndex] || (typeof layout === 'number' ? layout : layout === '1L' ? '1L' : 4) as 1|'1L'|2|'2-int'|3|4|8}
        isMixedView={isMixedView}
        closeModal={closeEditModal}
        saveContent={saveEditedContent}
        revertContent={revertEditedContent}
        itemIndex={editingItemIndex}
      />}
      {showPreviewModal && (
        <div style={{position:'fixed',inset:0 as unknown as number,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'#fff',borderRadius:12,padding:16,width:'90vw',maxWidth:1100,maxHeight:'85vh',overflow:'auto',boxShadow:'0 12px 32px rgba(0,0,0,0.25)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{margin:0,fontSize:18}}>Preview & Reorder Pages</h3>
              <button onClick={()=>setShowPreviewModal(false)} style={btn(false)}>Close</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',gap:12}}>
                {reorderedPageGroups.map((group, i)=>{
                  if (group === 'APPEND') {
                    return (
                      <div key={`append-${i}`} style={{border:'1px solid #E9ECEF',borderRadius:10,padding:10,background:'#fff'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <strong>Page {i+1}</strong>
                          <span style={{fontSize:12,color:'#6c757d'}}>Appended: {appendView.replace('-', ' ')}</span>
                        </div>
                        <div style={{fontSize:12,color:'#495057',marginBottom:8}}>Summary page</div>
                        <div style={{display:'flex',gap:8,marginTop:10}}>
                          <button onClick={()=>movePage(i,-1)} style={btn(false)} disabled={i===0}>↑ Move Up</button>
                          <button onClick={()=>movePage(i,1)} style={btn(false)} disabled={i===reorderedPageGroups.length-1}>↓ Move Down</button>
                        </div>
                      </div>
                    );
                  }
                  const firstIdx = group[0];
                  const lastIdx = group[group.length-1];
                  const layoutLabel = (itemLayouts[firstIdx] || layout).toString();
                  return (
                    <div key={i} style={{border:'1px solid #E9ECEF',borderRadius:10,padding:10,background:'#fff'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                        <strong>Page {i+1}</strong>
                        <span style={{fontSize:12,color:'#6c757d'}}>Layout: {layoutLabel}</span>
                      </div>
                      <div style={{fontSize:12,color:'#495057',marginBottom:8}}>Items {firstIdx+1}–{lastIdx+1}</div>
                      <ul style={{margin:0,paddingLeft:18,fontSize:12,maxHeight:120,overflow:'auto'}}>
                        {group.map(idx => (
                          <li key={idx} title={items[idx]?.title || ''}>{items[idx]?.title || '(Untitled)'}</li>
                        ))}
                      </ul>
                      <div style={{display:'flex',gap:8,marginTop:10}}>
                        <button onClick={()=>movePage(i,-1)} style={btn(false)} disabled={i===0}>↑ Move Up</button>
                        <button onClick={()=>movePage(i,1)} style={btn(false)} disabled={i===reorderedPageGroups.length-1}>↓ Move Down</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{border:'1px solid #E9ECEF',borderRadius:10,padding:12,background:'#FAFBFC'}}>
                <div style={{fontSize:13,color:'#495057',marginBottom:8,fontWeight:600}}>Actions</div>
                <div style={{display:'grid',gap:8}}>
                  <button onClick={applyPageOrder} style={btn(true)}>Apply Order</button>
                  <button onClick={()=>{setReorderedPageGroups(pageGroups);}} style={btn(false)}>Reset Order</button>
                  <button onClick={openMixedLayout} style={btn(false)}>Open Mixed Layout View</button>
                </div>
                <div style={{fontSize:12,color:'#6c757d',marginTop:12}}>
                  This preview lists the items per page. After applying, all exports will use the new order.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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

function EditModal({ 
  item, 
  editedItem, 
  editingField, 
  itemLayout, 
  isMixedView, 
  closeModal, 
  saveContent, 
  revertContent,
  itemIndex 
}: { 
  item: Item; 
  editedItem?: {description?: string; authorBio?: string}; 
  editingField: 'description' | 'authorBio';
  itemLayout: 1|2|'2-int'|3|4|8;
  isMixedView: boolean;
  closeModal: () => void;
  saveContent: (text: string) => void;
  revertContent: (index: number, field: 'description' | 'authorBio') => void;
  itemIndex: number;
}) {
  const currentValue = editedItem?.[editingField] !== undefined 
    ? editedItem[editingField] 
    : item[editingField] || '';
  const effectiveLayout: LayoutType = typeof itemLayout === 'number' ? itemLayout : itemLayout === '2-int' ? '2-int' : 4;
  const truncations = getItemTruncations(item, effectiveLayout, isMixedView);
  const fieldTruncation = truncations[editingField];
  const limit = fieldTruncation?.limit || 0;
  const [editValue, setEditValue] = useState(currentValue || '');
  
  // Sync editValue when currentValue changes
  useEffect(() => {
    setEditValue(currentValue || '');
  }, [currentValue]);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 20
    }} onClick={(e) => {
      if (e.target === e.currentTarget) closeModal();
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: 24,
        maxWidth: 800,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 12px 32px rgba(0,0,0,0.25)'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#495057' }}>
            Edit {editingField === 'description' ? 'Description' : 'Author Bio'} - {item.title}
          </h3>
          <button onClick={closeModal} style={{
            background: '#E9ECEF',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: '#495057'
          }}>✕</button>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#495057' }}>
              {editingField === 'description' ? 'Description' : 'Author Bio'}
            </label>
            <div style={{ fontSize: 12, color: editValue.length > limit ? '#dc3545' : '#6C757D' }}>
              {editValue.length} / {limit} characters
              {editValue.length > limit && (
                <span style={{ color: '#dc3545', marginLeft: 8 }}>
                  ({Math.round(((editValue.length - limit) / limit) * 100)}% over limit)
                </span>
              )}
            </div>
          </div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            style={{
              width: '100%',
              minHeight: 200,
              padding: 12,
              border: '2px solid #E9ECEF',
              borderRadius: 8,
              fontSize: 14,
              fontFamily: 'inherit',
              resize: 'vertical',
              lineHeight: 1.5
            }}
            placeholder={`Enter ${editingField === 'description' ? 'description' : 'author bio'}...`}
          />
        </div>
        
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => {
            revertContent(itemIndex, editingField);
            closeModal();
          }} style={{
            background: '#E9ECEF',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: '#495057'
          }}>Revert to Original</button>
          <button onClick={() => saveContent(editValue)} style={{
            background: editValue.length > limit ? '#ffc107' : '#28a745',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: 'white'
          }}>Save {editValue.length > limit ? '(Over limit)' : ''}</button>
        </div>
      </div>
    </div>
  );
}

function Preview({ items, layout, showOrderEditor, moveItemUp, moveItemDown, moveItemToPosition, itemLayouts, setItemLayout, clearItemLayout, itemBarcodeTypes, setItemBarcodeType, clearItemBarcodeType, itemAuthorBioToggle, setItemAuthorBioToggle, clearItemAuthorBioToggle, hyperlinkToggle, generateProductUrl, isMixedView, openEditModal }: {
  items: Item[]; 
  layout: 1|'1L'|2|'2-int'|3|4|8|'list'|'compact-list'|'table'; 
  showOrderEditor: boolean;
  moveItemUp: (index: number) => void;
  moveItemDown: (index: number) => void;
  moveItemToPosition: (index: number, newPosition: number) => void;
  itemLayouts: {[key: number]: 1|'1L'|2|'2-int'|3|4|8};
  setItemLayout: (index: number, layout: 1|'1L'|2|'2-int'|3|4|8) => void;
  clearItemLayout: (index: number) => void;
  itemBarcodeTypes: {[key: number]: "EAN-13" | "QR Code" | "None"};
  setItemBarcodeType: (index: number, barcodeType: "EAN-13" | "QR Code" | "None") => void;
  clearItemBarcodeType: (index: number) => void;
  itemAuthorBioToggle: {[key: number]: boolean};
  setItemAuthorBioToggle: (index: number, enabled: boolean) => void;
  clearItemAuthorBioToggle: (index: number) => void;
  hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
  generateProductUrl: (handle: string) => string;
  isMixedView?: boolean;
  openEditModal?: (itemIndex: number, field: 'description' | 'authorBio') => void;
}) {
  // Note: hyperlinkToggle is used indirectly through generateProductUrl which is already bound to it
  void hyperlinkToggle; // Explicitly mark as intentionally unused here
  
  // Suppress unused parameter warnings for parameters that are used conditionally
  void moveItemToPosition;
  void itemLayouts;
  void setItemLayout;
  void clearItemLayout;
  void itemBarcodeTypes;
  void setItemBarcodeType;
  void clearItemBarcodeType;
  const [positionInputs, setPositionInputs] = useState<{[key: number]: string}>({});
  
  // Convert layout to LayoutType format
  const layoutType = typeof layout === 'number' ? `${layout}-up` as const : layout === '1L' ? '1L' : layout === '2-int' ? '2-int' : layout === 'table' ? 'table' : layout;
  
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
            
            {/* Truncation indicators - show when items have custom layouts (mixed view) or in preview/reorder modal */}
            {(() => {
              // Show badges if: isMixedView is true, OR items have custom layouts assigned (indicating mixed view usage)
              const hasCustomLayouts = Object.keys(itemLayouts).length > 0;
              const shouldShowBadges = isMixedView || hasCustomLayouts || showOrderEditor;
              if (!shouldShowBadges) return null;
              
              const itemLayout = itemLayouts[i] || layout;
              const effectiveLayout: LayoutType = typeof itemLayout === 'number' ? itemLayout : itemLayout === '2-int' ? '2-int' : 4;
              // Use true for isMixed when we have custom layouts, otherwise use the isMixedView flag
              const isMixed = hasCustomLayouts || isMixedView;
              const truncations = getItemTruncations(it, effectiveLayout, isMixed);
              const hasIssues = truncations.description?.isTruncated || truncations.authorBio?.isTruncated;
              
              if (!hasIssues) return null;
              
              return (
                <div style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  display: 'flex',
                  gap: 6,
                  flexWrap: 'wrap',
                  zIndex: 10
                }}>
                  {truncations.description?.isTruncated && (
                    <div
                      onClick={() => openEditModal?.(i, 'description')}
                      style={{
                        background: truncations.description.severity === 'severe' ? '#dc3545' : 
                                   truncations.description.severity === 'moderate' ? '#ffc107' : '#28a745',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s ease'
                      }}
                      title={`Description truncated: ${truncations.description.originalLength} chars (limit: ${truncations.description.limit}). Click to edit.`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                      }}
                    >
                      <span>📝 Desc</span>
                      <span style={{ fontSize: 9, opacity: 0.9 }}>
                        {Math.round(truncations.description.percentOver)}%
                      </span>
                    </div>
                  )}
                  {truncations.authorBio?.isTruncated && (
                    <div
                      onClick={() => openEditModal?.(i, 'authorBio')}
                      style={{
                        background: truncations.authorBio.severity === 'severe' ? '#dc3545' : 
                                   truncations.authorBio.severity === 'moderate' ? '#ffc107' : '#28a745',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transition: 'all 0.2s ease'
                      }}
                      title={`Author bio truncated: ${truncations.authorBio.originalLength} chars (limit: ${truncations.authorBio.limit}). Click to edit.`}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                      }}
                    >
                      <span>👤 Bio</span>
                      <span style={{ fontSize: 9, opacity: 0.9 }}>
                        {Math.round(truncations.authorBio.percentOver)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
            
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
                  <button
                    onClick={() => itemLayouts[i] === '2-int' ? clearItemLayout(i) : setItemLayout(i, '2-int')}
                    style={{
                      background: itemLayouts[i] === '2-int' ? "#667eea" : "white",
                      color: itemLayouts[i] === '2-int' ? "white" : "#667eea",
                      border: "1px solid #667eea",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 600,
                      transition: "all 0.2s ease"
                    }}
                    title="Set 2-int layout for this item"
                  >
                    2-int
                  </button>
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

                {it.additionalImages && it.additionalImages.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #DEE2E6" }}>
                    <span style={{ fontSize: 11, color: "#6C757D", fontWeight: 600 }}>
                      Internals: {it.additionalImages.length}
                    </span>
                  </div>
                )}

                {itemLayouts[i] === 1 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #DEE2E6" }}>
                    <span style={{ fontSize: 11, color: "#6C757D" }}>Author Bio:</span>
                    <button
                      onClick={() => {
                        const currentState = itemAuthorBioToggle[i] !== false; // Default to true
                        if (currentState) {
                          clearItemAuthorBioToggle(i);
                          setItemAuthorBioToggle(i, false);
                        } else {
                          setItemAuthorBioToggle(i, true);
                        }
                      }}
                      style={{
                        background: itemAuthorBioToggle[i] !== false ? "#17A2B8" : "white",
                        color: itemAuthorBioToggle[i] !== false ? "white" : "#17A2B8",
                        border: "1px solid #17A2B8",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                        fontWeight: 600,
                        transition: "all 0.2s ease"
                      }}
                      title="Toggle author bio display"
                    >
                      {itemAuthorBioToggle[i] === false ? "Hidden" : `Shown (${items[i]?.authorBio?.length || 0} chars)`}
                    </button>
                  </div>
                )}
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
                  <button
                    onClick={() => setItemLayout(i, '2-int')}
                    style={{
                      border: "1px solid",
                      borderColor: itemLayouts[i] === '2-int' ? "#667eea" : "#E9ECEF",
                      background: itemLayouts[i] === '2-int' ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "white",
                      color: itemLayouts[i] === '2-int' ? "white" : "#495057",
                      padding: "4px 8px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 600
                    }}
                  >
                    2-int
                  </button>
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
