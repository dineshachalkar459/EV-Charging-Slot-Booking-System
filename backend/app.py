"""
EV Charging Slot Booking System - Flask Backend
Run: python app.py
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os

# ── App Setup ───────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
DB_PATH = os.path.join(BASE_DIR, "ev_charging.db")
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="/static")
CORS(app)


# ── DB Helpers ──────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Create tables and seed mock data (runs once)."""
    with get_db() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS station (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                name            TEXT    NOT NULL,
                location        TEXT    NOT NULL,
                total_ports     INTEGER NOT NULL DEFAULT 4,
                available_ports INTEGER NOT NULL DEFAULT 4
            );

            CREATE TABLE IF NOT EXISTS booking (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                station_id     INTEGER NOT NULL REFERENCES station(id),
                user_name      TEXT    NOT NULL,
                vehicle_number TEXT    NOT NULL,
                time_slot      TEXT    NOT NULL,
                status         TEXT    NOT NULL DEFAULT 'confirmed',
                created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        """)

        count = db.execute("SELECT COUNT(*) FROM station").fetchone()[0]
        if count == 0:
            stations = [
                ("GreenCharge Hub – Koramangala",  "Koramangala, Bengaluru",     6, 6),
                ("ZapPoint – Indiranagar",          "Indiranagar, Bengaluru",     4, 4),
                ("VoltStop – Whitefield IT Park",   "Whitefield, Bengaluru",      8, 8),
                ("EcoPower – MG Road",              "MG Road, Bengaluru",         3, 3),
                ("ChargeUp – Electronic City",      "Electronic City, Bengaluru", 5, 5),
                ("Spark Station – HSR Layout",      "HSR Layout, Bengaluru",      4, 4),
            ]
            db.executemany(
                "INSERT INTO station (name, location, total_ports, available_ports) VALUES (?,?,?,?)",
                stations
            )
        db.commit()


# ── Serve Frontend ─────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


# ── REST API ───────────────────────────────────────────────────────────

# GET /api/stations
@app.route("/api/stations", methods=["GET"])
def get_stations():
    with get_db() as db:
        rows = db.execute("SELECT * FROM station ORDER BY id").fetchall()
    return jsonify([dict(r) for r in rows])


# POST /api/bookings
@app.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json(force=True)

    required = ["station_id", "user_name", "vehicle_number", "time_slot"]
    missing = [f for f in required if not data.get(f, "").strip()]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    station_id = int(data["station_id"])
    user_name = data["user_name"].strip()
    vehicle_number = data["vehicle_number"].strip().upper()
    time_slot = data["time_slot"].strip()

    with get_db() as db:
        station = db.execute("SELECT * FROM station WHERE id = ?", (station_id,)).fetchone()

        if not station:
            return jsonify({"error": "Station not found"}), 404
        if station["available_ports"] <= 0:
            return jsonify({"error": "No ports available at this station"}), 409

        existing = db.execute(
            """SELECT id FROM booking
               WHERE station_id=? AND vehicle_number=? AND time_slot=? AND status='confirmed'""",
            (station_id, vehicle_number, time_slot)
        ).fetchone()
        if existing:
            return jsonify({"error": "This vehicle already has a booking for that slot"}), 409

        db.execute(
            """INSERT INTO booking (station_id, user_name, vehicle_number, time_slot)
               VALUES (?, ?, ?, ?)""",
            (station_id, user_name, vehicle_number, time_slot)
        )
        db.execute(
            "UPDATE station SET available_ports = available_ports - 1 WHERE id = ?",
            (station_id,)
        )
        booking_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.commit()

    return jsonify({
        "message": "Booking confirmed!",
        "booking_id": booking_id,
        "station": station["name"],
        "user": user_name,
        "vehicle": vehicle_number,
        "time_slot": time_slot,
        "status": "confirmed"
    }), 201


# GET /api/bookings
@app.route("/api/bookings", methods=["GET"])
def get_bookings():
    with get_db() as db:
        rows = db.execute("""
            SELECT b.id, b.user_name, b.vehicle_number, b.time_slot, b.status,
                   b.created_at, s.name AS station_name, s.location
            FROM booking b
            JOIN station s ON s.id = b.station_id
            WHERE b.status = 'confirmed'
            ORDER BY b.created_at DESC
        """).fetchall()
    return jsonify([dict(r) for r in rows])


# DELETE /api/bookings/<id>
@app.route("/api/bookings/<int:booking_id>", methods=["DELETE"])
def cancel_booking(booking_id):
    with get_db() as db:
        booking = db.execute(
            "SELECT * FROM booking WHERE id = ? AND status = 'confirmed'", (booking_id,)
        ).fetchone()
        if not booking:
            return jsonify({"error": "Booking not found or already cancelled"}), 404

        db.execute(
            "UPDATE booking SET status = 'cancelled' WHERE id = ?", (booking_id,)
        )
        db.execute(
            "UPDATE station SET available_ports = MIN(available_ports+1, total_ports) WHERE id = ?",
            (booking["station_id"],)
        )
        db.commit()

    return jsonify({"message": "Booking cancelled successfully"})


# ── Entry Point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print("\n  [*] EV Charging Slot Booking System")
    print("  -------------------------------------")
    print("  Server : http://127.0.0.1:5000")
    print("  Press  : Ctrl+C to stop\n")
    app.run(debug=True, port=5000)

