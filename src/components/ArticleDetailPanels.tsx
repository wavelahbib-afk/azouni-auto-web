'use client';

import { useState } from 'react';
import { Tags, Car, ChevronDown } from 'lucide-react';

interface VehicleGroup {
  make: string;
  models: string[];
}

export function ArticleDetailPanels({ equivalences, vehicleCompat }: { equivalences: string[]; vehicleCompat: VehicleGroup[] }) {
  const [openEquiv, setOpenEquiv] = useState(false);
  const [openVehicles, setOpenVehicles] = useState(false);

  if (equivalences.length === 0 && vehicleCompat.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
      <div className="flex flex-wrap gap-2.5">
        {equivalences.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenEquiv((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              openEquiv ? 'bg-brand text-white' : 'bg-brand-soft text-brand hover:bg-brand hover:text-white'
            }`}
          >
            <Tags size={15} />
            Références d&apos;origine ({equivalences.length})
            <ChevronDown size={14} className={`transition-transform ${openEquiv ? 'rotate-180' : ''}`} />
          </button>
        )}
        {vehicleCompat.length > 0 && (
          <button
            type="button"
            onClick={() => setOpenVehicles((v) => !v)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              openVehicles ? 'bg-brand text-white' : 'bg-brand-soft text-brand hover:bg-brand hover:text-white'
            }`}
          >
            <Car size={15} />
            Véhicules compatibles
            <ChevronDown size={14} className={`transition-transform ${openVehicles ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {openEquiv && equivalences.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {equivalences.map((ref) => (
            <span key={ref} className="text-xs font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {ref}
            </span>
          ))}
        </div>
      )}

      {openVehicles && vehicleCompat.length > 0 && (
        <div className="space-y-2.5">
          {vehicleCompat.map((g) => (
            <div key={g.make} className="text-sm">
              <span className="font-bold text-slate-700">{g.make} : </span>
              <span className="text-slate-600">{g.models.join(', ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
