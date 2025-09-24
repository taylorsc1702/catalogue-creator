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
      metafieldKey: z.string().optional(),
      metafieldContains: z.string().optional(),
      freeText: z.string().optional(),
    });
    const parsed = schema.parse(req.method === "GET" ? req.query : req.body);
    const query = buildShopifyQuery(parsed);
    const products = await fetchProductsByQuery(query);

    const items = products.map(p => {
      const mf = p.metafields;
      return {
        title: p.title,
        subtitle: mf["Subtitle"],
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
        imageUrl: p.featuredImageUrl,
        handle: p.handle,
        vendor: p.vendor,
        tags: p.tags,
      };
    });

    res.status(200).json({ items });
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "Invalid request" });
  }
}
