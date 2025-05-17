// Step 1: Initialize map (temporary center, will update to user location)
const map = L.map('map').setView([32.7157, -117.1611], 12); // San Diego

// Step 2: Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Center map on user's location
map.locate({ setView: true, maxZoom: 14 });

map.on('locationfound', function(e) {
  L.marker(e.latlng).addTo(map).bindPopup("You are here").openPopup();
});

map.on('locationerror', function(e) {
  alert("Could not get your location. Showing default area.");
});

// Custom icons
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper to get operational status from localStorage
function loadOperationalStatus() {
  const data = localStorage.getItem('stationOperational');
  return data ? JSON.parse(data) : {};
}

// Step 3: Define bounding box for your area
const bbox = "32.5,-117.3,33.0,-116.8";

// Step 4: Overpass QL query to find fire stations only
const overpassQuery = `
  [out:json][timeout:25];
  node["amenity"="fire_station"](${bbox});
  out body;
`;

// Step 5: Fetch fire station data from Overpass API
fetch("https://overpass.kumi.systems/api/interpreter", {
  method: "POST",
  body: overpassQuery
})
.then(res => res.json())
.then(data => {
  data.elements.forEach(station => {
    const lat = station.lat;
    const lon = station.lon;
    const name = station.tags?.name || "Unnamed Station";
    const stationId = station.id.toString();
    const stationUrl = `station.html?id=${stationId}`;

    // Build address from available tags
    const street = station.tags?.["addr:street"] || "";
    const housenumber = station.tags?.["addr:housenumber"] || "";
    const city = station.tags?.["addr:city"] || "";
    const postcode = station.tags?.["addr:postcode"] || "";
    let address = station.tags?.["addr:full"] || station.tags?.address || "";

    if (!address && (street || housenumber || city || postcode)) {
      address = `${housenumber} ${street}`.trim();
      if (city) address += `, ${city}`;
      if (postcode) address += `, ${postcode}`;
      address = address.trim();
    }
    if (!address) address = "Unknown";

    // Get phone (if available)
    const phone = station.tags?.phone || station.tags?.["contact:phone"] || "Unknown";

    // Store station details in localStorage
    const stationDetails = {
      name,
      address,
      phone,
      lat,
      lon
    };
    localStorage.setItem(`stationDetails_${stationId}`, JSON.stringify(stationDetails));

    // Get operational status for this station
    const operationalStatus = loadOperationalStatus();
    const isOperational = operationalStatus[stationId] !== false; // default true

    // Load saved gas level or use random fallback
    let savedGas = localStorage.getItem(`stationGas_${stationId}`);
    let gasLevel = savedGas !== null ? parseInt(savedGas, 10) : Math.floor(Math.random() * 101);

    // Determine gas bar color
    function getGasColor(level) {
      if (level < 30) return "#c62828";
      if (level < 70) return "#fbc02d";
      return "#388e3c";
    }

    // Gas bar HTML with slider
    const gasBarHtml = `
      <div style="margin-top:8px;">
        <div id="gas-bar-bg-${stationId}" style="background:#e0e0e0;border-radius:12px;height:16px;width:120px;overflow:hidden;">
          <div id="gas-bar-${stationId}" style="height:16px;width:${gasLevel}%;background:${getGasColor(gasLevel)};border-radius:12px 0 0 12px;transition:width 0.5s;"></div>
        </div>
        <div id="gas-label-${stationId}" style="margin-top:4px;font-weight:600;color:${getGasColor(gasLevel)};font-size:0.95em;">Gas: ${gasLevel}%</div>
        <input type="range" min="0" max="100" value="${gasLevel}" id="gas-slider-${stationId}" style="width:120px;margin-top:6px;">
      </div>
    `;

    // Choose marker icon based on gas level
    let iconToUse;
    if (gasLevel < 30) {
      iconToUse = redIcon; // red for low gas
    } else if (gasLevel < 70) {
      iconToUse = yellowIcon; // yellow for medium gas
    } else {
      iconToUse = greenIcon; // green for high gas
    }

    const marker = L.marker([lat, lon], { icon: iconToUse }).addTo(map);
    marker.bindPopup(
      `<b>${name}</b><br>
      <a href="${stationUrl}" id="details-link-${stationId}">View Details</a>
      ${gasBarHtml}`
    );

    marker.on("popupopen", () => {
      // Always get the latest value from localStorage
      const latestGas = localStorage.getItem(`stationGas_${stationId}`);
      const slider = document.getElementById(`gas-slider-${stationId}`);
      const bar = document.getElementById(`gas-bar-${stationId}`);
      const label = document.getElementById(`gas-label-${stationId}`);
      const detailsLink = document.getElementById(`details-link-${stationId}`);

      if (latestGas !== null) {
        slider.value = latestGas;
        bar.style.width = latestGas + "%";
        const color = getGasColor(latestGas);
        bar.style.background = color;
        label.textContent = `Gas: ${latestGas}%`;
        label.style.color = color;
      }

      slider.addEventListener("input", function() {
        const val = parseInt(this.value, 10);
        bar.style.width = val + "%";
        const color = getGasColor(val);
        bar.style.background = color;
        label.textContent = `Gas: ${val}%`;
        label.style.color = color;
        // Save to localStorage
        localStorage.setItem(`stationGas_${stationId}`, val);

        // Update marker icon color live
        if (val < 30) {
          marker.setIcon(redIcon);
        } else if (val < 70) {
          marker.setIcon(yellowIcon);
        } else {
          marker.setIcon(greenIcon);
        }
      });

      // Save gas level before navigating to details page
      detailsLink.addEventListener("click", function() {
        const val = parseInt(slider.value, 10);
        localStorage.setItem(`stationGas_${stationId}`, val);
      });
    });
  });
})
.catch(err => {
  console.error("Failed to fetch fire stations:", err);
});