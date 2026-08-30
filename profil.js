// views/profil/profil.js

const MENU_ITEMS = [
  { key: "voucher", icon: "fa-ticket", label: "Voucher & Promo" },
  { key: "syarat", icon: "fa-file-lines", label: "Syarat & Ketentuan" },
  { key: "privasi", icon: "fa-shield-halved", label: "Kebijakan Privasi" },
  { key: "bantuan", icon: "fa-circle-question", label: "Pusat Bantuan & FAQ" },
  { key: "tentang", icon: "fa-circle-info", label: "Tentang SuruhBeli" },
];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function mount(section, { user, auth, signOut, db }) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = true;

  const nama = user.displayName || "Pengguna";
  const kontak = user.email || "-";
  const fotoHtml = user.photoURL
    ? `<img src="${user.photoURL}" alt="${escapeHtml(nama)}" class="profil-avatar-img" />`
    : `<div class="profil-avatar-fallback"><i class="fa-solid fa-user"></i></div>`;

  section.innerHTML = `
    <div class="profil-wrap">
      <div class="profil-hero" style="background-image:url('section.png')">
        <button class="profil-settings-btn" id="profil-settings">
          <i class="fa-solid fa-gear"></i>
        </button>

        <div class="profil-avatar">${fotoHtml}</div>
        <h1 class="profil-name">${escapeHtml(nama)}</h1>
        <p class="profil-contact">${escapeHtml(kontak)}</p>
      </div>

      <div class="profil-menu-wrap">
        <div class="profil-menu">
          <div class="profil-info-row">
            <span class="profil-info-label">Nama</span>
            <span class="profil-info-value" id="profil-info-name">-</span>
          </div>
          <div class="profil-info-row">
            <span class="profil-info-label">Email</span>
            <span class="profil-info-value" id="profil-info-email">${escapeHtml(user.email || "-")}</span>
          </div>
          <div class="profil-info-row">
            <span class="profil-info-label">No. Telepon</span>
            <span class="profil-info-value" id="profil-info-phone">-</span>
          </div>
          <div class="profil-info-row">
            <span class="profil-info-label">Alamat</span>
            <span class="profil-info-value" id="profil-info-address">-</span>
          </div>
        </div>

        <div class="profil-menu">
          ${MENU_ITEMS.map(
            (item) => `
              <button class="profil-menu-item" data-key="${item.key}">
                <span class="profil-menu-icon"><i class="fa-solid ${item.icon}"></i></span>
                <span class="profil-menu-label">${item.label}</span>
                <i class="fa-solid fa-chevron-right profil-menu-chevron"></i>
              </button>
            `
          ).join("")}
        </div>

        <button class="profil-logout-btn" id="profil-logout">
          <i class="fa-solid fa-right-from-bracket"></i>
          <span>Keluar</span>
        </button>
      </div>

      <div class="profil-confirm-overlay" id="profil-confirm-modal" hidden>
        <div class="profil-confirm-card">
          <div class="profil-confirm-icon"><i class="fa-solid fa-right-from-bracket"></i></div>
          <h3>Yakin mau keluar dari akun ini?</h3>
          <button type="button" class="profil-confirm-yes" id="profil-confirm-yes">Ya, Keluar</button>
          <button type="button" class="profil-confirm-cancel" id="profil-confirm-cancel">Batal</button>
        </div>
      </div>
    </div>
  `;

  const MENU_LINKS = {
    voucher: "promo.html",
    syarat: "ketentuan.html",
    privasi: "kebijakan.html",
    bantuan: "faq.html",
    tentang: "tentang.html",
  };

  section.querySelectorAll(".profil-menu-item[data-key]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = MENU_LINKS[btn.dataset.key];
      if (target) {
        window.location.href = target;
        return;
      }
      if (typeof window.showToast === "function") {
        window.showToast("Fitur ini segera hadir.", "info");
      }
    });
  });

  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js").then(
    async ({ doc, getDoc }) => {
      try {
        const snap = await getDoc(doc(db, "customers", user.uid));
        if (!snap.exists()) return;
        const data = snap.data();

        const nameEl = section.querySelector("#profil-info-name");
        const phoneEl = section.querySelector("#profil-info-phone");
        const addressEl = section.querySelector("#profil-info-address");
        const heroNameEl = section.querySelector(".profil-name");

        if (nameEl) nameEl.textContent = data.name || "-";
        if (phoneEl) phoneEl.textContent = data.phone || "-";
        if (addressEl) addressEl.textContent = data.address || "-";
        if (heroNameEl && data.name) heroNameEl.textContent = data.name;
      } catch (err) {
        console.error(err);
      }
    }
  );

  section.querySelector("#profil-settings").addEventListener("click", () => {
    if (typeof window.showToast === "function") {
      window.showToast("Pengaturan segera hadir.", "info");
    }
  });

  const confirmModal = section.querySelector("#profil-confirm-modal");

  section.querySelector("#profil-logout").addEventListener("click", () => {
    confirmModal.hidden = false;
  });

  section.querySelector("#profil-confirm-cancel").addEventListener("click", () => {
    confirmModal.hidden = true;
  });

  section.querySelector("#profil-confirm-yes").addEventListener("click", async () => {
    const yesBtn = section.querySelector("#profil-confirm-yes");
    yesBtn.disabled = true;
    yesBtn.textContent = "Keluar...";
    try {
      await signOut(auth);
      window.location.href = "login.html";
    } catch (err) {
      console.error(err);
      confirmModal.hidden = true;
      if (typeof window.showToast === "function") {
        window.showToast("Gagal keluar. Coba lagi ya.", "error");
      }
    }
  });
}

export function unmount(section) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = false;
  section.innerHTML = "";
}