import type { NextApiRequest, NextApiResponse } from "next";

type Item = {
  title: string; subtitle?: string; description?: string; price?: string;
  author?: string; authorBio?: string; binding?: string; pages?: string;
  imprint?: string; dimensions?: string; releaseDate?: string; weight?: string;
  sku?: string; icrkdt?: string; icillus?: string; illustrations?: string; edition?: string;
  icauth?: string;
  publicity?: string; reviews?: string; imidis?: string; discount?: string;
  imageUrl?: string; additionalImages?: string[];
  handle: string; vendor?: string; tags?: string[];
};

type EmailTemplate = 'single' | 'grid-2' | 'grid-3' | 'grid-4' | 'list' | 'spotlight' | 'featured';

type HyperlinkToggle = 'woodslane' | 'woodslanehealth' | 'woodslaneeducation' | 'woodslanepress';

type UtmParams = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { 
      items, 
      template = 'single',
      hyperlinkToggle = 'woodslane',
      utmParams,
      theme = {
        primaryColor: '#F7981D',
        textColor: '#333333',
        backgroundColor: '#ffffff',
        buttonColor: '#007bff',
        buttonTextColor: '#ffffff'
      },
      showFields = {
        subtitle: true,
        author: true,
        description: true,
        price: true,
        imprint: true,
        releaseDate: true
      }
    } = req.body as {
      items: Item[];
      template?: EmailTemplate;
      hyperlinkToggle?: HyperlinkToggle;
      utmParams?: UtmParams;
      theme?: {
        primaryColor?: string;
        textColor?: string;
        backgroundColor?: string;
        buttonColor?: string;
        buttonTextColor?: string;
      };
      showFields?: Record<string, boolean>;
    };

    if (!items?.length) throw new Error("No items provided");

    const html = generateEmailHtml(items, template, hyperlinkToggle, utmParams, theme, showFields);
    
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render email HTML";
    res.status(400).send(`<pre>${message}</pre>`);
  }
}

function generateEmailHtml(
  items: Item[],
  template: EmailTemplate,
  hyperlinkToggle: HyperlinkToggle,
  utmParams?: UtmParams,
  theme?: {
    primaryColor?: string;
    textColor?: string;
    backgroundColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  },
  showFields?: Record<string, boolean>
): string {
  const primaryColor = theme?.primaryColor || '#F7981D';
  const textColor = theme?.textColor || '#333333';
  const bgColor = theme?.backgroundColor || '#ffffff';
  const buttonColor = theme?.buttonColor || '#007bff';
  const buttonTextColor = theme?.buttonTextColor || '#ffffff';

  const esc = (s?: string) => (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const generateProductUrl = (handle: string): string => {
    const baseUrls = {
      woodslane: 'https://woodslane.com.au',
      woodslanehealth: 'https://www.woodslanehealth.com.au',
      woodslaneeducation: 'https://www.woodslaneeducation.com.au',
      woodslanepress: 'https://www.woodslanepress.com.au'
    };
    
    const baseUrl = `${baseUrls[hyperlinkToggle]}/products/${handle}`;
    
    if (utmParams) {
      const urlParams = new URLSearchParams();
      if (utmParams.utmSource) urlParams.set('utm_source', utmParams.utmSource);
      if (utmParams.utmMedium) urlParams.set('utm_medium', utmParams.utmMedium);
      if (utmParams.utmCampaign) urlParams.set('utm_campaign', utmParams.utmCampaign);
      if (utmParams.utmContent) urlParams.set('utm_content', utmParams.utmContent);
      if (utmParams.utmTerm) urlParams.set('utm_term', utmParams.utmTerm);
      
      return urlParams.toString() ? `${baseUrl}?${urlParams.toString()}` : baseUrl;
    }
    
    return baseUrl;
  };

  const truncateDescription = (desc?: string, maxLength: number = 200): string => {
    if (!desc) return '';
    if (desc.length <= maxLength) return desc;
    return desc.substring(0, maxLength - 3) + '...';
  };

  const formatDate = (date?: string): string => {
    if (!date) return '';
    try {
      const d = new Date(date);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${month}/${year}`;
    } catch {
      return date;
    }
  };

  const renderSingleProduct = (item: Item): string => {
    const productUrl = generateProductUrl(item.handle);
    const truncatedDesc = truncateDescription(item.description, 250);
    
    return `
      <!-- Single Product Template -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
        <tr>
          <td align="center" style="padding: 20px;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${bgColor}; border: 1px solid #e0e0e0;">
              <!-- Product Image -->
              <tr>
                <td align="center" style="padding: 20px 20px 10px 20px;">
                  <img src="${esc(item.imageUrl || 'https://via.placeholder.com/300x450?text=No+Image')}" 
                       alt="${esc(item.title)}" 
                       width="300" 
                       style="width: 300px; max-width: 100%; height: auto; display: block; border: 1px solid #ddd;">
                </td>
              </tr>
              
              <!-- Product Details -->
              <tr>
                <td style="padding: 20px; font-family: Arial, sans-serif;">
                  <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: bold; color: ${textColor}; line-height: 1.3;">
                    ${esc(item.title)}
                  </h2>
                  
                  ${item.subtitle && showFields?.subtitle ? `
                    <p style="margin: 0 0 10px 0; font-size: 16px; font-style: italic; color: #666;">
                      ${esc(item.subtitle)}
                    </p>
                  ` : ''}
                  
                  ${item.author && showFields?.author ? `
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: ${textColor}; font-weight: 600;">
                      By ${esc(item.author)}
                    </p>
                  ` : ''}
                  
                  ${truncatedDesc && showFields?.description ? `
                    <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; color: ${textColor};">
                      ${esc(truncatedDesc)}
                    </p>
                  ` : ''}
                  
                  <!-- Product Meta -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 15px 0;">
                    ${item.imprint && showFields?.imprint ? `
                      <tr>
                        <td style="padding: 5px 0; font-size: 13px; color: #666;">
                          <strong>Publisher:</strong> ${esc(item.imprint)}
                        </td>
                      </tr>
                    ` : ''}
                    ${item.releaseDate && showFields?.releaseDate ? `
                      <tr>
                        <td style="padding: 5px 0; font-size: 13px; color: #666;">
                          <strong>Release Date:</strong> ${esc(formatDate(item.releaseDate))}
                        </td>
                      </tr>
                    ` : ''}
                    ${item.binding ? `
                      <tr>
                        <td style="padding: 5px 0; font-size: 13px; color: #666;">
                          <strong>Binding:</strong> ${esc(item.binding)}
                        </td>
                      </tr>
                    ` : ''}
                    ${item.pages ? `
                      <tr>
                        <td style="padding: 5px 0; font-size: 13px; color: #666;">
                          <strong>Pages:</strong> ${esc(item.pages)}
                        </td>
                      </tr>
                    ` : ''}
                  </table>
                  
                  ${item.price && showFields?.price ? `
                    <p style="margin: 15px 0; font-size: 20px; font-weight: bold; color: ${primaryColor};">
                      AUD$ ${esc(item.price)}
                    </p>
                  ` : ''}
                  
                  <!-- CTA Button -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                    <tr>
                      <td align="center">
                        <a href="${esc(productUrl)}" 
                           style="display: inline-block; padding: 12px 30px; background-color: ${buttonColor}; color: ${buttonTextColor}; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                          Shop Now →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  };

  const renderGridProduct = (item: Item, width: number = 280): string => {
    const productUrl = generateProductUrl(item.handle);
    const truncatedDesc = truncateDescription(item.description, 120);
    
    return `
      <td width="${width}" valign="top" style="padding: 10px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${bgColor}; border: 1px solid #e0e0e0;">
          <tr>
            <td align="center" style="padding: 15px 15px 10px 15px;">
              <img src="${esc(item.imageUrl || 'https://via.placeholder.com/200x300?text=No+Image')}" 
                   alt="${esc(item.title)}" 
                   width="200" 
                   style="width: 200px; max-width: 100%; height: auto; display: block;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 15px 15px 15px; font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: ${textColor}; line-height: 1.3;">
                    ${esc(item.title)}
              </h3>
              ${item.author && showFields?.author ? `
                <p style="margin: 0 0 8px 0; font-size: 14px; color: ${textColor};">
                  By ${esc(item.author)}
                </p>
              ` : ''}
              ${truncatedDesc && showFields?.description ? `
                <p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.5; color: ${textColor};">
                  ${esc(truncatedDesc)}
                </p>
              ` : ''}
              ${item.price && showFields?.price ? `
                <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: ${primaryColor};">
                  AUD$ ${esc(item.price)}
                </p>
              ` : ''}
              <a href="${esc(productUrl)}" 
                 style="display: inline-block; padding: 8px 20px; background-color: ${buttonColor}; color: ${buttonTextColor}; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: bold;">
                Shop Now
              </a>
            </td>
          </tr>
        </table>
      </td>
    `;
  };

  const renderSpotlight = (item: Item): string => {
    const productUrl = generateProductUrl(item.handle);
    const truncatedDesc = truncateDescription(item.description, 300);
    
    return `
      <!-- Spotlight Template -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
        <tr>
          <td align="center" style="padding: 20px; background-color: ${primaryColor};">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: ${bgColor};">
              <tr>
                <td style="padding: 30px; font-family: Arial, sans-serif;">
                  <h1 style="margin: 0 0 15px 0; font-size: 32px; font-weight: bold; color: ${textColor}; text-align: center;">
                    New Release Spotlight
                  </h1>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 30px 20px 30px;">
                  <img src="${esc(item.imageUrl || 'https://via.placeholder.com/400x600?text=No+Image')}" 
                       alt="${esc(item.title)}" 
                       width="400" 
                       style="width: 400px; max-width: 100%; height: auto; display: block; border: 2px solid ${primaryColor};">
                </td>
              </tr>
              <tr>
                <td style="padding: 0 30px 30px 30px; font-family: Arial, sans-serif;">
                  <h2 style="margin: 0 0 10px 0; font-size: 26px; font-weight: bold; color: ${textColor}; text-align: center;">
                    ${esc(item.title)}
                  </h2>
                  ${item.subtitle && showFields?.subtitle ? `
                    <p style="margin: 0 0 10px 0; font-size: 18px; font-style: italic; color: #666; text-align: center;">
                      ${esc(item.subtitle)}
                    </p>
                  ` : ''}
                  ${item.author && showFields?.author ? `
                    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${textColor}; font-weight: 600; text-align: center;">
                      By ${esc(item.author)}
                    </p>
                  ` : ''}
                  ${truncatedDesc && showFields?.description ? `
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.7; color: ${textColor}; text-align: left;">
                      ${esc(truncatedDesc)}
                    </p>
                  ` : ''}
                  ${item.price && showFields?.price ? `
                    <p style="margin: 0 0 25px 0; font-size: 24px; font-weight: bold; color: ${primaryColor}; text-align: center;">
                      AUD$ ${esc(item.price)}
                    </p>
                  ` : ''}
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center">
                        <a href="${esc(productUrl)}" 
                           style="display: inline-block; padding: 15px 40px; background-color: ${buttonColor}; color: ${buttonTextColor}; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 18px;">
                          Shop Now →
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
  };

  // Generate HTML based on template
  let content = '';
  
  switch (template) {
    case 'single':
      content = items.map(item => renderSingleProduct(item)).join('');
      break;
      
    case 'grid-2':
      const chunks2 = [];
      for (let i = 0; i < items.length; i += 2) {
        chunks2.push(items.slice(i, i + 2));
      }
      content = chunks2.map(chunk => `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr>
            ${chunk.map(item => renderGridProduct(item, 280)).join('')}
            ${Array(2 - chunk.length).fill('<td width="280" style="padding: 10px;"></td>').join('')}
          </tr>
        </table>
      `).join('');
      break;
      
    case 'grid-3':
      const chunks3 = [];
      for (let i = 0; i < items.length; i += 3) {
        chunks3.push(items.slice(i, i + 3));
      }
      content = chunks3.map(chunk => `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr>
            ${chunk.map(item => renderGridProduct(item, 180)).join('')}
            ${Array(3 - chunk.length).fill('<td width="180" style="padding: 10px;"></td>').join('')}
          </tr>
        </table>
      `).join('');
      break;
      
    case 'grid-4':
      const chunks4 = [];
      for (let i = 0; i < items.length; i += 4) {
        chunks4.push(items.slice(i, i + 4));
      }
      content = chunks4.map(chunk => `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr>
            ${chunk.map(item => renderGridProduct(item, 135)).join('')}
            ${Array(4 - chunk.length).fill('<td width="135" style="padding: 10px;"></td>').join('')}
          </tr>
        </table>
      `).join('');
      break;
      
    case 'list':
      content = items.map(item => {
        const productUrl = generateProductUrl(item.handle);
        return `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
            <tr>
              <td width="150" valign="top" style="padding: 15px;">
                <img src="${esc(item.imageUrl || 'https://via.placeholder.com/150x200?text=No+Image')}" 
                     alt="${esc(item.title)}" 
                     width="150" 
                     style="width: 150px; max-width: 100%; height: auto; display: block;">
              </td>
              <td valign="top" style="padding: 15px; font-family: Arial, sans-serif;">
                <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: ${textColor};">
                  <a href="${esc(productUrl)}" style="color: ${textColor}; text-decoration: none;">
                    ${esc(item.title)}
                  </a>
                </h3>
                ${item.author && showFields?.author ? `
                  <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">
                    By ${esc(item.author)}
                  </p>
                ` : ''}
                ${item.description && showFields?.description ? `
                  <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 1.5; color: ${textColor};">
                    ${esc(truncateDescription(item.description, 150))}
                  </p>
                ` : ''}
                ${item.price && showFields?.price ? `
                  <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: ${primaryColor};">
                    AUD$ ${esc(item.price)}
                  </p>
                ` : ''}
                <a href="${esc(productUrl)}" 
                   style="display: inline-block; padding: 8px 20px; background-color: ${buttonColor}; color: ${buttonTextColor}; text-decoration: none; border-radius: 4px; font-size: 14px;">
                  View Product →
                </a>
              </td>
            </tr>
          </table>
        `;
      }).join('');
      break;
      
    case 'spotlight':
      content = renderSpotlight(items[0]);
      break;
      
    case 'featured':
      content = renderSingleProduct(items[0]);
      break;
  }

  // Complete email HTML with Mailchimp-compatible structure
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Product Email</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        ${content}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

