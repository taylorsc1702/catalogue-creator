import { Paragraph } from "docx";
import React from 'react';

export type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  sku?: string; icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  icauth?: string; // Australian author metafield
  publicity?: string; reviews?: string; imidis?: string; discount?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
  footerNote?: string;
  previousEditionIsbn?: string;
  previousEditionImageUrl?: string;
  moreFromAuthorIsbns?: string[]; // Array of ISBNs for "More from this author" (up to 3 for 1/1L, 1 for 2-up/2-int)
  moreFromAuthorImages?: string[]; // Array of image URLs corresponding to the ISBNs
};

export interface LayoutHandler {
  name: string;
  createPreview: (item: Item, index: number, generateProductUrl: (handle: string) => string) => React.ReactElement;
  createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string, bannerColor?: string, websiteName?: string) => string;
  createDocxExport: (item: Item, index: number, imageData?: { base64: string; width: number; height: number; mimeType: string } | null, generateProductUrl?: (handle: string) => string, barcodeData?: { base64: string; width: number; height: number; mimeType: string } | null) => Paragraph[];
  createGoogleDocsExport?: (item: Item, index: number) => unknown;
  getCssStyles: () => string;
  getPerPage: () => number;
}

// Helper function to escape HTML
export const esc = (s?: string) =>
  (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// Helper function to convert HTML to plain text
export function htmlToText(html?: string): string {
  if (!html) return '';
  
  return html
    .replace(/<br\s*\/?>/gi, '\n')           // <br> → newline
    .replace(/<\/p>/gi, '\n\n')              // </p> → double newline
    .replace(/<\/div>/gi, '\n')              // </div> → newline
    .replace(/<\/h[1-6]>/gi, '\n\n')         // </h1-6> → double newline
    .replace(/<li>/gi, '\n• ')               // <li> → bullet point
    .replace(/<[^>]*>/g, '')                 // Remove all other tags
    .replace(/&nbsp;/g, ' ')                 // &nbsp; → space
    .replace(/&amp;/g, '&')                  // &amp; → &
    .replace(/&lt;/g, '<')                   // &lt; → <
    .replace(/&gt;/g, '>')                   // &gt; → >
    .replace(/&quot;/g, '"')                 // &quot; → "
    .replace(/&#39;/g, "'")                  // &#39; → '
    .replace(/&apos;/g, "'")                 // &apos; → '
    .replace(/\n\s*\n\s*\n/g, '\n\n')        // Multiple newlines → double newline
    .trim();
}

// Helper function to format date and determine badge type
export function formatDateAndBadge(releaseDate?: string): { formattedDate: string; badgeType: 'current' | 'future' | null } {
  if (!releaseDate) return { formattedDate: '', badgeType: null };

  try {
    let date: Date;
    if (releaseDate.includes('/')) {
      const parts = releaseDate.split('/');
      if (parts.length === 2) {
        date = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
      } else {
        date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      }
    } else {
      date = new Date(releaseDate);
    }

    if (isNaN(date.getTime())) {
      return { formattedDate: releaseDate, badgeType: null };
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${month}/${year}`;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

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

// Helper function to get discount-based product details text
export function getDiscountProductDetails(discount?: string): string {
  if (!discount) return '';
  const discountUpper = discount.trim().toUpperCase();
  switch (discountUpper) {
    case 'A':
      return 'Trade Australian';
    case 'B':
      return 'TEXT';
    case 'E':
      return 'Trade International';
    case 'F':
      return 'Acad and Professional';
    case 'J':
      return 'Short Discount A';
    case 'L':
      return 'Short Discount B';
    default:
      return '';
  }
}
