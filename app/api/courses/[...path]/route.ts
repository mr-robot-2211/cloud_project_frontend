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
    // Get the course service base URL
    const courseServiceUrl = process.env.NEXT_PUBLIC_COURSE_SERVICE;
    
    // In production (Vercel), the environment variable must be set
    if (!courseServiceUrl) {
      console.error('[Proxy] NEXT_PUBLIC_COURSE_SERVICE environment variable is not set');
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { 
            detail: "Course service URL not configured. Please set NEXT_PUBLIC_COURSE_SERVICE environment variable in Vercel.",
            error: "MISSING_ENV_VAR",
          },
          { status: 500 }
        );
      }
      // In development, use localhost as fallback
      console.warn(`[Proxy] Using fallback URL: http://localhost:8002`);
    }
    
    const finalUrl = courseServiceUrl || 'http://localhost:8002';
    const baseUrl = finalUrl.replace(/\/$/, '');
    
    if (!baseUrl || baseUrl.trim() === '') {
      console.error('[Proxy] Invalid baseUrl after processing');
      return NextResponse.json(
        { 
          detail: "Invalid course service URL configuration",
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
    
    // Course service expects paths like /course/api/courses/
    // Map /api/courses/123 -> /course/api/courses/123/
    const cleanPath = path.replace(/^\//, '').replace(/\/$/, "");
    // Remove /course/api if already present in baseUrl to avoid duplication
    let finalBaseUrl = baseUrl;
    if (baseUrl.endsWith('/course/api')) {
      finalBaseUrl = baseUrl.replace(/\/course\/api$/, '');
    } else if (baseUrl.endsWith('/course/api/')) {
      finalBaseUrl = baseUrl.replace(/\/course\/api\/$/, '');
    }
    const targetUrl = cleanPath 
      ? `${finalBaseUrl}/course/api/courses/${cleanPath}/${queryString}`
      : `${finalBaseUrl}/course/api/courses/${queryString}`;
    
    console.log(`[Proxy] ${method} ${targetUrl}`);
    
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
    
    // Forward the request to the course service
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
      response = await fetch(targetUrl, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error(`[Proxy] Fetch error for ${targetUrl}:`, fetchError);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            detail: "Request timeout - the course service did not respond in time",
            error: "TIMEOUT",
          },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { 
          detail: fetchError.message || "Failed to connect to course service",
          error: "FETCH_ERROR",
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
        data = text ? { detail: text } : { detail: "Invalid JSON response from course service" };
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

