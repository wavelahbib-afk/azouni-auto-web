import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Hero({ articleCount }: { articleCount: number }) {
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || 'AZOUNI AUTO';

  return (
    <section className="relative bg-brand overflow-hidden">
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{shopName}</h1>
        <p className="mt-3 text-brand-soft/90 text-base sm:text-lg max-w-xl mx-auto">
          Pièces détachées automobiles de qualité, {articleCount > 0 ? `plus de ${articleCount} références` : 'un large catalogue'} disponibles
          en stock.
        </p>
        <Link
          href="#catalogue"
          className="inline-flex items-center gap-2 mt-7 px-6 py-3 rounded-full bg-white text-brand font-semibold text-sm hover:bg-brand-soft transition-colors shadow-lg"
        >
          Découvrir le catalogue
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
