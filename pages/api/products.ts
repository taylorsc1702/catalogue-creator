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

    const query = buildShopifyQuery(parsed);         // <- the exact string we send to Shopify
    const products = await fetchProductsByQuery(query);

    const items = products.map((p) => {
      const mf = p.metafields;
      // Debug: Check for ICAUTH under various possible keys
      console.log(`Checking ICAUTH for ${p.handle}:`);
      console.log('  ICAUTH:', mf["ICAUTH"]);
      console.log('  my_fields.ICAUTH:', mf["my_fields.ICAUTH"]);
      console.log('  icauth:', mf["icauth"]);
      console.log('  custom.ICAUTH:', mf["custom.ICAUTH"]);
      console.log('  global.ICAUTH:', mf["global.ICAUTH"]);
      
      // Check all keys that contain "icauth" (case insensitive)
      const icauthKeys = Object.keys(mf).filter(key => key.toLowerCase().includes('icauth'));
      console.log('  Keys containing "icauth":', icauthKeys);
      
      // Temporarily hardcode ICAUTH for testing
      if (p.handle === '9781398388659') {
        mf["ICAUTH"] = "Australia";
        console.log('  HARDCODED ICAUTH for testing');
      }
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
        icrkdt: mf["ICRKDT"],
        icillus: mf["icillus"],
        illustrations: mf["Illlustrations"],
        edition: mf["Edition"],
        icauth: mf["ICAUTH"] || mf["my_fields.ICAUTH"] || mf["icauth"],
        publicity: mf["publicity"],
        reviews: mf["reviews"],
        imageUrl: p.featuredImageUrl,
        additionalImages: p.additionalImages,
        handle: p.handle,
        vendor: p.vendor,
        tags: p.tags,
      };
    });

    // include the query so the UI can display it
    res.status(200).json({ items, query });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    res.status(400).json({ error: message });
  }
}
