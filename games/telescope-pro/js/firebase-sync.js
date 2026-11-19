/* ============================================================
   firebase-sync.js — Firebase 連携 (ログイン + Firestore 保存)

   このファイルだけが Firebase SDK に触れます。
   <script type="module"> で読み込まれ、v10 系の modular SDK を
   CDN から動的 import します。

   できること
   ・Google ログイン（初回は自動で新規アカウント作成）
   ・メール + パスワードで「ログイン」または「新規アカウント作成」
   ・ログイン済み & オンラインのときだけ進捗を users/{uid} に保存
   ・ログイン時に進捗を読み込み（ゲスト進捗と和集合でマージ）

   ゲーム本体(classic)とのやり取りは window.UHProgress / window.UH_FB の
   2つの窓口だけ。SDK が読めない/設定が空ならゲストモードで動く。
   ============================================================ */

const FB_VERSION = '10.12.5';   // 使う Firebase SDK のバージョン（v10 以降なら可）

// ── ヘッダーのサインインボタン ─────────────────────────────
const authBtn = document.getElementById('uh-auth-btn');
function showBtn(label, title, handler) {
  if (!authBtn) return;
  authBtn.textContent = label;
  authBtn.title = title || '';
  authBtn.onclick = handler;
  authBtn.style.display = '';
}
function hideBtn() { if (authBtn) authBtn.style.display = 'none'; }

// ── 画面下の小さな通知 ─────────────────────────────────────
function notify(msg) {
  let t = document.getElementById('uh-fb-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'uh-fb-toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;'
      + 'max-width:90vw;background:#1b1b1f;color:#fff;padding:10px 16px;border-radius:6px;'
      + 'font:600 13px/1.5 sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4);text-align:center';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(notify._t);
  notify._t = setTimeout(() => { t.style.display = 'none'; }, 7000);
}

// エラーコードをやさしい英語メッセージに
function friendly(code) {
  switch (code) {
    case 'auth/invalid-email':         return "That email address doesn't look right.";
    case 'auth/missing-password':
    case 'auth/weak-password':         return 'Password must be at least 6 characters.';
    case 'auth/email-already-in-use':  return 'That email already has an account — try Log in.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':    return 'Wrong email or password.';
    case 'auth/operation-not-allowed': return 'Email sign-up is turned off in Firebase.';
    case 'auth/too-many-requests':     return 'Too many tries — please wait a moment.';
    case 'auth/network-request-failed':return 'Network error — check your connection.';
    default:                           return code || 'Something went wrong.';
  }
}

// ── 既定の橋渡し（Firebase が無い間はこれが使われる＝全部 no-op）──
window.UH_FB = {
  available:     false,
  user:          null,
  openSignIn()   {},
  signOut()      {},
  saveProgress() {},
};

const cfg = window.UH_FIREBASE_CONFIG;
if (!cfg || !cfg.apiKey) {
  hideBtn();                       // 設定が空 → ゲストモード、ボタンは出さない
} else {
  initFirebase(cfg).catch(err => {
    console.warn('[UH_FB] Firebase を利用できません。ゲストとして続行します。', err);
    window.UH_FB.available = false;
    hideBtn();
  });
}

async function initFirebase(config) {
  const base = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);

  // 貼り付け時に紛れ込んだ前後の空白・改行を除去
  const clean = {};
  for (const k in config) clean[k] = typeof config[k] === 'string' ? config[k].trim() : config[k];

  const app      = initializeApp(clean);
  const authInst = auth.getAuth(app);
  const db       = fs.getFirestore(app);
  const provider = new auth.GoogleAuthProvider();

  // リダイレクト方式でログインして戻ってきた場合の結果を拾う
  auth.getRedirectResult(authInst).catch(e => {
    console.error('[UH_FB] redirect result:', e);
    notify('Sign-in failed: ' + friendly(e && e.code));
  });

  // ── 進捗の読み込み ──
  async function loadRemote(uid) {
    try {
      const snap = await fs.getDoc(fs.doc(db, 'users', uid));
      if (snap.exists() && window.UHProgress) window.UHProgress.apply(snap.data());
    } catch (e) {
      console.warn('[UH_FB] 読み込みに失敗しました', e);
    }
    if (window.UHProgress) saveProgress(window.UHProgress.get());   // 双方向マージ
  }

  // ── 進捗の保存（ログイン済み & オンラインのときだけ）──
  let saveTimer = null;
  function saveProgress(progress) {
    const user = authInst.currentUser;
    if (!user || !navigator.onLine || !progress) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await fs.setDoc(fs.doc(db, 'users', user.uid), {
          score:     progress.score | 0,
          revealed:  Array.isArray(progress.revealed) ? progress.revealed : [],
          updatedAt: fs.serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn('[UH_FB] 保存に失敗しました', e);
      }
    }, 400);
  }

  // ── Google ログイン（新規・既存どちらも。初回は自動で作成される）──
  function googleSignIn() {
    if (location.protocol === 'file:') {
      notify('Google sign-in needs http:// — open the game through a local server, not a file.');
      return;
    }
    auth.signInWithPopup(authInst, provider).catch(async e => {
      const code = (e && e.code) || '';
      console.error('[UH_FB] popup sign-in failed:', code, e);
      if (['auth/popup-blocked', 'auth/cancelled-popup-request',
           'auth/operation-not-supported-in-this-environment',
           'auth/web-storage-unsupported'].includes(code)) {
        try { await auth.signInWithRedirect(authInst, provider); return; }
        catch (e2) { console.error('[UH_FB] redirect failed:', e2); e = e2; }
      }
      if ((e && e.code) === 'auth/popup-closed-by-user') return;
      notify('Sign-in failed: ' + friendly(e && e.code));
    });
  }

  // ── メール / パスワード ──
  function emailAuth(mode, email, pw, onErr) {
    const fn = mode === 'signup' ? auth.createUserWithEmailAndPassword : auth.signInWithEmailAndPassword;
    fn(authInst, email, pw).catch(e => {
      console.error('[UH_FB] email auth failed:', e && e.code, e);
      onErr(friendly(e && e.code));
    });
  }

  // ── サインイン用の小さなウィンドウ（結果画面と同じ見た目を流用）──
  function openSignIn() {
    closeSignIn();
    document.body.insertAdjacentHTML('beforeend', `
      <div class="reward-overlay" id="uh-auth-modal">
        <div class="reward-box uh-auth-box">
          <button class="details-close" id="uh-auth-close" title="Close">✕</button>
          <div class="reward-title" style="font-size:1.4em">Sign in / Create account</div>
          <button class="uh-auth-google" id="uh-auth-google">Continue with Google</button>
          <div class="auth-or"><span>or use email</span></div>
          <input class="auth-input" id="uh-auth-email" type="email" placeholder="Email" autocomplete="email">
          <input class="auth-input" id="uh-auth-pw" type="password" placeholder="Password (6+ characters)" autocomplete="current-password">
          <div class="auth-error" id="uh-auth-err"></div>
          <div class="reward-btns">
            <button class="reward-btn" id="uh-auth-signup">Create account</button>
            <button class="reward-btn primary" id="uh-auth-login">Log in</button>
          </div>
        </div>
      </div>`);

    const modal = document.getElementById('uh-auth-modal');
    const email = document.getElementById('uh-auth-email');
    const pw    = document.getElementById('uh-auth-pw');
    const err   = document.getElementById('uh-auth-err');
    const showErr = m => { err.textContent = m; };

    const submit = mode => {
      showErr('');
      if (!email.value.trim()) return showErr('Please enter your email.');
      if (pw.value.length < 6)  return showErr('Password must be at least 6 characters.');
      emailAuth(mode, email.value.trim(), pw.value, showErr);
    };

    document.getElementById('uh-auth-google').onclick = googleSignIn;
    document.getElementById('uh-auth-login').onclick  = () => submit('login');
    document.getElementById('uh-auth-signup').onclick = () => submit('signup');
    document.getElementById('uh-auth-close').onclick  = closeSignIn;
    modal.addEventListener('click', e => { if (e.target === modal) closeSignIn(); });
    pw.addEventListener('keydown', e => { if (e.key === 'Enter') submit('login'); });
    email.addEventListener('keydown', e => { if (e.key === 'Enter') pw.focus(); });
    email.focus();
  }
  function closeSignIn() {
    const m = document.getElementById('uh-auth-modal');
    if (m) m.remove();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSignIn(); });

  // ── 本番の橋渡しに差し替え ──
  window.UH_FB = {
    available: true,
    user:      null,
    openSignIn,
    signOut()  { auth.signOut(authInst).catch(e => console.warn('[UH_FB] サインアウト失敗', e)); },
    saveProgress,
  };

  // ── ログイン状態の監視（起動時にも一度呼ばれる）──
  auth.onAuthStateChanged(authInst, user => {
    window.UH_FB.user = user || null;
    if (user) {
      closeSignIn();
      const who = user.displayName || user.email || 'your account';
      showBtn('Sign out', who + ' — click to sign out', () => window.UH_FB.signOut());
      loadRemote(user.uid);
    } else {
      showBtn('Sign in / Log in', 'Sign in or create an account to save your progress', openSignIn);
    }
  });
}
