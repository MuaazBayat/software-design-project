import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route to proxy Calendarific holidays and cultural events
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
    
    // Calendarific API configuration
    const API_KEY = 'NNQb3QuyuAYUbKH2k8PfONapBpOjpzS3';
    const currentYear = new Date().getFullYear();
    const calendarificUrl = `https://calendarific.com/api/v2/holidays?api_key=${API_KEY}&country=${isoCode}&year=${currentYear}`;
    
    console.log(`🗓️ Server: Fetching Calendarific data for ISO code: ${isoCode}`);
    console.log(`📡 Server: Calendarific URL: ${calendarificUrl}`);
    
    // Fetch from Calendarific API (server-side, no CORS issues)
    const response = await fetch(calendarificUrl, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'default',
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Calendarific API returned ${response.status} for ${isoCode}`);
      console.error(`❌ Calendarific API error body:`, errorText);
      return NextResponse.json(
        { error: `Calendarific API returned ${response.status}`, details: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Check if API returned an error in the response
    if (data.meta?.code !== 200) {
      console.error(`❌ Calendarific API error: ${data.meta?.error_detail || 'Unknown error'}`);
      return NextResponse.json(
        { error: data.meta?.error_detail || 'Calendarific API error' },
        { status: data.meta?.code || 500 }
      );
    }
    
    const holidayCount = data.response?.holidays?.length || 0;
    console.log(`✅ Server: Successfully fetched ${holidayCount} holidays/events for ${isoCode}`);
    
    // Return the data to the client
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800', // Cache for 1 day
      },
    });
    
  } catch (error) {
    console.error('❌ Server: Calendarific API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Calendarific data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


