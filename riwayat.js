// views/riwayat/riwayat.js

const STATUS_META = {
  menunggu: { label: "Menunggu", color: "#6B5541", bg: "#EFE3CF" },
  diproses: { label: "Diproses", color: "#C24A08", bg: "#FDE3CE" },
  diantar: { label: "Diantar", color: "#8A5A00", bg: "#FFF0CE" },
  selesai: { label: "Selesai", color: "#1F8A4C", bg: "#DFF3E5" },
  batal: { label: "Dibatalkan", color: "#6B6B6B", bg: "#EDEDED" },
};

const TABS = [
  { key: "semua", label: "Semua" },
  { key: "selesai", label: "Selesai" },
  { key: "batal", label: "Dibatalkan" },
];

function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

function formatTanggal(timestamp) {
  if (!timestamp || !timestamp.toDate) return "-";
  const d = timestamp.toDate();
  const tanggal = d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${tanggal} • ${jam}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let unsubscribe = null;
let allOrders = [];
let activeTab = "semua";

function renderList(listEl) {
  const filtered = allOrders.filter((o) => {
    if (activeTab === "semua") return true;
    return o.status === activeTab;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="riwayat-empty">
        <div class="riwayat-empty-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
        <p>Belum ada riwayat pesanan.</p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered
    .map((o) => {
      const meta = STATUS_META[o.status] || STATUS_META.menunggu;
      const orderIdDisplay = (o.id || "").slice(0, 8).toUpperCase();
      const total = Number(o.budgetEstimate || 0) + Number(o.fee || 0);
      const tujuan = o.place || o.blokGang || "-";

      return `
        <div class="riwayat-card">
          <div class="riwayat-card-top">
            <span class="riwayat-order-id">#${orderIdDisplay}</span>
            <span class="riwayat-badge" style="color:${meta.color};background:${meta.bg}">${meta.label}</span>
          </div>
          <p class="riwayat-date">${formatTanggal(o.createdAt)}</p>

          <div class="riwayat-row">
            <span class="riwayat-row-label">Total</span>
            <span class="riwayat-row-value">${formatRupiah(total)}</span>
          </div>
          <div class="riwayat-row">
            <span class="riwayat-row-label">Tujuan</span>
            <span class="riwayat-row-value">${escapeHtml(tujuan)}</span>
          </div>

          <div class="riwayat-detail" hidden>
            <div class="riwayat-detail-line"></div>
            <p class="riwayat-detail-label">Item Pesanan</p>
            <p class="riwayat-detail-text">${escapeHtml(o.items || "-")}</p>
            ${o.notes ? `<p class="riwayat-detail-label">Catatan</p><p class="riwayat-detail-text">${escapeHtml(o.notes)}</p>` : ""}
          </div>

          <button class="riwayat-detail-btn" data-id="${o.id}">
            <span>Lihat Detail</span>
            <i class="fa-solid fa-chevron-down"></i>
          </button>
        </div>
      `;
    })
    .join("");

  listEl.querySelectorAll(".riwayat-detail-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".riwayat-card");
      const detail = card.querySelector(".riwayat-detail");
      const icon = btn.querySelector("i");
      const isOpen = !detail.hidden;
      detail.hidden = isOpen;
      icon.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
      btn.querySelector("span").textContent = isOpen ? "Lihat Detail" : "Sembunyikan";
    });
  });
}

export function mount(section, { user, db }) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = true;

  activeTab = "semua";

  section.innerHTML = `
    <div class="riwayat-wrap">
      <div class="riwayat-topbar">
        <button class="riwayat-icon-btn" id="riwayat-back"><i class="fa-solid fa-arrow-left"></i></button>
        <button class="riwayat-icon-btn" id="riwayat-bell">
          <i class="fa-solid fa-bell"></i>
          <span class="riwayat-bell-dot"></span>
        </button>
      </div>
      <div class="riwayat-headings">
        <h1>Riwayat Pesanan</h1>
        <p>Lihat semua pesananmu</p>
      </div>

      <div class="riwayat-tabs" id="riwayat-tabs">
        ${TABS.map(
          (t) => `<button class="riwayat-tab${t.key === "semua" ? " active" : ""}" data-tab="${t.key}">${t.label}</button>`
        ).join("")}
      </div>

      <div id="riwayat-list"><p class="riwayat-loading">Memuat riwayat...</p></div>
    </div>
  `;

  const listEl = section.querySelector("#riwayat-list");

  section.querySelector("#riwayat-back").addEventListener("click", () => {
    window.location.hash = "#/home";
  });

  section.querySelectorAll(".riwayat-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      section.querySelectorAll(".riwayat-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderList(listEl);
    });
  });

  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js").then(
    ({ collection, query, where, onSnapshot }) => {
      const q = query(collection(db, "orders"), where("customerUid", "==", user.uid));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          allOrders = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
          renderList(listEl);
        },
        (err) => {
          console.error(err);
          listEl.innerHTML = `<p class="riwayat-error">Gagal memuat riwayat. Coba refresh halaman.</p>`;
        }
      );
    }
  );
}

export function unmount(section) {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = false;
  section.innerHTML = "";
}