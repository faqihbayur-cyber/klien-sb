// chat-list.js — daftar chat customer dengan driver-driver yang pernah diajak ngobrol.
// Mirip WhatsApp: nama driver + preview pesan terakhir, urut dari yang paling baru.

import { setActiveChat } from "./chat-state.js";

let unsubscribe = null;
let allChats = []; // cache buat difilter pas search

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatWaktuSingkat(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  const date = timestamp.toDate();
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export function mount(section, { user, db }) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = true;

  section.innerHTML = `
    <div class="chatlist-wrap">
      <div class="chatlist-topbar">
        <h1>Chat</h1>
        <button class="chatlist-icon-btn" id="chatlist-search-toggle"><i class="fa-solid fa-magnifying-glass"></i></button>
      </div>
      <div class="chatlist-search-bar" id="chatlist-search-bar" hidden>
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" id="chatlist-search-input" placeholder="Cari nama driver..." autocomplete="off" />
      </div>
      <div id="chatlist-items"><p class="chatlist-loading">Memuat chat...</p></div>
    </div>
  `;

  const itemsEl = section.querySelector("#chatlist-items");
  const searchBar = section.querySelector("#chatlist-search-bar");
  const searchInput = section.querySelector("#chatlist-search-input");

  section.querySelector("#chatlist-search-toggle").addEventListener("click", () => {
    searchBar.hidden = !searchBar.hidden;
    if (!searchBar.hidden) searchInput.focus();
    else {
      searchInput.value = "";
      renderItems(allChats);
    }
  });

  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      renderItems(allChats);
      return;
    }
    renderItems(allChats.filter((c) => (c.driverName || "").toLowerCase().includes(term)));
  });

  function renderItems(chats) {
    if (chats.length === 0) {
      itemsEl.innerHTML = `
        <div class="chatlist-empty">
          <div class="chatlist-empty-icon"><i class="fa-solid fa-comment-dots"></i></div>
          <p>Belum ada percakapan.</p>
        </div>
      `;
      return;
    }

    itemsEl.innerHTML = chats
      .map((c) => {
        const name = escapeHtml(c.driverName || "Driver");
        const preview = escapeHtml(c.lastMessage || "Belum ada pesan");
        const time = formatWaktuSingkat(c.lastMessageAt);
        const unread = Number(c.unreadForCustomer || 0);
        const foto = c.driverFoto
          ? `<img src="${escapeHtml(c.driverFoto)}" alt="${name}" class="chatlist-avatar">`
          : `<div class="chatlist-avatar chatlist-avatar-fallback"><i class="fa-solid fa-user"></i></div>`;
        return `
          <button class="chatlist-item" data-driver-uid="${c.driverUid}" data-driver-name="${name}" data-driver-foto="${escapeHtml(c.driverFoto || "")}">
            ${foto}
            <div class="chatlist-item-body">
              <div class="chatlist-item-top">
                <span class="chatlist-item-name ${unread > 0 ? "chatlist-item-name-unread" : ""}">${name}</span>
                <span class="chatlist-item-time">${time}</span>
              </div>
              <div class="chatlist-item-bottom">
                <p class="chatlist-item-preview ${unread > 0 ? "chatlist-item-preview-unread" : ""}">${preview}</p>
                ${unread > 0 ? `<span class="chatlist-badge">${unread > 99 ? "99+" : unread}</span>` : ""}
              </div>
            </div>
          </button>
        `;
      })
      .join("");

    itemsEl.querySelectorAll(".chatlist-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        setActiveChat({
          driverUid: btn.dataset.driverUid,
          driverName: btn.dataset.driverName,
          driverFoto: btn.dataset.driverFoto || "",
        });
        window.location.hash = "#/chat-room";
      });
    });
  }

  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js").then(
    ({ collection, query, where, orderBy, onSnapshot }) => {
      const q = query(
        collection(db, "chats"),
        where("customerUid", "==", user.uid),
        orderBy("lastMessageAt", "desc")
      );

      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          allChats = snapshot.docs.map((d) => d.data());
          const term = searchInput.value.trim().toLowerCase();
          renderItems(term ? allChats.filter((c) => (c.driverName || "").toLowerCase().includes(term)) : allChats);
        },
        (err) => {
          console.error(err);
          itemsEl.innerHTML = `<p class="chatlist-error">Gagal memuat chat. Coba refresh halaman.</p>`;
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
  allChats = [];
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = false;
  section.innerHTML = "";
}
