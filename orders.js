const orderList = document.getElementById("orderList");
let orders = JSON.parse(localStorage.getItem("delivery_orders")) || [];

function renderOrders() {
  orderList.innerHTML = "";

  if (orders.length === 0) {
    orderList.innerHTML = `
      <div class="empty-state">
        <img src="empty-bag.png" alt="Empty Bag" />
        <h2>Queue Empty</h2>
        <p class="empty-subtitle">You have no active deliveries.</p>
      </div>
    `;
    return;
  }

  orders.forEach((order, index) => {
    const li = document.createElement("li");

    if (order.isEditing) {
      // --- EDIT MODE (UNCHANGED) ---
      li.innerHTML = `
        <strong style="font-size: 18px; color: var(--pj-red); display: block; margin-bottom: 12px;">Edit Stop ${index + 1}</strong>
        
        <div class="input-group">
          <span class="input-icon">👤</span>
          <input type="text" id="editName${index}" value="${order.name || ""}" placeholder="Customer Name">
        </div>
        <div class="input-group">
          <span class="input-icon">📞</span>
          <input type="tel" id="editPhone${index}" value="${order.phone || ""}" placeholder="Phone Number">
        </div>
        <div class="input-group">
          <span class="input-icon">📍</span>
          <input type="text" id="editAddress${index}" value="${order.address || ""}" placeholder="Full Address">
        </div>
        <div class="input-group">
          <span class="input-icon">💲</span>
          <input type="number" step="0.01" id="editTotal${index}" value="${order.total || ""}" placeholder="Total Price">
        </div>
        
        <div class="payment-type-group" style="margin-bottom: 12px;">
            <input type="radio" id="editCash${index}" name="editPayment${index}" value="Cash" class="hidden-radio" ${order.isCash ? "checked" : ""}>
            <label for="editCash${index}" class="toggle-btn">💵 Cash</label>

            <input type="radio" id="editCredit${index}" name="editPayment${index}" value="Credit" class="hidden-radio" ${!order.isCash ? "checked" : ""}>
            <label for="editCredit${index}" class="toggle-btn">💳 Credit</label>
        </div>
        <div class="priority-toggle" style="margin-bottom: 12px;">
          <input type="checkbox" id="editPriority${index}" ${order.isPriority ? "checked" : ""}>
          <label for="editPriority${index}">⚠️ Running Late (Prioritize)</label>
        </div>

        <div class="order-actions">
          <button class="btn-green" onclick="saveEdit(${index})">Save</button>
          <button class="btn-dark" onclick="cancelEdit(${index})">Cancel</button>
        </div>
      `;
    } else {
      // --- COMPACT DISPLAY MODE ---

      // Dynamic styling for Cash vs Credit
      if (order.isCash) {
        li.style.border = "2px solid #10b981";
        li.style.backgroundColor = "rgba(16, 185, 129, 0.6)";
      } else {
        li.style.border = "1px solid rgba(255, 255, 255, 0.6)";
        li.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
      }

      // Add base compact classes
      li.className = `card compact-order ${order.isPriority ? "priority-border" : ""}`;

      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <strong style="font-size: 16px; color: var(--pj-red);">
            Stop ${index + 1} ${order.isPriority ? '<span style="font-size:14px; margin-left:4px;">⚠️</span>' : ""}
          </strong>
          <div style="display: flex; gap: 8px;">
            <button class="btn-icon" style="padding: 4px;" onclick="moveOrder(${index}, -1)" ${index === 0 ? "disabled" : ""}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </button>
            <button class="btn-icon" style="padding: 4px;" onclick="moveOrder(${index}, 1)" ${index === orders.length - 1 ? "disabled" : ""}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
            </button>
          </div>
        </div>
        
        <div class="order-main">
          <span class="order-address">📍 ${order.address || "N/A"}</span>
        </div>

        <div class="order-grid">
          <span class="grid-item">👤 ${order.name || "N/A"}</span>
          <a href="tel:${order.phone ? order.phone.replace(/\D/g, "") : ""}" class="grid-item phone-link" style="text-decoration: none;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📞 ${order.phone || "N/A"}</span>
            ${order.phone ? `<span class="call-pill" style="font-size: 10px; padding: 2px 6px; flex-shrink: 0;">CALL</span>` : ""}
          </a>
          <span class="grid-item">💲 ${order.total || "0.00"}</span>
          <span class="grid-item" style="font-weight: bold; color: ${order.isCash ? "#10b981" : "#38bdf8"};">
            ${order.isCash ? "💵 Cash" : "💳 Credit"}
          </span>
        </div>

        <div class="order-actions-grid">
          <button class="btn-compact" style="background-color: #4285F4; color: white;" onclick="window.location.href='https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}'">
            📍 Maps
          </button>
          <button class="btn-compact" style="background-color: #0ea5e9; color: white;" onclick="window.location.href='https://waze.com/ul?q=${encodeURIComponent(order.address)}&navigate=yes'">
            🚙 Waze
          </button>
          <button class="btn-compact" style="background-color: #4b5563; color: white;" onclick="toggleEdit(${index})">
            Edit
          </button>
          <button class="btn-compact" style="background-color: #16a34a; color: white;" onclick="removeOrder(${index})">
            Complete
          </button>
        </div>
      `;
    }
    orderList.appendChild(li);
  });
}

window.moveOrder = (index, direction) => {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < orders.length) {
    const temp = orders[index];
    orders[index] = orders[newIndex];
    orders[newIndex] = temp;
    saveState(); // Saves the new order and re-renders
  }
};

window.removeOrder = (index) => {
  orders.splice(index, 1);
  saveState();

  if (orders.length > 0) {
    const nextStop = orders[0];
    const modal = document.getElementById("navModal");

    // Inject the next address into the modal
    document.getElementById("navAddress").textContent = nextStop.address;

    // Route to Google Maps
    document.getElementById("navGoogleBtn").onclick = () => {
      window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextStop.address)}`;
      closeNavModal();
    };

    // Route to Waze
    document.getElementById("navWazeBtn").onclick = () => {
      window.location.href = `https://waze.com/ul?q=${encodeURIComponent(nextStop.address)}&navigate=yes`;
      closeNavModal();
    };

    // Display the modal
    modal.classList.remove("hidden");
  }
};

window.closeNavModal = () => {
  document.getElementById("navModal").classList.add("hidden");
};

window.toggleEdit = (index) => {
  orders[index].isEditing = true;
  renderOrders();
};

window.cancelEdit = (index) => {
  orders[index].isEditing = false;
  renderOrders();
};

window.saveEdit = (index) => {
  orders[index].name = document.getElementById(`editName${index}`).value.trim();
  orders[index].phone = document
    .getElementById(`editPhone${index}`)
    .value.trim();
  orders[index].address = document
    .getElementById(`editAddress${index}`)
    .value.trim();
  orders[index].total = document
    .getElementById(`editTotal${index}`)
    .value.trim();

  orders[index].isCash = document.getElementById(`editCash${index}`).checked;
  orders[index].isPriority = document.getElementById(
    `editPriority${index}`,
  ).checked;

  orders[index].isEditing = false;
  saveState();
};

function saveState() {
  localStorage.setItem("delivery_orders", JSON.stringify(orders));
  renderOrders();
}

renderOrders();

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
