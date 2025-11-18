import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context, "POST");
}

export async function GET(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context, "GET");
}

export async function PUT(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context, "PUT");
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(req, context, "DELETE");
}

async function handleRequest(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
  method: string
) {
  try {
    const params = await context.params;
    // Get the user service base URL
    const userServiceUrl = process.env.NEXT_PUBLIC_USER_SERVICE || 'http://localhost:8000';
    const baseUrl = userServiceUrl.replace(/\/$/, '');
    
    // Reconstruct the path
    const path = params.path.join('/');
    
    // Include query parameters if present
    const searchParams = req.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    const targetUrl = `${baseUrl}/api/users/${path}${queryString}`;
    
    // Get request body if present
    let body: string | undefined;
    if (method === "POST" || method === "PUT") {
      try {
        const json = await req.json();
        body = JSON.stringify(json);
      } catch {
        // No body or invalid JSON
      }
    }
    
    // Forward the request to the user service
    const response = await fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        // Forward authorization header if present
        ...(req.headers.get("authorization") && {
          Authorization: req.headers.get("authorization")!,
        }),
      },
      body,
    });
    
    // Get response data
    const data = await response.json().catch(() => ({}));
    
    // Return response with same status
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("User service proxy error:", error);
    return NextResponse.json(
      { detail: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

