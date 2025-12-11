// pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { buildShopifyQuery, fetchProductsByQuery, firstDefined } from "@/lib/shopify";
import { z } from "zod";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createPagesServerClient({ req, res });
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "role, allowed_vendors, can_domain_woodslane, can_domain_press, can_domain_health, can_domain_education, discount_code_setting"
      )
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      res.status(500).json({ error: profileError.message });
      return;
    }

const schema = z.object({
  tag: z.string().optional(),
  vendor: z.string().optional(),
  vendorList: z.array(z.string()).optional(),
  collectionId: z.string().optional(),
  publishingStatus: z.enum(["Active", "Draft", "All"]).optional(),
  handleList: z.array(z.string()).optional(),
});

    const parsed = schema.parse(req.method === "GET" ? req.query : req.body);

    const isAdmin = profile?.role === "admin";
    const normalizeVendor = (value: string) => value.trim().toLowerCase();
    const allowedVendorsRaw = Array.isArray(profile?.allowed_vendors)
      ? (profile?.allowed_vendors as string[]).filter((v) => typeof v === "string" && v.trim().length > 0)
      : [];
    const allowedVendorMap = new Map<string, string>();
    for (const vendorValue of allowedVendorsRaw) {
      allowedVendorMap.set(normalizeVendor(vendorValue), vendorValue);
    }
    const restrictToVendors = !isAdmin && allowedVendorsRaw.length > 0;

    const rawVendorList = Array.isArray(parsed.vendorList)
      ? parsed.vendorList
      : parsed.vendor
        ? [parsed.vendor]
        : [];
    let requestedVendors = rawVendorList.map((v) => v.trim()).filter((v) => v.length > 0);

    if (restrictToVendors) {
      if (requestedVendors.length > 0) {
        const invalid = requestedVendors.filter((v) => !allowedVendorMap.has(normalizeVendor(v)));
        if (invalid.length > 0) {
          res.status(403).json({ error: "You do not have access to one or more selected vendors." });
          return;
        }
        requestedVendors = requestedVendors.map((v) => allowedVendorMap.get(normalizeVendor(v)) ?? v);
      } else {
        requestedVendors = [...allowedVendorsRaw];
      }
    }

    // If a large handleList is provided, batch it to avoid oversized query strings
    let products: Awaited<ReturnType<typeof fetchProductsByQuery>> = [];
    if (parsed.handleList && parsed.handleList.length > 0) {
      const CHUNK_SIZE = 50; // safe batch size for long OR queries
      for (let i = 0; i < parsed.handleList.length; i += CHUNK_SIZE) {
        const slice = parsed.handleList.slice(i, i + CHUNK_SIZE);
        const q = buildShopifyQuery({ handleList: slice });
        const partial = await fetchProductsByQuery(q);
        products = products.concat(partial);
      }
      // Deduplicate by handle (or id) in case items were matched by multiple fields
      const seen = new Set<string>();
      products = products.filter(p => {
        const key = p.handle || p.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Preserve input order: sort results to match handleList order (by handle or SKU match)
      const rawList = parsed.handleList.slice();
      const normEntries = rawList.map(v => ({
        original: v,
        lower: v.trim().toLowerCase(),
        digits: v.replace(/[^0-9Xx]/g, '').replace(/x$/i, ''),
      }));
      const indexOfProduct = (p: typeof products[number]) => {
        const handleLower = (p.handle || '').toLowerCase();
        const skuDigits = (p.sku || '').replace(/[^0-9Xx]/g, '').replace(/x$/i, '');
        // Find the first list entry that matches either handle or SKU digits (with or without leading zero)
        for (let i = 0; i < normEntries.length; i++) {
          const e = normEntries[i];
          if (e.lower === handleLower) return i;
          if (e.digits && (e.digits === skuDigits || `0${e.digits}` === skuDigits)) return i;
        }
        return Number.MAX_SAFE_INTEGER;
      };
      products.sort((a, b) => indexOfProduct(a) - indexOfProduct(b));
    } else {
      const singleVendor = requestedVendors.length === 1 ? requestedVendors[0] : undefined;
      const query = buildShopifyQuery({
        tag: parsed.tag,
        vendor: singleVendor ?? (parsed.vendor && parsed.vendor.trim() ? parsed.vendor.trim() : undefined),
        vendors: requestedVendors.length > 1 ? requestedVendors : undefined,
        collectionId: parsed.collectionId,
        publishingStatus: parsed.publishingStatus,
      });         // <- the exact string we send to Shopify
      products = await fetchProductsByQuery(query);
    }

    if (restrictToVendors) {
      const allowedSet = new Set(Array.from(allowedVendorMap.keys()));
      const requestedSet =
        requestedVendors.length > 0
          ? new Set(requestedVendors.map((v) => normalizeVendor(v)))
          : allowedSet;
      products = products.filter((p) => {
        const normalized = normalizeVendor(p.vendor || "");
        return allowedSet.has(normalized) && requestedSet.has(normalized);
      });
    } else if (requestedVendors.length > 0) {
      const requestedSet = new Set(requestedVendors.map((v) => normalizeVendor(v)));
      products = products.filter((p) => requestedSet.has(normalizeVendor(p.vendor || "")));
    }

    const items = products.map((p) => {
      const mf = p.metafields;
      
      
      return {
        title: p.title,
        subtitle: mf["Subtitle"],
        description: p.description,
        price: p.price,
        author: firstDefined(mf["Author"], mf["author"], mf["ICAUTH"]),
        authorBio: mf["Author_Bio"],
        binding: mf["Binding"],
        pages: mf["pages"],
        imprint: mf["Imprint"],
        dimensions: mf["Dimensions"],
        releaseDate: mf["Release_date"],
        weight: mf["weight"],
        sku: p.sku,
        icrkdt: mf["ICRKDT"],
        icillus: mf["icillus"],
        edition: mf["Edition"],
        icauth: mf["ICAUTH"] || mf["my_fields.ICAUTH"] || mf["icauth"],
        publicity: mf["publicity"],
        reviews: mf["reviews"],
        imidis: mf["IMIDIS"] || mf["my_fields.IMIDIS"] || mf["imidis"] || mf["my_fields.imidis"],
        discount: mf["Discount"] || mf["my_fields.Discount"] || mf["discount"] || mf["my_fields.discount"],
        imageUrl: p.featuredImageUrl,
        additionalImages: p.additionalImages,
        handle: p.handle,
        vendor: p.vendor,
        tags: p.tags,
      };
    });

    // include an indicative query so the UI can display something
    const finalQuery = parsed.handleList && parsed.handleList.length > 0
      ? `(batched ${parsed.handleList.length} handles)`
      : buildShopifyQuery(parsed);
    res.status(200).json({ items, query: finalQuery });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    res.status(400).json({ error: message });
  }
}
