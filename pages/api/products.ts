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
      console.log(`Product ${p.handle} ALL metafields:`, mf);
      console.log(`ICAUTH values: ICAUTH="${mf["ICAUTH"]}", my_fields.ICAUTH="${mf["my_fields.ICAUTH"]}", icauth="${mf["icauth"]}"`);
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
