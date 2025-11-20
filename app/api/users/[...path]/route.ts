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
    
    console.log('[Proxy] Starting request:', {
      method,
      hasUserServiceUrl: !!userServiceUrl,
      userServiceUrlPreview: userServiceUrl ? `${userServiceUrl.substring(0, 20)}...` : 'none',
      isVercel: !!process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV
    });
    
    // In production (Vercel), the environment variable must be set
    if (!userServiceUrl) {
      console.error('[Proxy] NEXT_PUBLIC_USER_SERVICE environment variable is not set');
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { 
            detail: "User service URL not configured. Please set NEXT_PUBLIC_USER_SERVICE environment variable in Vercel.",
            error: "MISSING_ENV_VAR",
            debug: {
              isVercel: !!process.env.VERCEL,
              nodeEnv: process.env.NODE_ENV
            }
          },
          { status: 500 }
        );
      }
      // In development, use localhost as fallback
      console.warn(`[Proxy] Using fallback URL: http://localhost:8000`);
    }
    
    const finalUrl = userServiceUrl || 'http://localhost:8000';
    const baseUrl = finalUrl.replace(/\/$/, '');
    
    if (!baseUrl || baseUrl.trim() === '') {
      console.error('[Proxy] Invalid baseUrl after processing');
      return NextResponse.json(
        { 
          detail: "Invalid user service URL configuration",
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
    
    // User service expects /api/users/login/
    // Remove /api/users if already present in baseUrl to avoid duplication
    let finalBaseUrl = baseUrl;
    if (baseUrl.endsWith('/api/users')) {
      finalBaseUrl = baseUrl.replace(/\/api\/users$/, '');
    } else if (baseUrl.endsWith('/api/users/')) {
      finalBaseUrl = baseUrl.replace(/\/api\/users\/$/, '');
    }
    const cleanPath = path.replace(/^\//, '').replace(/\/$/, "");
    const targetUrl = cleanPath
      ? `${finalBaseUrl}/api/users/${cleanPath}/${queryString}`
      : `${finalBaseUrl}/api/users/${queryString}`;
    
    console.log(`[Proxy] ${method} ${targetUrl}`);
    console.log(`[Proxy] Base URL: ${baseUrl}, Path: ${path}`);
    console.log(`[Proxy] User Service URL from env: ${userServiceUrl}`);
    
    // Get request body if present
    let body: string | undefined;
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      try {
        const json = await req.json();
        body = JSON.stringify(json);
        console.log(`[Proxy] Request body parsed successfully:`, Object.keys(json));
      } catch (e: any) {
        // No body or invalid JSON - this is okay for some requests
        console.log(`[Proxy] No request body or error reading:`, e.message);
        body = undefined;
      }
    }
    
    // Forward the request to the user service
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
      
      // Handle different types of fetch errors
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            detail: "Request timeout - the user service did not respond in time",
            error: "TIMEOUT",
            targetUrl: targetUrl
          },
          { status: 504 }
        );
      }
      
      if (fetchError.code === 'ECONNREFUSED' || fetchError.message?.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            detail: "Connection refused - the user service may be down or unreachable",
            error: "CONNECTION_REFUSED",
            targetUrl: targetUrl
          },
          { status: 503 }
        );
      }
      
      if (fetchError.message?.includes('ENOTFOUND') || fetchError.message?.includes('getaddrinfo')) {
        return NextResponse.json(
          { 
            detail: "DNS resolution failed - check the user service URL",
            error: "DNS_ERROR",
            targetUrl: targetUrl
          },
          { status: 502 }
        );
      }
      
      return NextResponse.json(
        { 
          detail: fetchError.message || "Failed to connect to user service",
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
        data = text ? { detail: text } : { detail: "Invalid JSON response from user service" };
      }
    } else {
      const text = await response.text();
      data = text ? { detail: text } : {};
    }
    
    console.log(`[Proxy] Response status: ${response.status}`, {
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      dataDetail: data?.detail || 'No detail field'
    });
    
    // Return response with same status
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error: any) {
    console.error("[Proxy] Unexpected error:", error);
    console.error("[Proxy] Error stack:", error.stack);
    console.error("[Proxy] Error name:", error.name);
    console.error("[Proxy] Error message:", error.message);
    
    // Provide more detailed error information that will be visible to client
    const errorDetail: any = {
      detail: error.message || "Internal server error in proxy",
      error: error.name || "UnknownError",
      // Always include debug info in production for troubleshooting
      debug: {
        userServiceUrlSet: !!process.env.NEXT_PUBLIC_USER_SERVICE,
        userServiceUrlLength: process.env.NEXT_PUBLIC_USER_SERVICE?.length || 0,
        isVercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV
      }
    };
    
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorDetail.stack = error.stack;
      errorDetail.userServiceUrl = process.env.NEXT_PUBLIC_USER_SERVICE || 'not set';
    }
    
    return NextResponse.json(errorDetail, { status: 500 });
  }
}

