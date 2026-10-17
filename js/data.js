/**
 * STATE & DATA — data di memori, relasi Mitra → MoU → MoA → IA, kolom turunan,
 * dan operasi simpan/hapus/berkas yang dipakai semua halaman.
 */
const F_DOK = () => ({ q: '', status: '', kategori: '', lingkup: '', tahun: '', bidang: '', relasi: '', sort: 'Akhir', dir: 1, page: 1 });
const STATE = {
  user: null, perms: {}, options: {}, mitra: [], mou: [], moa: [], ia: [], promosi: [], petugas: [], pengguna: [], loadedAt: null,
  f: {
    mou: F_DOK(), moa: F_DOK(), ia: F_DOK(),
    mitra: { q: '', kategori: '', lingkup: '', jenis: '', sort: 'Nama_Mitra', dir: 1, page: 1 },
    promosi: { q: '', status: '', bulan: '', jenis: '', petugas: '', sort: '_tgl', dir: -1, page: 1 },
    petugas: { q: '', kategori: '', semua: false },
    kal: { mode: '', y: null, m: null, sel: null, dok: '', kategori: '', status: '' },
    users: { q: '' }
  }
};

const DATA = (() => {
  const { esc, icon } = UI;

  /** Metadata dokumen kerja sama */
  const DOCS = {
    mou: { key: 'mou', id: 'ID_MoU', nomor: 'Nomor_MoU', label: 'MoU', nama: 'Nota Kesepahaman (MoU)', perm: 'ks', link: 'Link_Dokumen', icon: 'handshake' },
    moa: { key: 'moa', id: 'ID_MoA', nomor: 'Nomor_MoA', label: 'MoA', nama: 'Perjanjian Kerja Sama (MoA)', perm: 'ks', link: 'Link_Dokumen', icon: 'file-text' },
    ia: { key: 'ia', id: 'ID_IA', nomor: 'Nomor_IA', label: 'IA', nama: 'Implementation Agreement (IA)', perm: 'ia', link: 'Link_Dokumen', icon: 'file-check' }
  };
  const DOC_KEYS = ['mou', 'moa', 'ia'];
  const KEYS = {
    mou: DOCS.mou, moa: DOCS.moa, ia: DOCS.ia,
    mitra: { id: 'ID_Mitra', label: 'mitra' },
    promosi: { id: 'ID_Promosi', link: 'Link_Bukti', label: 'kegiatan promosi' },
    petugas: { id: 'ID_Petugas', label: 'petugas' }
  };
  const TRIDARMA = [['Dikjar', 'Dikjar'], ['Penelitian', 'Penelitian'], ['PkM', 'PkM'], ['Non_Tridarma', 'Non Tridarma']];
  const PERAN_LABEL = { Admin: 'Admin Sekretariat', WD_IV: 'Wakil Dekan IV', Tim_Promosi: 'Tim Promosi' };
  const PAGE_SIZE = 12;

  const can = (res, op) => ((STATE.perms || {})[res] || '').indexOf(op) >= 0;

  /** Hitung ulang relasi & kolom turunan di sisi klien (selalu segar terhadap tanggal hari ini). */
  function derive() {
    const am = STATE.options.ambang;
    const mitra = {};
    (STATE.mitra || []).forEach((m) => { mitra[m.ID_Mitra] = m; m._mou = 0; m._moa = 0; m._ia = 0; m._berlaku = 0; });
    const mou = {}, moa = {};
    DOC_KEYS.forEach((k) => (STATE[k] || []).forEach((r) => {
      r._k = k;
      r._nomor = r[DOCS[k].nomor];
      r.Status_Masa = UI.statusMasa(r.Akhir, am);
      r._sisa = UI.sisaHari(r.Akhir);
      r._m = mitra[r.ID_Mitra] || { Nama_Mitra: r.Mitra };
      if (mitra[r.ID_Mitra]) r.Mitra = mitra[r.ID_Mitra].Nama_Mitra;
      r._anakMoa = []; r._anakIa = []; r._iaTotal = 0;
      if (k === 'mou') mou[r.ID_MoU] = r;
      if (k === 'moa') moa[r.ID_MoA] = r;
      const m = mitra[r.ID_Mitra];
      if (m) { m['_' + k]++; if (r.Status_Masa !== 'Kadaluarsa') m._berlaku++; }
    }));
    (STATE.moa || []).forEach((r) => {
      r._induk = r.ID_MoU ? mou[r.ID_MoU] || null : null;
      if (r._induk) { r._induk._anakMoa.push(r); r.Nomor_MoU = r._induk.Nomor_MoU; }
    });
    (STATE.ia || []).forEach((r) => {
      r._induk = r.Jenis_Induk === 'MoU' ? mou[r.ID_Induk] || null : r.Jenis_Induk === 'MoA' ? moa[r.ID_Induk] || null : null;
      if (r._induk) { r._induk._anakIa.push(r); r.Nomor_Induk = r._induk._nomor; }
    });
    (STATE.moa || []).forEach((r) => { r._iaTotal = r._anakIa.length; });
    (STATE.mou || []).forEach((r) => { r._iaTotal = r._anakIa.length + r._anakMoa.reduce((n, a) => n + a._anakIa.length, 0); });
    const ptg = {};
    (STATE.petugas || []).forEach((p) => { ptg[p.ID_Petugas] = p; p._tugas = 0; p._selesai = 0; });
    (STATE.promosi || []).forEach((r) => {
      r._tgl = r.Tanggal_Realisasi || r.Tanggal_Rencana;
      r._ptg = String(r.ID_Petugas || '').split(',').map((x) => x.trim()).filter(Boolean).map((i) => ptg[i]).filter(Boolean);
      r._ptg.forEach((p) => { if (r.Status !== 'Batal') p._tugas++; if (r.Status === 'Terlaksana') p._selesai++; });
      r._jenis = r.Jenis_Kegiatan ? (r.Jenis_Kegiatan === 'Lainnya' && r.Keterangan_Jenis ? r.Keterangan_Jenis : r.Jenis_Kegiatan) : '';
    });
  }

  const list = (jenis) => STATE[jenis] || [];
  const byId = (jenis, id) => list(jenis).find((r) => r[KEYS[jenis].id] === id);
  const allDocs = () => DOC_KEYS.reduce((a, k) => a.concat(list(k)), []);
  function upsert(jenis, rec) {
    const k = KEYS[jenis].id;
    const arr = list(jenis);
    const i = arr.findIndex((r) => r[k] === rec[k]);
    if (i >= 0) arr[i] = Object.assign(arr[i], rec); else arr.push(rec);
  }
  function remove(jenis, id) {
    STATE[jenis] = list(jenis).filter((r) => r[KEYS[jenis].id] !== id);
    derive();
  }

  /** Simpan data lalu (bila ada) unggah berkasnya. Melempar error bila simpan gagal. */
  async function save(jenis, data, file) {
    const k = KEYS[jenis];
    const baru = !data[k.id];
    UI.loading(true, 'Menyimpan data…');
    try {
      const rec = await API.call(jenis + '.save', data);
      if (rec._mitra) { upsert('mitra', rec._mitra); delete rec._mitra; }
      if (rec._petugasBaru) { rec._petugasBaru.forEach((p) => upsert('petugas', p)); delete rec._petugasBaru; }
      upsert(jenis, rec);
      derive();
      if (file) {
        UI.loading(true, 'Mengunggah berkas (' + UI.fmtSize(file.size) + ')…');
        try {
          const base64 = await UI.fileToBase64(file);
          const mimeType = /\.pdf$/i.test(file.name) ? 'application/pdf' : 'image/jpeg';
          const up = await API.call('file.upload', { jenis: jenis, id: rec[k.id], namaBerkas: file.name, mimeType: mimeType, base64: base64 });
          rec[k.link] = up.link;
          upsert(jenis, rec);
        } catch (e) {
          UI.toast('Data ' + rec[k.id] + ' tersimpan, tetapi berkas gagal diunggah: ' + e.message, 'warn');
          return rec;
        }
      }
      UI.toast((baru ? 'Data baru disimpan' : 'Perubahan disimpan') + ' • ' + (rec[k.nomor] || rec.Nama_Mitra || rec.Nama_Sekolah || rec.Nama_Petugas || rec[k.id]));
      return rec;
    } finally {
      UI.loading(false);
    }
  }

  async function del(jenis, id, nama) {
    const ok = await UI.confirmDlg({
      title: 'Hapus ' + (nama || id) + '?',
      message: 'Data ' + KEYS[jenis].label + ' ini akan dihapus dari database.' + (KEYS[jenis].link ? ' Berkas yang diunggah ke Drive SIMPEKA dipindahkan ke Sampah dan masih bisa dipulihkan selama 30 hari.' : ''),
      okText: 'Hapus', danger: true
    });
    if (!ok) return false;
    UI.loading(true, 'Menghapus…');
    try {
      await API.call(jenis + '.delete', { id: id });
      remove(jenis, id);
      UI.toast('Data dihapus');
      return true;
    } catch (e) {
      UI.toast(e.message, 'error');
      return false;
    } finally {
      UI.loading(false);
    }
  }

  /** Berkas dari Drive SIMPEKA dibuka di penampil; tautan luar (mis. SIMKERMA) dibuka di tab baru. */
  async function berkas(jenis, id) {
    const rec = byId(jenis, id) || {};
    const link = rec[KEYS[jenis].link] || '';
    if (link && !/(drive|docs)\.google\.com/.test(link)) { window.open(link, '_blank', 'noopener'); return; }
    UI.loading(true, 'Mengambil berkas…');
    try {
      const f = await API.call('file.get', { jenis: jenis, id: id });
      if (f.url) window.open(f.url, '_blank', 'noopener'); else UI.viewFile(f);
    } catch (e) { UI.toast(e.message, 'error'); }
    finally { UI.loading(false); }
  }

  // ---------- potongan HTML bersama ----------
  function head(o) {
    return `<div class="page-head">
      <div class="ph-text">${o.eyebrow ? '<div class="eyebrow">' + o.eyebrow + '</div>' : ''}<h1>${esc(o.title)}</h1>${o.lead ? '<p class="lead">' + o.lead + '</p>' : ''}</div>
      ${o.actions ? '<div class="page-actions">' + o.actions + '</div>' : ''}
    </div>`;
  }

  function opt(o, val) {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`;
  }
  function select(id, ph, options, val, label) {
    return `<div class="select-wrap"><select id="${id}" class="select" aria-label="${esc(label || ph)}"><option value="">${esc(ph)}</option>${options.map((o) => opt(o, val)).join('')}</select>${icon('chevron-down', 16, 'sel-caret')}</div>`;
  }
  function selectNamed(name, id, ph, options, val) {
    return `<div class="select-wrap"><select id="${id}" name="${name}" class="select"><option value="">${esc(ph)}</option>${options.map((o) => opt(o, val)).join('')}</select>${icon('chevron-down', 16, 'sel-caret')}</div>`;
  }

  function sortTh(label, key, f, cls) {
    const on = f.sort === key;
    return `<th class="sortable ${cls || ''} ${on ? 'on' : ''}" data-sort="${key}" aria-sort="${on ? (f.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button">${esc(label)} ${icon('arrow-up-down', 13)}</button></th>`;
  }
  function sortRows(rows, f) {
    const k = f.sort, d = f.dir;
    return rows.slice().sort((a, b) => {
      const x = a[k] === undefined || a[k] === null ? '' : a[k];
      const y = b[k] === undefined || b[k] === null ? '' : b[k];
      if (x === '' && y !== '') return 1;
      if (y === '' && x !== '') return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'id')) * d;
    });
  }

  function paginate(rows, f) {
    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    if (f.page > pages) f.page = pages;
    const start = (f.page - 1) * PAGE_SIZE;
    return { rows: rows.slice(start, start + PAGE_SIZE), pages: pages, start: start };
  }
  function pager(total, f, pages, start) {
    if (!total) return '';
    const to = Math.min(start + PAGE_SIZE, total);
    const nums = [];
    for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - f.page) <= 1) nums.push(i);
    const btns = [];
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) btns.push('<span class="pg-gap">…</span>');
      btns.push(`<button class="pg ${n === f.page ? 'on' : ''}" data-page="${n}" aria-label="Halaman ${n}">${n}</button>`);
    });
    return `<div class="pager"><span>Menampilkan ${start + 1}–${to} dari ${total}</span>${pages > 1 ? `<div class="pg-btns">
      <button class="pg" data-page="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''} aria-label="Sebelumnya">${icon('chevron-left', 16)}</button>${btns.join('')}
      <button class="pg" data-page="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''} aria-label="Berikutnya">${icon('chevron-right', 16)}</button></div>` : ''}</div>`;
  }

  const docChip = (k) => `<span class="chip chip-doc doc-${k}">${DOCS[k].label}</span>`;
  const lingkupChip = (l) => l ? `<span class="chip ${l === 'Internasional' ? 'chip-blue' : l === 'Lokal' ? 'chip-violet' : ''}">${l === 'Internasional' ? icon('globe', 12) : ''}${esc(l)}</span>` : '';
  const KAT_CLS = { Dosen: 'chip-blue', Tendik: 'chip-green', Mahasiswa: 'chip-violet' };
  const katChip = (k) => k ? `<span class="chip ${KAT_CLS[k] || ''}">${esc(k)}</span>` : '';
  const petugasChips = (r) => (r._ptg || []).map((p) => `<span class="chip ptg-chip"><b>${esc(p.Nama_Petugas)}</b><i class="kdot k-${esc(p.Kategori)}" title="${esc(p.Kategori)}"></i><small>${esc(p.Kategori)}</small></span>`).join('');
  const jenisChip = (r) => r.Jenis_Kegiatan ? `<span class="chip chip-navy-soft">${esc(r.Jenis_Kegiatan === 'Lainnya' ? (r.Keterangan_Jenis || 'Lainnya') : r.Jenis_Kegiatan)}</span>` : '<span class="chip chip-warn">Jenis belum diisi</span>';
  const bidangText = (r) => TRIDARMA.filter(([k]) => r[k]).map(([, l]) => l).join(', ');
  const bidangChips = (r) => TRIDARMA.filter(([k]) => r[k]).map(([, l]) => `<span class="chip">${l}</span>`).join('');
  /** Nomor surat boleh terpotong baris hanya setelah '/' (bukan di tengah angka). */
  const nomorHtml = (n) => UI.esc(n).replace(/\//g, '/<wbr>');
  const matchQ = (q, fields) => { q = q.toLowerCase(); return fields.some((x) => String(x || '').toLowerCase().indexOf(q) >= 0); };
  const PALET = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];

  return {
    DOCS, DOC_KEYS, KEYS, TRIDARMA, PERAN_LABEL, PALET, can, derive, byId, allDocs, upsert, remove, save, del, berkas,
    head, select, selectNamed, sortTh, sortRows, paginate, pager, docChip, lingkupChip, bidangText, bidangChips, matchQ, nomorHtml, katChip, petugasChips, jenisChip
  };
})();
