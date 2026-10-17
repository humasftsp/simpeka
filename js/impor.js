/**
 * IMPORTER — baca Excel ekspor SIMKERMA (MoU / MoA / IA) di browser dan petakan
 * ke kolom SIMPEKA; juga ekspor data SIMPEKA kembali ke format Excel yang sama.
 * Pustaka SheetJS dimuat hanya saat halaman Impor/Ekspor dipakai.
 */
const IMPORTER = (() => {
  // ---------- pemuat SheetJS: CDN resmi dulu, cadangan berkas lokal ----------
  let loading = null;
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = () => reject(new Error('gagal memuat ' + src));
      document.head.appendChild(s);
    });
  }
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!loading) {
      loading = loadScript('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js')
        .catch(() => loadScript('js/vendor/xlsx.full.min.js'))
        .then(() => { if (!window.XLSX) throw new Error('Pustaka Excel tidak tersedia.'); return window.XLSX; })
        .catch((e) => { loading = null; throw new Error('Pustaka pembaca Excel gagal dimuat. Periksa koneksi internet. (' + e.message + ')'); });
    }
    return loading;
  }

  // ---------- pemetaan kolom ----------
  const UMUM = {
    'FAKULTAS/UNIT': 'Fakultas_Unit', 'PENGGUNA': 'Pengguna', 'JUDUL': 'Judul', 'AWAL': 'Awal', 'AKHIR': 'Akhir',
    'DIKJAR': 'Dikjar', 'PENELITIAN': 'Penelitian', 'PKM': 'PkM', 'NON TRIDARMA': 'Non_Tridarma',
    'INTERNASIONAL': '_int', 'NASIONAL': '_nas', 'LOKAL': '_lok',
    'MITRA': '_mitra', 'JENIS MITRA': '_jenisMitra', 'KATEGORI MITRA': '_kategoriMitra', 'NEGARA': '_negara', 'BENUA': '_benua',
    'NAMA PIC MITRA': 'Nama_PIC_Mitra', 'ALAMAT PIC MITRA': 'Alamat_PIC_Mitra', 'EMAIL PIC MITRA': 'Email_PIC_Mitra',
    'NAMA PIC USAKTI': 'Nama_PIC_Usakti', 'ALAMAT PIC USAKTI': 'Alamat_PIC_Usakti', 'EMAIL PIC USAKTI': 'Email_PIC_Usakti',
    'URL DOKUMEN': '_url', 'NO': '_no'
  };
  const NOMOR = {
    mou: { 'NOMOR MOU': 'Nomor_MoU' },
    moa: { 'NOMOR MOA': 'Nomor_MoA', 'NOMOR MOU': '_nomorInduk' },
    ia: { 'NOMOR IA': 'Nomor_IA', 'NOMOR MOA': '_nomorInduk', 'NOMOR MOU': '_nomorInduk2' }
  };
  // Data promosi lama (Template_Promosi.xlsx); nama kolom alternatif ikut dikenali
  const PROMOSI = {
    'NO': '_no', 'ID SIMPEKA': 'ID_Promosi', 'NAMA SEKOLAH': 'Nama_Sekolah', 'SEKOLAH': 'Nama_Sekolah',
    'KOTA/ALAMAT': 'Kota_Alamat', 'KOTA': 'Kota_Alamat', 'ALAMAT': 'Kota_Alamat', 'LOKASI': 'Kota_Alamat',
    'JENIS KEGIATAN': 'Jenis_Kegiatan', 'JENIS': 'Jenis_Kegiatan', 'KETERANGAN JENIS': 'Keterangan_Jenis', 'KETERANGAN JENIS KEGIATAN': 'Keterangan_Jenis',
    'TANGGAL RENCANA': 'Tanggal_Rencana', 'TANGGAL': 'Tanggal_Rencana', 'TANGGAL REALISASI': 'Tanggal_Realisasi',
    'STATUS': 'Status', 'CATATAN': 'Catatan', 'KETERANGAN': 'Catatan', 'URL BUKTI': '_url', 'BUKTI': '_url', 'PIC': '_pic'
  };
  [1, 2, 3, 4].forEach((i) => { PROMOSI['PETUGAS ' + i] = '_p' + i; PROMOSI['KATEGORI ' + i] = '_k' + i; });
  const PROMOSI_HEAD = ['NO', 'NAMA SEKOLAH', 'KOTA/ALAMAT', 'JENIS KEGIATAN', 'KETERANGAN JENIS', 'TANGGAL RENCANA', 'TANGGAL REALISASI', 'STATUS']
    .concat([1, 2, 3, 4].reduce((a, i) => a.concat(['PETUGAS ' + i, 'KATEGORI ' + i]), []), ['CATATAN', 'URL BUKTI', 'ID SIMPEKA']);
  const jenisNorm = (v) => {
    const s = String(v || '').trim();
    if (!s) return { j: '', k: '' };
    if (/pameran|stand|expo|booth/i.test(s)) return { j: 'Pameran (Stand)', k: '' };
    if (/presentasi|sosialisasi/i.test(s)) return { j: 'Presentasi', k: '' };
    if (/^lain/i.test(s)) return { j: 'Lainnya', k: '' };
    return { j: 'Lainnya', k: s }; // jenis lain (mis. Webinar) → Lainnya + keterangan
  };
  const statusNorm = (v) => {
    const s = String(v || '').trim();
    if (/terlaksana|selesai|sudah|done/i.test(s)) return 'Terlaksana';
    if (/batal|cancel/i.test(s)) return 'Batal';
    if (/rencana|akan|belum|plan|jadwal/i.test(s)) return 'Rencana';
    return s;
  };
  const katNorm = (v) => {
    const s = String(v || '').trim();
    if (/dosen|lecturer/i.test(s)) return 'Dosen';
    if (/tendik|tenaga|staf|staff|karyawan|pegawai/i.test(s)) return 'Tendik';
    if (/mahasis|mhs|student/i.test(s)) return 'Mahasiswa';
    return s;
  };
  const normH = (s) => String(s || '').toUpperCase().replace(/\s+/g, ' ').replace(/[.:]+$/, '').trim();

  // ---------- tanggal ----------
  const BULAN = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, peb: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4,
    mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, ags: 8, agt: 8, agustus: 8, aug: 8, august: 8,
    sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, nopember: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12 };
  const pad = (n) => String(n).padStart(2, '0');
  const valid = (y, m, d) => y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= new Date(y, m, 0).getDate();
  function tanggal(v) {
    if (v === null || v === undefined || v === '') return '';
    if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
    if (typeof v === 'number' && window.XLSX) {
      const p = XLSX.SSF.parse_date_code(v);
      if (p && valid(p.y, p.m, p.d)) return p.y + '-' + pad(p.m) + '-' + pad(p.d);
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{1,2})[\s\-./]+([A-Za-z]+)[\s\-./,]+(\d{4})$/);
    if (m) { const b = BULAN[m[2].toLowerCase()]; if (b && valid(+m[3], b, +m[1])) return m[3] + '-' + pad(b) + '-' + pad(m[1]); }
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m && valid(+m[1], +m[2], +m[3])) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/); // format Indonesia: hari/bulan/tahun
    if (m && valid(+m[3], +m[2], +m[1])) return m[3] + '-' + pad(m[2]) + '-' + pad(m[1]);
    return s; // dikirim apa adanya → server melaporkan "tidak valid"
  }

  /** Baca berkas → { jenis, rows, dikenali, tidakDikenali, sheet, barisHeader } */
  async function parse(file, jenisPaksa) {
    const X = await loadXLSX();
    const buf = await file.arrayBuffer();
    // cellDates: false → tanggal tetap berupa nomor seri Excel; dikonversi tanpa zona waktu (hindari mundur 1 hari).
    const wb = X.read(buf, { type: 'array', cellDates: false });
    // Cari sheet berjudul kolom yang sesuai tombol yang dipakai dulu (berkas ekspor SIMPEKA berisi
    // sheet MoU, MoA, IA, dan Promosi sekaligus); bila tidak ada, cari jenis lain agar pesannya jelas.
    const cari = (re) => {
      for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        if (!ws['!ref']) continue;
        const rg = X.utils.decode_range(ws['!ref']);
        for (let r = rg.s.r; r <= Math.min(rg.e.r, rg.s.r + 10); r++) {
          for (let c = rg.s.c; c <= rg.e.c; c++) {
            const cell = ws[X.utils.encode_cell({ r: r, c: c })];
            if (cell && re.test(normH(cell.v))) return { ws: ws, name: name, r: r, rg: rg };
          }
        }
      }
      return null;
    };
    const RE_KS = /^NOMOR (MOU|MOA|IA)$/, RE_PR = /^NAMA SEKOLAH$/;
    const found = jenisPaksa === 'promosi' ? (cari(RE_PR) || cari(RE_KS)) : (cari(RE_KS) || cari(RE_PR));
    if (!found) {
      throw new Error(jenisPaksa === 'promosi'
        ? 'Baris judul kolom tidak ditemukan. Pastikan ada kolom "NAMA SEKOLAH" (gunakan Template Promosi).'
        : 'Baris judul kolom tidak ditemukan. Pastikan ada kolom "NOMOR MOU", "NOMOR MOA", atau "NOMOR IA".');
    }
    const { ws, rg } = found;
    const headers = [];
    for (let c = rg.s.c; c <= rg.e.c; c++) { const cell = ws[X.utils.encode_cell({ r: found.r, c: c })]; headers.push({ c: c, h: normH(cell && cell.v) }); }
    const hs = headers.map((x) => x.h);
    const auto = hs.indexOf('NOMOR IA') >= 0 ? 'ia' : hs.indexOf('NOMOR MOA') >= 0 ? 'moa' : hs.indexOf('NOMOR MOU') >= 0 ? 'mou' : 'promosi';
    if (jenisPaksa === 'promosi' && auto !== 'promosi') throw new Error('Berkas ini berisi data kerja sama (kolom NOMOR ...). Gunakan tombol Impor MoU / MoA / IA.');
    if (jenisPaksa !== 'promosi' && auto === 'promosi') throw new Error('Berkas ini berisi data promosi (kolom NAMA SEKOLAH). Gunakan tombol Impor Data Promosi.');
    if (auto === 'promosi') return parsePromosi(X, found, headers);
    const LBL = { mou: 'MoU', moa: 'MoA', ia: 'IA' };
    // Berkas MoA juga punya kolom NOMOR MOU (induk) — jangan sampai MoA terbaca sebagai MoU.
    if (jenisPaksa && jenisPaksa !== auto) throw new Error('Berkas ini berisi data ' + LBL[auto] + ' (ada kolom "NOMOR ' + LBL[auto].toUpperCase() + '"), bukan ' + LBL[jenisPaksa] + '.');
    const jenis = auto;
    const peta = Object.assign({}, UMUM, NOMOR[jenis]);
    const dikenali = [], tidakDikenali = [];
    headers.forEach((x) => { if (!x.h) return; (peta[x.h] ? dikenali : tidakDikenali).push(x.h); });
    const nomorKey = { mou: 'Nomor_MoU', moa: 'Nomor_MoA', ia: 'Nomor_IA' }[jenis];
    if (!dikenali.includes({ mou: 'NOMOR MOU', moa: 'NOMOR MOA', ia: 'NOMOR IA' }[jenis])) {
      throw new Error('Berkas ini tidak memiliki kolom nomor ' + { mou: 'MoU', moa: 'MoA', ia: 'IA' }[jenis] + '. Periksa pilihan jenis dokumen.');
    }

    const rows = [];
    for (let r = found.r + 1; r <= rg.e.r; r++) {
      const o = { _baris: r + 1 };
      headers.forEach((x) => {
        const f = peta[x.h];
        if (!f) return;
        const cell = ws[X.utils.encode_cell({ r: r, c: x.c })];
        if (!cell) return;
        if (f === '_url') {
          const link = cell.l && cell.l.Target;
          const txt = String(cell.v === undefined ? '' : cell.v).trim();
          if (link && /^https?:\/\//i.test(link)) o.Link_Dokumen = link;
          else if (/^https?:\/\//i.test(txt)) o.Link_Dokumen = txt;
          else if (txt) o._urlBukanTautan = true;
          return;
        }
        o[f] = f === 'Awal' || f === 'Akhir' ? tanggal(cell.v) : (cell.v instanceof Date ? tanggal(cell.v) : String(cell.v === undefined ? '' : cell.v).trim());
        if (/^[-–—.]+$/.test(o[f])) o[f] = ''; // isian "-" di SIMKERMA = kosong
      });
      if (!o[nomorKey] && !o.Judul && !o._mitra) continue; // baris kosong
      if (o._nomorInduk2 && !o._nomorInduk) o._nomorInduk = o._nomorInduk2;
      delete o._nomorInduk2;
      o._lingkup = o._int ? 'Internasional' : o._nas ? 'Nasional' : o._lok ? 'Lokal' : '';
      delete o._int; delete o._nas; delete o._lok; delete o._no;
      if (!('Link_Dokumen' in o)) o.Link_Dokumen = '';
      rows.push(o);
    }
    return { jenis: jenis, rows: rows, dikenali: dikenali, tidakDikenali: tidakDikenali, sheet: found.name, barisHeader: found.r + 1 };
  }

  function parsePromosi(X, found, headers) {
    const { ws, rg } = found;
    const dikenali = [], tidakDikenali = [];
    headers.forEach((x) => { if (!x.h) return; (PROMOSI[x.h] ? dikenali : tidakDikenali).push(x.h); });
    const rows = [];
    for (let r = found.r + 1; r <= rg.e.r; r++) {
      const o = { _baris: r + 1 };
      headers.forEach((x) => {
        const f = PROMOSI[x.h];
        if (!f) return;
        const cell = ws[X.utils.encode_cell({ r: r, c: x.c })];
        if (!cell) return;
        if (f === '_url') {
          const link = cell.l && cell.l.Target;
          const txt = String(cell.v === undefined ? '' : cell.v).trim();
          if (link && /^https?:\/\//i.test(link)) o.Link_Bukti = link;
          else if (/^https?:\/\//i.test(txt)) o.Link_Bukti = txt;
          return;
        }
        let v = /^Tanggal_/.test(f) ? tanggal(cell.v) : String(cell.v === undefined ? '' : cell.v).trim();
        if (/^[-–—.]+$/.test(v)) v = '';
        if (v !== '' && !(f in o)) o[f] = v;
      });
      if (!o.Nama_Sekolah && !o.Tanggal_Rencana) continue; // baris kosong
      const jn = jenisNorm(o.Jenis_Kegiatan);
      o.Jenis_Kegiatan = jn.j;
      if (jn.k && !o.Keterangan_Jenis) o.Keterangan_Jenis = jn.k;
      if (o.Status) o.Status = statusNorm(o.Status);
      o._petugas = [1, 2, 3, 4].map((i) => ({ nama: o['_p' + i] || '', kategori: katNorm(o['_k' + i]) })).filter((p) => p.nama);
      [1, 2, 3, 4].forEach((i) => { delete o['_p' + i]; delete o['_k' + i]; });
      if (o._pic) o.Catatan = (o.Catatan ? o.Catatan + '\n' : '') + 'PIC (data lama): ' + o._pic;
      delete o._pic; delete o._no;
      rows.push(o);
    }
    return { jenis: 'promosi', rows: rows, dikenali: dikenali, tidakDikenali: tidakDikenali, sheet: found.name, barisHeader: found.r + 1 };
  }

  /** Template kosong untuk impor data promosi lama (dibuat di browser). */
  async function templatePromosi() {
    const X = await loadXLSX();
    const wb = X.utils.book_new();
    const ws = X.utils.aoa_to_sheet([PROMOSI_HEAD]);
    ws['!cols'] = PROMOSI_HEAD.map((h) => ({ wch: /SEKOLAH|CATATAN|ALAMAT|URL/.test(h) ? 34 : /PETUGAS/.test(h) ? 26 : /KETERANGAN/.test(h) ? 28 : 16 }));
    X.utils.book_append_sheet(wb, ws, 'Promosi');
    const pet = [['KOLOM', 'CARA MENGISI'],
      ['NAMA SEKOLAH', 'Wajib. Contoh: SMA Negeri 8 Jakarta'],
      ['KOTA/ALAMAT', 'Opsional. Contoh: Bukit Duri, Jakarta Selatan'],
      ['JENIS KEGIATAN', 'Presentasi, Pameran (Stand), atau Lainnya. Boleh kosong untuk data lama (lengkapi di aplikasi).'],
      ['KETERANGAN JENIS', 'Wajib bila JENIS KEGIATAN = Lainnya. Contoh: Webinar untuk siswa SMA'],
      ['TANGGAL RENCANA', 'Wajib. Contoh: 21/08/2025 atau 21 Agustus 2025'],
      ['TANGGAL REALISASI', 'Opsional. Diisi bila kegiatan sudah terlaksana'],
      ['STATUS', 'Rencana, Terlaksana, atau Batal. Kosong = Terlaksana bila ada tanggal realisasi, selain itu Rencana'],
      ['PETUGAS 1–4', 'Nama petugas (maksimal 4). Kegiatan Terlaksana sebaiknya 2–4 petugas'],
      ['KATEGORI 1–4', 'Dosen, Tendik, atau Mahasiswa. Wajib bila nama petugas belum terdaftar di SIMPEKA'],
      ['CATATAN', 'Opsional. Contoh: Peserta ±120 siswa kelas XII'],
      ['URL BUKTI', 'Opsional. Tautan foto/berita acara (http:// atau https://)'],
      ['ID SIMPEKA', 'Kosongkan untuk data baru. Terisi otomatis bila berkas berasal dari Ekspor Excel SIMPEKA'],
      ['', ''], ['Catatan', 'Satu baris = satu kegiatan. Kolom yang tidak ada datanya cukup dikosongkan.']];
    const wp = X.utils.aoa_to_sheet(pet); wp['!cols'] = [{ wch: 22 }, { wch: 100 }];
    X.utils.book_append_sheet(wb, wp, 'Petunjuk');
    X.writeFile(wb, 'Template_Promosi_SIMPEKA.xlsx');
  }

  // ---------- ekspor ke format Excel SIMKERMA ----------
  function tglText(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    return m ? m[3] + ' ' + UI.BULAN[+m[2] - 1] + ' ' + m[1] : '';
  }
  async function ekspor() {
    const X = await loadXLSX();
    const wb = X.utils.book_new();
    const centang = (v) => (v ? '✔' : '');
    const kolomMitra = (r) => {
      const m = r._m || {};
      return [centang(m.Lingkup === 'Internasional'), centang(m.Lingkup === 'Nasional'), centang(m.Lingkup === 'Lokal'),
        r.Mitra, m.Jenis_Mitra || '', m.Kategori_Mitra || '', m.Negara || '', m.Benua || '',
        r.Nama_PIC_Mitra, r.Alamat_PIC_Mitra, r.Email_PIC_Mitra, r.Nama_PIC_Usakti, r.Alamat_PIC_Usakti, r.Email_PIC_Usakti, r.Link_Dokumen || ''];
    };
    const ekor = ['INTERNASIONAL', 'NASIONAL', 'LOKAL', 'MITRA', 'JENIS MITRA', 'KATEGORI MITRA', 'NEGARA', 'BENUA',
      'NAMA PIC MITRA', 'ALAMAT PIC MITRA', 'EMAIL PIC MITRA', 'NAMA PIC USAKTI', 'ALAMAT PIC USAKTI', 'EMAIL PIC USAKTI', 'URL DOKUMEN'];
    const tri = (r) => DATA.TRIDARMA.map(([f]) => centang(r[f]));
    const urut = (arr) => arr.slice().sort((a, b) => String(a.Awal).localeCompare(String(b.Awal)));
    const sheets = [
      ['MoU', ['NO', 'NOMOR MOU', 'FAKULTAS/UNIT', 'JUDUL', 'AWAL', 'AKHIR', 'DIKJAR', 'PENELITIAN', 'PKM', 'NON TRIDARMA'].concat(ekor, ['STATUS SIMPEKA']),
        urut(STATE.mou).map((r, i) => [i + 1, r.Nomor_MoU, r.Fakultas_Unit, r.Judul, tglText(r.Awal), tglText(r.Akhir)].concat(tri(r), kolomMitra(r), [r.Status_Masa]))],
      ['MoA', ['NO', 'NOMOR MOA', 'FAKULTAS/UNIT', 'PENGGUNA', 'NOMOR MOU', 'JUDUL', 'AWAL', 'AKHIR', 'DIKJAR', 'PENELITIAN', 'PKM', 'NON TRIDARMA'].concat(ekor, ['STATUS SIMPEKA']),
        urut(STATE.moa).map((r, i) => [i + 1, r.Nomor_MoA, r.Fakultas_Unit, r.Pengguna, r._induk ? r._induk.Nomor_MoU : 'Tanpa MoU', r.Judul, tglText(r.Awal), tglText(r.Akhir)].concat(tri(r), kolomMitra(r), [r.Status_Masa]))],
      ['IA', ['NO', 'NOMOR IA', 'FAKULTAS/UNIT', 'NOMOR MoA', 'JUDUL', 'AWAL', 'AKHIR', 'DIKJAR', 'PENELITIAN', 'PKM', 'NON TRIDARMA'].concat(ekor, ['INDUK', 'KELENGKAPAN', 'STATUS SIMPEKA']),
        urut(STATE.ia).map((r, i) => [i + 1, r.Nomor_IA, r.Fakultas_Unit, r._induk ? r._induk._nomor : '', r.Judul, tglText(r.Awal), tglText(r.Akhir)].concat(tri(r), kolomMitra(r),
          [r.Jenis_Induk || 'Mandiri', r.Kelengkapan, r.Status_Masa]))],
      ['Mitra', ['NO', 'ID', 'MITRA', 'JENIS MITRA', 'KATEGORI MITRA', 'LINGKUP', 'NEGARA', 'BENUA', 'NAMA PIC', 'EMAIL PIC', 'ALAMAT PIC', 'JUMLAH MOU', 'JUMLAH MOA', 'JUMLAH IA'],
        STATE.mitra.slice().sort((a, b) => a.Nama_Mitra.localeCompare(b.Nama_Mitra, 'id')).map((m, i) => [i + 1, m.ID_Mitra, m.Nama_Mitra, m.Jenis_Mitra, m.Kategori_Mitra, m.Lingkup, m.Negara, m.Benua, m.Nama_PIC, m.Email_PIC, m.Alamat_PIC, m._mou, m._moa, m._ia])]
    ];
    if ((STATE.promosi || []).length || (STATE.petugas || []).length) {
      sheets.push(['Promosi', PROMOSI_HEAD, STATE.promosi.slice().sort((a, b) => String(a.Tanggal_Rencana).localeCompare(String(b.Tanggal_Rencana))).map((r, i) => {
        const p = [0, 1, 2, 3].reduce((a, j) => a.concat(r._ptg[j] ? [r._ptg[j].Nama_Petugas, r._ptg[j].Kategori] : ['', '']), []);
        return [i + 1, r.Nama_Sekolah, r.Kota_Alamat, r.Jenis_Kegiatan, r.Keterangan_Jenis, tglText(r.Tanggal_Rencana), tglText(r.Tanggal_Realisasi), r.Status].concat(p, [r.Catatan, r.Link_Bukti || '', r.ID_Promosi]);
      })]);
      sheets.push(['Petugas', ['NO', 'ID', 'NAMA PETUGAS', 'KATEGORI', 'KETERANGAN', 'STATUS', 'JUMLAH TUGAS', 'TERLAKSANA'],
        STATE.petugas.slice().sort((a, b) => a.Nama_Petugas.localeCompare(b.Nama_Petugas, 'id')).map((p, i) => [i + 1, p.ID_Petugas, p.Nama_Petugas, p.Kategori, p.Keterangan, p.Status, p._tugas, p._selesai])]);
    }
    sheets.forEach(([nama, head, data]) => {
      const ws = X.utils.aoa_to_sheet([head].concat(data));
      const urlCol = head.indexOf('URL DOKUMEN') >= 0 ? head.indexOf('URL DOKUMEN') : head.indexOf('URL BUKTI');
      if (urlCol >= 0) data.forEach((row, i) => {
        const addr = X.utils.encode_cell({ r: i + 1, c: urlCol });
        if (row[urlCol] && ws[addr]) ws[addr].l = { Target: row[urlCol] };
      });
      ws['!cols'] = head.map((h) => ({ wch: /JUDUL|ALAMAT|JENIS MITRA|CATATAN/.test(h) ? 50 : /MITRA|NOMOR|PIC|URL|SEKOLAH|PETUGAS/.test(h) ? 30 : 12 }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      X.utils.book_append_sheet(wb, ws, nama);
    });
    const t = UI.todayStr().replace(/-/g, '');
    X.writeFile(wb, 'SIMPEKA_Data_' + t + '.xlsx');
  }

  return { loadXLSX, parse, ekspor, tanggal, templatePromosi };
})();
