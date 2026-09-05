// chat-room.js — room chat 1-on-1 antara customer dan driver.
// Thread bersifat persisten per-driver (id chat = gabungan 2 uid, sorted),
// jadi nggak putus walau pesanan udah selesai.

import { getActiveChat, buildChatId } from "./chat-state.js";

let unsubscribeMessages = null;
let unsubscribeChat = null;

function formatJamPesan(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp.toDate().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

export function mount(section, { user, db }) {
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = true;
  const bottomNav = document.getElementById("bottom-nav");
  if (bottomNav) bottomNav.classList.add("bottom-nav-hide");

  const chat = getActiveChat();

  if (!chat || !chat.driverUid) {
    section.innerHTML = `
      <div class="chatroom-wrap">
        <div class="chatroom-topbar">
          <button class="chatroom-icon-btn" id="chatroom-back"><i class="fa-solid fa-arrow-left"></i></button>
        </div>
        <p class="chatroom-empty">Nggak ada chat yang dipilih.</p>
      </div>
    `;
    section.querySelector("#chatroom-back").addEventListener("click", () => {
      window.location.hash = "#/chat-list";
    });
    return;
  }

  const chatId = buildChatId(user.uid, chat.driverUid);
  const fotoHtml = chat.driverFoto
    ? `<img src="${escapeHtml(chat.driverFoto)}" alt="${escapeHtml(chat.driverName)}" class="chatroom-avatar">`
    : `<div class="chatroom-avatar chatroom-avatar-fallback"><i class="fa-solid fa-user"></i></div>`;

  section.innerHTML = `
    <div class="chatroom-wrap">
      <div class="chatroom-topbar">
        <button class="chatroom-icon-btn" id="chatroom-back"><i class="fa-solid fa-arrow-left"></i></button>
        ${fotoHtml}
        <p class="chatroom-name">${escapeHtml(chat.driverName || "Driver")}</p>
      </div>
      <div class="chatroom-messages" id="chatroom-messages">
        <p class="chatroom-loading">Memuat percakapan...</p>
      </div>
      <form class="chatroom-inputbar" id="chatroom-form">
        <input type="text" id="chatroom-input" placeholder="Ketik pesan..." autocomplete="off" />
        <button type="submit" id="chatroom-send"><i class="fa-solid fa-paper-plane"></i></button>
      </form>
    </div>
  `;

  section.querySelector("#chatroom-back").addEventListener("click", () => {
    window.location.hash = "#/chat-list";
  });

  const messagesEl = section.querySelector("#chatroom-messages");
  const formEl = section.querySelector("#chatroom-form");
  const inputEl = section.querySelector("#chatroom-input");

  // State lokal buat gabungin data pesan + data "udah dibaca sampai mana"
  // dari dokumen chat induk, dipakai bareng buat nge-render checklist.
  let latestMessages = null;
  let latestChatData = null;

  function renderMessages() {
    if (!latestMessages) return;

    if (latestMessages.length === 0) {
      messagesEl.innerHTML = `<p class="chatroom-empty">Mulai obrolan dengan driver kamu.</p>`;
      return;
    }

    const driverReadAtMs = latestChatData?.lastReadByDriverAt?.toMillis?.() || 0;

    messagesEl.innerHTML = latestMessages
      .map((m) => {
        const mine = m.senderId === user.uid;
        let statusIcon = "";
        if (mine) {
          const msgMs = m.createdAt?.toMillis?.() || Infinity; // belum ke-set server timestamp = anggap paling baru
          const isRead = m.createdAt && driverReadAtMs >= msgMs;
          statusIcon = isRead
            ? `<i class="fa-solid fa-check-double chatroom-check chatroom-check-read"></i>`
            : `<i class="fa-solid fa-check chatroom-check"></i>`;
        }
        return `
          <div class="chatroom-bubble-row ${mine ? "chatroom-bubble-row-mine" : ""}">
            <div class="chatroom-bubble ${mine ? "chatroom-bubble-mine" : "chatroom-bubble-theirs"}">
              <p>${escapeHtml(m.text || "")}</p>
              <span class="chatroom-bubble-time">${formatJamPesan(m.createdAt)}${statusIcon}</span>
            </div>
          </div>
        `;
      })
      .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js").then(
    ({ doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, increment }) => {
      const chatRef = doc(db, "chats", chatId);
      const messagesRef = collection(db, "chats", chatId, "messages");

      function notify(message) {
        if (typeof window.showToast === "function") {
          window.showToast(message, "error");
        } else {
          console.warn(message);
        }
      }

      // Tandai chat ini udah dibaca customer: reset counter unread & catat waktu baca
      function markReadByCustomer() {
        updateDoc(chatRef, {
          unreadForCustomer: 0,
          lastReadByCustomerAt: serverTimestamp(),
        }).catch((err) => console.error(err));
      }

      // Pastikan dokumen chat ada dulu (buat pertama kali kalau belum pernah chat)
      // SEBELUM masang listener pesan / form kirim — kalau nggak, ada race:
      // listener/kirim jalan duluan sementara dokumen chat-nya belum ke-create,
      // jadi kena permission-denied karena dokumennya belum ada.
      getDoc(chatRef)
        .then((snap) => {
          if (!snap.exists()) {
            return setDoc(chatRef, {
              customerUid: user.uid,
              driverUid: chat.driverUid,
              driverName: chat.driverName || "Driver",
              driverFoto: chat.driverFoto || "",
              lastMessage: "",
              lastMessageAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              unreadForCustomer: 0,
              unreadForDriver: 0,
            });
          }
        })
        .then(() => {
          // Chat dokumen sendiri — dipantau real-time buat tau kapan driver baca pesan kita (checklist)
          unsubscribeChat = onSnapshot(chatRef, (snap) => {
            latestChatData = snap.data() || null;
            renderMessages();
          });

          // Begitu room dibuka, langsung tandai udah dibaca (dan tiap ada pesan masuk baru selagi room terbuka)
          markReadByCustomer();

          const q = query(messagesRef, orderBy("createdAt", "asc"));
          unsubscribeMessages = onSnapshot(
            q,
            (snapshot) => {
              latestMessages = snapshot.docs.map((d) => d.data());
              renderMessages();
              // Ada pesan baru masuk selagi kita lagi buka room ini -> langsung mark read juga
              markReadByCustomer();
            },
            (err) => {
              console.error(err);
              messagesEl.innerHTML = `<p class="chatroom-empty">Gagal memuat pesan. Coba refresh halaman.</p>`;
            }
          );

          formEl.addEventListener("submit", async (e) => {
            e.preventDefault();
            const text = inputEl.value.trim();
            if (!text) return;

            inputEl.value = "";
            inputEl.disabled = true;

            try {
              await addDoc(messagesRef, {
                senderId: user.uid,
                senderRole: "customer",
                text,
                createdAt: serverTimestamp(),
              });
              await updateDoc(chatRef, {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                lastSenderId: user.uid,
                unreadForDriver: increment(1),
              });
            } catch (err) {
              console.error(err);
              notify("Gagal mengirim pesan. Coba lagi ya.");
              inputEl.value = text;
            } finally {
              inputEl.disabled = false;
              inputEl.focus();
            }
          });
        })
        .catch((err) => {
          console.error(err);
          messagesEl.innerHTML = `<p class="chatroom-empty">Gagal memuat percakapan. Coba refresh halaman.</p>`;
        });
    }
  );
}

export function unmount(section) {
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }
  if (unsubscribeChat) {
    unsubscribeChat();
    unsubscribeChat = null;
  }
  const appHeader = document.getElementById("app-header");
  if (appHeader) appHeader.hidden = false;

  const bottomNav = document.getElementById("bottom-nav");
  if (bottomNav) bottomNav.classList.remove("bottom-nav-hide");

  section.innerHTML = "";
}
