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

import { setActiveChat } from "./chat-state.js";

let unsubscribe = null;
let mapInstances = new Map(); // orderId -> { map, driverMarker, destMarker }

function destroyMap(orderId) {
  const entry = mapInstances.get(orderId);
  if (entry) {
    entry.map.remove();
    mapInstances.delete(orderId);
  }
}

function renderOrderMap(order) {
  const container = document.getElementById(`lacak-map-${order.id}`);
  if (!container) return;

  const hasDriverPos = typeof order.driverLat === "number" && typeof order.driverLng === "number";
  const hasDestPos = typeof order.lat === "number" && typeof order.lng === "number";

  if (!hasDriverPos) {
    // Belum ada posisi driver — jangan render map, cukup pesan
    destroyMap(order.id);
    container.innerHTML = `<div class="lacak-map-waiting"><i class="fa-solid fa-satellite-dish"></i> Menunggu posisi driver...</div>`;
    return;
  }

  const driverPos = [order.driverLat, order.driverLng];
  const destPos = hasDestPos ? [order.lat, order.lng] : driverPos;

  let entry = mapInstances.get(order.id);

  if (!entry) {
    container.innerHTML = ""; // pastikan bersih dari pesan "menunggu" sebelumnya
    const map = L.map(container, { zoomControl: false, attributionControl: false }).setView(driverPos, 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    const driverIcon = L.icon({
      iconUrl: "pin.png",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
    const destIcon = L.divIcon({
      className: "lacak-map-dest-icon",
      html: `<div class="lacak-map-dest"><i class="fa-solid fa-house"></i></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
    });

    const driverMarker = L.marker(driverPos, { icon: driverIcon }).addTo(map);
    const destMarker = hasDestPos ? L.marker(destPos, { icon: destIcon }).addTo(map) : null;
    const routeLine = hasDestPos
      ? L.polyline([driverPos, destPos], {
          color: "#C24A08",
          weight: 4,
          dashArray: "1, 10",
          lineCap: "round",
          opacity: 0.85,
        }).addTo(map)
      : null;

    if (hasDestPos) {
      map.fitBounds(L.latLngBounds([driverPos, destPos]), { padding: [36, 36] });
    }

    entry = { map, driverMarker, destMarker, routeLine };
    mapInstances.set(order.id, entry);
  } else {
    // Sudah ada instance map: cuma update posisi marker, jangan rebuild
    entry.driverMarker.setLatLng(driverPos);
    if (!entry.destMarker && hasDestPos) {
      const destIcon = L.divIcon({
        className: "lacak-map-dest-icon",
        html: `<div class="lacak-map-dest"><i class="fa-solid fa-house"></i></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 30],
      });
      entry.destMarker = L.marker(destPos, { icon: destIcon }).addTo(entry.map);
    }
    if (hasDestPos) {
      if (entry.routeLine) {
        entry.routeLine.setLatLngs([driverPos, destPos]);
      } else {
        entry.routeLine = L.polyline([driverPos, destPos], {
          color: "#C24A08",
          weight: 4,
          dashArray: "1, 10",
          lineCap: "round",
          opacity: 0.85,
        }).addTo(entry.map);
      }
    }
  }
}

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
            for (const id of Array.from(mapInstances.keys())) destroyMap(id);
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

                  ${buildDriverHtml(o)}

                  <div class="lacak-map" id="lacak-map-${o.id}"></div>

                  <div class="lacak-timeline">
                    ${buildTimelineHtml(o)}
                  </div>

                  <div class="lacak-card-bottom">
                    <span class="lacak-fee">Estimasi Biaya jasa ${formatRupiah(o.fee)}</span>
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

          // Cleanup instance map buat order yang udah nggak tampil lagi (selesai/batal)
          const activeIds = new Set(orders.map((o) => o.id));
          for (const id of Array.from(mapInstances.keys())) {
            if (!activeIds.has(id)) destroyMap(id);
          }

          // Render / update tiap map setelah container-nya ada di DOM
          orders.forEach((o) => renderOrderMap(o));

          listEl.querySelectorAll(".lacak-chat-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
              setActiveChat({
                driverUid: btn.dataset.driverUid,
                driverName: btn.dataset.driverName,
                driverFoto: btn.dataset.driverFoto || "",
              });
              window.location.hash = "#/chat-room";
            });
          });

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

function buildDriverHtml(order) {
  if (order.status === "menunggu" || !order.driverUid) return "";
  const name = escapeHtml(order.driverName || "Driver");
  const foto = order.driverFoto
    ? `<img src="${escapeHtml(order.driverFoto)}" alt="${name}" class="lacak-driver-photo">`
    : `<div class="lacak-driver-photo lacak-driver-photo-fallback"><i class="fa-solid fa-user"></i></div>`;
  return `
    <div class="lacak-driver-card">
      ${foto}
      <div class="lacak-driver-info">
        <span class="lacak-driver-label">Driver kamu</span>
        <p class="lacak-driver-name">${name}</p>
      </div>
      <button class="lacak-chat-btn" data-driver-uid="${order.driverUid}" data-driver-name="${name}" data-driver-foto="${escapeHtml(order.driverFoto || "")}">
        <i class="fa-solid fa-comment-dots"></i>
      </button>
    </div>
  `;
}

export function unmount(section) {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  for (const id of Array.from(mapInstances.keys())) destroyMap(id);
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = false;
  section.innerHTML = "";
}