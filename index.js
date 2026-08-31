// index.js — router + Firebase (global untuk seluruh app)
//
// Semua import ditulis dinamis (import() di dalam try/catch) supaya kalau
// ada file yang gagal dimuat (404, typo nama file, dsb), errornya bisa
// ditangkap dan ditampilkan LANGSUNG DI LAYAR — penting karena di HP
// tidak semudah desktop untuk buka Console DevTools.

const loadingEl = document.getElementById("app-loading");
const navEl = document.getElementById("bottom-nav");

// Daftarkan service worker (PWA) — dilakukan terpisah dari alur Firebase
// supaya kalau gagal, gak sampai bikin seluruh app gagal load.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("[sw] gagal daftar service worker:", err);
    });
  });
}

function showFatalError(step, err) {
  console.error("SuruhBeli gagal memuat pada tahap:", step, err);
  loadingEl.innerHTML = `
    <div style="max-width:300px;text-align:center;padding:20px;font-family:sans-serif;">
      <p style="color:#C13B3B;font-weight:700;font-size:15px;margin:0 0 8px;">Gagal memuat halaman</p>
      <p style="font-size:12px;color:#6B5541;margin:0 0 4px;">Tahap: ${step}</p>
      <p style="font-size:11px;color:#6B5541;word-break:break-word;">${escapeHtml(String((err && err.message) || err))}</p>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function main() {
  let firebaseApp, firebaseAuth, firebaseDb;
  let getAuth, onAuthStateChanged, signOut, getFirestore;
  let homeView, lacakView, riwayatView, profilView, buatAkunView, orderView;

  // Tahap 1: load SDK Firebase dari CDN
  try {
    const appModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const authModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
    const firestoreModule = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    getAuth = authModule.getAuth;
    onAuthStateChanged = authModule.onAuthStateChanged;
    signOut = authModule.signOut;
    getFirestore = firestoreModule.getFirestore;

    const firebaseConfig = {
      apiKey: "AIzaSyBE5g9DrxN-ZAumkFQDSW2KknhYyuUXKUA",
      authDomain: "klien-5c5cb.firebaseapp.com",
      projectId: "klien-5c5cb",
      storageBucket: "klien-5c5cb.firebasestorage.app",
      messagingSenderId: "1047587810737",
      appId: "1:1047587810737:web:a40f87b3b293b6747c6190",
    };
    firebaseApp = appModule.initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getFirestore(firebaseApp);
  } catch (err) {
    showFatalError("memuat Firebase SDK (cek koneksi internet)", err);
    return;
  }

  // Tahap 2: load semua file view
  try {
    homeView = await import("./home.js");
    lacakView = await import("./lacak.js");
    riwayatView = await import("./riwayat.js");
    profilView = await import("./profil.js");
    buatAkunView = await import("./buat-akun.js");
    orderView = await import("./order.js");
  } catch (err) {
    showFatalError("memuat file view (home.js/lacak.js/riwayat.js/profil.js — cek nama file & lokasinya harus sejajar dengan index.html)", err);
    return;
  }

  const VIEWS = {
    home: homeView,
    lacak: lacakView,
    riwayat: riwayatView,
    profil: profilView,
    "buat-akun": buatAkunView,
    order: orderView,
  };

  let currentUser = null;
  let currentView = null;
  let currentSection = null;

  function sectionFor(name) {
    return document.getElementById("view-" + name);
  }

  function switchView(name) {
    if (!VIEWS[name]) name = "home";
    const nextSection = sectionFor(name);
    if (!nextSection) return;

    if (currentView && currentView.unmount && currentSection) {
      currentView.unmount(currentSection);
    }

    document.querySelectorAll(".view-section").forEach((s) => s.classList.remove("active"));
    nextSection.classList.add("active");

    VIEWS[name].mount(nextSection, { user: currentUser, auth: firebaseAuth, db: firebaseDb, signOut });

    currentView = VIEWS[name];
    currentSection = nextSection;

    navEl.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.route === name);
    });

    window.scrollTo(0, 0);
  }

  function router() {
    const name = location.hash.replace(/^#\/?/, "") || "home";
    switchView(name);
  }

  window.addEventListener("hashchange", router);

  navEl.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.hash = "#/" + btn.dataset.route;
    });
  });

  // Tahap 3: auth guard
  try {
    onAuthStateChanged(firebaseAuth, (user) => {
      try {
        if (!user) {
          window.location.href = "login.html";
          return;
        }

        currentUser = user;
        navEl.hidden = false;
        loadingEl.hidden = true;

        router();
      } catch (err) {
        showFatalError("menampilkan halaman setelah login", err);
      }
    });
  } catch (err) {
    showFatalError("memasang auth guard (onAuthStateChanged)", err);
  }

  // Jaga-jaga terakhir: kalau 10 detik masih loading, kasih tau di layar.
  setTimeout(() => {
    if (!loadingEl.hidden) {
      showFatalError("tidak diketahui (onAuthStateChanged tidak pernah merespons dalam 10 detik)", "Cek koneksi internet / domain sudah didaftarkan di Firebase Console.");
    }
  }, 10000);
}

main();
