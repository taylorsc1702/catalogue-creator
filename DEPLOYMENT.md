# Deployment Guide

## Quick Deploy to Vercel (Recommended)

1. **Fork this repository** to your GitHub account
2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your forked repository
3. **Add Environment Variables:**
   - `SHOPIFY_STORE_DOMAIN` - Your Shopify store domain (without .myshopify.com)
   - `SHOPIFY_ADMIN_TOKEN` - Your Shopify Admin API access token
   - `SITE_BASE_URL` - Your Shopify store URL
   - `BASIC_AUTH_USER` - (Optional) Username for basic auth
   - `BASIC_AUTH_PASS` - (Optional) Password for basic auth
4. **Deploy** - Vercel will automatically build and deploy your app

## Alternative Deployment Options

### Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables in Netlify dashboard
5. Deploy

### Railway
1. Connect your GitHub repository to Railway
2. Add environment variables
3. Deploy automatically

### DigitalOcean App Platform
1. Create new app from GitHub
2. Select your repository
3. Add environment variables
4. Deploy

## Environment Variables

Create a `.env.local` file for local development:

```env
# Required
SHOPIFY_STORE_DOMAIN=your-store-name
SHOPIFY_ADMIN_TOKEN=your-admin-api-token
SITE_BASE_URL=https://your-store-name.myshopify.com

# Optional
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=your-secure-password
```

## Getting Shopify Credentials

1. Go to your Shopify Admin → Apps → App and sales channel settings
2. Click "Develop apps" → "Create an app"
3. Configure Admin API access scopes:
   - `read_products`
   - `read_product_listings`
4. Install the app and copy the Admin API access token

## Post-Deployment

1. Test your deployment by visiting the URL
2. Verify Shopify connection works
3. Test all export formats (HTML, DOCX, QR codes)
4. Configure custom domain if needed
5. Set up monitoring and analytics

## Troubleshooting

### Common Issues:
- **No products loading**: Check Shopify credentials and API permissions
- **Authentication issues**: Verify basic auth credentials or disable auth
- **Build failures**: Check Node.js version compatibility (requires 18+)
- **Export errors**: Verify all dependencies are installed

### Support:
- Check the main README.md for detailed setup instructions
- Review API endpoint documentation
- Test with `/api/debug/shopify` endpoint
