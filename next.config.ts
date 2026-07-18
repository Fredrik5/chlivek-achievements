import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // public/ is served from a build-time snapshot in this Next.js version, so
  // files written at runtime (user-uploaded photos, achievement icons) 404
  // until the next deploy unless routed through a Route Handler that reads
  // the current file from disk instead. See src/lib/serveUploadedFile.ts.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/uploads/:filename", destination: "/api/uploads/:filename" },
        { source: "/icons/:filename", destination: "/api/icons/:filename" },
      ],
    };
  },
};

export default nextConfig;
