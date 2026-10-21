'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** Copie un texte (reference de l'article) dans le presse-papiers ; confirmation visuelle de 1,5 s. */
export function CopyButton({ text, label = 'Copier' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // presse-papiers indisponible (navigation privee, http) : rien a faire, la reference reste selectionnable a la main
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label} ${text}`}
      title={copied ? 'Copié !' : label}
      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-brand hover:bg-brand-soft transition-colors"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
    </button>
  );
}
