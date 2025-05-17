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