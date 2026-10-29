import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // anciens liens de recherche (l'accueil portait la recherche : /?q=plaquette) -> le catalogue
      { source: "/", has: [{ type: "query", key: "q", value: "(?<q>.+)" }], destination: "/catalogue?q=:q", permanent: true },
    ];
  },
};

export default nextConfig;
