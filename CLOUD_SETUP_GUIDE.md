# ☁️ Panduan Menjalankan GeoWatch di Cloud 24 Jam Nonstop (Gratis)

Dengan metode ini, Anda **tidak perlu menyalakan PC** dan **tidak perlu membiarkan aplikasi terus menyala di HP**. Server cloud GitHub akan bekerja otomatis di latar belakang setiap 30 menit dan mengirimkan notifikasi langsung ke Smart Band 8 Active Anda!

---

## 📋 Langkah-langkah Sangat Mudah (Hanya Butuh 3 Menit):

### Langkah 1: Buat Repository di GitHub
1. Buka [GitHub.com](https://github.com) dan login ke akun Anda (atau daftar gratis jika belum punya).
2. Klik tombol **"+" &rarr; "New repository"**.
3. Beri nama repository, misalnya: `geowatch-band8`
4. Pilih **Public** atau **Private** (bebas), lalu klik **"Create repository"**.

### Langkah 2: Upload File Proyek
Upload file-file berikut ke repository Anda:
- `geowatch_engine.py`
- Folder `.github/workflows/geowatch_cron.yml`

*(Atau jika menggunakan git dari folder ini di PC:)*
```bash
git init
git add .
git commit -m "GeoWatch 24/7 Engine"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/geowatch-band8.git
git push -u origin main
```

### Langkah 3: Aktifkan Workflow (Selesai!)
1. Buka tab **Actions** di halaman repository GitHub Anda.
2. Klik workflow **"GeoWatch 24/7 Auto Alert"**.
3. Klik tombol **"Run workflow"** untuk uji coba pertama kali.
4. Server GitHub sekarang akan **berjalan otomatis setiap 30 menit selama 24 jam nonstop** untuk memantau cuaca dan gempa, lalu mengirimkannya ke HP & Mi Band Anda!

---

## 📱 Di Smartphone Anda:
1. Pastikan aplikasi **ntfy** sudah terinstall dan subscribe ke topic: `geowatch_band8_active`.
2. Pastikan notifikasi **ntfy** sudah diizinkan di aplikasi **Mi Fitness**.
3. Sekarang jam Smart Band 8 Active Anda akan selalu menerima info cuaca, AQI, dan gempa bumi terbaru di pergelangan tangan Anda ke mana pun Anda pergi!
