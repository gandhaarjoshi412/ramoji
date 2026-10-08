export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const backendOrigin = "https://backapi.platesight.in";
    const frontendOrigin = "https://frontend-wine-ten-90.vercel.app";

    // Direct API, static uploads, and interactive API documentation to VPS backend via backapi.platesight.in
    if (
      url.pathname.startsWith("/api") ||
      url.pathname.startsWith("/uploads") ||
      url.pathname === "/docs" ||
      url.pathname === "/openapi.json" ||
      url.pathname === "/redoc"
    ) {
      const targetUrl = new URL(url.pathname + url.search, backendOrigin);
      const newHeaders = new Headers(request.headers);
      newHeaders.set("Host", "backapi.platesight.in");
      newHeaders.set("X-Forwarded-Host", url.host);
      newHeaders.set("X-Forwarded-Proto", "https");

      const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
        redirect: "follow",
      });

      return fetch(newRequest);
    }

    // Direct all other requests (Next.js pages, static bundles, assets) to Vercel
    const targetUrl = new URL(url.pathname + url.search, frontendOrigin);
    const newHeaders = new Headers(request.headers);
    newHeaders.set("Host", "frontend-wine-ten-90.vercel.app");
    newHeaders.set("X-Forwarded-Host", url.host);
    newHeaders.set("X-Forwarded-Proto", "https");

    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "follow",
    });

    return fetch(newRequest);
  },
};
