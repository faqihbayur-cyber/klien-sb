// TODO: ganti dengan firebaseConfig dari Project settings > Your apps (project klien-5c5cb)
const firebaseConfig = {
  apiKey: "AIzaSyBE5g9DrxN-ZAumkFQDSW2KknhYyuUXKUA",
  authDomain: "klien-5c5cb.firebaseapp.com",
  projectId: "klien-5c5cb",
  storageBucket: "klien-5c5cb.firebasestorage.app",
  messagingSenderId: "1047587810737",
  appId: "1:1047587810737:web:a40f87b3b293b6747c6190",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Ganti sesuai package app Android
const APP_PACKAGE = "com.customer.suruhbeli";

function showState(id) {
  document.querySelectorAll(".state").forEach(el => el.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function buildIntentLink() {
  // intent:// langsung buka app kalau sudah terpasang,
  // fallback ke Play Store kalau belum ada
  return `intent://open#Intent;scheme=suruhbeli;package=${APP_PACKAGE};` +
         `S.browser_fallback_url=https://play.google.com/store/apps/details%3Fid=${APP_PACKAGE};end`;
}

async function handleAction() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  if (!oobCode) {
    document.getElementById("error-msg").textContent = "Link tidak lengkap atau tidak valid.";
    showState("state-error");
    return;
  }

  try {
    if (mode === "verifyEmail" || mode === "verifyAndChangeEmail") {
      await auth.applyActionCode(oobCode);
      document.getElementById("success-msg").textContent = "Email kamu berhasil diperbarui.";
      const btn = document.getElementById("open-app-btn");
      btn.href = buildIntentLink();
      showState("state-success");
    } else {
      // mode lain (reset password, dll) - belum ada flow khusus, tampilkan pesan umum
      const btn = document.getElementById("open-app-btn-generic");
      btn.href = buildIntentLink();
      showState("state-generic");
    }
  } catch (err) {
    document.getElementById("error-msg").textContent =
      "Link ini sudah tidak berlaku atau sudah pernah dipakai.";
    showState("state-error");
  }
}

handleAction();
