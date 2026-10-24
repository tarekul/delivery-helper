const input = document.getElementById("cameraInput");
const s = document.getElementById("status");

let orders = JSON.parse(localStorage.getItem("delivery_orders")) || [];

function saveState() {
  localStorage.setItem("delivery_orders", JSON.stringify(orders));
}

document.getElementById("addManualBtn").addEventListener("click", () => {
  const name = document.getElementById("manualName").value.trim();
  const phone = document.getElementById("manualPhone").value.trim();
  const address = document.getElementById("manualAddress").value.trim();

  if (!name && !phone && !address) return alert("Enter at least one detail.");

  orders.push({ name, phone, address, isEditing: false });
  saveState();

  document.getElementById("manualName").value = "";
  document.getElementById("manualPhone").value = "";
  document.getElementById("manualAddress").value = "";
  s.textContent = "Manual order added to queue.";
});

input.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

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

    // 1. Name Extraction (Added broken vertical fallback for missing colons)
    const brokenVerticalMatch = rawText.match(
      /Customer[\s\S]*?[（(]?\d{3}[)）]?[\s.-]?\d{3}[\s.-]?\d{4}[\s\S]*?:\s*([a-zA-Z '-]+)/i,
    );
    const verticalMatch = rawText.match(
      /Customer[\s\S]*?:\s*[()\d\-\s]+[\r\n]+\s*:\s*([a-zA-Z '-]+)/i,
    );
    const stackedMatch = rawText.match(
      /Name\s*:[\s\S]*?Address\s*:[\r\n]+([a-zA-Z '-]+)/i,
    );
    const horizontalMatch = rawText.match(
      /(?:Customer|Name)\s*:\s*([a-zA-Z '-]+)/i,
    );

    let name = "Name not found";
    if (brokenVerticalMatch) name = brokenVerticalMatch[1].trim();
    else if (verticalMatch) name = verticalMatch[1].trim();
    else if (stackedMatch) name = stackedMatch[1].trim();
    else if (
      horizontalMatch &&
      !horizontalMatch[1].toLowerCase().includes("address")
    )
      name = horizontalMatch[1].trim();

    // 2. Phone Extraction (Supports full-width unicode parentheses and normalizes them)
    const phoneMatch = rawText.match(
      /[（(]?\d{3}[)）]?[\s.-]?\d{3}[\s.-]?\d{4}/,
    );
    const phone = phoneMatch
      ? phoneMatch[0].replace(/（/g, "(").replace(/）/g, ")")
      : "Phone not found";

    // 3. Address Extraction (Forces the capture to continue until it finds a State + Zip boundary like "NY 11420")
    const addressMatch = rawText.match(
      /Address\s*:?[\s\S]*?(?=\d)([\s\S]*?\b[A-Za-z]{2}\s*\d{5}\b)/i,
    );
    const address = addressMatch
      ? addressMatch[1]
          .replace(/\bFL\.?\s*\d*\b/gi, "")
          .replace(/\s+/g, " ")
          .trim()
      : "Address not found";

    orders.push({ name, phone, address, isEditing: false });
    saveState();
    s.textContent = "Order added to queue.";
  } catch (error) {
    s.textContent = "API Error. Check console.";
  }
}
