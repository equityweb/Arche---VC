// api/funding.js - Vercel serverless function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

    if (!AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME || !AIRTABLE_API_KEY) {
      return res.status(500).json({
        error: 'Missing Airtable configuration',
        message: 'Please set AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME, and AIRTABLE_API_KEY environment variables'
      });
    }

    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Transform each record
    const transformedData = data.records.map(record => ({
      id: record.id,
      company: record.fields['Company'] || 'N/A',
      roundType: record.fields['Round Type'] || 'N/A',
      amount: record.fields['Amount Raised'] || 0,
      date: record.fields['Date'] || '',
      investors: Array.isArray(record.fields['Investors']) 
        ? record.fields['Investors'].join(', ') 
        : (record.fields['Investors'] || 'N/A'),
      industry: 'N/A', // Not yet available in your base — add later
      website: record.fields['Source URL'] || '', // Acts as website link
    }));

    // Sort by date, most recent first
    transformedData.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    });

    const responseData = {
      data: transformedData,
      meta: {
        total: transformedData.length,
        lastUpdated: new Date().toISOString(),
        source: 'Airtable'
      }
    };

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('Error fetching from Airtable:', error);
    return res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message
    });
  }
}
