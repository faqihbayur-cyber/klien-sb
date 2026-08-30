// views/home/home.js

export function mount(section, { user, db }) {
  const firstName = (user?.displayName || "").trim().split(" ")[0] || "Kak";
  const initial = (user?.displayName || user?.email || "K").trim().charAt(0).toUpperCase();

  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = true;

  // Tampilkan skeleton dulu supaya tidak ada flash ikon/gambar kosong
  // saat aset (section.png, logo1.png, karakter.png) masih dimuat.
  section.innerHTML = getSkeletonHTML();

  preloadImages(["section.png", "logo1.png", "karakter.png"]).then(() => {
    renderHomeContent(section, { user, db, firstName, initial });
  });
}

function preloadImages(srcs) {
  const loaders = srcs.map(
    (src) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve; // tetap lanjut render walau ada gambar gagal load
        img.src = src;
      })
  );
  // Jaga-jaga: kalau ada request yang menggantung, jangan skeleton selamanya.
  const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
  return Promise.race([Promise.all(loaders), timeout]);
}

function getSkeletonHTML() {
  return `
    <div class="home-wrap">
      <div class="skel-hero">
        <div class="skel-topbar">
          <div class="skel-brand">
            <div class="skel-box skel-logo"></div>
            <div class="skel-line skel-line-brand"></div>
          </div>
          <div class="skel-circle skel-avatar"></div>
        </div>
        <div class="skel-greeting">
          <div class="skel-line skel-line-title"></div>
          <div class="skel-line skel-line-sub"></div>
        </div>
      </div>

      <div class="skel-card">
        <div class="skel-line skel-line-card-title"></div>
        <div class="skel-line skel-line-card-sub"></div>
        <div class="skel-btn"></div>
      </div>

      <div class="skel-trust-row">
        <div class="skel-trust-item"><div class="skel-circle skel-trust-icon"></div><div class="skel-line skel-line-trust"></div></div>
        <div class="skel-trust-item"><div class="skel-circle skel-trust-icon"></div><div class="skel-line skel-line-trust"></div></div>
        <div class="skel-trust-item"><div class="skel-circle skel-trust-icon"></div><div class="skel-line skel-line-trust"></div></div>
        <div class="skel-trust-item"><div class="skel-circle skel-trust-icon"></div><div class="skel-line skel-line-trust"></div></div>
      </div>
    </div>
  `;
}

function renderHomeContent(section, { user, db, firstName, initial }) {
  section.innerHTML = `
    <div class="home-wrap">
      <div class="home-hero" style="background-image:url('section.png')">
        <div class="home-topbar">
          <div class="home-brand">
            <img src="logo1.png" alt="" class="home-brand-icon" />
            <span>Suruh<b>Beli</b></span>
          </div>
          <button class="home-avatar-btn" id="home-avatar-btn">${initial}</button>
        </div>

        <div class="home-greeting">
          <h1>Halo, ${firstName} <span class="home-wave"></span></h1>
          <p>Males keluar? <span class="home-highlight"><br>>>>> SuruhBeli</span> aja!</p>
        </div>

        <img src="karakter.png" alt="Kurir SuruhBeli" class="home-character" />
      </div>

      <div class="home-order-card">
        <h2>Titip apa hari ini?</h2>
        <p>Kami beliin, kami antar!</p>
        <button class="order-btn" id="order-btn">
          <i class="fa-solid fa-bag-shopping"></i>
          <span>Pesan / Order</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>

      <div class="home-trust-row">
        <div class="home-trust-item">
          <div class="home-trust-icon"><i class="fa-solid fa-bolt"></i></div>
          <span>Cepat</span>
        </div>
        <div class="home-trust-item">
          <div class="home-trust-icon"><i class="fa-solid fa-shield-halved"></i></div>
          <span>Aman</span>
        </div>
        <div class="home-trust-item">
          <div class="home-trust-icon"><i class="fa-solid fa-thumbs-up"></i></div>
          <span>Terpercaya</span>
        </div>
        <div class="home-trust-item">
          <div class="home-trust-icon"><i class="fa-solid fa-face-smile"></i></div>
          <span>Tanpa Ribet</span>
        </div>
      </div>
    </div>

    <div class="modal-overlay" id="need-account-modal" hidden>
      <div class="modal-card">
        <div class="modal-icon"><i class="fa-solid fa-user-pen"></i></div>
        <h3 class="modal-title">Lengkapi Data Dulu, Yuk</h3>
        <p class="modal-text">Sebelum pesan, isi dulu nama, nomor HP, dan alamat kamu. Cuma sekali aja kok.</p>
        <button class="btn-primary" id="modal-confirm-btn">Oke, Isi Data</button>
        <button class="modal-cancel-btn" id="modal-cancel-btn">Nanti Dulu</button>
      </div>
    </div>
  `;

  bindHomeEvents(section);

  const modal = section.querySelector("#need-account-modal");

  section.querySelector("#order-btn").addEventListener("click", async () => {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const snap = await getDoc(doc(db, "customers", user.uid));

    if (!snap.exists()) {
      modal.hidden = false;
      return;
    }

    window.location.hash = "#/order";
  });

  section.querySelector("#modal-confirm-btn").addEventListener("click", () => {
    window.location.hash = "#/buat-akun";
  });

  section.querySelector("#modal-cancel-btn").addEventListener("click", () => {
    modal.hidden = true;
  });
}

export function unmount(section) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = false;
  section.innerHTML = "";
}

function bindHomeEvents(section) {
  const avatarBtn = section.querySelector("#home-avatar-btn");
  if (avatarBtn) {
    avatarBtn.addEventListener("click", () => {
      window.location.hash = "#/profil";
    });
  }
}
