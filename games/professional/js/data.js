/* ============================================================
   data.js — star targets, scoring weights, humidity config
   ============================================================ */

const STARS = [
  {
    cmd: 'gj504',
    display: 'GJ 504',
    type: 'planet',
    desc: 'Sun-like star ~60 ly away. Hosts GJ 504 b, the coldest directly imaged exoplanet — ~500 K, possibly only 3× Jupiter mass.',
    finalImageUrl: 'https://subarutelescope.org/en/results/8abcc497ac0eb2a7c446a10ebb8aa65a5c99c743.jpg',
    finalImageCredit: 'Credit: NAOJ',
    finalImageAlt: 'GJ 504 b — near-infrared direct image, Subaru/HiCIAO',
    localAsset: 'assets/gj504-final.jpg',
    hasHII: false,
    companionAngle: 210, companionDist: 0.55,
    companionColor: '#cc66aa',
  },
  {
    cmd: 'kappa-and',
    display: 'Kappa Andromedae',
    type: 'planet',
    desc: 'B-type star 170 ly away. Hosts κ And b, a super-Jupiter ~13× Jupiter mass at 1.8× Neptune\'s orbital separation.',
    finalImageUrl: 'https://subarutelescope.org/en/results/fig1e%20%287%29.jpg',
    finalImageCredit: 'Credit: NAOJ / Subaru / J. Carson / T. Currie',
    finalImageAlt: 'κ Andromedae b — near-infrared direct image, Subaru/HiCIAO',
    localAsset: 'assets/kappa-and-final.jpg',
    hasHII: false,
    companionAngle: 135, companionDist: 0.65,
    companionColor: '#ff8844',
  },
  {
    cmd: 'hr8799',
    display: 'HR 8799',
    type: 'multiplanet',
    desc: 'A-type star 129 ly away. Hosts four directly imaged gas giants (b, c, d, e), the first multi-planet directly imaged system.',
    finalImageUrl: 'https://subarutelescope.org/en/results/8abcc497ac0eb2a7c446a10ebb8aa65a5c99c743.jpg',
    finalImageCredit: 'Credit: NAOJ',
    finalImageAlt: 'HR 8799 multi-planet system — SCExAO/CHARIS',
    localAsset: 'assets/hr8799-final.jpg',
    hasHII: false,
    companionAngle: 60, companionDist: 0.50,
    companionColor: '#88aaff',
  },
  {
    cmd: 'hd1160',
    display: 'HD 1160',
    type: 'browndwarf',
    desc: 'A-type star ~100 ly away. Hosts two brown dwarf companions (B and C) — a key SCExAO/CHARIS spectroscopy target.',
    finalImageUrl: null,
    finalImageCredit: 'SCExAO/CHARIS',
    finalImageAlt: 'HD 1160 BC — CHARIS data cube broadband',
    localAsset: 'assets/hd1160-final.jpg',
    hasHII: false,
    companionAngle: 310, companionDist: 0.45,
    companionColor: '#ffcc44',
  },
  {
    cmd: 'beta-pic',
    display: 'Beta Pictoris',
    type: 'planet',
    desc: 'Young A-type star 63 ly away. β Pic b is one of the closest directly imaged planets — ~13 MJ at ~9 AU.',
    finalImageUrl: null,
    finalImageCredit: 'Credit: NAOJ/Subaru',
    finalImageAlt: 'Beta Pictoris b — H-band direct image',
    localAsset: 'assets/beta-pic-final.jpg',
    hasHII: false,
    companionAngle: 170, companionDist: 0.38,
    companionColor: '#ccaaff',
  },
  {
    cmd: 'lkca15',
    display: 'LkCa 15',
    type: 'disk',
    desc: 'Young T Tauri star in Taurus ~450 ly away. Has a transitional disk with a large gap — possibly forming planets inside.',
    finalImageUrl: null,
    finalImageCredit: 'Credit: NAOJ/Subaru SEEDS',
    finalImageAlt: 'LkCa 15 — protoplanetary disk, Subaru/HiCIAO',
    localAsset: 'assets/lkca15-final.jpg',
    hasHII: true,
    companionAngle: 90, companionDist: 0.70,
    companionColor: '#44ddaa',
  },
  {
    cmd: 'hip79977',
    display: 'HIP 79977',
    type: 'disk',
    desc: 'F-type star in Upper Scorpius ~145 ly away. Has a bright edge-on debris disk imaged by Subaru SEEDS in scattered light.',
    finalImageUrl: null,
    finalImageCredit: 'Credit: NAOJ/Subaru SEEDS',
    finalImageAlt: 'HIP 79977 debris disk — H-band, Subaru/HiCIAO',
    localAsset: 'assets/hip79977-final.jpg',
    hasHII: false,
    companionAngle: 0, companionDist: 0.60,
    companionColor: '#eeeecc',
  },
  {
    cmd: 'ab-dor',
    display: 'AB Doradus',
    type: 'browndwarf',
    desc: 'Young K-type star 15 ly away. AB Dor C is a very low-mass brown dwarf companion used to calibrate evolutionary models.',
    finalImageUrl: null,
    finalImageCredit: 'Credit: NAOJ',
    finalImageAlt: 'AB Doradus C — H-band direct image',
    localAsset: 'assets/ab-dor-final.jpg',
    hasHII: false,
    companionAngle: 245, companionDist: 0.35,
    companionColor: '#ff6633',
  },
  {
    cmd: 'vhs1256',
    display: 'VHS 1256',
    type: 'planet',
    desc: 'Low-mass binary star system 40 ly away. VHS 1256 b is a wide-separation super-Jupiter with methane in its atmosphere.',
    finalImageUrl: null,
    finalImageCredit: 'Credit: NAOJ/SCExAO',
    finalImageAlt: 'VHS 1256 b — H-band SCExAO',
    localAsset: 'assets/vhs1256-final.jpg',
    hasHII: false,
    companionAngle: 330, companionDist: 0.72,
    companionColor: '#aa88ff',
  },
  {
    cmd: '51-eri',
    display: '51 Eridani',
    type: 'planet',
    desc: 'F-type star ~100 ly away. 51 Eri b is one of the coldest directly imaged planets (~700 K), detected by GPI and Subaru.',
    finalImageUrl: null,
    finalImageCredit: 'Credit: NAOJ/SCExAO',
    finalImageAlt: '51 Eridani b — H-band direct image',
    localAsset: 'assets/51-eri-final.jpg',
    hasHII: false,
    companionAngle: 20, companionDist: 0.42,
    companionColor: '#6699ff',
  },
];

const SCORING = {
  ao3kPerformed:          10,
  pyramidWFSOn:           25,   // hidden bonus
  centerTarget:           20,
  scexaoAutoComplete:      0,   // shortcut — no bonus
  scexaoManualFull:       15,   // manual dm + coronagraph + lyot
  charisReconstructed:    20,
  vampireSplitPolarization: 15,
  perfectRun:             50,   // all optional steps done correctly in order
};

const HUMIDITY_CONFIG = {
  baseMin: 30,
  baseMax: 65,
  spikeChance: 0.10,     // 10% chance per session — ~1 in 10 games gets a spike
  spikeValue: 78,        // humidity during a spike
  spikeDuration: 20000,  // ms the spike lasts before recovering
  dangerThreshold: 70,
};

const TEMPERATURE_CONFIG = {
  base: 2,        // °C (summit is cold)
  variation: 3,
  min: -4,
  max: 8,
};