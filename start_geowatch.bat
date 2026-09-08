@echo off
title GeoWatch Realtime Engine - Mi Band 8 Active
color 0b
echo ========================================================
echo        🌍 GEOWATCH REALTIME ENGINE (AUTOMATIC LOOP)
echo                 Xiaomi Smart Band 8 Active
echo ========================================================
echo.
echo [*] Lokasi: Padang, Sumatera Barat (-0.95, 100.35)
echo [*] Topic NTFY: geowatch_band8_active
echo [*] Update Otomatis: Setiap 5 Menit (300 detik)
echo.
echo Jangan tutup jendela ini agar pemantauan gempa & cuaca
echo tetap berjalan otomatis di background!
echo ========================================================
echo.

python "%~dp0geowatch_engine.py" --lat -0.95 --lon 100.35 --ntfy geowatch_band8_active --loop --interval 300

pause
