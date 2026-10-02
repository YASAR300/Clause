/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  serverExternalPackages: ["pdfjs-dist", "mammoth"],
};

export default nextConfig;
