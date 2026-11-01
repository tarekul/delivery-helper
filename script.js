const input = document.getElementById("cameraInput");
const s = document.getElementById("status");

let orders = JSON.parse(localStorage.getItem("delivery_orders")) || [];

function saveState() {
  localStorage.setItem("delivery_orders", JSON.stringify(orders));
}

document.getElementById("addManualBtn").addEventListener("click", () => {
  const phone = document.getElementById("manualPhone").value.trim();
  const address = document.getElementById("manualAddress").value.trim();
  const total = document.getElementById("manualTotal").value.trim(); // U

  const isCash =
    document.querySelector('input[name="manualPayment"]:checked').value ===
    "Cash";
  const isPriority = document.getElementById("manualPriority").checked;

  if (!phone && !address) return alert("Enter at least one detail.");

  orders.push({
    phone,
    address,
    total,
    isCash,
    isPriority,
    isEditing: false,
  });
  saveState();

  // Reset inputs
  document.getElementById("manualPhone").value = "";
  document.getElementById("manualAddress").value = "";
  document.getElementById("manualCash").checked = false;
  document.getElementById("manualPriority").checked = false;

  s.textContent = "Manual order added to queue.";
});

input.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  e.target.value = "";

  s.textContent = "Compressing Image...";

  const img = new Image();
  img.src = URL.createObjectURL(file);

  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const MAX_WIDTH = 800;
    const scale = MAX_WIDTH / img.width;
    canvas.width = MAX_WIDTH;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    processWithCloudOCR(canvas.toDataURL("image/jpeg", 0.7));
  };
});

async function processWithCloudOCR(base64Image) {
  s.textContent = "Analyzing Receipt...";
  const formData = new FormData();
  formData.append("base64Image", base64Image);
  formData.append("language", "eng");
  formData.append("OCREngine", "2");

  try {
    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: "helloworld" },
      body: formData,
    });
    const data = await response.json();
    if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage);

    const rawText = data.ParsedResults[0].ParsedText;
    console.log(rawText);

    // 2. Phone Extraction
    const phoneMatch = rawText.match(
      /[（(]?\d{3}[)）]?[\s.-]?\d{3}[\s.-]?\d{4}/,
    );
    const phone = phoneMatch
      ? phoneMatch[0].replace(/（/g, "(").replace(/）/g, ")")
      : "Phone not found";

    // 3. Address Extraction
    const addressMatch = rawText.match(
      /Address\s*:?[\s\S]*?(?=\d)([\s\S]*?\b[A-Za-z]{2}\s*\d{5}\b)/i,
    );
    const address = addressMatch
      ? addressMatch[1]
          .replace(/\bFLR?\.?\s*\d*\b/gi, "")
          .replace(/\s+/g, " ")
          .trim()
      : "Address not found";

    // 4. Total Extraction (Smart Cent-Matching)
    let total = "";

    // Extracts the cents from the written receipt text (e.g. "41" from "and 41/100 cents")
    const centsMatch = rawText.match(/(\d{2})\/100 cents/i);
    const allPrices = rawText.match(/\d+\.\d{2}/g);

    if (centsMatch && allPrices) {
      const cents = centsMatch[1];
      // Finds all prices ending in those cents, and safely grabs the last one (the true total)
      const matchingPrices = allPrices.filter((p) => p.endsWith(`.${cents}`));
      if (matchingPrices.length > 0) {
        total = matchingPrices[matchingPrices.length - 1];
      }
    }

    // Fallback if cents text isn't found
    if (!total) {
      const fallbackMatch = rawText.match(
        /\bTotal\s*:\s*[\s\S]*?(\d+\.\d{2})/i,
      );
      total = fallbackMatch ? fallbackMatch[1] : "";
    }

    document.getElementById("reviewPhone").value = phone;
    document.getElementById("reviewAddress").value = address;
    document.getElementById("reviewTotal").value = total;

    document
      .querySelectorAll('input[name="reviewPayment"]')
      .forEach((n) => (n.checked = false));
    document.getElementById("reviewPriority").checked = false;
    document.getElementById("reviewModal").classList.remove("hidden");
    s.textContent = "Review scanned details.";
  } catch (error) {
    s.textContent = "API Error. Check console.";
  }
}

document.getElementById("confirmReviewBtn").addEventListener("click", () => {
  const phone = document.getElementById("reviewPhone").value.trim();
  const address = document.getElementById("reviewAddress").value.trim();
  const total = document.getElementById("reviewTotal").value.trim();

  const isCash = document.getElementById("reviewCash").checked;
  const isPriority = document.getElementById("reviewPriority").checked;

  orders.push({
    phone,
    address,
    total,
    isCash,
    isPriority,
    isEditing: false,
  });
  saveState();

  document.getElementById("reviewModal").classList.add("hidden");
  showToast();
  document.getElementById("status").textContent = "Order added to queue.";
});

document.getElementById("cancelReviewBtn").addEventListener("click", () => {
  document.getElementById("reviewModal").classList.add("hidden");
  document.getElementById("status").textContent = "Scan cancelled.";
});

function toggleManualEntry() {
  const wrapper = document.getElementById("manual-form-wrapper");
  const chevron = document.getElementById("manual-chevron");

  wrapper.classList.toggle("open");
  chevron.classList.toggle("rotate-180");
}

function showToast() {
  const toast = document.getElementById("toastNotification");
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

const themeToggle = document.getElementById("themeToggle");
const currentTheme = localStorage.getItem("theme") || "light";

// Apply saved theme on load
if (currentTheme === "dark") {
  document.body.setAttribute("data-theme", "dark");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  const isDark = document.body.getAttribute("data-theme") === "dark";

  if (isDark) {
    document.body.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    themeToggle.textContent = "🌙";
  } else {
    document.body.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    themeToggle.textContent = "☀️";
  }
});
