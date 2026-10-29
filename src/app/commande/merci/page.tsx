import type { Metadata } from "next";
import { Suspense } from "react";
import { ThankYou } from "@/components/ThankYou";

// Page "client" : elle affiche la commande qui vient d'etre passee (gardee dans l'onglet) -- rien a indexer.
export const metadata: Metadata = {
  title: "Commande envoyée",
  robots: { index: false, follow: false },
};

export default function MerciPage() {
  return (
    <Suspense fallback={null}>
      <ThankYou />
    </Suspense>
  );
}
