const orderList = document.getElementById("orderList");
let orders = JSON.parse(localStorage.getItem("delivery_orders")) || [];

function renderOrders() {
  orderList.innerHTML = "";

  if (orders.length === 0) {
    orderList.innerHTML = `
      <div class="empty-state">
        <img src="empty-bag.jpeg" alt="Empty Bag" />
        <h2>Queue Empty</h2>
        <p>You have no active deliveries.</p>
      </div>
    `;
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
        <input type="number" step="0.01" id="editTotal${index}" class="edit-input" value="${order.total || ""}">
        
        <div class="payment-toggle">
          <input type="radio" id="editCash${index}" name="editPayment${index}" value="Cash" ${order.paymentType === "Cash" ? "checked" : ""}>
          <label for="editCash${index}">💵 Cash</label>
          <input type="radio" id="editCredit${index}" name="editPayment${index}" value="Credit" ${order.paymentType === "Credit" ? "checked" : ""}>
          <label for="editCredit${index}">💳 Credit</label>
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
      // Create visual badges for the selected options
      let badgesHTML =
        '<div style="margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap;">';
      if (order.isPriority) {
        badgesHTML +=
          '<span style="background: #fbbf24; color: #000; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">⚠️ Priority</span>';
      }
      if (order.paymentType === "Cash") {
        badgesHTML +=
          '<span style="background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">💵 Cash</span>';
      } else if (order.paymentType === "Credit") {
        badgesHTML +=
          '<span style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">💳 Credit</span>';
      }
      badgesHTML += "</div>";

      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <strong style="font-size: 18px;">Order ${index + 1}</strong>
        </div>
        
        ${badgesHTML}

        <div class="dynamic-text">
          <strong>Name:</strong> ${order.name}
        </div>
        <div class="dynamic-text">
          <strong>Phone:</strong> ${order.phone}
        </div>
        <div class="dynamic-text" style="margin-bottom: 20px;">
          <strong>Address:</strong> ${order.address}
        </div>
        <div class="dynamic-text" style="margin-bottom: 20px;">
          <strong>Total:</strong> $${order.total || "0.00"}
        </div>
        
        <button class="btn-call" style="margin-bottom: 16px;" onclick="window.location.href='tel:${order.phone.replace(/\D/g, "")}'">
          📞 Call
        </button>
        
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <button class="btn-google" onclick="window.location.href='https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}'">
            📍 Google Maps
          </button>
          <button class="btn-waze" onclick="window.location.href='https://waze.com/ul?q=${encodeURIComponent(order.address)}&navigate=yes'">
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
  orders[index].total = document
    .getElementById(`editTotal${index}`)
    .value.trim();

  const paymentNode = document.querySelector(
    `input[name="editPayment${index}"]:checked`,
  );
  orders[index].paymentType = paymentNode ? paymentNode.value : null;
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
