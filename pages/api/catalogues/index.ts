import type { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";
import { CatalogueSavePayload, CatalogueSummary } from "@/types/catalogues";

type CatalogueRow = {
  id: string;
  name: string | null;
  description: string | null;
  branding: unknown;
  owner_id: string;
  created_at: string;
  updated_at: string;
  catalogue_permissions?: { user_id: string | null }[] | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (record: Record<string, unknown>, key: string): string | null =>
  typeof record[key] === "string" ? (record[key] as string) : null;

function buildCatalogueSummary(
  catalogue: CatalogueRow,
  currentUserId: string
): CatalogueSummary {
  const brandingRecord = isRecord(catalogue.branding) ? catalogue.branding : {};
  const coverValue = brandingRecord["cover"];
  const coverRecord = isRecord(coverValue) ? coverValue : {};

  const bannerColor =
    getString(brandingRecord, "bannerColor") ||
    getString(brandingRecord, "customBannerColor");

  const logoUrl =
    getString(brandingRecord, "logoUrl") ||
    getString(brandingRecord, "coverLogoUrl");

  const issuuUrl =
    getString(brandingRecord, "issuuUrl") ||
    getString(coverRecord, "issuuUrl");

  const sharedCount = Array.isArray(catalogue.catalogue_permissions)
    ? catalogue.catalogue_permissions.filter((permission) => permission?.user_id).length
    : 0;

  const isShared =
    catalogue.owner_id !== currentUserId
      ? true
      : sharedCount > 0 || Boolean(brandingRecord["sharedWithTeam"]);

  return {
    id: catalogue.id,
    name: catalogue.name || "Untitled catalogue",
    description: catalogue.description,
    branding: {
      bannerColor,
      logoUrl,
      issuuUrl,
      isShared,
    },
    createdAt: catalogue.created_at,
    updatedAt: catalogue.updated_at,
    ownerId: catalogue.owner_id,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createPagesServerClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const userId = session.user.id;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("catalogues")
      .select(
        `
          id,
          name,
          description,
          branding,
          owner_id,
          created_at,
          updated_at,
          catalogue_permissions ( user_id )
        `
      )
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });

    if (error) {
      res.status(500).json({ message: error.message });
      return;
    }

    const summaries = (data ?? []).map((row) => buildCatalogueSummary(row as CatalogueRow, userId));
    res.status(200).json(summaries);
    return;
  }

  if (req.method === "POST") {
    const payload = req.body as CatalogueSavePayload | undefined;
    if (!payload || typeof payload.name !== "string") {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    const name = payload.name.trim() || "Untitled catalogue";
    const { data, error } = await supabase
      .from("catalogues")
      .insert({
        owner_id: userId,
        name,
        description: payload.description ?? null,
        branding: payload.branding ?? {},
        layout: payload.layoutConfig ?? {},
        items: payload.items ?? [],
        settings: payload.settings ?? {},
        is_archived: false,
      })
      .select(
        `
          id,
          name,
          description,
          branding,
          owner_id,
          created_at,
          updated_at,
          catalogue_permissions ( user_id )
        `
      )
      .single();

    if (error || !data) {
      res.status(500).json({ message: error?.message || "Failed to save catalogue" });
      return;
    }

    res.status(201).json(buildCatalogueSummary(data as CatalogueRow, userId));
    return;
  }

  res.setHeader("Allow", "GET,POST");
  res.status(405).end("Method Not Allowed");
}
