import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    // Await params before using its properties (Next.js 15 requirement)
    const { user_id } = await params;

    // Get authentication token
    const { getToken } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Call the core service
    const coreServiceUrl = process.env.CORE_SERVICE_URL || "http://localhost:8000";
    const response = await fetch(
      `${coreServiceUrl}/profiles/by-user-id/${user_id}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Core service error (${response.status}):`, errorData);
      return NextResponse.json(
        { error: errorData || "Failed to fetch profile" },
        { status: response.status }
      );
    }

    const profileData = await response.json();
    console.log("Profile data fetched successfully:", profileData);
    return NextResponse.json(profileData);

  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}