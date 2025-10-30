// pages/api/products.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { buildShopifyQuery, fetchProductsByQuery, firstDefined } from "@/lib/shopify";
import { z } from "zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
const schema = z.object({
  tag: z.string().optional(),
  vendor: z.string().optional(),
  collectionId: z.string().optional(),
  publishingStatus: z.enum(["Active", "Draft", "All"]).optional(),
  handleList: z.array(z.string()).optional(),
});

    const parsed = schema.parse(req.method === "GET" ? req.query : req.body);

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
      const query = buildShopifyQuery(parsed);         // <- the exact string we send to Shopify
      products = await fetchProductsByQuery(query);
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
        illustrations: mf["Illlustrations"],
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
