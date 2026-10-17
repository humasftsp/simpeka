/**
 * DOCS — panel detail & formulir Master Mitra serta dokumen MoU, MoA, IA.
 * Relasi: Mitra → MoU → MoA → IA. MoA boleh tanpa MoU; IA boleh ke MoA, ke MoU, atau mandiri.
 */
const DOCSUI = (() => {
  const { esc, icon } = UI;
  const F = FORMS;
  const D = () => DATA.DOCS;

  // ---------------------------------------------------------------------
  // Pilihan bertelusur: kotak cari + <select> biasa (ramah ponsel)
  // ---------------------------------------------------------------------
  function combo(name, id, ph, options, val, attrs) {
    return `<div class="combo">
      <label class="search sm">${icon('search', 16)}<input type="search" class="combo-q" data-combo="${id}" placeholder="Ketik untuk mencari…" aria-label="Cari ${esc(ph)}" autocomplete="off"></label>
      <div class="select-wrap"><select id="${id}" name="${name}" class="select" ${attrs || ''}><option value="">${esc(ph)}</option>${options.map((o) =>
        `<option value="${esc(o.value)}" ${String(o.value) === String(val) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>${icon('chevron-down', 16, 'sel-caret')}</div>
    </div>`;
  }
  function bindCombo(root) {
    UI.$$('[data-combo]', root).forEach((q) => {
      const sel = UI.$('#' + q.dataset.combo, root);
      const all = Array.from(sel.options).map((o) => ({ v: o.value, t: o.textContent }));
      q.addEventListener('input', () => {
        const s = q.value.trim().toLowerCase();
        const cur = sel.value;
        sel.innerHTML = all.filter((o, i) => i === 0 || !s || o.t.toLowerCase().indexOf(s) >= 0)
          .map((o) => `<option value="${esc(o.v)}">${esc(o.t)}</option>`).join('');
        if (all.some((o) => o.v === cur) && Array.from(sel.options).some((o) => o.value === cur)) sel.value = cur;
        else if (s && sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event('change')); }
      });
    });
  }

  const mitraOpts = () => STATE.mitra.slice().sort((a, b) => a.Nama_Mitra.localeCompare(b.Nama_Mitra, 'id'))
    .map((m) => ({ value: m.ID_Mitra, label: m.Nama_Mitra + ' — ' + m.Negara }));
  const docOpts = (k) => STATE[k].slice().sort((a, b) => a.Mitra.localeCompare(b.Mitra, 'id') || String(b.Awal).localeCompare(String(a.Awal)))
    .map((r) => ({ value: r[D()[k].id], label: r.Mitra + ' — ' + r._nomor + (r.Status_Masa === 'Kadaluarsa' ? ' (kadaluarsa)' : ' (s.d. ' + UI.tgl(r.Akhir) + ')') }));

  const NEGARA = ['Indonesia', 'Malaysia', 'Singapura', 'Thailand', 'Filipina', 'Vietnam', 'Jepang', 'Korea Selatan', 'Tiongkok', 'Taiwan', 'India',
    'Australia', 'Selandia Baru', 'Belanda', 'Belgia', 'Jerman', 'Prancis', 'Inggris', 'Italia', 'Spanyol', 'Swedia', 'Swiss', 'Austria',
    'Amerika Serikat', 'Kanada', 'Arab Saudi', 'Uni Emirat Arab', 'Turki', 'Mesir', 'Afrika Selatan'];
  const BENUA_DARI = { Indonesia: 'Asia', Malaysia: 'Asia', Singapura: 'Asia', Thailand: 'Asia', Filipina: 'Asia', Vietnam: 'Asia', Jepang: 'Asia', 'Korea Selatan': 'Asia',
    Tiongkok: 'Asia', Taiwan: 'Asia', India: 'Asia', 'Arab Saudi': 'Asia', 'Uni Emirat Arab': 'Asia', Turki: 'Asia', Australia: 'Australia', 'Selandia Baru': 'Australia',
    Belanda: 'Eropa', Belgia: 'Eropa', Jerman: 'Eropa', Prancis: 'Eropa', Inggris: 'Eropa', Italia: 'Eropa', Spanyol: 'Eropa', Swedia: 'Eropa', Swiss: 'Eropa', Austria: 'Eropa',
    'Amerika Serikat': 'Amerika', Kanada: 'Amerika', Mesir: 'Afrika', 'Afrika Selatan': 'Afrika' };

  /** Field mitra (dipakai di formulir Mitra dan "mitra baru" di formulir dokumen). p = awalan nama field */
  function mitraFields(m, p) {
    p = p || '';
    const o = STATE.options;
    return `
      <div class="field"><label for="${p}mt-nama">Nama mitra <span class="req">*</span></label>
        <input class="input" id="${p}mt-nama" name="${p}Nama_Mitra" maxlength="250" value="${esc(m.Nama_Mitra)}" placeholder="Nama resmi institusi, mis. KU Leuven" autocomplete="off"></div>
      <div class="field"><label for="${p}mt-jenis">Jenis mitra (kategori IKU) <span class="req">*</span></label>${DATA.selectNamed(p + 'Jenis_Mitra', p + 'mt-jenis', 'Pilih jenis mitra', o.jenisMitra, m.Jenis_Mitra)}</div>
      <div class="field"><label for="${p}mt-kat">Kategori mitra <span class="req">*</span></label>${DATA.selectNamed(p + 'Kategori_Mitra', p + 'mt-kat', 'Pilih kategori', o.kategoriMitra, m.Kategori_Mitra)}</div>
      <div class="row2">
        <div class="field"><label for="${p}mt-neg">Negara <span class="req">*</span></label>
          <input class="input" id="${p}mt-neg" name="${p}Negara" list="dl-negara" value="${esc(m.Negara || 'Indonesia')}" autocomplete="off"></div>
        <div class="field"><label for="${p}mt-benua">Benua <span class="req">*</span></label>${DATA.selectNamed(p + 'Benua', p + 'mt-benua', 'Pilih benua', o.benua, m.Benua || 'Asia')}</div>
      </div>
      <div class="field"><label>Lingkup <span class="req">*</span></label>
        <div class="seg seg-form">${o.lingkup.map((l) => `<label><input type="radio" name="${p}Lingkup" value="${l}" ${(m.Lingkup || 'Nasional') === l ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
      <datalist id="dl-negara">${NEGARA.map((n) => `<option value="${n}">`).join('')}</datalist>`;
  }
  function bindMitraFields(form, p) {
    p = p || '';
    const neg = form.querySelector(`[name="${p}Negara"]`);
    neg.addEventListener('change', () => {
      const n = neg.value.trim();
      const b = BENUA_DARI[Object.keys(BENUA_DARI).find((k) => k.toLowerCase() === n.toLowerCase())];
      if (b) form.querySelector(`[name="${p}Benua"]`).value = b;
      const lk = n.toLowerCase() === 'indonesia' ? null : 'Internasional';
      if (lk) form.querySelector(`[name="${p}Lingkup"][value="${lk}"]`).checked = true;
      else if (form.querySelector(`[name="${p}Lingkup"]:checked`).value === 'Internasional') form.querySelector(`[name="${p}Lingkup"][value="Nasional"]`).checked = true;
    });
  }
  function mitraRules(form, d, p) {
    p = p || '';
    return [
      [p + 'Nama_Mitra', 'Nama mitra wajib diisi.', () => !!d[p + 'Nama_Mitra']],
      [p + 'Jenis_Mitra', 'Pilih jenis mitra.', () => !!d[p + 'Jenis_Mitra']],
      [p + 'Kategori_Mitra', 'Pilih kategori mitra.', () => !!d[p + 'Kategori_Mitra']],
      [p + 'Negara', 'Negara wajib diisi.', () => !!d[p + 'Negara']],
      [p + 'Benua', 'Pilih benua.', () => !!d[p + 'Benua']]
    ];
  }
  const mitraData = (d, p) => ({
    Nama_Mitra: d[p + 'Nama_Mitra'], Jenis_Mitra: d[p + 'Jenis_Mitra'], Kategori_Mitra: d[p + 'Kategori_Mitra'],
    Negara: d[p + 'Negara'], Benua: d[p + 'Benua'], Lingkup: d[p + 'Lingkup']
  });

  // =====================================================================
  // MASTER MITRA
  // =====================================================================
  function treeDocs(m) {
    const mou = STATE.mou.filter((r) => r.ID_Mitra === m.ID_Mitra);
    const moaLepas = STATE.moa.filter((r) => r.ID_Mitra === m.ID_Mitra && !r._induk);
    const iaLepas = STATE.ia.filter((r) => r.ID_Mitra === m.ID_Mitra && !r._induk);
    const item = (r, lvl) => `<li class="tree-l${lvl}"><button type="button" data-doc="${r._k}:${esc(r[D()[r._k].id])}">
      ${lvl ? icon('corner-down-right', 14, 'tree-ic') : ''}${DATA.docChip(r._k)}<span class="tree-main"><span class="mono sm">${DATA.nomorHtml(r._nomor)}</span><span class="t-sub clamp1">${esc(r.Judul)}</span></span>${UI.badge(r.Status_Masa)}</button></li>`;
    const rows = [];
    mou.forEach((u) => {
      rows.push(item(u, 0));
      u._anakMoa.forEach((a) => { rows.push(item(a, 1)); a._anakIa.forEach((i) => rows.push(item(i, 2))); });
      u._anakIa.forEach((i) => rows.push(item(i, 1)));
    });
    moaLepas.forEach((a) => { rows.push(item(a, 0)); a._anakIa.forEach((i) => rows.push(item(i, 1))); });
    iaLepas.forEach((i) => rows.push(item(i, 0)));
    return rows.length ? `<ul class="tree">${rows.join('')}</ul>` : `<div class="mini-empty">${icon('file', 18)}<span>Belum ada dokumen dengan mitra ini.</span></div>`;
  }

  function mitraDetail(id) {
    const m = DATA.byId('mitra', id);
    if (!m) return UI.toast('Data tidak ditemukan.', 'error');
    const canW = DATA.can('ks', 'w');
    const body = `
      <div class="detail-hero" style="--accent:var(--primary)">
        <div class="dh-top">${DATA.lingkupChip(m.Lingkup)}<span class="chip">${esc(m.Kategori_Mitra)}</span></div>
        <h3>${esc(m.Nama_Mitra)}</h3><p>${icon('map-pin', 14)} ${esc(m.Negara)} • ${esc(m.Benua)}</p>
        <div class="dh-status"><span class="chip">${m._mou} MoU</span><span class="chip">${m._moa} MoA</span><span class="chip">${m._ia} IA</span><span class="muted">${m._berlaku} masih berlaku</span></div>
      </div>
      ${F.dl([
        ['ID', `<span class="mono">${esc(m.ID_Mitra)}</span>`],
        ['Jenis mitra (IKU)', esc(m.Jenis_Mitra)],
        ['PIC utama', esc(m.Nama_PIC || '-') + (m.Email_PIC ? `<br><a href="mailto:${esc(m.Email_PIC)}">${esc(m.Email_PIC)}</a>` : '')],
        ['Alamat PIC', esc(m.Alamat_PIC || '-')]
      ])}
      <div class="sub-head"><h4>Dokumen kerja sama</h4>${canW ? `<span class="sub-acts">
        <button type="button" class="btn btn-outline btn-sm" data-add="mou">${icon('plus', 14)} MoU</button>
        <button type="button" class="btn btn-outline btn-sm" data-add="moa">${icon('plus', 14)} MoA</button>
        ${DATA.can('ia', 'w') ? `<button type="button" class="btn btn-outline btn-sm" data-add="ia">${icon('plus', 14)} IA</button>` : ''}</span>` : ''}</div>
      ${treeDocs(m)}
      ${F.trail(m)}`;
    const footer = (DATA.can('ks', 'd') ? `<button type="button" class="btn btn-ghost danger" data-act="del">${icon('trash-2', 16)} Hapus</button>` : '') +
      '<span class="spacer"></span>' + (canW ? `<button type="button" class="btn btn-primary" data-act="edit">${icon('pencil', 16)} Ubah data mitra</button>` : '');
    UI.openDrawer({
      title: 'Detail Mitra', subtitle: m.ID_Mitra, icon: 'building-2', body: body, footer: footer,
      onMount(el) {
        el.addEventListener('click', async (e) => {
          const doc = e.target.closest('[data-doc]');
          if (doc) { const [k, i] = doc.dataset.doc.split(':'); return docDetail(k, i); }
          const add = e.target.closest('[data-add]');
          if (add) return docForm(add.dataset.add, null, { ID_Mitra: m.ID_Mitra });
          const b = e.target.closest('[data-act]');
          if (!b) return;
          if (b.dataset.act === 'edit') mitraForm(id);
          if (b.dataset.act === 'del') {
            if (m._mou + m._moa + m._ia) return UI.toast('Mitra masih dipakai oleh ' + (m._mou + m._moa + m._ia) + ' dokumen, sehingga tidak dapat dihapus.', 'warn');
            if (await DATA.del('mitra', id, m.Nama_Mitra)) { UI.closeDrawer(); APP.refreshView(); }
          }
        });
      }
    });
  }

  function mitraForm(id) {
    const m = id ? DATA.byId('mitra', id) : { Negara: 'Indonesia', Benua: 'Asia', Lingkup: 'Nasional' };
    const body = `<form class="form" id="f-mitra" novalidate>
      <div class="id-box"><span>ID mitra</span><b class="mono">${id ? esc(id) : 'Otomatis (MTR-xxxx)'}</b></div>
      ${mitraFields(m, '')}
      <div class="form-sec">PIC utama mitra <small>(otomatis mengisi PIC Mitra di dokumen baru)</small></div>
      <div class="field"><label for="mt-pic">Nama PIC</label><input class="input" id="mt-pic" name="Nama_PIC" maxlength="200" value="${esc(m.Nama_PIC)}"></div>
      <div class="field"><label for="mt-email">Email PIC</label><input class="input" type="email" id="mt-email" name="Email_PIC" maxlength="200" value="${esc(m.Email_PIC)}"></div>
      <div class="field"><label for="mt-alamat">Alamat PIC</label><textarea class="input" id="mt-alamat" name="Alamat_PIC" rows="2" maxlength="500">${esc(m.Alamat_PIC)}</textarea></div>
      ${id ? `<div class="note">${icon('info', 16)}<span>Mengganti nama mitra akan ikut mengubah nama mitra di semua MoU, MoA, dan IA terkait.</span></div>` : ''}
    </form>`;
    UI.openDrawer({
      title: id ? 'Ubah Mitra' : 'Tambah Mitra', subtitle: 'Master data mitra kerja sama', icon: 'building-2',
      body: body, footer: F.footBtns('f-mitra', id ? 'Simpan perubahan' : 'Simpan mitra'),
      onMount(el) {
        F.bindClose(el);
        const form = UI.$('#f-mitra', el);
        bindMitraFields(form, '');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.formData(form);
          if (!F.validate(form, mitraRules(form, d, '').concat([['Email_PIC', 'Format email tidak valid.', () => !d.Email_PIC || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.Email_PIC)]]))) return;
          const data = Object.assign(mitraData(d, ''), { Nama_PIC: d.Nama_PIC, Email_PIC: d.Email_PIC, Alamat_PIC: d.Alamat_PIC });
          if (id) data.ID_Mitra = id;
          try {
            const rec = await DATA.save('mitra', data);
            DATA.derive();
            UI.closeDrawer();
            APP.refreshView();
            if (!id) mitraDetail(rec.ID_Mitra);
          } catch (err) { UI.toast(err.message, 'error'); }
        };
      }
    });
  }

  // =====================================================================
  // DOKUMEN MoU / MoA / IA
  // =====================================================================
  function peringatanInduk(r) {
    const p = r._induk;
    if (!p) return '';
    const out = [];
    if (p.Status_Masa === 'Kadaluarsa') out.push(D()[p._k].label + ' induk sudah kadaluarsa (' + UI.tgl(p.Akhir) + '). Pertimbangkan memperbarui ' + D()[p._k].label + ' tersebut.');
    else if (r.Akhir && p.Akhir && r.Akhir > p.Akhir) out.push('Tanggal berakhir melewati masa berlaku ' + D()[p._k].label + ' induk (' + UI.tgl(p.Akhir) + ').');
    return out.map((t) => `<div class="note warn">${icon('triangle-alert', 16)}<span>${esc(t)}</span></div>`).join('');
  }

  function docDetail(k, id) {
    const meta = D()[k];
    const r = DATA.byId(k, id);
    if (!r) return UI.toast('Data tidak ditemukan.', 'error');
    const canW = DATA.can(meta.perm, 'w');
    const m = r._m || {};
    const indukRow = k === 'mou' ? null : ['Dokumen induk', r._induk
      ? `<button type="button" class="link-btn" data-doc="${r._induk._k}:${esc(r._induk[D()[r._induk._k].id])}">${D()[r._induk._k].label} ${esc(r._induk._nomor)}</button>`
      : `<span class="muted">${k === 'moa' ? 'Tanpa MoU' : 'IA mandiri (tanpa MoU/MoA)'}</span>`];
    const pic = (n, e, a) => [n, e, a].some(Boolean) ? esc(n || '-') + (e && e !== '-' ? `<br><a href="mailto:${esc(e)}">${esc(e)}</a>` : '') + (a && a !== '-' ? `<br><span class="t-sub">${esc(a)}</span>` : '') : '<span class="muted">-</span>';
    const anak = (arr, kk) => arr.length ? `<ul class="tree">${arr.map((x) => `<li><button type="button" data-doc="${kk}:${esc(x[D()[kk].id])}">${DATA.docChip(kk)}<span class="tree-main"><span class="mono sm">${DATA.nomorHtml(x._nomor)}</span><span class="t-sub clamp1">${esc(x.Judul)}</span></span>${UI.badge(x.Status_Masa)}</button></li>`).join('')}</ul>` : '';
    let turunan = '';
    if (k === 'mou') {
      turunan = `<div class="sub-head"><h4>MoA turunan (${r._anakMoa.length})</h4>${canW ? `<button type="button" class="btn btn-outline btn-sm" data-add="moa">${icon('plus', 14)} Tambah MoA</button>` : ''}</div>${anak(r._anakMoa, 'moa') || '<p class="t-sub pad-b">Belum ada MoA di bawah MoU ini.</p>'}
        <div class="sub-head"><h4>IA langsung ke MoU (${r._anakIa.length})</h4>${DATA.can('ia', 'w') ? `<button type="button" class="btn btn-outline btn-sm" data-add="ia">${icon('plus', 14)} Tambah IA</button>` : ''}</div>${anak(r._anakIa, 'ia') || '<p class="t-sub pad-b">Belum ada IA yang langsung menempel ke MoU ini.</p>'}`;
    }
    if (k === 'moa') {
      turunan = `<div class="sub-head"><h4>IA (${r._anakIa.length})</h4>${DATA.can('ia', 'w') ? `<button type="button" class="btn btn-outline btn-sm" data-add="ia">${icon('plus', 14)} Tambah IA</button>` : ''}</div>${anak(r._anakIa, 'ia') || `<div class="note warn">${icon('triangle-alert', 16)}<span>Belum ada IA untuk MoA ini. Setiap kegiatan wajib memiliki IA.</span></div>`}`;
    }
    const body = `
      <div class="detail-hero" style="--accent:${UI.color(r.Status_Masa)}">
        <div class="dh-top">${DATA.docChip(k)}<span class="mono sm">${DATA.nomorHtml(r._nomor)}</span></div>
        <h3><button type="button" class="link-btn lg" data-mitra="${esc(r.ID_Mitra)}">${esc(r.Mitra)}</button></h3>
        <p>${esc(r.Judul)}</p>
        <div class="dh-status">${UI.badge(r.Status_Masa)}<span class="muted">${esc(UI.sisaTeks(r.Akhir))}</span></div>
      </div>
      ${peringatanInduk(r)}
      ${F.dl([
        ['Nomor', `<span class="mono">${DATA.nomorHtml(r._nomor)}</span>`],
        indukRow,
        ['Masa berlaku', UI.tgl(r.Awal, true) + ' – <b>' + UI.tgl(r.Akhir, true) + '</b>'],
        ['Fakultas/Unit', esc(r.Fakultas_Unit)],
        k === 'moa' ? ['Pengguna', esc(r.Pengguna || '-')] : null,
        ['Bidang', `<span class="chips">${DATA.bidangChips(r) || '-'}</span>`],
        ['Mitra', `${DATA.lingkupChip(m.Lingkup)} <span class="t-sub">${esc(m.Kategori_Mitra || '')} • ${esc(m.Negara || '')}</span>`],
        ['PIC mitra', pic(r.Nama_PIC_Mitra, r.Email_PIC_Mitra, r.Alamat_PIC_Mitra)],
        ['PIC Usakti', pic(r.Nama_PIC_Usakti, r.Email_PIC_Usakti, r.Alamat_PIC_Usakti)],
        k === 'ia' ? ['Kelengkapan', r.Kelengkapan === 'Lengkap' ? '<span class="chip chip-green">Lengkap</span>' : '<span class="chip chip-warn">Belum lengkap</span>'] : null,
        ['Dokumen', r.Link_Dokumen ? `<button type="button" class="link-btn" data-act="berkas">${icon(/(drive|docs)\.google\.com/.test(r.Link_Dokumen) ? 'eye' : 'link', 15)} ${/(drive|docs)\.google\.com/.test(r.Link_Dokumen) ? 'Lihat berkas' : 'Buka tautan dokumen'}</button>` : '<span class="muted">Belum ada</span>']
      ])}
      ${turunan}
      ${F.trail(r)}`;
    const footer = (DATA.can(meta.perm, 'd') ? `<button type="button" class="btn btn-ghost danger" data-act="del">${icon('trash-2', 16)} Hapus</button>` : '') +
      '<span class="spacer"></span>' + (canW ? `<button type="button" class="btn btn-primary" data-act="edit">${icon('pencil', 16)} Ubah data</button>` : '');
    UI.openDrawer({
      title: 'Detail ' + meta.label, subtitle: r[meta.id], icon: meta.icon, body: body, footer: footer,
      onMount(el) {
        el.addEventListener('click', async (e) => {
          const doc = e.target.closest('[data-doc]');
          if (doc) { const [kk, ii] = doc.dataset.doc.split(':'); return docDetail(kk, ii); }
          const mt = e.target.closest('[data-mitra]');
          if (mt) return mitraDetail(mt.dataset.mitra);
          const add = e.target.closest('[data-add]');
          if (add) {
            const preset = add.dataset.add === 'moa' ? { ID_MoU: id } : { Jenis_Induk: meta.label, ID_Induk: id };
            return docForm(add.dataset.add, null, preset);
          }
          const b = e.target.closest('[data-act]');
          if (!b) return;
          const a = b.dataset.act;
          if (a === 'berkas') DATA.berkas(k, id);
          if (a === 'edit') docForm(k, id);
          if (a === 'del') {
            const n = r._anakMoa.length + r._anakIa.length;
            if (n) return UI.toast('Dokumen ini masih memiliki ' + n + ' MoA/IA turunan. Hapus atau pindahkan turunannya dulu.', 'warn');
            if (await DATA.del(k, id, meta.label + ' ' + r._nomor)) { UI.closeDrawer(); APP.refreshView(); }
          }
        });
      }
    });
  }

  function docForm(k, id, preset) {
    const meta = D()[k];
    const o = STATE.options;
    let r = id ? DATA.byId(k, id) : Object.assign({ Fakultas_Unit: o.fakultasDefault }, preset || {});
    if (!id) {
      let last = {};
      try { last = JSON.parse(localStorage.getItem('simpeka_pic_usakti') || '{}'); } catch (e) { /* abaikan */ }
      r = Object.assign({ Nama_PIC_Usakti: last.n || '', Email_PIC_Usakti: last.e || '', Alamat_PIC_Usakti: last.a || '' }, r);
    }
    // MoA baru: tidak ada pilihan bawaan — pengguna wajib menjawab apakah didahului MoU.
    const rel = k === 'moa' ? (r.ID_MoU ? 'ya' : (id ? 'tidak' : (preset && preset.ID_MoU ? 'ya' : '')))
      : k === 'ia' ? (r.Jenis_Induk || '') : '';
    const pengguna = String(r.Pengguna || '').split(',').map((x) => x.trim()).filter(Boolean);
    const penggunaOpts = o.penggunaUnit.concat(pengguna.filter((x) => o.penggunaUnit.indexOf(x) < 0));
    const relasi = k === 'moa' ? `
        <div class="field"><label>Didahului MoU dengan mitra yang sama? <span class="req">*</span></label>
          <div class="radio-cards">
            <label class="rc"><input type="radio" name="_rel" value="ya" ${rel === 'ya' ? 'checked' : ''}><span><b>Ya, ada MoU</b><small>Pilih MoU induknya; mitra mengikuti MoU</small></span></label>
            <label class="rc"><input type="radio" name="_rel" value="tidak" ${rel === 'tidak' ? 'checked' : ''}><span><b>Tanpa MoU</b><small>MoA berdiri sendiri</small></span></label>
          </div></div>
        <div class="field" data-show="ya"><label for="df-induk-mou">MoU induk <span class="req">*</span></label>${combo('ID_MoU', 'df-induk-mou', 'Pilih MoU', docOpts('mou'), r.ID_MoU)}</div>`
      : k === 'ia' ? `
        <div class="field"><label>IA ini menempel ke <span class="req">*</span></label>
          <div class="seg seg-form">${[['MoA', 'MoA'], ['MoU', 'MoU'], ['', 'Mandiri']].map(([v, l]) => `<label><input type="radio" name="_rel" value="${v}" ${rel === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
        <div class="field" data-show="MoA"><label for="df-induk-moa">MoA induk <span class="req">*</span></label>${combo('_indukMoa', 'df-induk-moa', 'Pilih MoA', docOpts('moa'), r.Jenis_Induk === 'MoA' ? r.ID_Induk : '')}</div>
        <div class="field" data-show="MoU"><label for="df-induk-mou">MoU induk <span class="req">*</span></label>${combo('_indukMou', 'df-induk-mou', 'Pilih MoU', docOpts('mou'), r.Jenis_Induk === 'MoU' ? r.ID_Induk : '')}</div>` : '';

    const body = `<form class="form" id="f-doc" novalidate>
      <div class="id-box"><span>ID ${meta.label}</span><b class="mono">${id ? esc(id) : 'Otomatis'}</b></div>
      <div class="field"><label for="df-nomor">Nomor ${meta.label} <span class="req">*</span></label>
        <input class="input" id="df-nomor" name="${meta.nomor}" maxlength="200" value="${esc(r[meta.nomor])}" placeholder="Contoh: 054/KS.00.02/USAKTI/FTSP-DEK/VIII/2024" autocomplete="off"></div>
      ${relasi}

      <div class="form-sec">Mitra</div>
      <div id="df-mitra-induk" class="mitra-lock" hidden></div>
      <div id="df-mitra-pilih">
        <div class="field"><label for="df-mitra">Mitra <span class="req">*</span></label>${combo('ID_Mitra', 'df-mitra', 'Pilih mitra', mitraOpts(), r.ID_Mitra)}
          <button type="button" class="link-btn sm-gap" id="df-mitra-baru">${icon('plus', 14)} Mitra belum terdaftar? Tambah mitra baru</button></div>
        <div id="df-mitra-form" class="subform" hidden>
          <div class="subform-head"><b>Mitra baru</b><button type="button" class="link-btn" id="df-mitra-batal">Batal, pilih dari daftar</button></div>
          ${mitraFields({}, 'mb_')}
        </div>
      </div>
      <div id="df-warn"></div>

      <div class="form-sec">Isi kerja sama</div>
      <div class="field"><label for="df-judul">Judul <span class="req">*</span></label>
        <textarea class="input" id="df-judul" name="Judul" rows="3" maxlength="1000" placeholder="USAKTI FTSP - Nama Mitra - Ruang lingkup kerja sama">${esc(r.Judul)}</textarea></div>
      <div class="field"><label for="df-fak">Fakultas/Unit <span class="req">*</span></label><input class="input" id="df-fak" name="Fakultas_Unit" maxlength="200" value="${esc(r.Fakultas_Unit)}"></div>
      ${k === 'moa' ? `<div class="field"><label>Pengguna (unit/prodi)</label><div class="check-chips">${penggunaOpts.map((u) => `<label><input type="checkbox" name="_pg" value="${esc(u)}" ${pengguna.indexOf(u) >= 0 ? 'checked' : ''}><span>${esc(u)}</span></label>`).join('')}</div></div>` : ''}
      <div class="row2">
        <div class="field"><label for="df-awal">Tanggal awal <span class="req">*</span></label><input type="date" class="input" id="df-awal" name="Awal" value="${esc(r.Awal)}"></div>
        <div class="field"><label for="df-akhir">Tanggal akhir <span class="req">*</span></label><input type="date" class="input" id="df-akhir" name="Akhir" value="${esc(r.Akhir)}"></div>
      </div>
      <div class="status-preview" id="df-prev" aria-live="polite"></div>
      <div class="field"><label>Bidang <span class="req">*</span></label>
        <div class="check-chips" data-group="bidang">${DATA.TRIDARMA.map(([f, l]) => `<label><input type="checkbox" name="${f}" ${r[f] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
      ${k === 'ia' ? `<div class="field"><label class="toggle"><input type="checkbox" name="_lengkap" ${r.Kelengkapan === 'Lengkap' ? 'checked' : ''}><span class="tg"></span><span><b>Berkas IA sudah lengkap</b><small>IA dan lampirannya sudah lengkap</small></span></label></div>` : ''}

      <div class="form-sec">PIC mitra</div>
      <div class="field"><label for="df-pm-n">Nama PIC mitra</label><input class="input" id="df-pm-n" name="Nama_PIC_Mitra" maxlength="200" value="${esc(r.Nama_PIC_Mitra)}"></div>
      <div class="row2">
        <div class="field"><label for="df-pm-e">Email PIC mitra</label><input class="input" type="email" id="df-pm-e" name="Email_PIC_Mitra" maxlength="200" value="${esc(r.Email_PIC_Mitra)}"></div>
        <div class="field"><label for="df-pm-a">Alamat PIC mitra</label><input class="input" id="df-pm-a" name="Alamat_PIC_Mitra" maxlength="500" value="${esc(r.Alamat_PIC_Mitra)}"></div>
      </div>
      <div class="form-sec">PIC Usakti</div>
      <div class="field"><label for="df-pu-n">Nama PIC Usakti</label><input class="input" id="df-pu-n" name="Nama_PIC_Usakti" maxlength="200" value="${esc(r.Nama_PIC_Usakti)}"></div>
      <div class="row2">
        <div class="field"><label for="df-pu-e">Email PIC Usakti</label><input class="input" type="email" id="df-pu-e" name="Email_PIC_Usakti" maxlength="200" value="${esc(r.Email_PIC_Usakti)}"></div>
        <div class="field"><label for="df-pu-a">Alamat PIC Usakti</label><input class="input" id="df-pu-a" name="Alamat_PIC_Usakti" maxlength="500" value="${esc(r.Alamat_PIC_Usakti)}"></div>
      </div>

      <div class="form-sec">Dokumen</div>
      ${UI.fileField('df-file', { label: 'Unggah berkas ' + meta.label + ' (PDF/JPG)', ada: /(drive|docs)\.google\.com/.test(r.Link_Dokumen || ''), maksMB: o.maksMB })}
      <div class="field"><label for="df-url">atau tempel URL dokumen (mis. dari SIMKERMA)</label>
        <input class="input" type="url" id="df-url" name="Link_Dokumen" value="${esc(/(drive|docs)\.google\.com/.test(r.Link_Dokumen || '') ? '' : r.Link_Dokumen)}" placeholder="http://simkerma.trisakti.ac.id/documents/…">
        <p class="hint">Bila berkas diunggah, tautan berkas yang diunggah yang dipakai.</p></div>
    </form>`;

    UI.openDrawer({
      title: (id ? 'Ubah ' : 'Tambah ') + meta.label, subtitle: meta.nama, icon: id ? 'pencil' : 'file-plus-2',
      body: body, footer: F.footBtns('f-doc', id ? 'Simpan perubahan' : 'Simpan ' + meta.label),
      onMount(el) {
        F.bindClose(el);
        const form = UI.$('#f-doc', el);
        bindCombo(form);
        bindMitraFields(form, 'mb_');
        const getFile = UI.bindFileField(el, 'df-file', o.maksMB);
        const lock = UI.$('#df-mitra-induk', el), pilih = UI.$('#df-mitra-pilih', el);
        const mbForm = UI.$('#df-mitra-form', el), mbBtn = UI.$('#df-mitra-baru', el);
        let mitraBaru = false;
        const setBaru = (on) => {
          mitraBaru = on;
          mbForm.hidden = !on; mbBtn.hidden = on;
          UI.$('#df-mitra', el).closest('.combo').hidden = on;
        };
        mbBtn.onclick = () => setBaru(true);
        UI.$('#df-mitra-batal', el).onclick = () => setBaru(false);

        const relVal = () => { const x = form.querySelector('[name="_rel"]:checked'); return x ? x.value : ''; };
        const induk = () => {
          if (k === 'moa' && relVal() === 'ya') return DATA.byId('mou', form.ID_MoU.value) || null;
          if (k === 'ia' && relVal() === 'MoA') return DATA.byId('moa', form._indukMoa.value) || null;
          if (k === 'ia' && relVal() === 'MoU') return DATA.byId('mou', form._indukMou.value) || null;
          return null;
        };
        const prefillPic = (m) => {
          if (!m || form.Nama_PIC_Mitra.value || form.Email_PIC_Mitra.value) return;
          form.Nama_PIC_Mitra.value = m.Nama_PIC || '';
          form.Email_PIC_Mitra.value = m.Email_PIC || '';
          form.Alamat_PIC_Mitra.value = m.Alamat_PIC || '';
        };
        const sync = () => {
          UI.$$('[data-show]', form).forEach((x) => { x.hidden = x.dataset.show !== relVal(); });
          const p = induk();
          const pakaiInduk = (k === 'moa' && relVal() === 'ya') || (k === 'ia' && relVal() !== '');
          lock.hidden = !pakaiInduk; pilih.hidden = pakaiInduk;
          if (pakaiInduk) {
            lock.innerHTML = p
              ? `${icon('link', 16)}<span><b>${esc(p.Mitra)}</b><small>Mitra mengikuti ${D()[p._k].label} induk ${esc(p._nomor)}</small></span>`
              : `${icon('info', 16)}<span>Pilih dokumen induk; mitra akan mengikuti dokumen induk.</span>`;
            if (p) prefillPic(p._m);
          }
          UI.$('#df-warn', el).innerHTML = p ? peringatanInduk({ _induk: p, Akhir: form.Akhir.value }) : '';
        };
        UI.$$('[name="_rel"]', form).forEach((x) => x.addEventListener('change', sync));
        ['ID_MoU', '_indukMoa', '_indukMou'].forEach((n) => form[n] && form[n].addEventListener('change', sync));
        form.ID_Mitra.addEventListener('change', () => prefillPic(DATA.byId('mitra', form.ID_Mitra.value)));
        const prev = UI.$('#df-prev', el);
        const upd = () => {
          const akhir = form.Akhir.value;
          prev.innerHTML = akhir ? `Status otomatis: ${UI.badge(UI.statusMasa(akhir, o.ambang))} <span class="muted">${esc(UI.sisaTeks(akhir))}</span>`
            : `${icon('info', 15)} Status masa berlaku dihitung otomatis dari tanggal akhir.`;
          sync();
        };
        form.Akhir.addEventListener('input', upd);
        upd();

        form.onsubmit = async (e) => {
          e.preventDefault();
          const d = UI.formData(form);
          const rv = relVal();
          const p = induk();
          const pakaiInduk = (k === 'moa' && rv === 'ya') || (k === 'ia' && rv !== '');
          const rules = [
            [meta.nomor, 'Nomor wajib diisi.', () => !!d[meta.nomor]],
            ['Judul', 'Judul wajib diisi.', () => !!d.Judul],
            ['Fakultas_Unit', 'Fakultas/unit wajib diisi.', () => !!d.Fakultas_Unit],
            ['Awal', 'Tanggal awal wajib diisi.', () => !!d.Awal],
            ['Akhir', 'Tanggal akhir wajib diisi dan tidak boleh sebelum tanggal awal.', () => !!d.Akhir && (!d.Awal || d.Akhir >= d.Awal)],
            ['Dikjar', 'Pilih minimal satu bidang.', () => DATA.TRIDARMA.some(([f]) => d[f])],
            ['Email_PIC_Mitra', 'Format email tidak valid.', () => !d.Email_PIC_Mitra || d.Email_PIC_Mitra === '-' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.Email_PIC_Mitra)],
            ['Email_PIC_Usakti', 'Format email tidak valid.', () => !d.Email_PIC_Usakti || d.Email_PIC_Usakti === '-' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.Email_PIC_Usakti)],
            ['Link_Dokumen', 'URL harus diawali http:// atau https://', () => !d.Link_Dokumen || /^https?:\/\/\S+$/i.test(d.Link_Dokumen)]
          ];
          if (k === 'moa' && rv === 'ya') rules.unshift(['ID_MoU', 'Pilih MoU induk.', () => !!p]);
          if (k === 'moa') rules.unshift(['_rel', 'Jawab dulu: apakah MoA ini didahului MoU dengan mitra yang sama?', () => !!rv]);
          if (k === 'ia' && rv === 'MoA') rules.unshift(['_indukMoa', 'Pilih MoA induk.', () => !!p]);
          if (k === 'ia' && rv === 'MoU') rules.unshift(['_indukMou', 'Pilih MoU induk.', () => !!p]);
          if (!pakaiInduk && !mitraBaru && !(k === 'moa' && !rv)) rules.unshift(['ID_Mitra', 'Pilih mitra, atau tambah mitra baru.', () => !!d.ID_Mitra]);
          if (!pakaiInduk && mitraBaru) rules.unshift.apply(rules, mitraRules(form, d, 'mb_'));
          if (!F.validate(form, rules)) return;

          const data = {};
          [meta.nomor, 'Judul', 'Fakultas_Unit', 'Awal', 'Akhir', 'Nama_PIC_Mitra', 'Email_PIC_Mitra', 'Alamat_PIC_Mitra',
            'Nama_PIC_Usakti', 'Email_PIC_Usakti', 'Alamat_PIC_Usakti'].forEach((f) => { data[f] = d[f]; });
          DATA.TRIDARMA.forEach(([f]) => { data[f] = !!d[f]; });
          const file = getFile();
          if (!file) data.Link_Dokumen = d.Link_Dokumen;
          if (id) data[meta.id] = id;
          if (k === 'moa') {
            data.ID_MoU = rv === 'ya' ? d.ID_MoU : '';
            data.Pengguna = UI.$$('[name="_pg"]:checked', form).map((x) => x.value).join(', ');
          }
          if (k === 'ia') {
            data.Jenis_Induk = rv;
            data.ID_Induk = rv === 'MoA' ? d._indukMoa : rv === 'MoU' ? d._indukMou : '';
            data.Kelengkapan = d._lengkap ? 'Lengkap' : 'Belum Lengkap';
          }
          if (!pakaiInduk) {
            if (mitraBaru) data.mitraBaru = mitraData(d, 'mb_'); else data.ID_Mitra = d.ID_Mitra;
          }
          try { localStorage.setItem('simpeka_pic_usakti', JSON.stringify({ n: d.Nama_PIC_Usakti, e: d.Email_PIC_Usakti, a: d.Alamat_PIC_Usakti })); } catch (er) { /* abaikan */ }
          try {
            const rec = await DATA.save(k, data, file);
            DATA.derive();
            UI.closeDrawer();
            APP.refreshView();
            if (!id && k === 'moa' && DATA.can('ia', 'w')) offerIA(k, rec);
          } catch (err) { UI.toast(err.message, 'error'); }
        };
      }
    });
  }

  /** Setelah MoA/MoU baru tersimpan, tawarkan langsung mencatat IA-nya. */
  async function offerIA(k, rec) {
    const meta = D()[k];
    const ya = await UI.confirmDlg({
      title: 'Catat IA sekarang?',
      message: esc(meta.label + ' ' + rec[meta.nomor]) + ' belum memiliki IA. Setiap kegiatan wajib memiliki IA.',
      okText: 'Tambah IA'
    });
    if (ya) docForm('ia', null, { Jenis_Induk: meta.label, ID_Induk: rec[meta.id] });
  }

  return { mitraDetail, mitraForm, docDetail, docForm, combo, bindCombo };
})();
