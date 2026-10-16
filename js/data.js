/**
 * STATE & DATA — penyimpanan data di memori, kolom turunan, dan operasi
 * simpan/hapus/berkas yang dipakai semua halaman.
 */
const STATE = {
  user: null, perms: {}, options: {}, ks: [], ia: [], promosi: [], pengguna: [], loadedAt: null,
  f: {
    ks: { q: '', status: '', jenisMitra: '', jenisMoU: '', tahun: '', ia: '', sort: 'Akhir', dir: 1, page: 1 },
    ia: { q: '', tab: '', tahun: '', sort: 'Tanggal_IA', dir: -1, page: 1 },
    promosi: { q: '', status: '', bulan: '', sort: '_tgl', dir: -1, page: 1 },
    kal: { mode: '', y: null, m: null, sel: null, jenisMitra: '', status: '' },
    users: { q: '' }
  }
};

const DATA = (() => {
  const { esc, icon } = UI;
  const KEYS = {
    ks: { id: 'ID_Kerja_Sama', link: 'Link_Bukti', label: 'kerja sama' },
    ia: { id: 'ID_IA', link: 'Link_Berkas', label: 'IA' },
    promosi: { id: 'ID_Promosi', link: 'Link_Bukti', label: 'kegiatan promosi' }
  };
  const PERAN_LABEL = { Admin: 'Admin Sekretariat', WD_IV: 'Wakil Dekan IV', Tim_Promosi: 'Tim Promosi' };
  const PAGE_SIZE = 12;

  const can = (res, op) => ((STATE.perms || {})[res] || '').indexOf(op) >= 0;

  /** Hitung ulang kolom turunan di sisi klien (selalu segar terhadap tanggal hari ini). */
  function derive() {
    const am = STATE.options.ambang;
    const iaCount = {};
    (STATE.ia || []).forEach((r) => { if (r.ID_Kerja_Sama) iaCount[r.ID_Kerja_Sama] = (iaCount[r.ID_Kerja_Sama] || 0) + 1; });
    const ksMap = {};
    (STATE.ks || []).forEach((r) => {
      r.Status_Masa = UI.statusMasa(r.Akhir, am);
      r._ia = iaCount[r.ID_Kerja_Sama] || 0;
      r.Ceklis_IA = r._ia ? 'Ada' : 'Belum Ada';
      r._sisa = UI.sisaHari(r.Akhir);
      ksMap[r.ID_Kerja_Sama] = r;
    });
    (STATE.ia || []).forEach((r) => { if (r.ID_Kerja_Sama && ksMap[r.ID_Kerja_Sama]) r.Mitra = ksMap[r.ID_Kerja_Sama].Mitra; });
    (STATE.promosi || []).forEach((r) => { r._tgl = r.Tanggal_Realisasi || r.Tanggal_Rencana; });
  }

  const list = (jenis) => STATE[jenis] || [];
  const byId = (jenis, id) => list(jenis).find((r) => r[KEYS[jenis].id] === id);
  function upsert(jenis, rec) {
    const k = KEYS[jenis].id;
    const arr = list(jenis);
    const i = arr.findIndex((r) => r[k] === rec[k]);
    if (i >= 0) arr[i] = Object.assign(arr[i], rec); else arr.push(rec);
    derive();
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
      upsert(jenis, rec);
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
      UI.toast((baru ? 'Data baru disimpan' : 'Perubahan disimpan') + ' • ' + rec[k.id]);
      return rec;
    } finally {
      UI.loading(false);
    }
  }

  async function del(jenis, id) {
    const ok = await UI.confirmDlg({
      title: 'Hapus ' + id + '?',
      message: 'Data ' + KEYS[jenis].label + ' ini akan dihapus dari database. Berkas terkait dipindahkan ke Sampah Google Drive dan masih bisa dipulihkan selama 30 hari.',
      okText: 'Hapus', danger: true
    });
    if (!ok) return false;
    UI.loading(true, 'Menghapus…');
    try {
      await API.call(jenis + '.delete', { id: id });
      remove(jenis, id);
      UI.toast(id + ' dihapus');
      return true;
    } catch (e) {
      UI.toast(e.message, 'error');
      return false;
    } finally {
      UI.loading(false);
    }
  }

  async function berkas(jenis, id) {
    UI.loading(true, 'Mengambil berkas…');
    try { UI.viewFile(await API.call('file.get', { jenis: jenis, id: id })); }
    catch (e) { UI.toast(e.message, 'error'); }
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
  /** select untuk filter (pakai id) */
  function select(id, ph, options, val, label) {
    return `<div class="select-wrap"><select id="${id}" class="select" aria-label="${esc(label || ph)}"><option value="">${esc(ph)}</option>${options.map((o) => opt(o, val)).join('')}</select>${icon('chevron-down', 16, 'sel-caret')}</div>`;
  }
  /** select untuk form (pakai name) */
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
    let nums = [];
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

  const chipMoU = (j) => `<span class="chip ${j === 'MoA' ? 'chip-violet' : 'chip-blue'}">${esc(j)}</span>`;
  const iaChip = (r) => r._ia ? `<span class="chip chip-green">${icon('check', 13)} ${r._ia} IA</span>` : '<span class="chip chip-warn">Belum ada IA</span>';
  const matchQ = (q, fields) => { q = q.toLowerCase(); return fields.some((x) => String(x || '').toLowerCase().indexOf(q) >= 0); };
  const MITRA_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];

  return {
    KEYS, PERAN_LABEL, can, derive, byId, upsert, remove, save, del, berkas,
    head, select, selectNamed, sortTh, sortRows, paginate, pager, chipMoU, iaChip, matchQ, MITRA_COLORS
  };
})();
