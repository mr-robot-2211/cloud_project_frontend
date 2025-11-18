import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("Analytics event:", body);
  
  // Forward to analytics service
  const analyticsUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8005';
  
  try {
    const response = await fetch(`${analyticsUrl}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error("Analytics service error:", response.statusText);
    }
  } catch (error) {
    console.error("Failed to forward event to analytics service:", error);
    // Don't fail the request if analytics fails
  }
  
  return NextResponse.json({ status: "ok" });
}
