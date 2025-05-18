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
}// Load fire reports from localStorage
const fireReports = JSON.parse(localStorage.getItem('reportedFires')) || [];
const ul = document.getElementById('incident-list');fireReports.forEach(async report => {
  const li = document.createElement('li');
  li.innerHTML = `
    <strong>Fire Address:</strong> <span class="fire-address">Loading...</span><br>
    <strong>Strength:</strong> ${report.strength}<br>
    <strong>Coordinates:</strong> (${report.lat}, ${report.lon})<br>
    <strong>Reported At:</strong> ${report.reportedAt ? new Date(report.reportedAt).toLocaleString() : "Unknown"}
  `;
  ul.appendChild(li);  // Fetch and update address
  const address = await reverseGeocode(report.lat, report.lon);
  li.querySelector('.fire-address').textContent = address;
});