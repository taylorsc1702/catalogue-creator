# Catalogue Creator – Non-Admin User Guide

This guide explains the tasks you can perform as a standard (non-admin) user in the Catalogue Creator. Non-admins primarily curate product lists, adjust copy during a session, and export simple outputs. Admin-only features are noted for awareness.

---

## 1. Getting Started

### Sign In
1. Open the Catalogue Creator web application.
2. Sign in with your provided credentials (usually the company Google account or a Supabase-managed email/password).
3. You’ll arrive at the main dashboard featuring the Fetch panel, item list, and preview area.

### Role Indicators
- Your user badge will **not** show “admin”.
- Some controls may be greyed out or hidden (e.g., save buttons, advanced exports).

If you need elevated permissions, contact an administrator.

---

## 2. Fetching Products from Shopify

You can build product lists by pulling data from Shopify. Your access is limited to the domains and vendors assigned to you.

### Fetch Options
- **Tag Search** – Enter a Shopify tag (e.g., `psychology`) and click **Fetch Products**.
- **Vendor Search** – Select from the dropdown (only vendors you are authorized to see).
- **Collection ID** – Fetch by collection, if the ID is known.
- **Handle List** – Toggle the *Handle List* switch to paste specific product handles.
- **Publishing Status** – Filter by `Active`, `Draft`, or `All`.

Each fetch replaces the current items in the preview.

> **If no products appear:** Double-check spelling, domain toggle, or that you have access to the requested vendor.

---

## 3. Reviewing & Editing Items

Once items are loaded, use the right-hand preview and the item list to refine copy.

### Description & Author Bio Edits
1. Truncation badges indicate whether the text fits the current layout (Green = OK, Yellow/Orange/Red = long).
2. Click the badge or edit icon to open the modal.
3. Adjust text as needed; the badge colour updates when you save.
4. The edits persist only for the duration of your session (they reset on refresh or fetch).

### Layout & Ordering
- You can reorder items using the ▲/▼ buttons or by entering a position number.
- Layout overrides (e.g., switching a tile to `2-up` or `1L`) may be disabled or limited depending on your permissions.

### 3-up Footer Notes
- Under each preview tile in 3-up layouts, there’s a **Footer Note** field (if enabled by admins). You can add supporting copy during your session.
- Notes are not saved permanently unless an admin saves the catalogue.

---

## 4. Exports Available to Non-Admins

You can generate lightweight outputs for quick sharing or reviews:

| Export Option | Description |
| --- | --- |
| **HTML Print View** | Opens a static HTML layout (table/list) that you can print or share. |
| **Export PDF / Outlook PDF** | Generates a PDF snapshot of the current layout for offline mailing or quick review. |
| **Copy Items / CSV** | Some setups include a CSV or plain-text copy for passing to other systems. |

If you try to access an admin-only export (e.g., DOCX, Mixed Layout Google Doc, Email HTML), the button may be hidden or display a permission error.

---

## 5. Saving & Loading Catalogues

- **Saving is admin-only.** Non-admin edits remain only in memory.
- If an admin shares a catalogue, you can open it via the **Saved Catalogues** panel (read-only view unless granted edit rights).
- When you reopen a shared catalogue, it loads the saved items, but saving again requires admin privileges.

---

## 6. Collaboration Tips

- **Export and Share** – After refining descriptions, export an HTML or PDF and send it to your admin or marketing lead for finalization.
- **Annotate Outside the App** – If you need to persist your edits, copy descriptions into a shared document or message so admins can reapply them before saving.
- **Communicate Domain Needs** – If you require access to additional domains or vendors, request the update from an admin.

---

## 7. Troubleshooting

| Issue | Possible Cause | Resolution |
| --- | --- | --- |
| No products after fetch | Wrong tag/domain or insufficient permissions | Check tag spelling, confirm you’re on the correct domain, or ask admin to verify access |
| “Save” button missing | Non-admin role | Ask an admin to save the catalogue after reviewing your edits |
| Export button disabled | Restricted export type | Use available HTML/PDF exports or ask admin to run the advanced export |
| Description still “too long” | Layout height limit | Work with an admin to adjust layout or shorten the description |

---

## 8. When to Loop in an Admin

- You need to permanently save or share the catalogue.
- You want to generate advanced exports (mixed layout, DOCX, email HTML, barcode sheets).
- You’re setting up automated catalogue generation or contextual EDMs.
- You encounter access errors or need domain/vendor permissions adjusted.

---

## Summary Checklist for Non-Admins

- [ ] Sign in and confirm the correct domain toggle.
- [ ] Fetch products via tag, vendor, collection, or handle list.
- [ ] Review truncation badges and adjust copy as needed.
- [ ] Reorder items or add footer notes during session.
- [ ] Generate HTML/PDF exports for quick sharing.
- [ ] Notify an admin to save or finalize the catalogue.

With these steps you can curate and polish catalogue content before handing it off to marketing or admin staff for final publishing.
