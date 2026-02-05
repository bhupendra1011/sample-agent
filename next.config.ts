import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    // Fix for @netless/fastboard-react using 'global' which doesn't exist in browsers
    if (!isServer) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          global: "globalThis",
        })
      );
    }
    return config;
  },
};

export default nextConfig;
