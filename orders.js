const orderList = document.getElementById("orderList");
let orders = JSON.parse(localStorage.getItem("delivery_orders")) || [];

let deliveryMap = null;
let mapMarkers = [];

let isMapView = false;

function applyViewVisibility() {
  const mapContainer = document.getElementById("map-container");
  const orderList = document.getElementById("orderList");
  const toggleBtn = document.getElementById("viewToggleBtn");

  if (orders.length === 0) {
    mapContainer.style.display = "none";
    orderList.style.display = "block";
    if (toggleBtn) toggleBtn.style.display = "none";
    return;
  }

  if (toggleBtn) toggleBtn.style.display = "block";

  if (isMapView) {
    mapContainer.style.display = "flex";
    mapContainer.style.flexDirection = "column";
    orderList.style.display = "none";
    if (toggleBtn) toggleBtn.innerHTML = "Show List";
  } else {
    mapContainer.style.display = "none";
    orderList.style.display = "grid";
    if (toggleBtn) toggleBtn.innerHTML = "Show Map";
  }
}

window.toggleView = () => {
  isMapView = !isMapView;
  applyViewVisibility();

  if (isMapView) {
    setTimeout(() => {
      if (deliveryMap) {
        deliveryMap.invalidateSize();
        if (mapMarkers.length > 0) {
          const group = new L.featureGroup(mapMarkers);
          deliveryMap.fitBounds(group.getBounds(), {
            padding: [30, 30],
            maxZoom: 15,
          });
        }
      }
    }, 200);
  }
};

async function updateFreeMap() {
  const mapContainer = document.getElementById("map-container");
  const toggleBtn = document.getElementById("viewToggleBtn");

  if (orders.length === 0) {
    mapContainer.style.display = "none";
    if (toggleBtn) toggleBtn.style.display = "none";
    return;
  }

  if (!deliveryMap) {
    deliveryMap = L.map("map").setView([40.682, -73.845], 14);

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 16,
        updateWhenIdle: true,
        keepBuffer: 2,
      },
    ).addTo(deliveryMap);
  }

  // Clear old pins
  mapMarkers.forEach((marker) => deliveryMap.removeLayer(marker));
  mapMarkers = [];

  // 1. Plot the Papa Johns Store
  try {
    const storeResponse = await fetch(
      "https://geosearch.planninglabs.nyc/v2/search?text=94-31%20Rockaway%20Blvd,%20Queens",
    );
    const storeData = await storeResponse.json();

    if (storeData && storeData.features && storeData.features.length > 0) {
      const storeLon = storeData.features[0].geometry.coordinates[0];
      const storeLat = storeData.features[0].geometry.coordinates[1];

      const storeIcon = L.divIcon({
        html: `<div style="background-color: #df1a22; border: 2px solid white; border-radius: 50%; width: 36px; height: 36px; display: flex; justify-content: center; align-items: center; font-size: 20px; box-shadow: 0px 3px 6px rgba(0,0,0,0.5);">🍕</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const storeMarker = L.marker([storeLat, storeLon], { icon: storeIcon })
        .addTo(deliveryMap)
        .bindPopup(`<b>🏪 Papa Johns</b><br>94-31 Rockaway Blvd`);

      mapMarkers.push(storeMarker);
    }
  } catch (error) {
    console.error("Store geocoding failed");
  }

  // 2. Geocode and plot each active order
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];

    // Wipe old coordinates in case the driver edited the address
    delete order.lat;
    delete order.lon;

    if (!order.address) continue;

    try {
      const response = await fetch(
        `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(order.address)}`,
      );
      const data = await response.json();

      if (data && data.features && data.features.length > 0) {
        const lon = data.features[0].geometry.coordinates[0];
        const lat = data.features[0].geometry.coordinates[1];

        order.lon = lon;
        order.lat = lat;

        const marker = L.marker([lat, lon])
          .addTo(deliveryMap)
          .bindPopup(`<b>Stop ${i + 1}</b><br>${order.address}`);

        mapMarkers.push(marker);
      }
    } catch (error) {
      console.error("Geocoding failed for:", order.address);
    }
  }

  // 3. Validation: Did every order successfully geocode?
  const allMapped = orders.every((o) => o.lat && o.lon);

  if (allMapped) {
    if (toggleBtn) toggleBtn.style.display = "block";

    mapContainer.style.display = isMapView ? "flex" : "none";
    if (isMapView) mapContainer.style.flexDirection = "column";

    if (mapMarkers.length > 0) {
      const group = new L.featureGroup(mapMarkers);
      deliveryMap.fitBounds(group.getBounds(), {
        padding: [30, 30],
        maxZoom: 15,
      });
    }
  } else {
    isMapView = false;
    mapContainer.style.display = "none";
    document.getElementById("orderList").style.display = "grid";

    if (toggleBtn) toggleBtn.style.display = "none";
  }

  setTimeout(() => {
    if (deliveryMap && isMapView) deliveryMap.invalidateSize();
  }, 400);
}

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
    updateFreeMap();
    return;
  }

  orders.forEach((order, index) => {
    const li = document.createElement("li");

    if (order.isEditing) {
      li.innerHTML = `
        <strong style="font-size: 18px; color: var(--pj-red); display: block; margin-bottom: 12px;">Edit Stop ${index + 1}</strong>
        
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
      if (order.isCash) {
        li.style.borderLeft = "8px solid #10b981";
      } else {
        li.style.border = "1px solid rgba(255, 255, 255, 0.6)";
        li.style.backgroundColor = "rgba(71, 88, 108, 0.5)";
      }

      li.className = `card compact-order ${order.isPriority ? "priority-border" : ""}`;

      li.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 16px; color: var(--pj-red);">
              Stop ${index + 1}
            </strong>
            <span style="font-size: 14px; font-weight: bold; padding: 2px 8px; border-radius: 12px; background-color: ${order.isCash ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)"}; color: ${order.isCash ? "#10b981" : "#0ea5e9"}; border: 1px solid ${order.isCash ? "#10b981" : "#38bdf8"};">
              ${order.isCash ? "💵 Cash" : "💳 Credit"}
            </span>
            ${order.isPriority ? '<span style="font-size:14px;" title="Running Late">⚠️</span>' : ""}
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn-icon" style="padding: 4px; color: #6b7280;" onclick="toggleEdit(${index})" title="Edit Order">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <div style="display: flex; gap: 4px; border-left: 1px solid rgba(0,0,0,0.15); padding-left: 8px;">
              <button class="btn-icon" style="padding: 4px;" onclick="moveOrder(${index}, -1)" ${index === 0 ? "disabled" : ""}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
              </button>
              <button class="btn-icon" style="padding: 4px;" onclick="moveOrder(${index}, 1)" ${index === orders.length - 1 ? "disabled" : ""}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
              </button>
            </div>
          </div>
        </div>
        
        <div class="order-main" style="margin-bottom: 12px;">
          <span class="order-address" style="display: block; font-size: 15px;">📍 ${order.address || "N/A"}</span>
        </div>

        <div class="order-grid" style="align-items: stretch; margin-bottom: 16px;">
          ${
            order.phone
              ? `<a href="tel:${order.phone.replace(/\D/g, "")}" class="grid-item phone-link" style="text-decoration: none; justify-content: center; font-weight: bold; color: var(--pj-dark); display: flex; align-items: center; gap: 6px; min-height: 36px; font-size: 14px;">
                 📞 ${order.phone}
               </a>`
              : `<span class="grid-item phone-link" style="justify-content: center; color: #9ca3af; pointer-events: none; display: flex; align-items: center; gap: 6px; min-height: 36px; font-size: 14px;">
                 📞 No Number
               </span>`
          }
          <div class="grid-item" style="font-size: 16px; font-weight: bold; text-align: center; color: var(--pj-dark); background-color: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; min-height: 36px;">
            💲 ${order.total || "0.00"}
          </div>
        </div>

        <div class="order-actions-grid">
          <button class="btn-compact" style="background-color: #4285F4; color: white;" onclick="window.location.href='https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}'">
            📍 Maps
          </button>
          <button class="btn-compact" style="background-color: #0ea5e9; color: white;" onclick="window.location.href='https://waze.com/ul?q=${encodeURIComponent(order.address)}&navigate=yes'">
            🚙 Waze
          </button>
          <button class="btn-compact" style="background-color: ${order.isCash ? "#10b981" : "var(--pj-red)"}; color: white; grid-column: 1 / -1; padding: 14px; font-size: 16px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; box-shadow: 0 4px 6px ${order.isCash ? "rgba(16, 185, 129, 0.3)" : "rgba(223, 26, 34, 0.25)"}; transition: opacity 0.2s ease;" onclick="removeOrder(${index})">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            ${order.isCash ? `Collect Cash & Complete` : `Complete Delivery`}
          </button>
        </div>
      `;
    }
    orderList.appendChild(li);
  });
  updateFreeMap();
  applyViewVisibility();
}

window.moveOrder = (index, direction) => {
  const newIndex = index + direction;
  if (newIndex >= 0 && newIndex < orders.length) {
    const temp = orders[index];
    orders[index] = orders[newIndex];
    orders[newIndex] = temp;
    saveState();
  }
};

window.removeOrder = (index) => {
  orders.splice(index, 1);
  saveState();

  if (orders.length > 0) {
    const nextStop = orders[0];
    const modal = document.getElementById("navModal");

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
