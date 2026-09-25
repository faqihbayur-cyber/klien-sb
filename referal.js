// referal.js
// Halaman ini murni landing page statis (tanpa Firebase) — cuma nampilin
// kode referral dari URL (?ref=KODE) dan ngarahin orang buat download APK.
// Klaim kode referral yang sebenarnya terjadi di dalam app (claimReferral).

// GANTI ini ke link download APK yang sebenarnya (Firebase Hosting/Storage, dsb).
const APK_DOWNLOAD_URL = "PASANG_LINK_APK_DI_SINI.apk";

function getReferralCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("ref");
  return code ? code.trim().toUpperCase() : "";
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

function init() {
  const code = getReferralCodeFromUrl();

  const heroTitle = document.getElementById("heroTitle");
  const heroSubtitle = document.getElementById("heroSubtitle");
  const codeBox = document.getElementById("codeBox");
  const noCodeBox = document.getElementById("noCodeBox");
  const codeValue = document.getElementById("codeValue");
  const copyBtn = document.getElementById("copyBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  downloadBtn.href = APK_DOWNLOAD_URL;

  if (code) {
    codeValue.textContent = code;
    codeBox.hidden = false;
    heroTitle.textContent = "Kamu Diajak Gabung SuruhBeli!";
    heroSubtitle.textContent = "Pakai kode referral di bawah ini pas daftar, dapat voucher ongkir Rp5.000.";

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code);
        showToast("Kode disalin!");
      } catch (err) {
        // Fallback buat browser yang gak support Clipboard API
        const temp = document.createElement("input");
        temp.value = code;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
        showToast("Kode disalin!");
      }
    });
  } else {
    noCodeBox.hidden = false;
    heroTitle.textContent = "Yuk Gabung SuruhBeli!";
    heroSubtitle.textContent = "Jasa titip beli & antar yang cepat, aman, dan tanpa ribet.";
  }
}

init();
