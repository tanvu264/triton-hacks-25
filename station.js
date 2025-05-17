// Get station ID from URL
const params = new URLSearchParams(window.location.search);
const stationId = params.get('id');

// Load station details from localStorage
let stationData = {
  name: "Fire Station",
  address: "Unknown",
  phone: "Unknown",
  lat: "",
  lon: "",
  operational: true,
  gasLevel: 68 // fallback
};
const stored = localStorage.getItem(`stationDetails_${stationId}`);
if (stored) {
  const parsed = JSON.parse(stored);
  stationData = { ...stationData, ...parsed };
}

// Populate UI
document.getElementById('station-name').textContent = stationData.name;
document.getElementById('station-address').textContent = stationData.address;
document.getElementById('station-phone').textContent = stationData.phone;
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

// Gas bar logic
const gasBar = document.getElementById('gas-bar');
const gasLabel = document.getElementById('gas-label');
const gasSlider = document.getElementById('gas-slider');

// Load saved gas level or fallback
let savedGas = localStorage.getItem(`stationGas_${stationId}`);
let gasLevel = savedGas !== null ? parseInt(savedGas, 10) : stationData.gasLevel;
gasBar.style.width = gasLevel + "%";
gasLabel.textContent = gasLevel + "%";
gasSlider.value = gasLevel;

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
  localStorage.setItem(`stationGas_${stationId}`, this.value);
});

// Initialize bar color
updateGasBar(gasLevel);

// Water bar logic
const waterBar = document.getElementById('water-bar');
const waterLabel = document.getElementById('water-label');
const waterSlider = document.getElementById('water-slider');

// Load saved water level or fallback
let savedWater = localStorage.getItem(`stationWater_${stationId}`);
let waterLevel = savedWater !== null ? parseInt(savedWater, 10) : 68;
waterBar.style.width = waterLevel + "%";
waterLabel.textContent = waterLevel + "%";
waterSlider.value = waterLevel;

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
  localStorage.setItem(`stationWater_${stationId}`, this.value);
});

// Initialize water bar color
updateWaterBar(waterLevel);

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

// HTML Structure
/*
<li>
  <strong>Gas Level:</strong>
  <div style="margin-top:8px;">
    <div id="gas-bar-bg" class="gas-bar-bg">
      <div id="gas-bar" class="gas-bar"></div>
    </div>
    <div id="gas-label" class="gas-label">0%</div>
    <input type="range" min="0" max="100" value="0" id="gas-slider" class="gas-slider">
  </div>
</li>
<li>
  <strong>Water Level:</strong>
  <div style="margin-top:8px;">
    <div id="water-bar-bg" class="gas-bar-bg">
      <div id="water-bar" class="gas-bar"></div>
    </div>
    <div id="water-label" class="gas-label">0%</div>
    <input type="range" min="0" max="100" value="0" id="water-slider" class="gas-slider">
  </div>
</li>
*/