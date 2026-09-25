import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mysql2 is a native Node driver (needs net/tls). Keep it out of the
  // bundled output and require() it at runtime on the server instead.
  serverExternalPackages: ["mysql2"],
};

export default nextConfig;
