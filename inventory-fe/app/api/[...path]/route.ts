import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.INVENTORY_API_URL || "http://localhost:5126";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (
    !path.length ||
    !["products", "categories", "transactions", "stock"].includes(path[0]) ||
    path.length > 2
  ) {
    return NextResponse.json({ message: "Unknown API route" }, { status: 404 });
  }
  const url = `${API_URL.replace(/\/$/, "")}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  try {
    const response = await fetch(url, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body:
        request.method === "GET" || request.method === "DELETE"
          ? undefined
          : await request.text(),
      cache: "no-store",
    });
    const body = await response.text();
    return new NextResponse(body || null, {
      status: response.status,
      headers: body
        ? {
            "Content-Type":
              response.headers.get("Content-Type") || "text/plain",
          }
        : undefined,
    });
  } catch {
    return NextResponse.json(
      {
        message: `Cannot reach the inventory API at ${API_URL}. Start the backend and try again.`,
      },
      { status: 502 },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
