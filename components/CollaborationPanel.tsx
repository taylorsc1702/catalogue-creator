import React, { useState, useEffect, useCallback } from 'react';

interface Comment {
  id: string;
  catalogueId: string;
  productHandle?: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface CatalogueVersion {
  id: string;
  catalogueId: string;
  version: number;
  title: string;
  items: unknown[];
  layout: number;
  hyperlinkToggle: string;
  utmParams?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  };
  createdBy: string;
  createdAt: string;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  notes?: string;
}

interface CollaborationPanelProps {
  catalogueId?: string;
  items: unknown[];
  layout: number;
  hyperlinkToggle: string;
  utmParams?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  };
  onSaveVersion?: (version: CatalogueVersion) => void;
}

export default function CollaborationPanel({ 
  catalogueId, 
  items, 
  layout, 
  hyperlinkToggle, 
  utmParams,
  onSaveVersion 
}: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'versions' | 'team'>('comments');
  const [comments, setComments] = useState<Comment[]>([]);
  const [versions, setVersions] = useState<CatalogueVersion[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const loadComments = useCallback(async () => {
    if (!catalogueId) return;
    try {
      const response = await fetch(`/api/collaboration/comments?catalogueId=${catalogueId}`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }, [catalogueId]);

  const loadVersions = useCallback(async () => {
    if (!catalogueId) return;
    try {
      const response = await fetch(`/api/collaboration/versions?catalogueId=${catalogueId}`);
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  }, [catalogueId]);

  useEffect(() => {
    if (catalogueId) {
      loadComments();
      loadVersions();
    }
  }, [catalogueId, loadComments, loadVersions]);

  const addComment = async () => {
    if (!catalogueId || !newComment.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/collaboration/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogueId,
          content: newComment.trim()
        })
      });
      
      if (response.ok) {
        setNewComment('');
        loadComments();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveComment = async (commentId: string) => {
    try {
      const response = await fetch('/api/collaboration/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId })
      });
      
      if (response.ok) {
        loadComments();
      }
    } catch (error) {
      console.error('Failed to resolve comment:', error);
    }
  };

  const saveVersion = async () => {
    if (!catalogueId) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/collaboration/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogueId,
          items,
          layout,
          hyperlinkToggle,
          utmParams,
          notes: newVersionNotes.trim()
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setNewVersionNotes('');
        loadVersions();
        onSaveVersion?.(data.version);
      }
    } catch (error) {
      console.error('Failed to save version:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateVersionStatus = async (versionId: string, status: string) => {
    try {
      const response = await fetch('/api/collaboration/versions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId, status })
      });
      
      if (response.ok) {
        loadVersions();
      }
    } catch (error) {
      console.error('Failed to update version status:', error);
    }
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #E9ECEF',
      borderRadius: 12,
      padding: 20,
      marginTop: 20
    }}>
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 20,
        borderBottom: '1px solid #E9ECEF',
        paddingBottom: 12
      }}>
        {[
          { key: 'comments', label: '💬 Comments', count: comments.length },
          { key: 'versions', label: '📝 Versions', count: versions.length },
          { key: 'team', label: '👥 Team', count: 0 }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'comments' | 'versions' | 'team')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: 8,
              background: activeTab === tab.key ? '#667eea' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#6C757D',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            {tab.label} {tab.count && tab.count > 0 && `(${tab.count})`}
          </button>
        ))}
      </div>

      {activeTab === 'comments' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment about this catalogue..."
              style={{
                width: '100%',
                height: 80,
                padding: 12,
                border: '1px solid #E9ECEF',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical'
              }}
            />
            <button
              onClick={addComment}
              disabled={loading || !newComment.trim()}
              style={{
                marginTop: 8,
                padding: '8px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {loading ? 'Adding...' : 'Add Comment'}
            </button>
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {comments.map(comment => (
              <div
                key={comment.id}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  background: comment.resolved ? '#F8F9FA' : '#FFF',
                  border: '1px solid #E9ECEF',
                  borderRadius: 8,
                  opacity: comment.resolved ? 0.7 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#6C757D', marginBottom: 4 }}>
                      {comment.userName} • {new Date(comment.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                      {comment.content}
                    </div>
                  </div>
                  {!comment.resolved && (
                    <button
                      onClick={() => resolveComment(comment.id)}
                      style={{
                        padding: '4px 8px',
                        background: '#28A745',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12
                      }}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6C757D', padding: 20 }}>
                No comments yet. Add the first one above!
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'versions' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <textarea
              value={newVersionNotes}
              onChange={(e) => setNewVersionNotes(e.target.value)}
              placeholder="Add notes for this version..."
              style={{
                width: '100%',
                height: 60,
                padding: 12,
                border: '1px solid #E9ECEF',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical'
              }}
            />
            <button
              onClick={saveVersion}
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '8px 16px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {loading ? 'Saving...' : 'Save New Version'}
            </button>
          </div>

          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {versions.map(version => (
              <div
                key={version.id}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  background: '#F8F9FA',
                  border: '1px solid #E9ECEF',
                  borderRadius: 8
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                      {version.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#6C757D', marginBottom: 4 }}>
                      {new Date(version.createdAt).toLocaleString()} • {version.items.length} items
                    </div>
                    <div style={{ fontSize: 12, color: '#6C757D', marginBottom: 8 }}>
                      Status: <span style={{ 
                        color: version.status === 'published' ? '#28A745' : 
                               version.status === 'approved' ? '#17A2B8' :
                               version.status === 'in_review' ? '#FFC107' : '#6C757D'
                      }}>
                        {version.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {version.notes && (
                      <div style={{ fontSize: 12, color: '#495057', fontStyle: 'italic' }}>
                        {version.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {version.status === 'draft' && (
                      <button
                        onClick={() => updateVersionStatus(version.id, 'in_review')}
                        style={{
                          padding: '4px 8px',
                          background: '#FFC107',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        Submit for Review
                      </button>
                    )}
                    {version.status === 'in_review' && (
                      <button
                        onClick={() => updateVersionStatus(version.id, 'approved')}
                        style={{
                          padding: '4px 8px',
                          background: '#17A2B8',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {versions.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6C757D', padding: 20 }}>
                No versions yet. Save the first one above!
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div>
          <div style={{ textAlign: 'center', color: '#6C757D', padding: 20 }}>
            Team management coming soon! For now, all users can collaborate on catalogues.
          </div>
        </div>
      )}
    </div>
  );
}
