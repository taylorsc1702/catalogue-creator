import type { NextApiRequest, NextApiResponse } from "next";
import { collaborationAPI } from "@/lib/collaboration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    const userId = req.headers['x-user-id'] as string || 'demo-user-1';

    switch (method) {
      case 'GET':
        const { catalogueId } = req.query;
        if (!catalogueId || typeof catalogueId !== 'string') {
          return res.status(400).json({ error: 'Catalogue ID is required' });
        }

        if (!collaborationAPI.canView(userId, catalogueId)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const versions = collaborationAPI.getVersions(catalogueId);
        res.status(200).json({ versions });
        break;

      case 'POST':
        const { catalogueId: newCatalogueId, items, layout, hyperlinkToggle, utmParams, notes } = req.body;
        
        if (!newCatalogueId || !items) {
          return res.status(400).json({ error: 'Catalogue ID and items are required' });
        }

        if (!collaborationAPI.canEdit(userId, newCatalogueId)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        // Get current version number
        const existingVersions = collaborationAPI.getVersions(newCatalogueId);
        const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;

        const newVersion = collaborationAPI.createVersion({
          catalogueId: newCatalogueId,
          version: nextVersion,
          title: `Version ${nextVersion}`,
          items,
          layout,
          hyperlinkToggle,
          utmParams,
          createdBy: userId,
          status: 'draft',
          notes
        });

        // Update catalogue's current version
        collaborationAPI.updateCatalogue(newCatalogueId, { currentVersion: nextVersion });

        res.status(201).json({ version: newVersion });
        break;

      case 'PATCH':
        const { versionId, status, notes: updateNotes } = req.body;
        
        if (!versionId || !status) {
          return res.status(400).json({ error: 'Version ID and status are required' });
        }

        const existingVersion = collaborationAPI.getVersion(versionId);
        if (!existingVersion) {
          return res.status(404).json({ error: 'Version not found' });
        }

        if (!collaborationAPI.canEdit(userId, existingVersion.catalogueId)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const updatedVersion = collaborationAPI.updateVersionStatus(versionId, status, updateNotes);
        res.status(200).json({ version: updatedVersion });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Version API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
