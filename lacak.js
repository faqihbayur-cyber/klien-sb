// lacak.js — pesanan aktif milik pelanggan, update real-time dari Firestore

const STATUS_META = {
  menunggu: { label: "Menunggu Driver", color: "#6B5541", bg: "#EFE3CF" },
  diproses: { label: "Diproses", color: "#C24A08", bg: "#FDE3CE" },
  diantar: { label: "Diantar", color: "#8A5A00", bg: "#FFF0CE" },
};

const STEP_DEFS = [
  { key: "diterima", title: "Pesanan diterima", desc: "Pesananmu telah kami terima", icon: "fa-bag-shopping" },
  { key: "dibeli", title: "Sedang dibeli", desc: "Kami sedang membelikan pesananmu", icon: "fa-bag-shopping" },
  { key: "perjalanan", title: "Dalam perjalanan", desc: "Pesanan sedang diantar", icon: "fa-motorcycle" },
  { key: "selesai", title: "Sampai tujuan", desc: "Pesanan telah sampai", icon: "fa-house" },
];

const CURRENT_STEP_KEY = { menunggu: "diterima", diproses: "dibeli", diantar: "perjalanan" };
const STEP_TIMESTAMP_FIELD = { diterima: "createdAt", dibeli: "diprosesAt", perjalanan: "diantarAt", selesai: "selesaiAt" };

function formatRupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}

function formatJam(timestamp) {
  if (!timestamp || !timestamp.toDate) return "-";
  return timestamp.toDate().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function buildTimelineHtml(order) {
  const currentKey = CURRENT_STEP_KEY[order.status] || "diterima";
  const currentIndex = STEP_DEFS.findIndex((s) => s.key === currentKey);

  return STEP_DEFS.map((step, i) => {
    const state = i < currentIndex ? "done" : i === currentIndex ? "active" : "upcoming";
    const time = formatJam(order[STEP_TIMESTAMP_FIELD[step.key]]);
    return `
      <div class="lacak-step lacak-step-${state}">
        <div class="lacak-step-line"></div>
        <div class="lacak-step-icon"><i class="fa-solid ${step.icon}"></i></div>
        <div class="lacak-step-body">
          <div class="lacak-step-top">
            <span class="lacak-step-title">${step.title}</span>
            <span class="lacak-step-time">${time}</span>
          </div>
          <p class="lacak-step-desc">${step.desc}</p>
        </div>
      </div>
    `;
  }).join("");
}

let unsubscribe = null;

export function mount(section, { user, db }) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = true;

  section.innerHTML = `
    <div class="lacak-wrap">
      <div class="lacak-topbar">
        <button class="lacak-icon-btn" id="lacak-back"><i class="fa-solid fa-arrow-left"></i></button>
        <button class="lacak-icon-btn" id="lacak-bell">
          <i class="fa-solid fa-bell"></i>
          <span class="lacak-bell-dot"></span>
        </button>
      </div>
      <div class="lacak-headings">
        <h1>Lacak Pesanan</h1>
        <p>Pantau pesananmu secara real-time</p>
      </div>
      <div id="lacak-list"><p class="lacak-loading">Memuat pesanan...</p></div>

      <div class="lacak-confirm-overlay" id="lacak-confirm-modal" hidden>
        <div class="lacak-confirm-card">
          <div class="lacak-confirm-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <h3 id="lacak-confirm-message">Yakin mau batalkan pesanan ini?</h3>
          <div class="lacak-confirm-actions">
            <button type="button" class="lacak-confirm-cancel" id="lacak-confirm-no">Nggak Jadi</button>
            <button type="button" class="lacak-confirm-yes" id="lacak-confirm-yes">Ya, Batalkan</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const listEl = section.querySelector("#lacak-list");

  const confirmModal = section.querySelector("#lacak-confirm-modal");
  const confirmMessage = section.querySelector("#lacak-confirm-message");
  const confirmYesBtn = section.querySelector("#lacak-confirm-yes");
  const confirmNoBtn = section.querySelector("#lacak-confirm-no");

  function showConfirmModal(message) {
    return new Promise((resolve) => {
      confirmMessage.textContent = message;
      confirmModal.hidden = false;

      const cleanup = (result) => {
        confirmModal.hidden = true;
        confirmYesBtn.removeEventListener("click", onYes);
        confirmNoBtn.removeEventListener("click", onNo);
        resolve(result);
      };
      const onYes = () => cleanup(true);
      const onNo = () => cleanup(false);

      confirmYesBtn.addEventListener("click", onYes);
      confirmNoBtn.addEventListener("click", onNo);
    });
  }
  section.querySelector("#lacak-back").addEventListener("click", () => {
    window.location.hash = "#/home";
  });

  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js").then(
    ({ collection, query, where, onSnapshot, doc, updateDoc }) => {
      const q = query(collection(db, "orders"), where("customerUid", "==", user.uid));

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const orders = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((o) => o.status !== "selesai" && o.status !== "batal")
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

          if (orders.length === 0) {
            listEl.innerHTML = `
              <div class="lacak-empty">
                <div class="lacak-empty-icon"><i class="fa-solid fa-inbox"></i></div>
                <p>Belum ada pesanan berjalan.</p>
              </div>
            `;
            return;
          }

          listEl.innerHTML = orders
            .map((o) => {
              const meta = STATUS_META[o.status] || STATUS_META.menunggu;
              const orderIdDisplay = (o.id || "").slice(0, 8).toUpperCase();
              return `
                <div class="lacak-order">
                  <div class="lacak-info-card">
                    <div class="lacak-info-top">
                      <div>
                        <span class="lacak-info-label">Order ID</span>
                        <p class="lacak-order-id">#${orderIdDisplay}</p>
                      </div>
                      <span class="lacak-badge" style="color:${meta.color};background:${meta.bg}">${meta.label}</span>
                    </div>
                    <p class="lacak-items">${escapeHtml(o.items || "")}</p>
                    ${o.blokGang ? `<p class="lacak-blok"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(o.blokGang)}</p>` : ""}
                    <div class="lacak-eta">
                      <i class="fa-regular fa-clock"></i>
                      <div>
                        <span class="lacak-eta-label">Estimasi tiba</span>
                        <p class="lacak-eta-value">${o.eta || "Segera dihitung"}</p>
                      </div>
                    </div>
                  </div>

                  <div class="lacak-map">
                    <svg class="lacak-map-route" viewBox="0 0 300 120" preserveAspectRatio="none">
                      <path d="M55,55 C130,30 170,105 250,90" fill="none" stroke="#F2833E" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14" />
                    </svg>
                    <div class="lacak-map-driver"><i class="fa-solid fa-bag-shopping"></i></div>
                    <div class="lacak-map-dest"><i class="fa-solid fa-house"></i></div>
                  </div>

                  <div class="lacak-timeline">
                    ${buildTimelineHtml(o)}
                  </div>

                  <div class="lacak-card-bottom">
                    <span class="lacak-fee">Biaya jasa ${formatRupiah(o.fee)}</span>
                    ${
                      o.status === "menunggu"
                        ? `<button class="lacak-cancel-btn" data-id="${o.id}">Batalkan</button>`
                        : ""
                    }
                  </div>
                </div>
              `;
            })
            .join("");

          listEl.querySelectorAll(".lacak-cancel-btn").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const ok = await showConfirmModal("Yakin mau batalkan pesanan ini?");
              if (!ok) return;
              btn.disabled = true;
              btn.textContent = "Membatalkan...";
              try {
                await updateDoc(doc(db, "orders", btn.dataset.id), { status: "batal" });
              } catch (err) {
                console.error(err);
                window.showToast("Gagal membatalkan pesanan. Coba lagi ya.", "error");
                btn.disabled = false;
                btn.textContent = "Batalkan";
              }
            });
          });
        },
        (err) => {
          console.error(err);
          listEl.innerHTML = `<p class="lacak-error">Gagal memuat pesanan. Coba refresh halaman.</p>`;
        }
      );
    }
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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