import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lesson scripts and handout PDFs are read from disk at request time; ship them with those routes.
  outputFileTracingIncludes: {
    "/app/week/[n]": ["./content/lessons/**"],
    "/app/handout/[n]": ["./handouts/pdf/**"],
  },
};

export default nextConfig;
