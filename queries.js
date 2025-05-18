// Helper: Reverse geocode lat/lon to address using Nominatim
async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    return data.display_name || `${lat}, ${lon}`;
  } catch (e) {
    return `${lat}, ${lon}`;
  }
}

// Helper: Find closest fire station using Overpass API
async function findClosestFireStation(lat, lon) {
  // Search for fire stations within 10km radius
  const query = `
    [out:json];
    (
      node["amenity"="fire_station"](around:10000,${lat},${lon});
    );
    out center;
  `;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    });
    const data = await res.json();
    if (data.elements && data.elements.length > 0) {
      // Find the closest by distance
      let minDist = Infinity, closest = null;
      data.elements.forEach(el => {
        const elLat = el.lat || (el.center && el.center.lat);
        const elLon = el.lon || (el.center && el.center.lon);
        if (elLat && elLon) {
          const dist = Math.sqrt(Math.pow(lat - elLat, 2) + Math.pow(lon - elLon, 2));
          if (dist < minDist) {
            minDist = dist;
            closest = el;
          }
        }
      });
      if (closest) {
        const name = closest.tags && closest.tags.name ? closest.tags.name : "Unnamed Fire Station";
        const elLat = closest.lat || (closest.center && closest.center.lat);
        const elLon = closest.lon || (closest.center && closest.center.lon);
        return `${name} (${elLat.toFixed(5)}, ${elLon.toFixed(5)})`;
      }
    }
  } catch (e) {}
  return "No fire station found nearby";
}

// Helper: Calculate distance in miles between two lat/lon points using Haversine formula
function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 3958.8; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Get all fire stations sorted by distance
async function getAllFireStations(lat, lon) {
  const query = `
    [out:json];
    (
      node["amenity"="fire_station"](around:10000,${lat},${lon});
    );
    out center;
  `;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    });
    const data = await res.json();
    if (data.elements && data.elements.length > 0) {
      // Use Leaflet's distance formula for more accurate distance
      return data.elements
        .map(el => {
          const elLat = el.lat || (el.center && el.center.lat);
          const elLon = el.lon || (el.center && el.center.lon);
          let dist = Infinity;
          if (typeof L !== "undefined" && elLat && elLon) {
            dist = L.latLng(lat, lon).distanceTo(L.latLng(elLat, elLon)) * 0.000621371; // meters to miles
          } else if (elLat && elLon) {
            dist = haversineMiles(lat, lon, elLat, elLon);
          }
          return {
            name: (el.tags && el.tags.name) ? el.tags.name : "Unnamed Fire Station",
            lat: elLat,
            lon: elLon,
            dist
          };
        })
        .filter(st => st.lat && st.lon)
        .sort((a, b) => a.dist - b.dist);
    }
  } catch (e) {}
  return [];
}

// Create or get the dropdown panel
function getOrCreateDropdownPanel() {
  let panel = document.getElementById('firestation-dropdown-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'firestation-dropdown-panel';
    panel.style.position = 'fixed';
    panel.style.top = '0';
    panel.style.right = '0';
    panel.style.width = '50vw';
    panel.style.height = '100vh';
    panel.style.background = '#232634';
    panel.style.color = '#fff';
    panel.style.overflowY = 'auto';
    panel.style.boxShadow = '-2px 0 16px rgba(0,0,0,0.25)';
    panel.style.zIndex = '9999';
    panel.style.display = 'block';
    panel.style.padding = '32px 24px 24px 24px';
    panel.style.transform = 'translateX(100%)';
    panel.style.transition = 'transform 0.4s cubic-bezier(.4,0,.2,1)';
    panel.innerHTML = `<button id="close-firestation-panel" style="position:absolute;top:16px;right:16px;font-size:1.5em;background:none;border:none;color:#fff;cursor:pointer;">×</button>
      <h2>Nearby Fire Stations</h2>
      <div id="firestation-list"></div>`;
    document.body.appendChild(panel);

    // Add transition for main content to be pushed
    let mainContent = document.getElementById('main-content');
    if (!mainContent) {
      // Try to wrap the main content if not already wrapped
      const ul = document.getElementById('incident-list');
      if (ul && !ul.parentElement.id) {
        const wrapper = document.createElement('div');
        wrapper.id = 'main-content';
        ul.parentNode.insertBefore(wrapper, ul);
        wrapper.appendChild(ul);
        mainContent = wrapper;
      }
    }
    panel.querySelector('#close-firestation-panel').onclick = () => {
      panel.style.transform = 'translateX(100%)';
      setTimeout(() => { panel.style.display = 'none'; }, 400);
      if (mainContent) {
        mainContent.style.transition = 'margin-right 0.4s cubic-bezier(.4,0,.2,1)';
        mainContent.style.marginRight = '0';
      }
      const header = document.querySelector('header, .navbar');
      if (header) {
        header.style.transition = 'margin-right 0.4s cubic-bezier(.4,0,.2,1)';
        header.style.marginRight = '0';
      }
    };
  }
  return panel;
}

// Fetch fire reports from Google Apps Script Web App
fetch('https://sheetdb.io/api/v1/5d1lphwnzpuau')
  .then(res => res.json())
  .then(fireReports => {
    console.log("Number of queries in SheetDB:", fireReports.length); // Log the count
    const ul = document.getElementById('incident-list');
    fireReports.forEach(async (report, idx) => {
      const li = document.createElement('li');
      li.style.position = 'relative'; // Needed for absolute positioning of the button

      li.innerHTML = `
        <strong>Fire Address:</strong> <span class="fire-address">Loading...</span><br>
        <strong>Strength:</strong> ${report.strength}<br>
        <strong>Coordinates:</strong> (${report.lat}, ${report.lon})<br>
        <strong>Reported At:</strong> ${report.reportedAt ? new Date(report.reportedAt).toLocaleString() : "Unknown"}<br>
        <strong>Closest Fire Station:</strong> <span class="fire-station">Loading...</span>
      `;

      // Create the remove button and absolutely position it in the top right
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.textContent = '−';
      removeBtn.style.position = 'absolute';
      removeBtn.style.top = '8px';
      removeBtn.style.right = '16px';
      removeBtn.style.background = '#FF5252';
      removeBtn.style.border = 'none';
      removeBtn.style.color = 'none';
      removeBtn.style.fontSize = '1.5em';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.padding = '0.2em 0.5em';
      removeBtn.style.lineHeight = '1';
      removeBtn.style.zIndex = '10';

      li.appendChild(removeBtn);
      ul.appendChild(li);

      // Fetch and update address
      const address = await reverseGeocode(report.lat, report.lon);
      li.querySelector('.fire-address').textContent = address;

      // Fetch and update closest fire station
      const station = await findClosestFireStation(Number(report.lat), Number(report.lon));
      li.querySelector('.fire-station').textContent = station;

      // Remove button functionality (removes from DOM and SheetDB)
      removeBtn.addEventListener('click', async function() {
        // Remove from DOM immediately
        li.remove();

        // Log the timestamp being deleted
        console.log('Deleting report with timestamp:', report.Time);

        // Remove from SheetDB using the unique timestamp
        fetch(`https://sheetdb.io/api/v1/n8h7gje9zs2se/Time/${report.Time}`, {
          method: 'DELETE'
        })
        .then(res => res.json())
        .then(data => {
          console.log('Deleted from SheetDB:', data);
        })
        .catch(err => {
          console.error('Failed to delete from SheetDB:', err);
        });
      });

      // Show dropdown with all fire stations on click
      li.addEventListener('click', async function(e) {
        // Prevent click if remove button was clicked
        if (e.target.classList.contains('remove-btn')) return;

        // Highlight the selected query
        document.querySelectorAll('#incident-list li').forEach(item => {
          item.style.background = '';
          item.style.boxShadow = '';
        });
        li.style.background = '#2d3147';
        li.style.boxShadow = '0 0 0 2px #ff9800';

        const panel = getOrCreateDropdownPanel();
        panel.style.display = 'block';
        // Animate in
        setTimeout(() => { panel.style.transform = 'translateX(0)'; }, 10);

        // Push main content
        let mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.style.transition = 'margin-right 0.4s cubic-bezier(.4,0,.2,1)';
          mainContent.style.marginRight = '50vw';
        }
        // Move the header (if you have a <header> or .navbar)
        const header = document.querySelector('header, .navbar');
        if (header) {
          header.style.transition = 'margin-right 0.4s cubic-bezier(.4,0,.2,1)';
          header.style.marginRight = '50vw';
        }

        panel.querySelector('h2').textContent = `Nearby Fire Stations for (${report.lat}, ${report.lon})`;
        const listDiv = panel.querySelector('#firestation-list');
        listDiv.innerHTML = '<div style="margin-bottom:1em;">Loading fire stations...</div>';
        const stations = await getAllFireStations(Number(report.lat), Number(report.lon));
        if (stations.length === 0) {
          listDiv.innerHTML = '<div>No fire stations found nearby.</div>';
        } else {
          listDiv.innerHTML = '';
          // Show only the first five stations
          for (let i = 0; i < Math.min(5, stations.length); i++) {
            const st = stations[i];
            const stDiv = document.createElement('div');
            stDiv.style.background = '#31344b';
            stDiv.style.marginBottom = '16px';
            stDiv.style.padding = '16px';
            stDiv.style.borderRadius = '8px';
            stDiv.style.transition = 'box-shadow 0.2s';
            stDiv.style.cursor = 'pointer';
            stDiv.style.position = 'relative';

            // Add "CLOSEST STATION" badge for the first (closest) station
            const badge = (i === 0)
              ? `<span style="background:#ff9800; color:#232634; font-weight:bold; padding:4px 10px; border-radius:6px; margin-left:10px;">CLOSEST STATION</span>`
              : '';

            stDiv.innerHTML = `
              <strong>${i + 1}. ${st.name}</strong>
              ${badge}<br>
              <span class="station-address">Loading address...</span><br>
              <span>Distance: ${st.dist.toFixed(2)} miles</span>
            `;

            // Create the red dispatch button
            const dispatchBtn = document.createElement('button');
            dispatchBtn.textContent = 'Dispatch';
            dispatchBtn.style.position = 'absolute';
            dispatchBtn.style.top = '8px';
            dispatchBtn.style.right = '8px';
            dispatchBtn.style.background = '#FF5252';
            dispatchBtn.style.color = '#fff';
            dispatchBtn.style.border = 'none';
            dispatchBtn.style.borderRadius = '6px';
            dispatchBtn.style.fontWeight = 'bold';
            dispatchBtn.style.fontSize = '1em';
            dispatchBtn.style.padding = '0.3em 1em';
            dispatchBtn.style.cursor = 'pointer';
            dispatchBtn.style.zIndex = '10';

            // Dispatch click handler: deletes the fire report from SheetDB
            dispatchBtn.addEventListener('click', function(e) {
              e.stopPropagation();
              // Remove the fire report from the DOM
              li.remove();
              panel.style.transform = 'translateX(100%)';
              setTimeout(() => { panel.style.display = 'none'; }, 400);

              // Remove from SheetDB using the unique timestamp from the fire report
              fetch(`https://sheetdb.io/api/v1/n8h7gje9zs2se/Time/${report.Time}`, {
                method: 'DELETE'
              })
              .then(res => res.json())
              .then(data => {
                console.log('Dispatched and deleted from SheetDB:', data);
              })
              .catch(err => {
                console.error('Failed to delete from SheetDB:', err);
              });
              alert(`Dispatching ${st.name}`);
            });

            stDiv.appendChild(dispatchBtn);

            // Highlight outline on hover
            stDiv.addEventListener('mouseenter', function() {
              stDiv.style.boxShadow = '0 0 0 2px #ff9800';
            });
            stDiv.addEventListener('mouseleave', function() {
              stDiv.style.boxShadow = '';
            });

            listDiv.appendChild(stDiv);

            // Use cached address if available
            let address = null;
            if (window.stationDetailsById && window.stationDetailsById[st.stationId?.toString()]) {
              address = window.stationDetailsById[st.stationId.toString()].address;
            }
            if (address && address !== "Unknown") {
              stDiv.querySelector('.station-address').textContent = address;
            } else if (st.lat && st.lon) {
              reverseGeocode(st.lat, st.lon).then(addr => {
                stDiv.querySelector('.station-address').textContent = addr;
              }).catch(() => {
                stDiv.querySelector('.station-address').textContent = `${st.lat.toFixed(5)}, ${st.lon.toFixed(5)}`;
              });
            } else {
              stDiv.querySelector('.station-address').textContent = 'Unknown location';
            }
          }
        }
      });
    });
  });