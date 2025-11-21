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
    // Get the content service base URL
    // Use server-side only env var (without NEXT_PUBLIC_) to avoid exposing to client
    // Fallback to NEXT_PUBLIC_CONTENT_SERVICE for backward compatibility
    const contentServiceUrl = process.env.CONTENT_SERVICE_URL || process.env.NEXT_PUBLIC_CONTENT_SERVICE;
    
    // In production (Vercel), the environment variable must be set
    if (!contentServiceUrl) {
      console.error('[Proxy] CONTENT_SERVICE_URL or NEXT_PUBLIC_CONTENT_SERVICE environment variable is not set');
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { 
            detail: "Content service URL not configured. Please set CONTENT_SERVICE_URL environment variable in Vercel.",
            error: "MISSING_ENV_VAR",
          },
          { status: 500 }
        );
      }
      // In development, use localhost as fallback
      console.warn(`[Proxy] Using fallback URL: http://localhost:8003`);
    }
    
    const finalUrl = contentServiceUrl || 'http://localhost:8003';
    const baseUrl = finalUrl.replace(/\/$/, '');
    
    if (!baseUrl || baseUrl.trim() === '') {
      console.error('[Proxy] Invalid baseUrl after processing');
      return NextResponse.json(
        { 
          detail: "Invalid content service URL configuration",
          error: "INVALID_URL"
        },
        { status: 500 }
      );
    }
    
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
    // Content service uses /api prefix
    const targetUrl = `${baseUrl}/api/${path.replace(/\/$/, "")}${queryString}`;
    
    console.log(`[Proxy] ${method} ${targetUrl}`);
    console.log(`[Proxy] Content service base URL: ${baseUrl}`);
    
    // Get request body if present
    let body: string | undefined;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      try {
        const json = await req.json();
        body = JSON.stringify(json);
      } catch (e: any) {
        body = undefined;
      }
    }
    
    // Forward the request to the content service
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    // Forward authorization header if present
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      headers.Authorization = authHeader;
    }
    
    const fetchOptions: RequestInit = {
      method,
      headers,
      ...(body && { body }),
    };
    
    // Add timeout for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let response: Response;
    try {
      console.log(`[Proxy] Attempting fetch to: ${targetUrl}`);
      response = await fetch(targetUrl, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      console.log(`[Proxy] Fetch completed with status: ${response.status}`);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error(`[Proxy] Fetch error for ${targetUrl}:`, fetchError);
      console.error(`[Proxy] Fetch error details:`, {
        name: fetchError.name,
        message: fetchError.message,
        code: fetchError.code,
        cause: fetchError.cause
      });
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            detail: "Request timeout - the content service did not respond in time",
            error: "TIMEOUT",
            targetUrl: targetUrl
          },
          { status: 504 }
        );
      }
      
      if (fetchError.code === 'ECONNREFUSED' || fetchError.message?.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            detail: "Connection refused - the content service may be down or unreachable",
            error: "CONNECTION_REFUSED",
            targetUrl: targetUrl
          },
          { status: 503 }
        );
      }
      
      if (fetchError.message?.includes('ENOTFOUND') || fetchError.message?.includes('getaddrinfo')) {
        return NextResponse.json(
          { 
            detail: "DNS resolution failed - check the content service URL",
            error: "DNS_ERROR",
            targetUrl: targetUrl
          },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { 
          detail: fetchError.message || "Failed to connect to content service",
          error: "FETCH_ERROR",
          targetUrl: targetUrl,
          errorName: fetchError.name
        },
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
        const text = await response.text();
        data = text ? { detail: text } : { detail: "Invalid JSON response from content service" };
      }
    } else {
      const text = await response.text();
      data = text ? { detail: text } : {};
    }
    
    // Return response with same status
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error("[Proxy] Unexpected error:", error);
    return NextResponse.json(
      { 
        detail: error.message || "Internal server error in proxy",
        error: error.name || "UnknownError",
      },
      { status: 500 }
    );
  }
}

