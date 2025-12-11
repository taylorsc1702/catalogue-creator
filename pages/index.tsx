// pages/index.tsx
import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import Image from 'next/image';
import { layoutRegistry } from '@/lib/layout-registry';
import { getItemTruncations, type LayoutType } from '@/utils/truncation-detector';
import SavedCataloguesPanel from "@/components/catalogues/SavedCataloguesPanel";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import type { CatalogueDetails, CatalogueSavePayload, CatalogueSummary, HyperlinkToggle } from "@/types/catalogues";

const createDefaultEmailLogoLinks = () => [
  { imageUrl: "", destinationUrl: "" },
  { imageUrl: "", destinationUrl: "" },
  { imageUrl: "", destinationUrl: "" },
  { imageUrl: "", destinationUrl: "" },
];

const createDefaultEmailBannerLinks = () => [
  { label: "", url: "" },
  { label: "", url: "" },
  { label: "", url: "" },
  { label: "", url: "" },
];

const BUTTON_SHAPE_OPTIONS = [
  { label: "Square", value: "4px" },
  { label: "Soft Corners", value: "8px" },
  { label: "Rounded", value: "12px" },
  { label: "Pill", value: "999px" },
  { label: "Sharp (No Radius)", value: "0px" },
] as const;

const DEFAULT_BUTTON_COLOR = '#007bff';
const DEFAULT_BUTTON_TEXT_COLOR = '#ffffff';
const DEFAULT_BUTTON_BORDER_RADIUS = '4px';
const DEFAULT_BANNER_LINK_BG_COLOR = 'rgba(255, 255, 255, 0.18)';
const DEFAULT_BANNER_LINK_TEXT_COLOR = '#ffffff';
const DEFAULT_BANNER_LINK_BORDER_RADIUS = '20px';

const isValidHexColor = (value: string) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());

type FeedbackMessage = { type: "success" | "error"; text: string };

type BuilderLayout = 1 | "1L" | 2 | "2-int" | 3 | 4 | 8 | 9 | 12 | "list" | "compact-list" | "table";
type ItemLayoutOption = 1 | "1L" | 2 | "2-int" | 3 | 4 | 8 | 9 | 12;

const ALLOWED_LAYOUTS: BuilderLayout[] = [1, "1L", 2, "2-int", 3, 4, 8, 9, 12, "list", "compact-list", "table"];
const ALLOWED_ITEM_LAYOUTS: ItemLayoutOption[] = [1, "1L", 2, "2-int", 3, 4, 8, 9, 12];
const ALLOWED_EMAIL_TEMPLATES = [
  "single",
  "grid-2",
  "grid-3",
  "grid-4",
  "list",
  "spotlight",
  "featured",
  "mixed",
] as const;
const ALLOWED_BARCODE_TYPES = ["EAN-13", "QR Code", "None"] as const;

type EmailTemplateType = (typeof ALLOWED_EMAIL_TEMPLATES)[number];
type EmailAssignmentTemplate = Exclude<EmailTemplateType, "mixed">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (record: Record<string, unknown>, key: string): string | null =>
  typeof record[key] === "string" ? (record[key] as string) : null;

const isEmailTemplate = (value: unknown): value is EmailTemplateType =>
  typeof value === "string" && (ALLOWED_EMAIL_TEMPLATES as readonly string[]).includes(value);

const isAssignmentTemplate = (value: unknown): value is EmailAssignmentTemplate =>
  typeof value === "string" &&
  value !== "mixed" &&
  (ALLOWED_EMAIL_TEMPLATES as readonly string[]).includes(value);

const isBarcodeType = (value: unknown): value is (typeof ALLOWED_BARCODE_TYPES)[number] =>
  typeof value === "string" && (ALLOWED_BARCODE_TYPES as readonly string[]).includes(value);

const isLayoutValue = (value: unknown): value is BuilderLayout =>
  (typeof value === "number" || typeof value === "string") && ALLOWED_LAYOUTS.includes(value as BuilderLayout);

const isItemLayoutValue = (value: unknown): value is ItemLayoutOption =>
  (typeof value === "number" || typeof value === "string") && ALLOWED_ITEM_LAYOUTS.includes(value as ItemLayoutOption);

const normalizeRecordValues = <T,>(
  input: unknown,
  isValid: (value: unknown) => value is T
): { [key: number]: T } => {
  if (!isRecord(input)) return {};
  const result: { [key: number]: T } = {};
  Object.entries(input).forEach(([key, value]) => {
    const numericKey = Number(key);
    if (!Number.isNaN(numericKey) && isValid(value)) {
      result[numericKey] = value;
    }
  });
  return result;
};

type EditedItemContent = { description?: string; authorBio?: string; footerNote?: string };

const isEditedItemContent = (value: unknown): value is EditedItemContent => {
  if (!isRecord(value)) return false;
  const allowedKeys = new Set(['description', 'authorBio', 'footerNote']);
  return Object.keys(value).every(key => allowedKeys.has(key) && (typeof value[key] === 'string' || value[key] === undefined));
};

const resolveLayoutForTruncation = (
  layoutValue: BuilderLayout | ItemLayoutOption | undefined
): LayoutType => {
  if (layoutValue === undefined) return 4;
  if (layoutValue === '1L') return '1L';
  if (layoutValue === '2-int') return '2-int';
  if (layoutValue === 1 || layoutValue === 2 || layoutValue === 3 || layoutValue === 4 || layoutValue === 8 || layoutValue === 9 || layoutValue === 12) {
    return layoutValue;
  }
  return 4;
};

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  icauth?: string; // Australian author metafield
  publicity?: string; reviews?: string; imidis?: string; discount?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
  footerNote?: string;
  previousEditionIsbn?: string;
  moreFromAuthorIsbns?: string[];
  moreFromAuthorImages?: string[];
};

type DomainAccessMap = {
  woodslane: boolean;
  press: boolean;
  health: boolean;
  education: boolean;
};

const HYPERLINK_OPTIONS_META: Array<{ value: HyperlinkToggle; label: string; key: keyof DomainAccessMap }> = [
  { value: "woodslane", label: "Woodslane", key: "woodslane" },
  { value: "woodslanehealth", label: "Woodslane Health", key: "health" },
  { value: "woodslaneeducation", label: "Woodslane Education", key: "education" },
  { value: "woodslanepress", label: "Woodslane Press", key: "press" },
];

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
  const [layout, setLayout] = useState<1|'1L'|2|'2-int'|3|4|8|9|12|'list'|'compact-list'|'table'>(4);
  const [barcodeType, setBarcodeType] = useState<"EAN-13" | "QR Code" | "None">("EAN-13");
  const [twoIntOrientation, setTwoIntOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [serverQuery, setServerQuery] = useState<string>(""); // <— NEW: shows the query used by API
  const [useHandleList, setUseHandleList] = useState(false);
  const [showOrderEditor, setShowOrderEditor] = useState(false);
  const [itemLayouts, setItemLayouts] = useState<{[key: number]: 1|'1L'|2|'2-int'|3|4|8|9|12}>({});
  const [itemBarcodeTypes, setItemBarcodeTypes] = useState<{[key: number]: "EAN-13" | "QR Code" | "None"}>({});
  const [itemAuthorBioToggle, setItemAuthorBioToggle] = useState<{[key: number]: boolean}>({});
  const [itemInternalsCount1L, setItemInternalsCount1L] = useState<{[key: number]: number}>({}); // Per-item internals count for 1L layout (1-2)
  const [previousEditionIsbns, setPreviousEditionIsbns] = useState<{[key: number]: string}>({}); // Previous edition ISBNs per item
  const [moreFromAuthorIsbns, setMoreFromAuthorIsbns] = useState<{[key: number]: string[]}>({}); // More from author ISBNs per item (up to 3 for 1/1L, 2 for 2-up/2-int)
  const [moreFromAuthorImages, setMoreFromAuthorImages] = useState<{[key: number]: string[]}>({}); // More from author images per item
  const [loadingMoreFromAuthor, setLoadingMoreFromAuthor] = useState<{[key: number]: boolean}>({}); // Loading state for fetching more from author images
  const [hyperlinkToggle, setHyperlinkToggle] = useState<'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress'>('woodslane');
  const [customBannerColor, setCustomBannerColor] = useState<string>("");
  const [internalsCount1L, setInternalsCount1L] = useState<number>(2); // Default number of internals to display for 1L layout (1-2)
  
  // UTM Parameters
  const [catalogueName, setCatalogueName] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("15");
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

  // URL pages state (up to 4 URLs) - now using page index for positioning
  const [urlPages, setUrlPages] = useState<Array<{url: string; title?: string; pageIndex?: number | null}>>(Array(4).fill(null).map(() => ({ url: '', pageIndex: null })));

  // Email state
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailHtml, setEmailHtml] = useState<string>('');
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplateType>('single');
  const [emailTemplateAssignments, setEmailTemplateAssignments] = useState<{[key: number]: EmailAssignmentTemplate}>({});
  const [emailBannerImageUrl, setEmailBannerImageUrl] = useState<string>('');
  const [emailFreeText, setEmailFreeText] = useState<string>('');
  const [emailIssuuUrl, setEmailIssuuUrl] = useState<string>('');
  const [emailCatalogueImageUrl, setEmailCatalogueImageUrl] = useState<string>('');
  const [emailButtonLabel, setEmailButtonLabel] = useState<string>('Shop Now →');
  const [emailButtonColor, setEmailButtonColor] = useState<string>(DEFAULT_BUTTON_COLOR);
  const [emailButtonTextColor, setEmailButtonTextColor] = useState<string>(DEFAULT_BUTTON_TEXT_COLOR);
  const [emailButtonBorderRadius, setEmailButtonBorderRadius] = useState<string>(DEFAULT_BUTTON_BORDER_RADIUS);
  const [emailEditedDescriptions, setEmailEditedDescriptions] = useState<{[key: number]: string}>({});
  const [editingEmailDescIndex, setEditingEmailDescIndex] = useState<number | null>(null);
  const [emailInternalsToggle, setEmailInternalsToggle] = useState<{[key: number]: boolean}>({});
  // Logo URLs (up to 4) - each has image URL and destination URL
  const [emailLogoUrls, setEmailLogoUrls] = useState<Array<{imageUrl: string; destinationUrl: string}>>(createDefaultEmailLogoLinks);
  // Banner links (up to 4) - each has label and destination URL
  const [emailBannerLinks, setEmailBannerLinks] = useState<Array<{label: string; url: string}>>(createDefaultEmailBannerLinks);
  const [emailBannerLinkBgColor, setEmailBannerLinkBgColor] = useState<string>(DEFAULT_BANNER_LINK_BG_COLOR);
  const [emailBannerLinkTextColor, setEmailBannerLinkTextColor] = useState<string>(DEFAULT_BANNER_LINK_TEXT_COLOR);
  const [emailBannerLinkBorderRadius, setEmailBannerLinkBorderRadius] = useState<string>(DEFAULT_BANNER_LINK_BORDER_RADIUS);
  // Line break text section
  const [emailLineBreakText, setEmailLineBreakText] = useState<string>('');
  // Email section order - default order
  const [emailSectionOrder, setEmailSectionOrder] = useState<string[]>(['bannerImage', 'freeText', 'logoSection', 'lineBreakText', 'products', 'issuuCatalogue']);
  const [draggedSection, setDraggedSection] = useState<string | null>(null);
  // Append view for mixed exports
  const [appendView, setAppendView] = useState<'none'|'list'|'compact-list'|'table'>('none');
  // Preview & page reordering modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  type PageGroup = number[] | 'APPEND' | {type: 'URL_PAGE'; index: number; url: string; title?: string};
  const [pageGroups, setPageGroups] = useState<PageGroup[]>([]);
  const [reorderedPageGroups, setReorderedPageGroups] = useState<PageGroup[]>([]);
  const [appendInsertIndex, setAppendInsertIndex] = useState<number | null>(null);

  // Truncation detection and editing
  const [editedContent, setEditedContent] = useState<{[key: number]: EditedItemContent}>({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'description' | 'authorBio' | null>(null);
  const [isMixedView, setIsMixedView] = useState(false);

  const session = useSession();
  const supabaseClient = useSupabaseClient();
  const router = useRouter();
  const [profileRole, setProfileRole] = useState<"admin" | "general" | null>(null);
  const [domainAccess, setDomainAccess] = useState<DomainAccessMap | null>(null);
const [allowedVendors, setAllowedVendors] = useState<string[] | null>(null);
const [selectedAllowedVendors, setSelectedAllowedVendors] = useState<string[]>([]);
  const toggleAllowedVendor = useCallback((value: string) => {
    if (!allowedVendors || allowedVendors.length === 0) return;
    setSelectedAllowedVendors((prev) => {
      const exists = prev.includes(value);
      if (exists) {
        const filtered = prev.filter((v) => v !== value);
        return filtered.length > 0 ? filtered : prev;
      }
      const next = [...prev, value];
      next.sort((a, b) => allowedVendors.indexOf(a) - allowedVendors.indexOf(b));
      return next;
    });
  }, [allowedVendors]);

  const selectAllAllowedVendors = useCallback(() => {
    if (!allowedVendors || allowedVendors.length === 0) return;
    setSelectedAllowedVendors((prev) => {
      const next = [...allowedVendors];
      if (prev.length === next.length && prev.every((value) => next.includes(value))) {
        return prev;
      }
      return next;
    });
  }, [allowedVendors]);

  const selectOnlyAllowedVendor = useCallback((value: string) => {
    setSelectedAllowedVendors([value]);
  }, []);

  useEffect(() => {
    if (session) {
      setAuthMessage(null);
      setAuthPassword("");
    } else {
      setProfileRole(null);
      setDomainAccess(null);
      setAllowedVendors(null);
      setSelectedAllowedVendors([]);
      setVendor("");
      setShowFrontCover(false);
      setShowBackCover(false);
      setFrontCoverText1("");
      setFrontCoverText2("");
      setBackCoverText1("");
      setBackCoverText2("");
      setCoverImageUrls(["", "", "", ""]);
      setUrlPages(Array(4).fill(null).map(() => ({ url: '', pageIndex: null })));
    }
  }, [session]);

  useEffect(() => {
    let isMounted = true;
    const loadProfileRole = async () => {
      if (!session) return;
      const { data, error } = await supabaseClient
        .from("profiles")
        .select(
          "role, allowed_vendors, can_domain_woodslane, can_domain_press, can_domain_health, can_domain_education, discount_code_setting"
        )
        .eq("id", session.user.id)
        .single();
      if (!isMounted) return;
      if (error || !data?.role) {
        setProfileRole(null);
        return;
      }
      const resolvedRole = data.role === "admin" ? "admin" : "general";
      setProfileRole(resolvedRole);
      setDomainAccess({
        woodslane: resolvedRole === "admin" ? true : !!data.can_domain_woodslane,
        press: resolvedRole === "admin" ? true : !!data.can_domain_press,
        health: resolvedRole === "admin" ? true : !!data.can_domain_health,
        education: resolvedRole === "admin" ? true : !!data.can_domain_education,
      });
      let cleanedAllowed: string[] | null = null;
      if (Array.isArray(data.allowed_vendors) && data.allowed_vendors.length > 0) {
        const rawValues = data.allowed_vendors as unknown[];
        const cleaned = rawValues
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value): value is string => value.length > 0);
        cleanedAllowed = cleaned.length > 0 ? cleaned : null;
      }
      setAllowedVendors(cleanedAllowed);
      if (resolvedRole === "admin") {
        setSelectedAllowedVendors([]);
      } else {
        setSelectedAllowedVendors(cleanedAllowed ?? []);
        setShowFrontCover(false);
        setShowBackCover(false);
        setFrontCoverText1("");
        setFrontCoverText2("");
        setBackCoverText1("");
        setBackCoverText2("");
        setCoverImageUrls(["", "", "", ""]);
        setUrlPages(Array(4).fill(null).map(() => ({ url: '', pageIndex: null })));
      }
    };
    loadProfileRole();
    return () => {
      isMounted = false;
    };
  }, [session, supabaseClient]);

  const canSaveCatalogues = profileRole === "admin";
  const isAdmin = profileRole === "admin";
  const availableHyperlinkOptions = useMemo<HyperlinkToggle[]>(() => {
    if (profileRole === "admin" || !domainAccess) {
      return HYPERLINK_OPTIONS_META.map((opt) => opt.value);
    }
    const allowed = HYPERLINK_OPTIONS_META
      .filter((opt) => domainAccess?.[opt.key])
      .map((opt) => opt.value);
    return allowed.length > 0 ? allowed : ["woodslane"];
  }, [profileRole, domainAccess]);

  useEffect(() => {
    if (!availableHyperlinkOptions.includes(hyperlinkToggle)) {
      setHyperlinkToggle(availableHyperlinkOptions[0] ?? "woodslane");
    }
  }, [availableHyperlinkOptions, hyperlinkToggle]);

  const hyperlinkButtonOptions = useMemo(
    () => HYPERLINK_OPTIONS_META.filter((opt) => availableHyperlinkOptions.includes(opt.value)),
    [availableHyperlinkOptions]
  );
  const hyperlinkSelectionLocked = availableHyperlinkOptions.length <= 1;

  useEffect(() => {
    if (profileRole === "admin") return;
    setVendor("");
  }, [profileRole, allowedVendors]);

  useEffect(() => {
    if (profileRole === "admin") {
      setSelectedAllowedVendors([]);
      return;
    }
    if (!allowedVendors || allowedVendors.length === 0) {
      setSelectedAllowedVendors([]);
      return;
    }
    setSelectedAllowedVendors((prev) => {
      const filtered = prev.filter((value) => allowedVendors.includes(value));
      if (filtered.length === prev.length && filtered.length > 0) {
        return prev;
      }
      if (filtered.length > 0) {
        return filtered;
      }
      return [...allowedVendors];
    });
  }, [profileRole, allowedVendors]);

  const [activeCatalogueId, setActiveCatalogueId] = useState<string | null>(null);
  const [isSavingCatalogue, setIsSavingCatalogue] = useState(false);
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<FeedbackMessage | null>(null);
  const [catalogueRefreshToken, setCatalogueRefreshToken] = useState(0);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState<FeedbackMessage | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Get items with edited content applied
  const getItemsWithEdits = (): Item[] => {
    return items.map((item, index) => {
      const edits = editedContent[index];
      const previousIsbn = previousEditionIsbns[index];
      const baseItem = edits ? {
        ...item,
        description: edits.description !== undefined ? edits.description : item.description,
        authorBio: edits.authorBio !== undefined ? edits.authorBio : item.authorBio,
        footerNote: edits.footerNote !== undefined ? edits.footerNote : item.footerNote
      } : item;
      
      const moreFromAuthorIsbnsForItem = moreFromAuthorIsbns[index] || item.moreFromAuthorIsbns || [];
      const moreFromAuthorImagesForItem = moreFromAuthorImages[index] || item.moreFromAuthorImages || [];
      
      return {
        ...baseItem,
        previousEditionIsbn: previousIsbn || item.previousEditionIsbn,
        moreFromAuthorIsbns: moreFromAuthorIsbnsForItem,
        moreFromAuthorImages: moreFromAuthorImagesForItem
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

  // Fetch previous edition image by ISBN
  // Handle previous edition ISBN change
  const handlePreviousEditionIsbnChange = (index: number, isbn: string) => {
    setPreviousEditionIsbns(prev => ({ ...prev, [index]: isbn }));
  };

  // Fetch image for a "More from this author" ISBN
  const fetchMoreFromAuthorImage = async (index: number, isbnIndex: number, isbn: string) => {
    if (!isbn || !isbn.trim()) {
      setMoreFromAuthorImages(prev => {
        const updated = { ...prev };
        if (updated[index]) {
          const newImages = [...updated[index]];
          newImages[isbnIndex] = '';
          updated[index] = newImages;
        }
        return updated;
      });
      return;
    }

    setLoadingMoreFromAuthor(prev => ({ ...prev, [index]: true }));
    try {
      const response = await fetch('/api/products/by-isbn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn: isbn.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setMoreFromAuthorImages(prev => {
          const updated = { ...prev };
          if (!updated[index]) updated[index] = [];
          const newImages = [...updated[index]];
          newImages[isbnIndex] = data.imageUrl || '';
          updated[index] = newImages;
          return updated;
        });
      } else {
        setMoreFromAuthorImages(prev => {
          const updated = { ...prev };
          if (!updated[index]) updated[index] = [];
          const newImages = [...updated[index]];
          newImages[isbnIndex] = '';
          updated[index] = newImages;
          return updated;
        });
      }
    } catch (error) {
      console.error('Error fetching more from author image:', error);
      setMoreFromAuthorImages(prev => {
        const updated = { ...prev };
        if (!updated[index]) updated[index] = [];
        const newImages = [...updated[index]];
        newImages[isbnIndex] = '';
        updated[index] = newImages;
        return updated;
      });
    } finally {
      setLoadingMoreFromAuthor(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    }
  };

  // Handle more from author ISBN change
  const handleMoreFromAuthorIsbnChange = (index: number, isbnIndex: number, isbn: string) => {
    setMoreFromAuthorIsbns(prev => {
      const updated = { ...prev };
      if (!updated[index]) updated[index] = [];
      const newIsbns = [...updated[index]];
      newIsbns[isbnIndex] = isbn;
      updated[index] = newIsbns;
      return updated;
    });
    // Debounce the fetch - wait 1 second after user stops typing
    setTimeout(() => {
      fetchMoreFromAuthorImage(index, isbnIndex, isbn);
    }, 1000);
  };

  // Save edited content
  function saveEditedContent(newText: string) {
    if (editingItemIndex === null || editingField === null) return;
    
    setEditedContent(prev => {
      const next = {
        ...prev,
        [editingItemIndex]: {
          ...prev[editingItemIndex],
          [editingField]: newText
        }
      };
      return next;
    });
    
    closeEditModal();
  }

  function setItemFooterNote(index: number, note: string) {
    setEditedContent(prev => {
      const existingEdits = prev[index] ?? {};
      const originalNote = items[index]?.footerNote ?? '';
      const currentNote = existingEdits.footerNote ?? originalNote;
      if (note === currentNote) {
        return prev;
      }
      const updated: EditedItemContent = { ...existingEdits };
      if (note === '' && originalNote === '') {
        delete updated.footerNote;
      } else {
        updated.footerNote = note;
      }
      if (Object.keys(updated).length === 0) {
        const { [index]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [index]: updated };
    });
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

  const handleSignIn = async () => {
    if (!authEmail.trim() || !authPassword) {
      setAuthMessage({ type: "error", text: "Enter both email and password to sign in." });
      return;
    }
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });
      if (error) throw error;
      setAuthMessage({ type: "success", text: "Signed in successfully." });
      setCatalogueRefreshToken(Date.now());
    } catch (error) {
      setAuthMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to sign in.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    setAuthMessage(null);
    try {
      await supabaseClient.auth.signOut();
      setAuthMessage({ type: "success", text: "Signed out." });
      setActiveCatalogueId(null);
      setCatalogueRefreshToken(Date.now());
    } catch (error) {
      setAuthMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to sign out.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const startNewCatalogue = () => {
    setActiveCatalogueId(null);
    setCatalogueName("");
    setCoverCatalogueName("");
    setShowFrontCover(false);
    setShowBackCover(false);
    setFrontCoverText1("");
    setFrontCoverText2("");
    setBackCoverText1("");
    setBackCoverText2("");
    setCoverImageUrls(["", "", "", ""]);
    setDiscountCode("");
    setDiscountPercentage("15");
    setCustomBannerColor("");
    setHyperlinkToggle("woodslane");
    setLayout(4);
    setBarcodeType("EAN-13");
    setTwoIntOrientation('portrait');
    layoutRegistry.setTwoIntOrientation('portrait');
    setItems([]);
    setItemLayouts({});
    setItemBarcodeTypes({});
    setItemAuthorBioToggle({});
    setItemInternalsCount1L({});
    setInternalsCount1L(2);
    setEditedContent({});
    setPreviousEditionIsbns({});
    setMoreFromAuthorIsbns({});
    setMoreFromAuthorImages({});
    setEmailTemplate("single");
    setEmailTemplateAssignments({});
    setEmailBannerImageUrl("");
    setEmailFreeText("");
    setEmailIssuuUrl("");
    setEmailCatalogueImageUrl("");
    setEmailButtonLabel('Shop Now →');
    setEmailButtonColor(DEFAULT_BUTTON_COLOR);
    setEmailButtonTextColor(DEFAULT_BUTTON_TEXT_COLOR);
    setEmailButtonBorderRadius(DEFAULT_BUTTON_BORDER_RADIUS);
    setEmailEditedDescriptions({});
    setEmailInternalsToggle({});
    setEmailLogoUrls(createDefaultEmailLogoLinks());
    setEmailBannerLinks(createDefaultEmailBannerLinks());
    setEmailBannerLinkBgColor(DEFAULT_BANNER_LINK_BG_COLOR);
    setEmailBannerLinkTextColor(DEFAULT_BANNER_LINK_TEXT_COLOR);
    setEmailBannerLinkBorderRadius(DEFAULT_BANNER_LINK_BORDER_RADIUS);
    setEmailLineBreakText("");
    setEmailSectionOrder(['bannerImage', 'freeText', 'logoSection', 'lineBreakText', 'products', 'issuuCatalogue']);
    setUtmSource("");
    setUtmMedium("");
    setUtmCampaign("");
    setUtmContent("");
    setUtmTerm("");
    setSaveFeedback({ type: "success", text: "Started a new catalogue draft." });
  };

  const handleSaveCatalogue = async () => {
    if (!session) {
      setSaveFeedback({ type: "error", text: "Sign in to save catalogues." });
      return;
    }
    if (!canSaveCatalogues) {
      setSaveFeedback({ type: "error", text: "You do not have permission to save catalogues." });
      return;
    }
    setIsSavingCatalogue(true);
    setSaveFeedback(null);
    try {
      const effectiveName = (coverCatalogueName || catalogueName).trim() || "Untitled catalogue";
      const coverImages = Array.isArray(coverImageUrls) ? [...coverImageUrls] : ["", "", "", ""];
      while (coverImages.length < 4) coverImages.push("");

      const payload: CatalogueSavePayload = {
        id: activeCatalogueId ?? undefined,
        name: effectiveName,
        description: coverCatalogueName?.trim() ? coverCatalogueName.trim() : null,
        branding: {
          bannerColor: getBannerColor(hyperlinkToggle),
          customBannerColor: customBannerColor || null,
          hyperlinkToggle,
          websiteName: getWebsiteName(hyperlinkToggle),
          discountCode: discountCode || null,
          cover: {
            showFrontCover,
            showBackCover,
            frontCoverText1,
            frontCoverText2,
            backCoverText1,
            backCoverText2,
            coverImageUrls: coverImages.slice(0, 4),
            catalogueName: coverCatalogueName,
          },
        },
        layoutConfig: {
          layoutType: layout,
          barcodeType,
          itemLayouts,
          itemBarcodeTypes,
          itemAuthorBioToggle,
          itemInternalsCount1L,
          internalsCount1L,
          twoIntOrientation,
        },
        items,
        settings: {
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
          editedContent,
          previousEditionIsbns,
          moreFromAuthorIsbns,
          moreFromAuthorImages,
          emailConfig: {
            template: emailTemplate,
            assignments: emailTemplateAssignments,
            freeText: emailFreeText,
            bannerImageUrl: emailBannerImageUrl,
            issuuUrl: emailIssuuUrl,
            catalogueImageUrl: emailCatalogueImageUrl,
            logoUrls: emailLogoUrls,
            bannerLinks: emailBannerLinks,
            lineBreakText: emailLineBreakText,
            sectionOrder: emailSectionOrder,
            editedDescriptions: emailEditedDescriptions,
            internalsToggle: emailInternalsToggle,
            buttonColor: emailButtonColor,
            buttonTextColor: emailButtonTextColor,
            buttonLabel: emailButtonLabel,
            buttonBorderRadius: emailButtonBorderRadius,
            bannerLinkBgColor: emailBannerLinkBgColor,
            bannerLinkTextColor: emailBannerLinkTextColor,
            bannerLinkBorderRadius: emailBannerLinkBorderRadius,
          },
        },
      };

      const endpoint = activeCatalogueId ? `/api/catalogues/${activeCatalogueId}` : "/api/catalogues";
      const method = activeCatalogueId ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        setSaveFeedback({ type: "error", text: "Your session expired. Please sign in again." });
        setCatalogueRefreshToken(Date.now());
        return;
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save catalogue.");
      }

      const savedSummary = (await response.json()) as CatalogueSummary;
      setActiveCatalogueId(savedSummary.id);
      setSaveFeedback({
        type: "success",
        text: `Catalogue saved${savedSummary.name ? `: ${savedSummary.name}` : ""}.`,
      });
      setCatalogueRefreshToken(Date.now());
    } catch (error) {
      setSaveFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error while saving catalogue.",
      });
    } finally {
      setIsSavingCatalogue(false);
    }
  };

  const handleOpenCatalogue = async (catalogueId: string) => {
    setIsLoadingCatalogue(true);
    setSaveFeedback(null);
    try {
      const response = await fetch(`/api/catalogues/${catalogueId}`);
      if (response.status === 401) {
        setSaveFeedback({ type: "error", text: "Sign in to open saved catalogues." });
        setCatalogueRefreshToken(Date.now());
        return;
      }
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to load catalogue.");
      }

      const data: CatalogueDetails = await response.json();

      const brandingRecord = isRecord(data.branding) ? (data.branding as Record<string, unknown>) : {};
      const coverRecord = isRecord(brandingRecord["cover"]) ? (brandingRecord["cover"] as Record<string, unknown>) : {};
      const layoutRecord = isRecord(data.layoutConfig) ? (data.layoutConfig as Record<string, unknown>) : {};
      const settingsRecord = isRecord(data.settings) ? (data.settings as Record<string, unknown>) : {};
      const utmRecord = isRecord(settingsRecord["utmParams"])
        ? (settingsRecord["utmParams"] as Record<string, unknown>)
        : {};
      const emailRecord = isRecord(settingsRecord["emailConfig"])
        ? (settingsRecord["emailConfig"] as Record<string, unknown>)
        : {};

      const coverImagesValue = coverRecord["coverImageUrls"];
      const coverImages = Array.isArray(coverImagesValue)
        ? coverImagesValue.map((value) => (typeof value === "string" ? value : ""))
        : [];
      while (coverImages.length < 4) coverImages.push("");

      const logoUrlsValue = emailRecord["logoUrls"];
      const bannerLinksValue = emailRecord["bannerLinks"];
      const savedBannerLinks = Array.isArray(bannerLinksValue)
        ? bannerLinksValue.map((link) => {
            if (isRecord(link)) {
              return {
                label: getString(link, "label") ?? "",
                url: getString(link, "url") ?? "",
              };
            }
            return { label: "", url: "" };
          })
        : createDefaultEmailBannerLinks();
      while (savedBannerLinks.length < 4) savedBannerLinks.push({ label: "", url: "" });

      const buttonColorValue = getString(emailRecord, "buttonColor");
      const buttonTextColorValue = getString(emailRecord, "buttonTextColor");
      const buttonLabelValue = getString(emailRecord, "buttonLabel");
      const buttonBorderRadiusValue = getString(emailRecord, "buttonBorderRadius");
      const bannerLinkBgColorValue = getString(emailRecord, "bannerLinkBgColor");
      const bannerLinkTextColorValue = getString(emailRecord, "bannerLinkTextColor");
      const bannerLinkBorderRadiusValue = getString(emailRecord, "bannerLinkBorderRadius");
      const savedLogoUrls = Array.isArray(logoUrlsValue)
        ? logoUrlsValue.map((link) => {
            if (isRecord(link)) {
              return {
                imageUrl: getString(link, "imageUrl") ?? "",
                destinationUrl: getString(link, "destinationUrl") ?? "",
              };
            }
            return { imageUrl: "", destinationUrl: "" };
          })
        : createDefaultEmailLogoLinks();
      while (savedLogoUrls.length < 4) savedLogoUrls.push({ imageUrl: "", destinationUrl: "" });

      const layoutTypeValue = layoutRecord["layoutType"];
      const resolvedLayout: BuilderLayout =
        isLayoutValue(layoutTypeValue) ? (layoutTypeValue as BuilderLayout) : 4;

      const barcodeRaw = layoutRecord["barcodeType"];
      const resolvedBarcode =
        isBarcodeType(barcodeRaw) ? (barcodeRaw as (typeof ALLOWED_BARCODE_TYPES)[number]) : "EAN-13";

      const hyperlinkRaw = getString(brandingRecord, "hyperlinkToggle");
      const resolvedHyperlink =
        hyperlinkRaw === "woodslane" ||
        hyperlinkRaw === "woodslanehealth" ||
        hyperlinkRaw === "woodslaneeducation" ||
        hyperlinkRaw === "woodslanepress"
          ? hyperlinkRaw
          : "woodslane";

      const assignmentsNormalized = normalizeRecordValues<EmailAssignmentTemplate>(
        emailRecord["assignments"],
        isAssignmentTemplate
      );
      const editedDescriptionsNormalized = normalizeRecordValues<string>(
        emailRecord["editedDescriptions"],
        (value): value is string => typeof value === "string"
      );
      const internalsToggleNormalized = normalizeRecordValues<boolean>(
        emailRecord["internalsToggle"],
        (value): value is boolean => typeof value === "boolean"
      );
      const itemLayoutsNormalized = normalizeRecordValues<ItemLayoutOption>(
        layoutRecord["itemLayouts"],
        isItemLayoutValue
      );
      const itemBarcodeTypesNormalized = normalizeRecordValues<(typeof ALLOWED_BARCODE_TYPES)[number]>(
        layoutRecord["itemBarcodeTypes"],
        isBarcodeType
      );
      const itemAuthorBioToggleNormalized = normalizeRecordValues<boolean>(
        layoutRecord["itemAuthorBioToggle"],
        (value): value is boolean => typeof value === "boolean"
      );
      const itemInternalsCountNormalized = normalizeRecordValues<number>(
        layoutRecord["itemInternalsCount1L"],
        (value): value is number => typeof value === "number"
      );
      const editedContentNormalized = normalizeRecordValues<EditedItemContent>(
        settingsRecord["editedContent"],
        isEditedItemContent
      );
      
      const previousEditionIsbnsNormalized = normalizeRecordValues<string>(
        settingsRecord["previousEditionIsbns"],
        (value): value is string => typeof value === "string"
      );
      const moreFromAuthorIsbnsNormalized = normalizeRecordValues<string[]>(
        settingsRecord["moreFromAuthorIsbns"],
        (value): value is string[] => Array.isArray(value) && value.every(v => typeof v === "string")
      );
      
      const moreFromAuthorImagesNormalized = normalizeRecordValues<string[]>(
        settingsRecord["moreFromAuthorImages"],
        (value): value is string[] => Array.isArray(value) && value.every(v => typeof v === "string")
      );

      const sectionOrderValue = emailRecord["sectionOrder"];
      const sectionOrder =
        Array.isArray(sectionOrderValue) && sectionOrderValue.length
          ? sectionOrderValue.filter((section): section is string => typeof section === "string")
          : ['bannerImage', 'freeText', 'logoSection', 'lineBreakText', 'products', 'issuuCatalogue'];

      setActiveCatalogueId(data.id);
      setCatalogueName(data.name ?? "");
      setCoverCatalogueName(getString(coverRecord, "catalogueName") ?? "");
      setShowFrontCover(typeof coverRecord["showFrontCover"] === "boolean" ? (coverRecord["showFrontCover"] as boolean) : false);
      setShowBackCover(typeof coverRecord["showBackCover"] === "boolean" ? (coverRecord["showBackCover"] as boolean) : false);
      setFrontCoverText1(getString(coverRecord, "frontCoverText1") ?? "");
      setFrontCoverText2(getString(coverRecord, "frontCoverText2") ?? "");
      setBackCoverText1(getString(coverRecord, "backCoverText1") ?? "");
      setBackCoverText2(getString(coverRecord, "backCoverText2") ?? "");
      setCoverImageUrls(coverImages.slice(0, 4));
      setDiscountCode(getString(brandingRecord, "discountCode") ?? "");
      setDiscountPercentage(getString(brandingRecord, "discountPercentage") ?? "15");
      setCustomBannerColor(getString(brandingRecord, "customBannerColor") ?? "");
      setHyperlinkToggle(resolvedHyperlink);
      setLayout(resolvedLayout);
      setBarcodeType(resolvedBarcode);
      setItemLayouts(itemLayoutsNormalized);
      setItemBarcodeTypes(itemBarcodeTypesNormalized);
      setItemAuthorBioToggle(itemAuthorBioToggleNormalized);
      setItemInternalsCount1L(itemInternalsCountNormalized);
      setInternalsCount1L(typeof layoutRecord["internalsCount1L"] === "number" ? (layoutRecord["internalsCount1L"] as number) : 2);
      const savedOrientation = getString(layoutRecord, "twoIntOrientation");
      const resolvedOrientation = (savedOrientation === 'portrait' || savedOrientation === 'landscape') ? savedOrientation : 'portrait';
      setTwoIntOrientation(resolvedOrientation);
      layoutRegistry.setTwoIntOrientation(resolvedOrientation);
      setItems(Array.isArray(data.items) ? (data.items as Item[]) : []);
      setEditedContent(editedContentNormalized);
      setPreviousEditionIsbns(previousEditionIsbnsNormalized);
      setMoreFromAuthorIsbns(moreFromAuthorIsbnsNormalized);
      setMoreFromAuthorImages(moreFromAuthorImagesNormalized);
      setUtmSource(getString(utmRecord, "utmSource") ?? "");
      setUtmMedium(getString(utmRecord, "utmMedium") ?? "");
      setUtmCampaign(getString(utmRecord, "utmCampaign") ?? "");
      setUtmContent(getString(utmRecord, "utmContent") ?? "");
      setUtmTerm(getString(utmRecord, "utmTerm") ?? "");
      const templateRaw = getString(emailRecord, "template");
      setEmailTemplate(templateRaw && isEmailTemplate(templateRaw) ? templateRaw : "single");
      setEmailTemplateAssignments(assignmentsNormalized);
      setEmailBannerImageUrl(getString(emailRecord, "bannerImageUrl") ?? "");
      setEmailFreeText(getString(emailRecord, "freeText") ?? "");
      setEmailIssuuUrl(getString(emailRecord, "issuuUrl") ?? "");
      setEmailCatalogueImageUrl(getString(emailRecord, "catalogueImageUrl") ?? "");
      setEmailEditedDescriptions(editedDescriptionsNormalized);
      setEmailInternalsToggle(internalsToggleNormalized);
      setEmailLogoUrls(savedLogoUrls.slice(0, 4));
      setEmailBannerLinks(savedBannerLinks.slice(0, 4));
      setEmailLineBreakText(getString(emailRecord, "lineBreakText") ?? "");
      setEmailSectionOrder(sectionOrder);
      setEmailButtonColor(buttonColorValue ?? DEFAULT_BUTTON_COLOR);
      setEmailButtonTextColor(buttonTextColorValue ?? DEFAULT_BUTTON_TEXT_COLOR);
      setEmailButtonLabel(buttonLabelValue ?? 'Shop Now →');
      setEmailButtonBorderRadius(buttonBorderRadiusValue ?? DEFAULT_BUTTON_BORDER_RADIUS);
      setEmailBannerLinkBgColor(bannerLinkBgColorValue ?? DEFAULT_BANNER_LINK_BG_COLOR);
      setEmailBannerLinkTextColor(bannerLinkTextColorValue ?? DEFAULT_BANNER_LINK_TEXT_COLOR);
      setEmailBannerLinkBorderRadius(bannerLinkBorderRadiusValue ?? DEFAULT_BANNER_LINK_BORDER_RADIUS);

      setSaveFeedback({
        type: "success",
        text: `Loaded catalogue${data.name ? `: ${data.name}` : ""}.`,
      });
      setCatalogueRefreshToken(Date.now());
    } catch (error) {
      setSaveFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Unexpected error while loading catalogue.",
      });
    } finally {
      setIsLoadingCatalogue(false);
    }
  };

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
    if (profileRole === "admin") {
      if (vendor) parts.push(`vendor:'${vendor}'`);
    } else if (selectedAllowedVendors.length > 0) {
      if (allowedVendors && selectedAllowedVendors.length === allowedVendors.length) {
        parts.push(`vendor ∈ allowed (${selectedAllowedVendors.length})`);
      } else {
        const vendorTerms = selectedAllowedVendors.map((value) => `vendor:'${value}'`).join(" OR ");
        parts.push(`(${vendorTerms})`);
      }
    }
    if (collectionId) parts.push(`collection_id:${collectionId}`);
    if (publishingStatus !== "All") {
      parts.push(`status:${publishingStatus.toLowerCase()}`);
    }
    return parts.join(" AND ") || "status:active";
  }, [tag, vendor, collectionId, publishingStatus, useHandleList, handleList, profileRole, selectedAllowedVendors, allowedVendors]);

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
      
      const generalVendorList =
        profileRole === "admin"
          ? undefined
          : (selectedAllowedVendors.length > 0
              ? selectedAllowedVendors
              : allowedVendors ?? []);

      const requestBody = useHandleList && handleList.trim() 
        ? { handleList: parsedHandles }
        : {
            tag,
            vendor: profileRole === "admin"
              ? vendor
              : generalVendorList && generalVendorList.length === 1
                ? generalVendorList[0]
                : undefined,
            vendorList: profileRole === "admin" ? undefined : generalVendorList,
            collectionId,
            publishingStatus
          };
        
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
          },
          urlPages: urlPages.filter(p => p.url.trim()).map(p => ({ url: p.url, title: p.title, pageIndex: p.pageIndex }))
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

  async function openEmailHTML() {
    if (!items.length) { alert("Fetch products first."); return; }
    try {
      setEmailGenerating(true);
      
      // Prepare emailTemplateAssignments if template is 'mixed'
      const assignments = emailTemplate === 'mixed' 
        ? items.map((_, index) => emailTemplateAssignments[index] || 'single')
        : undefined;
      
      // Prepare emailInternalsToggle array
      const internalsToggle = items.map((_, index) => emailInternalsToggle[index] || false);
      
      // Apply edited descriptions to items
      const itemsWithEditedDescriptions = items.map((item, index) => {
        if (emailEditedDescriptions[index] !== undefined) {
          return { ...item, description: emailEditedDescriptions[index] };
        }
        return item;
      });
      
      const resp = await fetch("/api/render/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          items: itemsWithEditedDescriptions,
          template: emailTemplate,
          emailTemplateAssignments: assignments,
          emailInternalsToggle: internalsToggle,
          hyperlinkToggle,
          utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
          discountCode: discountCode || undefined,
          discountPercentage: discountPercentage || undefined,
          bannerImageUrl: emailBannerImageUrl.trim() || undefined,
          freeText: emailFreeText.trim() || undefined,
          issuuUrl: emailIssuuUrl.trim() || undefined,
          catalogueImageUrl: emailCatalogueImageUrl.trim() || undefined,
          logoUrls: emailLogoUrls.filter(logo => logo.imageUrl.trim()).length > 0 ? emailLogoUrls.filter(logo => logo.imageUrl.trim()) : undefined,
          lineBreakText: emailLineBreakText.trim() || undefined,
          bannerLinks: (() => {
            const sanitized = emailBannerLinks
              .map(link => ({
                label: link.label.trim(),
                url: link.url.trim()
              }))
              .filter(link => link.label.length > 0 && link.url.length > 0)
              .slice(0, 4);
            return sanitized.length > 0 ? sanitized : undefined;
          })(),
          sectionOrder: emailSectionOrder,
          theme: {
            primaryColor: getBannerColor(hyperlinkToggle),
            buttonColor: emailButtonColor.trim() || undefined,
            buttonTextColor: emailButtonTextColor.trim() || undefined,
            buttonLabel: emailButtonLabel.trim() || undefined,
            buttonBorderRadius: emailButtonBorderRadius.trim() || undefined,
            bannerLinkBgColor: emailBannerLinkBgColor.trim() || undefined,
            bannerLinkTextColor: emailBannerLinkTextColor.trim() || undefined,
            bannerLinkBorderRadius: emailBannerLinkBorderRadius.trim() || undefined
          },
          showFields: {
            subtitle: true,
            author: true,
            description: true,
            price: true,
            imprint: true,
            releaseDate: true
          }
        })
      });
      
      if (!resp.ok) {
        const error = await resp.text();
        alert(`Error generating email HTML: ${error}`);
        return;
      }
      
      const html = await resp.text();
      setEmailHtml(html);
      setShowEmailModal(true);
    } catch (error) {
      alert("Error generating email HTML: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setEmailGenerating(false);
    }
  }
  
  function setItemEmailTemplate(itemIndex: number, template: EmailAssignmentTemplate) {
    setEmailTemplateAssignments({...emailTemplateAssignments, [itemIndex]: template});
  }
  
  function clearItemEmailTemplate(itemIndex: number) {
    const newAssignments = {...emailTemplateAssignments};
    delete newAssignments[itemIndex];
    setEmailTemplateAssignments(newAssignments);
  }

  function copyEmailHtml() {
    navigator.clipboard.writeText(emailHtml).then(() => {
      alert('Email HTML copied to clipboard! You can now paste it into Mailchimp.');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = emailHtml;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Email HTML copied to clipboard!');
      } catch {
        alert('Failed to copy. Please select and copy manually.');
      }
      document.body.removeChild(textArea);
    });
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

  function setItemLayout(index: number, layout: 1|'1L'|2|'2-int'|3|4|8|9|12) {
    setItemLayouts({...itemLayouts, [index]: layout});
  }

  function clearItemLayout(index: number) {
    const newLayouts = {...itemLayouts};
    delete newLayouts[index];
    setItemLayouts(newLayouts);
  }

  function setItemInternalsCount1LValue(index: number, count: number) {
    setItemInternalsCount1L({...itemInternalsCount1L, [index]: count});
  }

  function clearItemInternalsCount1L(index: number) {
    const newCounts = {...itemInternalsCount1L};
    delete newCounts[index];
    setItemInternalsCount1L(newCounts);
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
          itemInternalsCount1L: itemInternalsCount1L,
          internalsCount1L: internalsCount1L,
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
          },
          urlPages: urlPages.filter(p => p.url.trim()).map(p => ({ url: p.url, title: p.title, pageIndex: p.pageIndex }))
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
  function computePageGroups(currentItems: Item[], currentItemLayouts: {[key:number]: 1|'1L'|2|'2-int'|3|4|8|9|12}): PageGroup[] {
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
    
    // Add URL pages at their specified indices
    const urlPagesWithIndices = urlPages
      .map((urlPage, idx) => ({ ...urlPage, originalIndex: idx }))
      .filter(p => p.url.trim() && p.pageIndex !== null && p.pageIndex !== undefined);
    
    // Insert URL pages at their specified indices
    urlPagesWithIndices.forEach(urlPage => {
      const insertIndex = urlPage.pageIndex!;
      if (insertIndex >= 0 && insertIndex <= groups.length) {
        groups.splice(insertIndex, 0, {
          type: 'URL_PAGE',
          index: urlPage.originalIndex,
          url: urlPage.url,
          title: urlPage.title
        });
      }
    });
    
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
      const copy = prev.map(pg => {
        if (pg === 'APPEND') return 'APPEND';
        if (typeof pg === 'object' && 'type' in pg) return pg;
        return [...pg] as PageGroup;
      });
      const [moved] = copy.splice(idx, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }

  function applyPageOrder() {
    // Extract URL pages and their new positions
    const urlPagePositions: {[key: number]: number} = {};
    reorderedPageGroups.forEach((group, newIndex) => {
      if (typeof group === 'object' && 'type' in group && group.type === 'URL_PAGE') {
        urlPagePositions[group.index] = newIndex;
      }
    });
    
    // Update URL pages with their new positions
    const newUrlPages = [...urlPages];
    Object.keys(urlPagePositions).forEach(originalIndex => {
      const idx = parseInt(originalIndex);
      if (newUrlPages[idx]) {
        newUrlPages[idx] = { ...newUrlPages[idx], pageIndex: urlPagePositions[idx] };
      }
    });
    setUrlPages(newUrlPages);
    
    // Flatten new order to a list of old indices (excluding URL pages and APPEND)
    const flatOldIndices = reorderedPageGroups
      .filter(g => g !== 'APPEND' && (typeof g !== 'object' || !('type' in g && g.type === 'URL_PAGE')))
      .flat() as number[];
    
    // Rebuild items
    const newItems = flatOldIndices.map(i => items[i]);
    // Rebuild per-index maps
    const newItemLayouts: {[key:number]: 1|'1L'|2|'2-int'|3|4|8|9|12} = {};
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
        const itemsToUse = getItemsWithEdits();
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
                itemInternalsCount1L: itemInternalsCount1L,
                internalsCount1L: internalsCount1L,
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
                },
                urlPages: urlPages.filter(p => p.url.trim()).map(p => ({ url: p.url, title: p.title, pageIndex: p.pageIndex })),
                twoIntOrientation
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
                items: itemsToUse,
                layout,
                showFields: { authorBio: layout === 1 || layout === '1L' },
                hyperlinkToggle,
                itemBarcodeTypes,
                barcodeType,
                bannerColor: getBannerColor(hyperlinkToggle),
                websiteName: getWebsiteName(hyperlinkToggle),
                utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
                itemInternalsCount1L: layout === '1L' ? itemInternalsCount1L : undefined,
                internalsCount1L: layout === '1L' ? internalsCount1L : undefined,
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
          
          iframe.onload = async () => {
            const loadScript = (src: string) =>
              new Promise<void>((resolveScript, rejectScript) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = () => resolveScript();
                script.onerror = () => rejectScript(new Error(`Failed to load ${src}`));
                document.head.appendChild(script);
              });

            const cleanup = () => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
              URL.revokeObjectURL(htmlUrl);
            };

            try {
              await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
              await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.3/jspdf.umd.min.js');

              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (!iframeDoc) {
                throw new Error('Could not access iframe document');
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const html2canvasLib = (window as Record<string, any>).html2canvas;
              if (!html2canvasLib) {
                throw new Error('html2canvas library not loaded');
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const jsPDF = (window as Record<string, any>).jspdf?.jsPDF;
              if (!jsPDF) {
                throw new Error('jsPDF library not loaded');
              }

              const waitForImages = async () => {
                const images = Array.from(iframeDoc.querySelectorAll('img'));
                await Promise.all(
                  images.map(
                    (img) =>
                      new Promise<void>((resolveImg) => {
                        if (img.complete && img.naturalWidth > 0) {
                          resolveImg();
                          return;
                        }
                        const finalize = () => resolveImg();
                        img.addEventListener('load', finalize, { once: true });
                        img.addEventListener('error', finalize, { once: true });
                      })
                  )
                );
              };

              const blobToDataUrl = (blob: Blob) =>
                new Promise<string>((resolveBlob, rejectBlob) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolveBlob(reader.result as string);
                  reader.onerror = () => rejectBlob(new Error('Failed to read blob'));
                  reader.readAsDataURL(blob);
                });

              const inlineImages = async () => {
                const images = Array.from(iframeDoc.querySelectorAll('img'));
                await Promise.all(
                  images.map(async (img) => {
                    const src = img.getAttribute('src');
                    if (!src || src.startsWith('data:')) return;
                    try {
                      const resp = await fetch(src);
                      if (!resp.ok) {
                        throw new Error(`Image request failed with status ${resp.status}`);
                      }
                      const blob = await resp.blob();
                      const dataUrl = await blobToDataUrl(blob);
                      img.setAttribute('src', dataUrl);
                    } catch (imageError) {
                      console.warn('Failed to inline image for PDF generation', src, imageError);
                    }
                  })
                );
              };

              await waitForImages();
              await inlineImages();

              const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
              });

              const bodyEl = iframeDoc.body;
              const pages = Array.from(bodyEl.querySelectorAll('.page, .cover-page')) as HTMLElement[];

              if (pages.length === 0) {
                throw new Error('No pages found in HTML');
              }

              const a4Width = 210;
              const a4Height = 297;

              for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
                const page = pages[pageIndex];
                const pageWidth = page.scrollWidth || page.clientWidth || 794;
                const pageHeight = page.scrollHeight || page.clientHeight || 1123;
                const pageRect = page.getBoundingClientRect();
                const anchorTargets = Array.from(page.querySelectorAll('a[href]')).map((anchor) => {
                  const rect = anchor.getBoundingClientRect();
                  return {
                    href: anchor.getAttribute('href') || '',
                    x: rect.left - pageRect.left,
                    y: rect.top - pageRect.top,
                    width: rect.width,
                    height: rect.height,
                  };
                });

                const canvas = await html2canvasLib(page, {
                  scale: 2,
                  useCORS: true,
                  logging: false,
                  backgroundColor: '#ffffff',
                  width: pageWidth,
                  height: pageHeight,
                  windowWidth: pageWidth,
                  windowHeight: pageHeight,
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.98);

                if (pageIndex > 0) {
                  pdf.addPage();
                }

                let renderWidth = a4Width;
                let renderHeight = (pageHeight / pageWidth) * renderWidth;

                if (renderHeight > a4Height) {
                  const scaleRatio = a4Height / renderHeight;
                  renderHeight = a4Height;
                  renderWidth = renderWidth * scaleRatio;
                }

                const xOffset = (a4Width - renderWidth) / 2;
                const yOffset = (a4Height - renderHeight) / 2;
                pdf.addImage(imgData, 'JPEG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'MEDIUM');

                const xScale = renderWidth / pageWidth;
                const yScale = renderHeight / pageHeight;
                anchorTargets.forEach((target) => {
                  if (!target.href || target.width === 0 || target.height === 0) return;
                  const linkX = xOffset + target.x * xScale;
                  const linkY = yOffset + target.y * yScale;
                  const linkWidth = target.width * xScale;
                  const linkHeight = target.height * yScale;
                  try {
                    pdf.link(linkX, linkY, linkWidth, linkHeight, { url: target.href });
                  } catch {
                    // Ignore individual link failures
                  }
                });
              }

              const pdfBase64 = pdf.output('datauristring');
              cleanup();
              resolve(pdfBase64);
            } catch (error) {
              cleanup();
              reject(error instanceof Error ? error : new Error('Failed to generate PDF'));
            }
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

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.replace("/reset-password");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabaseClient]);

  if (!session) {
    return (
      <div
        style={{
          padding: 32,
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 24px 48px rgba(15, 23, 42, 0.12)",
            width: "100%",
            maxWidth: 440,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#2C3E50",
                margin: 0,
              }}
            >
              Woodslane Catalogue Creator
            </h1>
            <p
              style={{
                color: "#475569",
                fontSize: 16,
                margin: "12px 0 0",
              }}
            >
              Sign in to access saved catalogues and build layouts.
            </p>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSignIn();
            }}
            style={{ display: "grid", gap: 12 }}
          >
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#475569" }}>
              Email address
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5f5",
                  fontSize: 14,
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "#475569" }}>
              Password
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Password"
                required
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5f5",
                  fontSize: 14,
                }}
              />
            </label>
            <button
              type="submit"
              disabled={authLoading}
              style={{
                marginTop: 8,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 14,
                cursor: authLoading ? "wait" : "pointer",
              }}
            >
              {authLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
            Use your Supabase admin credentials. Contact an administrator if you need an account.
          </p>

          {authMessage && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: authMessage.type === "success" ? "#15803d" : "#b91c1c",
              }}
            >
              {authMessage.text}
            </div>
          )}
        </div>
      </div>
    );
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
            Woodslane Catalogue Creator
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

        <div
          style={{
            marginBottom: 24,
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 20,
            background: "#f8fafc",
          }}
        >
          <h2 style={{ margin: "0 0 12px", fontSize: 18, color: "#1f2937" }}>Account</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 14, color: "#475569" }}>
              Signed in as <strong>{session.user.email}</strong>
            </span>
            <button
              onClick={handleSignOut}
              disabled={authLoading}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5f5",
                background: "#e2e8f0",
                color: "#1f2937",
                cursor: authLoading ? "wait" : "pointer",
                fontSize: 13,
              }}
            >
              Sign out
            </button>
            {isAdmin && (
              <Link
                href="/admin/users"
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #2563eb",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: 13,
                  textDecoration: "none",
                }}
              >
                Manage users
              </Link>
            )}
          </div>
          {authMessage && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: authMessage.type === "success" ? "#15803d" : "#b91c1c",
              }}
            >
              {authMessage.text}
            </div>
          )}
        </div>

        {canSaveCatalogues && (
          <>
            <SavedCataloguesPanel
              onOpenCatalogue={handleOpenCatalogue}
              onStartNewCatalogue={startNewCatalogue}
              refreshToken={catalogueRefreshToken}
            />

            <div style={{ margin: "24px 0" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={handleSaveCatalogue}
                  disabled={isSavingCatalogue}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "1px solid #2563eb",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: isSavingCatalogue ? "wait" : "pointer",
                    fontSize: 14,
                    minWidth: 200,
                  }}
                >
                  {isSavingCatalogue
                    ? "Saving…"
                    : session
                      ? activeCatalogueId
                        ? "Update saved catalogue"
                        : "Save catalogue"
                      : "Sign in to save"}
                </button>
                {isLoadingCatalogue && (
                  <span style={{ fontSize: 13, color: "#64748b" }}>Loading catalogue…</span>
                )}
              </div>
              {saveFeedback && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "12px 16px",
                    borderRadius: 8,
                    border:
                      saveFeedback.type === "success"
                        ? "1px solid #86efac"
                        : "1px solid #fecaca",
                    background:
                      saveFeedback.type === "success" ? "#dcfce7" : "#fee2e2",
                    color: saveFeedback.type === "success" ? "#166534" : "#b91c1c",
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  {saveFeedback.text}
                </div>
              )}
            </div>
          </>
        )}

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
          <div style={{ display: "flex", justifyContent: "center", gap: "12px", alignItems: "center" }}>
            <input
              type="text"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              placeholder="Enter discount code (e.g., 'SAVE20', 'SPRING2025')"
              style={{
                width: "100%",
                maxWidth: "250px",
                padding: "12px 16px",
                border: "2px solid #E2E8F0",
                borderRadius: "8px",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
            {discountCode && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(e.target.value)}
                  placeholder="15"
                  style={{
                    width: "80px",
                    padding: "12px 16px",
                    border: "2px solid #E2E8F0",
                    borderRadius: "8px",
                    fontSize: "16px",
                    outline: "none",
                    transition: "border-color 0.2s",
                    textAlign: "center"
                  }}
                />
                <span style={{ fontSize: "16px", fontWeight: "600", color: "#4A5568" }}>%</span>
              </div>
            )}
          </div>
          {discountCode && (
            <div style={{ marginTop: "8px", fontSize: "14px", color: "#718096" }}>
              Discount message will show: &quot;save {discountPercentage || '15'}% off your order*&quot;
            </div>
          )}
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
        <Field label="Vendor">
          {profileRole === "admin" || !allowedVendors || allowedVendors.length === 0 ? (
            <input value={vendor} onChange={e=>setVendor(e.target.value)} placeholder="Human Kinetics" />
          ) : allowedVendors.length === 1 ? (
            <input value={allowedVendors[0]} readOnly disabled style={{ cursor: "not-allowed" }} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#6C757D" }}>
                Select one or more vendors to include. Leave all selected to search across every allowed vendor.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {allowedVendors.map((value) => {
                  const isChecked = selectedAllowedVendors.includes(value);
                  return (
                    <label key={value} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleAllowedVendor(value)}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                      <span style={{ fontSize: 14, color: "#495057" }}>{value}</span>
                      {selectedAllowedVendors.length > 1 && isChecked && (
                        <button
                          type="button"
                          onClick={() => selectOnlyAllowedVendor(value)}
                          style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            border: "1px solid #cbd5f5",
                            borderRadius: 6,
                            padding: "4px 8px",
                            background: "#f1f5f9",
                            cursor: "pointer",
                          }}
                        >
                          Only
                        </button>
                      )}
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={selectAllAllowedVendors}
                  style={{
                    border: "1px solid #cbd5f5",
                    borderRadius: 6,
                    padding: "6px 10px",
                    background: "#e7eefc",
                    color: "#1f2937",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (allowedVendors && allowedVendors.length > 0) {
                      setSelectedAllowedVendors([allowedVendors[0]]);
                    }
                  }}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    padding: "6px 10px",
                    background: "#f8fafc",
                    color: "#334155",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Clear to one
                </button>
              </div>
            </div>
          )}
        </Field>
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

      {/* Fetch Products Button - Own Line */}
      <div style={{ marginTop: 12 }}>
        <button onClick={fetchItems} disabled={loading} style={btn()}>{loading ? "Loading..." : "Fetch Products"}</button>
      </div>

      {/* Layout Options - Own Line */}
      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span>Layout:</span>
        {[1,2,3,4,8,9,12].map(n => (
          <button key={n} onClick={()=>setLayout(n as 1|2|3|4|8|9|12)} style={btn(n===layout)}>{n}-up</button>
        ))}
        <button onClick={()=>setLayout('1L')} style={btn(layout==='1L')}>1L</button>
        {layout === '1L' && (
          <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 600, color: "#495057" }}>Internals:</span>
        )}
        {layout === '1L' && (
          <select 
            value={internalsCount1L} 
            onChange={(e) => setInternalsCount1L(parseInt(e.target.value))}
            style={{
              padding: "6px 12px",
              fontSize: 14,
              border: "1px solid #ddd",
              borderRadius: 4,
              backgroundColor: "white",
              cursor: "pointer"
            }}
          >
            {[1, 2].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        )}
        <button onClick={()=>setLayout('2-int')} style={btn(layout==='2-int')}>2-int</button>
        {layout === '2-int' && (
          <select
            value={twoIntOrientation}
            onChange={(e) => {
              const newOrientation = e.target.value as 'portrait' | 'landscape';
              setTwoIntOrientation(newOrientation);
              layoutRegistry.setTwoIntOrientation(newOrientation);
            }}
            style={{
              marginLeft: 8,
              padding: "6px 12px",
              fontSize: 12,
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "white",
              cursor: "pointer"
            }}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        )}
      </div>

      {/* Barcode Type - Own Line */}
      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#495057" }}>Barcode Type:</span>
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
        {hyperlinkButtonOptions.map(option => (
          <button 
            key={option.value}
            onClick={() => setHyperlinkToggle(option.value)}
            disabled={hyperlinkSelectionLocked}
            style={{
              ...btn(hyperlinkToggle === option.value),
              fontSize: 12,
              padding: "6px 12px",
              opacity: hyperlinkSelectionLocked ? 0.6 : 1,
              cursor: hyperlinkSelectionLocked ? "not-allowed" : "pointer"
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

      {isAdmin && (
        <>
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                    <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>
                        Background Colour:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="color"
                          value={isValidHexColor(emailBannerLinkBgColor) ? emailBannerLinkBgColor : '#ffffff'}
                          onChange={(event) => setEmailBannerLinkBgColor(event.target.value)}
                          style={{ width: 44, height: 28, border: '1px solid #CED4DA', borderRadius: 6, padding: 0 }}
                          aria-label="Banner link background colour"
                        />
                        <input
                          type="text"
                          value={emailBannerLinkBgColor}
                          onChange={(event) => setEmailBannerLinkBgColor(event.target.value)}
                          placeholder="e.g. rgba(255,255,255,0.18) or #ffffff"
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            border: '1px solid #DEE2E6',
                            borderRadius: 6,
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: '#6c757d', marginTop: 4 }}>
                        Use the picker for hex colours or type any valid CSS colour value.
                      </div>
                    </div>
                    <div style={{ flex: '1 1 240px', minWidth: 200 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>
                        Text Colour:
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="color"
                          value={isValidHexColor(emailBannerLinkTextColor) ? emailBannerLinkTextColor : '#ffffff'}
                          onChange={(event) => setEmailBannerLinkTextColor(event.target.value)}
                          style={{ width: 44, height: 28, border: '1px solid #CED4DA', borderRadius: 6, padding: 0 }}
                          aria-label="Banner link text colour"
                        />
                        <input
                          type="text"
                          value={emailBannerLinkTextColor}
                          onChange={(event) => setEmailBannerLinkTextColor(event.target.value)}
                          placeholder="e.g. #ffffff"
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            border: '1px solid #DEE2E6',
                            borderRadius: 6,
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: '#6c757d', marginTop: 4 }}>
                        Supports hex via the picker or any CSS colour value typed in.
                      </div>
                    </div>
                    <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>
                        Button Shape:
                      </label>
                      <select
                        value={emailBannerLinkBorderRadius}
                        onChange={(event) => setEmailBannerLinkBorderRadius(event.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #DEE2E6',
                          borderRadius: 6,
                          fontSize: 12,
                          background: '#FFFFFF'
                        }}
                      >
                        {BUTTON_SHAPE_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 6,
                      border: '1px dashed #CED4DA',
                      background: getBannerColor(hyperlinkToggle),
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8
                    }}
                  >
                    {emailBannerLinks.some(link => link.label.trim() && link.url.trim()) ? (
                      emailBannerLinks
                        .filter(link => link.label.trim() && link.url.trim())
                        .map((link, index) => (
                          <span
                            key={`${link.label}-${index}`}
                            style={{
                              display: 'inline-block',
                              padding: '8px 14px',
                              background: emailBannerLinkBgColor || DEFAULT_BANNER_LINK_BG_COLOR,
                              color: emailBannerLinkTextColor || DEFAULT_BANNER_LINK_TEXT_COLOR,
                              borderRadius: emailBannerLinkBorderRadius || DEFAULT_BANNER_LINK_BORDER_RADIUS,
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            {link.label.trim() || `Link ${index + 1}`}
                          </span>
                        ))
                    ) : (
                      <span style={{ fontSize: 12, color: '#FFFFFF', opacity: 0.85 }}>
                        Preview updates once you add labels and URLs.
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                  Add 1-4 image URLs. Layout will automatically adjust based on number of images.
                </div>
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
        </>
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

      {/* URL Pages Section */}
      {profileRole === "admin" && (
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
          <span style={{ fontSize: 16, fontWeight: 600, color: "#495057" }}>🔗 URL Pages</span>
          <span style={{ fontSize: 12, color: "#6C757D" }}>(Up to 4 URLs - Each creates an A4 page)</span>
        </div>
        
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} style={{ marginBottom: 12, padding: 12, background: "white", borderRadius: 8, border: "1px solid #E9ECEF" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 4 }}>
                  URL {index + 1}:
                </label>
                <input 
                  type="url"
                  value={urlPages[index]?.url || ""} 
                  onChange={e => {
                    const newPages = [...urlPages];
                    newPages[index] = { 
                      url: e.target.value.trim(), 
                      title: newPages[index]?.title || '', 
                      pageIndex: newPages[index]?.pageIndex || null 
                    };
                    setUrlPages(newPages);
                  }} 
                  placeholder="https://example.com/page" 
                  style={{ 
                    width: "100%",
                    fontSize: 12,
                    padding: "8px 10px",
                    border: "1px solid #DEE2E6",
                    borderRadius: 6
                  }}
                />
              </div>
              <div style={{ width: 140 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 4 }}>
                  Page Index:
                </label>
                <input
                  type="number"
                  min="0"
                  value={urlPages[index]?.pageIndex ?? ''}
                  onChange={e => {
                    const newPages = [...urlPages];
                    if (urlPages[index]?.url) {
                      const pageIndex = e.target.value === '' ? null : parseInt(e.target.value);
                      newPages[index] = { ...newPages[index], pageIndex: pageIndex };
                      setUrlPages(newPages);
                    }
                  }}
                  placeholder="Page #"
                  disabled={!urlPages[index]?.url}
                  style={{ 
                    width: "100%",
                    fontSize: 12,
                    padding: "8px 10px",
                    border: "1px solid #DEE2E6",
                    borderRadius: 6,
                    background: urlPages[index]?.url ? "white" : "#F5F5F5"
                  }}
                />
                <div style={{ fontSize: 10, color: "#6C757D", marginTop: 2 }}>
                  Use reorder modal to set
                </div>
              </div>
            </div>
            {urlPages[index]?.url && (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#495057", marginBottom: 4 }}>
                  Page Title (Optional):
                </label>
                <input 
                  type="text"
                  value={urlPages[index]?.title || ""} 
                  onChange={e => {
                    const newPages = [...urlPages];
                    newPages[index] = { 
                      ...newPages[index], 
                      title: e.target.value.trim() 
                    };
                    setUrlPages(newPages);
                  }} 
                  placeholder="Auto-generated from URL" 
                  style={{ 
                    width: "100%",
                    fontSize: 12,
                    padding: "8px 10px",
                    border: "1px solid #DEE2E6",
                    borderRadius: 6
                  }}
                />
              </div>
            )}
          </div>
        ))}
        
                <div style={{ fontSize: 12, color: "#6C757D", marginTop: 8 }}>
          💡 Each URL will create a full A4 page. Use the &quot;Preview &amp; Reorder Pages&quot; button to set page positions and reorder. Images will be displayed directly in A4 format.
        </div>
      </div>
      )}

          {/* Fixed Layout Exports */}
          <div style={{ marginTop: 24 }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#495057" }}>Fixed Layout Exports</h3>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button onClick={openPrintView} disabled={!items.length} style={btn()}>📄 HTML Print View</button>
              {isAdmin && (
                <>
                  <button onClick={downloadDocx} disabled={!items.length} style={btn()}>📝 Download DOCX</button>
                  <button onClick={openGoogleDocs} disabled={!items.length} style={btn()}>📊 Google Docs Import</button>
                  <button onClick={openGoogleAppsScript} disabled={!items.length} style={btn()}>🚀 Create Google Doc</button>
                </>
              )}
              <button onClick={openListView} disabled={!items.length} style={btn()}>📋 List View</button>
              <button onClick={openCompactListView} disabled={!items.length} style={btn()}>📋 Compact List</button>
              <button onClick={openTableView} disabled={!items.length} style={btn()}>📊 Table View</button>
              {isAdmin && (
                <button onClick={openEmailHTML} disabled={!items.length || emailGenerating} style={btn()}>
                  {emailGenerating ? '⏳ Generating...' : '📧 Email HTML'}
                </button>
              )}
              <button onClick={() => openEmailWithOutlook('single')} disabled={!items.length || emailGenerating} style={btn()}>
                {emailGenerating ? '⏳ Generating PDF...' : '📧 Outlook - PDF'}
              </button>
            </div>
          </div>


          {/* Mixed Layout View */}
          {items.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 600, color: "#495057" }}>Mixed Layout View</h3>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
                {isAdmin && (
                  <button onClick={openGoogleAppsScriptMixed} disabled={!items.length} style={btn()}>
                    🚀 Mixed Google Doc
                  </button>
                )}
                <button onClick={() => openEmailWithOutlook('mixed')} disabled={!items.length || emailGenerating} style={btn()}>
                  {emailGenerating ? '⏳ Generating PDF...' : '📧 Outlook - Mixed Layout (PDF)'}
                </button>
                {showOrderEditor && (
                  <span style={{ fontSize: 13, color: '#656F91' }}>
                    💡 Use arrows to reorder items, assign layouts, or enter position numbers
                  </span>
                )}
              </div>
            </div>
          )}


      <hr style={{ margin: "32px 0", border: "none", height: "2px", background: "linear-gradient(90deg, transparent, #E9ECEF, transparent)" }} />
      <Preview items={items} layout={layout} showOrderEditor={showOrderEditor} moveItemUp={moveItemUp} moveItemDown={moveItemDown} moveItemToPosition={moveItemToPosition} itemLayouts={itemLayouts} setItemLayout={setItemLayout} clearItemLayout={clearItemLayout} itemBarcodeTypes={itemBarcodeTypes} setItemBarcodeType={setItemBarcodeType} clearItemBarcodeType={clearItemBarcodeType} itemAuthorBioToggle={itemAuthorBioToggle} setItemAuthorBioToggle={setItemAuthorBioEnabled} clearItemAuthorBioToggle={clearItemAuthorBioToggle} itemInternalsCount1L={itemInternalsCount1L} setItemInternalsCount1L={setItemInternalsCount1LValue} clearItemInternalsCount1L={clearItemInternalsCount1L} internalsCount1L={internalsCount1L} hyperlinkToggle={hyperlinkToggle} generateProductUrl={generateProductUrl} isMixedView={isMixedView} openEditModal={openEditModal} editedContent={editedContent} setItemFooterNote={setItemFooterNote} previousEditionIsbns={previousEditionIsbns} handlePreviousEditionIsbnChange={handlePreviousEditionIsbnChange} moreFromAuthorIsbns={moreFromAuthorIsbns} handleMoreFromAuthorIsbnChange={handleMoreFromAuthorIsbnChange} loadingMoreFromAuthor={loadingMoreFromAuthor} moreFromAuthorImages={moreFromAuthorImages} />
      
      {/* Edit Modal */}
      {editModalOpen && editingItemIndex !== null && editingField !== null && <EditModal 
        item={items[editingItemIndex]}
        editedItem={editedContent[editingItemIndex]}
        editingField={editingField}
        itemLayout={itemLayouts[editingItemIndex] || (typeof layout === 'number' ? layout : layout === '1L' ? '1L' : 4) as 1|'1L'|2|'2-int'|3|4|8|9|12}
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
                  // Check if this is a URL page
                  if (typeof group === 'object' && 'type' in group && group.type === 'URL_PAGE') {
                    const urlPage = group;
                    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(urlPage.url);
                    return (
                      <div key={`url-page-${urlPage.index}`} style={{border:'2px solid #667eea',borderRadius:10,padding:10,background:'#f0f4ff'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <strong>Page {i+1}</strong>
                          <span style={{fontSize:12,color:'#667eea',fontWeight:600}}>🔗 URL Page {isImage ? '(Image)' : ''}</span>
                        </div>
                        <div style={{fontSize:12,color:'#495057',marginBottom:8,wordBreak:'break-all'}}>
                          {urlPage.title || urlPage.url}
                        </div>
                        <div style={{fontSize:11,color:'#6c757d',marginBottom:8}}>
                          {isImage ? 'Will display as image' : 'Will show QR code'}
                        </div>
                        <div style={{display:'flex',gap:8,marginTop:10}}>
                          <button onClick={()=>{
                            const newPages = [...urlPages];
                            newPages[urlPage.index] = { ...newPages[urlPage.index], pageIndex: i };
                            setUrlPages(newPages);
                          }} style={btn(true)}>✓ Set Position</button>
                          <button onClick={()=>movePage(i,-1)} style={btn(false)} disabled={i===0}>↑ Move Up</button>
                          <button onClick={()=>movePage(i,1)} style={btn(false)} disabled={i===reorderedPageGroups.length-1}>↓ Move Down</button>
                        </div>
                      </div>
                    );
                  }
                  // Type guard: ensure group is an array
                  if (typeof group === 'object' && 'type' in group) {
                    // This should never happen as URL pages are handled above
                    return null;
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
      
      {/* Email HTML Modal */}
      {showEmailModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 20
        }} onClick={(e) => {
          if (e.target === e.currentTarget) setShowEmailModal(false);
        }}>
          <div style={{
            background: 'white',
            borderRadius: 12,
            padding: 24,
            width: '90vw',
            maxWidth: 1200,
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 600, color: '#495057' }}>
                📧 Email HTML - Ready for Mailchimp
              </h3>
              
              {/* Email Configuration Fields */}
              <div style={{ marginBottom: 16, padding: 16, background: '#F8F9FA', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#495057' }}>Email Configuration:</h4>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#495057' }}>
                    Banner Image URL (Optional):
                  </label>
                  <input
                    type="text"
                    value={emailBannerImageUrl}
                    onChange={(e) => setEmailBannerImageUrl(e.target.value)}
                    placeholder="https://example.com/banner-image.jpg"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #E9ECEF',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#495057' }}>
                    Free Text (Optional):
                  </label>
                  <textarea
                    value={emailFreeText}
                    onChange={(e) => setEmailFreeText(e.target.value)}
                    placeholder="Enter any additional text you'd like to appear in the email..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #E9ECEF',
                      borderRadius: 6,
                      fontSize: 13,
                      resize: 'vertical'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#495057' }}>
                    Discount Code: {discountCode ? <span style={{ color: '#28a745', fontWeight: 600 }}>(Active: {discountCode})</span> : <span style={{ color: '#6c757d' }}>(None - separator will be plain)</span>}
                  </label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <input
                      type="text"
                      value={discountCode || ''}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      placeholder="Enter discount code (e.g., SAVE20)"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        border: '2px solid #E9ECEF',
                        borderRadius: 6,
                        fontSize: 13
                      }}
                    />
                    {discountCode && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercentage || '15'}
                          onChange={(e) => setDiscountPercentage(e.target.value)}
                          placeholder="%"
                          style={{
                            width: '70px',
                            padding: '8px 12px',
                            border: '2px solid #E9ECEF',
                            borderRadius: 6,
                            fontSize: 13,
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: 13, color: '#495057' }}>%</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                    If populated, a discount message will appear in the separator above products. Otherwise, just a colored separator bar.
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#495057' }}>
                      Banner Links (Optional - up to 4):
                    </label>
                    <span style={{ fontSize: 11, color: '#6c757d' }}>
                      These appear in the coloured banner when no discount code is provided.
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#6c757d', margin: '6px 0 10px' }}>
                    Add quick website links such as category pages. Provide both a label and URL for each link.
                    If a discount code is set, it will take priority instead of these links.
                  </div>
                  {emailBannerLinks.map((link, index) => (
                    <div key={index} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, padding: 8, background: '#FFFFFF', borderRadius: 6, border: '1px solid #E9ECEF' }}>
                      <div style={{ flex: '1 1 180px', minWidth: 160 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>
                          Link Label {index + 1}
                        </label>
                        <input
                          type="text"
                          value={link.label}
                          onChange={(event) => {
                            const next = [...emailBannerLinks];
                            next[index] = { ...next[index], label: event.target.value };
                            setEmailBannerLinks(next);
                          }}
                          placeholder="e.g. Psychology"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: '1px solid #DEE2E6',
                            borderRadius: 6,
                            fontSize: 12
                          }}
                        />
                      </div>
                      <div style={{ flex: '2 1 260px', minWidth: 220 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6c757d', marginBottom: 4 }}>
                          Link URL {index + 1}
                        </label>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(event) => {
                            const next = [...emailBannerLinks];
                            next[index] = { ...next[index], url: event.target.value };
                            setEmailBannerLinks(next);
                          }}
                          placeholder="https://www.example.com/path"
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: '1px solid #DEE2E6',
                            borderRadius: 6,
                            fontSize: 12,
                            fontFamily: 'monospace'
                          }}
                        />
                      </div>
                      {(link.label.trim().length > 0 || link.url.trim().length > 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...emailBannerLinks];
                            next[index] = { label: '', url: '' };
                            setEmailBannerLinks(next);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #CED4DA',
                            background: '#F8F9FA',
                            fontSize: 12,
                            color: '#495057',
                            cursor: 'pointer'
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#495057' }}>
                    ISSUU Catalogue URL (Optional):
                  </label>
                  <input
                    type="text"
                    value={emailIssuuUrl}
                    onChange={(e) => setEmailIssuuUrl(e.target.value)}
                    placeholder="https://issuu.com/woodslane/docs/catalogue..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #E9ECEF',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                    If provided, a link to view the catalogue will appear after the products section.
                  </div>
                </div>
                
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#495057' }}>
                    Catalogue Image URL (Optional):
                  </label>
                  <input
                    type="text"
                    value={emailCatalogueImageUrl}
                    onChange={(e) => setEmailCatalogueImageUrl(e.target.value)}
                    placeholder="https://example.com/catalogue-cover.jpg"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #E9ECEF',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                    If provided (together with an ISSUU URL), this image will be displayed as a clickable thumbnail linking to the catalogue. If not provided, the system will try to generate one from the ISSUU URL. The catalogue block only appears when an ISSUU URL is supplied.
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#495057' }}>
                    Product Button Label (Optional):
                  </label>
                  <input
                    type="text"
                    value={emailButtonLabel}
                    onChange={(e) => setEmailButtonLabel(e.target.value)}
                    placeholder='Shop Now →'
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #E9ECEF',
                      borderRadius: 6,
                      fontSize: 13
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                    Leave blank to use the default &ldquo;Shop Now →&rdquo; text. This label is used for all product call-to-action buttons.
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
                    Product Button Colours:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#6c757d' }}>Background:</label>
                      <input
                        type="color"
                        value={emailButtonColor}
                        onChange={(e) => setEmailButtonColor(e.target.value)}
                        style={{ width: 44, height: 28, border: '1px solid #CED4DA', borderRadius: 6, padding: 0 }}
                        aria-label="Product button background colour"
                      />
                      <code style={{ fontSize: 12, color: '#6c757d' }}>{emailButtonColor}</code>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#6c757d' }}>Text:</label>
                      <input
                        type="color"
                        value={emailButtonTextColor}
                        onChange={(e) => setEmailButtonTextColor(e.target.value)}
                        style={{ width: 44, height: 28, border: '1px solid #CED4DA', borderRadius: 6, padding: 0 }}
                        aria-label="Product button text colour"
                      />
                      <code style={{ fontSize: 12, color: '#6c757d' }}>{emailButtonTextColor}</code>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6c757d', marginBottom: 6 }}>
                      Button Shape:
                    </label>
                    <select
                      value={emailButtonBorderRadius}
                      onChange={(event) => setEmailButtonBorderRadius(event.target.value)}
                      style={{
                        width: '100%',
                        maxWidth: 220,
                        padding: '8px 12px',
                        border: '1px solid #CED4DA',
                        borderRadius: 6,
                        fontSize: 13,
                        background: '#FFFFFF'
                      }}
                    >
                      {BUTTON_SHAPE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                      Controls the corner style of all call-to-action buttons.
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '10px 24px',
                        background: emailButtonColor || '#007bff',
                        color: emailButtonTextColor || '#ffffff',
                        borderRadius: emailButtonBorderRadius || '4px',
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      {emailButtonLabel.trim() || 'Shop Now →'}
                    </span>
                  </div>
                </div>
                
                {/* Logo URLs Section (up to 4) */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#495057' }}>
                    Logo URLs (Optional - up to 4):
                  </label>
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index} style={{ marginBottom: 12, padding: 12, border: '1px solid #E9ECEF', borderRadius: 6, background: '#F8F9FA' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#495057', marginBottom: 6 }}>Logo {index + 1}:</div>
                      <input
                        type="text"
                        value={emailLogoUrls[index]?.imageUrl || ''}
                        onChange={(e) => {
                          const newLogoUrls = [...emailLogoUrls];
                          newLogoUrls[index] = { ...newLogoUrls[index], imageUrl: e.target.value };
                          setEmailLogoUrls(newLogoUrls);
                        }}
                        placeholder={`Image URL (e.g., https://example.com/logo${index + 1}.png)`}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '2px solid #E9ECEF',
                          borderRadius: 6,
                          fontSize: 13,
                          fontFamily: 'monospace',
                          marginBottom: 8
                        }}
                      />
                      <input
                        type="text"
                        value={emailLogoUrls[index]?.destinationUrl || ''}
                        onChange={(e) => {
                          const newLogoUrls = [...emailLogoUrls];
                          newLogoUrls[index] = { ...newLogoUrls[index], destinationUrl: e.target.value };
                          setEmailLogoUrls(newLogoUrls);
                        }}
                        placeholder={`Destination URL (e.g., https://example.com) - Optional`}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '2px solid #E9ECEF',
                          borderRadius: 6,
                          fontSize: 13,
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                    Add up to 4 logos. Each logo can have an image URL and an optional destination URL (for clickable logos).
                  </div>
                </div>
                
                {/* Line Break Text Section */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#495057' }}>
                    Line Break Text (Optional):
                  </label>
                  <textarea
                    value={emailLineBreakText}
                    onChange={(e) => setEmailLineBreakText(e.target.value)}
                    placeholder="Enter text that will appear on a line break with spacing..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #E9ECEF',
                      borderRadius: 6,
                      fontSize: 13,
                      resize: 'vertical'
                    }}
                  />
                  <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                    This text will appear with line breaks and spacing above and below. Supports multiple lines.
                  </div>
                </div>
              </div>
              
              {/* Drag and Drop Section Order */}
              <div style={{ marginBottom: 16, padding: 16, background: '#F8F9FA', borderRadius: 8, border: '2px solid #E9ECEF' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#495057' }}>📋 Section Order (Drag to Reorder):</h4>
                <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 12 }}>
                  Drag sections to reorder them in the email. Only sections with content will appear.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {emailSectionOrder.map((sectionId, index) => {
                    const sectionLabels: {[key: string]: string} = {
                      'bannerImage': '🖼️ Banner Image',
                      'freeText': '📝 Free Text',
                      'logoSection': '🎨 Logo Section (up to 4)',
                      'lineBreakText': '📄 Line Break Text',
                      'products': '📦 Products',
                      'issuuCatalogue': '📚 ISSUU Catalogue'
                    };
                    const sectionEnabled: {[key: string]: boolean} = {
                      'bannerImage': !!emailBannerImageUrl.trim(),
                      'freeText': !!emailFreeText.trim(),
                      'logoSection': emailLogoUrls.filter(logo => logo.imageUrl.trim()).length > 0,
                      'lineBreakText': !!emailLineBreakText.trim(),
                      'products': items.length > 0,
                      'issuuCatalogue': !!emailIssuuUrl.trim()
                    };
                    const label = sectionLabels[sectionId] || sectionId;
                    const enabled = sectionEnabled[sectionId];
                    
                    return (
                      <div
                        key={sectionId}
                        draggable
                        onDragStart={(e) => {
                          setDraggedSection(sectionId);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!draggedSection || draggedSection === sectionId) return;
                          const newOrder = [...emailSectionOrder];
                          const draggedIndex = newOrder.indexOf(draggedSection);
                          const targetIndex = newOrder.indexOf(sectionId);
                          newOrder.splice(draggedIndex, 1);
                          newOrder.splice(targetIndex, 0, draggedSection);
                          setEmailSectionOrder(newOrder);
                          setDraggedSection(null);
                        }}
                        onDragEnd={() => setDraggedSection(null)}
                        style={{
                          padding: '12px 16px',
                          background: enabled ? (draggedSection === sectionId ? '#E3F2FD' : 'white') : '#F5F5F5',
                          border: `2px solid ${draggedSection === sectionId ? '#2196F3' : '#E9ECEF'}`,
                          borderRadius: 6,
                          cursor: 'move',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          opacity: enabled ? 1 : 0.5,
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: 18, cursor: 'grab' }}>⋮⋮</span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: enabled ? '#495057' : '#6c757d' }}>
                          {index + 1}. {label}
                        </span>
                        {!enabled && (
                          <span style={{ fontSize: 11, color: '#dc3545', fontStyle: 'italic' }}>
                            (Not configured)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <select
                  value={emailTemplate}
                  onChange={async (e) => {
                    const newTemplate = e.target.value as typeof emailTemplate;
                    setEmailTemplate(newTemplate);
                    // Re-generate with new template
                    if (items.length) {
                      setEmailGenerating(true);
                      try {
                        const assignments = newTemplate === 'mixed' 
                          ? items.map((_, index) => emailTemplateAssignments[index] || 'single')
                          : undefined;
                        
                        const resp = await fetch("/api/render/email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            items,
                            template: newTemplate,
                            emailTemplateAssignments: assignments,
                            hyperlinkToggle,
                            utmParams: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
                            discountCode: discountCode || undefined,
                            discountPercentage: discountPercentage || undefined,
                            bannerImageUrl: emailBannerImageUrl.trim() || undefined,
                            freeText: emailFreeText.trim() || undefined,
                            issuuUrl: emailIssuuUrl.trim() || undefined,
                            catalogueImageUrl: emailCatalogueImageUrl.trim() || undefined,
                            sectionOrder: emailSectionOrder,
                            theme: {
                              primaryColor: getBannerColor(hyperlinkToggle),
                              buttonColor: emailButtonColor.trim() || undefined,
                              buttonTextColor: emailButtonTextColor.trim() || undefined,
                              buttonLabel: emailButtonLabel.trim() || undefined
                            },
                            showFields: {
                              subtitle: true,
                              author: true,
                              description: true,
                              price: true,
                              imprint: true,
                              releaseDate: true
                            },
                            emailInternalsToggle: items.map((_, idx) => emailInternalsToggle[idx] || false)
                          })
                        });
                        if (resp.ok) {
                          const html = await resp.text();
                          setEmailHtml(html);
                        }
                      } catch (error) {
                        alert("Error generating email HTML: " + (error instanceof Error ? error.message : "Unknown error"));
                      } finally {
                        setEmailGenerating(false);
                      }
                    }
                  }}
                  style={{
                    border: '2px solid #E9ECEF',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: 14,
                    background: '#FAFBFC',
                    cursor: 'pointer'
                  }}
                >
                  <option value="single">Single Product</option>
                  <option value="grid-2">Grid (2 products)</option>
                  <option value="grid-3">Grid (3 products)</option>
                  <option value="grid-4">Grid (4 products)</option>
                  <option value="list">List</option>
                  <option value="spotlight">Spotlight</option>
                  <option value="featured">Featured</option>
                  <option value="mixed">Mixed Format</option>
                </select>
                <button onClick={openEmailHTML} disabled={emailGenerating} style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  {emailGenerating ? '⏳ Generating...' : '🔄 Regenerate'}
                </button>
              </div>
              <button onClick={() => setShowEmailModal(false)} style={{
                background: '#E9ECEF',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: '#495057'
              }}>✕ Close</button>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <button onClick={copyEmailHtml} style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '12px 24px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16
              }}>
                📋 Copy HTML to Clipboard
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#495057' }}>Preview:</h4>
              <div style={{
                border: '1px solid #E9ECEF',
                borderRadius: 8,
                padding: 16,
                background: '#f5f5f5',
                maxHeight: '400px',
                overflow: 'auto'
              }}>
                <iframe
                  srcDoc={emailHtml}
                  style={{
                    width: '100%',
                    minHeight: '400px',
                    border: 'none',
                    background: 'white'
                  }}
                  title="Email Preview"
                />
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#495057' }}>HTML Code:</h4>
              <textarea
                value={emailHtml}
                readOnly
                style={{
                  width: '100%',
                  minHeight: '300px',
                  padding: 12,
                  border: '2px solid #E9ECEF',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'monospace',
                  background: '#f8f9fa',
                  resize: 'vertical'
                }}
              />
            </div>
            
            {/* Mixed Format Template Assignments */}
            {emailTemplate === 'mixed' && (
              <div style={{ marginTop: 20, padding: 16, border: '2px solid #E9ECEF', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#495057' }}>Assign Templates to Products:</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {items.map((item, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 12, 
                      marginBottom: 12,
                      padding: 12,
                      background: '#F8F9FA',
                      borderRadius: 8
                    }}>
                      <div style={{ flex: 1, fontSize: 14, color: '#495057' }}>
                        <strong>{index + 1}.</strong> {item.title.length > 50 ? item.title.substring(0, 50) + '...' : item.title}
                      </div>
                      <select
                        value={emailTemplateAssignments[index] || 'single'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (isAssignmentTemplate(value)) {
                            setItemEmailTemplate(index, value);
                          }
                        }}
                        style={{
                          border: '2px solid #E9ECEF',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: 13,
                          background: 'white',
                          cursor: 'pointer',
                          minWidth: 150
                        }}
                      >
                        <option value="single">Single</option>
                        <option value="grid-2">Grid 2</option>
                        <option value="grid-3">Grid 3</option>
                        <option value="grid-4">Grid 4</option>
                        <option value="list">List</option>
                        <option value="spotlight">Spotlight</option>
                        <option value="featured">Featured</option>
                      </select>
                      {item.additionalImages && item.additionalImages.length > 0 && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#495057', cursor: 'pointer', marginLeft: 8 }}>
                          <input
                            type="checkbox"
                            checked={emailInternalsToggle[index] || false}
                            onChange={(e) => {
                              setEmailInternalsToggle({...emailInternalsToggle, [index]: e.target.checked});
                            }}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                          <span>Show Internals ({item.additionalImages.length})</span>
                        </label>
                      )}
                      <button
                        onClick={() => clearItemEmailTemplate(index)}
                        style={{
                          background: '#E9ECEF',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          cursor: 'pointer',
                          color: '#495057'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={openEmailHTML}
                  style={{
                    marginTop: 12,
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                  disabled={emailGenerating}
                >
                  {emailGenerating ? '⏳ Regenerating...' : '🔄 Regenerate with Templates'}
                </button>
              </div>
            )}
            
            {/* Description Editing Section */}
            <div style={{ marginTop: 20, padding: 16, border: '2px solid #E9ECEF', borderRadius: 8 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: '#495057' }}>Edit Product Descriptions:</h4>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 12 }}>
                You can edit descriptions for each product. Leave empty to delete all, revise, or leave full description.
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {items.map((item, index) => {
                  const editedDesc = emailEditedDescriptions[index];
                  const currentDesc = editedDesc !== undefined ? editedDesc : (item.description || '');
                  const isEditing = editingEmailDescIndex === index;
                  
                  return (
                    <div key={index} style={{ 
                      marginBottom: 12,
                      padding: 12,
                      background: isEditing ? '#FFF3CD' : '#F8F9FA',
                      borderRadius: 8,
                      border: isEditing ? '2px solid #FFC107' : '1px solid #E9ECEF'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ flex: 1, fontSize: 14, color: '#495057', fontWeight: 600 }}>
                          <strong>{index + 1}.</strong> {item.title.length > 60 ? item.title.substring(0, 60) + '...' : item.title}
                        </div>
                        {editedDesc !== undefined && (
                          <button
                            onClick={() => {
                              const newEdits = { ...emailEditedDescriptions };
                              delete newEdits[index];
                              setEmailEditedDescriptions(newEdits);
                            }}
                            style={{
                              background: '#DC3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              padding: '4px 8px',
                              fontSize: 11,
                              cursor: 'pointer',
                              fontWeight: 600,
                              marginLeft: 8
                            }}
                            title="Revert to original"
                          >
                            Revert
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div>
                          <textarea
                            value={currentDesc}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              if (newValue === item.description) {
                                // If same as original, remove edit
                                const newEdits = { ...emailEditedDescriptions };
                                delete newEdits[index];
                                setEmailEditedDescriptions(newEdits);
                              } else {
                                setEmailEditedDescriptions({ ...emailEditedDescriptions, [index]: newValue });
                              }
                            }}
                            onBlur={() => setEditingEmailDescIndex(null)}
                            autoFocus
                            style={{
                              width: '100%',
                              minHeight: 100,
                              padding: 8,
                              border: '2px solid #FFC107',
                              borderRadius: 6,
                              fontSize: 13,
                              fontFamily: 'inherit',
                              resize: 'vertical',
                              lineHeight: 1.5
                            }}
                            placeholder="Enter description (leave empty to delete all)..."
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              onClick={() => {
                                setEmailEditedDescriptions({ ...emailEditedDescriptions, [index]: '' });
                                setEditingEmailDescIndex(null);
                              }}
                              style={{
                                background: '#DC3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Clear All
                            </button>
                            <button
                              onClick={() => {
                                // Restore original
                                const newEdits = { ...emailEditedDescriptions };
                                delete newEdits[index];
                                setEmailEditedDescriptions(newEdits);
                                setEditingEmailDescIndex(null);
                              }}
                              style={{
                                background: '#6C757D',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Use Original
                            </button>
                            <button
                              onClick={() => {
                                // Set to full description
                                setEmailEditedDescriptions({ ...emailEditedDescriptions, [index]: item.description || '' });
                                setEditingEmailDescIndex(null);
                              }}
                              style={{
                                background: '#28A745',
                                color: 'white',
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Use Full
                            </button>
                            <button
                              onClick={() => setEditingEmailDescIndex(null)}
                              style={{
                                background: '#E9ECEF',
                                color: '#495057',
                                border: 'none',
                                borderRadius: 6,
                                padding: '6px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                                fontWeight: 600
                              }}
                            >
                              Done
                            </button>
                          </div>
                          <div style={{ fontSize: 11, color: '#6c757d', marginTop: 4 }}>
                            Characters: {currentDesc.length} {item.description && `(Original: ${item.description.length})`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ 
                            fontSize: 12, 
                            color: '#6c757d', 
                            padding: 8,
                            background: 'white',
                            borderRadius: 4,
                            border: '1px solid #E9ECEF',
                            marginBottom: 8,
                            maxHeight: 80,
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.4
                          }}>
                            {currentDesc || <em style={{ color: '#adb5bd' }}>(No description - will be removed)</em>}
                          </div>
                          <button
                            onClick={() => setEditingEmailDescIndex(index)}
                            style={{
                              background: '#007BFF',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 12px',
                              fontSize: 12,
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            ✏️ Edit Description
                          </button>
                          {editedDesc !== undefined && (
                            <span style={{ fontSize: 11, color: '#28a745', marginLeft: 8, fontWeight: 600 }}>
                              ✓ Edited
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={openEmailHTML}
                style={{
                  marginTop: 12,
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%'
                }}
                disabled={emailGenerating}
              >
                {emailGenerating ? '⏳ Regenerating...' : '🔄 Regenerate with Edited Descriptions'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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
  itemLayout: 1|'1L'|2|'2-int'|3|4|8|9|12;
  isMixedView: boolean;
  closeModal: () => void;
  saveContent: (text: string) => void;
  revertContent: (index: number, field: 'description' | 'authorBio') => void;
  itemIndex: number;
}) {
  const currentValue = editedItem?.[editingField] !== undefined 
    ? editedItem[editingField] 
    : item[editingField] || '';
  const effectiveLayout = resolveLayoutForTruncation(itemLayout);
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

function Preview({ items, layout, showOrderEditor, moveItemUp, moveItemDown, moveItemToPosition, itemLayouts, setItemLayout, clearItemLayout, itemBarcodeTypes, setItemBarcodeType, clearItemBarcodeType, itemAuthorBioToggle, setItemAuthorBioToggle, clearItemAuthorBioToggle, itemInternalsCount1L, setItemInternalsCount1L, clearItemInternalsCount1L, internalsCount1L, hyperlinkToggle, generateProductUrl, isMixedView, openEditModal, editedContent, setItemFooterNote, previousEditionIsbns, handlePreviousEditionIsbnChange, moreFromAuthorIsbns, handleMoreFromAuthorIsbnChange, loadingMoreFromAuthor, moreFromAuthorImages }: {
  items: Item[]; 
  layout: 1|'1L'|2|'2-int'|3|4|8|9|12|'list'|'compact-list'|'table'; 
  showOrderEditor: boolean;
  moveItemUp: (index: number) => void;
  moveItemDown: (index: number) => void;
  moveItemToPosition: (index: number, newPosition: number) => void;
  itemLayouts: {[key: number]: 1|'1L'|2|'2-int'|3|4|8|9|12};
  setItemLayout: (index: number, layout: 1|'1L'|2|'2-int'|3|4|8|9|12) => void;
  clearItemLayout: (index: number) => void;
  itemBarcodeTypes: {[key: number]: "EAN-13" | "QR Code" | "None"};
  setItemBarcodeType: (index: number, barcodeType: "EAN-13" | "QR Code" | "None") => void;
  clearItemBarcodeType: (index: number) => void;
  itemAuthorBioToggle: {[key: number]: boolean};
  setItemAuthorBioToggle: (index: number, enabled: boolean) => void;
  clearItemAuthorBioToggle: (index: number) => void;
  itemInternalsCount1L: {[key: number]: number};
  setItemInternalsCount1L: (index: number, count: number) => void;
  clearItemInternalsCount1L: (index: number) => void;
  internalsCount1L: number;
  hyperlinkToggle: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
  generateProductUrl: (handle: string) => string;
  isMixedView?: boolean;
  openEditModal?: (itemIndex: number, field: 'description' | 'authorBio') => void;
  editedContent: { [key: number]: EditedItemContent };
  setItemFooterNote: (index: number, note: string) => void;
  previousEditionIsbns: {[key: number]: string};
  handlePreviousEditionIsbnChange: (index: number, isbn: string) => void;
  moreFromAuthorIsbns: {[key: number]: string[]};
  handleMoreFromAuthorIsbnChange: (index: number, isbnIndex: number, isbn: string) => void;
  loadingMoreFromAuthor: {[key: number]: boolean};
  moreFromAuthorImages: {[key: number]: string[]};
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
  // Note: itemInternalsCount1L, setItemInternalsCount1L, clearItemInternalsCount1L, and internalsCount1L are used in the UI below
  const [positionInputs, setPositionInputs] = useState<{[key: number]: string}>({});
  
  // Convert layout to LayoutType format
  const layoutType = typeof layout === 'number' ? `${layout}-up` as const : layout === '1L' ? '1L' : layout === '2-int' ? '2-int' : layout === 'table' ? 'table' : layout === 'list' ? 'list' : layout === 'compact-list' ? 'compact-list' : layout;
  
  // Get the handler for the current layout
  const layoutHandler = layoutRegistry.getHandler(layoutType);
  const hasAnyCustomLayouts = Object.keys(itemLayouts).length > 0;
  
  if (layoutHandler) {
    // Use handler system for supported layouts
    return (
      <div style={{ marginTop: 24 }}>
        {items.map((it, i) => {
          const edits = editedContent[i];
          const itemForPreview: Item = {
            ...it,
            ...(edits?.description !== undefined ? { description: edits.description } : {}),
            ...(edits?.authorBio !== undefined ? { authorBio: edits.authorBio } : {}),
            ...(edits?.footerNote !== undefined ? { footerNote: edits.footerNote } : {}),
            previousEditionIsbn: previousEditionIsbns[i] || it.previousEditionIsbn,
            moreFromAuthorIsbns: moreFromAuthorIsbns[i] || it.moreFromAuthorIsbns || [],
            moreFromAuthorImages: moreFromAuthorImages[i] || it.moreFromAuthorImages || []
          };
          const itemLayoutSelection = itemLayouts[i] || layout;
          const effectiveLayout = resolveLayoutForTruncation(itemLayoutSelection as BuilderLayout | ItemLayoutOption | undefined);
          const truncations = getItemTruncations(itemForPreview, effectiveLayout, hasAnyCustomLayouts || isMixedView);
          const shouldShowBadges = (isMixedView || hasAnyCustomLayouts || showOrderEditor);
          const noteEligible = effectiveLayout === 3 && (isMixedView || showOrderEditor);
          const noteValue = itemForPreview.footerNote ?? '';
          return (
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
            {layoutHandler.createPreview(itemForPreview, i, generateProductUrl)}
            
            {/* Truncation indicators - always show truncation status */}
            {shouldShowBadges && (
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
                zIndex: 10
              }}>
                {items[i].description && (
                  <div
                    onClick={() => openEditModal?.(i, 'description')}
                    style={{
                      background: truncations.description?.isTruncated 
                        ? (truncations.description.severity === 'severe' ? '#dc3545' : 
                           truncations.description.severity === 'moderate' ? '#ffc107' : '#28a745')
                        : '#6c757d',
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
                    title={truncations.description?.isTruncated 
                      ? `Description: ${truncations.description.percentOver > 75 ? 'Severely over limit' : truncations.description.percentOver > 50 ? 'Significantly over limit' : truncations.description.percentOver > 25 ? 'Slightly over limit' : 'Within limit'}. ${truncations.description.originalLength} chars (limit: ${truncations.description.limit}). Click to edit.`
                      : `Description: ${items[i].description?.length || 0} chars. Click to edit.`}
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
                    {truncations.description?.isTruncated && (
                      <span style={{ fontSize: 9, opacity: 0.9 }}>
                        {Math.round(truncations.description.percentOver)}%
                      </span>
                    )}
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
                    title={`Author bio: ${truncations.authorBio.percentOver > 75 ? 'Severely over limit' : truncations.authorBio.percentOver > 50 ? 'Significantly over limit' : truncations.authorBio.percentOver > 25 ? 'Slightly over limit' : 'Within limit'}. ${truncations.authorBio.originalLength} chars (limit: ${truncations.authorBio.limit}). Click to edit.`}
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
            )}
            {noteEligible && (
              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#495057', marginBottom: 4 }}>
                  Footer Note (optional)
                </label>
                <textarea
                  value={noteValue}
                  onChange={(event) => setItemFooterNote(i, event.target.value)}
                  placeholder="Add supporting text to appear beneath the description..."
                  rows={2}
                  style={{
                    width: '100%',
                    border: '1px solid #DEE2E6',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: 12,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    background: '#F8F9FA',
                    color: '#343A40'
                  }}
                />
              </div>
            )}
            
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
                    onClick={() => itemLayouts[i] === '1L' ? clearItemLayout(i) : setItemLayout(i, '1L')}
                    style={{
                      background: itemLayouts[i] === '1L' ? "#667eea" : "white",
                      color: itemLayouts[i] === '1L' ? "white" : "#667eea",
                      border: "1px solid #667eea",
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      cursor: "pointer",
                      fontWeight: 600,
                      transition: "all 0.2s ease"
                    }}
                    title="Set 1L layout for this item (landscape photos)"
                  >
                    1L
                  </button>
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
                  <span style={{ fontSize: 11, color: "#6C757D" }}>Previous Edition ISBN:</span>
                  <input
                    type="text"
                    placeholder="Enter ISBN"
                    value={previousEditionIsbns[i] || ""}
                    onChange={(e) => handlePreviousEditionIsbnChange(i, e.target.value)}
                    style={{
                      width: 120,
                      padding: "4px 8px",
                      border: "1px solid #DEE2E6",
                      borderRadius: 4,
                      fontSize: 12,
                      background: "white"
                    }}
                  />
                </div>
                
                {/* More from this Author ISBNs */}
                {((itemLayoutSelection === 1 || itemLayoutSelection === '1L') ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #DEE2E6", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#6C757D" }}>More from Author (up to 3):</span>
                    {[0, 1, 2].map((isbnIdx) => (
                      <div key={isbnIdx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="text"
                          placeholder={`ISBN ${isbnIdx + 1}`}
                          value={moreFromAuthorIsbns[i]?.[isbnIdx] || ""}
                          onChange={(e) => handleMoreFromAuthorIsbnChange(i, isbnIdx, e.target.value)}
                          style={{
                            width: 100,
                            padding: "4px 8px",
                            border: "1px solid #DEE2E6",
                            borderRadius: 4,
                            fontSize: 12,
                            background: loadingMoreFromAuthor[i] ? "#FFF3CD" : "white"
                          }}
                          disabled={loadingMoreFromAuthor[i]}
                        />
                        {moreFromAuthorImages[i]?.[isbnIdx] && (
                          <span style={{ fontSize: 9, color: "#28a745" }}>✓</span>
                        )}
                      </div>
                    ))}
                    {loadingMoreFromAuthor[i] && (
                      <span style={{ fontSize: 10, color: "#6C757D" }}>Loading...</span>
                    )}
                  </div>
                ) : (itemLayoutSelection === 2 || itemLayoutSelection === '2-int') ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 8, paddingLeft: 8, borderLeft: "1px solid #DEE2E6" }}>
                    <span style={{ fontSize: 11, color: "#6C757D" }}>More from Author ISBN:</span>
                    <input
                      type="text"
                      placeholder="Enter ISBN"
                      value={moreFromAuthorIsbns[i]?.[0] || ""}
                      onChange={(e) => handleMoreFromAuthorIsbnChange(i, 0, e.target.value)}
                      style={{
                        width: 120,
                        padding: "4px 8px",
                        border: "1px solid #DEE2E6",
                        borderRadius: 4,
                        fontSize: 12,
                        background: loadingMoreFromAuthor[i] ? "#FFF3CD" : "white"
                      }}
                      disabled={loadingMoreFromAuthor[i]}
                    />
                    {loadingMoreFromAuthor[i] && (
                      <span style={{ fontSize: 10, color: "#6C757D" }}>Loading...</span>
                    )}
                    {moreFromAuthorImages[i]?.[0] && (
                      <span style={{ fontSize: 10, color: "#28a745" }}>✓ Image loaded</span>
                    )}
                  </div>
                ) : null)}
                
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
                    {(itemLayouts[i] === '1L' || (layout === '1L' && !itemLayouts[i])) && (
                      <>
                        <span style={{ fontSize: 11, color: "#6C757D" }}>Show:</span>
                        <select
                          value={itemInternalsCount1L[i] ?? internalsCount1L}
                          onChange={(e) => {
                            const count = parseInt(e.target.value);
                            if (count === internalsCount1L) {
                              clearItemInternalsCount1L(i);
                            } else {
                              setItemInternalsCount1L(i, count);
                            }
                          }}
                          style={{
                            padding: "2px 6px",
                            fontSize: 11,
                            border: "1px solid #DEE2E6",
                            borderRadius: 4,
                            backgroundColor: "white",
                            cursor: "pointer"
                          }}
                        >
                          {[1, 2, 3, 4].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </>
                    )}
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
        );
      })}
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
                    <span style={{ fontSize: 10, 
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
