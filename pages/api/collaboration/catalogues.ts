import type { NextApiRequest, NextApiResponse } from "next";
import { collaborationAPI } from "@/lib/collaboration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    const userId = req.headers['x-user-id'] as string || 'demo-user-1'; // Demo user for now

    switch (method) {
      case 'GET':
        const catalogues = collaborationAPI.getCatalogues(userId);
        res.status(200).json({ catalogues });
        break;

      case 'POST':
        const { title, description, teamMembers = [], tags = [] } = req.body;
        if (!title) {
          return res.status(400).json({ error: 'Title is required' });
        }

        const catalogue = collaborationAPI.createCatalogue({
          title,
          description,
          createdBy: userId,
          status: 'draft',
          teamMembers,
          tags
        });

        res.status(201).json({ catalogue });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Catalogue API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
