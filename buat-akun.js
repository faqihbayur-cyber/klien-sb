// buat-akun.js — form ini muncul saat pelanggan pertama kali klik "Pesan Sekarang"
// dan belum punya dokumen di collection customers.

export function mount(section, { user, db }) {
  section.innerHTML = `
    <div class="ba-wrap">
      <div class="ba-hero">
        <img src="section2.png" alt="" />
      </div>

      <div class="ba-card">
        <h2 class="ba-title">Buat Akun Dulu, Yuk</h2>
        <p class="ba-subtitle">Data ini dipakai supaya driver bisa antar pesananmu dengan tepat.</p>

        <label class="ba-field">
          <span>Nama lengkap</span>
          <input type="text" id="ba-name" placeholder="Pakai nama sendiri ya" />
        </label>

        <label class="ba-field">
          <span>Nomor HP</span>
          <input type="tel" id="ba-phone" placeholder="08xxxxxxxxxx" inputmode="numeric" value="${user.phoneNumber ? user.phoneNumber.replace("+62", "0") : ""}" />
          <span class="ba-hint">Nomor HP bersifat pribadi, hanya Anda yang bisa melihat.</span>
        </label>

        <label class="ba-field">
          <span>Alamat</span>
          <textarea id="ba-address" placeholder="cth. Jl. Kenanga No. 5, dekat pos ronda"></textarea>
        </label>

        <p class="ba-error" id="ba-error" hidden></p>

        <button class="btn-primary" id="ba-submit">
          <span id="ba-submit-label">Simpan &amp; Lanjut</span>
        </button>
      </div>
    </div>
  `;

  const navEl = document.getElementById("bottom-nav");
  if (navEl) navEl.hidden = true;

  const submitBtn = section.querySelector("#ba-submit");
  const submitLabel = section.querySelector("#ba-submit-label");
  const errorBox = section.querySelector("#ba-error");

  submitBtn.addEventListener("click", async () => {
    errorBox.hidden = true;

    const name = section.querySelector("#ba-name").value.trim();
    const phone = section.querySelector("#ba-phone").value.trim();
    const address = section.querySelector("#ba-address").value.trim();

    if (!name || !phone || !address) {
      errorBox.textContent = "Semua kolom wajib diisi.";
      errorBox.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitLabel.textContent = "Menyimpan...";

    try {
      const { doc, setDoc, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );

      await setDoc(doc(db, "customers", user.uid), {
        uid: user.uid,
        name,
        phone,
        address,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        role: "customer",
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "public_profiles", user.uid), {
        name,
        photoURL: "",
        role: "customer",
        updatedAt: serverTimestamp(),
      });

      window.location.hash = "#/home";
    } catch (err) {
      console.error(err);
      errorBox.textContent = "Gagal menyimpan. Coba lagi ya.";
      errorBox.hidden = false;
      submitBtn.disabled = false;
      submitLabel.textContent = "Simpan & Lanjut";
    }
  });
}

export function unmount(section) {
  const navEl = document.getElementById("bottom-nav");
  if (navEl) navEl.hidden = false;

  section.innerHTML = "";
}
