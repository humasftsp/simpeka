# SIMPEKA FTSP Universitas Trisakti

Sistem Informasi Manajemen Promosi dan Kerja Sama — Fakultas Teknik Sipil dan Perencanaan.

Frontend statis (HTML/CSS/JavaScript tanpa framework) untuk GitHub Pages. Backend berupa Google Apps Script (`Kode.gs`, disimpan terpisah dari repository ini) dengan Google Sheets sebagai database dan Google Drive sebagai penyimpanan berkas.

## Fitur

- Master Mitra (jenis IKU, kategori, lingkup, negara, benua, PIC) sebagai acuan tunggal untuk semua dokumen
- MoU, MoA, dan IA dengan kolom format SIMKERMA dan status masa berlaku otomatis: Aktif, Akan Berakhir, Segera Berakhir, Kadaluarsa
- Relasi dokumen: satu MoU → banyak MoA; MoA boleh tanpa MoU; IA menempel ke MoA, ke MoU, atau mandiri
- Impor dari Excel SIMKERMA (diperiksa dulu sebelum disimpan) dan ekspor kembali ke Excel
- Promosi sekolah: jenis kegiatan (Presentasi / Pameran (Stand) / Lainnya), 2–4 petugas dari Master Petugas (Dosen / Tendik / Mahasiswa), catatan, dan bukti kegiatan; impor data promosi lama dari Excel
- Kalender terpadu: tanggal berakhir kerja sama dan jadwal promosi
- Email pengingat otomatis 6, 3, dan 1 bulan sebelum berakhir
- Laporan PDF satu klik, diarsipkan di Google Drive
- Hak akses per peran (Admin, Wakil Dekan IV, Tim Promosi), login email + kata sandi (tersimpan sebagai hash)
- Mode gelap dan tampilan khusus ponsel

## Struktur

```
index.html
css/style.css
js/config.js     ← satu-satunya berkas yang perlu diedit (GAS_URL, LOGO_URL)
js/icons.js      ikon (subset Lucide, lisensi ISC)
js/api.js        komunikasi dengan Apps Script
js/ui.js         komponen tampilan
js/data.js       data & operasi simpan/hapus
js/forms.js      formulir promosi & pengguna, validasi
js/docs.js       formulir & panel detail Mitra, MoU, MoA, IA
js/impor.js      baca/tulis Excel (SheetJS; cadangan lokal di js/vendor/)
js/pages.js      halaman
js/app.js        login, navigasi, router
assets/          tempat logo resmi
```

Langkah instalasi lengkap ada di [PANDUAN-INSTALASI.md](PANDUAN-INSTALASI.md).
