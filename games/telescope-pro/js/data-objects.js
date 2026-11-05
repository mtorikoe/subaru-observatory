/* ============================================================
   data-objects.js
   All objects choices
   ============================================================ */

const OBJECTS_GROUP = {
  'galaxy':        ['andromeda','ngcda4631','seyfert1','ngc253','bode','umbrella','sombrero','m51',
                    'm63','ngc4565','lenticular','twin','interacting','triple_ring','polar_ring',
                    'jellyfish','sculptor','tadpole'], 
  'exoplanet':     ['gj504b','kappa_andromeda_b','gj758b','2m0437','hip99770b'],
  'planet':        ['mars','saturn','jupiter_g','jupitar_e'], 
  'cluster':       ['coma','palomar3','m5'],
  'nebular':       ['sh2-209','orphan_cloud','ngc6240','orion','m78','ic418','ngc2264','ngc6543','crab'],
  'comet':          ['ison'],
  'planetary_disk':      ['pds70','hr4796','ab-aur','hd142527','ab-aurigae'],
};

const OBJECTS = {
  'andromeda': {
    name: 'Andromeda Galaxy',
    type: 'galaxy',
    instruments: 'suprime-cam',
    color: '#4a90d9',
    description: 'Closest spiral galaxy from our galaxy',
    image:'/assets/objects/galaxy/andromeda.jpg',
  },
};
