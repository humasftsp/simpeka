/**
 * ============================================================
 *  KONFIGURASI SIMPEKA — satu-satunya berkas yang perlu diedit
 * ============================================================
 *
 *  GAS_URL  : URL Web App dari Google Apps Script (berakhiran /exec).
 *             Didapat setelah Deploy → New deployment → Web app.
 *
 *  LOGO_URL : (opsional) logo resmi FTSP / Universitas Trisakti.
 *             Simpan berkas logo di folder "assets/" lalu isi, contoh:
 *             LOGO_URL: 'assets/logo-ftsp.png'
 *             Biarkan kosong untuk memakai ikon bawaan.
 *
 *  Google Client ID TIDAK diisi di sini — diisi di sheet "Konfigurasi"
 *  (kunci GOOGLE_CLIENT_ID) agar hanya ada satu sumber kebenaran.
 */
window.SIMPEKA_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbxvVF-viQNXiszfgI6qy1llZUgQVUcl8uBePdgVwzleyjDbWF_mZhleVa3dJHsqyNyg/exec',
  LOGO_URL: 'assets/logo-ftsp.png'
};
