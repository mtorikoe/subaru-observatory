/* ============================================================
   data.js — planet and brown dwarf companion data
   ============================================================ */
const PLANETS = [
  { name:'Beta Pic b type',  type:'planet',
    desc:'A young gas giant ~13× Jupiter mass imaged orbiting at 9 AU. One of the first directly imaged exoplanets.',
    color:'#c86aff', size:4 },
  { name:'HR 8799 b type',   type:'planet',
    desc:'One of four planets in the HR 8799 system — a ~7 MJ gas giant at 68 AU from its host star.',
    color:'#b050ff', size:3.5 },
  { name:'Kappa And b type', type:'planet',
    desc:'A super-Jupiter (~13 MJ) imaged at 1.06 arcsec separation — a flagship SCExAO target.',
    color:'#9040ee', size:3.5 },
  { name:'GJ 504 b type',    type:'planet',
    desc:'A pink gas giant (~4 MJ) detected at H-band. One of the lowest-mass directly imaged companions.',
    color:'#ff80c0', size:3 },
];

const BROWN_DWARFS = [
  { name:'Brown dwarf companion', type:'browndwarf',
    desc:'A substellar object too massive to be a planet (~15–75 MJ). Luminous in infrared but not a true exoplanet.',
    color:'#ff8844', size:5.5 },
  { name:'T-type brown dwarf',    type:'browndwarf',
    desc:'A cool brown dwarf (T~1200 K) with methane bands. Bright at H-band and a common false positive in direct imaging.',
    color:'#ff6622', size:5 },
];