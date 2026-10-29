/**
 * Regles de classement d'une piece en categorie du site, d'apres son NOM (designation correcte / nom de piece du moteur de designation de l'application).
 * FICHIER IDENTIQUE dans les deux projets : azouni-auto-web/src/lib/categoryRules.ts et azouni-auto/shared/webCategoryRules.ts -- a modifier aux deux endroits
 * (l'application calcule la categorie a la synchro, le site ne s'en sert qu'en repli quand la base du site n'a pas encore la colonne `categorie`).
 *
 * Les regles sont testees dans l'ordre, la premiere qui correspond l'emporte : les expressions precises passent avant les mots generiques
 * ("filtre a huile" est de la Filtration, pas de l'Entretien ; "huile de frein" est du Freinage ; "roulement central" est de la Transmission).
 */
export const CATEGORY_SLUGS = ['filtration', 'freinage', 'suspension-direction', 'transmission', 'electricite-allumage', 'huiles-entretien', 'moteur-distribution', 'autres'] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

/** Minuscules, sans accents, mots separes par un espace (tirets, barres, apostrophes, ponctuation = espaces), entoure d'espaces. */
export function normCategoryText(text: string): string {
  return ` ${text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;
}

const RULES: [CategorySlug, RegExp][] = [
  // --- expressions precises d'abord
  ['freinage', / (huile|liquide) (de )?frein /],
  ['filtration', / (filtre|filtres|cartouche de filtre|element filtrant) /],
  ['transmission', / (roulement central|roulement de boite|roulement d embrayage|joint de cardan|joint de transmission|soufflet cote boite|soufflet cote roue|support boite|cylindre recepteur|cylindre emetteur|cylindre d embrayage|butee d embrayage|butee hydraulique) /],
  ['freinage', / (plaquette|plaquettes|disque|disques|etrier|etriers|tambour|tambours|machoire|machoires|jeu de patins|jeu de patin|patin|patins|garniture|garnitures|servo|servofrein|maitre cylindre|cylindre de roue|cylindre de frein|flexible de frein|durite de frein|kit de frein|kit frein|temoin d usure|frein|freins|abs|repartiteur) /],
  ['transmission', / (cardan|cardans|soufflet de cardan|soufflets de cardan|tete de cardan|croisillon|embrayage|kit d embrayage|volant moteur|volant bi masse|boite de vitesse|boite de vitesses|arbre de transmission|differentiel|pont arriere|noix de cardan|cable d embrayage|bv) /],
  ['suspension-direction', / (amortisseur|amortisseurs|rotule|rotules|silentbloc|silentblocs|silbc|silent bloc|silent blocs|biellette|biellettes|barre stabilisatrice|barre anti roulis|triangle|triangles|bras de suspension|bras oscillant|cremaillere|direction|pivot|ressort|ressorts|coupelle|coupelles|butee d amortisseur|soufflet de direction|roulement|roulements|moyeu|moyeux|kit de roulement|suspension|barre de direction|stabilisatrice|train avant|train arriere|support d amortisseur) /],
  ['electricite-allumage', / (bougie|bougies|bobine|bobines|alternateur|alternateurs|demarreur|demarreurs|batterie|batteries|ampoule|ampoules|lampe|lampes|phare|phares|feu|feux|clignotant|clignotants|relais|fusible|fusibles|capteur|capteurs|sonde|sondes|lambda|faisceau|contacteur|interrupteur|manocontact|manocontacts|klaxon|avertisseur|allumage|calculateur|boitier|commodo|commodos|leve vitre|leve vitres|resistance|ventilateur|motoventilateur|electrovanne|electrique|electriques) /],
  ['huiles-entretien', / (huile|huiles|liquide|liquides|lave glace|antigel|graisse|graisses|nettoyant|nettoyants|additif|additifs|spray|degraissant|lubrifiant|essuie glace|balai|balais|colle|mastic|silicone|produit|produits|entretien|cire|shampoing|shampooing|polish|degivrant|refroidissement|eau radiateur|eau distillee|detergent|refrigerant|gaz clim) /],
  ['moteur-distribution', / (courroie|courroies|distribution|galet|galets|tendeur|tendeurs|poulie|poulies|pompe|joint de culasse|joint spi|joint|joints|culasse|piston|pistons|segment|segments|soupape|soupapes|poussoir|poussoirs|carter|thermostat|radiateur|radiateurs|durite|durites|turbo|turbocompresseur|injecteur|injecteurs|collecteur|echappement|silencieux|catalyseur|support moteur|culbuteur|vilebrequin|arbre a cames|chaine|chaines|egr|bouchon|jauge|reservoir|vase d expansion|refroidisseur|echangeur|intercooler|flexible|tuyau|tube d eau|pipette|bride|moteur|admission|bielle|bielles|pate joint|rondelle) /],
];

/** Categorie d'un nom de piece ("Plaquettes de frein avant" -> 'freinage') ; 'autres' si rien ne correspond. */
export function categorySlugOfText(text: string): CategorySlug {
  const t = normCategoryText(text);
  for (const [slug, re] of RULES) if (re.test(t)) return slug;
  return 'autres';
}
