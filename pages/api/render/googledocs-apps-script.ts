import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse the request body
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ error: 'Missing JSON body' });
    }

    console.log('Received request:', JSON.stringify(payload, null, 2));

    // Get Google Apps Script URL from environment variable
    const url = process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!url) {
      console.error('Missing GOOGLE_APPS_SCRIPT_URL environment variable');
      return res.status(500).json({ error: 'Missing GOOGLE_APPS_SCRIPT_URL env' });
    }

    console.log('Calling Google Apps Script:', url);

    // Call Google Apps Script with pass-through approach
    const gasResponse = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(payload),
      cache: 'no-store', // no cache to avoid stale behavior
    });

    console.log('Google Apps Script response status:', gasResponse.status);

    const responseText = await gasResponse.text();
    console.log('Google Apps Script response text:', responseText);

    // Try to parse JSON but don't crash if it's plain text
    let jsonResponse: any;
    try { 
      jsonResponse = JSON.parse(responseText); 
    } catch { 
      jsonResponse = { raw: responseText }; 
    }

    console.log('Parsed response:', jsonResponse);

    // Always bubble up GAS status & body so you can see errors in Network tab
    // Return 200 to your UI even if GAS failed, so frontend can handle the response
    return res.status(200).json({ 
      status: gasResponse.status, 
      body: jsonResponse,
      gasSuccess: gasResponse.ok,
      originalResponse: responseText
    });

  } catch (e: any) {
    console.error('Route error:', e);
    return res.status(500).json({ 
      error: e?.message || String(e),
      type: 'route_error'
    });
  }
}
