import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "export",
  // GitHub Pages serves from /<repo-name>/ — set basePath to match.
  // Change "strona-test" if you rename the repo.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  images: {
    unoptimized: true, // required for static export (no Image Optimization API)
  },
};

export default nextConfig;
