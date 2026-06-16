/** FIFA team code → flagcdn.com slug */
export const FIFA_TO_FLAGCDN = {
  ALG: 'dz',
  ARG: 'ar',
  AUS: 'au',
  AUT: 'at',
  BEL: 'be',
  BIH: 'ba',
  BRA: 'br',
  CAN: 'ca',
  CIV: 'ci',
  COD: 'cd',
  COL: 'co',
  CPV: 'cv',
  CRO: 'hr',
  CUW: 'cw',
  CZE: 'cz',
  ECU: 'ec',
  EGY: 'eg',
  ENG: 'gb-eng',
  ESP: 'es',
  FRA: 'fr',
  GER: 'de',
  GHA: 'gh',
  HAI: 'ht',
  IRN: 'ir',
  IRQ: 'iq',
  JOR: 'jo',
  JPN: 'jp',
  KOR: 'kr',
  KSA: 'sa',
  MAR: 'ma',
  MEX: 'mx',
  NED: 'nl',
  NOR: 'no',
  NZL: 'nz',
  PAN: 'pa',
  PAR: 'py',
  POR: 'pt',
  QAT: 'qa',
  RSA: 'za',
  SCO: 'gb-sct',
  SEN: 'sn',
  SUI: 'ch',
  SWE: 'se',
  TUN: 'tn',
  TUR: 'tr',
  URU: 'uy',
  USA: 'us',
  UZB: 'uz',
};

export function getFlagCdnUrl(fifaCode) {
  const slug = FIFA_TO_FLAGCDN[fifaCode?.toUpperCase()];
  if (!slug) return null;
  return `https://flagcdn.com/w160/${slug}.png`;
}

export function getFlagApiPath(fifaCode) {
  const code = fifaCode?.toUpperCase();
  if (!code || !FIFA_TO_FLAGCDN[code]) return null;
  return `/api/flags/${code}`;
}
