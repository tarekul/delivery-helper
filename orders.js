const orderList = document.getElementById("orderList");
let orders = JSON.parse(localStorage.getItem("delivery_orders")) || [];

function renderOrders() {
  orderList.innerHTML = "";

  if (orders.length === 0) {
    orderList.innerHTML = "<p>No active deliveries.</p>";
    return;
  }

  orders.forEach((order, index) => {
    const li = document.createElement("li");

    if (order.isEditing) {
      li.innerHTML = `
        <strong>Edit Order ${index + 1}</strong>
        <input type="text" id="editName${index}" class="edit-input" value="${order.name || ""}">
        <input type="tel" id="editPhone${index}" class="edit-input" value="${order.phone || ""}">
        <input type="text" id="editAddress${index}" class="edit-input" value="${order.address || ""}">
        <div class="order-actions">
          <button class="btn-green" onclick="saveEdit(${index})">Save</button>
          <button class="btn-dark" onclick="cancelEdit(${index})">Cancel</button>
        </div>
      `;
    } else {
      li.innerHTML = `
        <strong>Order ${index + 1}</strong><br><br>
        <strong>Name:</strong> ${order.name}<br><br>
        <strong>Phone:</strong> ${order.phone}<br><br>
        <strong>Address:</strong> ${order.address}<br><br>
        
        <button class="btn-call" style="margin-bottom: 16px;" onclick="window.location.href='tel:${order.phone.replace(/\D/g, "")}'">
          📞 Call
        </button>
        
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <button class="btn-google" onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}', '_blank')">
            📍 Google Maps
          </button>
          <button class="btn-waze" onclick="window.open('https://waze.com/ul?q=${encodeURIComponent(order.address)}&navigate=yes', '_blank')">
            🚙 Waze
          </button>
        </div>

        <div class="order-actions">
          <button class="btn-green" onclick="toggleEdit(${index})">Edit</button>
          <button onclick="removeOrder(${index})">Complete</button>
        </div>
      `;
    }
    orderList.appendChild(li);
  });
}

window.removeOrder = (index) => {
  orders.splice(index, 1);
  saveState();
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
  orders[index].isEditing = false;
  saveState();
};

function saveState() {
  localStorage.setItem("delivery_orders", JSON.stringify(orders));
  renderOrders();
}

renderOrders();
