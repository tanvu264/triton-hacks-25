// Step 1: Initialize map (temporary center, will update to user location)
const map = L.map('map').setView([32.7157, -117.1611], 12); // San Diego

// Step 2: Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Center map on user's location
map.locate({ setView: true, maxZoom: 14 });

let userLatLng = null;
let stationMarkers = [];
let stationsLoaded = false;

// Helper to find and highlight the closest station
function highlightClosestStation() {
  if (!userLatLng || stationMarkers.length === 0) return;
  let minDist = Infinity;
  let closest = null;
  stationMarkers.forEach(st => {
    const dist = map.distance(userLatLng, L.latLng(st.lat, st.lon));
    if (dist < minDist) {
      minDist = dist;
      closest = st;
    }
  });
  if (closest) {
    closest.marker.openPopup(); // Just open the popup, don't re-bind
    closest.marker.bindPopup(`Closest fire station: ${Math.round(minDist*0.000621371*10)/10} mi`);
    // Optionally, pan to it:
    // map.panTo([closest.lat, closest.lon]);
  }
}

function findFiveClosestStations(lat, lon) {
  const closestStations = [];
  stationMarkers.forEach(st => {
    const dist = map.distance([lat, lon], L.latLng(st.lat, st.lon));
    closestStations.push(dist);
  });
  return closestStations.sort((a, b) => a - b).slice(0, 5); //ascending order
}

function PlotFires() {
  const reports = JSON.parse(localStorage.getItem('reportedFires'));
  
  reports.forEach((report) => {
    const lat = report['lat'];
    const lon = report['lon'];
    L.marker([lat, lon], { icon: fireIcon }).addTo(map);
    console.log(findFiveClosestStations(lat, lon));
  });
}


// Listen for locationfound event to get user coordinates
map.on('locationfound', function(e) {
  userLatLng = e.latlng;
  L.marker(userLatLng).addTo(map).bindPopup("You are here").openPopup();
  highlightClosestStation();
  findNearbyHydrants(userLatLng.lat, userLatLng.lng, 500); // <-- add this
});

// Helper: Geocode address to lat/lon using Nominatim
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    alert("Failed to geocode address.");
  }
  return null;
}

// Listen for locationerror event
map.on('locationerror', async function(e) {
  let address = prompt("Could not get your location. Please enter your address or city:");
  if (address) {
    const coords = await geocodeAddress(address);
    if (coords) {
      userLatLng = coords;
      map.setView([coords.lat, coords.lng], 13);
      L.marker(coords).addTo(map).bindPopup("Your entered location").openPopup();
      highlightClosestStation();
      findNearbyHydrants(coords.lat, coords.lng, 2000); // <-- add this
    } else {
      alert("Sorry, could not find that address.");
    }
  } else {
    alert("Location is required to find the closest fire station.");
  }
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

const fireIcon = L.divIcon({
  className: 'fire-div-icon',
  html: '🔥',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const fireStationIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/11210/11210082.png', // Example fire station icon
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  shadowUrl: 'https://unpkg.com/leaflet/dist/images/marker-shadow.png',
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
  stationMarkers = [];
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
    let iconToUse = fireStationIcon;

    const marker = L.marker([lat, lon], { icon: iconToUse }).addTo(map);
    stationMarkers.push({ marker, lat, lon, stationId, name });
    marker.bindPopup(
      `<b>${name}</b><br>
      <a href="${stationUrl}" id="details-link-${stationId}">View Details</a>
      ${gasBarHtml}`
    );

    marker.on("click", function() {
      window.location.href = stationUrl;
    });

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
      });

      // Save gas level before navigating to details page
      detailsLink.addEventListener("click", function() {
        const val = parseInt(slider.value, 10);
        localStorage.setItem(`stationGas_${stationId}`, val);
      });
    });
  });
  stationsLoaded = true;
  highlightClosestStation();
  PlotFires()
})
.catch(err => {
  console.error("Failed to fetch fire stations:", err);
});

// Fetch fire reports from SheetDB
fetch('https://sheetdb.io/api/v1/n8h7gje9zs2se')
  .then(res => res.json())
  .then(data => {
    // Map each row to only lat, lon, and strength (convert to numbers if needed)
    const reports = data.map(row => ({
      lat: Number(row.lat),
      lon: Number(row.lon),
      strength: Number(row.strength)
    }));
    // Save to localStorage
    localStorage.setItem('reportedFires', JSON.stringify(reports));
    // Optionally, re-plot fires if needed:
    PlotFires();
  })
  .catch(err => {
    console.error("Failed to fetch fire reports from SheetDB:", err);
  });

// Call this function after you set userLatLng (from geolocation or manual input)
async function findNearbyHydrants(lat, lon, radiusMeters = 500) {
  // Overpass QL: find fire hydrants within radius
  const query = `
    [out:json][timeout:25];
    node
      ["emergency"="fire_hydrant"]
      (around:${radiusMeters},${lat},${lon});
    out body;
  `;
  try {
    const res = await fetch("https://overpass.kumi.systems/api/interpreter", {
      method: "POST",
      body: query
    });
    const data = await res.json();
    if (data.elements && data.elements.length > 0) {
      // Use a pink marker icon for hydrants
      const pinkIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-pink.png",
        shadowUrl: "https://unpkg.com/leaflet/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      data.elements.forEach(hydrant => {
        L.marker([hydrant.lat, hydrant.lon], {
          icon: pinkIcon
        }).addTo(map).bindPopup("Fire Hydrant");
      });
      alert(`Found ${data.elements.length} fire hydrant(s) nearby!`);
    } else {
      alert("No fire hydrants found nearby.");
    }
  } catch (e) {
    alert("Failed to search for fire hydrants.");
  }
}