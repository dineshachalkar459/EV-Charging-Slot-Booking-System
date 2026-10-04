# ⚡ EV Charging Slot Booking System

A full-stack web app built with Flask + SQLite (backend) and Vanilla HTML/CSS/JS (frontend).

---

## Project Structure

```text
EV-Charging-Slot-Booking-System/
├── .gitignore
├── README.md
├── backend/
│   ├── app.py               ← Flask backend (REST API + DB)
│   └── ev_charging.db       ← SQLite database (auto-created)
├── frontend/
│   ├── index.html           ← Single-page frontend
│   ├── style.css            ← Dark-theme styles
│   └── app.js               ← fetch()-based JS logic
└── .gitignore
```

---

## Setup & Run

### 1. Install dependencies
```bash
pip install flask flask-cors
```

### 2. Start the server
```bash
python backend/app.py
```

### 3. Open in browser
```text
http://127.0.0.1:5000
```

The database and 6 mock EV stations are created automatically on first run.

---

## REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stations` | List all stations + availability |
| POST | `/api/bookings` | Create a new booking |
| GET | `/api/bookings` | List all confirmed bookings |
| DELETE | `/api/bookings/<id>` | Cancel a booking |

### POST /api/bookings — Request Body
```json
{
  "station_id": 1,
  "user_name": "Priya Sharma",
  "vehicle_number": "KA-01-AB-1234",
  "time_slot": "09:00 AM – 10:00 AM"
}
```

---

## Mock Data (auto-seeded)

| # | Station | Location | Ports |
|---|---------|----------|-------|
| 1 | GreenCharge Hub – Koramangala | Koramangala, Bengaluru | 6 |
| 2 | ZapPoint – Indiranagar | Indiranagar, Bengaluru | 4 |
| 3 | VoltStop – Whitefield IT Park | Whitefield, Bengaluru | 8 |
| 4 | EcoPower – MG Road | MG Road, Bengaluru | 3 |
| 5 | ChargeUp – Electronic City | Electronic City, Bengaluru | 5 |
| 6 | Spark Station – HSR Layout | HSR Layout, Bengaluru | 4 |

---

## Features

- Station Grid — Live availability with color-coded port progress bars
- Booking Form — Client-side validation + server-side duplicate detection
- Bookings Table — All active bookings with one-click cancel
- Auto-refresh — Station counts update after every booking/cancellation
- Responsive — Works on mobile and desktop
