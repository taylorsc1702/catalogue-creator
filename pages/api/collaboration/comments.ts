import type { NextApiRequest, NextApiResponse } from "next";
import { collaborationAPI } from "@/lib/collaboration";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    const userId = req.headers['x-user-id'] as string || 'demo-user-1';

    switch (method) {
      case 'GET':
        const { catalogueId, productHandle } = req.query;
        
        if (!catalogueId || typeof catalogueId !== 'string') {
          return res.status(400).json({ error: 'Catalogue ID is required' });
        }

        if (!collaborationAPI.canView(userId, catalogueId)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const comments = collaborationAPI.getComments(
          catalogueId, 
          productHandle as string
        );
        res.status(200).json({ comments });
        break;

      case 'POST':
        const { catalogueId: newCatalogueId, productHandle: newProductHandle, content } = req.body;
        
        if (!newCatalogueId || !content) {
          return res.status(400).json({ error: 'Catalogue ID and content are required' });
        }

        if (!collaborationAPI.canView(userId, newCatalogueId)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const user = collaborationAPI.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const newComment = collaborationAPI.createComment({
          catalogueId: newCatalogueId,
          productHandle: newProductHandle,
          userId,
          userName: user.name,
          content
        });

        res.status(201).json({ comment: newComment });
        break;

      case 'PATCH':
        const { commentId } = req.body;
        
        if (!commentId) {
          return res.status(400).json({ error: 'Comment ID is required' });
        }

        const comment = collaborationAPI.getComment(commentId);
        if (!comment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        if (!collaborationAPI.canView(userId, comment.catalogueId)) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const resolvedComment = collaborationAPI.resolveComment(commentId, userId);
        res.status(200).json({ comment: resolvedComment });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('Comment API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
