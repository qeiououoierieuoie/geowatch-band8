# 🌍 GEOWATCH untuk Xiaomi Smart Band 8 Active

Panduan lengkap untuk menampilkan **Cuaca, Kualitas Udara (AQI/PM2.5/PM10/UV)**, dan **Gempa Terdekat (BMKG/USGS)** di **Xiaomi Smart Band 8 Active (1.47" TFT 172x320 px)**.

---

## 📱 Ringkasan Solusi

Karena Xiaomi Smart Band 8 Active berbasis RTOS (tidak mendukung instalasi JS Mini-App mandiri seperti Band 7/Pro), sistem ini dirancang dengan dua cara terpadu:

1. **Metode 1: Custom Photo Watch Face (Wallpaper 172x320 px)**
   - Buat dan unduh gambar wallpaper beresolusi pas **172 x 320 px** langsung dari Web Simulator.
   - Pasang sebagai latar belakang kustom di aplikasi **Mi Fitness**.

2. **Metode 2: Push Alert Realtime Bergetar ke Smart Band (Otomatis)**
   - Menggunakan script Python (`geowatch_engine.py`) atau Web Simulator untuk mem-push notifikasi berformat GEOWATCH ke aplikasi **NTFY** / **Telegram**.
   - Mi Fitness akan meneruskan notifikasi tersebut ke Smart Band 8 Active, sehingga gelang Anda langsung bergetar dan memunculkan teks informasi gempa & cuaca terbaru.

---

## 🚀 Cara Menjalankan

### A. Menjalankan Web Simulator & Watchface Designer
1. Buka file `index.html` di browser Anda (Google Chrome / Edge / Firefox).
2. Anda akan melihat simulator Smart Band 8 Active dengan data realtime dari lokasi Anda.
3. Klik tombol **"🖼️ Download Watchface Wallpaper (172x320)"** untuk menyimpan gambarnya.
4. Di aplikasi **Mi Fitness** di HP:
   - Masuk ke tab **Device** &rarr; **Watch faces**.
   - Pilih kategori **Custom** / **Photo**.
   - Upload gambar PNG yang baru saja diunduh.

---

### B. Menjalankan Script Engine Notifikasi Realtime (Python)

Jalankan script `geowatch_engine.py` dengan Python:

```bash
# 1. Test ambil data satu kali sesuai koordinat Anda
python geowatch_engine.py --lat -2.99 --lon 104.76

# 2. Kirim notifikasi otomatis ke smartphone via NTFY (Gratis tanpa login)
python geowatch_engine.py --lat -2.99 --lon 104.76 --ntfy geowatch_band8_active

# 3. Jalankan pemantauan otomatis setiap 30 menit (Loop)
python geowatch_engine.py --lat -2.99 --lon 104.76 --ntfy geowatch_band8_active --loop --interval 1800
```

---

### C. Cara Menghubungkan Notifikasi NTFY ke Mi Band 8 Active
1. Download aplikasi **ntfy** di HP Anda:
   - [ntfy di Google Play Store](https://play.google.com/store/apps/details?id=io.heckel.ntfy)
   - [ntfy di Apple App Store](https://apps.apple.com/app/ntfy/id1625396347)
2. Buka aplikasi **ntfy**, klik **+ (Subscribe to topic)**, masukkan nama topic: `geowatch_band8_active`.
3. Buka aplikasi **Mi Fitness**:
   - Masuk ke menu **Device** &rarr; **App notifications / Notifikasi Aplikasi**.
   - Centang atau aktifkan aplikasi **ntfy**.
4. Selesai! Setiap ada gempa terdekat atau update cuaca, Smart Band 8 Active Anda akan langsung bergetar dan menampilkan pesan detailnya.
