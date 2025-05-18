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

// Fetch fire reports from SheetDB
fetch('https://sheetdb.io/api/v1/n8h7gje9zs2se')
  .then(res => res.json())
  .then(fireReports => {
    console.log("Number of queries in SheetDB:", fireReports.length); // Log the count
    const ul = document.getElementById('incident-list');
    fireReports.forEach(async (report, idx) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>Fire Address:</strong> <span class="fire-address">Loading...</span><br>
        <strong>Strength:</strong> ${report.strength}<br>
        <strong>Coordinates:</strong> (${report.lat}, ${report.lon})<br>
        <strong>Reported At:</strong> ${report.reportedAt ? new Date(report.reportedAt).toLocaleString() : "Unknown"}
        <button class="remove-btn" style="float:right; margin-left:10px;">−</button>
      `;
      ul.appendChild(li);

      // Fetch and update address
      const address = await reverseGeocode(report.lat, report.lon);
      li.querySelector('.fire-address').textContent = address;

      // Remove button functionality (removes from DOM and SheetDB)
      li.querySelector('.remove-btn').addEventListener('click', async function() {
        // Remove from DOM immediately
        li.remove();

        // Remove from SheetDB (delete by unique fields, e.g., lat, lon, strength)
        // This will delete all rows matching these values
        fetch(`https://sheetdb.io/api/v1/n8h7gje9zs2se/lat/${report.lat}/lon/${report.lon}/strength/${report.strength}`, {
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
    });
  });