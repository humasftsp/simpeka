/**
 * PAGES — render setiap halaman SPA.
 * Setiap halaman: render(el) membangun kerangka + filter, lalu results()
 * hanya menggambar ulang daftar sehingga fokus input pencarian tidak hilang.
 */
const PAGES = (() => {
  const { esc, icon } = UI;
  const ST_KS = ['Aktif', 'Akan Berakhir', 'Segera Berakhir', 'Kadaluarsa'];
  const ST_PR = ['Rencana', 'Terlaksana', 'Batal'];
  const count = (arr, fn) => arr.filter(fn).length;
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const pad = (n) => String(n).padStart(2, '0');

  function bindPager(root, f, rerender) {
    root.addEventListener('click', (e) => {
      const p = e.target.closest('[data-page]');
      if (p && !p.disabled) { f.page = Number(p.dataset.page); rerender(); root.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      const s = e.target.closest('[data-sort]');
      if (s) { const k = s.dataset.sort; f.dir = f.sort === k ? -f.dir : 1; f.sort = k; f.page = 1; rerender(); }
    });
  }

  function hariIni() {
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' }).format(new Date()) + ', ' + UI.tgl(UI.todayStr(), true);
  }

  function hero(sub) {
    const u = STATE.user;
    return `<section class="hero batik">
      <div class="hero-in">
        <div class="hero-chip">${icon('shield-check', 14)} ${esc(DATA.PERAN_LABEL[u.peran])}</div>
        <h1>Selamat datang, ${esc(u.nama)}</h1>
        <p>${sub}</p>
        <div class="hero-date">${icon('calendar', 15)} ${esc(hariIni())}</div>
      </div>
    </section>`;
  }

  function upcomingPromosi(n) {
    const t = UI.todayStr();
    return STATE.promosi.filter((r) => r.Status === 'Rencana' && r.Tanggal_Rencana >= t)
      .sort((a, b) => a.Tanggal_Rencana.localeCompare(b.Tanggal_Rencana)).slice(0, n);
  }
  function agendaList(rows) {
    if (!rows.length) return `<div class="mini-empty">${icon('calendar', 20)}<span>Belum ada jadwal promosi mendatang.</span></div>`;
    return `<ul class="agenda-list">${rows.map((r) => {
      const d = r.Tanggal_Rencana;
      return `<li><button type="button" data-pr="${esc(r.ID_Promosi)}">
        <span class="date-tile"><b>${+d.slice(8, 10)}</b><small>${UI.BLN[+d.slice(5, 7) - 1]}</small></span>
        <span class="ag-text"><span class="t-strong">${esc(r.Nama_Sekolah)}</span><span class="t-sub">${icon('map-pin', 12)} ${esc(r.Kota_Alamat || '-')}${r.PIC ? ' • ' + esc(r.PIC) : ''}</span></span>
        <span class="ag-when">${UI.sisaHari(d) === 0 ? 'Hari ini' : UI.sisaHari(d) + ' hari lagi'}</span></button></li>`;
    }).join('')}</ul>`;
  }

  function promosiPerBulan(n) {
    const t = UI.todayStr();
    let y = +t.slice(0, 4), m = +t.slice(5, 7) - 1;
    const items = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(y, m - i, 1);
      const key = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      const rows = STATE.promosi.filter((r) => (r._tgl || '').slice(0, 7) === key);
      items.push({
        label: UI.BLN[d.getMonth()],
        values: [count(rows, (r) => r.Status === 'Terlaksana'), count(rows, (r) => r.Status === 'Rencana')]
      });
    }
    return UI.bars(items, [{ name: 'Terlaksana', color: 'var(--pr-terlaksana)' }, { name: 'Rencana', color: 'var(--pr-rencana)' }]);
  }

  function bindDashClicks(el) {
    el.addEventListener('click', (e) => {
      const dc = e.target.closest('[data-doc]'); if (dc) { const [k, i] = dc.dataset.doc.split(':'); return DOCSUI.docDetail(k, i); }
      const pr = e.target.closest('[data-pr]'); if (pr) return FORMS.promosiDetail(pr.dataset.pr);
      const g = e.target.closest('[data-go]');
      if (g) {
        const patch = g.dataset.patch ? JSON.parse(g.dataset.patch) : {};
        APP.go(g.dataset.go, patch);
      }
    });
  }

  // =========================================================================
  // DASHBOARD (F2, F9)
  // =========================================================================
  const dashboard = {
    title: 'Dashboard',
    render(el) {
      if (!DATA.can('ks', 'r')) return this.promosiOnly(el);
      const docs = DATA.allDocs(), am = STATE.options.ambang;
      const total = docs.length;
      const desc = { 'Aktif': 'Sisa masa > ' + am.akan + ' bulan', 'Akan Berakhir': 'Sisa ' + am.segera + '–' + am.akan + ' bulan', 'Segera Berakhir': 'Sisa < ' + am.segera + ' bulan', 'Kadaluarsa': 'Masa perjanjian sudah lewat' };
      const ics = { 'Aktif': 'circle-check', 'Akan Berakhir': 'clock', 'Segera Berakhir': 'triangle-alert', 'Kadaluarsa': 'circle-x' };
      const berlaku = (k) => STATE[k].filter((r) => r.Status_Masa !== 'Kadaluarsa');
      const moaBer = STATE.moa.length, moaMou = count(STATE.moa, (r) => r._induk);
      const ksBerlaku = berlaku('mou').concat(berlaku('moa'));
      const ksIA = count(ksBerlaku, (r) => r._iaTotal > 0);
      const lk = STATE.options.lingkup;

      const attn = docs.filter((r) => r.Status_Masa === 'Segera Berakhir' || r.Status_Masa === 'Akan Berakhir').sort((a, b) => a.Akhir.localeCompare(b.Akhir))
        .concat(docs.filter((r) => r.Status_Masa === 'Kadaluarsa').sort((a, b) => b.Akhir.localeCompare(a.Akhir)));
      const tahun = [...new Set(docs.map((r) => r.Tahun).filter(Boolean))].sort().slice(-7);

      el.innerHTML = `
        ${hero('Pantau mitra, MoU, MoA, IA, dan jadwal promosi sekolah FTSP Universitas Trisakti dari satu tempat.')}
        <div class="grid g-4">${ST_KS.map((s) => {
          const n = count(docs, (r) => r.Status_Masa === s);
          return `<div class="kpi" style="--accent:${UI.color(s)}">
            <span class="kpi-top"><span class="kpi-label">${s}</span><span class="kpi-ic">${icon(ics[s], 18)}</span></span>
            <span class="kpi-num">${n}</span>
            <span class="kpi-desc">${desc[s]}</span>
            <span class="kpi-split">${DATA.DOC_KEYS.map((k) => `<button type="button" data-go="${k}" data-patch='${JSON.stringify({ status: s })}'>${DATA.DOCS[k].label} <b>${count(STATE[k], (r) => r.Status_Masa === s)}</b></button>`).join('')}</span>
          </div>`;
        }).join('')}</div>

        <div class="grid g-3">
          <div class="card stat-card col">
            <div class="stat-row"><div class="stat-ic">${icon('building-2', 22)}</div><div class="stat-body"><div class="card-title">Mitra</div><p class="card-sub">${STATE.mitra.length} mitra terdaftar</p></div>
              <button type="button" class="link-btn" data-go="mitra">Lihat ${icon('arrow-right', 14)}</button></div>
            <div class="mini-stats">${lk.map((l, i) => `<span style="--c:${DATA.PALET[i]}"><b>${count(STATE.mitra, (m) => m.Lingkup === l)}</b>${l}</span>`).join('')}</div>
          </div>
          <div class="card stat-card col">
            <div class="stat-row"><div class="stat-ic teal">${icon('link', 22)}</div><div class="stat-body"><div class="card-title">Keterhubungan dokumen</div><p class="card-sub">MoU & MoA yang masih berlaku</p></div></div>
            <div class="link-meter"><span>MoA didahului MoU</span><b>${moaMou}/${moaBer}</b></div>${UI.progress(pct(moaMou, moaBer), 'var(--c3)')}
            <div class="link-meter"><span>Sudah memiliki IA</span><b>${ksIA}/${ksBerlaku.length}</b></div>${UI.progress(pct(ksIA, ksBerlaku.length))}
            ${ksBerlaku.length - ksIA ? `<button type="button" class="link-btn warn" data-go="moa" data-patch='${JSON.stringify({ relasi: 'tanpaIa' })}'>${count(berlaku('moa'), (r) => !r._iaTotal)} MoA belum ber-IA ${icon('arrow-right', 14)}</button>` : ''}
          </div>
          <div class="card stat-card col">
            <div class="stat-row"><div class="stat-ic violet">${icon('megaphone', 22)}</div><div class="stat-body"><div class="card-title">Promosi sekolah</div><p class="card-sub">${STATE.promosi.length} kegiatan tercatat</p></div>
              <button type="button" class="link-btn" data-go="promosi">Lihat ${icon('arrow-right', 14)}</button></div>
            <div class="mini-stats">${ST_PR.map((s) => `<span style="--c:${UI.color(s)}"><b>${count(STATE.promosi, (r) => r.Status === s)}</b>${s}</span>`).join('')}</div>
          </div>
        </div>

        <div class="grid g-main">
          <section class="card">
            <div class="card-head"><div><h2 class="card-title">${icon('triangle-alert', 18)} Perlu perhatian</h2><p class="card-sub">MoU, MoA, dan IA yang mendekati atau melewati masa berakhir, terdekat lebih dulu</p></div></div>
            ${attn.length ? `<ul class="attn-list">${attn.slice(0, 7).map((r) => `<li><button type="button" data-doc="${r._k}:${esc(r[DATA.DOCS[r._k].id])}" style="--accent:${UI.color(r.Status_Masa)}">
              <span class="attn-main"><span class="attn-id">${DATA.docChip(r._k)} <span class="mono muted sm">${DATA.nomorHtml(r._nomor)}</span></span>
              <span class="t-strong">${esc(r.Mitra)}</span><span class="t-sub clamp1">${esc(r.Judul)}</span></span>
              <span class="attn-side">${UI.badge(r.Status_Masa)}<span class="t-sub">${UI.tgl(r.Akhir)} • ${esc(UI.sisaTeks(r.Akhir).replace(/ \(.*\)/, ''))}</span></span>
            </button></li>`).join('')}</ul>${attn.length > 7 ? `<p class="more-note">+${attn.length - 7} dokumen lain perlu ditinjau</p>` : ''}`
              : `<div class="mini-empty">${icon('circle-check', 20)}<span>${total ? 'Semua dokumen berstatus Aktif.' : 'Belum ada dokumen. Mulai dari menu Impor Data atau tambahkan MoU.'}</span></div>`}
          </section>
          <section class="card">
            <div class="card-head"><div><h2 class="card-title">${icon('calendar-days', 18)} Jadwal promosi terdekat</h2><p class="card-sub">Kunjungan sekolah berstatus Rencana</p></div></div>
            ${agendaList(upcomingPromosi(5))}
            <button type="button" class="btn btn-outline btn-block" data-go="kalender">${icon('calendar-days', 16)} Buka kalender</button>
          </section>
        </div>

        <div class="grid g-2">
          <section class="card"><div class="card-head"><div><h2 class="card-title">Lingkup kerja sama</h2><p class="card-sub">Dokumen yang masih berlaku, menurut lingkup mitra</p></div></div>
            ${UI.donut(lk.map((l, i) => ({ label: l, value: count(docs, (r) => r.Status_Masa !== 'Kadaluarsa' && r._m.Lingkup === l), color: DATA.PALET[i] })), 'berlaku')}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">Mitra per kategori</h2><p class="card-sub">Seluruh mitra terdaftar</p></div></div>
            ${UI.donut(STATE.options.kategoriMitra.map((c, i) => ({ label: c, value: count(STATE.mitra, (m) => m.Kategori_Mitra === c), color: DATA.PALET[i % 6] })).filter((x) => x.value || STATE.mitra.length === 0), 'mitra')}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">Komposisi status masa berlaku</h2><p class="card-sub">MoU, MoA, dan IA per hari ini</p></div></div>
            ${UI.donut(ST_KS.map((s) => ({ label: s, value: count(docs, (r) => r.Status_Masa === s), color: UI.color(s) })), 'dokumen')}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">Bidang tridarma</h2><p class="card-sub">Jumlah dokumen yang masih berlaku per bidang</p></div></div>
            ${UI.bars(DATA.TRIDARMA.map(([f, l]) => ({ label: l, values: DATA.DOC_KEYS.map((k) => count(berlaku(k), (r) => r[f])) })), DATA.DOC_KEYS.map((k, i) => ({ name: DATA.DOCS[k].label, color: ['var(--c1)', 'var(--c5)', 'var(--c4)'][i] })))}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">Dokumen per tahun</h2><p class="card-sub">Berdasarkan tahun mulai berlaku</p></div></div>
            ${tahun.length ? UI.bars(tahun.map((t) => ({ label: String(t), values: DATA.DOC_KEYS.map((k) => count(STATE[k], (r) => r.Tahun === t)) })), DATA.DOC_KEYS.map((k, i) => ({ name: DATA.DOCS[k].label, color: ['var(--c1)', 'var(--c5)', 'var(--c4)'][i] }))) : UI.empty('Belum ada data', '')}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">Promosi per bulan</h2><p class="card-sub">12 bulan terakhir</p></div></div>${promosiPerBulan(12)}</section>
        </div>`;
      bindDashClicks(el);
    },

    /** Dashboard Tim Promosi — hanya data promosi */
    promosiOnly(el) {
      const pr = STATE.promosi;
      el.innerHTML = `
        ${hero('Pantau jadwal dan realisasi kunjungan promosi sekolah FTSP Universitas Trisakti.')}
        <div class="grid g-4">
          <button type="button" class="kpi" style="--accent:var(--primary)" data-go="promosi"><span class="kpi-top"><span class="kpi-label">Total kegiatan</span><span class="kpi-ic">${icon('school', 18)}</span></span><span class="kpi-num">${pr.length}</span><span class="kpi-desc">Seluruh promosi tercatat</span></button>
          ${ST_PR.map((s) => `<button type="button" class="kpi" style="--accent:${UI.color(s)}" data-go="promosi" data-patch='${JSON.stringify({ status: s })}'><span class="kpi-top"><span class="kpi-label">${s}</span><span class="kpi-ic">${icon(s === 'Rencana' ? 'clock' : s === 'Batal' ? 'circle-x' : 'circle-check', 18)}</span></span><span class="kpi-num">${count(pr, (r) => r.Status === s)}</span><span class="kpi-desc">${pct(count(pr, (r) => r.Status === s), pr.length)}% dari total</span></button>`).join('')}
        </div>
        <div class="grid g-main">
          <section class="card"><div class="card-head"><div><h2 class="card-title">Promosi per bulan</h2><p class="card-sub">12 bulan terakhir</p></div></div>${promosiPerBulan(12)}</section>
          <section class="card"><div class="card-head"><div><h2 class="card-title">${icon('calendar-days', 18)} Jadwal terdekat</h2></div></div>${agendaList(upcomingPromosi(6))}
            <button type="button" class="btn btn-outline btn-block" data-go="kalender">${icon('calendar-days', 16)} Buka kalender</button></section>
        </div>`;
      bindDashClicks(el);
    }
  };

  function kpiMini(label, n, ic, col, sub) {
    return `<div class="kpi static" style="--accent:${col}"><span class="kpi-top"><span class="kpi-label">${esc(label)}</span><span class="kpi-ic">${icon(ic, 18)}</span></span><span class="kpi-num">${n}</span><span class="kpi-desc">${esc(sub)}</span></div>`;
  }

  /** Pasang perilaku standar halaman daftar: filter, cari, pager, aksi baris. */
  function bindList(el, res, f, go, onRow, onAct) {
    bindPager(res, f, go);
    res.addEventListener('click', (e) => {
      if (e.target.closest('[data-page],[data-sort]')) return;
      const row = e.target.closest('[data-id]'); if (!row) return;
      const act = e.target.closest('[data-act]');
      if (act) { e.stopPropagation(); return onAct(act.dataset.act, row.dataset.id, act); }
      onRow(row.dataset.id);
    });
  }

  // =========================================================================
  // MASTER MITRA
  // =========================================================================
  const mitra = {
    title: 'Master Mitra',
    render(el) {
      const f = STATE.f.mitra, rows = STATE.mitra, o = STATE.options;
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('building-2', 14) + ' Master data',
          title: 'Master Mitra',
          lead: 'Satu data induk untuk setiap mitra. MoU, MoA, dan IA merujuk ke mitra di sini, sehingga nama, jenis, dan lingkup mitra selalu konsisten.',
          actions: DATA.can('ks', 'w') ? `<button type="button" class="btn btn-primary" id="mt-add">${icon('plus', 18)} Tambah mitra</button>` : ''
        })}
        <div class="grid g-4">
          ${kpiMini('Total mitra', rows.length, 'building-2', 'var(--primary)', count(rows, (m) => m._berlaku) + ' punya dokumen berlaku')}
          ${o.lingkup.map((l, i) => kpiMini(l, count(rows, (m) => m.Lingkup === l), i === 0 ? 'globe' : 'map-pin', DATA.PALET[i], pct(count(rows, (m) => m.Lingkup === l), rows.length) + '% dari total')).join('')}
        </div>
        <div class="card filter-card"><div class="filters">
          <label class="search">${icon('search', 18)}<input id="mt-q" type="search" placeholder="Cari nama mitra, negara, atau PIC…" value="${esc(f.q)}" aria-label="Cari mitra"></label>
          ${DATA.select('mt-kat', 'Semua kategori', o.kategoriMitra, f.kategori)}
          ${DATA.select('mt-lk', 'Semua lingkup', o.lingkup, f.lingkup)}
          ${DATA.select('mt-jenis', 'Semua jenis (IKU)', o.jenisMitra, f.jenis)}
        </div></div>
        <section class="card list-card" id="mt-res"></section>`;
      const res = UI.$('#mt-res', el);
      const go = () => this.results(res);
      UI.$('#mt-add', el) && (UI.$('#mt-add', el).onclick = () => DOCSUI.mitraForm());
      UI.$('#mt-q', el).oninput = UI.debounce((e) => { f.q = e.target.value.trim(); f.page = 1; go(); }, 150);
      [['mt-kat', 'kategori'], ['mt-lk', 'lingkup'], ['mt-jenis', 'jenis']].forEach(([id, k]) => { UI.$('#' + id, el).onchange = (e) => { f[k] = e.target.value; f.page = 1; go(); }; });
      bindList(el, res, f, go, (id) => DOCSUI.mitraDetail(id), async (a, id) => {
        if (a === 'edit') DOCSUI.mitraForm(id);
        if (a === 'del') {
          const m = DATA.byId('mitra', id);
          if (m._mou + m._moa + m._ia) return UI.toast('Mitra masih dipakai oleh ' + (m._mou + m._moa + m._ia) + ' dokumen.', 'warn');
          if (await DATA.del('mitra', id, m.Nama_Mitra)) this.render(el);
        }
      });
      go();
    },
    results(res) {
      const f = STATE.f.mitra;
      let rows = STATE.mitra.filter((m) => (!f.kategori || m.Kategori_Mitra === f.kategori) && (!f.lingkup || m.Lingkup === f.lingkup) &&
        (!f.jenis || m.Jenis_Mitra === f.jenis) && (!f.q || DATA.matchQ(f.q, [m.Nama_Mitra, m.Negara, m.Nama_PIC, m.ID_Mitra])));
      rows = DATA.sortRows(rows, f);
      if (!rows.length) {
        res.innerHTML = STATE.mitra.length ? UI.empty('Tidak ada yang cocok', 'Coba ubah kata kunci atau filter.')
          : UI.empty('Belum ada mitra', 'Mitra terdaftar otomatis saat Impor Data, atau tambahkan manual.');
        return;
      }
      const p = DATA.paginate(rows, f);
      const docs = (m) => `<span class="chips">${m._mou ? `<span class="chip chip-doc doc-mou">MoU ${m._mou}</span>` : ''}${m._moa ? `<span class="chip chip-doc doc-moa">MoA ${m._moa}</span>` : ''}${m._ia ? `<span class="chip chip-doc doc-ia">IA ${m._ia}</span>` : ''}${m._mou + m._moa + m._ia ? '' : '<span class="muted sm">Belum ada</span>'}</span>`;
      const acts = () => `<span class="row-acts">${DATA.can('ks', 'w') ? `<button type="button" class="icon-btn sm" data-act="edit" title="Ubah" aria-label="Ubah">${icon('pencil', 17)}</button>` : ''}${DATA.can('ks', 'd') ? `<button type="button" class="icon-btn sm danger" data-act="del" title="Hapus" aria-label="Hapus">${icon('trash-2', 17)}</button>` : ''}</span>`;
      res.innerHTML = `
        <div class="list-head"><h2 class="card-title">Daftar mitra</h2><span class="chip">${rows.length} mitra</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr>${DATA.sortTh('Mitra', 'Nama_Mitra', f)}<th>Kategori & jenis</th>${DATA.sortTh('Lingkup', 'Lingkup', f)}<th>Dokumen</th>${DATA.sortTh('Berlaku', '_berlaku', f)}<th class="ta-r">Aksi</th></tr></thead>
          <tbody>${p.rows.map((m) => `<tr data-id="${esc(m.ID_Mitra)}" class="row-click" tabindex="0">
            <td class="w-wide"><div class="t-strong">${esc(m.Nama_Mitra)}</div><div class="t-sub">${icon('map-pin', 12)} ${esc(m.Negara)} • ${esc(m.Benua)}</div></td>
            <td class="w-mid"><span class="chip">${esc(m.Kategori_Mitra)}</span><div class="t-sub clamp2">${esc(m.Jenis_Mitra)}</div></td>
            <td>${DATA.lingkupChip(m.Lingkup)}</td><td>${docs(m)}</td>
            <td class="ta-c"><b>${m._berlaku}</b></td><td class="ta-r">${acts()}</td></tr>`).join('')}</tbody>
        </table></div>
        <ul class="mlist">${p.rows.map((m) => `<li class="mcard" data-id="${esc(m.ID_Mitra)}" style="--accent:var(--primary)">
          <div class="mcard-top"><span class="avatar sq">${esc(UI.initials(m.Nama_Mitra))}</span><div class="mcard-title"><span class="t-strong">${esc(m.Nama_Mitra)}</span><span class="t-sub">${esc(m.Negara)} • ${esc(m.Kategori_Mitra)}</span></div>${DATA.lingkupChip(m.Lingkup)}</div>
          <div class="mcard-foot">${docs(m)}${acts()}</div></li>`).join('')}</ul>
        ${DATA.pager(rows.length, f, p.pages, p.start)}`;
    }
  };

  // =========================================================================
  // HALAMAN DOKUMEN: MoU / MoA / IA
  // =========================================================================
  const RELASI = {
    mou: [['punyaMoa', 'Punya MoA'], ['tanpaMoa', 'Belum ada MoA'], ['punyaIa', 'Punya IA'], ['tanpaIa', 'Belum ada IA']],
    moa: [['denganMou', 'Dengan MoU'], ['tanpaMou', 'Tanpa MoU'], ['punyaIa', 'Punya IA'], ['tanpaIa', 'Belum ada IA']],
    ia: [['MoA', 'Induk MoA'], ['MoU', 'Induk MoU'], ['mandiri', 'IA mandiri'], ['belumLengkap', 'Berkas belum lengkap']]
  };
  const relTest = (r, v) => ({
    punyaMoa: r._anakMoa.length > 0, tanpaMoa: !r._anakMoa.length, punyaIa: r._iaTotal > 0, tanpaIa: !r._iaTotal,
    denganMou: !!r._induk, tanpaMou: !r._induk, MoA: r.Jenis_Induk === 'MoA', MoU: r.Jenis_Induk === 'MoU',
    mandiri: !r.Jenis_Induk, belumLengkap: r.Kelengkapan !== 'Lengkap'
  })[v];
  const LEAD = {
    mou: 'Nota kesepahaman (payung) dengan mitra. Status masa berlaku dihitung otomatis dari tanggal akhir.',
    moa: 'Perjanjian kerja sama teknis. MoA dapat didahului MoU dengan mitra yang sama, atau berdiri sendiri.',
    ia: 'Implementation Agreement setiap kegiatan; dapat menempel ke MoA, langsung ke MoU, atau mandiri.'
  };

  function docPage(k) {
    const meta = DATA.DOCS[k];
    return {
      title: meta.label,
      render(el) {
        const f = STATE.f[k], rows = STATE[k], o = STATE.options;
        const tahun = [...new Set(rows.map((r) => String(r.Tahun)).filter(Boolean))].sort().reverse();
        const canW = DATA.can(meta.perm, 'w');
        el.innerHTML = `
          ${DATA.head({
            eyebrow: icon(meta.icon, 14) + ' ' + meta.nama,
            title: meta.label === 'IA' ? 'Implementation Agreement (IA)' : meta.nama,
            lead: LEAD[k],
            actions: canW ? `<button type="button" class="btn btn-primary" id="dk-add">${icon('plus', 18)} Tambah ${meta.label}</button>` : ''
          })}
          <div class="seg-scroll"><div class="seg" id="dk-seg" role="tablist">${[''].concat(ST_KS).map((s) =>
            `<button type="button" role="tab" data-st="${s}" class="${f.status === s ? 'on' : ''}" aria-selected="${f.status === s}">${s ? `<i class="sdot" style="background:${UI.color(s)}"></i>` : ''}${s || 'Semua'} <span class="cnt">${s ? count(rows, (r) => r.Status_Masa === s) : rows.length}</span></button>`).join('')}</div></div>
          <div class="card filter-card"><div class="filters">
            <label class="search">${icon('search', 18)}<input id="dk-q" type="search" placeholder="Cari nomor, mitra, judul, atau PIC…" value="${esc(f.q)}" aria-label="Cari ${meta.label}"></label>
            ${DATA.select('dk-rel', 'Semua keterkaitan', RELASI[k].map(([v, l]) => ({ value: v, label: l })), f.relasi, 'Keterkaitan')}
            ${DATA.select('dk-kat', 'Semua kategori mitra', o.kategoriMitra, f.kategori)}
            ${DATA.select('dk-lk', 'Semua lingkup', o.lingkup, f.lingkup)}
            ${DATA.select('dk-bid', 'Semua bidang', DATA.TRIDARMA.map(([v, l]) => ({ value: v, label: l })), f.bidang, 'Bidang')}
            ${DATA.select('dk-thn', 'Semua tahun', tahun, f.tahun, 'Tahun')}
            <button type="button" class="btn btn-ghost btn-sm" id="dk-reset">${icon('refresh-cw', 15)} Reset</button>
          </div></div>
          <section class="card list-card" id="dk-res"></section>`;
        const res = UI.$('#dk-res', el);
        const go = () => this.results(res);
        UI.$('#dk-add', el) && (UI.$('#dk-add', el).onclick = () => DOCSUI.docForm(k));
        UI.$('#dk-seg', el).onclick = (e) => {
          const b = e.target.closest('[data-st]'); if (!b) return;
          f.status = b.dataset.st; f.page = 1;
          UI.$$('#dk-seg button', el).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
          go();
        };
        UI.$('#dk-q', el).oninput = UI.debounce((e) => { f.q = e.target.value.trim(); f.page = 1; go(); }, 150);
        [['dk-rel', 'relasi'], ['dk-kat', 'kategori'], ['dk-lk', 'lingkup'], ['dk-bid', 'bidang'], ['dk-thn', 'tahun']].forEach(([id, key]) => {
          UI.$('#' + id, el).onchange = (e) => { f[key] = e.target.value; f.page = 1; go(); };
        });
        UI.$('#dk-reset', el).onclick = () => { Object.assign(f, { q: '', status: '', kategori: '', lingkup: '', tahun: '', bidang: '', relasi: '', page: 1 }); this.render(el); };
        bindList(el, res, f, go, (id) => DOCSUI.docDetail(k, id), async (a, id, btn) => {
          const r = DATA.byId(k, id);
          if (a === 'berkas') DATA.berkas(k, id);
          if (a === 'edit') DOCSUI.docForm(k, id);
          if (a === 'induk') DOCSUI.docDetail(btn.dataset.k, btn.dataset.ref);
          if (a === 'mitra') DOCSUI.mitraDetail(r.ID_Mitra);
          if (a === 'del') {
            const n = r._anakMoa.length + r._anakIa.length;
            if (n) return UI.toast('Masih ada ' + n + ' MoA/IA turunan. Hapus atau pindahkan turunannya dulu.', 'warn');
            if (await DATA.del(k, id, meta.label + ' ' + r._nomor)) this.render(el);
          }
        });
        go();
      },
      results(res) {
        const f = STATE.f[k];
        let rows = STATE[k].filter((r) =>
          (!f.status || r.Status_Masa === f.status) && (!f.kategori || r._m.Kategori_Mitra === f.kategori) &&
          (!f.lingkup || r._m.Lingkup === f.lingkup) && (!f.tahun || String(r.Tahun) === f.tahun) &&
          (!f.bidang || r[f.bidang]) && (!f.relasi || relTest(r, f.relasi)) &&
          (!f.q || DATA.matchQ(f.q, [r._nomor, r.Mitra, r.Judul, r.Nama_PIC_Usakti, r.Nama_PIC_Mitra, r.Pengguna, r[meta.id]])));
        rows = DATA.sortRows(rows, f);
        if (!rows.length) {
          res.innerHTML = STATE[k].length ? UI.empty('Tidak ada yang cocok', 'Coba ubah kata kunci atau filter.')
            : UI.empty('Belum ada ' + meta.label, 'Tambahkan manual, atau impor dari Excel SIMKERMA lewat menu Impor Data.',
              DATA.can(meta.perm, 'w') ? `<button type="button" class="btn btn-primary" onclick="DOCSUI.docForm('${k}')">${icon('plus', 16)} Tambah ${meta.label}</button>` : '');
          return;
        }
        const p = DATA.paginate(rows, f);
        const induk = (r) => {
          if (k === 'mou') return '';
          return r._induk ? `<button type="button" class="chip chip-doc doc-${r._induk._k} chip-btn" data-act="induk" data-k="${r._induk._k}" data-ref="${esc(r._induk[DATA.DOCS[r._induk._k].id])}">${icon('link', 12)} ${DATA.DOCS[r._induk._k].label}</button>`
            : `<span class="chip">${k === 'moa' ? 'Tanpa MoU' : 'Mandiri'}</span>`;
        };
        const turunan = (r) => k === 'mou' ? `<span class="chips"><span class="chip ${r._anakMoa.length ? 'chip-doc doc-moa' : ''}">MoA ${r._anakMoa.length}</span><span class="chip ${r._iaTotal ? 'chip-doc doc-ia' : 'chip-warn'}">IA ${r._iaTotal}</span></span>`
          : k === 'moa' ? (r._iaTotal ? `<span class="chip chip-doc doc-ia">${icon('check', 12)} ${r._iaTotal} IA</span>` : '<span class="chip chip-warn">Belum ada IA</span>')
            : (r.Kelengkapan === 'Lengkap' ? '<span class="chip chip-green">Lengkap</span>' : '<span class="chip chip-warn">Belum lengkap</span>');
        const acts = (r) => `<span class="row-acts">
          ${r.Link_Dokumen ? `<button type="button" class="icon-btn sm" data-act="berkas" title="Buka dokumen" aria-label="Buka dokumen">${icon(/(drive|docs)\.google\.com/.test(r.Link_Dokumen) ? 'eye' : 'link', 17)}</button>` : ''}
          ${DATA.can(meta.perm, 'w') ? `<button type="button" class="icon-btn sm" data-act="edit" title="Ubah" aria-label="Ubah">${icon('pencil', 17)}</button>` : ''}
          ${DATA.can(meta.perm, 'd') ? `<button type="button" class="icon-btn sm danger" data-act="del" title="Hapus" aria-label="Hapus">${icon('trash-2', 17)}</button>` : ''}</span>`;
        const kolTurunan = k === 'mou' ? 'Turunan' : k === 'moa' ? 'IA' : 'Berkas';
        res.innerHTML = `
          <div class="list-head"><h2 class="card-title">Daftar ${meta.label}</h2><span class="chip">${rows.length} dokumen</span></div>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr>${DATA.sortTh('Nomor', '_nomor', f)}${DATA.sortTh('Mitra & judul', 'Mitra', f)}${k !== 'mou' ? '<th>Induk</th>' : ''}<th>Lingkup</th>${DATA.sortTh('Masa berlaku', 'Akhir', f)}<th>Status & sisa</th><th>${kolTurunan}</th><th class="ta-r">Aksi</th></tr></thead>
            <tbody>${p.rows.map((r) => `<tr data-id="${esc(r[meta.id])}" class="row-click" tabindex="0">
              <td class="w-nomor"><span class="mono sm">${DATA.nomorHtml(r._nomor)}</span></td>
              <td class="w-wide"><div class="t-strong">${esc(r.Mitra)}</div><div class="t-sub clamp2">${esc(r.Judul)}</div></td>
              ${k !== 'mou' ? `<td>${induk(r)}</td>` : ''}
              <td>${DATA.lingkupChip(r._m.Lingkup)}</td>
              <td class="nowrap"><div>${UI.tgl(r.Awal)}</div><div class="t-sub">s.d. <b ${r.Status_Masa !== 'Aktif' ? `style="color:${UI.tcolor(r.Status_Masa)}"` : ''}>${UI.tgl(r.Akhir)}</b></div></td>
              <td>${UI.badge(r.Status_Masa)}<div class="t-sub">${esc(UI.sisaTeks(r.Akhir))}</div></td>
              <td>${turunan(r)}</td><td class="ta-r">${acts(r)}</td></tr>`).join('')}</tbody>
          </table></div>
          <ul class="mlist">${p.rows.map((r) => `<li class="mcard" data-id="${esc(r[meta.id])}" style="--accent:${UI.color(r.Status_Masa)}">
            <div class="mcard-top"><span class="avatar sq">${esc(UI.initials(r.Mitra))}</span><div class="mcard-title"><span class="t-strong">${esc(r.Mitra)}</span><span class="t-sub mono">${DATA.nomorHtml(r._nomor)}</span></div></div>
            <p class="t-sub clamp2">${esc(r.Judul)}</p>
            <div class="chips">${induk(r)}${DATA.lingkupChip(r._m.Lingkup)}${turunan(r)}</div>
            <div class="mcard-foot">${UI.badge(r.Status_Masa, UI.sisaTeks(r.Akhir).replace(/ \(.*\)/, ''))}${acts(r)}</div></li>`).join('')}</ul>
          ${DATA.pager(rows.length, f, p.pages, p.start)}`;
      }
    };
  }

  // =========================================================================
  // PROMOSI (F5)
  // =========================================================================
  const promosi = {
    title: 'Promosi Sekolah',
    render(el) {
      const f = STATE.f.promosi, rows = STATE.promosi;
      const bulanOpts = [...new Set(rows.map((r) => (r._tgl || '').slice(0, 7)).filter(Boolean))].sort().reverse()
        .map((b) => ({ value: b, label: UI.BULAN[+b.slice(5, 7) - 1] + ' ' + b.slice(0, 4) }));
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('megaphone', 14) + ' Promosi & sosialisasi PMB',
          title: 'Promosi Sekolah',
          lead: 'Jadwal kunjungan promosi ke sekolah beserta bukti kegiatannya. Setiap jadwal otomatis tampil di kalender promosi.',
          actions: (DATA.can('promosi', 'w') ? `<button type="button" class="btn btn-primary" id="pr-add">${icon('plus', 18)} Jadwalkan kunjungan</button>` : '') +
            `<button type="button" class="btn btn-outline" data-go="kalender">${icon('calendar-days', 18)} Kalender</button>`
        })}
        <div class="grid g-4">
          ${kpiMini('Total kegiatan', rows.length, 'school', 'var(--primary)', 'Seluruh promosi tercatat')}
          ${ST_PR.map((s) => kpiMini(s, count(rows, (r) => r.Status === s), s === 'Rencana' ? 'clock' : s === 'Batal' ? 'circle-x' : 'circle-check', UI.color(s), pct(count(rows, (r) => r.Status === s), rows.length) + '% dari total')).join('')}
        </div>
        <div class="card filter-card"><div class="filters">
          <div class="seg" id="pr-seg">${[''].concat(ST_PR).map((s) => `<button type="button" data-st="${s}" class="${f.status === s ? 'on' : ''}">${s ? `<i class="sdot" style="background:${UI.color(s)}"></i>` : ''}${s || 'Semua'} <span class="cnt">${s ? count(rows, (r) => r.Status === s) : rows.length}</span></button>`).join('')}</div>
          <label class="search">${icon('search', 18)}<input id="pr-q" type="search" placeholder="Cari sekolah, kota, atau PIC…" value="${esc(f.q)}" aria-label="Cari promosi"></label>
          ${DATA.select('pr-bln', 'Semua bulan', bulanOpts, f.bulan, 'Bulan')}
        </div></div>
        <section class="card list-card" id="pr-res"></section>`;
      const res = UI.$('#pr-res', el);
      const go = () => this.results(res);
      UI.$('#pr-add', el) && (UI.$('#pr-add', el).onclick = () => FORMS.promosiForm());
      UI.$('[data-go]', el).onclick = () => APP.go('kalender', { mode: 'promosi' });
      UI.$('#pr-seg', el).onclick = (e) => {
        const b = e.target.closest('[data-st]'); if (!b) return;
        f.status = b.dataset.st; f.page = 1;
        UI.$$('#pr-seg button', el).forEach((x) => x.classList.toggle('on', x === b));
        go();
      };
      UI.$('#pr-q', el).oninput = UI.debounce((e) => { f.q = e.target.value.trim(); f.page = 1; go(); }, 150);
      UI.$('#pr-bln', el).onchange = (e) => { f.bulan = e.target.value; f.page = 1; go(); };
      bindPager(res, f, go);
      res.addEventListener('click', (e) => {
        if (e.target.closest('[data-page],[data-sort]')) return;
        const row = e.target.closest('[data-id]'); if (!row) return;
        const id = row.dataset.id, act = e.target.closest('[data-act]');
        if (act) {
          const a = act.dataset.act;
          if (a === 'berkas') DATA.berkas('promosi', id);
          if (a === 'edit') FORMS.promosiForm(id);
          if (a === 'del') DATA.del('promosi', id).then((ok) => ok && this.render(el));
          return;
        }
        FORMS.promosiDetail(id);
      });
      go();
    },
    results(res) {
      const f = STATE.f.promosi;
      let rows = STATE.promosi.filter((r) => (!f.status || r.Status === f.status) &&
        (!f.bulan || (r._tgl || '').slice(0, 7) === f.bulan) &&
        (!f.q || DATA.matchQ(f.q, [r.ID_Promosi, r.Nama_Sekolah, r.Kota_Alamat, r.PIC])));
      rows = DATA.sortRows(rows, f);
      if (!rows.length) {
        res.innerHTML = STATE.promosi.length ? UI.empty('Tidak ada yang cocok', 'Coba ubah kata kunci atau filter.') : UI.empty('Belum ada jadwal promosi', DATA.can('promosi', 'w') ? 'Jadwalkan kunjungan sekolah pertama.' : 'Jadwal akan tampil di sini setelah diinput Admin atau WD IV.');
        return;
      }
      const p = DATA.paginate(rows, f);
      const bukti = (r) => r.Link_Bukti ? `<button type="button" class="chip chip-blue chip-btn" data-act="berkas">${icon('eye', 12)} Lihat bukti</button>` : '<span class="muted sm">Belum diunggah</span>';
      const acts = (r) => (DATA.can('promosi', 'w') || DATA.can('promosi', 'd')) ? `<span class="row-acts">
        ${DATA.can('promosi', 'w') ? `<button type="button" class="icon-btn sm" data-act="edit" title="Ubah" aria-label="Ubah">${icon('pencil', 17)}</button>` : ''}
        ${DATA.can('promosi', 'd') ? `<button type="button" class="icon-btn sm danger" data-act="del" title="Hapus" aria-label="Hapus">${icon('trash-2', 17)}</button>` : ''}</span>` : '';
      const tglCell = (r) => r.Tanggal_Realisasi && r.Tanggal_Realisasi !== r.Tanggal_Rencana
        ? `<div>${UI.tgl(r.Tanggal_Realisasi)}</div><div class="t-sub">Rencana ${UI.tgl(r.Tanggal_Rencana)}</div>`
        : `<div>${UI.tgl(r.Tanggal_Rencana)}</div><div class="t-sub">${r.Status === 'Rencana' ? (UI.sisaHari(r.Tanggal_Rencana) >= 0 ? (UI.sisaHari(r.Tanggal_Rencana) === 0 ? 'Hari ini' : UI.sisaHari(r.Tanggal_Rencana) + ' hari lagi') : 'Lewat jadwal — perbarui status') : r.Status === 'Terlaksana' ? 'Sesuai rencana' : ''}</div>`;
      res.innerHTML = `
        <div class="list-head"><h2 class="card-title">Daftar kegiatan</h2><span class="chip">${rows.length} hasil</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr>${DATA.sortTh('ID', 'ID_Promosi', f)}${DATA.sortTh('Sekolah & lokasi', 'Nama_Sekolah', f)}${DATA.sortTh('PIC', 'PIC', f)}${DATA.sortTh('Tanggal', '_tgl', f)}<th>Status</th><th>Bukti</th>${DATA.can('promosi', 'w') ? '<th class="ta-r">Aksi</th>' : ''}</tr></thead>
          <tbody>${p.rows.map((r) => `<tr data-id="${esc(r.ID_Promosi)}" class="row-click ${r.Status === 'Batal' ? 'is-batal' : ''}" tabindex="0">
            <td class="mono">${esc(r.ID_Promosi)}</td>
            <td class="w-wide"><div class="t-strong">${esc(r.Nama_Sekolah)}</div><div class="t-sub">${icon('map-pin', 12)} ${esc(r.Kota_Alamat || '-')}</div></td>
            <td>${esc(r.PIC || '-')}</td><td class="nowrap">${tglCell(r)}</td><td>${UI.badge(r.Status)}</td><td>${bukti(r)}</td>${DATA.can('promosi', 'w') ? `<td class="ta-r">${acts(r)}</td>` : ''}</tr>`).join('')}</tbody>
        </table></div>
        <ul class="mlist">${p.rows.map((r) => `<li class="mcard" data-id="${esc(r.ID_Promosi)}" style="--accent:${UI.color(r.Status)}">
          <div class="mcard-top"><span class="avatar sq" style="--av:${UI.color(r.Status)}">${icon(r.Status === 'Terlaksana' ? 'circle-check' : r.Status === 'Batal' ? 'circle-x' : 'clock', 20)}</span>
            <div class="mcard-title"><span class="t-strong ${r.Status === 'Batal' ? 'strike' : ''}">${esc(r.Nama_Sekolah)}</span><span class="t-sub">${esc(r.Kota_Alamat || '-')}</span></div>${UI.badge(r.Status)}</div>
          <div class="chips"><span class="chip">${icon('user-round', 12)} ${esc(r.PIC || '-')}</span><span class="chip">${icon('calendar', 12)} ${UI.tgl(r._tgl)}</span></div>
          <div class="mcard-foot">${bukti(r)}${acts(r)}</div></li>`).join('')}</ul>
        ${DATA.pager(rows.length, f, p.pages, p.start)}`;
    }
  };

  // =========================================================================
  // KALENDER (F6, F7)
  // =========================================================================
  const kalender = {
    title: 'Kalender',
    events(mode) {
      const f = STATE.f.kal, out = [];
      if (mode !== 'promosi' && DATA.can('ks', 'r')) DATA.allDocs().forEach((r) => {
        if (f.dok && r._k !== f.dok) return;
        if (f.kategori && r._m.Kategori_Mitra !== f.kategori) return;
        out.push({ date: r.Akhir, type: 'doc', k: r._k, id: r[DATA.DOCS[r._k].id], status: r.Status_Masa, title: r.Mitra, kind: DATA.DOCS[r._k].label + ' berakhir', sub: r._nomor });
      });
      if (mode !== 'dok') STATE.promosi.forEach((r) => {
        if (f.status && r.Status !== f.status) return;
        out.push({ date: r._tgl, type: 'promosi', id: r.ID_Promosi, status: r.Status, title: r.Nama_Sekolah, kind: 'Promosi sekolah', sub: [r.Kota_Alamat, r.PIC].filter(Boolean).join(' • ') });
      });
      return out.filter((e) => e.date);
    },
    render(el) {
      const f = STATE.f.kal;
      const canKS = DATA.can('ks', 'r');
      const modes = canKS ? [['semua', 'Semua agenda'], ['dok', 'Masa berlaku MoU/MoA/IA'], ['promosi', 'Promosi sekolah']] : [['promosi', 'Promosi sekolah']];
      if (!modes.some((m) => m[0] === f.mode)) f.mode = modes[0][0];
      const t = UI.todayStr();
      if (f.y === null) { f.y = +t.slice(0, 4); f.m = +t.slice(5, 7) - 1; }
      const ym = f.y + '-' + pad(f.m + 1);
      if (!f.sel || f.sel.slice(0, 7) !== ym) f.sel = t.slice(0, 7) === ym ? t : null;

      const all = this.events(f.mode);
      const byDate = {};
      all.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });
      const monthEvs = all.filter((e) => e.date.slice(0, 7) === ym).sort((a, b) => a.date.localeCompare(b.date));
      if (!f.sel && monthEvs.length) f.sel = monthEvs[0].date;

      const first = new Date(f.y, f.m, 1);
      const lead = (first.getDay() + 6) % 7;
      const dim = new Date(f.y, f.m + 1, 0).getDate();
      const cells = [];
      for (let i = 0; i < Math.ceil((lead + dim) / 7) * 7; i++) {
        const d = new Date(f.y, f.m, 1 - lead + i);
        cells.push({ ds: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), day: d.getDate(), out: d.getMonth() !== f.m, wk: d.getDay() === 0 });
      }
      const evCls = (e) => (UI.color(e.status).match(/--([\w-]+)/) || [])[1] || '';
      const showKS = f.mode !== 'promosi', showPR = f.mode !== 'dok';
      const legend = (showKS ? ST_KS.map((s) => [s === 'Kadaluarsa' ? 'Kadaluarsa' : 'Berakhir: ' + s, s]) : []).concat(showPR ? ST_PR.map((s) => ['Promosi ' + s.toLowerCase(), s]) : []);
      const selEvs = f.sel ? (byDate[f.sel] || []) : [];

      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('calendar-days', 14) + ' Kalender terpadu',
          title: 'Kalender Kegiatan & Tenggat',
          lead: canKS ? 'Tanggal berakhirnya MoU, MoA, dan IA serta jadwal promosi sekolah, otomatis dari data yang diinput.' : 'Jadwal promosi sekolah, otomatis dari data yang diinput.',
          actions: DATA.can('promosi', 'w') ? `<button type="button" class="btn btn-primary" id="cal-add">${icon('plus', 18)} Jadwalkan promosi</button>` : ''
        })}
        <div class="card filter-card cal-toolbar">
          ${modes.length > 1 ? `<div class="seg" id="cal-mode">${modes.map(([v, l]) => `<button type="button" data-mode="${v}" class="${f.mode === v ? 'on' : ''}">${l} <span class="cnt">${this.events(v).filter((e) => e.date.slice(0, 7) === ym).length}</span></button>`).join('')}</div>` : ''}
          <div class="cal-filters">
            ${showKS ? DATA.select('cal-dok', 'MoU, MoA & IA', DATA.DOC_KEYS.map((k) => ({ value: k, label: DATA.DOCS[k].label })), f.dok, 'Jenis dokumen') : ''}
            ${showKS ? DATA.select('cal-kat', 'Semua kategori mitra', STATE.options.kategoriMitra, f.kategori) : ''}
            ${showPR ? DATA.select('cal-st', 'Semua status promosi', ST_PR, f.status) : ''}
          </div>
          <div class="cal-nav">
            <button type="button" class="icon-btn" data-nav="-1" aria-label="Bulan sebelumnya">${icon('chevron-left')}</button>
            <h2 class="cal-month">${UI.BULAN[f.m]} ${f.y}</h2>
            <button type="button" class="icon-btn" data-nav="1" aria-label="Bulan berikutnya">${icon('chevron-right')}</button>
            <button type="button" class="btn btn-outline btn-sm" data-nav="0">Hari ini</button>
          </div>
        </div>
        <div class="cal-wrap">
          <section class="card cal">
            <div class="cal-dow">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d, i) => `<span class="${i === 6 ? 'wk' : ''}">${d}</span>`).join('')}</div>
            <div class="cal-grid">${cells.map((c) => {
              const evs = byDate[c.ds] || [];
              return `<button type="button" class="cal-cell ${c.out ? 'out' : ''} ${c.ds === t ? 'today' : ''} ${c.ds === f.sel ? 'sel' : ''} ${c.wk ? 'wk' : ''} ${evs.length ? 'has' : ''}" data-date="${c.ds}" aria-label="${c.day} ${UI.BULAN[+c.ds.slice(5, 7) - 1]}: ${evs.length} agenda" aria-pressed="${c.ds === f.sel}">
                <span class="cal-num">${c.day}</span>
                <span class="cal-evs">${evs.slice(0, 2).map((e) => `<span class="cal-ev ev-${evCls(e)}">${e.type === 'doc' ? icon('handshake', 11) : icon('megaphone', 11)}<span class="ev-t">${esc(e.title)}</span></span>`).join('')}${evs.length > 2 ? `<span class="cal-more">+${evs.length - 2} lagi</span>` : ''}</span>
                <span class="cal-dots">${evs.slice(0, 4).map((e) => `<i style="background:${UI.color(e.status)}"></i>`).join('')}</span>
              </button>`;
            }).join('')}</div>
            <div class="cal-legend">${legend.map(([l, s]) => `<span><i style="background:${UI.color(s)}"></i>${esc(l)}</span>`).join('')}</div>
          </section>
          <aside class="card cal-side">
            <div class="card-head"><div><div class="eyebrow">Agenda terpilih</div><h2 class="card-title">${f.sel ? UI.tgl(f.sel, true) : 'Pilih tanggal'}</h2></div>${selEvs.length ? `<span class="chip">${selEvs.length} agenda</span>` : ''}</div>
            ${f.sel ? (selEvs.length ? `<ul class="agenda">${selEvs.map((e) => `<li><button type="button" class="ag-item" data-ev="${e.type === 'doc' ? e.k : 'promosi'}:${esc(e.id)}" style="--accent:${UI.color(e.status)}">
                <span class="ag-kind">${esc(e.kind)}</span><span class="t-strong">${esc(e.title)}</span><span class="t-sub">${esc(e.sub)}</span>
                <span class="ag-foot">${UI.badge(e.status)}${e.type === 'doc' ? `<span class="t-sub">${esc(UI.sisaTeks(e.date).replace(/ \(.*\)/, ''))}</span>` : ''}</span></button></li>`).join('')}</ul>`
              : `<div class="mini-empty">${icon('calendar', 20)}<span>Tidak ada agenda pada tanggal ini.</span></div>`) : `<div class="mini-empty">${icon('calendar', 20)}<span>Ketuk tanggal untuk melihat agendanya.</span></div>`}
            <div class="month-sum"><div class="eyebrow">Ringkasan ${UI.BULAN[f.m]}</div>
              ${monthEvs.length ? `<ul>${(showKS ? DATA.DOC_KEYS.map((k) => [k, 'Tenggat ' + DATA.DOCS[k].label]) : []).concat(showPR ? [['promosi', 'Kegiatan promosi']] : []).map(([k, l]) => `<li><span>${l}</span><b>${monthEvs.filter((e) => (e.k || e.type) === k).length}</b></li>`).join('')}</ul>` : '<p class="t-sub">Tidak ada agenda bulan ini.</p>'}
            </div>
          </aside>
        </div>`;

      const rr = () => this.render(el);
      UI.$('#cal-add', el) && (UI.$('#cal-add', el).onclick = () => FORMS.promosiForm(null, f.sel && f.sel >= t ? { Tanggal_Rencana: f.sel } : {}));
      UI.$('#cal-mode', el) && (UI.$('#cal-mode', el).onclick = (e) => { const b = e.target.closest('[data-mode]'); if (b) { f.mode = b.dataset.mode; f.sel = null; rr(); } });
      UI.$('#cal-dok', el) && (UI.$('#cal-dok', el).onchange = (e) => { f.dok = e.target.value; rr(); });
      UI.$('#cal-kat', el) && (UI.$('#cal-kat', el).onchange = (e) => { f.kategori = e.target.value; rr(); });
      UI.$('#cal-st', el) && (UI.$('#cal-st', el).onchange = (e) => { f.status = e.target.value; rr(); });
      UI.$$('[data-nav]', el).forEach((b) => {
        b.onclick = () => {
          const n = +b.dataset.nav;
          if (!n) { f.y = +t.slice(0, 4); f.m = +t.slice(5, 7) - 1; f.sel = t; }
          else { const d = new Date(f.y, f.m + n, 1); f.y = d.getFullYear(); f.m = d.getMonth(); f.sel = null; }
          rr();
        };
      });
      UI.$('.cal-grid', el).onclick = (e) => {
        const c = e.target.closest('[data-date]'); if (!c) return;
        const ds = c.dataset.date;
        if (ds.slice(0, 7) !== ym) { f.y = +ds.slice(0, 4); f.m = +ds.slice(5, 7) - 1; }
        f.sel = ds;
        rr();
        if (window.innerWidth < 1024) { const side = UI.$('.cal-side', el); side && side.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      };
      UI.$('.cal-side', el).onclick = (e) => {
        const b = e.target.closest('[data-ev]'); if (!b) return;
        const [type, id] = b.dataset.ev.split(':');
        type === 'promosi' ? FORMS.promosiDetail(id) : DOCSUI.docDetail(type, id);
      };
    }
  };

  // =========================================================================
  // LAPORAN (F11)
  // =========================================================================
  const REPORTS = [
    { id: 'aktif', title: 'Rekap dokumen yang berlaku', desc: 'MoU, MoA, dan IA yang masih berlaku (Aktif, Akan Berakhir, Segera Berakhir).', icon: 'handshake', accent: 'var(--primary)', tag: 'Rekap', filters: ['dokumen', 'kategori', 'lingkup', 'tahun'] },
    { id: 'berakhir', title: 'Akan & sudah berakhir', desc: 'Daftar prioritas perpanjangan atau penutupan kerja sama.', icon: 'triangle-alert', accent: 'var(--st-segera)', tag: 'Prioritas', filters: ['dokumen', 'kategori', 'statusBerakhir'] },
    { id: 'promosi', title: 'Rekap kegiatan promosi', desc: 'Kunjungan promosi sekolah pada periode tertentu.', icon: 'megaphone', accent: 'var(--pr-terlaksana)', tag: 'Promosi', filters: ['dari', 'sampai', 'statusPromosi'] },
    { id: 'belumIA', title: 'MoU & MoA belum memiliki IA', desc: 'Dokumen kerja sama yang belum punya Implementation Agreement (IA lewat MoA ikut dihitung untuk MoU).', icon: 'file-check', accent: 'var(--pr-rencana)', tag: 'IA', filters: ['kategori', 'lingkup', 'kadaluarsa'] }
  ];

  const laporan = {
    title: 'Laporan',
    previewCount(id, f) {
      if (id === 'promosi') return STATE.promosi.filter((r) => (!f.dari || r._tgl >= f.dari) && (!f.sampai || r._tgl <= f.sampai) && (!f.status || r.Status === f.status)).length;
      const docs = id === 'belumIA' ? STATE.mou.concat(STATE.moa) : (f.dokumen ? STATE[f.dokumen] : DATA.allDocs());
      return docs.filter((r) => {
        if (f.kategori && r._m.Kategori_Mitra !== f.kategori) return false;
        if (f.lingkup && r._m.Lingkup !== f.lingkup) return false;
        if (f.tahun && String(r.Tahun) !== String(f.tahun)) return false;
        if (id === 'aktif') return r.Status_Masa !== 'Kadaluarsa';
        if (id === 'berakhir') return r.Status_Masa !== 'Aktif' && (!f.status || r.Status_Masa === f.status);
        return !r._iaTotal && (f.termasukKadaluarsa || r.Status_Masa !== 'Kadaluarsa');
      }).length;
    },
    render(el) {
      const tahun = [...new Set(DATA.allDocs().map((r) => String(r.Tahun)).filter(Boolean))].sort().reverse();
      const t = UI.todayStr();
      const awalTahun = t.slice(0, 4) + '-01-01';
      const ctl = {
        dokumen: (id) => `<div class="field sm"><label for="${id}-dk">Dokumen</label>${DATA.select(id + '-dk', 'MoU, MoA & IA', DATA.DOC_KEYS.map((k) => ({ value: k, label: DATA.DOCS[k].label })), '').replace('<select', '<select data-k="dokumen"')}</div>`,
        kategori: (id) => `<div class="field sm"><label for="${id}-kt">Kategori mitra</label>${DATA.select(id + '-kt', 'Semua kategori', STATE.options.kategoriMitra, '').replace('<select', '<select data-k="kategori"')}</div>`,
        lingkup: (id) => `<div class="field sm"><label for="${id}-lk">Lingkup</label>${DATA.select(id + '-lk', 'Semua lingkup', STATE.options.lingkup, '').replace('<select', '<select data-k="lingkup"')}</div>`,
        tahun: (id) => `<div class="field sm"><label for="${id}-th">Tahun mulai</label>${DATA.select(id + '-th', 'Semua tahun', tahun, '').replace('<select', '<select data-k="tahun"')}</div>`,
        statusBerakhir: (id) => `<div class="field sm"><label for="${id}-st">Status</label>${DATA.select(id + '-st', 'Akan, segera & sudah berakhir', ['Akan Berakhir', 'Segera Berakhir', 'Kadaluarsa'], '').replace('<select', '<select data-k="status"')}</div>`,
        statusPromosi: (id) => `<div class="field sm"><label for="${id}-st">Status</label>${DATA.select(id + '-st', 'Semua status', ST_PR, '').replace('<select', '<select data-k="status"')}</div>`,
        dari: (id) => `<div class="field sm"><label for="${id}-dari">Dari tanggal</label><input type="date" class="input" id="${id}-dari" data-k="dari" value="${awalTahun}"></div>`,
        sampai: (id) => `<div class="field sm"><label for="${id}-sampai">Sampai tanggal</label><input type="date" class="input" id="${id}-sampai" data-k="sampai" value="${t}"></div>`,
        kadaluarsa: (id) => `<div class="field sm"><label class="toggle sm"><input type="checkbox" data-k="termasukKadaluarsa"><span class="tg"></span><span><b>Sertakan yang kadaluarsa</b></span></label></div>`
      };
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('file-text', 14) + ' Laporan & arsip',
          title: 'Laporan PDF',
          lead: 'Pilih filter lalu cetak. PDF langsung terunduh dan otomatis tersimpan di folder Laporan Google Drive.',
          actions: `<button type="button" class="btn btn-outline" id="lap-up">${icon('upload', 18)} Unggah laporan</button><input type="file" id="lap-file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" hidden>`
        })}
        <div class="grid g-2 rep-grid">${REPORTS.map((r) => `<section class="card rep" data-rep="${r.id}" style="--accent:${r.accent}">
          <div class="rep-head"><span class="rep-ic">${icon(r.icon, 20)}</span><div><h2 class="card-title">${esc(r.title)}</h2><p class="card-sub">${esc(r.desc)}</p></div><span class="chip">${r.tag}</span></div>
          <div class="rep-filters">${r.filters.map((k) => ctl[k](r.id)).join('')}</div>
          <div class="rep-foot"><span class="rep-count" aria-live="polite"></span><button type="button" class="btn btn-navy" data-gen>${icon('printer', 16)} Cetak PDF</button></div>
        </section>`).join('')}</div>
        <section class="card export-card">
          <div class="rep-head"><span class="rep-ic" style="--accent:var(--st-aktif)">${icon('download', 20)}</span><div><h2 class="card-title">Ekspor Excel format SIMKERMA</h2>
            <p class="card-sub">Semua MoU, MoA, IA, dan Mitra dalam satu berkas Excel dengan kolom seperti data SIMKERMA (NOMOR, JUDUL, AWAL, AKHIR, DIKJAR, …, URL DOKUMEN), ditambah status masa berlaku.</p></div>
            <button type="button" class="btn btn-outline" id="lap-xlsx">${icon('download', 16)} Unduh Excel</button></div>
        </section>
        <section class="card" id="arsip">
          <div class="card-head"><div><h2 class="card-title">${icon('folder-open', 18)} Arsip laporan</h2><p class="card-sub">Isi folder SIMPEKA / Laporan di Google Drive</p></div>
            <button type="button" class="btn btn-ghost btn-sm" id="lap-ref">${icon('refresh-cw', 15)} Muat ulang</button></div>
          <div id="arsip-list"><div class="sk-list">${'<div class="sk"></div>'.repeat(3)}</div></div>
        </section>`;

      const readF = (card) => {
        const f = {};
        UI.$$('[data-k]', card).forEach((i) => { f[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; });
        return f;
      };
      UI.$$('.rep', el).forEach((card) => {
        const id = card.dataset.rep;
        const upd = () => {
          const n = this.previewCount(id, readF(card));
          UI.$('.rep-count', card).innerHTML = `<b>${n}</b> ${id === 'promosi' ? 'kegiatan' : 'dokumen'} akan dicetak`;
        };
        UI.$$('[data-k]', card).forEach((i) => i.addEventListener('change', upd));
        upd();
        UI.$('[data-gen]', card).onclick = async () => {
          const f = readF(card);
          if (f.dari && f.sampai && f.sampai < f.dari) return UI.toast('Tanggal "sampai" tidak boleh sebelum "dari".', 'error');
          UI.loading(true, 'Menyusun laporan PDF…');
          try {
            const r = await API.call('laporan.generate', { jenis: id, filter: f });
            UI.downloadB64(r);
            UI.toast('Laporan diunduh dan disimpan di Drive • ' + r.jumlah + ' baris');
            this.loadArsip(el, true);
          } catch (e) { UI.toast(e.message, 'error'); }
          finally { UI.loading(false); }
        };
      });

      const fileIn = UI.$('#lap-file', el);
      UI.$('#lap-up', el).onclick = () => fileIn.click();
      fileIn.onchange = async () => {
        const file = fileIn.files[0]; fileIn.value = '';
        if (!file) return;
        if (!/\.(pdf|jpe?g)$/i.test(file.name)) return UI.toast('Format harus PDF atau JPG.', 'error');
        if (file.size > STATE.options.maksMB * 1048576) return UI.toast('Ukuran melebihi ' + STATE.options.maksMB + ' MB.', 'error');
        UI.loading(true, 'Mengunggah ' + file.name + '…');
        try {
          await API.call('laporan.upload', { namaBerkas: file.name, mimeType: /\.pdf$/i.test(file.name) ? 'application/pdf' : 'image/jpeg', base64: await UI.fileToBase64(file) });
          UI.toast('Laporan diunggah ke folder Laporan');
          this.loadArsip(el, true);
        } catch (e) { UI.toast(e.message, 'error'); }
        finally { UI.loading(false); }
      };
      UI.$('#lap-ref', el).onclick = () => this.loadArsip(el, true);
      UI.$('#lap-xlsx', el).onclick = async () => {
        UI.loading(true, 'Menyusun berkas Excel…');
        try { await IMPORTER.ekspor(); UI.toast('Berkas Excel diunduh'); }
        catch (e) { UI.toast(e.message, 'error'); }
        finally { UI.loading(false); }
      };
      UI.$('#arsip-list', el).onclick = async (e) => {
        const b = e.target.closest('[data-file]'); if (!b) return;
        UI.loading(true, 'Mengambil berkas…');
        try {
          const f = await API.call('laporan.get', { fileId: b.dataset.file });
          b.dataset.mode === 'dl' ? UI.downloadB64(f) : UI.viewFile(f);
        } catch (err) { UI.toast(err.message, 'error'); }
        finally { UI.loading(false); }
      };
      this.loadArsip(el, false);
    },
    async loadArsip(el, force) {
      const box = UI.$('#arsip-list', el);
      if (!box) return;
      if (force || !STATE.laporan) {
        if (force) box.innerHTML = `<div class="sk-list">${'<div class="sk"></div>'.repeat(3)}</div>`;
        try { STATE.laporan = await API.call('laporan.list'); }
        catch (e) { box.innerHTML = `<div class="note warn">${icon('triangle-alert', 16)}<span>${esc(e.message)}</span></div>`; return; }
      }
      if (!document.body.contains(box)) return;
      const files = STATE.laporan;
      box.innerHTML = files.length ? `<ul class="file-list">${files.map((f) => `<li>
          <span class="file-ic ${/pdf/.test(f.mimeType) ? 'pdf' : ''}">${icon(/pdf/.test(f.mimeType) ? 'file-text' : 'file', 18)}</span>
          <span class="file-main"><span class="t-strong clamp1">${esc(f.nama)}</span><span class="t-sub">${UI.tgl(f.dibuat)} ${esc(f.dibuat.slice(11))} • ${UI.fmtSize(f.ukuran)}${/^Unggahan_/.test(f.nama) ? ' • unggahan' : ''}</span></span>
          <button type="button" class="icon-btn sm" data-file="${esc(f.id)}" data-mode="view" title="Lihat" aria-label="Lihat ${esc(f.nama)}">${icon('eye', 17)}</button>
          <button type="button" class="icon-btn sm" data-file="${esc(f.id)}" data-mode="dl" title="Unduh" aria-label="Unduh ${esc(f.nama)}">${icon('download', 17)}</button></li>`).join('')}</ul>`
        : UI.empty('Arsip masih kosong', 'Laporan yang dicetak atau diunggah akan muncul di sini.');
    }
  };

  // =========================================================================
  // IMPOR DATA (Admin) — dari Excel ekspor SIMKERMA
  // =========================================================================
  const impor = {
    title: 'Impor Data',
    st: { parsed: null, hasil: null, mode: 'lewati', nama: '', siap: false, filter: '' },
    render(el) {
      const s = this.st;
      const J = { mou: 'MoU', moa: 'MoA', ia: 'IA' };
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('upload', 14) + ' Khusus Admin',
          title: 'Impor Data dari Excel',
          lead: 'Masukkan data MoU, MoA, dan IA sekaligus dari berkas Excel ekspor SIMKERMA. Data diperiksa dulu; tidak ada yang tersimpan sebelum Anda menekan "Impor sekarang".'
        })}
        <div class="steps">
          <div class="step ${s.parsed && s.parsed.jenis === 'mou' ? 'on' : ''}"><b>1</b><span>Impor <b>MoU</b> lebih dulu</span></div>
          <div class="step ${s.parsed && s.parsed.jenis === 'moa' ? 'on' : ''}"><b>2</b><span>Lalu <b>MoA</b> (mencari MoU induk dari kolom NOMOR MOU)</span></div>
          <div class="step ${s.parsed && s.parsed.jenis === 'ia' ? 'on' : ''}"><b>3</b><span>Terakhir <b>IA</b> (mencari induk dari kolom NOMOR MoA)</span></div>
        </div>
        <section class="card imp-card">
          <div class="imp-grid">
            <div>
              <label class="drop" for="imp-file" data-drop="imp-file">
                <span class="drop-ic">${icon('upload', 22)}</span>
                <span class="drop-t">${s.nama ? esc(s.nama) : 'Pilih berkas Excel (.xlsx)'}</span>
                <span class="drop-s">Jenis dokumen dikenali otomatis dari kolom NOMOR MOU / NOMOR MOA / NOMOR IA.</span>
              </label>
              <input type="file" id="imp-file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
            </div>
            <div class="imp-opts">
              <div class="field"><label>Jika nomor sudah ada di SIMPEKA</label>
                <div class="seg seg-form"><label><input type="radio" name="imp-mode" value="lewati" ${s.mode === 'lewati' ? 'checked' : ''}><span>Lewati</span></label><label><input type="radio" name="imp-mode" value="perbarui" ${s.mode === 'perbarui' ? 'checked' : ''}><span>Perbarui datanya</span></label></div>
                <p class="hint">"Perbarui" menimpa isi dokumen lama dengan isi Excel; tautan/berkas lama tetap dipertahankan bila kolom URL kosong.</p></div>
            </div>
          </div>
          <div id="imp-info"></div>
        </section>
        <section class="card list-card" id="imp-res" ${s.parsed ? '' : 'hidden'}></section>`;

      const fileIn = UI.$('#imp-file', el);
      const drop = UI.$('[data-drop="imp-file"]', el);
      const baca = async (file) => {
        if (!file) return;
        if (!/\.xlsx?$/i.test(file.name)) return UI.toast('Pilih berkas Excel (.xlsx).', 'error');
        UI.loading(true, 'Membaca ' + file.name + '…');
        try {
          s.file = file; s.nama = file.name;
          s.parsed = await IMPORTER.parse(file);
          s.hasil = null; s.siap = false; s.filter = '';
          this.render(el);
          await this.periksa(el);
        } catch (e) { s.parsed = null; s.hasil = null; s.nama = ''; this.render(el); UI.toast(e.message, 'error'); }
        finally { UI.loading(false); fileIn.value = ''; }
      };
      fileIn.onchange = () => baca(fileIn.files[0]);
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
      drop.addEventListener('drop', (e) => baca(e.dataTransfer.files[0]));
      UI.$$('[name="imp-mode"]', el).forEach((x) => x.addEventListener('change', async () => { s.mode = x.value; if (s.parsed) await this.periksa(el); }));
      if (s.parsed) this.tampil(el);
    },

    async periksa(el) {
      const s = this.st;
      UI.loading(true, 'Memeriksa ' + s.parsed.rows.length + ' baris…');
      try {
        s.hasil = await API.call('impor.jalankan', { jenis: s.parsed.jenis, mode: s.mode, dryRun: true, rows: s.parsed.rows });
        s.siap = true;
      } catch (e) { UI.toast(e.message, 'error'); s.hasil = null; s.siap = false; }
      finally { UI.loading(false); }
      this.tampil(el);
    },

    tampil(el) {
      const s = this.st, p = s.parsed, J = { mou: 'MoU', moa: 'MoA', ia: 'IA' };
      const info = UI.$('#imp-info', el), res = UI.$('#imp-res', el);
      if (!p || !info) return;
      info.innerHTML = `<div class="imp-sum">
          <span class="chip chip-doc doc-${p.jenis}">${J[p.jenis]}</span>
          <span><b>${p.rows.length}</b> baris data dari sheet "${esc(p.sheet)}"</span>
          <span class="t-sub">Kolom dikenali: ${p.dikenali.length}${p.tidakDikenali.length ? ` • diabaikan: ${p.tidakDikenali.map(esc).join(', ')}` : ''}</span>
        </div>`;
      res.hidden = false;
      if (!s.hasil) { res.innerHTML = UI.empty('Belum diperiksa', 'Tekan Periksa ulang.', `<button type="button" class="btn btn-primary" id="imp-cek">${icon('refresh-cw', 16)} Periksa ulang</button>`); UI.$('#imp-cek', el).onclick = () => this.periksa(el); return; }
      const h = s.hasil, r = h.ringkasan;
      const label = { baru: 'Baru', perbarui: 'Diperbarui', lewati: 'Dilewati', gagal: 'Gagal' };
      const cls = { baru: 'st-aktif', perbarui: 'pr-rencana', lewati: 'pr-batal', gagal: 'st-kadaluarsa' };
      const rows = h.hasil.filter((x) => !s.filter || (s.filter === 'warn' ? x.peringatan.length : x.status === s.filter));
      const bisa = r.baru + r.perbarui;
      res.innerHTML = `
        <div class="list-head wrap"><h2 class="card-title">${h.dryRun ? 'Hasil pemeriksaan' : 'Hasil impor'}</h2>
          <div class="seg" id="imp-f">${[['', 'Semua', h.hasil.length], ['baru', 'Baru', r.baru], ['perbarui', 'Diperbarui', r.perbarui], ['lewati', 'Dilewati', r.lewati], ['gagal', 'Gagal', r.gagal], ['warn', 'Ada catatan', h.hasil.filter((x) => x.peringatan.length).length]]
            .filter(([v, , n]) => !v || n).map(([v, l, n]) => `<button type="button" data-f="${v}" class="${s.filter === v ? 'on' : ''}">${l} <span class="cnt">${n}</span></button>`).join('')}</div></div>
        ${r.mitraBaru ? `<div class="note pad-x">${icon('building-2', 16)}<span>${r.mitraBaru} mitra baru akan otomatis dibuat di Master Mitra (memakai kolom JENIS MITRA, KATEGORI MITRA, NEGARA, BENUA, dan lingkup).</span></div>` : ''}
        ${r.gagal ? `<div class="note warn pad-x">${icon('triangle-alert', 16)}<span>${r.gagal} baris gagal dan <b>tidak</b> akan diimpor. Perbaiki di Excel lalu unggah ulang, atau impor dulu baris yang valid${p.jenis !== 'mou' ? '. Bila pesan "induk belum ada", impor berkas MoU/MoA terlebih dahulu' : ''}.</span></div>` : ''}
        <div class="tbl-wrap show-sm"><table class="tbl tbl-tight">
          <thead><tr><th>Baris</th><th>Nomor</th><th>Hasil</th><th>Keterangan</th></tr></thead>
          <tbody>${rows.map((x) => `<tr><td class="mono">${x.baris}</td><td class="w-nomor"><span class="mono sm">${DATA.nomorHtml(x.nomor)}</span></td>
            <td><span class="badge ${cls[x.status]}">${label[x.status]}</span></td>
            <td>${esc(x.pesan)}${x.peringatan.map((w) => `<div class="t-sub warn-t">${icon('info', 12)} ${esc(w)}</div>`).join('')}</td></tr>`).join('')}</tbody>
        </table></div>
        <div class="imp-foot">
          ${h.dryRun ? `<span class="t-sub">${bisa} dari ${h.hasil.length} baris siap diimpor${r.lewati ? ` • ${r.lewati} dilewati karena nomor sudah ada` : ''}.</span>
            <span class="spacer"></span>
            <button type="button" class="btn btn-outline" id="imp-cek">${icon('refresh-cw', 16)} Periksa ulang</button>
            <button type="button" class="btn btn-primary" id="imp-go" ${bisa ? '' : 'disabled'}>${icon('upload', 16)} Impor sekarang (${bisa})</button>`
          : `<span class="t-sub">${icon('circle-check', 14)} Selesai: ${r.baru} baru, ${r.perbarui} diperbarui${r.mitraBaru ? ', ' + r.mitraBaru + ' mitra baru' : ''}.</span><span class="spacer"></span>
            ${p.jenis !== 'ia' ? `<span class="t-sub">Berikutnya: impor ${p.jenis === 'mou' ? 'MoA' : 'IA'}.</span>` : ''}
            <button type="button" class="btn btn-primary" id="imp-lihat">${icon('arrow-right', 16)} Lihat data ${J[p.jenis]}</button>`}
        </div>`;
      UI.$('#imp-f', el).onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) { s.filter = b.dataset.f; this.tampil(el); } };
      const cek = UI.$('#imp-cek', el); if (cek) cek.onclick = () => this.periksa(el);
      const lihat = UI.$('#imp-lihat', el); if (lihat) lihat.onclick = () => { const j = p.jenis; this.st = { parsed: null, hasil: null, mode: s.mode, nama: '', siap: false, filter: '' }; APP.go(j, {}); };
      const goBtn = UI.$('#imp-go', el);
      if (goBtn) goBtn.onclick = async () => {
        const ok = await UI.confirmDlg({ title: 'Impor ' + bisa + ' ' + J[p.jenis] + '?', message: (r.baru ? r.baru + ' data baru ditambahkan' : '') + (r.perbarui ? (r.baru ? ', ' : '') + r.perbarui + ' data diperbarui' : '') + (r.mitraBaru ? ', dan ' + r.mitraBaru + ' mitra baru dibuat' : '') + '. Baris yang gagal tidak diimpor.', okText: 'Impor sekarang' });
        if (!ok) return;
        UI.loading(true, 'Mengimpor ' + bisa + ' baris…');
        try {
          s.hasil = await API.call('impor.jalankan', { jenis: p.jenis, mode: s.mode, dryRun: false, rows: p.rows });
          s.filter = '';
          UI.toast('Impor selesai: ' + s.hasil.ringkasan.baru + ' baru, ' + s.hasil.ringkasan.perbarui + ' diperbarui');
          await APP.refresh(true);
        } catch (e) { UI.toast(e.message, 'error'); }
        finally { UI.loading(false); }
      };
    }
  };

  // =========================================================================
  // PENGGUNA (F12)
  // =========================================================================
  const pengguna = {
    title: 'Pengguna',
    render(el) {
      const users = STATE.pengguna;
      const f = STATE.f.users;
      const roleCard = (p, ic, col) => {
        const n = count(users, (u) => u.Peran === p && u.Status === 'Aktif');
        return `<div class="card role-card" style="--accent:${col}"><div class="rc-top"><span class="rep-ic">${icon(ic, 20)}</span><span class="chip">${n} aktif</span></div>
          <h3>${DATA.PERAN_LABEL[p]}</h3><p class="card-sub">${{ Admin: 'Akses penuh: lihat, tambah, ubah, hapus data, kelola pengguna.', WD_IV: 'Lihat, tambah, dan ubah seluruh data serta cetak laporan. Tanpa hak hapus.', Tim_Promosi: 'Hanya melihat dashboard, daftar, dan kalender promosi.' }[p]}</p></div>`;
      };
      el.innerHTML = `
        ${DATA.head({
          eyebrow: icon('shield-check', 14) + ' Hak akses',
          title: 'Manajemen Pengguna',
          lead: 'Hanya akun yang terdaftar di sini yang dapat masuk ke SIMPEKA. Setiap akun baru mendapat kata sandi sementara yang wajib diganti saat pertama masuk.',
          actions: `<button type="button" class="btn btn-primary" id="u-add">${icon('plus', 18)} Tambah pengguna</button>`
        })}
        <div class="grid g-3">${roleCard('Admin', 'shield-check', 'var(--primary)')}${roleCard('WD_IV', 'user-round', 'var(--c2)')}${roleCard('Tim_Promosi', 'megaphone', 'var(--pr-rencana)')}</div>
        <div class="card filter-card"><div class="filters"><label class="search">${icon('search', 18)}<input id="u-q" type="search" placeholder="Cari nama atau email…" value="${esc(f.q)}" aria-label="Cari pengguna"></label></div></div>
        <section class="card list-card" id="u-res"></section>
        <div class="note">${icon('info', 16)}<span>Perubahan peran atau status berlaku seketika. Pengguna yang lupa kata sandi: tekan ikon kunci untuk mereset. Akun yang salah kata sandi 5 kali terkunci 15 menit; reset juga membuka kunci itu.</span></div>`;
      const res = UI.$('#u-res', el);
      const go = () => this.results(res);
      UI.$('#u-add', el).onclick = () => FORMS.userForm();
      UI.$('#u-q', el).oninput = UI.debounce((e) => { f.q = e.target.value.trim(); go(); }, 150);
      res.onclick = async (e) => {
        const row = e.target.closest('[data-email]'); if (!row) return;
        const email = row.dataset.email, act = e.target.closest('[data-act]');
        if (!act || act.dataset.act === 'edit') return FORMS.userForm(email);
        if (act.dataset.act === 'reset') return FORMS.resetSandi(email);
        if (act.dataset.act === 'toggle') {
          const u = users.find((x) => x.Email === email);
          const next = u.Status === 'Aktif' ? 'Nonaktif' : 'Aktif';
          if (next === 'Nonaktif' && !(await UI.confirmDlg({ title: 'Nonaktifkan ' + u.Nama + '?', message: esc(email) + ' tidak dapat masuk lagi sampai diaktifkan kembali.', okText: 'Nonaktifkan', danger: true }))) return;
          UI.loading(true, 'Menyimpan…');
          try {
            const res = await API.call('pengguna.save', { Email: u.Email, EmailLama: email, Nama: u.Nama, Peran: u.Peran, Status: next });
            Object.assign(u, res.pengguna);
            UI.toast(u.Nama + (next === 'Aktif' ? ' diaktifkan' : ' dinonaktifkan'));
            this.render(el);
          } catch (err) { UI.toast(err.message, 'error'); }
          finally { UI.loading(false); }
        }
        if (act.dataset.act === 'del') {
          if (!(await UI.confirmDlg({ title: 'Hapus pengguna?', message: esc(email) + ' akan dihapus dari daftar akses.', okText: 'Hapus', danger: true }))) return;
          UI.loading(true, 'Menghapus…');
          try {
            await API.call('pengguna.delete', { Email: email });
            STATE.pengguna = users.filter((x) => x.Email !== email);
            UI.toast('Pengguna dihapus');
            this.render(el);
          } catch (err) { UI.toast(err.message, 'error'); }
          finally { UI.loading(false); }
        }
      };
      go();
    },
    results(res) {
      const f = STATE.f.users;
      const order = { Admin: 0, WD_IV: 1, Tim_Promosi: 2 };
      const rows = STATE.pengguna.filter((u) => !f.q || DATA.matchQ(f.q, [u.Nama, u.Email]))
        .sort((a, b) => (a.Status === b.Status ? 0 : a.Status === 'Aktif' ? -1 : 1) || order[a.Peran] - order[b.Peran] || String(a.Nama).localeCompare(String(b.Nama), 'id'));
      if (!rows.length) { res.innerHTML = UI.empty('Tidak ditemukan', 'Coba kata kunci lain.'); return; }
      const me = STATE.user.email;
      const roleChip = (p) => `<span class="chip ${p === 'Admin' ? 'chip-blue' : p === 'WD_IV' ? 'chip-navy' : 'chip-violet'}">${DATA.PERAN_LABEL[p] || esc(p)}</span>`;
      const st = (u) => u.Status === 'Aktif' ? `<span class="badge st-aktif">${icon('circle-check', 13)}Aktif</span>` : `<span class="badge st-kadaluarsa">${icon('circle-x', 13)}Nonaktif</span>`;
      const sandi = (u) => u.Terkunci ? `<span class="chip chip-red">${icon('lock', 12)} Terkunci</span>`
        : !u.Punya_Sandi ? '<span class="chip chip-warn">Belum ada sandi</span>'
        : u.Wajib_Ganti ? '<span class="chip chip-warn">Sandi sementara</span>' : '<span class="chip chip-green">Sudah diganti</span>';
      const acts = (u) => u.Email === me ? '<span class="chip chip-blue">Anda</span>' : `<span class="row-acts">
        <button type="button" class="icon-btn sm" data-act="edit" title="Ubah" aria-label="Ubah">${icon('pencil', 17)}</button>
        <button type="button" class="icon-btn sm" data-act="reset" title="Reset kata sandi" aria-label="Reset kata sandi">${icon('key-round', 17)}</button>
        <button type="button" class="icon-btn sm" data-act="toggle" title="${u.Status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}" aria-label="${u.Status === 'Aktif' ? 'Nonaktifkan' : 'Aktifkan'}">${icon(u.Status === 'Aktif' ? 'lock' : 'check', 17)}</button>
        <button type="button" class="icon-btn sm danger" data-act="del" title="Hapus" aria-label="Hapus">${icon('trash-2', 17)}</button></span>`;
      res.innerHTML = `
        <div class="list-head"><h2 class="card-title">Daftar pengguna terdaftar</h2><span class="chip">${rows.length} akun</span></div>
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Pengguna</th><th>Peran</th><th>Status</th><th>Kata sandi</th><th>Login terakhir</th><th class="ta-r">Aksi</th></tr></thead>
          <tbody>${rows.map((u) => `<tr data-email="${esc(u.Email)}" class="row-click ${u.Status !== 'Aktif' ? 'is-off' : ''}" tabindex="0">
            <td><div class="user-cell"><span class="avatar">${esc(UI.initials(u.Nama))}</span><span><span class="t-strong">${esc(u.Nama)}</span><span class="t-sub">${esc(u.Email)}</span></span></div></td>
            <td>${roleChip(u.Peran)}</td><td>${st(u)}</td><td>${sandi(u)}</td>
            <td class="nowrap t-sub">${u.Login_Terakhir ? UI.tgl(u.Login_Terakhir) + '<br>' + esc(u.Login_Terakhir.slice(11)) + ' WIB' : 'Belum pernah'}</td><td class="ta-r">${acts(u)}</td></tr>`).join('')}</tbody>
        </table></div>
        <ul class="mlist">${rows.map((u) => `<li class="mcard ${u.Status !== 'Aktif' ? 'is-off' : ''}" data-email="${esc(u.Email)}" style="--accent:${u.Status === 'Aktif' ? 'var(--st-aktif)' : 'var(--st-kadaluarsa)'}">
          <div class="mcard-top"><span class="avatar">${esc(UI.initials(u.Nama))}</span><div class="mcard-title"><span class="t-strong">${esc(u.Nama)}</span><span class="t-sub">${esc(u.Email)}</span></div>${st(u)}</div>
          <div class="mcard-foot"><span class="chips">${roleChip(u.Peran)}${sandi(u)}</span>${acts(u)}</div></li>`).join('')}</ul>`;
    }
  };

  return { dashboard, mitra, mou: docPage('mou'), moa: docPage('moa'), ia: docPage('ia'), promosi, kalender, laporan, impor, pengguna };
})();
