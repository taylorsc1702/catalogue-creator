# Catalogue Creator

A powerful Next.js application for creating professional product catalogues from your Shopify store. Perfect for B2B and B2C customers with customizable layouts and filtering options.

## Features

- **Shopify Integration**: Seamlessly connects to your Shopify store
- **Product Filtering**: Filter by tags, vendor, collection, metafields, or free text
- **Multiple Layouts**: Choose from 1-up, 2-up, 4-up, or 8-up catalogue layouts
- **Multiple Export Formats**: Generate HTML, DOCX, or QR code catalogues
- **Print-Ready Output**: HTML catalogues optimized for printing
- **QR Code Integration**: Generate QR codes linking to product pages
- **DOCX Export**: Download professional Word documents
- **Rich Product Data**: Displays author, subtitle, binding, pages, dimensions, release date, and more
- **Authentication**: Basic auth protection for secure access
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store-name
SHOPIFY_ADMIN_TOKEN=your-admin-api-token
SITE_BASE_URL=https://your-store-name.myshopify.com

# Optional: Basic Auth (leave empty to disable)
BASIC_AUTH_USER=admin
BASIC_AUTH_PASS=your-secure-password
```

### 3. Get Shopify Credentials

1. Go to your Shopify Admin → Apps → App and sales channel settings
2. Click "Develop apps" → "Create an app"
3. Configure Admin API access scopes:
   - `read_products`
   - `read_product_listings`
4. Install the app and copy the Admin API access token

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating a Catalogue

1. **Filter Products**: Use the search filters to find specific products:
   - **Tag**: Filter by product tags (e.g., "EDUCATION", "SOCIAL SCIENCES")
   - **Vendor**: Filter by publisher/vendor (e.g., "BROOKES PUBLISHING CO")
   - **Collection ID**: Filter by Shopify collection
   - **Metafield**: Search within specific metafields
   - **Free Text**: Advanced search queries

2. **Fetch Products**: Click "Fetch Products" to load products from Shopify

3. **Choose Layout**: Select your preferred catalogue layout:
   - **1-up**: Single product per page (detailed view)
   - **2-up**: Two products per page
   - **2-int**: Two products per page with internal image above barcode
   - **4-up**: Four products per page (default)
   - **8-up**: Eight products per page (compact view)

4. **Generate Catalogue**: Choose your export format:
   - **📄 HTML Print View**: Print-ready HTML catalogue
   - **📱 With QR Codes**: HTML catalogue with QR codes linking to products
   - **📝 Download DOCX**: Professional Word document download

### Product Information Displayed

Each product in the catalogue shows:
- **Title & Subtitle**
- **Author & Author Bio**
- **Price** (in AUD)
- **Binding** (Paperback, Hardback, etc.)
- **Pages & Dimensions**
- **Release Date & Imprint**
- **Weight & Illustrations**
- **Edition Information**
- **Product Image**
- **Product URL**

## API Endpoints

- `GET /` - Main catalogue creator interface
- `POST /api/products` - Fetch products from Shopify
- `POST /api/render/html` - Generate print-ready HTML catalogue
- `POST /api/render/barcode` - Generate HTML catalogue with QR codes
- `POST /api/render/docx` - Generate DOCX document download
- `GET /api/debug/shopify` - Test Shopify connection

## Customization

### Adding More Metafields

To display additional product metafields, edit `lib/shopify.ts`:

```typescript
// Add to the metafields query
metafields(first: 10) { 
  edges { 
    node { 
      key 
      namespace 
      value 
    } 
  } 
}
```

### Modifying Catalogue Layout

Edit `pages/api/render/html.ts` to customize the HTML output and styling.

### Adding B2B/B2C Features

The application is designed to be easily extended with:
- Customer type selection
- Different pricing tiers
- Customized layouts per customer type
- Bulk pricing displays

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- DigitalOcean App Platform
- Railway

## Troubleshooting

### No Products Loading
- Check your Shopify credentials in `.env.local`
- Verify your Shopify store has products
- Test the connection with `/api/debug/shopify`

### Authentication Issues
- Ensure `BASIC_AUTH_USER` and `BASIC_AUTH_PASS` are set
- Or leave them empty to disable authentication

### Metafields Not Showing
- Verify metafields exist in your Shopify store
- Check the metafield namespace and key names
- Use the debug endpoint to inspect available metafields

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the Shopify API documentation
3. Check the Next.js documentation for deployment issues

## License

This project is private and proprietary.
