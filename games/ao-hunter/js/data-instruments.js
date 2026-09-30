/* ============================================================
   data-instruments.js
   All Subaru instruments with unlock order, roles, and metadata
   ============================================================ */

// Slot groups — only one from each group may be selected at a time
// (except CHARIS/VAMPIRES/FOCUS which stack on top of SCExAO)
const INSTRUMENT_GROUPS = {
  'wide-field':    ['suprime-cam','hsc'],
  'spectrograph':  ['hds','ird','pfs'],
  'survey':        ['moircs','fmos'],
  'ao':            ['ao36','ao188','ao3k'],
  'coronagraph':   ['ciao','hiciao','scexao'],
  'ifs':           ['charis'],
  'visible':       ['vampires'],
  'fiber':         ['focus'],
};

// Fixed display order in the pallet (left to right, always)
const PALLET_ORDER = [
  'suprime-cam','hsc',
  'hds','ird','pfs',
  'moircs','fmos',
  'ao36','ao188','ao3k',
  'ciao','hiciao','scexao',
  'charis','vampires','focus',
];

const INSTRUMENTS = {
  'suprime-cam': {
    name: 'Suprime-Cam',
    year: 2000,
    group: 'wide-field',
    role: 'Wide-field optical imaging — acquires the star field',
    shortRole: 'Field acquisition',
    color: '#4a90d9',
    blurReduction: 0.20,
    unlockOrder: 0,   // 0 = available from start
    description: 'Suprime-Cam gave Subaru one of the widest fields of view of any 8-metre telescope. Its 10,000×8,000 pixel mosaic CCD can image a region the size of the full Moon in a single exposure.',
    icon: '🔭',
  },
  'hsc': {
    name: 'HSC',
    year: 2012,
    group: 'wide-field',
    role: 'Ultra-wide optical imaging — 1.5 degree field',
    shortRole: 'Wide field survey',
    color: '#2271c8',
    blurReduction: 0.28,
    unlockOrder: 5,
    description: 'Hyper Suprime-Cam replaced Suprime-Cam with 116 CCDs covering 1.5 degrees — the size of three full Moons. The HSC Subaru Strategic Program has imaged a quarter of the entire sky.',
    icon: '🔭',
  },
  'hds': {
    name: 'HDS',
    year: 2002,
    group: 'spectrograph',
    role: 'High-resolution spectrograph — measures radial velocity',
    shortRole: 'Radial velocity',
    color: '#e8a020',
    blurReduction: 0.10,
    unlockOrder: 0,
    description: 'The High Dispersion Spectrograph splits starlight into its spectrum with extremely high resolution, allowing astronomers to detect a star\'s wobble caused by an orbiting planet — the radial velocity method.',
    icon: '📊',
  },
  'ird': {
    name: 'IRD',
    year: 2018,
    group: 'spectrograph',
    role: 'Near-infrared Doppler — targets cool M-type stars',
    shortRole: 'IR Doppler / M-stars',
    color: '#d45a20',
    blurReduction: 0.12,
    unlockOrder: 9,
    description: 'The InfraRed Doppler instrument measures radial velocities of cool red M-type stars in near-infrared, where they shine most brightly. M-type stars are the most common planet hosts in the galaxy.',
    icon: '📊',
  },
  'pfs': {
    name: 'PFS',
    year: 2024,
    group: 'spectrograph',
    role: 'Prime Focus Spectrograph — 2400 simultaneous fibers',
    shortRole: 'Multi-fiber survey',
    color: '#c03090',
    blurReduction: 0.14,
    unlockOrder: 10,
    description: 'The Prime Focus Spectrograph deploys 2400 optical fibers across a 1.3-degree field, measuring spectra of thousands of stars simultaneously to survey galaxy evolution and stellar populations.',
    icon: '📊',
  },
  'moircs': {
    name: 'MOIRCS',
    year: 2007,
    group: 'survey',
    role: 'Near-IR multi-object spectroscopy — confirms youth of targets',
    shortRole: 'Survey / age confirm',
    color: '#8b4513',
    blurReduction: 0.08,
    unlockOrder: 2,
    description: 'The Multi-Object Infrared Camera and Spectrograph measures near-infrared spectra of many objects at once, confirming which stars in a young cluster are true members worth targeting for planet searches.',
    icon: '🔬',
  },
  'fmos': {
    name: 'FMOS',
    year: 2009,
    group: 'survey',
    role: 'Wide-field near-IR fibers — surveys young star populations',
    shortRole: 'Wide survey',
    color: '#6b3410',
    blurReduction: 0.08,
    unlockOrder: 3,
    description: 'The Fiber Multi-Object Spectrograph covers a wide field with 400 near-infrared fibers, surveying young stellar populations across entire star-forming regions to find the best planet-hunting candidates.',
    icon: '🔬',
  },
  'ao36': {
    name: 'AO36',
    year: 2000,
    group: 'ao',
    role: 'First-generation AO — 36 actuators, initial wavefront correction',
    shortRole: 'Wavefront correction',
    color: '#2ecc71',
    blurReduction: 0.25,
    unlockOrder: 0,
    description: 'AO36 was Subaru\'s first adaptive optics system, using 36 actuators on a deformable mirror to correct atmospheric blurring in real time. Combined with CIAO it produced the first direct images of disks at Subaru.',
    icon: '🌀',
  },
  'ao188': {
    name: 'AO188',
    year: 2006,
    group: 'ao',
    role: 'Second-generation AO — 188 actuators, much sharper correction',
    shortRole: 'Sharp wavefront AO',
    color: '#27ae60',
    blurReduction: 0.35,
    unlockOrder: 1,
    description: 'AO188 upgraded Subaru\'s adaptive optics to 188 actuators, dramatically reducing wavefront error. Paired with HiCIAO it became the backbone of the SEEDS survey — discovering GJ 504 b and imaging dozens of protoplanetary disks.',
    icon: '🌀',
  },
  'ao3k': {
    name: 'AO3K',
    year: 2023,
    group: 'ao',
    role: 'Third-generation AO — 3228 actuators, extreme correction',
    shortRole: 'Extreme-AO',
    color: '#1e8449',
    blurReduction: 0.45,
    unlockOrder: 11,
    description: 'AO3K is Subaru\'s most powerful adaptive optics system with 3228 actuators, providing extreme wavefront correction for all instruments on the infrared Nasmyth platform — the prerequisite for SCExAO coronagraphy.',
    icon: '🌀',
  },
  'ciao': {
    name: 'CIAO',
    year: 2000,
    group: 'coronagraph',
    role: 'First coronagraph — blocks starlight, reveals disks',
    shortRole: 'Starlight blocker',
    color: '#9b59b6',
    blurReduction: 0.30,
    unlockOrder: 0,
    description: 'CIAO (Coronagraphic Imager with Adaptive Optics) was Subaru\'s first high-contrast imager. With AO36 it directly imaged protoplanetary disks around AB Aurigae and SR 24 for the first time.',
    icon: '🌑',
  },
  'hiciao': {
    name: 'HiCIAO',
    year: 2008,
    group: 'coronagraph',
    role: 'High-contrast coronagraph — enabled SEEDS planet discoveries',
    shortRole: 'High-contrast imaging',
    color: '#8e44ad',
    blurReduction: 0.40,
    unlockOrder: 2,
    description: 'HiCIAO (High Contrast Coronographic Imager for Adaptive Optics) was built specifically for Subaru\'s SEEDS survey. With AO188 it discovered GJ 504 b — the coldest exoplanet ever directly imaged at the time.',
    icon: '🌑',
  },
  'scexao': {
    name: 'SCExAO',
    year: 2014,
    group: 'coronagraph',
    role: 'Extreme coronagraph — PIAA mask, <30 nm wavefront error',
    shortRole: 'Extreme coronagraphy',
    color: '#6c3483',
    blurReduction: 0.50,
    unlockOrder: 6,
    description: 'SCExAO combines a PIAA coronagraph with extreme adaptive optics to achieve the sharpest images ever taken at Subaru. It is the platform for CHARIS, VAMPIRES, and other next-generation instruments.',
    icon: '🌑',
  },
  'charis': {
    name: 'CHARIS',
    year: 2016,
    group: 'ifs',
    role: 'Integral field spectrograph — companion spectral classification',
    shortRole: 'Spectra of companions',
    color: '#e74c3c',
    blurReduction: 0.15,
    unlockOrder: 7,
    description: 'CHARIS (Coronagraphic High Angular Resolution Imaging Spectrograph) images exoplanets across J+H+K bands simultaneously, producing a 3D data cube that reveals the atmosphere composition of directly imaged companions.',
    icon: '🌈',
  },
  'vampires': {
    name: 'VAMPIRES',
    year: 2015,
    group: 'visible',
    role: 'Visible polarimetry — disk structure and scattering',
    shortRole: 'Disk polarimetry',
    color: '#e91e63',
    blurReduction: 0.12,
    unlockOrder: 8,
    description: 'VAMPIRES (Visible Aperture Masking Polarimetric Imager for Resolved Exoplanetary Structures) uses visible light and polarimetry to reveal the detailed structure of protoplanetary disks — showing how dust scatters starlight.',
    icon: '🌈',
  },
  'focus': {
    name: 'FOCUS',
    year: 2017,
    group: 'fiber',
    role: 'Fiber injection — connects SCExAO to IRD for precision RV',
    shortRole: 'Precision fiber RV',
    color: '#ff5722',
    blurReduction: 0.10,
    unlockOrder: 9,
    description: 'FOCUS injects the SCExAO-corrected starlight into a single-mode fiber that feeds IRD, enabling extremely precise radial velocity measurements — combining direct imaging capability with Doppler planet detection.',
    icon: '🔗',
  },
};

// Unlock sequence — instruments awarded after each successful observation
const UNLOCK_SEQUENCE = [
  // After 1st success:
  'ao188',
  // After 2nd:
  'moircs',
  // After 3rd:
  'fmos',
  // After 4th:
  'hiciao',
  // After 5th — Stage 2 unlocks here (HSC):
  'hsc',
  // After 6th:
  'scexao',
  // After 7th:
  'charis',
  // After 8th:
  'vampires',
  // After 9th:
  'focus',
  // After 10th:
  'ird',
  // After 11th:
  'pfs',
  // After 12th:
  'ao3k',
];

const STARTING_INSTRUMENTS = ['suprime-cam','ao36','ciao','hds'];

// Demo mode advanced set (triggered by 'science-night-demo')
const DEMO_INSTRUMENTS = [
  'suprime-cam','hsc','hds','ird',
  'moircs','ao36','ao188','ao3k',
  'ciao','hiciao','scexao',
  'charis','vampires','focus',
];