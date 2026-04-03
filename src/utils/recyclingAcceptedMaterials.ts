const WASTE_ACCEPT: [string, string][] = [
  ['PAPIR', 'Papir'],
  ['PLASTIKA', 'Plastika'],
  ['STAKLO', 'Staklo'],
  ['METALNA_AM', 'Metalna ambalaža'],
  ['STARE_BATE', 'Stare baterije'],
  ['BIOOTPAD', 'Biootpad'],
  ['OTPAD_GUME', 'Gume'],
  ['OTPAD_MU', 'Miješani komunalni'],
  ['GRADJ_OTPA', 'Građevinski'],
  ['ELEK_OTPAD', 'Električni / elektronički'],
  ['OSTALO', 'Ostalo'],
];

export function acceptedMaterialsLine(p: Record<string, unknown>): string | undefined {
  const parts = WASTE_ACCEPT.filter(([k]) => {
    const v = p[k];
    return v === 'DA' || v === 'Da';
  }).map(([, label]) => label);
  return parts.length ? parts.join(', ') : undefined;
}
