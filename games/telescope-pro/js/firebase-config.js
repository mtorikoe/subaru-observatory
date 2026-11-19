/* ============================================================
   firebase-config.js — あなたの Firebase プロジェクトの設定を貼る場所

   Firebase コンソール →「プロジェクトの設定」→「マイアプリ」(ウェブ) で
   表示される firebaseConfig の値を、下の "" の中に貼ってください。

   ・ここの値を埋めるまで、ゲームは「ゲストモード」で動きます
     （サインインボタンは出ません）。
   ・これらの値は“秘密”ではありません（プロジェクトを指す公開 ID です）。
     データの保護は、この値を隠すことではなく Firestore の
     セキュリティルールで行ってください（下部のメモ参照）。

   classic script として読み込み、window に設定だけ置きます。
   Firebase SDK の読み込みと初期化は js/firebase-sync.js (module) が行います。
   ============================================================ */

   //window.UH_FIREBASE_CONFIG
   
window.UH_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCOzKsvqd7C6vKKrfDz_mJBvLWloZx8LBQ",
  authDomain:        "subaru-telescope.firebaseapp.com",
  projectId:         "subaru-telescope",
  storageBucket:     "subaru-telescope.firebasestorage.app",
  messagingSenderId: "722118826433",
  appId:             "1:722118826433:web:295822bbb1127454b93740",
};

/* ── Firestore セキュリティルールの例（Firebase コンソールに貼る）──
   各ユーザーが自分の users/{uid} だけを読み書きできるようにします。

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ──────────────────────────────────────────────────────────── */
