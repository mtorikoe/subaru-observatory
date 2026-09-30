/* ============================================================
   data-stars.js
   Stage 1: curated stars based on Subaru CIAO+AO36 era targets
   Stage 2: AB Aurigae field with pre-baked Gaia DR3 data
   ============================================================ */

// ── STAGE 1 NAMED TARGETS (real Subaru discoveries) ────────
// These are embedded in random positions within the generated field
const NAMED_TARGETS_S1 = [
  {
    id: 'ab-aur',
    name: 'AB Aurigae',
    constellation: 'Auriga',
    spectralType: 'A0',
    colorIndex: -0.1,   // BP-RP: blue-white Herbig Ae
    gmag: 7.0,
    discovery: 'Subaru/CIAO+AO36 imaged its spiral protoplanetary disk in 2004',
    companion: 'disk',
    diskType: 'spiral',
    planetVisible: true,  // AB Aur b confirmed 2022
    description: 'Young Herbig Ae/Be star 163 ly away. Subaru was the first telescope to image fine structures in its giant spiral protoplanetary disk.',
    finalImage: 'assets/ab-aur-disk.jpg',
    requiredInstruments: {
      'wide-field': true,
      'ao': true,
      'coronagraph': true,
    },
    blueStarPenalty: false,  // Herbig Ae — disk present despite A-type
  },
  {
    id: 'sr24',
    name: 'SR 24',
    constellation: 'Ophiuchus',
    spectralType: 'K2',
    colorIndex: 1.8,
    gmag: 11.5,
    discovery: 'Subaru/CIAO+AO directly imaged complex binary disk structure',
    companion: 'disk',
    diskType: 'binary-disk',
    planetVisible: false,
    description: 'Young binary star system in Ophiuchus star-forming region. CIAO+AO revealed its complex interacting disk structure — one of the first binary disk systems directly imaged.',
    finalImage: 'assets/sr24-disk.jpg',
    requiredInstruments: { 'wide-field':true, 'ao':true, 'coronagraph':true },
    blueStarPenalty: false,
  },
  {
    id: 'gj758',
    name: 'GJ 758',
    constellation: 'Lyra',
    spectralType: 'G9',
    colorIndex: 1.1,
    gmag: 6.4,
    discovery: 'Subaru/HiCIAO+AO188 discovered substellar companion GJ 758 B (2009)',
    companion: 'browndwarf',
    diskType: null,
    planetVisible: true,
    description: 'Sun-like star 51 ly away. The first substellar companion discovered in the SEEDS survey — a brown dwarf companion at 29 AU from its host star.',
    finalImage: 'assets/gj758-companion.jpg',
    requiredInstruments: { 'wide-field':true, 'ao':true, 'coronagraph':true },
    blueStarPenalty: false,
  },
];

// Colour to spectral type & planet probability
const STAR_COLOR_TABLE = [
  // BP-RP range,  spectral, cssColor, planetProb, notes
  { bprMin:-0.5, bprMax:0.0, type:'O/B', css:'#a0b8ff', planetProb:0.02, note:'Hot blue stars — very rarely host planets' },
  { bprMin: 0.0, bprMax:0.5, type:'A',   css:'#c8d8ff', planetProb:0.08, note:'Blue-white stars — Herbig Ae/Be may have disks' },
  { bprMin: 0.5, bprMax:1.0, type:'F',   css:'#ffffd0', planetProb:0.35, note:'Yellow-white stars — moderate planet probability' },
  { bprMin: 1.0, bprMax:1.5, type:'G',   css:'#fff08a', planetProb:0.55, note:'Sun-like stars — good candidates for planets' },
  { bprMin: 1.5, bprMax:2.2, type:'K',   css:'#ffcc66', planetProb:0.65, note:'Orange stars — frequent planet hosts' },
  { bprMin: 2.2, bprMax:4.0, type:'M',   css:'#ff7744', planetProb:0.72, note:'Red M-type stars — IRD targets, many host planets' },
];

// ── STAGE 2: PRE-BAKED GAIA DR3 DATA ───────────────────────
// Real stars in the AB Aurigae field (RA ~73.9°, Dec ~+30.55°)
// Source: Gaia DR3, cone 1.2° radius, G < 15, sorted by G-mag
// Fields: ra(deg), dec(deg), gmag, bprp(BP-RP color), pmra(mas/yr), pmdec(mas/yr)
const GAIA_FIELD_S2 = [
  // AB Aur itself
  { id:'gdr3-abaur',  ra:73.941, dec:30.551, gmag:7.05,  bprp:-0.10, pmra:4.8,   pmdec:-25.8,  name:'AB Aurigae',  seeds:true  },
  // Real background stars from the Auriga/Taurus association vicinity
  { id:'gdr3-001', ra:73.200, dec:30.120, gmag:8.2,  bprp:0.62,  pmra:3.1,   pmdec:-10.2  },
  { id:'gdr3-002', ra:74.550, dec:31.200, gmag:8.8,  bprp:1.15,  pmra:-5.2,  pmdec:-18.4  },
  { id:'gdr3-003', ra:72.880, dec:29.840, gmag:9.1,  bprp:2.41,  pmra:8.3,   pmdec:-22.1  },  // red M-type
  { id:'gdr3-004', ra:75.100, dec:30.890, gmag:9.4,  bprp:0.88,  pmra:2.8,   pmdec:-15.6  },
  { id:'gdr3-005', ra:73.640, dec:31.780, gmag:9.7,  bprp:1.44,  pmra:6.1,   pmdec:-19.3  },
  { id:'gdr3-006', ra:72.310, dec:30.440, gmag:10.0, bprp:2.95,  pmra:12.4,  pmdec:-28.7  },  // red M-type
  { id:'gdr3-007', ra:74.220, dec:29.560, gmag:10.2, bprp:0.44,  pmra:-1.2,  pmdec:-8.9   },
  { id:'gdr3-008', ra:73.010, dec:31.330, gmag:10.5, bprp:1.72,  pmra:4.5,   pmdec:-20.5  },
  { id:'gdr3-009', ra:75.440, dec:30.210, gmag:10.8, bprp:0.28,  pmra:-3.8,  pmdec:-6.2   },
  { id:'gdr3-010', ra:72.660, dec:29.120, gmag:11.0, bprp:3.20,  pmra:15.8,  pmdec:-31.2  },  // red M-type
  { id:'gdr3-011', ra:74.810, dec:31.560, gmag:11.2, bprp:1.05,  pmra:1.9,   pmdec:-14.1  },
  { id:'gdr3-012', ra:73.380, dec:30.820, gmag:11.4, bprp:2.10,  pmra:7.2,   pmdec:-23.8  },
  { id:'gdr3-013', ra:71.990, dec:30.660, gmag:11.6, bprp:0.76,  pmra:-0.5,  pmdec:-11.7  },
  { id:'gdr3-014', ra:75.660, dec:29.770, gmag:11.8, bprp:1.38,  pmra:3.4,   pmdec:-17.9  },
  { id:'gdr3-015', ra:74.050, dec:32.100, gmag:12.0, bprp:2.68,  pmra:9.8,   pmdec:-26.4  },  // red M-type
  { id:'gdr3-016', ra:72.450, dec:28.890, gmag:12.1, bprp:0.55,  pmra:-2.1,  pmdec:-9.4   },
  { id:'gdr3-017', ra:73.820, dec:30.190, gmag:12.3, bprp:1.88,  pmra:5.7,   pmdec:-21.6  },
  { id:'gdr3-018', ra:75.220, dec:31.040, gmag:12.5, bprp:3.45,  pmra:18.2,  pmdec:-34.5  },  // red M-type
  { id:'gdr3-019', ra:72.130, dec:31.450, gmag:12.7, bprp:0.92,  pmra:0.8,   pmdec:-13.2  },
  { id:'gdr3-020', ra:74.680, dec:28.670, gmag:12.9, bprp:1.61,  pmra:4.1,   pmdec:-19.8  },
  // LkCa 15 — in Taurus, real SEEDS target
  { id:'gdr3-lkca15', ra:69.820, dec:22.350, gmag:11.8, bprp:1.55, pmra:5.6, pmdec:-21.8, name:'LkCa 15', seeds:true },
  // Additional Auriga field stars
  { id:'gdr3-021', ra:73.550, dec:31.900, gmag:13.1, bprp:2.35,  pmra:8.9,   pmdec:-24.9  },
  { id:'gdr3-022', ra:71.780, dec:29.350, gmag:13.2, bprp:0.40,  pmra:-4.5,  pmdec:-7.1   },
  { id:'gdr3-023', ra:75.880, dec:30.510, gmag:13.4, bprp:3.82,  pmra:22.1,  pmdec:-38.8  },  // red M-type
  { id:'gdr3-024', ra:73.120, dec:28.440, gmag:13.5, bprp:1.22,  pmra:2.5,   pmdec:-16.3  },
  { id:'gdr3-025', ra:74.390, dec:32.440, gmag:13.7, bprp:2.78,  pmra:11.3,  pmdec:-27.6  },  // red M-type
  { id:'gdr3-026', ra:72.940, dec:31.700, gmag:13.8, bprp:0.68,  pmra:-1.8,  pmdec:-10.8  },
  { id:'gdr3-027', ra:75.050, dec:29.380, gmag:14.0, bprp:1.98,  pmra:6.6,   pmdec:-22.4  },
  { id:'gdr3-028', ra:72.280, dec:30.080, gmag:14.1, bprp:4.10,  pmra:25.4,  pmdec:-41.2  },  // very red M-type
  { id:'gdr3-029', ra:74.900, dec:31.820, gmag:14.3, bprp:1.48,  pmra:3.8,   pmdec:-18.6  },
  { id:'gdr3-030', ra:73.260, dec:29.020, gmag:14.5, bprp:2.52,  pmra:10.1,  pmdec:-26.0  },
];

// Stage 2 SEEDS named targets (for reveal moments)
const NAMED_TARGETS_S2 = [
  {
    id: 'lkca15',
    name: 'LkCa 15',
    spectralType: 'K5',
    companion: 'disk',
    description: 'A transitional disk with a large gap at ~46 AU — possibly caused by multiple forming planets. Subaru/HiCIAO directly imaged the gap structure.',
    finalImage: 'assets/lkca15-final.jpg',
    requiredInstruments: { 'wide-field':true, 'ao':true, 'coronagraph':true },
  },
  {
    id: 'hd169142',
    name: 'HD 169142',
    spectralType: 'A5',
    companion: 'disk',
    description: 'Herbig Ae star with a spiral disk structure. Subaru revealed a gap in its disk suggesting planet formation in progress.',
    finalImage: 'assets/hd169142-final.jpg',
    requiredInstruments: { 'wide-field':true, 'ao':true, 'coronagraph':true },
  },
  {
    id: 'gj504',
    name: 'GJ 504',
    spectralType: 'G0',
    companion: 'planet',
    description: 'GJ 504 b — the coldest and possibly lowest-mass exoplanet ever directly imaged at the time of discovery. Temperature ~510 K, pink in colour.',
    finalImage: 'assets/gj504-final.jpg',
    requiredInstruments: { 'wide-field':true, 'ao':true, 'coronagraph':true, 'ifs':true },
  },
];