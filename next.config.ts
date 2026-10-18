import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// What pages may load. Everything Polaris uses is its own: scripts, styles, fonts (next/font
// serves them from this site) and the AI calls (same-site /api routes). Inline scripts stay
// allowed because the app is statically pre-rendered, which per-request nonces would rule out.
// Development also needs eval (React's error overlays) and the hot-reload websocket.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  // Don't guess file types, don't let other sites frame the app, and keep the URL to ourselves.
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Polaris needs none of these. (Statement photos use the file picker, which isn't affected.)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Browsers only honour this over HTTPS, so it doesn't affect testing over local Wi-Fi.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    // On this Windows setup the dev watcher sometimes misses edits, and the persistent dev cache
    // then kept serving stale modules (prompts, globals.css) even across restarts. A cold dev
    // start is a little slower but always current. Production builds still use their cache.
    turbopackFileSystemCacheForDev: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
