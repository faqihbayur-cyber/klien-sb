// register.js
import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const form = document.getElementById("register-form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const submitLabel = document.getElementById("submit-label");
const errorBox = document.getElementById("form-error");
const togglePasswordBtn = document.getElementById("toggle-password");
const toast = document.getElementById("toast");

const REDIRECT_TARGET = "index.html";

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}
function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}
function showToast(message, type = "") {
  toast.textContent = message;
  toast.className = "toast" + (type ? " " + type : "");
  toast.hidden = false;
}
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitLabel.textContent = isLoading ? "Memproses..." : "Daftar";
}

function translateAuthError(error) {
  const code = error && error.code;
  switch (code) {
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Coba masuk saja.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/weak-password":
      return "Password terlalu lemah, minimal 6 karakter.";
    case "auth/network-request-failed":
      return "Koneksi bermasalah. Periksa jaringan internet kamu.";
    default:
      return "Terjadi kesalahan. Silakan coba lagi.";
  }
}

togglePasswordBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!name || !email || !password) {
    showError("Semua kolom wajib diisi.");
    return;
  }
  if (password.length < 6) {
    showError("Password minimal 6 karakter.");
    return;
  }

  setLoading(true);
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    showToast("Akun berhasil dibuat!", "success");
    window.location.href = REDIRECT_TARGET;
  } catch (error) {
    console.error(error);
    showError(translateAuthError(error));
    setLoading(false);
  }
});
