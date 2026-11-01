/* 온마음 관리 페이지 — 부부 두 분만 사용 (Supabase 매직링크 로그인 + RLS) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cfg = window.ONMAUM_CONFIG || {};
  var DEMO = !cfg.supabaseUrl || !cfg.supabaseAnonKey || /[?&]demo=1/.test(location.search);
  var toastT;
  function toast(m) { var t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ------------------------------------------------------------------ 데이터 계층
  var db;
  if (DEMO) {
    // 연습 모드: 브라우저 메모리에만 저장 (테스트·연결 전 체험용)
    var mem = { issues: [], pages: [], posts: [], hearts: [], messages: [
      { id: 'm1', author_name: '익명', body: '아이들에게 따뜻한 마음 전합니다.', status: 'pending', created_at: new Date().toISOString() }] };
    var uid = function () { return 'id' + Math.random().toString(36).slice(2); };
    db = {
      session: function () { return Promise.resolve({ email: 'demo@onmaum' }); },
      login: function () { return Promise.resolve(); }, logout: function () { location.reload(); },
      isAdmin: function () { return Promise.resolve(true); },
      list: function (t) { return Promise.resolve(mem[t].slice()); },
      save: function (t, row) {
        row = Object.assign({}, row);
        if (!row.id) row.id = uid();
        if (row.status === 'published' && !row.published_at) row.published_at = new Date().toISOString();
        var i = mem[t].findIndex(function (r) { return r.id === row.id; });
        if (i >= 0) mem[t][i] = Object.assign(mem[t][i], row); else mem[t].push(row);
        return Promise.resolve(row);
      },
      replacePages: function (issueId, pages) {
        mem.pages = mem.pages.filter(function (p) { return p.issue_id !== issueId; }).concat(pages.map(function (p) { return Object.assign({ issue_id: issueId }, p); }));
        return Promise.resolve();
      },
      remove: function (t, id) { mem[t] = mem[t].filter(function (r) { return r.id !== id; }); return Promise.resolve(); },
      upload: function (path, blob) { return Promise.resolve(URL.createObjectURL(blob)); },
      afterPublish: function () { return Promise.resolve({ deploy: 'demo' }); }
    };
  } else {
    var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true, flowType: 'implicit' }
    });
    // 초대/로그인 링크로 들어오면 세션을 잡은 뒤 주소창의 토큰을 지움
    sb.auth.onAuthStateChange(function (ev, session) {
      if (session && /access_token|[?&]code=|type=(invite|magiclink|recovery|signup)/.test(location.hash + location.search)) {
        history.replaceState(null, '', location.pathname);
      }
    });
    var chk = function (r) { if (r.error) throw r.error; return r.data; };
    db = {
      session: function () { return sb.auth.getSession().then(function (r) { return r.data.session && r.data.session.user; }); },
      login: function (email) {
        return sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } }).then(chk);
      },
      logout: function () { return sb.auth.signOut().then(function () { location.reload(); }); },
      isAdmin: function () { return sb.rpc('is_admin').then(chk); },
      list: function (t) {
        var sel = t === 'issues' ? '*,pages(*)' : '*';
        return sb.from(t).select(sel).order('created_at', { ascending: false }).then(chk);
      },
      save: function (t, row) {
        var r = Object.assign({}, row); if (!r.id) delete r.id;
        return sb.from(t).upsert(r).select().single().then(chk);
      },
      replacePages: function (issueId, pages) {
        return sb.from('pages').delete().eq('issue_id', issueId).then(chk).then(function () {
          if (!pages.length) return;
          return sb.from('pages').insert(pages.map(function (p) { return Object.assign({ issue_id: issueId }, p); })).then(chk);
        });
      },
      remove: function (t, id) { return sb.from(t).delete().eq('id', id).then(chk); },
      upload: function (path, blob) {
        return sb.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', upsert: true }).then(chk)
          .then(function () { return sb.storage.from('media').getPublicUrl(path).data.publicUrl; });
      },
      afterPublish: function (info) {
        return sb.functions.invoke('publish-hook', { body: info }).then(function (r) { return r.data || {}; }).catch(function () { return {}; });
      }
    };
  }

  // ------------------------------------------------------------------ 이미지 줄이기
  function resize(file, maxSide, quality) {
    return new Promise(function (ok, bad) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : bad(new Error('resize')); }, 'image/jpeg', quality || 0.85);
      };
      img.onerror = function () { bad(new Error('이미지를 읽을 수 없어요')); };
      img.src = url;
    });
  }
  // items: [{blob?, url}]  — 화면용 url, 아직 안 올린 건 blob 보유
  function thumbs(boxId, items, onChange) {
    var box = $(boxId);
    box.innerHTML = items.map(function (it, i) {
      return '<div class="thumb"><img src="' + esc(it.url) + '" alt="" /><span class="n">' + (i + 1) + '</span><span class="ctl">' +
        '<button type="button" data-i="' + i + '" data-m="-1" aria-label="앞으로">◀</button><button type="button" data-i="' + i + '" data-m="1" aria-label="뒤로">▶</button>' +
        '<button type="button" data-i="' + i + '" data-m="x" aria-label="빼기">✕</button></span></div>';
    }).join('');
    box.onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var i = +b.dataset.i, m = b.dataset.m;
      if (m === 'x') items.splice(i, 1);
      else { var j = i + (+m); if (j >= 0 && j < items.length) { var t = items[i]; items[i] = items[j]; items[j] = t; } }
      thumbs(boxId, items, onChange); onChange && onChange();
    };
  }
  function uploadAll(items, prefix) {
    return Promise.all(items.map(function (it, i) {
      if (!it.blob) return it.path || it.url;
      return db.upload(prefix + '/' + Date.now() + '-' + (i + 1) + '.jpg', it.blob).then(function (u) { it.url = u; delete it.blob; return u; });
    }));
  }

  // ------------------------------------------------------------------ 상태
  var state = { tab: 'issue', postKind: 'notice', issueId: null, postId: null, heartId: null,
    issueImgs: [], postImgs: [], heartBlob: null, heartMode: 'gen', cache: {} };

  function refresh() {
    return Promise.all(['issues', 'posts', 'hearts', 'messages'].map(function (t) { return db.list(t).catch(function () { return []; }); }))
      .then(function (r) { state.cache = { issues: r[0], posts: r[1], hearts: r[2], messages: r[3] }; renderLists(); suggestNumbers(); });
  }
  function maxOf(arr, k, fb) { return arr.reduce(function (m, r) { return Math.max(m, r[k] || 0); }, fb); }
  function suggestNumbers() {
    if (!state.issueId && !$('iNo').value) $('iNo').value = maxOf(state.cache.issues, 'vol_no', 3) + 1;
    if (!state.heartId && !$('hNo').value) { $('hNo').value = maxOf(state.cache.hearts, 'no', 20) + 1; drawHeart(); }
  }

  // ------------------------------------------------------------------ 탭
  function showTab(tab) {
    state.tab = tab;
    document.querySelectorAll('#tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.tab === tab)); });
    var panel = (tab === 'notice' || tab === 'story') ? 'post' : tab;
    document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.dataset.panel !== panel; });
    if (panel === 'post') {
      if (state.postKind !== tab) { state.postKind = tab; resetPost(); }
      $('postHeading').textContent = tab === 'notice' ? '공지' : '현장 이야기';
      $('pFiles').multiple = tab === 'story';
      $('pFilesHint').textContent = tab === 'story' ? '(1~6장, 첫 장이 대표 사진)' : '(선택, 1장)';
    }
    if (tab === 'heart') drawHeart();
  }
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab); });

  // ------------------------------------------------------------------ 소식지 폼
  $('iFiles').addEventListener('change', function (e) {
    var files = Array.from(e.target.files || []); e.target.value = '';
    Promise.all(files.map(function (f) { return resize(f, 2000, 0.86); })).then(function (blobs) {
      blobs.forEach(function (b) { state.issueImgs.push({ blob: b, url: URL.createObjectURL(b) }); });
      thumbs('iThumbs', state.issueImgs);
    }).catch(function (err) { toast(err.message); });
  });
  function kpi(id) { var v = $(id).value.split('|').map(function (s) { return s.trim(); }); return v[0] ? { val: v[0], label: v[1] || '' } : null; }
  function issueRow(status) {
    var no = parseInt($('iNo').value, 10);
    return { id: state.issueId || undefined, slug: 'vol' + no, vol_no: no, vol_label: '제' + no + '호', badge: '제' + no + '호 · ONMAUM NEWSLETTER',
      date_label: $('iDate').value.trim(), title: $('iTitle').value.trim(), subtitle: $('iSubtitle').value.trim(),
      title_en: $('iTitleEn').value.trim() || null, subtitle_en: $('iSubtitleEn').value.trim() || null,
      kpis: [kpi('iK1'), kpi('iK2'), kpi('iK3')].filter(Boolean), notes: [], status: status };
  }
  function checkIssue() {
    if (!$('iNo').value || !$('iDate').value.trim() || !$('iTitle').value.trim()) return '호수·발행 연월·제목을 채워주세요';
    if (!state.issueImgs.length) return '카드 이미지를 한 장 이상 골라주세요';
  }
  function resetIssue() { state.issueId = null; state.issueImgs = []; ['iNo', 'iDate', 'iTitle', 'iSubtitle', 'iK1', 'iK2', 'iK3', 'iTitleEn', 'iSubtitleEn'].forEach(function (k) { $(k).value = ''; }); thumbs('iThumbs', []); $('issueEditing').textContent = ''; }

  // ------------------------------------------------------------------ 공지·이야기 폼
  $('pFiles').addEventListener('change', function (e) {
    var files = Array.from(e.target.files || []); e.target.value = '';
    var max = state.postKind === 'story' ? 6 : 1;
    Promise.all(files.map(function (f) { return resize(f, 1600, 0.85); })).then(function (blobs) {
      if (max === 1) state.postImgs = [];
      blobs.forEach(function (b) { if (state.postImgs.length < max) state.postImgs.push({ blob: b, url: URL.createObjectURL(b) }); });
      thumbs('pThumbs', state.postImgs);
    }).catch(function (err) { toast(err.message); });
  });
  function postRow(status) {
    return { id: state.postId || undefined, kind: state.postKind, title: $('pTitle').value.trim(), body: $('pBody').value.trim(),
      title_en: $('pTitleEn').value.trim() || null, body_en: $('pBodyEn').value.trim() || null,
      images: state.postImgs.map(function (i) { return i.url; }), status: status };
  }
  function checkPost() {
    if (!$('pTitle').value.trim() || !$('pBody').value.trim()) return '제목과 내용을 채워주세요';
    if (state.postKind === 'story' && !state.postImgs.length) return '현장 이야기는 사진을 한 장 이상 넣어주세요';
  }
  function resetPost() { state.postId = null; state.postImgs = []; ['pTitle', 'pBody', 'pTitleEn', 'pBodyEn'].forEach(function (k) { $(k).value = ''; }); thumbs('pThumbs', []); }

  // ------------------------------------------------------------------ 하트 카드 (후원인명단/template 과 같은 디자인)
  var heartAssets = null;
  function loadHeartAssets() {
    if (heartAssets) return heartAssets;
    var base = new Image(); base.src = '../후원인명단/template/base.png';
    var fonts = [new FontFace('OnmaumBodoni', 'url("../후원인명단/template/fonts/BodoniModa.ttf")', { weight: '400 900' }),
      new FontFace('OnmaumMontserrat', 'url("../후원인명단/template/fonts/Montserrat.ttf")', { weight: '100 900' })];
    heartAssets = Promise.all([new Promise(function (ok, bad) { base.onload = ok; base.onerror = bad; })]
      .concat(fonts.map(function (f) { return f.load().then(function (ff) { document.fonts.add(ff); }).catch(function () {}); })))
      .then(function () { return base; });
    return heartAssets;
  }
  function drawHeart() {
    if (state.heartMode !== 'gen') return Promise.resolve();
    return loadHeartAssets().then(function (base) {
      var c = $('heartCanvas'), g = c.getContext('2d'), X = 581, MAXW = 1065 - X - 40;
      var name = $('hName').value.trim() || 'Your Name', num = $('hNo').value || '';
      g.drawImage(base, 0, 0, 1065, 612);
      var size = 74;
      while (true) { g.font = '600 ' + size + 'px OnmaumBodoni, "Bodoni Moda", Georgia, serif'; if (g.measureText(name).width <= MAXW || size <= 40) break; size -= 2; }
      g.textBaseline = 'alphabetic'; g.fillStyle = 'rgb(36,169,154)'; g.fillText(name, X - 2, 151);
      g.font = '500 27px OnmaumMontserrat, Montserrat, Arial, sans-serif';
      var label = 'Onmaum Heart '; g.fillStyle = 'rgb(13,13,13)'; g.fillText(label, X, 201);
      g.fillStyle = 'rgb(214,104,80)'; g.fillText(String(num), X + g.measureText(label).width, 201);
    }).catch(function () { toast('카드 틀을 불러오지 못했어요'); });
  }
  ['hName', 'hNo'].forEach(function (k) { $(k).addEventListener('input', drawHeart); });
  function setHeartMode(m) {
    state.heartMode = m; $('hModeGen').setAttribute('aria-pressed', String(m === 'gen')); $('hModeUp').setAttribute('aria-pressed', String(m === 'up'));
    $('hFile').hidden = m !== 'up'; state.heartBlob = null; if (m === 'gen') drawHeart();
  }
  $('hModeGen').onclick = function () { setHeartMode('gen'); };
  $('hModeUp').onclick = function () { setHeartMode('up'); };
  $('hFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    resize(f, 1065, 0.88).then(function (b) {
      state.heartBlob = b; var img = new Image();
      img.onload = function () { var c = $('heartCanvas'), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); };
      img.src = URL.createObjectURL(b);
    });
  });
  function heartBlob() {
    if (state.heartMode === 'up' && state.heartBlob) return Promise.resolve(state.heartBlob);
    return drawHeart().then(function () { return new Promise(function (ok) { $('heartCanvas').toBlob(ok, 'image/jpeg', 0.88); }); });
  }
  function checkHeart() {
    if (!$('hNo').value || !$('hName').value.trim()) return '번호와 이름을 채워주세요';
    if (state.heartMode === 'up' && !state.heartBlob) return '카드 이미지를 골라주세요';
    var n = +$('hNo').value;
    if (state.cache.hearts.some(function (h) { return h.no === n && h.id !== state.heartId; })) return n + '번은 이미 있어요';
  }
  function resetHeart() { state.heartId = null; ['hNo', 'hName', 'hMsg', 'hMsgEn'].forEach(function (k) { $(k).value = ''; }); setHeartMode('gen'); suggestNumbers(); }

  // ------------------------------------------------------------------ 저장 / 발행
  function busy(on) { document.querySelectorAll('.actions button').forEach(function (b) { b.disabled = on; }); }
  function saveCurrent(kind, status) {
    if (kind === 'issue') {
      var err = checkIssue(); if (err) return Promise.reject(new Error(err));
      var row = issueRow(status);
      return uploadAll(state.issueImgs, 'issues/' + row.slug).then(function (urls) {
        return db.save('issues', row).then(function (saved) {
          state.issueId = saved.id;
          return db.replacePages(saved.id, urls.map(function (u, i) { return { edition: 'card', position: i + 1, image_path: u }; })).then(function () { return { kind: '소식지', title: row.vol_label + ' ' + row.title }; });
        });
      });
    }
    if (kind === 'post') {
      var e2 = checkPost(); if (e2) return Promise.reject(new Error(e2));
      return uploadAll(state.postImgs, 'posts/' + new Date().toISOString().slice(0, 10)).then(function () {
        return db.save('posts', postRow(status)).then(function (s) { state.postId = s.id; return { kind: state.postKind === 'notice' ? '공지' : '현장 이야기', title: s.title }; });
      });
    }
    var e3 = checkHeart(); if (e3) return Promise.reject(new Error(e3));
    var no = +$('hNo').value;
    return heartBlob().then(function (b) { return db.upload('hearts/heart-' + String(no).padStart(2, '0') + '-' + Date.now() + '.jpg', b); }).then(function (url) {
      return db.save('hearts', { id: state.heartId || undefined, no: no, name: $('hName').value.trim(), card_path: url,
        message: $('hMsg').value.trim() || null, message_en: $('hMsgEn').value.trim() || null, status: status });
    }).then(function (s) { state.heartId = s.id; return { kind: 'Onmaum Heart', title: s.no + ' · ' + s.name }; });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var act = b.dataset.act, kind = b.dataset.kind;
    if (act === 'preview') return preview(kind);
    if (act === 'publish' && !confirm('홈페이지에 바로 올릴까요?')) return;
    busy(true);
    saveCurrent(kind, act === 'publish' ? 'published' : 'draft').then(function (info) {
      if (act === 'publish') {
        return db.afterPublish(info).then(function () {
          toast('발행했어요! 1~2분 뒤 홈페이지에 보여요');
          if (kind === 'issue') resetIssue(); else if (kind === 'post') resetPost(); else resetHeart();
        });
      }
      toast('임시저장했어요');
    }).catch(function (err) { toast('저장 실패: ' + (err.message || err)); })
      .then(function () { busy(false); return refresh(); });
  });

  // ------------------------------------------------------------------ 미리보기 (실제 홈페이지 CSS 그대로)
  var pvMode = 'phone';
  function previewPayload(kind) {
    var c = state.cache, pub = function (arr) { return arr.filter(function (r) { return r.status === 'published'; }); };
    var p = {};
    if (kind === 'issue') {
      var row = issueRow('published');
      row.pages = state.issueImgs.map(function (it, i) { return { edition: 'card', position: i + 1, image_path: it.path || it.url }; });
      var others = pub(c.issues).filter(function (r) { return r.id !== state.issueId && r.vol_no !== row.vol_no; });
      p.issues = others.length ? others.concat([row]) : null;
      if (!p.issues) p.prependIssue = row;
      p.scrollTo = 'newsletter';
    } else if (kind === 'post') {
      var pr = postRow('published'); pr.published_at = new Date().toISOString();
      p.posts = [pr].concat(pub(c.posts).filter(function (r) { return r.id !== state.postId; })); p.scrollTo = 'stories';
    } else {
      p.hearts = pub(c.hearts).length ? pub(c.hearts) : null;
      p.heartDraft = { no: +$('hNo').value, name: $('hName').value.trim() || 'Your Name', card_path: $('heartCanvas').toDataURL('image/jpeg', 0.8), message: $('hMsg').value.trim() || null };
      p.scrollTo = 'hearts';
    }
    return p;
  }
  function preview(kind) {
    var finish = function () {
      var p = previewPayload(kind), fr = $('pvFrame');
      $('previewWrap').classList.add('open'); sizePreview();
      fr.onload = function () {
        var w = fr.contentWindow; if (!w || !w.OnmaumLive) return;
        // 정적 데이터(또는 DB 발행본) 위에 초안을 얹어서 보여줌
        w.OnmaumLive.apply({ issues: p.issues || null, hearts: p.hearts || null, posts: p.posts || null });
        if (p.prependIssue) {
          var conv = w.OnmaumLive.toIssues([Object.assign({ vol_no: 9999 }, p.prependIssue)])[0];
          w.eval('NEWSLETTERS_DATA').forEach(function (i) { i.isNew = false; });
          w.eval('NEWSLETTERS_DATA').unshift(conv);
          w.eval('currentIssueIdx=0;currentPageIdx=0;'); w.renderNewsletterHub();
        }
        if (p.heartDraft) { var d = p.heartDraft; w.eval('ONMAUM_HEARTS').push([d.no, d.name, d.card_path, d.message]); w.renderHearts(); }
        var t = w.document.getElementById(p.scrollTo); if (t) t.scrollIntoView();
      };
      fr.src = '../index.html?static=1&preview=' + Date.now();
    };
    if (kind === 'heart') drawHeart().then(finish); else finish();
  }
  function sizePreview() {
    var w = pvMode === 'phone' ? 390 : 1280, h = pvMode === 'phone' ? 780 : 800;
    var avail = Math.min(window.innerWidth - 20, 1400), availH = window.innerHeight - 70;
    var s = Math.min(1, avail / w, availH / h);
    var fr = $('pvFrame'); fr.style.width = w + 'px'; fr.style.height = h + 'px';
    var box = $('pvBox'); box.style.width = w + 'px'; box.style.height = h + 'px'; box.style.transform = 'scale(' + s + ')';
  }
  $('pvPhone').onclick = function () { pvMode = 'phone'; this.setAttribute('aria-pressed', 'true'); $('pvPc').setAttribute('aria-pressed', 'false'); sizePreview(); };
  $('pvPc').onclick = function () { pvMode = 'pc'; this.setAttribute('aria-pressed', 'true'); $('pvPhone').setAttribute('aria-pressed', 'false'); sizePreview(); };
  $('pvClose').onclick = function () { $('previewWrap').classList.remove('open'); $('pvFrame').src = 'about:blank'; };
  window.addEventListener('resize', function () { if ($('previewWrap').classList.contains('open')) sizePreview(); });

  // ------------------------------------------------------------------ 목록 · 메시지 검토
  function renderLists() {
    var c = state.cache;
    var pending = c.messages.filter(function (m) { return m.status === 'pending'; });
    $('msgList').innerHTML = c.messages.length ? c.messages.map(function (m) {
      return '<div class="item"><div class="t"><b>' + esc(m.body) + '</b><span class="hint">' + esc(m.author_name) + '</span></div><span class="pill ' + m.status + '">' +
        ({ pending: '대기', approved: '공개', rejected: '숨김' })[m.status] + '</span>' +
        (m.status !== 'approved' ? '<button class="primary small" data-mod="approved" data-id="' + m.id + '">공개</button>' : '') +
        (m.status !== 'rejected' ? '<button class="ghost small" data-mod="rejected" data-id="' + m.id + '">숨김</button>' : '') + '</div>';
    }).join('') : '<p class="hint">아직 메시지가 없어요</p>';
    var msgTab = document.querySelector('[data-tab=messages]'); msgTab.textContent = '💬 메시지 검토' + (pending.length ? ' (' + pending.length + ')' : '');
    var rows = [].concat(
      c.issues.map(function (r) { return { t: 'issues', r: r, label: '소식지 ' + r.vol_label, title: r.title }; }),
      c.posts.map(function (r) { return { t: 'posts', r: r, label: r.kind === 'notice' ? '공지' : '현장 이야기', title: r.title }; }),
      c.hearts.map(function (r) { return { t: 'hearts', r: r, label: 'Heart ' + r.no, title: r.name }; }));
    $('allList').innerHTML = rows.length ? rows.map(function (x) {
      var pub = x.r.status === 'published';
      return '<div class="item"><div class="t"><b>' + esc(x.title) + '</b><span class="hint">' + esc(x.label) + '</span></div><span class="pill ' + x.r.status + '">' + (pub ? '발행' : '임시') + '</span>' +
        '<button class="ghost small" data-edit="' + x.t + '" data-id="' + x.r.id + '">수정</button>' +
        '<button class="ghost small" data-toggle="' + x.t + '" data-id="' + x.r.id + '">' + (pub ? '내리기' : '발행') + '</button></div>';
    }).join('') : '<p class="hint">아직 올린 글이 없어요 (기존 1~3호와 하트 1~20은 연결 후 자동으로 보여요)</p>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-mod],button[data-toggle],button[data-edit]'); if (!b) return;
    var id = b.dataset.id;
    if (b.dataset.mod) {
      var m = state.cache.messages.find(function (x) { return x.id === id; });
      db.save('messages', { id: id, author_name: m.author_name, body: m.body, status: b.dataset.mod, moderated_at: new Date().toISOString() })
        .then(function () { if (b.dataset.mod === 'approved') db.afterPublish({ kind: '메시지', title: m.body.slice(0, 30) }); toast('처리했어요'); return refresh(); })
        .catch(function (err) { toast(err.message); });
      return;
    }
    var t = b.dataset.toggle || b.dataset.edit, r = state.cache[t].find(function (x) { return x.id === id; });
    if (b.dataset.toggle) {
      var next = r.status === 'published' ? 'draft' : 'published';
      if (!confirm(next === 'published' ? '홈페이지에 올릴까요?' : '홈페이지에서 내릴까요? (지워지진 않아요)')) return;
      var row = Object.assign({}, r); delete row.pages; row.status = next;
      db.save(t, row).then(function () { return db.afterPublish({ kind: '변경', title: r.title || r.name }); }).then(function () { toast('반영했어요'); return refresh(); }).catch(function (err) { toast(err.message); });
      return;
    }
    // 수정: 폼으로 불러오기
    if (t === 'issues') {
      state.issueId = r.id; $('iNo').value = r.vol_no; $('iDate').value = r.date_label; $('iTitle').value = r.title; $('iSubtitle').value = r.subtitle || '';
      ['iK1', 'iK2', 'iK3'].forEach(function (k, i) { var v = (r.kpis || [])[i]; $(k).value = v ? v.val + ' | ' + v.label : ''; });
      $('iTitleEn').value = r.title_en || ''; $('iSubtitleEn').value = r.subtitle_en || '';
      state.issueImgs = (r.pages || []).filter(function (p) { return p.edition === 'card'; }).sort(function (a, b) { return a.position - b.position; })
        .map(function (p) { return { url: /^(https?:|blob:|data:)/.test(p.image_path) ? p.image_path : '../' + p.image_path, path: p.image_path }; });
      thumbs('iThumbs', state.issueImgs);
      $('issueEditing').textContent = '(' + r.vol_label + ' 수정 중)'; showTab('issue');
    } else if (t === 'posts') {
      showTab(r.kind); state.postId = r.id; $('pTitle').value = r.title; $('pBody').value = r.body; $('pTitleEn').value = r.title_en || ''; $('pBodyEn').value = r.body_en || '';
      state.postImgs = (r.images || []).map(function (u) { return { url: u }; }); thumbs('pThumbs', state.postImgs);
    } else {
      showTab('heart'); state.heartId = r.id; $('hNo').value = r.no; $('hName').value = r.name; $('hMsg').value = r.message || ''; $('hMsgEn').value = r.message_en || ''; drawHeart();
    }
    window.scrollTo(0, 0);
  });

  // ------------------------------------------------------------------ 로그인 흐름
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    db.login($('loginEmail').value.trim().toLowerCase()).then(function () { $('loginMsg').textContent = '메일을 보냈어요. 메일함에서 링크를 눌러주세요.'; })
      .catch(function (err) { $('loginMsg').textContent = loginErrorText(err); });
  });
  function loginErrorText(err) {
    var e = err || {}, msg = String(e.message || e.msg || e.error_description || '').toLowerCase(), code = String(e.code || e.error_code || '').toLowerCase();
    if (e.status === 429 || /rate limit|over_email_send_rate_limit|over_request_rate_limit/.test(msg + ' ' + code)) return '메일 발송 한도에 걸렸어요. 1시간쯤 뒤에 다시 눌러 주세요.';
    if (/signup|not allowed|otp_disabled|user_not_found|not found/.test(msg + ' ' + code)) return '등록된 관리자 이메일이 아니에요.';
    return '로그인 메일을 보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.';
  }
  window.__onmaumLoginErrorText = loginErrorText;
  $('logoutBtn').onclick = function () { db.logout(); };
  function start() {
    $('setupBanner').hidden = !DEMO;
    db.session().then(function (user) {
      if (!user) { $('loginView').hidden = false; return; }
      return db.isAdmin().then(function (ok) {
        if (!ok) { $('loginView').hidden = false; $('loginMsg').textContent = '관리자로 등록되지 않은 계정이에요.'; return; }
        $('who').textContent = user.email; $('logoutBtn').hidden = false; $('appView').hidden = false;
        showTab('issue'); return refresh();
      });
    });
  }
  if (!DEMO) sb.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_IN' && $('appView').hidden) location.reload(); });
  start();
})();
