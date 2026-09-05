// chat-state.js — context sederhana buat oper data "siapa yang lagi diajak chat"
// antar view, karena router cuma pakai hash tanpa parameter.

let activeChat = null; // { driverUid, driverName, driverFoto }

export function setActiveChat(driver) {
  activeChat = driver;
}

export function getActiveChat() {
  return activeChat;
}

// ID chat dibuat deterministik dari 2 uid supaya threadnya persisten
// per-driver (nggak peduli siapa yang mulai duluan, nggak putus per-pesanan).
export function buildChatId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}
