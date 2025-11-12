# Catalogue Creator – Admin Guide

## Overview

This guide covers everything an administrator can do in the Catalogue Creator, including features that are also available to non-admin users. Admins can:

- Access all domain toggles and brand templates.
- Fetch and curate product lists from Shopify.
- Edit item content (descriptions, author bios, footer notes) and manage truncation warnings.
- Generate and download catalogues in multiple layouts (HTML, mixed layout, Google Docs, DOCX).
- Configure email-ready outputs (Mailchimp HTML) with banners, logos, discount messaging, and ISSUU catalogue links.
- Save, reopen, and share catalogues with other users.
- Trigger contextual exports or automated workflows.

Non-admins inherit a subset of these capabilities (highlighted below) but with limited domain access, no advanced export targets, and no ability to save catalogues permanently.

---

## Getting Started

### Sign In
1. Navigate to the Catalogue Creator web app URL.
2. Sign in with your Supabase-backed credentials (company Google account or email/password).
3. Upon success the dashboard loads with the Fetch panel, layout preview, and export utilities.

> **Non-admin difference:** Non-admin users land on the same page but may immediately see restricted domain toggles or disabled buttons depending on their role.

### Role Awareness
- Admins can access all Shopify domains (`woodslane`, `woodslanehealth`, `woodslaneeducation`, `woodslanepress`).
- Non-admins only see the domains explicitly allowed in their Supabase profile and cannot toggle into restricted ones.

Check the top-right profile badge for your role if unsure.

---

## Fetching Products from Shopify

### Search Options
1. **Tag Search** – Enter a Shopify tag (e.g., `psychology`) and click **Fetch Products**.
2. **Vendor Search** – Use the vendor dropdown (admins see full list; non-admins only their assigned vendors).
3. **Collection ID** – Paste a Shopify collection ID to pull curated lists.
4. **Handle List** – Toggle the *Handle List* switch to paste specific product handles.
5. **Publishing Status** – Filter between `Active`, `Draft`, or `All` products.

Each fetch replaces the current `items` array with the products returned by `/api/products`.

> **Non-admin difference:** Non-admins cannot fetch from domains or vendors they do not have permission for. If they attempt to, the fetch silently returns no results or displays an error banner.

### After Fetch
- The left-hand **Preview** column updates immediately.
- The **Items** panel (below the fetch form) lists each product with layout controls, edit buttons, truncation badges, and reorder tools.

---

## Editing Catalogue Content

### Description & Author Bio
1. Hover over the truncation badge (green/yellow/orange/red) to view the truncation status.
2. Click the `📝 Desc` or `👤 Bio` badge or the edit icon to open the modal.
3. Edit text freely—the badge colours update instantly once saved.
4. Click **Save** to persist changes in the local state.
5. If you overshoot the layout limit, a warning colour remains, but the text stays editable, allowing iterative tweaking.

> **Colour Legend**
> - **Green** – Within layout limit.
> - **Yellow** – Slightly over (~25% beyond limit).
> - **Orange** – Significantly over (~50% beyond limit).
> - **Red** – Severe overflow (~75%+). Description will visibly clip unless layout grows.

### Footer Note (3-up Layouts)
- For 3-up cards, admins can enter supporting copy in the *Footer Note* field under each preview tile. The note displays beneath the truncated description and is saved alongside other edits.

### Persisting Edits
- Edits exist in the browser state until saved as part of a catalogue record.
- When you save the catalogue (see below), edited descriptions, bios, and footer notes are stored under `settings.emailConfig.editedDescriptions` and `editedContent` so they reload automatically next time.

> **Non-admin difference:** Non-admins can edit descriptions during their session but cannot permanently save catalogues unless granted `admin` role. Their edits disappear when they refresh or leave the page.

---

## Reordering and Layout Assignment

### Item Reordering
- Use the ▲/▼ arrows or the position input to reorder items in the preview.
- Drag-and-drop is available in the *Preview & Reorder Pages* modal for mixed layouts.

### Layout Overrides
- Each item has a `Layout` dropdown to override the global layout (admin-only for mixed or multi-layout exports).
- Options include `1-up`, `1L`, `2-up`, `2-int`, `3-up`, `4-up`, `8-up`.
- Clearing the override reverts to the global layout defined in the fetch panel.

> **Non-admin difference:** Non-admins can see layout assignments but cannot change advanced layouts (like `2-int` or `1L`) if their role restricts those exports.

---

## Saving and Loading Catalogues

### Save
1. Click **Save Catalogue**.
2. Provide a catalogue name and optional description.
3. The catalogue persists to Supabase with all items, layouts, edits, and export settings.
4. Success banner confirms with a timestamp.

### Load Existing
1. Open the **Saved Catalogues** drawer.
2. Search/filter by name, domain, or owner.
3. Click **Open** to load the catalogue into the main interface.

### Sharing
- Any admin can open catalogues from any other admin unless restricted by a “shared” flag (optional future enhancement).

> **Non-admin difference:** Non-admins can view shared catalogues if an admin toggled the `isShared` flag but cannot save new ones or modify existing records.

---

## Exporting – Admin-Only Features

### HTML / Printable Layouts
- **HTML Print View** – Generates static HTML (`/api/render/html`) for table, list, or grid views.
- **Mixed Layout View** – Calls `/api/render/mixed` for magazine-style pages.
- **Download DOCX** – Converts the mixed layout into a DOCX file via `/api/render/docx`.
- **Google Doc** – Pushes the mixed layout directly into a Google Doc (requires Apps Script setup).

### Email / EDM
- **Email HTML** – Opens the modal for `/api/render/email`, including:
  - Branding (domain toggle, primary colour, logos).
  - Banner links or discount code banners.
  - ISSUU catalogue CTA.
  - Button labels, colour, text colour.
  - Section order toggles (banner > free text > logos > products > ISSUU).
- **Outlook PDFs** – Generates PDF snapshots for offline mailing campaigns.

### Barcodes & QR Codes
- Admins can call `/api/render/barcode` to produce QR or EAN barcode sheets for catalogue items.

> **Non-admin difference:** Non-admins typically have access only to the **HTML Print View**, **Export PDF**, or **Copy Items** operations configured by admins. They cannot generate email HTML or DOCX without permission.

---

## Contextual and Automated Workflows

Admins can script automated catalogue creation by calling the existing HTTP endpoints.

### Example: Subject-Specific HTML Catalogue
1. Fetch products by tag (`subject:psychology`).
2. POST to `/api/render/html` with `layout: '3-up'`.
3. Save the returned HTML to S3 or Supabase storage.
4. Send a Mailchimp campaign linking to the hosted catalogue.

### Example: Personalised EDM per Customer
1. Use Shopify order history to derive top subjects for each customer.
2. Fetch products matching the subject.
3. Call `/api/render/email` for each customer’s item list.
4. Push the HTML into Mailchimp/Klaviyo via their API.
5. Respect cooldowns to avoid over-emailing.

(See the companion technical note *“Automating Contextual EDMs”* for step-by-step code outlines.)

---

## Troubleshooting & Tips

- **No Items Returned** – Check domain toggle, tag spelling, or whether Shopify products are published.
- **Descriptions Clip Too Soon** – Review layout height; cards default to `min-height: 260px`. Adjust layout CSS or remove overflow clamps where necessary.
- **Catalogue Not Saving** – Ensure you’re logged in as an admin; refresh token if session expired.
- **Barcode Generation Failures** – Ensure items have valid `handle` and `sku`; check console logs for the `/api/render/barcode` response.
- **Google Doc Export** – Requires the Apps Script deployed and OAuth credentials configured; refer to `GOOGLE_APPS_SCRIPT_SETUP.md` in the repo.

---

## Summary Table – Admin vs Non-Admin

| Feature | Admin | Non-Admin |
| --- | --- | --- |
| Fetch products by tag/vendor/collection | ✅ | ✅ (restricted vendors/domains) |
| Edit descriptions & author bios | ✅ | ✅ (session-only) |
| Add 3-up footer notes | ✅ | ⚠ (edits discarded on refresh) |
| Save catalogue to Supabase | ✅ | ❌ |
| Load existing catalogue | ✅ | ⚠ (view-only if shared) |
| Reorder items & assign layouts | ✅ | ⚠ (limited) |
| Export HTML/Print | ✅ | ✅ |
| Export Mixed/DOCX/Google Doc | ✅ | ❌ |
| Generate Email HTML (EDM) | ✅ | ❌ |
| Generate Barcode sheets | ✅ | ❌ |

Use this table to communicate capabilities to team members and to verify permissions during onboarding.

---

## Next Steps

- Share this guide during admin onboarding.
- Pair it with the non-admin guide so support staff understand which features their colleagues can or cannot access.
- For automation, consult the *Contextual Catalogue Automation* notes and coordinate with the engineering team to set up CRON jobs or Supabase schedules.
