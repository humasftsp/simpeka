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
    let found = null;
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      if (!ws['!ref']) continue;
      const rg = X.utils.decode_range(ws['!ref']);
      for (let r = rg.s.r; r <= Math.min(rg.e.r, rg.s.r + 10) && !found; r++) {
        for (let c = rg.s.c; c <= rg.e.c; c++) {
          const cell = ws[X.utils.encode_cell({ r: r, c: c })];
          if (cell && /^NOMOR (MOU|MOA|IA)$/.test(normH(cell.v))) { found = { ws: ws, name: name, r: r, rg: rg }; break; }
        }
      }
      if (found) break;
    }
    if (!found) throw new Error('Baris judul kolom tidak ditemukan. Pastikan ada kolom "NOMOR MOU", "NOMOR MOA", atau "NOMOR IA".');
    const { ws, rg } = found;
    const headers = [];
    for (let c = rg.s.c; c <= rg.e.c; c++) { const cell = ws[X.utils.encode_cell({ r: found.r, c: c })]; headers.push({ c: c, h: normH(cell && cell.v) }); }
    const hs = headers.map((x) => x.h);
    const auto = hs.indexOf('NOMOR IA') >= 0 ? 'ia' : hs.indexOf('NOMOR MOA') >= 0 ? 'moa' : 'mou';
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
    sheets.forEach(([nama, head, data]) => {
      const ws = X.utils.aoa_to_sheet([head].concat(data));
      const urlCol = head.indexOf('URL DOKUMEN');
      if (urlCol >= 0) data.forEach((row, i) => {
        const addr = X.utils.encode_cell({ r: i + 1, c: urlCol });
        if (row[urlCol] && ws[addr]) ws[addr].l = { Target: row[urlCol] };
      });
      ws['!cols'] = head.map((h) => ({ wch: /JUDUL|ALAMAT|JENIS MITRA/.test(h) ? 50 : /MITRA|NOMOR|PIC|URL/.test(h) ? 30 : 12 }));
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      X.utils.book_append_sheet(wb, ws, nama);
    });
    const t = UI.todayStr().replace(/-/g, '');
    X.writeFile(wb, 'SIMPEKA_Data_Kerja_Sama_' + t + '.xlsx');
  }

  return { loadXLSX, parse, ekspor, tanggal };
})();
