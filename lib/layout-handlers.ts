import type { NextApiRequest, NextApiResponse } from "next";
import { Paragraph } from "docx";
import React from 'react';

export type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  icauth?: string; // Australian author metafield
  publicity?: string; reviews?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

export interface LayoutHandler {
  name: string;
  createPreview: (item: Item, index: number, generateProductUrl: (handle: string) => string) => React.ReactElement;
  createHtmlExport: (item: Item, index: number, generateProductUrl: (handle: string) => string, barcodeHtml?: string) => string;
  createDocxExport: (item: Item, index: number, imageData?: { base64: string; width: number; height: number; mimeType: string } | null, generateProductUrl?: (handle: string) => string, barcodeData?: { base64: string; width: number; height: number; mimeType: string } | null) => Paragraph[];
  createGoogleDocsExport?: (item: Item, index: number) => any;
  getCssStyles: () => string;
  getPerPage: () => number;
}

// Helper function to escape HTML
export const esc = (s?: string) =>
  (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

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
