import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler: true,
  basePath: "/laundry-pos/nextjs/template",
  turbopack: {
    root: __dirname,
  },
   output: "export",
};

export default nextConfig;
