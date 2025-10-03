// Collaboration types and utilities
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
  lastActive: Date;
}

export interface Comment {
  id: string;
  catalogueId: string;
  productHandle?: string; // If commenting on specific product
  userId: string;
  userName: string;
  content: string;
  createdAt: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface CatalogueVersion {
  id: string;
  catalogueId: string;
  version: number;
  title: string;
  items: unknown[]; // Product items
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
  createdAt: Date;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  notes?: string;
}

export interface Catalogue {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  currentVersion: number;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  teamMembers: string[]; // User IDs
  tags: string[];
}

// In-memory storage for demo purposes
// In production, this would be a real database
const users: Map<string, User> = new Map();
const catalogues: Map<string, Catalogue> = new Map();
const comments: Map<string, Comment> = new Map();
const versions: Map<string, CatalogueVersion> = new Map();

// Initialize with demo data
const demoUser: User = {
  id: 'demo-user-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  createdAt: new Date(),
  lastActive: new Date()
};
users.set(demoUser.id, demoUser);

export const collaborationAPI = {
  // User management
  getUsers: (): User[] => Array.from(users.values()),
  getUser: (id: string): User | undefined => users.get(id),
  createUser: (userData: Omit<User, 'id' | 'createdAt' | 'lastActive'>): User => {
    const user: User = {
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date(),
      lastActive: new Date()
    };
    users.set(user.id, user);
    return user;
  },
  updateUser: (id: string, updates: Partial<User>): User | undefined => {
    const user = users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates, lastActive: new Date() };
      users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  },

  // Catalogue management
  getCatalogues: (userId: string): Catalogue[] => {
    const user = users.get(userId);
    if (!user) return [];
    
    return Array.from(catalogues.values()).filter(cat => 
      cat.createdBy === userId || cat.teamMembers.includes(userId)
    );
  },
  getCatalogue: (id: string): Catalogue | undefined => catalogues.get(id),
  createCatalogue: (catalogueData: Omit<Catalogue, 'id' | 'createdAt' | 'updatedAt' | 'currentVersion'>): Catalogue => {
    const catalogue: Catalogue = {
      ...catalogueData,
      id: `catalogue-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentVersion: 1
    };
    catalogues.set(catalogue.id, catalogue);
    return catalogue;
  },
  updateCatalogue: (id: string, updates: Partial<Catalogue>): Catalogue | undefined => {
    const catalogue = catalogues.get(id);
    if (catalogue) {
      const updatedCatalogue = { ...catalogue, ...updates, updatedAt: new Date() };
      catalogues.set(id, updatedCatalogue);
      return updatedCatalogue;
    }
    return undefined;
  },

  // Version management
  getVersions: (catalogueId: string): CatalogueVersion[] => {
    return Array.from(versions.values())
      .filter(v => v.catalogueId === catalogueId)
      .sort((a, b) => b.version - a.version);
  },
  getVersion: (id: string): CatalogueVersion | undefined => versions.get(id),
  createVersion: (versionData: Omit<CatalogueVersion, 'id' | 'createdAt'>): CatalogueVersion => {
    const version: CatalogueVersion = {
      ...versionData,
      id: `version-${Date.now()}`,
      createdAt: new Date()
    };
    versions.set(version.id, version);
    return version;
  },
  updateVersionStatus: (id: string, status: CatalogueVersion['status'], notes?: string): CatalogueVersion | undefined => {
    const version = versions.get(id);
    if (version) {
      const updatedVersion = { ...version, status, notes };
      versions.set(id, updatedVersion);
      return updatedVersion;
    }
    return undefined;
  },

  // Comment management
  getComments: (catalogueId: string, productHandle?: string): Comment[] => {
    return Array.from(comments.values())
      .filter(c => c.catalogueId === catalogueId && (!productHandle || c.productHandle === productHandle))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  },
  getComment: (id: string): Comment | undefined => comments.get(id),
  createComment: (commentData: Omit<Comment, 'id' | 'createdAt' | 'resolved'>): Comment => {
    const comment: Comment = {
      ...commentData,
      id: `comment-${Date.now()}`,
      createdAt: new Date(),
      resolved: false
    };
    comments.set(comment.id, comment);
    return comment;
  },
  resolveComment: (id: string, resolvedBy: string): Comment | undefined => {
    const comment = comments.get(id);
    if (comment) {
      const updatedComment = { 
        ...comment, 
        resolved: true, 
        resolvedBy, 
        resolvedAt: new Date() 
      };
      comments.set(id, updatedComment);
      return updatedComment;
    }
    return undefined;
  },

  // Permission checking
  canEdit: (userId: string, catalogueId: string): boolean => {
    const user = users.get(userId);
    const catalogue = catalogues.get(catalogueId);
    if (!user || !catalogue) return false;
    
    return user.role === 'admin' || 
           catalogue.createdBy === userId || 
           catalogue.teamMembers.includes(userId);
  },
  canView: (userId: string, catalogueId: string): boolean => {
    const user = users.get(userId);
    const catalogue = catalogues.get(catalogueId);
    if (!user || !catalogue) return false;
    
    return user.role === 'admin' || 
           catalogue.createdBy === userId || 
           catalogue.teamMembers.includes(userId);
  },
  canApprove: (userId: string): boolean => {
    const user = users.get(userId);
    return user?.role === 'admin' || user?.role === 'editor';
  }
};
