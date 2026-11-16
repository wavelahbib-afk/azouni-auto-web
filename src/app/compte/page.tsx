import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AccountPanel } from "@/components/AccountPanel";

// Page personnelle (profil, commandes) : rien a indexer.
export const metadata: Metadata = {
  title: "Mon compte",
  robots: { index: false, follow: false },
};

export default function ComptePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Accueil", href: "/" }, { label: "Mon compte" }]} className="mb-4" />
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">Mon compte</h1>
      <AccountPanel />
    </div>
  );
}
