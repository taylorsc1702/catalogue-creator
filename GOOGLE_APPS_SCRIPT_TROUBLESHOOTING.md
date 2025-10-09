# Google Apps Script Troubleshooting - 401 Error

## Problem
Getting a 401 "Page Not Found" error when trying to create Google Docs.

## Root Cause
The Google Apps Script is not properly deployed as a web app with public access.

## Solution: Redeploy the Script

### Step 1: Open Your Google Apps Script
1. Go to https://script.google.com
2. Find your "Catalogue Creator" project (or whatever you named it)
3. Click to open it

### Step 2: Verify the Code
Make sure the code from `google-apps-script.js` is in your script editor.

### Step 3: Deploy as Web App (CRITICAL STEPS)

1. **Click "Deploy" → "New deployment"**

2. **Click the gear icon ⚙️ next to "Select type"**
   - Choose **"Web app"**

3. **Configure the deployment settings:**
   
   **Description:** (optional)
   ```
   Catalogue Creator - Google Docs Export
   ```

   **Execute as:** 
   - ✅ **"Me (your-email@gmail.com)"** ← IMPORTANT!

   **Who has access:**
   - ✅ **"Anyone"** ← CRITICAL! Must be "Anyone", not "Anyone with Google account"

4. **Click "Deploy"**

5. **Authorize the script:**
   - Click "Authorize access"
   - Choose your Google account
   - Click "Advanced" if you see a warning
   - Click "Go to [Your Project Name] (unsafe)"
   - Click "Allow"

6. **Copy the NEW Web App URL**
   - It should look like: `https://script.google.com/macros/s/YOUR_NEW_ID/exec`
   - This might be different from your current URL!

### Step 4: Update Your Environment Variable

Update your `.env.local` file with the NEW URL:

```bash
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_NEW_DEPLOYMENT_ID/exec
```

### Step 5: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
npm run dev
```

### Step 6: Update Vercel (if deployed)

1. Go to Vercel dashboard
2. Settings → Environment Variables
3. Update `GOOGLE_APPS_SCRIPT_URL` with the new URL
4. Redeploy

## Common Issues

### Issue 1: "Anyone with Google account" vs "Anyone"
- ❌ **Wrong**: "Anyone with Google account" (requires login)
- ✅ **Correct**: "Anyone" (public access, no login required)

### Issue 2: Script Not Authorized
- You must click "Authorize access" during deployment
- You may need to click "Advanced" and "Go to [Project] (unsafe)"
- This is normal for personal scripts

### Issue 3: Old Deployment URL
- Each new deployment gets a new URL
- Make sure you're using the latest deployment URL
- You can manage deployments in "Deploy" → "Manage deployments"

### Issue 4: Script Permissions
- The script needs permission to:
  - Create Google Docs
  - Access external URLs (for downloading images)
  - Run as a web app

## Testing the Script Directly

You can test if the script is working by visiting the URL directly in your browser:

```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

**Expected result:**
- You should see a JSON response like: `{"success":false,"error":"..."}`
- If you see "Page Not Found" or a Google login page, the deployment is wrong

**If it's working correctly:**
- Even an error response means the script is accessible
- The actual error might be about missing data, which is fine for testing

## Quick Checklist

- [ ] Script is deployed as "Web app"
- [ ] "Execute as" is set to "Me"
- [ ] "Who has access" is set to "Anyone" (not "Anyone with Google account")
- [ ] Script has been authorized
- [ ] New deployment URL is copied
- [ ] `.env.local` has the new URL
- [ ] Dev server has been restarted
- [ ] Vercel environment variable updated (if deployed)

## Still Not Working?

### Option 1: Create a New Deployment
1. Go to "Deploy" → "Manage deployments"
2. Archive the old deployment
3. Create a fresh "New deployment"
4. Follow all steps above carefully

### Option 2: Test with Simple Script
Create a new Google Apps Script with just this code:

```javascript
function doPost(e) {
  return ContentService
    .createTextOutput(JSON.stringify({success: true, message: "It works!"}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Deploy it and test. If this works, the issue is with the main script code.

### Option 3: Check Script Logs
1. In Google Apps Script editor
2. Click "Executions" (clock icon on left)
3. See if there are any error logs when you try to create a doc

## Need Help?

The most common issue is the "Who has access" setting. It MUST be "Anyone" (public), not "Anyone with Google account" (requires login).

