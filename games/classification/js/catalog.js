/* ============================================================
   catalog.js — Classification game image catalog

   One entry per background image. The three quiz answers are
   derived directly from the Subaru Gallery metadata the user
   supplied (the instrument that took each image):

     band        → Q1  "Optical" vs "Infrared"
                    HSC / Suprime-Cam / FOCAS      = optical
                    HiCIAO / IRCS / MOIRCS / AO188 = infrared
     type        → Q2  object type (galaxy, exoplanet, …)
     instrument  → Q3  instrument label (correct answer)

   Q2 and Q3 are two-choice: the engine shows the correct value
   plus ONE random wrong value pulled from the pools below, so
   adding categories here needs no engine change.

   img: path to the background photo. Files live in img/<id>.jpg
   (mid-resolution from the Subaru Gallery). A few already exist
   in the shared /assets/star-pic library and are reused from
   there. Missing files degrade gracefully — the round is skipped.
   ============================================================ */

// Canonical labels (also the pools for random wrong answers)
const CL_BANDS = ['Optical', 'Infrared'];

const CL_TYPES = {
  galaxy:     'Galaxy',
  exoplanet:  'Exoplanet',
  comet:      'Comet',
  nebula:     'Nebula',
  cluster:    'Star Cluster',
  planet:     'Planet',
  star:       'Star',
  disk:       'Protoplanetary Disk',
};

const CL_INSTRUMENTS = {
  hsc:          'HSC',
  'hiciao+ao188':'HiCIAO + AO188',
  hiciao:       'HiCIAO',
  'ircs+ao188': 'IRCS + AO188',
  ircs:         'IRCS',
  moircs:       'MOIRCS',
  focas:        'FOCAS',
};

/* Each item:
   id         unique slug (also the image filename stem)
   name       shown on the result/award screen
   img        path to the background image
   band       'Optical' | 'Infrared'        (Q1 answer)
   type       key of CL_TYPES               (Q2 answer)
   instr      key of CL_INSTRUMENTS         (Q3 answer)
   url        Subaru Gallery / result page (credit + "learn more")
*/
const CL_CATALOG = [
  // ── HSC galaxies (optical) ──────────────────────────────
  { id:'ngc7783',      name:'Interacting Galaxies Arp 323 (NGC 7783)', band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc7332-7339', name:'Edge-on Galaxy Pair NGC 7332 & NGC 7339', band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc4996',      name:'Lenticular Galaxy NGC 4996',              band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'m77',          name:'Active Galaxy M77',                       band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc3504-3512', name:'Galaxy Pair NGC 3504 & NGC 3512',         band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc4045',      name:'Spiral Galaxy NGC 4045',                  band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'m82',          name:'Starburst Galaxy M82',                    band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc7458',      name:'Elliptical Galaxy NGC 7458',              band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc941',       name:'Intermediate Spiral Galaxy NGC 941',      band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc4273',      name:'Barred Spiral Galaxy NGC 4274 & Others',  band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ic1010',       name:'Barred Spiral Galaxy IC 1010',            band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc5301',      name:'Spiral Galaxy NGC 5301',                  band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc5211',      name:'Spiral Galaxy NGC 5211',                  band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc7537-7541', name:'Spiral Galaxy NGC 7537 & NGC 7541',       band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc958',       name:'Spiral Galaxy NGC 958',                   band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc748',       name:'Spiral Galaxy NGC 748',                   band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc4030',      name:'Spiral Galaxy NGC 4030',                  band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'cosmos',       name:'Deep Imaging of the COSMOS Field',        band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'sdssj0232',    name:'SDSS J0232.8-0323',                       band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc474',       name:'Interacting Galaxy NGC 474',              band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc5257-5258', name:'Interacting Galaxies NGC 5257 & NGC 5258',band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc4123',      name:'Barred Spiral Galaxy NGC 4123',           band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc660',       name:'Polar Ring Galaxy NGC 660',               band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc5366',      name:'Interacting Galaxies NGC 5366 & PGC 49574',band:'Optical', type:'galaxy', instr:'hsc' },
  { id:'ngc521',       name:'Spiral Galaxy NGC 521',                   band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc3312-3314', name:'Jellyfish Galaxies NGC 3312 & NGC 3314',  band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc4631-4656', name:'Whale Galaxy (NGC 4631) & Hockey Stick',  band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'jo204',        name:'Jellyfish Galaxy JO204',                  band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ugc9326-9327', name:'Jellyfish Galaxy UGC 9326 & UGC 9327',    band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'ngc6822',      name:'Irregular Galaxy NGC 6822',               band:'Optical',  type:'galaxy', instr:'hsc' },
  { id:'kkr25',        name:'Dwarf Galaxy KKR 25',                     band:'Optical',  type:'galaxy', instr:'hsc' },

  // ── HSC — other object types (optical) ──────────────────
  { id:'palomar3',     name:'Globular Cluster Palomar 3',              band:'Optical',  type:'cluster',instr:'hsc' },
  { id:'c2012s1',      name:'Comet ISON (C/2012 S1)',                  band:'Optical',  type:'comet',  instr:'hsc' },
  { id:'m42',          name:'Orion Nebula (M42)',                      band:'Optical',  type:'nebula', instr:'hsc' },

  // ── FOCAS (optical) ─────────────────────────────────────
  { id:'c2013r1',      name:'Comet Lovejoy (C/2013 R1)',               band:'Optical',  type:'comet',  instr:'focas' },

  // ── MOIRCS (infrared) ───────────────────────────────────
  { id:'sh2-209',      name:'Star-forming Region Sh 2-209',            band:'Infrared', type:'nebula', instr:'moircs' },
  { id:'ngc3521',      name:'Spiral Galaxy NGC 3521',                  band:'Infrared', type:'galaxy', instr:'moircs' },

  // ── IRCS / IRCS + AO188 (infrared) ──────────────────────
  { id:'jupiter-ganymede', name:'Jupiter and Ganymede',               band:'Infrared', type:'planet', instr:'ircs+ao188' },
  { id:'mars',         name:'Mars in Near-Infrared (IRCS)',            band:'Infrared', type:'planet', instr:'ircs' },

  // ── HiCIAO / HiCIAO + AO188 (infrared) ──────────────────
  { id:'gj504b',       name:'Exoplanet GJ 504 b — "Second Jupiter"',   band:'Infrared', type:'exoplanet', instr:'hiciao+ao188' },
  { id:'super-jupiter',name:'"Super-Jupiter" around Kappa Andromedae', band:'Infrared', type:'exoplanet', instr:'hiciao' },
  { id:'hatp7',        name:'Stellar Companion of HAT-P-7',            band:'Infrared', type:'star',      instr:'hiciao' },
  { id:'fuori',        name:'FU Ori Outbursts',                        band:'Infrared', type:'star',      instr:'hiciao' },
  { id:'pds70',        name:'Giant Gap in Protoplanetary Disk of PDS 70', band:'Infrared', type:'disk',   instr:'hiciao' },
  { id:'hr4796',       name:'Dust Ring around HR 4796',                band:'Infrared', type:'disk',      instr:'hiciao' },
];

// Fill in the image path. Entries already in the shared library
// point there; everything else resolves to this game's img folder.
const CL_SHARED = {
  gj504b:         '../../assets/star-pic/exoplanet/gj504b.jpg',
  'super-jupiter':'../../assets/star-pic/exoplanet/super-jupiter.jpg',
  palomar3:       '../../assets/star-pic/cluster/palomar3.jpg',
  c2012s1:        '../../assets/star-pic/comet/ison.jpg',
  ngc660:         '../../assets/star-pic/galaxy/ngc660.jpg',
  ngc4996:        '../../assets/star-pic/galaxy/ngc4996.jpg',
  'ngc5257-5258': '../../assets/star-pic/galaxy/ngc5257.jpg',
  'sh2-209':      '../../assets/star-pic/nebula/sh2-209.jpg',
  pds70:          '../../assets/star-pic/protoplanetary-disk/pds70.jpg',
  hr4796:         '../../assets/star-pic/protoplanetary-disk/hr4796.jpg',
  mars:           '../../assets/star-pic/solar-system/mars.jpg',
  'jupiter-ganymede':'../../assets/star-pic/solar-system/jupiter-ganymede.jpg',
  m42:            '../../assets/star-pic/nebula/orion.jpg',
};
CL_CATALOG.forEach(o => { o.img = CL_SHARED[o.id] || `img/${o.id}.jpg`; });
