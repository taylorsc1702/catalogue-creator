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

type EmailTemplate = 'single' | 'grid-2' | 'grid-3' | 'grid-4' | 'list' | 'spotlight' | 'featured' | 'mixed';

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
      emailTemplateAssignments,
      hyperlinkToggle = 'woodslane',
      utmParams,
      discountCode,
      bannerImageUrl,
      freeText,
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
      emailTemplateAssignments?: EmailTemplate[];
      hyperlinkToggle?: HyperlinkToggle;
      utmParams?: UtmParams;
      discountCode?: string;
      bannerImageUrl?: string;
      freeText?: string;
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
    
    // Validate emailTemplateAssignments if provided
    if (emailTemplateAssignments && emailTemplateAssignments.length !== items.length) {
      throw new Error("emailTemplateAssignments must be same length as items");
    }

    const html = generateEmailHtml(items, template, emailTemplateAssignments, hyperlinkToggle, utmParams, discountCode, bannerImageUrl, freeText, theme, showFields);
    
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
  emailTemplateAssignments?: EmailTemplate[],
  hyperlinkToggle?: HyperlinkToggle,
  utmParams?: UtmParams,
  discountCode?: string,
  bannerImageUrl?: string,
  freeText?: string,
  theme?: {
    primaryColor?: string;
    textColor?: string;
    backgroundColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
  },
  showFields?: Record<string, boolean>
): string {
  const toggle = hyperlinkToggle || 'woodslane';
  
  // Get logo URLs
  const logoUrls: Record<HyperlinkToggle, string> = {
    woodslane: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/woodslane-square-logo-transparent_a9785ae1-b798-4ab4-963d-89a4fc3f3fdb.png?v=1755213158',
    woodslanehealth: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/WoodslaneHealth-logo-square_50093948-c033-48aa-8274-694237479a8a.jpg?v=1761655710',
    woodslaneeducation: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/WoodslaneEducation-logos-square_60e40eef-f666-4f6a-a8e0-f07efca5a9dd.jpg?v=1761655806',
    woodslanepress: 'https://cdn.shopify.com/s/files/1/0651/9390/2132/files/woodslane_PRESS_logo_duo_1.jpg?v=1718778690'
  };
  
  // Get website names
  const websiteNames: Record<HyperlinkToggle, string> = {
    woodslane: 'www.woodslane.com.au',
    woodslanehealth: 'www.woodslanehealth.com.au',
    woodslaneeducation: 'www.woodslaneeducation.com.au',
    woodslanepress: 'www.woodslanepress.com.au'
  };
  
  // Get banner colors
  const bannerColors: Record<HyperlinkToggle, string> = {
    woodslane: '#F7981D',
    woodslanehealth: '#192C6B',
    woodslaneeducation: '#E4506E',
    woodslanepress: '#1EADFF'
  };
  
  const logoUrl = logoUrls[toggle];
  const websiteName = websiteNames[toggle];
  const bannerColor = theme?.primaryColor || bannerColors[toggle];
  const primaryColor = theme?.primaryColor || bannerColors[toggle];
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
    
    const toggle = hyperlinkToggle || 'woodslane';
    const baseUrl = `${baseUrls[toggle]}/products/${handle}`;
    
    const urlParams = new URLSearchParams();
    
    // Add discount code if provided
    if (discountCode) {
      urlParams.set('discount', discountCode);
    }
    
    // Add UTM parameters if provided
    if (utmParams) {
      if (utmParams.utmSource) urlParams.set('utm_source', utmParams.utmSource);
      if (utmParams.utmMedium) urlParams.set('utm_medium', utmParams.utmMedium);
      if (utmParams.utmCampaign) urlParams.set('utm_campaign', utmParams.utmCampaign);
      if (utmParams.utmContent) urlParams.set('utm_content', utmParams.utmContent);
      if (utmParams.utmTerm) urlParams.set('utm_term', utmParams.utmTerm);
    }
    
    return urlParams.toString() ? `${baseUrl}?${urlParams.toString()}` : baseUrl;
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
                      ${esc(item.author)}
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
                  ${esc(item.author)}
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
                      ${esc(item.author)}
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
  
  // Handle mixed format - use emailTemplateAssignments if provided
  if (emailTemplateAssignments && emailTemplateAssignments.length > 0) {
    // Render each item with its assigned template
    content = items.map((item, index) => {
      const assignedTemplate = emailTemplateAssignments[index] || template;
      
      switch (assignedTemplate) {
        case 'single':
        case 'featured':
          return renderSingleProduct(item);
          
        case 'spotlight':
          return renderSpotlight(item);
          
        case 'list':
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
                      ${esc(item.author)}
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
          
        case 'grid-2':
          // For grid-2, we need to render pairs
          if (index % 2 === 0 && index + 1 < items.length) {
            const nextItem = items[index + 1];
            const nextTemplate = emailTemplateAssignments[index + 1];
            if (nextTemplate === 'grid-2') {
              return `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                  <tr>
                    ${renderGridProduct(item, 280)}
                    ${renderGridProduct(nextItem, 280)}
                  </tr>
                </table>
              `;
            }
          }
          // If not paired, render as single
          return renderSingleProduct(item);
          
        case 'grid-3':
          // For grid-3, we need to render triplets
          if (index % 3 === 0 && index + 2 < items.length) {
            const nextItem = items[index + 1];
            const nextNextItem = items[index + 2];
            const nextTemplate = emailTemplateAssignments[index + 1];
            const nextNextTemplate = emailTemplateAssignments[index + 2];
            if (nextTemplate === 'grid-3' && nextNextTemplate === 'grid-3') {
              return `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                  <tr>
                    ${renderGridProduct(item, 180)}
                    ${renderGridProduct(nextItem, 180)}
                    ${renderGridProduct(nextNextItem, 180)}
                  </tr>
                </table>
              `;
            }
          }
          // If not in a triplet, render as single
          return renderSingleProduct(item);
          
        case 'grid-4':
          // For grid-4, we need to render quadruplets
          if (index % 4 === 0 && index + 3 < items.length) {
            const nextItem = items[index + 1];
            const nextNextItem = items[index + 2];
            const nextNextNextItem = items[index + 3];
            const nextTemplate = emailTemplateAssignments[index + 1];
            const nextNextTemplate = emailTemplateAssignments[index + 2];
            const nextNextNextTemplate = emailTemplateAssignments[index + 3];
            if (nextTemplate === 'grid-4' && nextNextTemplate === 'grid-4' && nextNextNextTemplate === 'grid-4') {
              return `
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                  <tr>
                    ${renderGridProduct(item, 135)}
                    ${renderGridProduct(nextItem, 135)}
                    ${renderGridProduct(nextNextItem, 135)}
                    ${renderGridProduct(nextNextNextItem, 135)}
                  </tr>
                </table>
              `;
            }
          }
          // If not in a quadruplet, render as single
          return renderSingleProduct(item);
          
        default:
          return renderSingleProduct(item);
      }
    }).filter((html, index) => {
      // Filter out duplicates for grid layouts
      const assignedTemplate = emailTemplateAssignments[index];
      if (assignedTemplate === 'grid-2' && index % 2 !== 0) return false;
      if (assignedTemplate === 'grid-3' && index % 3 !== 0) return false;
      if (assignedTemplate === 'grid-4' && index % 4 !== 0) return false;
      return true;
    }).join('');
    
    // Generate complete email with header, banner, free text, separator, and footer
    return generateCompleteEmailHtml(content, logoUrl, websiteName, bannerColor, bannerImageUrl, freeText, discountCode, toggle);
  }
  
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
                    ${esc(item.author)}
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

  // Generate complete email with header, banner, free text, separator, and footer
  return generateCompleteEmailHtml(content, logoUrl, websiteName, bannerColor, bannerImageUrl, freeText, discountCode, toggle);
}

// Helper function to generate complete email HTML structure
function generateCompleteEmailHtml(
  content: string,
  logoUrl: string,
  websiteName: string,
  bannerColor: string,
  bannerImageUrl?: string,
  freeText?: string,
  discountCode?: string,
  hyperlinkToggle?: HyperlinkToggle
): string {
  const esc = (s?: string) => (s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  
  // ABN numbers
  const abnNumbers: Record<HyperlinkToggle, string> = {
    woodslane: 'ABN: 76 003 677 549',
    woodslanehealth: 'ABN: 76 003 677 549',
    woodslaneeducation: 'ABN: 76 003 677 549',
    woodslanepress: 'ABN: 76 054 568 688'
  };
  
  const abn = abnNumbers[hyperlinkToggle || 'woodslane'];
  const toggle = hyperlinkToggle || 'woodslane';
  
  // Get base URL for unsubscribe link
  const baseUrls = {
    woodslane: 'https://woodslane.com.au',
    woodslanehealth: 'https://www.woodslanehealth.com.au',
    woodslaneeducation: 'https://www.woodslaneeducation.com.au',
    woodslanepress: 'https://www.woodslanepress.com.au'
  };
  const baseUrl = baseUrls[toggle];
  
  // Thin Header Banner (just website name on colored bar)
  const header = `
    <!-- Thin Header Banner -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${bannerColor}; border-radius: 8px 8px 0 0;">
      <tr>
        <td align="center" style="padding: 12px 20px;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
            <tr>
              <td align="center">
                <div style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff;">
                  ${esc(websiteName)}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
  
  // Logo (small, underneath banner)
  const logo = `
    <!-- Logo -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
      <tr>
        <td align="center" style="padding: 20px 20px 15px 20px;">
          <img src="${esc(logoUrl)}" alt="Logo" width="120" style="width: 120px; max-width: 100%; height: auto; display: block;">
        </td>
      </tr>
    </table>
  `;
  
  // Banner Image (if provided, comes after logo)
  const bannerImage = bannerImageUrl ? `
    <!-- Banner Image -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
      <tr>
        <td align="center" style="padding: 0 0 20px 0;">
          <img src="${esc(bannerImageUrl)}" alt="Banner" width="600" style="width: 600px; max-width: 100%; height: auto; display: block;">
        </td>
      </tr>
    </table>
  ` : '';
  
  // Free Text (if provided)
  const freeTextSection = freeText ? `
    <!-- Free Text -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
      <tr>
        <td align="center" style="padding: 30px 20px;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
            <tr>
              <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">
                ${esc(freeText).replace(/\n/g, '<br>')}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  ` : '';
  
  // Discount Separator (if discount code exists)
  const discountSeparator = discountCode ? `
    <!-- Discount Separator -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${bannerColor};">
      <tr>
        <td align="center" style="padding: 20px;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
            <tr>
              <td align="center" style="font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; color: #ffffff;">
                Don't forget to use the code <strong style="font-size: 20px;">${esc(discountCode)}</strong> at the checkout to save 15% off your order*.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  ` : `
    <!-- Separator (Banner Color) -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${bannerColor};">
      <tr>
        <td style="height: 10px; line-height: 10px; font-size: 10px;">&nbsp;</td>
      </tr>
    </table>
  `;
  
  // Footer with contact information
  const footer = `
    <!-- Footer -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${bannerColor};">
      <tr>
        <td align="center" style="padding: 30px 20px;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
            <tr>
              <td align="center" style="font-family: Arial, sans-serif; font-size: 14px; color: #ffffff; line-height: 1.8;">
                <p style="margin: 0 0 10px 0;">
                  <a href="mailto:info@woodslane.com.au" style="color: #ffffff; text-decoration: underline;">info@woodslane.com.au</a>
                </p>
                <p style="margin: 0 0 10px 0;">
                  ${esc(abn)}
                </p>
                <p style="margin: 0 0 10px 0;">
                  <a href="${esc(baseUrl)}/account/unsubscribe" style="color: #ffffff; text-decoration: underline;">Unsubscribe</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
  
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
      <td align="center" style="padding: 0;">
        ${header}
        ${logo}
        ${bannerImage}
        ${freeTextSection}
        ${discountSeparator}
        <!-- Products -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              ${content}
            </td>
          </tr>
        </table>
        ${footer}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

