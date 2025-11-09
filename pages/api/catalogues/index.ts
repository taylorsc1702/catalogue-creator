import type { NextApiRequest, NextApiResponse } from "next";
import { CatalogueSummary } from "@/types/catalogues";

const mockCatalogues: CatalogueSummary[] = [
  {
    id: "c1c07b43-5f2b-4ac4-9406-0b2b0c74d81e",
    name: "Spring 2025 Retail",
    description: "First pass for the March mailer. Mixed layout with 1L feature pages.",
    branding: {
      bannerColor: "#F7981D",
      logoUrl: "https://cdn.woodslane.com.au/assets/logos/woodslane.png",
      issuuUrl: "https://issuu.com/woodslane/docs/spring2025",
      isShared: true,
    },
    createdAt: "2025-01-10T06:12:45.000Z",
    updatedAt: "2025-01-24T15:05:02.000Z",
    ownerId: "owner-woodslane",
  },
  {
    id: "471a9512-fd9e-4e46-9f38-32cdd2fcf0ac",
    name: "Education Titles Q1",
    description: null,
    branding: {
      bannerColor: "#004C97",
      logoUrl: null,
      issuuUrl: null,
      isShared: false,
    },
    createdAt: "2025-02-01T09:02:00.000Z",
    updatedAt: "2025-02-02T10:45:25.000Z",
    ownerId: "owner-woodslane-education",
  },
  {
    id: "5bee3f56-99f6-4c7f-b9d0-5d83b3e2f1d9",
    name: "Health Highlights April",
    description: "Draft for upcoming health newsletter. Needs author bios before final export.",
    branding: {
      bannerColor: "#0EAD69",
      logoUrl: "https://cdn.woodslane.com.au/assets/logos/woodslane-health.png",
      issuuUrl: null,
      isShared: true,
    },
    createdAt: "2025-02-08T11:12:00.000Z",
    updatedAt: "2025-02-11T08:19:11.000Z",
    ownerId: "owner-woodslane-health",
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    res.status(200).json(mockCatalogues);
    return;
  }

  if (req.method === "POST") {
    res
      .status(501)
      .json({ message: "Catalogue creation API coming soon. Use Supabase directly for now." });
    return;
  }

  res.setHeader("Allow", "GET,POST");
  res.status(405).end("Method Not Allowed");
}

