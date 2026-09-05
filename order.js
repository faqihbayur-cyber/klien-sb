// order.js — form pesanan (titip beli/pesan makanan).
// Biaya jasa dihitung otomatis dari perkiraan budget belanja pelanggan.

const FEE_TIERS = [
  { max: 20000, fee: 5000 },
  { max: 40000, fee: 7000 },
  { max: 50000, fee: 8000 },
  { max: 80000, fee: 10000 },
  { max: 90000, fee: 15000 },
  { max: Infinity, fee: 20000 },
];

function hitungBiayaJasa(nominal) {
  const tier = FEE_TIERS.find((t) => nominal <= t.max);
  return tier ? tier.fee : 20000;
}

function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

const CHIPS = [
  { label: "Rp. 0 - 15.000", amount: 15000 },
  { label: "Rp. 16.000 - 35.000", amount: 35000 },
  { label: "Rp. 36.000 - 65.000", amount: 65000 },
  { label: "Rp. 66.000 - 100.000", amount: 100000 },
];

export function mount(section, { user, db }) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = true;

  const bottomNav = document.getElementById("bottom-nav");
  if (bottomNav) bottomNav.hidden = true;

  section.innerHTML = `
    <div class="order-wrap">
      <div class="order-header">
        <img src="section2.png" alt="" class="order-header-img" />
        <div class="order-header-text">
          <h1>Buat Pesanan</h1>
          <p>Isi detail pesananmu dan kami belikan!</p>
        </div>
      </div>

      <div class="order-card">

        <div class="location-permission-overlay" id="location-permission-modal" hidden>
          <div class="location-permission-card">
            <div class="location-permission-icon"><i class="fa-solid fa-location-dot"></i></div>
            <h3>Aktifkan Lokasi</h3>
            <p>Kami perlu lokasi kamu biar driver bisa nganter pesanan ke alamat yang tepat.</p>
            <button type="button" class="btn-primary" id="location-permission-allow">Aktifkan Lokasi</button>
            <button type="button" class="location-permission-cancel" id="location-permission-cancel">Nanti Dulu</button>
          </div>
        </div>

        <div class="location-permission-overlay" id="location-denied-modal" hidden>
          <div class="location-permission-card">
            <div class="location-permission-icon location-permission-icon-error"><i class="fa-solid fa-location-crosshairs"></i></div>
            <h3>Lokasi Tidak Aktif</h3>
            <p>Izin lokasi ditolak atau nonaktif. Aktifkan lewat pengaturan browser/HP kamu, lalu coba lagi.</p>
            <button type="button" class="btn-primary" id="location-denied-close">Oke, Mengerti</button>
          </div>
        </div>

        <div class="location-permission-overlay" id="order-incomplete-modal" hidden>
          <div class="location-permission-card">
            <div class="location-permission-icon location-permission-icon-error"><i class="fa-solid fa-circle-exclamation"></i></div>
            <h3>Belum Lengkap Nih</h3>
            <p>Heyy, kamu belum mengisi semuanya, isi yang lengkap ya. 😇</p>
            <button type="button" class="btn-primary" id="order-incomplete-close">Oke, Mengerti</button>
          </div>
        </div>

        <label class="order-field">
          <span>Mau beli apa aja?</span>
          <textarea id="order-items" placeholder="Catat disini"></textarea>
        </label>

        <label class="order-field">
          <span>Beli di mana? (opsional)</span>
          <input type="text" id="order-place" placeholder="cth. Warung Madura Bayur" />
        </label>

        <label class="order-field">
          <span>Alamat pengantaran / alamat saya</span>
          <button type="button" class="location-btn" id="location-btn">
            <i class="fa-solid fa-location-crosshairs"></i>
            <span id="location-btn-label">Ambil Lokasi Saya</span>
          </button>

          <div class="location-map-wrap" id="location-map-wrap" hidden>
            <iframe id="location-map" class="location-map" loading="lazy"></iframe>
          </div>

          <input type="text" id="order-blok" class="order-blok-input" placeholder="Blok/Gang (opsional), cth. Gang H. Cita" hidden />
        </label>

        <label class="order-field">
          <span>Perkiraan biaya belanja</span>
          <div class="chip-row" id="chip-row">
            ${CHIPS.map((c) => `<button type="button" class="chip" data-amount="${c.amount}">${c.label}</button>`).join("")}
            <button type="button" class="chip" data-amount="lainnya">Lainnya</button>
          </div>
          <input type="text" id="order-budget-manual" class="order-budget-manual" placeholder="Ketik nominal (Rp)" inputmode="numeric" hidden />
        </label>

        <label class="order-field">
          <span>Catatan tambahan (opsional)</span>
          <textarea id="order-notes" placeholder="cth. sambalnya dipisah"></textarea>
        </label>

        <p class="order-error" id="order-error" hidden></p>
      </div>
    </div>

    <div class="order-sticky-bar">
      <div class="order-fee-info">
        <span>Perkiraan bayar jasa</span>
        <strong id="order-fee-display">Rp0</strong>
      </div>
      <button class="btn-primary" id="order-submit">
        <span id="order-submit-label">Buat Pesanan</span>
      </button>
    </div>
  `;

  let selectedAmount = 0;
  let selectedLat = null;
  let selectedLng = null;

  const customerProfilePromise = (async () => {
    try {
      const { doc, getDoc } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );
      const snap = await getDoc(doc(db, "customers", user.uid));
      return snap.exists() ? snap.data() : {};
    } catch (err) {
      console.error("Gagal ambil profil customer:", err);
      return {};
    }
  })();

  const locationBtn = section.querySelector("#location-btn");
  const locationBtnLabel = section.querySelector("#location-btn-label");
  const mapWrap = section.querySelector("#location-map-wrap");
  const mapFrame = section.querySelector("#location-map");
  const blokInput = section.querySelector("#order-blok");

  const permissionModal = section.querySelector("#location-permission-modal");
  const deniedModal = section.querySelector("#location-denied-modal");

  function requestLocation() {
    if (!navigator.geolocation) {
      errorBox.textContent = "Perangkat tidak mendukung deteksi lokasi.";
      errorBox.hidden = false;
      return;
    }

    locationBtn.disabled = true;
    locationBtnLabel.textContent = "Mendeteksi lokasi...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        selectedLat = pos.coords.latitude;
        selectedLng = pos.coords.longitude;

        const delta = 0.003;
        const bbox = [selectedLng - delta, selectedLat - delta, selectedLng + delta, selectedLat + delta].join(",");
        mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&marker=${selectedLat},${selectedLng}&layer=mapnik`;
        mapWrap.hidden = false;
        blokInput.hidden = false;
        mapWrap.scrollIntoView({ behavior: "smooth", block: "center" });

        locationBtn.classList.add("success");
        locationBtnLabel.textContent = "Lokasi Didapat ✓ (Ambil Ulang)";
        locationBtn.disabled = false;
      },
      (err) => {
        console.error(err);
        locationBtnLabel.textContent = "Ambil Lokasi Saya";
        locationBtn.disabled = false;
        deniedModal.hidden = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  locationBtn.addEventListener("click", () => {
    permissionModal.hidden = false;
  });

  section.querySelector("#location-permission-allow").addEventListener("click", () => {
    permissionModal.hidden = true;
    requestLocation();
  });

  section.querySelector("#location-permission-cancel").addEventListener("click", () => {
    permissionModal.hidden = true;
  });

  section.querySelector("#location-denied-close").addEventListener("click", () => {
    deniedModal.hidden = true;
  });

  const chipRow = section.querySelector("#chip-row");
  const manualInput = section.querySelector("#order-budget-manual");
  const feeDisplay = section.querySelector("#order-fee-display");
  const errorBox = section.querySelector("#order-error");
  const submitBtn = section.querySelector("#order-submit");
  const submitLabel = section.querySelector("#order-submit-label");

  function updateFeeDisplay() {
    feeDisplay.textContent = selectedAmount > 0 ? formatRupiah(hitungBiayaJasa(selectedAmount)) : "Rp0";
  }

  chipRow.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chipRow.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");

      if (chip.dataset.amount === "lainnya") {
        manualInput.hidden = false;
        manualInput.focus();
        selectedAmount = Number(manualInput.value) || 0;
      } else {
        manualInput.hidden = true;
        selectedAmount = Number(chip.dataset.amount);
      }
      updateFeeDisplay();
    });
  });

  manualInput.addEventListener("input", () => {
    const digitsOnly = manualInput.value.replace(/\D/g, "");
    selectedAmount = Number(digitsOnly) || 0;
    manualInput.value = digitsOnly ? Number(digitsOnly).toLocaleString("id-ID") : "";
    updateFeeDisplay();
  });

  const incompleteModal = section.querySelector("#order-incomplete-modal");
  section.querySelector("#order-incomplete-close").addEventListener("click", () => {
    incompleteModal.hidden = true;
  });

  submitBtn.addEventListener("click", async () => {
    errorBox.hidden = true;

    const items = section.querySelector("#order-items").value.trim();
    const place = section.querySelector("#order-place").value.trim();
    const blokGang = section.querySelector("#order-blok").value.trim();
    const notes = section.querySelector("#order-notes").value.trim();

    if (!items || selectedLat === null || selectedAmount <= 0) {
      incompleteModal.hidden = false;
      return;
    }

    const fee = hitungBiayaJasa(selectedAmount);

    submitBtn.disabled = true;
    submitLabel.textContent = "Menyimpan...";

    try {
      const { collection, addDoc, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
      );

      const customerProfile = await customerProfilePromise;

      const now = new Date();
      const etaFrom = new Date(now.getTime() + 45 * 60000);
      const etaTo = new Date(now.getTime() + 75 * 60000);
      const fmtJam = (d) => d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const eta = `Hari ini, ${fmtJam(etaFrom)} - ${fmtJam(etaTo)}`;

      await addDoc(collection(db, "orders"), {
        customerUid: user.uid,
        customerName: customerProfile.name || user.displayName || "Customer",
        customerFoto: customerProfile.foto || user.photoURL || "",
        items,
        place,
        lat: selectedLat,
        lng: selectedLng,
        blokGang,
        notes,
        budgetEstimate: selectedAmount,
        fee,
        eta,
        status: "menunggu",
        createdAt: serverTimestamp(),
        diprosesAt: null,
        diantarAt: null,
        selesaiAt: null,
      });

      if (typeof window.showToast === "function") {
        window.showToast("Pesanan berhasil dibuat! Driver akan segera memprosesnya.", "success");
      } else {
        console.warn("window.showToast tidak tersedia — cek ui-feedback.js");
      }
      window.location.hash = "#/lacak";
    } catch (err) {
      console.error(err);
      errorBox.textContent = "Gagal membuat pesanan. Coba lagi ya.";
      errorBox.hidden = false;
      submitBtn.disabled = false;
      submitLabel.textContent = "Buat Pesanan";
    }
  });
}

export function unmount(section) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = false;

  const bottomNav = document.getElementById("bottom-nav");
  if (bottomNav) bottomNav.hidden = false;

  section.innerHTML = "";
}
