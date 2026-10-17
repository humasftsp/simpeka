# Panduan Instalasi SIMPEKA FTSP Universitas Trisakti — Versi 2

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

> **Sudah memakai SIMPEKA?** Langsung ke bagian **Pembaruan ke Versi 2** (U1–U8) di bawah — tidak perlu mengulang Tahap A–D. Instalasi baru cukup Tahap A–D; `setupAppEnvironment` langsung membuat struktur versi 2.

---

## Pembaruan ke Versi 2 — Master Mitra, MoU, MoA, IA (untuk instalasi yang sudah berjalan)

Versi 2 mengganti sheet lama `Kerja Sama` dan `IA` dengan struktur baru mengikuti format Excel SIMKERMA:

| Sheet baru | Isi | Terhubung ke |
| --- | --- | --- |
| `Mitra` | Master mitra: nama, jenis (IKU), kategori, lingkup, negara, benua, PIC utama | dipakai oleh MoU/MoA/IA lewat `ID_Mitra` |
| `MoU` | Nomor MoU, judul, masa berlaku, bidang tridarma, PIC, URL dokumen | satu MoU → banyak MoA, banyak IA |
| `MoA` | Sama seperti MoU + **Pengguna** (unit/prodi) + **ID_MoU** (kosong = tanpa MoU) | ke MoU (opsional) |
| `IA` | Sama seperti MoU + **Jenis_Induk** (MoA / MoU / kosong) + **Kelengkapan** | ke MoA, ke MoU, atau mandiri |

Aturan yang dijaga otomatis oleh sistem:
- **MoA yang didahului MoU** wajib memakai mitra yang sama dengan MoU-nya; formulir MoA kini menanyakan *"Didahului MoU dengan mitra yang sama?"* dan tidak bisa disimpan sebelum dijawab.
- **Nomor dokumen tidak boleh ganda** (beda spasi atau huruf besar-kecil tetap dianggap sama).
- **Ganti nama mitra** di Master Mitra → nama di semua MoU/MoA/IA ikut berubah.
- Mitra yang masih dipakai dokumen, dan MoU/MoA yang masih punya turunan, **tidak bisa dihapus**.

> ⚠️ **Data uji lama tidak dipindahkan.** Sheet `Kerja Sama` dan `IA` lama hanya diganti nama menjadi `Arsip v1 - …` (tidak dihapus). Data asli dimasukkan ulang lewat menu **Impor Data Excel**. Sheet `Pengguna`, `Promosi`, dan `Konfigurasi` tetap dipakai — akun dan kata sandi tidak berubah.

### U1. Ganti kode backend
Buka proyek Apps Script → `Kode.gs` → pilih semua (Ctrl+A) → tempel isi **`Kode.gs` versi 2** → Simpan (Ctrl+S).

### U2. Jalankan `migrasiV2` — sekali saja
Dropdown fungsi → **`migrasiV2`** → **Run**. Execution log harus berakhir dengan:
```
✅ Migrasi selesai. Sheet baru: Mitra, MoU, MoA, IA, Log_Email.
```
Menjalankannya dua kali aman — yang kedua hanya menulis "Database sudah memakai struktur versi 2".

### U3. Deploy versi baru (URL tetap sama)
**Deploy** → **Manage deployments** → ikon pensil ✏️ → **Version: New version** → **Deploy**. Jangan pilih *New deployment*.

> Antara U2 dan U4, aplikasi lama di browser akan menampilkan galat. Itu wajar — selesaikan U4 sebelum pengguna lain membuka aplikasi.

### U4. Perbarui frontend di GitHub
1. Ekstrak `simpeka-ftsp.zip` versi 2.
2. Salin **semua isinya** ke folder repository lama, timpa berkas yang ada. `js/config.js` di ZIP ini **sudah berisi `GAS_URL` Anda** (`…AKfycbxvVF…/exec`). Bila sebelumnya Anda mengisi `LOGO_URL`, buka `js/config.js` dan isi lagi baris itu (contoh `LOGO_URL: 'assets/logo-ftsp.png'`). Berkas logo di `assets/` tidak tersentuh.
3. Di PowerShell pada folder repository:
```powershell
git add .
git commit -m "SIMPEKA v2: Master Mitra, MoU, MoA, IA"
git push
```
Tunggu 1–2 menit, buka situs, tekan **Ctrl+Shift+R**. Menu samping kini berisi **Master Mitra, MoU, MoA, IA, … Impor Data Excel**.

### U5. Impor data dari Excel — urutannya wajib MoU → MoA → IA
Masuk sebagai **Admin** → menu **Impor Data Excel**:
1. Pilih berkas **MoU** (.xlsx). Jenisnya dikenali otomatis dari kolom `NOMOR MOU`/`NOMOR MOA`/`NOMOR IA`.
2. Sistem langsung **memeriksa** tanpa menyimpan apa pun. Baca kolom *Hasil*: **Baru**, **Dilewati** (nomor sudah ada), **Gagal** (beserta alasannya), dan catatan kuning.
3. Bila sudah benar → **Impor sekarang** → konfirmasi.
4. Ulangi untuk berkas **MoA**, lalu **IA**. MoA mencari MoU induk dari kolom `NOMOR MOU`; tulisan seperti "Tanpa MoU" dibaca sebagai MoA mandiri. IA mencari induk dari kolom `NOMOR MoA` (boleh juga berisi nomor MoU).

Mitra yang belum ada **dibuat otomatis** dari kolom MITRA, JENIS MITRA, KATEGORI MITRA, NEGARA, BENUA, dan centang INTERNASIONAL/NASIONAL/LOKAL. Nama mitra yang sama (tanpa peduli huruf besar-kecil) dipakai ulang.

Pilihan **"Jika nomor sudah ada"**: *Lewati* (aman, default) atau *Perbarui datanya* (menimpa isi dokumen lama dengan isi Excel — dipakai bila Excel adalah versi yang lebih baru).

### U6. Hasil uji berkas contoh Anda (perlu diperbaiki di Excel sebelum impor)
Ketiga berkas yang Anda kirim sudah diuji dengan sistem ini:

| Berkas | Hasil | Yang perlu diperhatikan |
| --- | --- | --- |
| Data_MoU_1.xlsx | 4 baru, 4 mitra baru | `Email PIC` Swinburne berisi `aaaa@gmail.com` (isian sementara?) |
| Data_MoA_1.xlsx | 2 baru, **1 gagal** | Baris 4 dan 5 bernomor sama: `033/KS.00.02/USAKTI/ FTSP-DEK/X/2025` (dengan spasi) dan `…/USAKTI/FTSP-DEK/X/2025`. Bila keduanya memang dokumen berbeda, perbaiki salah satu nomornya. Baris 5 juga merujuk MoU `029/KS.00.08/USAKTI/R/V/2024`, sedangkan di berkas MoU yang ada `…/R/V/2021` (PT KAI) — dan mitranya UI, bukan KAI. Periksa nomor MoU yang benar. Email PIC UI `erjasama@eng.ui.ac.id` kemungkinan salah ketik (`kerjasama@`). |
| DATA_IA_1.xlsx | 3 baru, 3 mitra baru | Kolom `NOMOR MoA` kosong semua → ketiganya tercatat sebagai IA **mandiri**. Bila sebenarnya turunan MoA/MoU, isi kolom itu sebelum impor, atau hubungkan lewat tombol Ubah setelahnya. |

Isian `-` di kolom PIC dibaca sebagai kosong. Tautan `URL DOKUMEN` disimpan apa adanya (mengarah ke SIMKERMA, alamat `http://`).

### U7. Periksa pengingat email
Menu **Pengingat Email** (Admin dan WD IV dapat melihat; tombol hanya untuk Admin) menampilkan:
- **Jadwal harian**: *Aktif* berarti pemeriksaan otomatis ±06.00 WIB sudah terpasang. Bila *Belum terpasang*, tekan **Pasang jadwal harian**.
- **Penerima**: bila `PENERIMA_PENGINGAT` kosong, email dikirim ke semua Admin dan Wakil Dekan IV yang aktif.
- **Berakhir dalam 6 bulan ke depan**: status tiap dokumen — *Masuk email berikutnya*, *Sudah diingatkan*, atau *Menunggu batas berikutnya*.
- **Riwayat email pengingat** (isi sheet `Log_Email`).

Lakukan uji ini sekali:
1. Isi `URL_APLIKASI` di sheet `Konfigurasi` dengan `https://humasftsp.github.io/simpeka/` agar email memuat tombol **Buka SIMPEKA**.
2. Tekan **Kirim email uji ke saya** → periksa kotak masuk **dan folder Spam**. Email uji tidak mengubah riwayat, jadi pengingat asli tetap terkirim.
3. Bila daftar menunjukkan dokumen *Masuk email berikutnya*, Anda boleh menekan **Jalankan sekarang** agar tidak menunggu besok pagi. Aman ditekan berulang: dokumen yang sudah diingatkan tidak dikirim lagi.

> Email pengingat **hanya** dikirim bila ada dokumen yang sisa masanya baru mencapai 6, 3, atau 1 bulan. Dokumen yang masih lama berlaku (mis. berakhir 2030) belum akan muncul di email.

### U8. Bersihkan
- Bila sebelumnya menjalankan `isiDataContoh` pada versi 2, jalankan **`hapusDataContoh`** sebelum impor data asli.
- Sheet `Arsip v1 - …` boleh dihapus manual dari spreadsheet setelah Anda yakin tidak memerlukannya.
- Periksa daftar di sheet `Konfigurasi` (lihat B2): `JENIS_MITRA`, `KATEGORI_MITRA`, `PENGGUNA_UNIT`.

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
  Database SIMPEKA FTSP   (sheet: Mitra, MoU, MoA, IA, Promosi, Pengguna, Log_Email, Konfigurasi)
  Kerja Sama/ (subfolder MoU, MoA)  IA/  Promosi/  Laporan/
```

Setup juga mendaftarkan email Anda sebagai **Admin pertama** dan memasang trigger harian `dailyCheck` (±06.00 WIB) untuk status dan email pengingat.

### A5. (Opsional) Data contoh

Jalankan `isiDataContoh` untuk beberapa mitra, MoU, MoA, IA (dengan status berbeda) dan promosi. **Sebelum memasukkan data asli**, jalankan `hapusDataContoh`. Data asli paling cepat dimasukkan lewat menu **Impor Data Excel** (lihat U5).

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
| `JENIS_MITRA` | 13 kategori IKU (sama dengan SIMKERMA) + Lainnya | Pilihan jenis mitra; pisahkan dengan tanda `\|` |
| `KATEGORI_MITRA` | Institusi Pendidikan\|Dunia Usaha\|Instansi Pemerintah\|Asosiasi dan Organisasi\|Lembaga Penelitian\|Lainnya | Pilihan kategori mitra |
| `PENGGUNA_UNIT` | FTSP\|Teknik Sipil\|Arsitektur\|Magister Teknik Sipil\|Magister Arsitektur | Pilihan "Pengguna" pada MoA |
| `FAKULTAS_UNIT_DEFAULT` | Fakultas Teknik Sipil dan Perencanaan | Isian awal kolom Fakultas/Unit |
| `PENGINGAT_IA` | Ya | `Tidak` = email pengingat hanya untuk MoU & MoA |
| `AMBANG_AKAN_BERAKHIR_BULAN` | 6 | Batas status Akan Berakhir |
| `AMBANG_SEGERA_BERAKHIR_BULAN` | 3 | Batas status Segera Berakhir |
| `PENGINGAT_BULAN` | 6,3,1 | Kapan pengingat dikirim (satu email ringkasan per hari, berisi semua dokumen yang jatuh tempo) |
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
| Wakil Dekan IV | Lihat, tambah, ubah semua data; cetak & unggah laporan; tanpa hapus dan tanpa impor Excel |
| Tim Promosi | Hanya lihat dashboard, daftar, dan kalender promosi (tidak bisa melihat Mitra/MoU/MoA/IA) |

### D3. Uji sesuai PRD 8.2

| No | Uji | Yang diharapkan |
| --- | --- | --- |
| 1 | Login akun Trisakti **dan** akun Gmail | Masuk sesuai peran |
| 2 | Login dengan email tak terdaftar / kata sandi salah | "Email atau kata sandi salah" |
| 2b | Salah kata sandi 5 kali | Akun terkunci 15 menit |
| 3 | Admin tambah/ubah/hapus mitra, MoU, MoA, IA | Berhasil, kolom Dibuat/Diubah tercatat |
| 3b | Tambah MoA → jawab "Ya, ada MoU" → pilih MoU | Mitra terkunci mengikuti MoU; MoA muncul di detail MoU dan di detail Mitra |
| 3c | Tambah MoA → "Tanpa MoU" → "Tambah mitra baru" | Mitra baru otomatis masuk Master Mitra |
| 3d | Ganti nama mitra di Master Mitra | Nama di daftar MoU/MoA/IA ikut berubah |
| 4 | WD IV membuka MoU/MoA | Tidak ada tombol hapus; menu Impor tidak ada |
| 5 | Tim Promosi membuka `…/simpeka/#/mou` langsung | Dialihkan ke Dashboard |
| 6 | `isiDataContoh` | Empat status dengan warna berbeda |
| 7 | Menu **Pengingat Email** → *Kirim email uji ke saya*, lalu *Jalankan sekarang* dua kali | Email uji masuk; email asli hanya terkirim sekali (riwayat bertambah sekali) |
| 8 | Tambah promosi | Muncul di Kalender pada tanggal rencana |
| 9 | Tambah IA ke MoA, IA ke MoU, IA mandiri | Kolom IA pada MoA/MoU bertambah |
| 9b | Impor Excel MoU → MoA → IA | Hasil pemeriksaan sesuai U6; data muncul di menu masing-masing |
| 9c | Laporan → **Unduh Excel** | Berkas Excel dengan sheet MoU, MoA, IA, Mitra |
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
| Email kata sandi/pengingat tidak masuk | Masuk Spam, kuota email harian habis, jadwal harian belum terpasang, atau memang belum ada dokumen yang mencapai batas | Buka menu **Pengingat Email**: cek *Jadwal harian*, *Penerima*, dan daftar *Berakhir dalam 6 bulan*; tekan **Kirim email uji ke saya**; cek folder Spam |
| Semua kata sandi tiba-tiba tidak berlaku | Script Properties dihapus (kunci `PEPPER` hilang) | Jalankan `resetSandiAdmin`, lalu reset pengguna lain dari aplikasi |
| Situs 404 | `index.html` tidak di akar repository | Lihat C2; push ulang dari folder yang benar |
| Halaman tampil tanpa gaya | Folder `css/` dan `js/` tidak ikut | Selalu push lewat git, jangan "Upload files" di web GitHub |
| "Database belum memakai struktur versi 2" | `Kode.gs` v2 sudah dipasang tetapi `migrasiV2` belum dijalankan | Jalankan U2, lalu U3 |
| Menu masih "Kerja Sama (MoU/MoA)" | Frontend lama masih tersimpan di cache | Ctrl+Shift+R; pastikan U4 sudah di-push |
| Impor: "Baris judul kolom tidak ditemukan" | Berkas bukan format SIMKERMA, atau judul kolom diubah | Pastikan ada kolom `NOMOR MOU`/`NOMOR MOA`/`NOMOR IA` di 10 baris teratas |
| Impor MoA/IA: "induk belum ada" | MoU/MoA induknya belum diimpor, atau nomornya berbeda | Impor MoU dulu; samakan nomor di Excel |
| Impor: tanggal "tidak valid" | Sel tanggal berisi teks yang tidak dikenali | Gunakan format `21 Agustus 2024`, `2024-08-21`, atau `21/08/2024` |
| "Mitra ini masih dipakai … tidak dapat dihapus" | Mitra punya dokumen | Hapus/pindahkan dokumennya dulu, atau biarkan |

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
6. **MoU/MoA yang masih memiliki turunan (MoA/IA) tidak bisa dihapus**, dan mitranya tidak bisa diganti, sebelum turunannya dihapus atau dipindah.
7. **Impor Excel hanya untuk Admin** dan selalu didahului pemeriksaan (tanpa menyimpan). Baris yang gagal tidak pernah ikut tersimpan.
