/* ─────────────────────────────────────────────────────────────────────────────
   EV Charging Slot Booking – app.js
   Handles: station rendering, booking form, bookings table, cancel action
───────────────────────────────────────────────────────────────────────────── */

const API = "";   // same origin – Flask serves both frontend and API

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Show a toast message inside the form card. */
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 4500);
}

/** Mark an input/select as invalid and add a shake. */
function markError(el) {
  el.classList.add("error");
  el.addEventListener("input", () => el.classList.remove("error"), { once: true });
}

// ── Stations ──────────────────────────────────────────────────────────────────

let stationsCache = [];   // keep a copy for the booking <select>

async function loadStations() {
  const grid = document.getElementById("station-grid");

  // Show skeletons while loading
  grid.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>`;

  try {
    const res   = await fetch(`${API}/api/stations`);
    const data  = await res.json();
    stationsCache = data;

    if (!data.length) {
      grid.innerHTML = `<p class="no-data">No stations found.</p>`;
      return;
    }

    grid.innerHTML = data.map(renderStationCard).join("");
    populateStationSelect(data);
  } catch (err) {
    grid.innerHTML = `<p class="no-data">⚠ Could not load stations. Is the server running?</p>`;
    console.error(err);
  }
}

function renderStationCard(s) {
  const pct      = s.total_ports > 0 ? (s.available_ports / s.total_ports) * 100 : 0;
  const barClass = pct > 60 ? "high" : pct > 25 ? "med" : "low";
  const isFull   = s.available_ports === 0;

  return `
    <div class="station-card ${isFull ? "full" : ""}">
      <div class="card-name">${escHtml(s.name)}</div>
      <div class="card-location">${escHtml(s.location)}</div>

      <div class="port-bar-wrap">
        <div class="port-bar ${barClass}" style="width:${pct}%"></div>
      </div>
      <div class="port-label">
        ${s.available_ports} / ${s.total_ports} ports available
      </div>

      <span class="badge ${isFull ? "full" : "available"}">
        ${isFull ? "🔴 Full" : "🟢 Available"}
      </span>
    </div>`;
}

/** Populate the booking form's station <select>. */
function populateStationSelect(stations) {
  const sel = document.getElementById("station_select");
  const cur = sel.value;   // preserve selection across refreshes

  sel.innerHTML = `<option value="">— Choose a station —</option>`;
  stations.forEach(s => {
    const opt      = document.createElement("option");
    opt.value      = s.id;
    opt.textContent = `${s.name}  (${s.available_ports} ports free)`;
    if (s.available_ports === 0) {
      opt.textContent += " — FULL";
      opt.disabled = true;
    }
    sel.appendChild(opt);
  });

  if (cur) sel.value = cur;
}

// ── Booking Form ──────────────────────────────────────────────────────────────

document.getElementById("booking-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const userName      = document.getElementById("user_name");
  const vehicleNumber = document.getElementById("vehicle_number");
  const stationSel    = document.getElementById("station_select");
  const timeSlot      = document.getElementById("time_slot");

  // Client-side validation
  let valid = true;
  [userName, vehicleNumber, stationSel, timeSlot].forEach(el => {
    if (!el.value.trim()) { markError(el); valid = false; }
  });
  if (!valid) { showToast("Please fill in all fields.", "error"); return; }

  // Disable button while submitting
  const btn     = e.target.querySelector(".btn-submit");
  const btnText = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".btn-spinner");
  btn.disabled = true;
  btnText.classList.add("hidden");
  spinner.classList.remove("hidden");

  try {
    const res  = await fetch(`${API}/api/bookings`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        station_id:     stationSel.value,
        user_name:      userName.value.trim(),
        vehicle_number: vehicleNumber.value.trim(),
        time_slot:      timeSlot.value,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showToast(
        `✅ Booking #${data.booking_id} confirmed! Station: ${data.station} | Slot: ${data.time_slot}`,
        "success"
      );
      e.target.reset();
      // Refresh stations to reflect new port count
      await loadStations();
      await loadBookings();
    } else {
      showToast(`❌ ${data.error}`, "error");
    }
  } catch (err) {
    showToast("⚠ Network error. Please try again.", "error");
    console.error(err);
  } finally {
    btn.disabled = false;
    btnText.classList.remove("hidden");
    spinner.classList.add("hidden");
  }
});

// ── Bookings Table ────────────────────────────────────────────────────────────

async function loadBookings() {
  const container = document.getElementById("bookings-container");

  try {
    const res  = await fetch(`${API}/api/bookings`);
    const data = await res.json();

    if (!data.length) {
      container.innerHTML = `<p class="no-data">📭 No active bookings yet.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="bookings-table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Vehicle</th>
              <th>Station</th>
              <th>Location</th>
              <th>Time Slot</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(renderBookingRow).join("")}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = `<p class="no-data">⚠ Could not load bookings.</p>`;
    console.error(err);
  }
}

function renderBookingRow(b) {
  return `
    <tr id="row-${b.id}">
      <td><strong>#${b.id}</strong></td>
      <td>${escHtml(b.user_name)}</td>
      <td><code>${escHtml(b.vehicle_number)}</code></td>
      <td>${escHtml(b.station_name)}</td>
      <td>${escHtml(b.location)}</td>
      <td>${escHtml(b.time_slot)}</td>
      <td><span class="badge available">✅ ${escHtml(b.status)}</span></td>
      <td>
        <button class="cancel-btn" onclick="cancelBooking(${b.id})">✕ Cancel</button>
      </td>
    </tr>`;
}

async function cancelBooking(bookingId) {
  if (!confirm(`Cancel booking #${bookingId}?`)) return;

  try {
    const res  = await fetch(`${API}/api/bookings/${bookingId}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      // Remove row with a fade
      const row = document.getElementById(`row-${bookingId}`);
      if (row) {
        row.style.opacity = "0";
        row.style.transition = "opacity 0.4s";
        setTimeout(() => {
          loadBookings();
          loadStations();
        }, 400);
      }
      showToast(`✅ Booking #${bookingId} cancelled.`, "success");
    } else {
      showToast(`❌ ${data.error}`, "error");
    }
  } catch (err) {
    showToast("⚠ Network error.", "error");
  }
}

// ── Safety helper: prevent XSS ────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(function init() {
  loadStations();
  loadBookings();
})();
