import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  let slugPath = slug?.join("/") ?? "";

  // Default to the correct loader version if missing
  if (!slugPath.endsWith(".js")) {
    slugPath += "/loader_v3.12.1.js";
  }

  const url = `https://fpnpmcdn.net/${slugPath}${req.nextUrl.search}`;

  const res = await fetch(url, { method: "GET" });

  if (!res.ok) {
    return new Response("Upstream fetch failed", { status: res.status });
  }

  const text = await res.text();
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "application/javascript" },
  });
}
