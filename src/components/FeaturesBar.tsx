import { PackageCheck, Wallet, MessageCircle, ShieldCheck } from 'lucide-react';

const FEATURES = [
  { icon: PackageCheck, label: 'Large catalogue', desc: 'Des milliers de références en stock' },
  { icon: Wallet, label: 'Prix compétitifs', desc: 'Le meilleur rapport qualité/prix' },
  { icon: MessageCircle, label: 'Commande simple', desc: 'Directement via WhatsApp' },
  { icon: ShieldCheck, label: 'Pièces vérifiées', desc: 'Références équivalentes fiables' },
];

export function FeaturesBar() {
  return (
    <section className="bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
        {FEATURES.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex flex-col items-center text-center gap-2">
            <div className="w-11 h-11 rounded-full bg-brand-soft text-brand flex items-center justify-center">
              <Icon size={20} />
            </div>
            <div className="text-sm font-semibold text-slate-800">{label}</div>
            <div className="text-xs text-slate-400 hidden sm:block">{desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
