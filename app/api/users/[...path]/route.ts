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
    // Get the user service base URL
    const userServiceUrl = process.env.NEXT_PUBLIC_USER_SERVICE;
    
    // In production (Vercel), the environment variable must be set
    if (!userServiceUrl) {
      console.error('[Proxy] NEXT_PUBLIC_USER_SERVICE environment variable is not set');
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { 
            detail: "User service URL not configured. Please set NEXT_PUBLIC_USER_SERVICE environment variable in Vercel.",
            error: "MISSING_ENV_VAR"
          },
          { status: 500 }
        );
      }
      // In development, use localhost as fallback
      console.warn(`[Proxy] Using fallback URL: http://localhost:8000`);
    }
    
    const finalUrl = userServiceUrl || 'http://localhost:8000';
    const baseUrl = finalUrl.replace(/\/$/, '');
    
    // Get params - handle both sync and async params
    let params: { path: string[] };
    try {
      params = await context.params;
    } catch (paramError: any) {
      console.error('[Proxy] Error getting params:', paramError);
      return NextResponse.json(
        { detail: "Error processing request parameters", error: paramError.message },
        { status: 500 }
      );
    }
    
    // Reconstruct the path
    const path = params.path?.join('/') || '';
    
    // Include query parameters if present
    const searchParams = req.nextUrl.searchParams.toString();
    const queryString = searchParams ? `?${searchParams}` : '';
    const targetUrl = `${baseUrl}/api/users/${path}${queryString}`;
    
    console.log(`[Proxy] ${method} ${targetUrl}`);
    console.log(`[Proxy] Base URL: ${baseUrl}, Path: ${path}`);
    console.log(`[Proxy] User Service URL from env: ${userServiceUrl}`);
    
    // Get request body if present
    let body: string | undefined;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      try {
        const json = await req.json();
        body = JSON.stringify(json);
        console.log(`[Proxy] Request body:`, json);
      } catch (e: any) {
        // No body or invalid JSON - this is okay for some requests
        console.log(`[Proxy] No request body:`, e.message);
        body = undefined;
      }
    }
    
    // Forward the request to the user service
    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        // Forward authorization header if present
        ...(req.headers.get("authorization") && {
          Authorization: req.headers.get("authorization")!,
        }),
      },
      body,
    };
    
    // Add timeout for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response: Response;
    try {
      response = await fetch(targetUrl, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error(`[Proxy] Fetch error for ${targetUrl}:`, fetchError);
      
      // Handle different types of fetch errors
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { detail: "Request timeout - the user service did not respond in time" },
          { status: 504 }
        );
      }
      
      if (fetchError.code === 'ECONNREFUSED' || fetchError.message?.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { detail: "Connection refused - the user service may be down or unreachable" },
          { status: 503 }
        );
      }
      
      if (fetchError.message?.includes('ENOTFOUND') || fetchError.message?.includes('getaddrinfo')) {
        return NextResponse.json(
          { detail: "DNS resolution failed - check the user service URL" },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { detail: fetchError.message || "Failed to connect to user service" },
        { status: 502 }
      );
    }
    
    // Get response data
    let data: any;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch (e) {
        data = { detail: "Invalid JSON response from user service" };
      }
    } else {
      const text = await response.text();
      data = text ? { detail: text } : {};
    }
    
    console.log(`[Proxy] Response status: ${response.status}`);
    
    // Return response with same status
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("[Proxy] Unexpected error:", error);
    console.error("[Proxy] Error stack:", error.stack);
    console.error("[Proxy] Error name:", error.name);
    console.error("[Proxy] Error message:", error.message);
    
    // Provide more detailed error information
    const errorDetail = {
      detail: error.message || "Internal server error in proxy",
      error: error.name || "UnknownError",
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        userServiceUrl: process.env.NEXT_PUBLIC_USER_SERVICE || 'not set'
      })
    };
    
    return NextResponse.json(errorDetail, { status: 500 });
  }
}

