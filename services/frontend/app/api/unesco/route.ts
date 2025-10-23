import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to proxy UNESCO Intangible Cultural Heritage requests
 * This runs on the server side, avoiding CORS issues
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isoCode = searchParams.get('isoCode');
    
    if (!isoCode) {
      return NextResponse.json(
        { error: 'isoCode parameter is required' },
        { status: 400 }
      );
    }
    
    // Build the UNESCO API URL using the CORRECT format
    // Use 2-letter ISO code and the 'countries' field
    const fieldsToSelect = "title_en,description_en,inscription_year";
    const unescoUrl = `https://data.unesco.org/api/explore/v2.1/catalog/datasets/ich001/records?where=countries IN ('${isoCode}')&select=${fieldsToSelect}&limit=50`;
    
    console.log(`🏛️ Server: Fetching UNESCO data for ISO code: ${isoCode}`);
    console.log(`📡 Server: UNESCO URL: ${unescoUrl}`);
    
    // Fetch from UNESCO API (server-side, no CORS issues)
    const response = await fetch(unescoUrl, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'default',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ UNESCO API returned ${response.status} for ${isoCode}`);
      console.error(`❌ UNESCO API error body:`, errorText);
      console.error(`❌ URL that failed:`, unescoUrl);
      return NextResponse.json(
        { error: `UNESCO API returned ${response.status}`, details: errorText, url: unescoUrl },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log(`✅ Server: Successfully fetched ${data.total_count || 0} UNESCO elements for ${isoCode} (${data.results?.length || 0} results)`);
    
    // Return the data to the client
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
    
  } catch (error) {
    console.error('❌ Server: UNESCO API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch UNESCO data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

