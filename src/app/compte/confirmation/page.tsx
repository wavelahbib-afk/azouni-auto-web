import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailConfirmation } from "@/components/EmailConfirmation";

// Page ouverte depuis le lien des e-mails (confirmation d'inscription, mot de passe oublie) : rien a indexer.
export const metadata: Metadata = {
  title: "Confirmation",
  robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Suspense fallback={null}>
        <EmailConfirmation />
      </Suspense>
    </div>
  );
}
