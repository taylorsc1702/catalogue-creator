# Environment Variables Setup

## Create `.env.local` file

Create a file named `.env.local` in the root of your project with the following content:

```bash
# Google Apps Script Configuration
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxrvUzDXnCXTc5eTMJ4-dsGItgbyUAeJpQ7FaGPjRiG9Sp7S03amLjkjUfnY76VR7XWgw/exec

# Shopify Configuration (if needed)
# SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
# SHOPIFY_ACCESS_TOKEN=your-access-token
```

## Steps to Create `.env.local`

1. **Create the file** in your project root: `c:\Users\taylorsc\catalogue-creator\.env.local`
2. **Copy the configuration** above into the file
3. **Save the file**
4. **Restart your development server** for the changes to take effect

## Verify Setup

After creating the file and restarting your server:

1. Fetch some products in your catalogue creator
2. Click the **"🚀 Create Google Doc"** button
3. A Google Doc should be created and opened automatically
4. Check that the formatting matches your HTML exports

## Troubleshooting

### Error: "Google Apps Script URL not configured"
- Make sure the `.env.local` file exists in the root directory
- Verify the file name is exactly `.env.local` (with the dot at the beginning)
- Restart your development server after creating the file

### Script URL Not Working
- Verify the Google Apps Script is deployed as a web app
- Check that the script has "Anyone" access permissions
- Make sure the URL is exactly as provided above

## Next Steps

Once the environment variable is configured, you can:
- Test the Google Doc export with a single product (1-up layout)
- Try different layouts (2-up, 3-up, 4-up, 8-up)
- Customize banner colors and website names
- Share the generated Google Docs with your team

