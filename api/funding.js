{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // api/funding.js - Vercel serverless function\
export default async function handler(req, res) \{\
  // Enable CORS for your domain\
  res.setHeader('Access-Control-Allow-Origin', '*');\
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');\
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');\
\
  // Handle preflight requests\
  if (req.method === 'OPTIONS') \{\
    res.status(200).end();\
    return;\
  \}\
\
  // Only allow GET requests\
  if (req.method !== 'GET') \{\
    return res.status(405).json(\{ error: 'Method not allowed' \});\
  \}\
\
  try \{\
    // Airtable configuration from environment variables\
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;\
    const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME;\
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;\
\
    // Check if environment variables are set\
    if (!AIRTABLE_BASE_ID || !AIRTABLE_TABLE_NAME || !AIRTABLE_API_KEY) \{\
      return res.status(500).json(\{ \
        error: 'Missing Airtable configuration',\
        message: 'Please set AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME, and AIRTABLE_API_KEY environment variables'\
      \});\
    \}\
\
    // Fetch data from Airtable\
    const airtableUrl = `https://api.airtable.com/v0/$\{AIRTABLE_BASE_ID\}/$\{AIRTABLE_TABLE_NAME\}`;\
    \
    const response = await fetch(airtableUrl, \{\
      headers: \{\
        'Authorization': `Bearer $\{AIRTABLE_API_KEY\}`,\
        'Content-Type': 'application/json'\
      \}\
    \});\
\
    if (!response.ok) \{\
      throw new Error(`Airtable API error: $\{response.status\} $\{response.statusText\}`);\
    \}\
\
    const data = await response.json();\
\
    // Transform the data to a cleaner format\
    const transformedData = data.records.map(record => (\{\
      id: record.id,\
      company: record.fields['Company Name'] || record.fields['Company'] || 'N/A',\
      roundType: record.fields['Round Type'] || record.fields['Round'] || 'N/A',\
      amount: record.fields['Amount'] || record.fields['Funding Amount'] || 0,\
      date: record.fields['Date'] || record.fields['Funding Date'] || '',\
      investors: record.fields['Investors'] || record.fields['Lead Investor'] || 'N/A',\
      industry: record.fields['Industry'] || record.fields['Sector'] || 'N/A',\
      description: record.fields['Description'] || '',\
      location: record.fields['Location'] || 'NYC',\
      employees: record.fields['Employees'] || record.fields['Company Size'] || '',\
      website: record.fields['Website'] || record.fields['Company Website'] || ''\
    \}));\
\
    // Sort by date (most recent first)\
    transformedData.sort((a, b) => \{\
      const dateA = new Date(a.date || 0);\
      const dateB = new Date(b.date || 0);\
      return dateB - dateA;\
    \});\
\
    // Add some metadata\
    const responseData = \{\
      data: transformedData,\
      meta: \{\
        total: transformedData.length,\
        lastUpdated: new Date().toISOString(),\
        source: 'Airtable'\
      \}\
    \};\
\
    // Cache for 5 minutes\
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');\
    \
    return res.status(200).json(responseData);\
\
  \} catch (error) \{\
    console.error('Error fetching from Airtable:', error);\
    return res.status(500).json(\{ \
      error: 'Failed to fetch data',\
      message: error.message \
    \});\
  \}\
\}}