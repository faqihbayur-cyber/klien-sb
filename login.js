// login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ---------- Firebase init ---------- */

const firebaseConfig = {
  apiKey: "AIzaSyBE5g9DrxN-ZAumkFQDSW2KknhYyuUXKUA",
  authDomain: "klien-5c5cb.firebaseapp.com",
  projectId: "klien-5c5cb",
  storageBucket: "klien-5c5cb.firebasestorage.app",
  messagingSenderId: "1047587810737",
  appId: "1:1047587810737:web:a40f87b3b293b6747c6190",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const REDIRECT_TARGET = "index.html";

/* ---------- Element refs ---------- */

const errorBox = document.getElementById("form-error");
const googleBtn = document.getElementById("google-btn");
const phoneBtn = document.getElementById("phone-btn");
const toast = document.getElementById("toast");
/* ---------- Helpers ---------- */

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}
function clearError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

let toastTimer;
function showToast(message, type = "") {
  toast.textContent = message;
  toast.className = "toast" + (type ? " " + type : "");
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function translateAuthError(error) {
  switch (error && error.code) {
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email atau password salah. Coba lagi ya.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.";
    case "auth/user-disabled":
      return "Akun ini telah dinonaktifkan. Hubungi admin untuk bantuan.";
    case "auth/network-request-failed":
      return "Koneksi bermasalah. Periksa jaringan internet kamu.";
    case "auth/popup-closed-by-user":
      return "Proses masuk dibatalkan.";
    default:
      return "Terjadi kesalahan. Silakan coba lagi.";
  }
}

/* ---------- Login Google ---------- */

googleBtn.addEventListener("click", async () => {
  clearError();
  try {
    const provider = new GoogleAuthProvider();
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, provider);
    showToast("Berhasil masuk dengan Google!", "success");
    window.location.href = REDIRECT_TARGET;
  } catch (error) {
    console.error(error);
    showError(translateAuthError(error));
  }
});

/* ---------- Facebook & Phone (belum dikonfigurasi) ---------- */

/* ---------- Login nomor HP (OTP) ---------- */

const phoneModal = document.getElementById("phone-modal");
const phoneModalClose = document.getElementById("phone-modal-close");
const stepNumber = document.getElementById("phone-step-number");
const stepOtp = document.getElementById("phone-step-otp");
const phoneNumberInput = document.getElementById("phone-number");
const phoneErrorBox = document.getElementById("phone-error");
const sendOtpBtn = document.getElementById("send-otp-btn");
const sendOtpLabel = document.getElementById("send-otp-label");
const otpCodeInput = document.getElementById("otp-code");
const otpErrorBox = document.getElementById("otp-error");
const verifyOtpBtn = document.getElementById("verify-otp-btn");
const verifyOtpLabel = document.getElementById("verify-otp-label");
const phoneDisplay = document.getElementById("phone-display");
const backToPhoneBtn = document.getElementById("back-to-phone");

let recaptchaVerifier = null;
let confirmationResult = null;

function normalizePhoneNumber(raw) {
  const digits = raw.trim().replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  if (digits.startsWith("62")) return "+" + digits;
  return "+62" + digits;
}

function resetPhoneModal() {
  stepNumber.hidden = false;
  stepOtp.hidden = true;
  phoneNumberInput.value = "";
  otpCodeInput.value = "";
  phoneErrorBox.hidden = true;
  otpErrorBox.hidden = true;
  sendOtpBtn.disabled = false;
  sendOtpLabel.textContent = "Kirim Kode OTP";
  verifyOtpBtn.disabled = false;
  verifyOtpLabel.textContent = "Verifikasi";
}

function translatePhoneError(error) {
  switch (error && error.code) {
    case "auth/invalid-phone-number":
      return "Format nomor HP tidak valid. Cek lagi ya.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Coba lagi nanti.";
    case "auth/quota-exceeded":
      return "Kuota SMS harian sudah habis. Coba lagi besok.";
    case "auth/invalid-verification-code":
      return "Kode OTP salah. Cek lagi ya.";
    case "auth/code-expired":
      return "Kode OTP sudah kedaluwarsa. Kirim ulang.";
    default:
      return "Terjadi kesalahan. Silakan coba lagi.";
  }
}

phoneBtn.addEventListener("click", () => {
  resetPhoneModal();
  phoneModal.hidden = false;
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
  }
});

phoneModalClose.addEventListener("click", () => {
  phoneModal.hidden = true;
});

sendOtpBtn.addEventListener("click", async () => {
  phoneErrorBox.hidden = true;
  const rawPhone = phoneNumberInput.value.trim();
  if (!rawPhone) {
    phoneErrorBox.textContent = "Isi nomor HP dulu ya.";
    phoneErrorBox.hidden = false;
    return;
  }
  const phone = normalizePhoneNumber(rawPhone);

  sendOtpBtn.disabled = true;
  sendOtpLabel.textContent = "Mengirim...";
  try {
    confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    phoneDisplay.textContent = phone;
    stepNumber.hidden = true;
    stepOtp.hidden = false;
  } catch (error) {
    console.error(error);
    phoneErrorBox.textContent = translatePhoneError(error);
    phoneErrorBox.hidden = false;
  } finally {
    sendOtpBtn.disabled = false;
    sendOtpLabel.textContent = "Kirim Kode OTP";
  }
});

verifyOtpBtn.addEventListener("click", async () => {
  otpErrorBox.hidden = true;
  const code = otpCodeInput.value.trim();
  if (!code || !confirmationResult) {
    otpErrorBox.textContent = "Isi kode OTP dulu ya.";
    otpErrorBox.hidden = false;
    return;
  }

  verifyOtpBtn.disabled = true;
  verifyOtpLabel.textContent = "Memverifikasi...";
  try {
    await confirmationResult.confirm(code);
    showToast("Berhasil masuk!", "success");
    window.location.href = REDIRECT_TARGET;
  } catch (error) {
    console.error(error);
    otpErrorBox.textContent = translatePhoneError(error);
    otpErrorBox.hidden = false;
    verifyOtpBtn.disabled = false;
    verifyOtpLabel.textContent = "Verifikasi";
  }
});

backToPhoneBtn.addEventListener("click", () => {
  resetPhoneModal();
});

/* ---------- Kalau sudah login, langsung lempar ke index ---------- */

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = REDIRECT_TARGET;
  }
});
