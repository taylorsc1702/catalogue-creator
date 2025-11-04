# User Roles and Saved Catalogues Implementation Plan

## Overview
This document outlines the implementation plan for adding user roles (Power User and Publisher) and saved catalogues functionality to the Catalogue Creator application.

## Feasibility
✅ **Yes, this is absolutely possible** and is a common pattern for multi-user applications.

## Quick Summary - All Decisions Made

**✅ Technology Stack:**
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth (built-in)
- Hosting: Vercel (current platform)

**✅ User Management:**
- Admin-created accounts (manual creation in Supabase)
- Invite-only system (Supabase invite emails)
- No self-registration

**✅ User Roles:**
- **Power User:** Full access, all vendors, all domains, branding controls
- **Publisher:** Limited to assigned vendor, woodslane.com.au only, no branding controls

**✅ Saved Catalogues:**
- Purpose: Prevent losing in-progress work (temporary storage)
- Retention: 7 days, then auto-delete
- Both Power Users and Publishers can save
- Saves: Selected products, layout preferences, export settings, branding settings (Power Users only)
- Auto-cleanup: Daily cron job deletes catalogues older than 7 days

## What Would Be Involved

### 1. Authentication System (Replace Basic Auth)

**Current State:**
- Basic HTTP authentication (single username/password)
- No user management
- No sessions

**Required Changes:**
- Replace basic auth with proper authentication
- User login/logout functionality
- Session management (JWT tokens or session cookies)
- Password hashing (bcrypt)
- User registration (if needed) or admin-created accounts

**Recommended Approach:**
- **Supabase Auth (Recommended - using Supabase)**
  - Built-in authentication system
  - Email/password authentication
  - JWT token management
  - Session handling
  - Row Level Security (RLS) for database
  - Easy integration with Supabase database
  - Can extend with OAuth providers later if needed

- **Alternative: NextAuth.js**
  - Industry standard for Next.js
  - Would require custom user management
  - More setup if using Supabase for database

### 2. Database Setup

**Required Tables:**

```sql
-- Note: Supabase Auth handles the users table (auth.users)
-- We create a profiles table to extend with our custom fields
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('power_user', 'publisher')),
  vendor VARCHAR(255), -- NULL for power users, vendor name for publishers
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Only authenticated users can update their profile (or admins can update any)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Saved catalogues table
CREATE TABLE saved_catalogues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Catalogue configuration (store as JSON)
  config JSONB NOT NULL, -- Stores layout, items, filters, etc.
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  
  -- Soft delete
  deleted_at TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE saved_catalogues ENABLE ROW LEVEL SECURITY;

-- Users can only see their own catalogues
CREATE POLICY "Users can view own catalogues" ON saved_catalogues
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only create catalogues for themselves
CREATE POLICY "Users can create own catalogues" ON saved_catalogues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own catalogues
CREATE POLICY "Users can update own catalogues" ON saved_catalogues
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own catalogues
CREATE POLICY "Users can delete own catalogues" ON saved_catalogues
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_saved_catalogues_user_id ON saved_catalogues(user_id);
CREATE INDEX idx_saved_catalogues_deleted_at ON saved_catalogues(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_saved_catalogues_created_at ON saved_catalogues(created_at);

-- Auto-cleanup function: Delete catalogues older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_catalogues()
RETURNS void AS $$
BEGIN
  DELETE FROM saved_catalogues
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Optional: Set up cron job in Supabase Dashboard to run daily
-- pg_cron extension needs to be enabled in Supabase
-- Schedule: SELECT cron.schedule('cleanup-old-catalogues', '0 0 * * *', 'SELECT cleanup_old_catalogues();');
```

**Database Choice: Supabase (Selected)**

**Why Supabase works great with Vercel:**
- ✅ **Free tier available** - Perfect for getting started
- ✅ **Built-in authentication** - Supabase Auth (replaces NextAuth.js)
- ✅ **PostgreSQL database** - Robust, reliable, SQL-based
- ✅ **Row Level Security (RLS)** - Database-level access control
- ✅ **Auto-generated REST APIs** - Can use REST or direct SQL
- ✅ **Real-time capabilities** - For future features
- ✅ **Works seamlessly with Vercel** - Just add environment variables
- ✅ **Supabase JS client** - Easy to use in Next.js

### 3. User Role Management

**Power User:**
- Full access to all features
- Can search all vendors
- Can access all domains (woodslane.com.au, woodslanehealth.com.au, etc.)
- Can modify branding settings (hyperlink toggle, banner color)
- Can save catalogues (including branding settings)
- Can view/load all their saved catalogues
- Can manage saved catalogues (edit/delete)

**Publisher:**
- Limited to their assigned vendor only
- Can only search products from their vendor
- Restricted to woodslane.com.au domain only
- Cannot modify branding settings (no access to branding controls)
- Can save catalogues (without branding settings)
- Can view/load all their saved catalogues
- Cannot access other vendors' products
- Cannot see other users' catalogues

**Implementation Points:**
- Add role check in API endpoints
- Filter products by vendor for publishers
- Restrict domain selection in UI
- Hide/disable features based on role

### 4. Saved Catalogues Feature

**Purpose:**
- Prevent losing in-progress catalogues (draft/working state)
- Temporary storage (1 week retention, then auto-delete)
- Not for long-term storage or sharing

**What to Store:**
- **Selected products** - Product handles or full item data
- **Layout preferences** - Layout type, mixed layout assignments, item-specific layouts
- **Export settings** - Barcode types, UTM parameters, etc.
- **Branding settings** - Hyperlink toggle, banner color (Power Users only)
- **Other settings** - Cover page settings, email creator config (if applicable)

**Note:** Publishers will not have access to branding settings in the saved catalogue (they can't modify branding when creating, so it's not saved for them)

**Catalogue Config Structure (JSON):**
```typescript
{
  // Selected products
  items: Item[]; // Full product data or just handles
  
  // Layout preferences
  layout: 1 | '1L' | 2 | '2-int' | 3 | 4 | 8 | 'list' | 'compact-list' | 'table' | 'mixed';
  itemLayouts?: {[key: number]: 1 | '1L' | 2 | '2-int' | 3 | 4 | 8}; // For mixed layout
  
  // Export settings
  barcodeType?: "EAN-13" | "QR Code" | "None";
  itemBarcodeTypes?: {[key: number]: "EAN-13" | "QR Code" | "None"};
  utmParams?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
  };
  
  // Branding settings (Power Users only - not saved for Publishers)
  hyperlinkToggle?: 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';
  customBannerColor?: string;
  
  // Cover page settings
  coverData?: {
    showFrontCover: boolean;
    showBackCover: boolean;
    // ... other cover settings
  };
  
  // Email creator settings (if applicable)
  emailTemplate?: string;
  emailTemplateAssignments?: {[key: number]: string};
  // ... other email settings
  
  // Other settings
  showFields?: Record<string, boolean>;
  itemAuthorBioToggle?: {[key: number]: boolean};
}
```

**Frontend UI:**
- "Save Catalogue" button/modal (with name input)
- "Load Saved Catalogue" dropdown/section
- List of saved catalogues with name, creation date, "Load" button
- Edit/rename saved catalogues (optional - since they're temporary)
- Delete saved catalogues (optional - auto-cleanup handles this)
- Show "Created X days ago" to indicate age

**Backend API:**
- `POST /api/catalogues` - Save a new catalogue
- `GET /api/catalogues` - List user's catalogues (only their own, last 7 days)
- `GET /api/catalogues/[id]` - Load a specific catalogue
- `PUT /api/catalogues/[id]` - Update a catalogue (optional)
- `DELETE /api/catalogues/[id]` - Delete a catalogue (optional - auto-cleanup handles old ones)

**Auto-Cleanup:**
- Supabase cron job runs daily to delete catalogues older than 7 days
- Can be set up via Supabase Dashboard > Database > Cron Jobs
- Function: `cleanup_old_catalogues()` (defined in SQL schema above)

### 5. Code Changes Required

#### Middleware Updates
- Replace basic auth middleware
- Add role-based access control checks
- Verify user sessions

#### API Endpoints
- `/api/products.ts` - Add vendor filtering for publishers
- `/api/auth/*` - New authentication endpoints
- `/api/catalogues/*` - New saved catalogues endpoints
- All render endpoints - Add user context checks

#### Frontend (`pages/index.tsx`)
- Add login/logout UI
- Add user role display
- Add saved catalogues UI section
- Hide/disable features based on role
- Restrict vendor selection for publishers
- Restrict domain selection for publishers

#### Database Layer
- User management functions
- Saved catalogue CRUD operations
- Query helpers for filtering by user/role

## Implementation Steps

### Phase 1: Database Setup
1. Choose database provider
2. Set up database connection
3. Create schema (users, saved_catalogues tables)
4. Set up connection pooling

### Phase 2: Authentication
1. Install NextAuth.js (or custom auth solution)
2. Create login/logout pages
3. Set up session management
4. Update middleware for auth checks
5. Create user management UI (admin only)

### Phase 3: Role-Based Access Control
1. Add role checks to API endpoints
2. Filter products by vendor for publishers
3. Restrict domain selection in UI
4. Hide features based on role
5. Test access restrictions

### Phase 4: Saved Catalogues
1. Create saved catalogues API endpoints
2. ✅ Design catalogue config data structure (see above)
3. Build save/load UI
4. Add catalogue management (list, load, optional edit/delete)
5. Set up auto-cleanup cron job in Supabase (7-day retention)
6. Test save/load functionality
7. Test auto-cleanup functionality

### Phase 5: Testing & Refinement
1. Test all user roles
2. Test saved catalogue functionality
3. Test access restrictions
4. Performance optimization
5. Error handling improvements

## Estimated Complexity

**Time Estimate:**
- Database setup: 2-4 hours
- Authentication: 1-2 days
- Role-based access: 1-2 days
- Saved catalogues: 2-3 days
- Testing & refinement: 1-2 days

**Total: ~5-10 days of development**

## Recommended Stack

1. **Authentication:** Supabase Auth (built-in)
2. **Database:** Supabase (PostgreSQL)
3. **Client:** @supabase/supabase-js (official Supabase client)
4. **Session:** Supabase JWT tokens (automatic)
5. **Hosting:** Vercel (current platform)

## Security Considerations

1. **Password Hashing:** Supabase Auth handles this automatically (bcrypt)
2. **SQL Injection:** Supabase client uses parameterized queries automatically
3. **CSRF Protection:** Supabase Auth includes this
4. **Row Level Security (RLS):** Database-level access control (built into Supabase)
5. **Rate Limiting:** Supabase has built-in rate limiting for auth endpoints
6. **Input Validation:** Validate all user inputs (use Zod or similar)
7. **Authorization:** Check permissions on every API call + RLS policies
8. **JWT Tokens:** Supabase uses secure JWT tokens for sessions

## Decisions Made

1. ✅ **How will users be created?**
   - **Admin-created accounts** - Admin creates accounts manually in Supabase
   - **Invite-only system** - Admin can send invitation emails via Supabase
   - Users cannot self-register

2. ✅ **Password reset?**
   - Email-based reset via Supabase Auth (automatic)
   - Admin can also reset passwords if needed

3. ✅ **Can publishers save catalogues?**
   - **Yes, both Power Users and Publishers can save catalogues**
   - Purpose: Prevent losing in-progress work
   - Not for sharing or collaboration

4. ✅ **Catalogue sharing?**
   - **No sharing** - Catalogues are private to each user
   - Power users cannot see publishers' catalogues
   - Publishers cannot see other users' catalogues

5. ✅ **Vendor assignment for publishers?**
   - One vendor per publisher (stored in `profiles.vendor` field)
   - Admin assigns vendor when creating user account
   - Publisher can only search products from their assigned vendor

6. ✅ **Catalogue retention and storage:**
   - **Purpose:** Prevent losing in-progress catalogues (draft/working state)
   - **Retention:** Catalogues automatically deleted after 1 week
   - **No storage limits needed** - Auto-cleanup handles this
   - **Not for long-term storage** - Just temporary work-in-progress saves

## Next Steps

1. ✅ **Database provider chosen:** Supabase
2. ✅ **Authentication solution chosen:** Supabase Auth
3. **Set up Supabase project** (create account, new project)
4. **Design user management approach** (admin-created vs self-registration)
5. **Define catalogue config structure** (what exactly to save)
6. **Start with Phase 1** (database setup in Supabase)

## Example Code Structure

```
/pages
  /api
    /auth
      /callback.ts           # Supabase auth callback
      /login.ts              # Login endpoint (optional, can use Supabase client directly)
      /logout.ts             # Logout endpoint (optional, can use Supabase client directly)
    /catalogues
      /index.ts              # List catalogues
      /[id].ts               # Get/Update/Delete catalogue
      /save.ts               # Save catalogue
    /products.ts             # Updated with vendor filtering
  /auth
    /login.tsx               # Login page (using Supabase Auth)
  /admin
    /users.tsx               # User management (power users only)
  /index.tsx                 # Updated with saved catalogues UI
/lib
  /supabase
    /client.ts               # Supabase client (browser)
    /server.ts               # Supabase client (server-side)
  /auth.ts                   # Auth helpers
  /catalogues.ts             # Catalogue CRUD operations
  /profiles.ts               # Profile management
```

## Supabase Setup Steps

1. **Create Supabase Project:**
   - Go to https://supabase.com
   - Create new project
   - Note your project URL and anon key

2. **Add Environment Variables to Vercel:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for server-side admin operations)
   ```

3. **Install Supabase Client:**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **Run SQL migrations** in Supabase SQL Editor (using the SQL above)

## Conclusion

This is a **straightforward implementation** that follows common patterns. 

**✅ Decisions Made:**
1. ✅ **Database:** Supabase (PostgreSQL)
2. ✅ **Authentication:** Supabase Auth (built-in)
3. ✅ **Hosting:** Vercel (current platform)

**✅ All Decisions Made:**
1. ✅ User management: Admin-created + invite-only
2. ✅ Catalogue config structure: Selected products, layout preferences, export settings, branding settings (admin only)
3. ✅ Catalogue retention: 1 week, then auto-delete
4. ✅ Catalogue purpose: Prevent losing in-progress work

Once these are decided, the implementation can proceed systematically through the phases outlined above.

**Next Immediate Steps:**
1. Create Supabase project
2. Get Supabase credentials (URL, anon key, service role key)
3. Add environment variables to Vercel
4. Install `@supabase/supabase-js` package
5. Run SQL migrations in Supabase (including cleanup function)
6. Set up cron job in Supabase for auto-cleanup (7-day retention)
7. Start implementing authentication
8. Implement role-based access control
9. Implement saved catalogues feature

