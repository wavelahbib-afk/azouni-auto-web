import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

export function Footer() {
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || 'AZOUNI AUTO';
  const shopWhatsapp = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || '';
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <Image src="/logo.png" alt={shopName} width={36} height={36} className="rounded-lg" />
            <span className="font-extrabold text-white">{shopName}</span>
          </div>
          <p className="text-sm text-slate-400">
            Pièces détachées automobiles : large catalogue, prix compétitifs, commande simple par WhatsApp.
          </p>
        </div>

        <div>
          <h3 className="text-white font-semibold text-sm mb-3">Navigation</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Catalogue
              </Link>
            </li>
            <li>
              <Link href="/panier" className="hover:text-white transition-colors">
                Mon panier
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold text-sm mb-3">Contact</h3>
          {shopWhatsapp ? (
            <a
              href={`https://wa.me/${shopWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm hover:text-white transition-colors"
            >
              <MessageCircle size={16} className="text-green-500" />
              Commander via WhatsApp
            </a>
          ) : (
            <p className="text-sm text-slate-500">Contact non configuré.</p>
          )}
        </div>
      </div>
      <div className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        © {year} {shopName}. Tous droits réservés.
      </div>
    </footer>
  );
}
