"""
GeoWatch Engine for Xiaomi Smart Band 8 Active
Mengambil data Cuaca, Kualitas Udara, dan Gempa Terdekat (BMKG / USGS)
dan mengirimkan notifikasi ke smartphone / Mi Band via NTFY atau Telegram.
"""

import sys
import math
import time
import argparse
import json
import urllib.request
import urllib.error

# Set UTF-8 encoding untuk Windows console
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

DEFAULT_LAT = -2.99
DEFAULT_LON = 104.76

def haversine_distance(lat1, lon1, lat2, lon2):
    """Menghitung jarak dalam kilometer antara dua titik koordinat"""
    R = 6371.0  # Radius bumi (km)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c)

def fetch_weather_and_aqi(lat, lon):
    """Mengambil data cuaca dan kualitas udara dari Open-Meteo API (Gratis)"""
    weather_data = {
        "temp": None,
        "humidity": None,
        "wind_speed": None,
        "aqi": None,
        "pm25": None,
        "pm10": None,
        "uv": None
    }
    
    # 1. Fetch Weather
    weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
    try:
        req = urllib.request.Request(weather_url, headers={'User-Agent': 'GeoWatch/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            res_json = json.loads(response.read().decode('utf-8'))
            current = res_json.get("current", {})
            weather_data["temp"] = current.get("temperature_2m")
            weather_data["humidity"] = current.get("relative_humidity_2m")
            weather_data["wind_speed"] = current.get("wind_speed_10m")
    except Exception as e:
        print(f"[!] Gagal mengambil data cuaca: {e}")

    # 2. Fetch Air Quality
    aqi_url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&current=us_aqi,pm10,pm2_5,uv_index"
    try:
        req = urllib.request.Request(aqi_url, headers={'User-Agent': 'GeoWatch/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            res_json = json.loads(response.read().decode('utf-8'))
            current = res_json.get("current", {})
            weather_data["aqi"] = current.get("us_aqi")
            weather_data["pm25"] = current.get("pm2_5")
            weather_data["pm10"] = current.get("pm10")
            weather_data["uv"] = current.get("uv_index")
    except Exception as e:
        print(f"[!] Gagal mengambil data kualitas udara: {e}")

    return weather_data

def fetch_nearest_earthquakes(user_lat, user_lon, limit=3):
    """Mengambil gempa terdekat menggabungkan data BMKG & USGS"""
    earthquakes = []

    # 1. Fetch BMKG AutoGempa & Gempa Terkini
    bmkg_urls = [
        "https://data.bmkg.go.id/DataMKG/TEKTONIK/autogempa.json",
        "https://data.bmkg.go.id/DataMKG/TEKTONIK/gempaterkini.json"
    ]
    
    for url in bmkg_urls:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'GeoWatch/1.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                infogempa = data.get("Infogempa", {})
                gempa_list = infogempa.get("gempa", [])
                if isinstance(gempa_list, dict):
                    gempa_list = [gempa_list]
                
                for g in gempa_list:
                    coordinates = g.get("Coordinates", "").split(",")
                    if len(coordinates) == 2:
                        eq_lat = float(coordinates[0])
                        eq_lon = float(coordinates[1])
                        mag_str = g.get("Magnitude", "0").replace(" SR", "").strip()
                        mag = float(mag_str)
                        dist = haversine_distance(user_lat, user_lon, eq_lat, eq_lon)
                        earthquakes.append({
                            "magnitude": f"M {mag:.1f}",
                            "location": g.get("Wilayah", "Indonesia"),
                            "distance": dist,
                            "time": g.get("Jam", "") + " " + g.get("Tanggal", ""),
                            "source": "BMKG"
                        })
        except Exception as e:
            pass

    # 2. Fetch USGS (Global backup / regional)
    usgs_url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
    try:
        req = urllib.request.Request(usgs_url, headers={'User-Agent': 'GeoWatch/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            features = data.get("features", [])
            for feat in features:
                props = feat.get("properties", {})
                geometry = feat.get("geometry", {})
                coords = geometry.get("coordinates", [])
                if len(coords) >= 2:
                    eq_lon = float(coords[0])
                    eq_lat = float(coords[1])
                    mag = float(props.get("mag") or 0)
                    dist = haversine_distance(user_lat, user_lon, eq_lat, eq_lon)
                    place = props.get("place", "Unknown")
                    earthquakes.append({
                        "magnitude": f"M {mag:.1f}",
                        "location": place,
                        "distance": dist,
                        "time": "",
                        "source": "USGS"
                    })
    except Exception as e:
        pass

    # Hapus duplikat jarak yang sangat dekat dan urutkan berdasarkan jarak terdekat
    earthquakes.sort(key=lambda x: x["distance"])
    
    unique_eq = []
    seen_distances = set()
    for eq in earthquakes:
        is_dup = any(abs(eq["distance"] - s) < 10 for s in seen_distances)
        if not is_dup:
            seen_distances.add(eq["distance"])
            unique_eq.append(eq)
        if len(unique_eq) >= limit:
            break
            
    return unique_eq

def get_city_name(lat, lon):
    """Mendeteksi nama kota dari koordinat"""
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=id"
        req = urllib.request.Request(url, headers={'User-Agent': 'GeoWatch/1.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            city = data.get("city") or data.get("locality") or data.get("principalSubdivision") or "Lokasi Anda"
            country = data.get("countryCode", "ID")
            return f"{city}, {country}"
    except Exception:
        if abs(lat - (-2.99)) < 0.1 and abs(lon - 104.76) < 0.1: return "Palembang, ID"
        if abs(lat - (-6.20)) < 0.1 and abs(lon - 106.84) < 0.1: return "Jakarta, ID"
        return f"{lat:.2f}, {lon:.2f}"

KNOWN_VOLCANOES_ID = [
    {"name": "Merapi",        "lat": -7.54,  "lon": 110.44, "level": "Siaga (III)"},
    {"name": "Semeru",        "lat": -8.11,  "lon": 112.92, "level": "Awas (IV)"},
    {"name": "Sinabung",      "lat":  3.17,  "lon":  98.39, "level": "Siaga (III)"},
    {"name": "Lewotobi",      "lat": -8.53,  "lon": 122.77, "level": "Awas (IV)"},
    {"name": "Anak Krakatau", "lat": -6.10,  "lon": 105.42, "level": "Waspada (II)"},
    {"name": "Bromo",         "lat": -7.94,  "lon": 112.95, "level": "Waspada (II)"},
    {"name": "Agung",         "lat": -8.34,  "lon": 115.51, "level": "Waspada (II)"},
]

def fetch_volcanoes(user_lat, user_lon, limit=3):
    """Mengambil data gunung berapi aktif terdekat dari Indonesia"""
    results = []
    for v in KNOWN_VOLCANOES_ID:
        dist = haversine_distance(user_lat, user_lon, v["lat"], v["lon"])
        results.append({"name": v["name"], "level": v["level"], "distance": dist})
    results.sort(key=lambda x: x["distance"])
    return results[:limit]

def fetch_tsunami_warnings():
    """Mengambil peringatan tsunami dari BMKG TEWS"""
    warnings = []
    try:
        url = "https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json"
        req = urllib.request.Request(url, headers={'User-Agent': 'GeoWatch/1.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            gempa_list = data.get("Infogempa", {}).get("gempa", [])
            if isinstance(gempa_list, dict):
                gempa_list = [gempa_list]
            for g in gempa_list:
                potensi = g.get("Potensi", "").lower()
                if "tsunami" in potensi and "tidak berpotensi" not in potensi:
                    warnings.append({
                        "region": g.get("Wilayah", "Indonesia"),
                        "magnitude": g.get("Magnitude", "-"),
                        "detail": g.get("Potensi", ""),
                        "time": g.get("Jam", ""),
                    })
    except Exception as e:
        pass
    return warnings

def format_geowatch_message(lat, lon, weather, earthquakes, volcanoes=None, tsunamis=None, city_name=None):
    """Menyusun teks ringkas tanpa emoji agar tidak terpotong di layar Smart Band 8 Active"""
    if not city_name:
        city_name = get_city_name(lat, lon)
    if volcanoes is None:
        volcanoes = []
    if tsunamis is None:
        tsunamis = []

    current_time_str = time.strftime("%H:%M | %d %b")

    eq = earthquakes[0] if earthquakes else None
    vo = volcanoes[0] if volcanoes else None
    ts_text = f"BAHAYA! {tsunamis[0]['region']}" if tsunamis else "AMAN"

    lines = [
        f"[GEOWATCH] {current_time_str} | {city_name}",
        f"CUACA: {weather['temp']:.1f}C, Hum {weather['humidity']}%, Angin {weather['wind_speed']}km/h",
        f"AQI: {weather['aqi']} | PM2.5: {weather['pm25']} | UV: {weather['uv']}",
        f"GEMPA: {eq['magnitude']} {eq['location'][:18]} ({eq['distance']}km)" if eq else "GEMPA: Tidak ada",
        f"GUNUNG: {vo['name']} - {vo['level']} ({vo['distance']}km)" if vo else "GUNUNG: Normal",
        f"TSUNAMI: {ts_text}"
    ]

    return "\n".join(lines).strip()

def send_ntfy_notification(topic, message, title="GEOWATCH ALERT"):
    """Mengirim push notifikasi via NTFY.sh (Gratis & Langsung getar di HP & Mi Band)"""
    url = f"https://ntfy.sh/{topic}"
    try:
        data = message.encode('utf-8')
        req = urllib.request.Request(url, data=data, headers={
            'Title': title,
            'Priority': 'urgent',
            'Tags': 'earth_asia,volcano,barometer'
        })
        with urllib.request.urlopen(req) as resp:
            if resp.status == 200:
                print(f"[✓] Notifikasi sukses terkirim ke NTFY topic: {topic}")
                return True
    except Exception as e:
        print(f"[!] Gagal mengirim notifikasi NTFY: {e}")
    return False

def send_telegram_notification(token, chat_id, message):
    """Mengirim notifikasi via Telegram Bot"""
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = json.dumps({
        "chat_id": chat_id,
        "text": message
    }).encode('utf-8')
    try:
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as resp:
            if resp.status == 200:
                print(f"[✓] Notifikasi sukses terkirim ke Telegram!")
                return True
    except Exception as e:
        print(f"[!] Gagal mengirim notifikasi Telegram: {e}")
    return False

def main():
    parser = argparse.ArgumentParser(description="GeoWatch Engine for Smart Band 8 Active")
    parser.add_argument("--lat", type=float, default=-0.95, help="Latitude lokasi (Default: -0.95 Padang)")
    parser.add_argument("--lon", type=float, default=100.35, help="Longitude lokasi (Default: 100.35 Padang)")
    parser.add_argument("--ntfy", type=str, default="", help="NTFY topic name (misal: geowatch_band8)")
    parser.add_argument("--tg-token", type=str, default="", help="Telegram Bot Token")
    parser.add_argument("--tg-chat", type=str, default="", help="Telegram Chat ID")
    parser.add_argument("--loop", action="store_true", help="Jalankan berkala secara otomatis")
    parser.add_argument("--interval", type=int, default=1800, help="Interval loop dalam detik (default: 1800s / 30m)")

    args = parser.parse_args()

    print("========================================")
    print("🌍 GEOWATCH ENGINE - MI BAND 8 ACTIVE")
    print(f"📍 Koordinat: {args.lat}, {args.lon}")
    print("========================================\n")

    while True:
        print("[+] Mengambil data Cuaca & Kualitas Udara...")
        weather = fetch_weather_and_aqi(args.lat, args.lon)
        
        print("[+] Mengambil data Gempa Terdekat (BMKG & USGS)...")
        earthquakes = fetch_nearest_earthquakes(args.lat, args.lon)

        print("[+] Mengambil data Gunung Berapi Aktif...")
        volcanoes = fetch_volcanoes(args.lat, args.lon)

        print("[+] Memeriksa Peringatan Tsunami (BMKG TEWS)...")
        tsunamis = fetch_tsunami_warnings()
        
        city_name = get_city_name(args.lat, args.lon)
        formatted_msg = format_geowatch_message(args.lat, args.lon, weather, earthquakes, volcanoes, tsunamis, city_name)
        print("\n--- [ FORMAT NOTIFIKASI MI BAND ] ---")
        print(formatted_msg)
        print("---------------------------------------\n")
        
        if args.ntfy:
            send_ntfy_notification(args.ntfy, formatted_msg)
        if args.tg_token and args.tg_chat:
            send_telegram_notification(args.tg_token, args.tg_chat, formatted_msg)
            
        if not args.loop:
            break
            
        print(f"[*] Menunggu interval {args.interval} detik untuk update berikutnya...\n")
        time.sleep(args.interval)

if __name__ == "__main__":
    main()
