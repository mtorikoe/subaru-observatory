/* ============================================================
   collection.js — awarded-picture collection (local, cloud-ready)

   Where the account/login restructure is NOT done yet (it lands in
   a separate branch), awards are kept in the browser so they
   survive reloads. The store is deliberately shaped so the future
   cloud layer can pick it up and sync it per user:

     localStorage 'subaru.collections' = {
       classification:  ["m77", "gj504b", ...],   // this game
       universeHunting: ["andromeda", ...],        // filled by UH later
       ...other games
     }

   One shared document, keyed by game, so a single account can hold
   every game's collection. Universe Hunting will write its own key
   here (and/or sync from Firebase) when its auth is reworked; this
   view already reads whatever keys are present.

   Everything is exposed on window.SubaruCollection so the eventual
   Firebase module can read/merge without touching game code — the
   same bridge pattern Universe Hunting uses (window.UHProgress).
   ============================================================ */

(function () {
  const KEY = 'subaru.collections';
  const GAME = 'classification';

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeAll(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { /* private mode / blocked storage — stay in-memory for the session */ }
  }

  // In-memory mirror so the game still works if storage throws.
  let mem = readAll();

  const api = {
    /** ids awarded for a game (default: this game) */
    get(game = GAME) {
      const list = mem[game];
      return Array.isArray(list) ? list.slice() : [];
    },

    /** every game's lists, e.g. { classification:[...], universeHunting:[...] } */
    getAll() {
      const out = {};
      for (const k in mem) out[k] = Array.isArray(mem[k]) ? mem[k].slice() : [];
      return out;
    },

    has(id, game = GAME) { return this.get(game).includes(id); },

    /** add one award; returns true if it was newly added */
    award(id, game = GAME) {
      if (!id) return false;
      if (!Array.isArray(mem[game])) mem[game] = [];
      if (mem[game].includes(id)) return false;
      mem[game].push(id);
      writeAll(mem);
      return true;
    },

    /** merge a remote/other list in (union) — used by the future cloud sync */
    merge(ids, game = GAME) {
      if (!Array.isArray(ids)) return;
      if (!Array.isArray(mem[game])) mem[game] = [];
      ids.forEach(id => { if (!mem[game].includes(id)) mem[game].push(id); });
      writeAll(mem);
    },
  };

  window.SubaruCollection = api;
})();
