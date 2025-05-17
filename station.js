// Get station ID from URL
const params = new URLSearchParams(window.location.search);
const stationId = params.get('id');

// Load station details from localStorage
function getRandomLevel() {
  return Math.floor(Math.random() * 101); // 0 to 100 inclusive
}

let stationData = {
  name: "Fire Station",
  address: "Unknown",
  phone: "Unknown",
  lat: "",
  lon: "",
  operational: true,
  trucks: [
    { gas: getRandomLevel(), water: getRandomLevel() },
    { gas: getRandomLevel(), water: getRandomLevel() },
    { gas: getRandomLevel(), water: getRandomLevel() }
  ]
};
const stored = localStorage.getItem(`stationDetails_${stationId}`);
if (stored) {
  const parsed = JSON.parse(stored);
  // If trucks not present in storage, add default trucks
  if (!parsed.trucks) parsed.trucks = [
    { gas: getRandomLevel(), water: getRandomLevel() },
    { gas: getRandomLevel(), water: getRandomLevel() },
    { gas: getRandomLevel(), water: getRandomLevel() }
  ];
  stationData = { ...stationData, ...parsed };
}

// Populate UI
document.getElementById('station-name').textContent = stationData.name;
document.getElementById('station-address').textContent = stationData.address;
document.getElementById('station-coords').textContent = `${stationData.lat}, ${stationData.lon}`;

// If address is unknown, try to fetch it using reverse geocoding
if (stationData.address === "Unknown" && stationData.lat && stationData.lon) {
  getAddressFromCoords(stationData.lat, stationData.lon).then(address => {
    console.log("Fetched address from API:", address); // <-- Log the address
    document.getElementById('station-address').textContent = address;
    // Optionally, update localStorage for next time
    stationData.address = address;
    localStorage.setItem(`stationDetails_${stationId}`, JSON.stringify(stationData));
  });
}
else{
  console.log("Not Available")
}

const statusSpan = document.getElementById('station-status');
if (stationData.operational) {
  statusSpan.textContent = "Operational";
  statusSpan.classList.add("operational");
} else {
  statusSpan.textContent = "Closed";
  statusSpan.classList.add("closed");
}

// Render trucks
const infoList = document.querySelector('.trucks-list');

// Remove old truck bars if any
document.querySelectorAll('.truck-section').forEach(e => e.remove());

stationData.trucks.forEach((truck, idx) => {
  const li = document.createElement('li');
  li.className = 'truck-section';
  li.innerHTML = `
    <strong>Truck ${idx + 1}:</strong>
    <div style="margin-top:8px;">
      <div>Gas Level:</div>
      <div class="bar-slider-wrap">
        <div id="gas-bar-bg-${idx}" class="gas-bar-bg">
          <div id="gas-bar-${idx}" class="gas-bar"></div>
        </div>
        <input type="range" min="0" max="100" value="${truck.gas}" id="gas-slider-${idx}" class="gas-slider">
        <div id="gas-label-${idx}" class="gas-label">${truck.gas}%</div>
      </div>
    </div>
    <div style="margin-top:8px;">
      <div>Water Level:</div>
      <div class="bar-slider-wrap">
        <div id="water-bar-bg-${idx}" class="gas-bar-bg">
          <div id="water-bar-${idx}" class="gas-bar"></div>
        </div>
        <input type="range" min="0" max="100" value="${truck.water}" id="water-slider-${idx}" class="gas-slider">
        <div id="water-label-${idx}" class="gas-label">${truck.water}%</div>
      </div>
    </div>
  `;
  infoList.appendChild(li);

  // Gas logic
  const gasBar = document.getElementById(`gas-bar-${idx}`);
  const gasLabel = document.getElementById(`gas-label-${idx}`);
  const gasSlider = document.getElementById(`gas-slider-${idx}`);

  function updateGasBar(val) {
    gasBar.style.width = val + "%";
    let color = "#388e3c";
    if (val < 30) color = "#c62828";
    else if (val < 70) color = "#fbc02d";
    gasBar.style.background = color;
    gasLabel.textContent = val + "%";
    gasLabel.style.color = color;
  }
  gasSlider.addEventListener("input", function() {
    updateGasBar(this.value);
    stationData.trucks[idx].gas = parseInt(this.value, 10);
    localStorage.setItem(`stationDetails_${stationId}`, JSON.stringify(stationData));
  });
  updateGasBar(truck.gas);

  // Water logic
  const waterBar = document.getElementById(`water-bar-${idx}`);
  const waterLabel = document.getElementById(`water-label-${idx}`);
  const waterSlider = document.getElementById(`water-slider-${idx}`);

  function updateWaterBar(val) {
    waterBar.style.width = val + "%";
    let color = "#388e3c";
    if (val < 30) color = "#c62828";
    else if (val < 70) color = "#fbc02d";
    waterBar.style.background = color;
    waterLabel.textContent = val + "%";
    waterLabel.style.color = color;
  }
  waterSlider.addEventListener("input", function() {
    updateWaterBar(this.value);
    stationData.trucks[idx].water = parseInt(this.value, 10);
    localStorage.setItem(`stationDetails_${stationId}`, JSON.stringify(stationData));
  });
  updateWaterBar(truck.water);
});

async function getAddressFromCoords(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' }
    });
    const data = await res.json();
    if (data.display_name) {
      return data.display_name;
    }
  } catch (e) {
    console.error("Reverse geocoding error:", e);
  }
  return "Unknown";
}