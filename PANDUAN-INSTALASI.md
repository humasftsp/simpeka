# Panduan Instalasi SIMPEKA FTSP Universitas Trisakti

SIMPEKA terdiri dari dua bagian yang dipasang terpisah:

| Bagian | Isi | Dipasang di |
| --- | --- | --- |
| **Backend** | `Kode.gs` (berkas terpisah, tidak ada di dalam ZIP) | Google Apps Script |
| **Frontend** | isi ZIP `simpeka-ftsp.zip` (`index.html`, `css/`, `js/`, `assets/`) | GitHub Pages |

Login memakai **email + kata sandi** yang dikelola Admin di halaman Pengguna. Tidak perlu Google Cloud Console.

```
A. Backend (Apps Script)   →  URL /exec + kata sandi sementara Admin
B. Isi konfigurasi         →  GAS_URL di js/config.js
C. Push ke GitHub & aktifkan Pages
D. Login pertama, daftarkan pengguna, uji
```

Perkiraan waktu: 30–45 menit untuk pertama kali.

---

## Sudah memasang versi sebelumnya (login Google)?

Bila Tahap A versi lama sudah dijalankan, **jangan** menjalankan `setupAppEnvironment` lagi. Cukup:

1. Buka proyek Apps Script → ganti seluruh isi `Kode.gs` dengan versi baru → Simpan.
2. Pilih fungsi **`buatSandiAwal`** → **Run**. Execution log menampilkan kata sandi sementara untuk setiap pengguna yang sudah terdaftar, termasuk Admin. Kolom kata sandi di sheet `Pengguna` ditambahkan otomatis.
3. **Deploy** → **Manage deployments** → ikon pensil ✏️ → **Version: New version** → **Deploy**. URL `/exec` tetap sama.
4. Pakai ZIP frontend yang baru (Tahap B–C). Bila repository GitHub sudah ada, cukup salin isi ZIP baru ke folder lama (jaga `js/config.js` yang sudah berisi `GAS_URL`), lalu `git add .`, `git commit -m "Login email + kata sandi"`, `git push`.
5. Baris `GOOGLE_CLIENT_ID` di sheet `Konfigurasi` tidak dipakai lagi dan boleh dihapus. Proyek di Google Cloud Console juga boleh dihapus.

---

## Tahap A — Backend di Google Apps Script

### A1. Pilih akun pemilik

Semua data (spreadsheet, folder Drive, email pengingat) dimiliki akun yang menjalankan langkah ini. Gunakan **akun admin sekretariat yang dipakai jangka panjang**, bukan akun pribadi staf.

> ⚠️ **Akun @trisakti.ac.id:** beberapa domain Google Workspace membatasi Web App agar tidak bisa diakses dari luar domain. Jika di langkah A6 pilihan **"Anyone"** tidak muncul, gunakan akun Gmail khusus sekretariat sebagai pemilik.

### A2. Buat proyek Apps Script

1. Buka <https://script.google.com> → **Proyek baru**.
2. Ganti judul menjadi `SIMPEKA Backend`.
3. Hapus isi `Code.gs`, tempel **seluruh isi `Kode.gs`**, lalu Simpan (Ctrl+S).

### A3. Atur zona waktu proyek

**Project Settings** (ikon roda gigi) → **Time zone** → `(GMT+07:00) Jakarta`.

### A4. Jalankan `setupAppEnvironment` — SEKALI saja

1. Pilih `setupAppEnvironment` di dropdown fungsi → **Run**.
2. **Review permissions** → pilih akun → *"Google hasn't verified this app"* → **Advanced** → **Go to SIMPEKA Backend (unsafe)** → **Allow**. Peringatan ini normal untuk skrip buatan sendiri.
3. Buka **Execution log**. Catat baris:

```
Kata sandi sementara Admin: AbCd3-EfG7h
```

Kata sandi ini hanya muncul sekali di log. Bila terlewat, jalankan `resetSandiAdmin` (lihat bagian *Lupa kata sandi*).

Hasilnya di Google Drive:

```
SIMPEKA/
  Database SIMPEKA FTSP   (sheet: Kerja Sama, IA, Promosi, Pengguna, Log_Email, Konfigurasi)
  Kerja Sama/  IA/  Promosi/  Laporan/
```

Setup juga mendaftarkan email Anda sebagai **Admin pertama** dan memasang trigger harian `dailyCheck` (±06.00 WIB) untuk status dan email pengingat.

### A5. (Opsional) Data contoh

Jalankan `isiDataContoh` untuk 5 kerja sama dengan status berbeda, 2 IA, dan 4 promosi. **Sebelum memasukkan data asli**, jalankan `hapusDataContoh`.

### A6. Deploy sebagai Web App

1. **Deploy** → **New deployment** → ikon roda gigi → **Web app**.
2. **Execute as: Me** — **Who has access: Anyone**.
3. **Deploy** → salin **Web app URL** yang berakhiran `/exec`.

> **Apakah "Anyone" aman?** Ya. Setiap permintaan data memerlukan login yang sah. URL `/exec` yang bocor tidak membuka data apa pun.

---

## Tahap B — Isi konfigurasi

### B1. `js/config.js` (di folder hasil ekstraksi ZIP)

```js
window.SIMPEKA_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycb..../exec',
  LOGO_URL: ''
};
```

**Logo resmi (disarankan):** salin berkas logo ke folder `assets/` (misal `assets/logo-ftsp.png`, persegi, latar putih), lalu isi `LOGO_URL: 'assets/logo-ftsp.png'`.

### B2. Sheet `Konfigurasi` (spreadsheet Database SIMPEKA FTSP)

Setelah situs online (Tahap C), isi `URL_APLIKASI` dengan `https://USERNAME.github.io/simpeka/` — dipakai sebagai tombol di email pengingat dan email kata sandi.

Kunci lain bisa dibiarkan default dan diubah kapan saja tanpa menyentuh kode:

| Kunci | Default | Fungsi |
| --- | --- | --- |
| `JENIS_MITRA` | Industri,Pendidikan,Pemerintah,Luar Negeri | Pilihan jenis mitra |
| `AMBANG_AKAN_BERAKHIR_BULAN` | 6 | Batas status Akan Berakhir |
| `AMBANG_SEGERA_BERAKHIR_BULAN` | 3 | Batas status Segera Berakhir |
| `PENGINGAT_BULAN` | 6,3,1 | Kapan email pengingat dikirim |
| `PENERIMA_PENGINGAT` | (kosong) | Kosong = semua Admin & WD IV aktif |
| `MAKS_UKURAN_MB` | 10 | Batas ukuran unggah |
| `NAMA_INSTITUSI`, `NAMA_FAKULTAS`, `ALAMAT_KOP` | — | Kop laporan PDF — **periksa alamatnya** |

Perubahan sheet `Konfigurasi` berlaku paling lama **5 menit**.

---

## Tahap C — Push ke GitHub dan aktifkan Pages

### C1. Buat repository

<https://github.com> → **+** → **New repository** → nama `simpeka`, **Public**, jangan centang README/.gitignore/license → **Create repository**. Alamat situs nantinya `https://USERNAME.github.io/simpeka/`.

### C2. Pastikan foldernya benar

Ekstrak `simpeka-ftsp.zip`. Hasilnya folder **`simpeka-ftsp`** yang langsung berisi `index.html`, `css\`, `js\`, `assets\`. **Folder inilah tempat `git init` dijalankan.**

Buka PowerShell di folder itu (File Explorer → klik address bar → ketik `powershell` → Enter), lalu:

```powershell
dir
```

`index.html` **harus** terlihat. Jika yang terlihat folder `simpeka-ftsp`, masuk dulu: `cd simpeka-ftsp`.

### C3. Install Git & atur identitas (sekali per komputer)

Windows: <https://git-scm.com/download/win> (pengaturan default). Lalu:

```powershell
git config --global user.name "Sekretariat FTSP"
git config --global user.email "email-akun-github@contoh.com"
```

### C4. Push pertama

Jalankan satu per satu:

```powershell
git init
git add .
git commit -m "SIMPEKA versi pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/simpeka.git
git push -u origin main
```

Saat diminta **Password**, tempel **Personal Access Token** (bukan password GitHub). Layar memang kosong saat token ditempel — tekan Enter.
Membuat token: <https://github.com/settings/tokens> → **Generate new token (classic)** → centang **repo** → salin `ghp_...`.

Alternatif tanpa terminal: **GitHub Desktop** → *Add Local Repository* → folder `simpeka-ftsp` → *Publish repository*.

### C5. Aktifkan GitHub Pages

Repository → **Settings** → **Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → **Save** → centang **Enforce HTTPS**. Tunggu 1–2 menit.

### C6. Memperbarui frontend

```powershell
git add .
git commit -m "Ringkasan perubahan"
git push
```

Situs masih versi lama? **Ctrl+Shift+R** atau buka di Incognito.

---

## Tahap D — Login pertama, pengguna, dan uji

### D1. Login pertama Admin

Buka `https://USERNAME.github.io/simpeka/` → masukkan email pemilik script dan **kata sandi sementara dari A4** → aplikasi langsung meminta **kata sandi baru** (minimal 8 karakter, berisi huruf dan angka).

### D2. Daftarkan pengguna

Menu **Pengguna** → **Tambah pengguna** → email, nama, peran. Biarkan **"Kirim kata sandi sementara ke email ini"** aktif.

- Setelah disimpan, kata sandi sementara **ditampilkan sekali** dengan tombol Salin. Bila email tidak sampai, sampaikan langsung (misalnya lewat WhatsApp).
- Pengguna wajib membuat kata sandi sendiri saat pertama masuk.

| Peran | Hak |
| --- | --- |
| Admin | Lihat, tambah, ubah, hapus semua data; kelola pengguna; reset kata sandi |
| Wakil Dekan IV | Lihat, tambah, ubah semua data; cetak & unggah laporan; tanpa hapus |
| Tim Promosi | Hanya lihat dashboard, daftar, dan kalender promosi |

### D3. Uji sesuai PRD 8.2

| No | Uji | Yang diharapkan |
| --- | --- | --- |
| 1 | Login akun Trisakti **dan** akun Gmail | Masuk sesuai peran |
| 2 | Login dengan email tak terdaftar / kata sandi salah | "Email atau kata sandi salah" |
| 2b | Salah kata sandi 5 kali | Akun terkunci 15 menit |
| 3 | Admin tambah/ubah/hapus kerja sama | Berhasil, kolom Dibuat/Diubah tercatat |
| 4 | WD IV membuka kerja sama | Tidak ada tombol hapus |
| 5 | Tim Promosi membuka `…/simpeka/#/kerjasama` langsung | Dialihkan ke Dashboard |
| 6 | `isiDataContoh` | Empat status dengan warna berbeda |
| 7 | Jalankan `dailyCheck` dua kali di editor | Email hanya terkirim sekali (cek `Log_Email`) |
| 8 | Tambah promosi | Muncul di Kalender pada tanggal rencana |
| 9 | Tambah IA terhubung & IA mandiri | Kolom IA pada kerja sama berubah |
| 10 | Unggah PDF/JPG; lalu berkas > 10 MB | Berkas masuk Drive; berkas besar ditolak |
| 11 | Cetak keempat laporan | PDF terunduh dan muncul di Arsip |
| 12 | Buka di HP, alihkan mode gelap | Tampilan rapi, menu bawah muncul |
| 13 | Dua orang menyimpan bersamaan | Tidak ada data tertimpa |

---

## Lupa kata sandi

| Siapa yang lupa | Cara memulihkan |
| --- | --- |
| Pengguna (WD IV, Tim Promosi, Admin lain) | Admin → menu **Pengguna** → ikon kunci 🔑 pada baris pengguna → **Reset kata sandi**. Kunci akun ikut dibuka, dan semua sesi lama pengguna itu keluar. |
| Admin pemilik script | Buka editor Apps Script → jalankan **`resetSandiAdmin`** → kata sandi sementara baru ada di Execution log. |

Ganti kata sandi sendiri: klik nama/avatar di kanan atas (di HP: **Lainnya**) → **Ganti kata sandi**.

---

## Memperbarui backend (PENTING)

Setelah mengubah `Kode.gs`: **Deploy** → **Manage deployments** → ikon pensil ✏️ → **Version: New version** → **Deploy**.
Jangan memilih *New deployment* — itu menghasilkan URL `/exec` baru yang belum ada di `js/config.js`.

---

## Pemecahan masalah

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| Layar "GAS_URL belum diatur" | `js/config.js` belum diisi atau URL tidak berakhiran `/exec` | Isi `GAS_URL`, lalu push ulang |
| "Respons server tidak valid" | Web App tidak di-deploy dengan akses **Anyone**, atau URL salah | Periksa A6 |
| "Email atau kata sandi salah" padahal yakin benar | Salah ketik email, akun belum punya kata sandi, atau Caps Lock | Cek ikon mata untuk melihat ketikan; Admin cek kolom "Kata sandi" di halaman Pengguna |
| "Akun dikunci sampai pukul …" | 5 kali salah berturut-turut | Tunggu 15 menit atau minta Admin mereset |
| "Akun ini sedang dinonaktifkan" | Status Nonaktif | Admin mengaktifkan di halaman Pengguna |
| Diminta login ulang | Sesi berakhir setelah 6 jam tanpa aktivitas, atau kata sandi baru saja diganti/direset | Normal |
| Email kata sandi/pengingat tidak masuk | Masuk Spam, atau kuota email harian habis | Cek Spam; sampaikan kata sandi langsung; cek sheet `Log_Email` |
| Semua kata sandi tiba-tiba tidak berlaku | Script Properties dihapus (kunci `PEPPER` hilang) | Jalankan `resetSandiAdmin`, lalu reset pengguna lain dari aplikasi |
| Situs 404 | `index.html` tidak di akar repository | Lihat C2; push ulang dari folder yang benar |
| Halaman tampil tanpa gaya | Folder `css/` dan `js/` tidak ikut | Selalu push lewat git, jangan "Upload files" di web GitHub |

---

## Catatan keamanan & perbedaan dari PRD

1. **Login (PRD F1):** PRD meminta login akun Google. Karena frontend di GitHub Pages dan OAuth Client ID dibatalkan, login diganti email + kata sandi:
   - Kata sandi **tidak** disimpan apa adanya. Sheet `Pengguna` hanya berisi hash bersalt yang dikunci dengan kunci rahasia di Script Properties, sehingga orang yang bisa membuka sheet pun tidak bisa membaca atau menebak kata sandi dari isinya.
   - 5 kali salah → terkunci 15 menit. Pesan galat tidak membedakan "email tidak terdaftar" dan "kata sandi salah".
   - Kata sandi sementara wajib diganti; ganti/reset kata sandi membuat semua sesi lama keluar.
   - Tidak ada "lupa kata sandi" mandiri lewat email — pemulihan selalu lewat Admin. Ini disengaja: dengan 4–10 pengguna, reset oleh Admin lebih aman daripada tautan reset yang bisa dipicu siapa pun.
2. **Berkas di Drive tidak dibagikan ke pengguna.** Berkas dibuka lewat tombol "Lihat berkas" sehingga hak aksesnya mengikuti peran di aplikasi.
3. **Unggah berkas** dikirim dalam satu permintaan (pemecahan per potongan di PRD diperlukan untuk `google.script.run`). Bila kelak berkas mendekati 10 MB gagal terunggah, turunkan `MAKS_UKURAN_MB`.
4. **Status masa berlaku** dihitung ulang setiap kali data dibuka; kolom `Status_Masa` di sheet diperbarui trigger harian.
5. **Pengingat yang terlewat:** kerja sama yang dimasukkan saat sisa masanya sudah 2 bulan hanya mendapat pengingat paling mendesak (3 bulan); yang lebih longgar dicatat "dilewati". Jika tanggal Akhir diperpanjang, pengingat untuk tanggal baru dikirim lagi.
6. **Kerja sama yang masih memiliki IA tidak bisa dihapus** sebelum IA-nya dihapus atau dilepas.
