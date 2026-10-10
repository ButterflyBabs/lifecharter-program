import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lesson scripts, handout PDFs and Charter PDF fonts are read from disk at request time; ship them with those routes.
  outputFileTracingIncludes: {
    "/app/week/[n]": ["./content/lessons/**"],
    "/app/handout/[n]": ["./handouts/pdf/**"],
    // The Charter PDF is drawn at request time from the brand fonts and logos.
    "/app/charter/pdf": ["./lib/program/charter-fonts/**", "./public/brand/**"],
    "/app/admin/charter/preview/pdf": ["./lib/program/charter-fonts/**", "./public/brand/**"],
  },
};

export default nextConfig;
