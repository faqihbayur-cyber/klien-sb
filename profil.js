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
  
  let firestoreApi = null;
  let storageApi = null;
  let authApi = null;
  let pendingEmailValue = null;
  
  const fotoHtml = user.photoURL
    ? `<img src="${user.photoURL}" alt="${escapeHtml(nama)}" class="profil-avatar-img" />`
    : `<div class="profil-avatar-fallback"><i class="fa-solid fa-user"></i></div>`;

  section.innerHTML = `
    <div class="profil-wrap">
      <div class="profil-hero" style="background-image:url('section.png')">
        <button class="profil-settings-btn" id="profil-settings">
          <i class="fa-solid fa-gear"></i>
        </button>

        <div class="profil-avatar" id="profil-avatar-btn">${fotoHtml}</div>
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

      <div class="profil-lightbox-overlay" id="profil-lightbox" hidden>
        <button type="button" class="profil-lightbox-close" id="profil-lightbox-close">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <img src="" alt="${escapeHtml(nama)}" class="profil-lightbox-img" id="profil-lightbox-img" />
      </div>

      <div class="profil-sheet-overlay" id="profil-sheet-overlay" hidden>
        <div class="profil-sheet" id="profil-sheet">
          <div class="profil-sheet-handle"></div>
          <div class="profil-sheet-header">
            <h3>Pengaturan Akun</h3>
          </div>
          <div class="profil-sheet-body" id="profil-sheet-body">

            <div class="profil-sheet-photo-row">
              <div class="profil-sheet-avatar" id="profil-sheet-avatar">${fotoHtml}</div>
              <div class="profil-sheet-photo-actions">
                <button type="button" class="profil-sheet-photo-btn" id="profil-photo-change-btn">
                  <i class="fa-solid fa-camera"></i> Ganti Foto
                </button>
                <button type="button" class="profil-sheet-photo-btn profil-sheet-photo-btn-danger" id="profil-photo-delete-btn">
                  <i class="fa-solid fa-trash"></i> Hapus Foto
                </button>
              </div>
              <input type="file" accept="image/*" id="profil-photo-input" hidden />
            </div>

            <div class="profil-sheet-field">
              <label for="profil-input-name">Nama</label>
              <div class="profil-sheet-field-row">
                <input type="text" id="profil-input-name" placeholder="Nama lengkap" />
              </div>
            </div>

            <div class="profil-sheet-field">
              <label for="profil-input-phone">No. Telepon</label>
              <div class="profil-sheet-field-row">
                <input type="tel" id="profil-input-phone" placeholder="08xxxxxxxxxx" />
              </div>
            </div>

            <div class="profil-sheet-field">
              <label for="profil-input-address">Alamat</label>
              <div class="profil-sheet-field-row">
                <input type="text" id="profil-input-address" placeholder="Alamat lengkap" />
              </div>
            </div>

            <div class="profil-sheet-field">
              <label for="profil-input-email">Email</label>
              <div class="profil-sheet-field-row">
                <input type="email" id="profil-input-email" placeholder="email@contoh.com" />
              </div>
            </div>

          </div>
          <button type="button" class="profil-sheet-save-all-btn" id="profil-save-all">Simpan Perubahan</button>
        </div>
      </div>

      <div class="profil-confirm-overlay" id="profil-generic-confirm-modal" hidden>
        <div class="profil-confirm-card">
          <div class="profil-confirm-icon" id="profil-generic-confirm-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h3 id="profil-generic-confirm-text">Yakin?</h3>
          <button type="button" class="profil-confirm-yes" id="profil-generic-confirm-yes">Ya, Lanjut</button>
          <button type="button" class="profil-confirm-cancel" id="profil-generic-confirm-cancel">Batal</button>
        </div>
      </div>

      <div class="profil-confirm-overlay" id="profil-reauth-modal" hidden>
        <div class="profil-confirm-card">
          <div class="profil-confirm-icon"><i class="fa-solid fa-lock"></i></div>
          <h3>Masukkan password buat konfirmasi ganti email</h3>
          <input type="password" id="profil-reauth-password" class="profil-reauth-input" placeholder="Password" />
          <button type="button" class="profil-confirm-yes" id="profil-reauth-submit">Konfirmasi</button>
          <button type="button" class="profil-confirm-cancel" id="profil-reauth-cancel">Batal</button>
        </div>
      </div>
      
      <div class="profil-confirm-overlay" id="profil-phone-reauth-modal" hidden>
        <div class="profil-confirm-card">
          <div class="profil-confirm-icon"><i class="fa-solid fa-mobile-screen"></i></div>
          <h3>Masukkan kode OTP yang dikirim ke nomor kamu buat konfirmasi ganti email</h3>
          <input type="text" id="profil-phone-reauth-otp" class="profil-reauth-input" placeholder="Kode OTP" inputmode="numeric" />
          <button type="button" class="profil-confirm-yes" id="profil-phone-reauth-submit">Konfirmasi</button>
          <button type="button" class="profil-confirm-cancel" id="profil-phone-reauth-cancel">Batal</button>
        </div>
      </div>

      <div id="profil-recaptcha-container"></div>

      <div class="profil-success-overlay" id="profil-success-modal" hidden>
        <div class="profil-success-card">
          <div class="profil-success-icon"><i class="fa-solid fa-circle-check"></i></div>
          <h3 id="profil-success-text">Berhasil disimpan</h3>
          <button type="button" class="profil-success-ok" id="profil-success-ok">Oke</button>
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

  Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"),
    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
  ]).then(async ([firestoreMod, storageMod, authMod]) => {
    firestoreApi = {
      doc: firestoreMod.doc,
      getDoc: firestoreMod.getDoc,
      updateDoc: firestoreMod.updateDoc,
    };
    storageApi = {
      getStorage: storageMod.getStorage,
      ref: storageMod.ref,
      uploadBytes: storageMod.uploadBytes,
      getDownloadURL: storageMod.getDownloadURL,
      deleteObject: storageMod.deleteObject,
    };
    authApi = {
      updateProfile: authMod.updateProfile,
      verifyBeforeUpdateEmail: authMod.verifyBeforeUpdateEmail,
      EmailAuthProvider: authMod.EmailAuthProvider,
      reauthenticateWithCredential: authMod.reauthenticateWithCredential,
      GoogleAuthProvider: authMod.GoogleAuthProvider,
      reauthenticateWithPopup: authMod.reauthenticateWithPopup,
      PhoneAuthProvider: authMod.PhoneAuthProvider,
      RecaptchaVerifier: authMod.RecaptchaVerifier,
    };

    try {
      const snap = await firestoreApi.getDoc(firestoreApi.doc(db, "customers", user.uid));
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

      const nameInput = section.querySelector("#profil-input-name");
      const phoneInput = section.querySelector("#profil-input-phone");
      const addressInput = section.querySelector("#profil-input-address");
      const emailInput = section.querySelector("#profil-input-email");

      if (nameInput) nameInput.value = data.name || "";
      if (phoneInput) phoneInput.value = data.phone || "";
      if (addressInput) addressInput.value = data.address || "";
      if (emailInput) emailInput.value = user.email || "";
    } catch (err) {
      console.error(err);
    }
  });

  function renderAvatarHtml(url) {
    return url
      ? `<img src="${url}" alt="${escapeHtml(nama)}" class="profil-avatar-img" />`
      : `<div class="profil-avatar-fallback"><i class="fa-solid fa-user"></i></div>`;
  }

  function setAvatar(url) {
    const heroAvatar = section.querySelector("#profil-avatar-btn");
    const sheetAvatar = section.querySelector("#profil-sheet-avatar");
    if (heroAvatar) heroAvatar.innerHTML = renderAvatarHtml(url);
    if (sheetAvatar) sheetAvatar.innerHTML = renderAvatarHtml(url);
  }

  // ---------- Lightbox foto ----------
  const lightbox = section.querySelector("#profil-lightbox");
  const lightboxImg = section.querySelector("#profil-lightbox-img");

  section.querySelector("#profil-avatar-btn").addEventListener("click", () => {
    const img = section.querySelector("#profil-avatar-btn img");
    if (!img) return;
    lightboxImg.src = img.src;
    lightbox.hidden = false;
  });

  section.querySelector("#profil-lightbox-close").addEventListener("click", () => {
    lightbox.hidden = true;
  });
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.hidden = true;
  });

  // ---------- Sheet Pengaturan ----------
  const sheetOverlay = section.querySelector("#profil-sheet-overlay");
  const sheet = section.querySelector("#profil-sheet");
  const sheetBody = section.querySelector("#profil-sheet-body");
  let savedScrollY = 0;

  function lockBodyScroll() {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
  }
  function unlockBodyScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.overflow = "";
    window.scrollTo(0, savedScrollY);
  }

  function openSheet() {
    lockBodyScroll();
    sheetOverlay.hidden = false;
    requestAnimationFrame(() => {
      sheetOverlay.classList.add("profil-sheet-open");
      sheet.style.transform = "translateY(0)";
    });
  }
  function closeSheet() {
    sheetOverlay.classList.remove("profil-sheet-open");
    sheet.style.transform = "translateY(100%)";
    unlockBodyScroll();
    setTimeout(() => {
      sheetOverlay.hidden = true;
    }, 280);
  }

  section.querySelector("#profil-settings").addEventListener("click", openSheet);

  sheetOverlay.addEventListener("click", (e) => {
    if (e.target === sheetOverlay) closeSheet();
  });

  let dragStartY = 0;
  let dragCurrentY = 0;
  let dragEligible = false;
  let dragging = false;
  let dragPointerId = null;

  function onDragStart(y) {
    dragStartY = y;
    dragCurrentY = y;
    dragging = false;
    // Boleh mulai drag-nutup dari mana aja di sheet, asal body form
    // lagi di posisi scroll paling atas
    dragEligible = sheetBody.scrollTop <= 0;
  }
  function onDragMove(e) {
    if (!dragEligible) return;
    dragCurrentY = e.clientY;
    const delta = dragCurrentY - dragStartY;
    if (delta <= 0) return; // geser ke atas -> biarin scroll normal

    if (!dragging) {
      dragging = true;
      sheet.setPointerCapture(e.pointerId);
      dragPointerId = e.pointerId;
      sheet.style.transition = "none";
    }
    e.preventDefault();
    sheet.style.transform = `translateY(${delta}px)`;
  }
  function onDragEnd() {
    dragEligible = false;
    if (!dragging) return;
    dragging = false;
    if (dragPointerId !== null) {
      try {
        sheet.releasePointerCapture(dragPointerId);
      } catch (e) {}
      dragPointerId = null;
    }
    sheet.style.transition = "";
    const delta = dragCurrentY - dragStartY;
    if (delta > 90) {
      closeSheet();
    } else {
      sheet.style.transform = "translateY(0)";
    }
  }

  sheet.addEventListener("pointerdown", (e) => onDragStart(e.clientY));
  sheet.addEventListener("pointermove", onDragMove);
  sheet.addEventListener("pointerup", onDragEnd);
  sheet.addEventListener("pointercancel", onDragEnd);
  sheet.addEventListener(
    "touchmove",
    (e) => {
      if (!dragEligible) return;
      const y = e.touches[0].clientY;
      const delta = y - dragStartY;
      if (delta > 0) e.preventDefault(); // cuma blok pas mau nutup (geser ke bawah)
    },
    { passive: false }
  );

  // ---------- Modal konfirmasi & sukses generik ----------
  const genericConfirmModal = section.querySelector("#profil-generic-confirm-modal");
  const genericConfirmIcon = section.querySelector("#profil-generic-confirm-icon");
  const genericConfirmText = section.querySelector("#profil-generic-confirm-text");
  const genericConfirmYes = section.querySelector("#profil-generic-confirm-yes");
  const genericConfirmCancel = section.querySelector("#profil-generic-confirm-cancel");
  let genericConfirmAction = null;

  function showGenericConfirm(message, icon, onConfirm) {
    genericConfirmText.textContent = message;
    genericConfirmIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`;
    genericConfirmAction = onConfirm;
    genericConfirmModal.hidden = false;
  }

  genericConfirmCancel.addEventListener("click", () => {
    genericConfirmAction = null;
    genericConfirmModal.hidden = true;
  });

  genericConfirmYes.addEventListener("click", async () => {
    const action = genericConfirmAction;
    genericConfirmAction = null;
    genericConfirmModal.hidden = true;
    if (action) await action();
  });

  const successModal = section.querySelector("#profil-success-modal");
  const successText = section.querySelector("#profil-success-text");

  function showSuccess(message) {
    successText.textContent = message;
    successModal.hidden = false;
  }

  section.querySelector("#profil-success-ok").addEventListener("click", () => {
    successModal.hidden = true;
  });

  // ---------- Foto: ubah & hapus ----------
  const photoInput = section.querySelector("#profil-photo-input");

  section.querySelector("#profil-photo-change-btn").addEventListener("click", () => {
    photoInput.click();
  });

  photoInput.addEventListener("change", () => {
    const file = photoInput.files && photoInput.files[0];
    photoInput.value = "";
    if (!file) return;
    showGenericConfirm("Ganti foto profil dengan foto ini?", "fa-camera", async () => {
      await handlePhotoChange(file);
    });
  });

  section.querySelector("#profil-photo-delete-btn").addEventListener("click", () => {
    showGenericConfirm("Yakin mau hapus foto profil?", "fa-trash", async () => {
      await handlePhotoDelete();
    });
  });

  async function handlePhotoChange(file) {
    if (!storageApi || !firestoreApi || !authApi) return;
    try {
      const storage = storageApi.getStorage();
      const fileRef = storageApi.ref(storage, `profil/${user.uid}/avatar.jpg`);
      await storageApi.uploadBytes(fileRef, file);
      const url = await storageApi.getDownloadURL(fileRef);

      await firestoreApi.updateDoc(firestoreApi.doc(db, "customers", user.uid), {
        photoURL: url,
      });
      await authApi.updateProfile(user, { photoURL: url });

      setAvatar(url);
      showSuccess("Foto profil berhasil diubah");
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === "function") {
        window.showToast("Gagal ubah foto profil. Coba lagi ya.", "error");
      }
    }
  }

  async function handlePhotoDelete() {
    if (!storageApi || !firestoreApi || !authApi) return;
    try {
      const storage = storageApi.getStorage();
      const fileRef = storageApi.ref(storage, `profil/${user.uid}/avatar.jpg`);
      try {
        await storageApi.deleteObject(fileRef);
      } catch (err) {
        if (err.code !== "storage/object-not-found") throw err;
      }

      await firestoreApi.updateDoc(firestoreApi.doc(db, "customers", user.uid), {
        photoURL: null,
      });
      await authApi.updateProfile(user, { photoURL: null });

      setAvatar(null);
      showSuccess("Foto profil berhasil dihapus");
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === "function") {
        window.showToast("Gagal hapus foto profil. Coba lagi ya.", "error");
      }
    }
  }

  // ---------- Simpan semua perubahan ----------
  let emailVerificationSent = false;

  function getPrimaryProviderId() {
    const ids = (user.providerData || []).map((p) => p.providerId);
    if (ids.includes("google.com")) return "google.com";
    if (ids.includes("phone")) return "phone";
    return "password";
  }

  async function trySaveEmail(newEmail) {
    try {
      // Email belum berubah instan -> Firebase kirim link verifikasi ke email baru dulu,
      // baru resmi ganti setelah linknya diklik.
      await authApi.verifyBeforeUpdateEmail(user, newEmail);
      emailVerificationSent = true;
      return true;
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        pendingEmailValue = newEmail;

        const providerId = getPrimaryProviderId();

        if (providerId === "google.com") {
          reauthWithGoogleThenRetry();
        } else if (providerId === "phone") {
          startPhoneReauth();
        } else {
          section.querySelector("#profil-reauth-modal").hidden = false;
        }
        return false;
      }
      throw err;
    }
  }

  // ---------- Reauth: Google (popup langsung) ----------
  async function reauthWithGoogleThenRetry() {
    try {
      await authApi.reauthenticateWithPopup(user, new authApi.GoogleAuthProvider());

      const emailToSave = pendingEmailValue;
      pendingEmailValue = null;
      const ok = await trySaveEmail(emailToSave);
      if (ok) {
        emailVerificationSent = false;
        showSuccess("Data tersimpan. Cek email barumu & klik link verifikasi biar email login-nya resmi ganti.");
      }
    } catch (err) {
      console.error(err);
      pendingEmailValue = null;
      if (typeof window.showToast === "function") {
        window.showToast("Gagal verifikasi ulang lewat Google. Coba lagi ya.", "error");
      }
    }
  }

  // ---------- Reauth: Nomor HP (kirim ulang OTP) ----------
  let phoneReauthVerificationId = null;

  async function startPhoneReauth() {
    try {
      if (!window.__profilRecaptchaVerifier) {
        window.__profilRecaptchaVerifier = new authApi.RecaptchaVerifier(
          section.querySelector("#profil-recaptcha-container"),
          { size: "invisible" },
          auth
        );
      }
      const provider = new authApi.PhoneAuthProvider(auth);
      phoneReauthVerificationId = await provider.verifyPhoneNumber(
        user.phoneNumber,
        window.__profilRecaptchaVerifier
      );
      section.querySelector("#profil-phone-reauth-modal").hidden = false;
    } catch (err) {
      console.error(err);
      pendingEmailValue = null;
      if (typeof window.showToast === "function") {
        window.showToast("Gagal kirim kode OTP. Coba lagi ya.", "error");
      }
    }
  }

  async function performSaveAll() {
    if (!firestoreApi || !authApi) return;
    const saveBtn = section.querySelector("#profil-save-all");
    const nameVal = section.querySelector("#profil-input-name").value.trim();
    const phoneVal = section.querySelector("#profil-input-phone").value.trim();
    const addressVal = section.querySelector("#profil-input-address").value.trim();
    const emailVal = section.querySelector("#profil-input-email").value.trim();

    const originalLabel = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="profil-btn-spinner"></span> Menyimpan...`;

    try {
      await firestoreApi.updateDoc(firestoreApi.doc(db, "customers", user.uid), {
        name: nameVal,
        phone: phoneVal,
        address: addressVal,
      });
      if (nameVal) await authApi.updateProfile(user, { displayName: nameVal });

      const heroNameEl = section.querySelector(".profil-name");
      const nameInfoEl = section.querySelector("#profil-info-name");
      const phoneInfoEl = section.querySelector("#profil-info-phone");
      const addressInfoEl = section.querySelector("#profil-info-address");
      if (heroNameEl && nameVal) heroNameEl.textContent = nameVal;
      if (nameInfoEl) nameInfoEl.textContent = nameVal || "-";
      if (phoneInfoEl) phoneInfoEl.textContent = phoneVal || "-";
      if (addressInfoEl) addressInfoEl.textContent = addressVal || "-";

      if (emailVal && emailVal !== user.email) {
        const ok = await trySaveEmail(emailVal);
        if (!ok) return; // nunggu reauth, sukses ditampilin setelah itu
      }

      if (emailVerificationSent) {
        emailVerificationSent = false;
        showSuccess("Data tersimpan. Cek email barumu & klik link verifikasi biar email login-nya resmi ganti.");
      } else {
        showSuccess("Perubahan berhasil disimpan");
      }
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === "function") {
        window.showToast("Gagal simpan perubahan. Coba lagi ya.", "error");
      }
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalLabel;
    }
  }

  section.querySelector("#profil-save-all").addEventListener("click", () => {
    showGenericConfirm("Simpan perubahan profil ini?", "fa-floppy-disk", performSaveAll);
  });

  // ---------- Reauth email ----------
  const reauthModal = section.querySelector("#profil-reauth-modal");

  section.querySelector("#profil-reauth-cancel").addEventListener("click", () => {
    pendingEmailValue = null;
    section.querySelector("#profil-reauth-password").value = "";
    reauthModal.hidden = true;
  });

  section.querySelector("#profil-reauth-submit").addEventListener("click", async () => {
    if (!authApi || !pendingEmailValue) return;
    const password = section.querySelector("#profil-reauth-password").value;
    if (!password) return;
    try {
      const credential = authApi.EmailAuthProvider.credential(user.email, password);
      await authApi.reauthenticateWithCredential(user, credential);
      section.querySelector("#profil-reauth-password").value = "";
      reauthModal.hidden = true;
      const emailToSave = pendingEmailValue;
      pendingEmailValue = null;
      const ok = await trySaveEmail(emailToSave);
      if (ok) {
        emailVerificationSent = false;
        showSuccess("Data tersimpan. Cek email barumu & klik link verifikasi biar email login-nya resmi ganti.");
      }
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === "function") {
        window.showToast("Password salah. Coba lagi ya.", "error");
      }
    }
  });

  // ---------- Reauth: Nomor HP (submit kode OTP) ----------
  const phoneReauthModal = section.querySelector("#profil-phone-reauth-modal");

  section.querySelector("#profil-phone-reauth-cancel").addEventListener("click", () => {
    pendingEmailValue = null;
    phoneReauthVerificationId = null;
    section.querySelector("#profil-phone-reauth-otp").value = "";
    phoneReauthModal.hidden = true;
  });

  section.querySelector("#profil-phone-reauth-submit").addEventListener("click", async () => {
    const code = section.querySelector("#profil-phone-reauth-otp").value.trim();
    if (!code || !phoneReauthVerificationId) return;
    try {
      const credential = authApi.PhoneAuthProvider.credential(phoneReauthVerificationId, code);
      await authApi.reauthenticateWithCredential(user, credential);

      section.querySelector("#profil-phone-reauth-otp").value = "";
      phoneReauthModal.hidden = true;
      phoneReauthVerificationId = null;

      const emailToSave = pendingEmailValue;
      pendingEmailValue = null;
      const ok = await trySaveEmail(emailToSave);
      if (ok) {
        emailVerificationSent = false;
        showSuccess("Data tersimpan. Cek email barumu & klik link verifikasi biar email login-nya resmi ganti.");
      }
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === "function") {
        window.showToast("Kode OTP salah. Coba lagi ya.", "error");
      }
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