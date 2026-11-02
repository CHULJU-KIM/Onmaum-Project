/* 온마음 · 응원 메시지 작성 (섹션 폼 + 하트 카드 모달). 글은 승인 전까지 비공개로 접수 */
(function () {
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  var T = en ? {
    empty: 'Please write your name and a message.',
    sending: 'Sending…',
    ok: 'Thank you. Your message has been received and will appear after we read it.',
    wait: 'Thank you! Please wait a moment before sending another message.',
    dup: 'This message was already received. Thank you.',
    links: 'Please leave out links so we can share your message safely.',
    busy: 'Many messages are arriving right now. Please try again in a few minutes.',
    fail: 'Sorry, the message could not be sent. Please try again in a moment.',
    nameL: 'Your name or nickname', nameP: 'e.g. A friend from Seoul', bodyL: 'Your message', bodyP: 'Write what you would like to share.',
    note: 'Messages appear on the site after we read them. Please don\u2019t include contact details or other personal information.',
    send: 'Send message', close: 'Close',
    pwL: 'Password for deleting (4+ characters)', pwNote: 'You will use this to delete your message later.', pwBad: 'Please set a delete password of 4–20 characters.',
    delTitle: 'Delete this message', delSub: 'Enter the password you set when writing it.', delBtn: 'Delete', delOk: 'Your message has been removed. Thank you for the kind words.',
    delWrong: 'The password doesn\u2019t match.', delTries: 'Too many tries. Please try again in an hour.', delFail: 'Could not delete it. Please try again in a moment.',
    titleFor: function (n) { return '♡ A few words from ' + n; }, titleAll: '🧡 Leave a few kind words',
    subFor: 'Your name is filled in from the card. Feel free to change it.', subAll: 'For the children, the villages, or everyone walking with us.'
  } : {
    empty: '이름과 한마디를 적어 주세요.',
    sending: '보내는 중이에요…',
    ok: '고맙습니다. 마음이 잘 전해졌어요. 읽어 본 뒤 사이트에 공개할게요.',
    wait: '고맙습니다! 다음 글은 잠시 뒤에 남겨 주세요.',
    dup: '이미 같은 글이 접수됐어요. 고맙습니다.',
    links: '링크(주소)는 빼고 적어 주시면 안전하게 전해 드릴게요.',
    busy: '지금 글이 많이 몰리고 있어요. 몇 분 뒤에 다시 시도해 주세요.',
    fail: '죄송해요, 전송이 안 됐어요. 잠시 뒤 다시 시도해 주세요.',
    nameL: '이름 또는 별명', nameP: '예: 서울의 한 마음', bodyL: '전하고 싶은 한마디', bodyP: '아이들에게, 마을에, 함께하는 분들께 전하고 싶은 마음을 적어 주세요.',
    note: '남겨 주신 글은 운영자가 읽어 본 뒤 사이트에 공개돼요. 연락처나 개인정보는 적지 말아 주세요.',
    send: '마음 남기기', close: '닫기',
    pwL: '삭제용 비밀번호 (숫자 4자리 이상)', pwNote: '내 글을 지울 때 사용해요', pwBad: '삭제용 비밀번호를 4~20자로 정해 주세요.',
    delTitle: '내 글 삭제', delSub: '글을 남길 때 정한 삭제용 비밀번호를 넣어 주세요.', delBtn: '삭제하기', delOk: '글을 지웠어요. 따뜻한 마음 고마웠어요.',
    delWrong: '비밀번호가 맞지 않아요', delTries: '시도가 너무 많았어요. 한 시간 뒤에 다시 해 주세요.', delFail: '지우지 못했어요. 잠시 뒤 다시 시도해 주세요.',
    titleFor: function (n) { return '♡ ' + n + '님의 마음 한마디'; }, titleAll: '🧡 마음을 전하는 한마디',
    subFor: '카드의 이름을 미리 넣어 두었어요. 편하게 바꾸셔도 돼요.', subAll: '아이들에게, 마을에, 함께하는 분들께 전하고 싶은 말을 남겨 주세요.'
  };
  var MIN_MS = 3000, COOLDOWN_MS = 60000, KEY = 'onmaum_msg_last';
  function last() { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } }

  var css = document.createElement('style');
  css.textContent = '.msg-pw-note{display:block;font-size:.8rem;color:var(--text-muted,#6e6e73);margin-top:6px}' +
    '.msg-field input[type=password]{max-width:260px}' +
    '.message-card{position:relative}.msg-selfdel{position:absolute;right:10px;bottom:8px;background:none;border:0;padding:4px 6px;font:inherit;font-size:.72rem;color:#a1a1a6;cursor:pointer;text-decoration:underline;opacity:.75}' +
    '.msg-selfdel:hover,.msg-selfdel:focus-visible{opacity:1;color:#b3261e}' +
    '.msg-del-card{max-width:360px}.msg-del-card input{width:100%;box-sizing:border-box;font:inherit;padding:12px 14px;border:1px solid rgba(29,29,31,.14);border-radius:10px;margin:12px 0}' +
    '.msg-del-card .msg-status.err{color:#b3261e}.msg-gentle{text-align:center;color:#1B7E50;font-size:.9rem;margin:12px 0 0}';
  document.head.appendChild(css);
  var pwSeq = 0;
  function addPw(form) {
    if (form.querySelector('[name=delete_pw]')) return;
    var id = 'msgPw' + (++pwSeq), d = document.createElement('div');
    d.className = 'msg-field';
    d.innerHTML = '<label for="' + id + '">' + T.pwL + '</label><input id="' + id + '" name="delete_pw" type="password" inputmode="numeric" minlength="4" maxlength="20" autocomplete="new-password" required /><span class="msg-pw-note">' + T.pwNote + '</span>';
    form.insertBefore(d, form.querySelector('.msg-hp'));
  }
  function bindForm(form, extra) {
    addPw(form);
    var q = function (s) { return form.querySelector(s); };
    var name = q('[name=author_name]'), body = q('[name=body]'), hp = q('[name=website]'), btn = q('[type=submit]'), st = q('.msg-status');
    form.started = Date.now();
    function count(el) { var c = el.parentNode.querySelector('.msg-count'); if (c) c.textContent = el.value.length + ' / ' + el.maxLength; }
    form.recount = function () { count(name); count(body); };
    [name, body].forEach(function (el) { el.addEventListener('input', function () { count(el); }); count(el); });
    function say(msg, kind) { st.textContent = msg; st.className = 'msg-status' + (kind ? ' ' + kind : ''); }
    form.say = say;
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var n = name.value.trim(), b = body.value.trim();
      if (!n || !b) { say(T.empty, 'err'); (n ? body : name).focus(); return; }
      // 봇: 숨은 칸을 채웠거나 너무 빨리 제출 → 성공처럼 보이고 저장 안 함
      if (hp.value || Date.now() - form.started < MIN_MS) { say(T.ok, 'ok'); body.value = ''; form.recount(); return; }
      var pwEl = q('[name=delete_pw]'), pw = pwEl.value;
      if (pw.length < 4 || pw.length > 20) { say(T.pwBad, 'err'); pwEl.focus(); return; }
      if (Date.now() - last() < COOLDOWN_MS) { say(T.wait, 'err'); return; }
      var cfg = window.ONMAUM_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { say(T.fail, 'err'); return; }
      var row = { p_name: n.slice(0, 40), p_body: b.slice(0, 500), p_pw: pw, p_heart_no: (extra && extra()) || null };
      btn.disabled = true; say(T.sending);
      fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/submit_message', {
        method: 'POST',
        headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      }).then(function (r) {
        if (r.ok) {
          try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
          body.value = ''; pwEl.value = ''; form.recount(); form.started = Date.now(); say(T.ok, 'ok'); return;
        }
        return r.text().then(function (t) {
          say(/ONMAUM_DUP/.test(t) ? T.dup : /ONMAUM_LINKS/.test(t) ? T.links : /ONMAUM_BUSY/.test(t) ? T.busy : T.fail, 'err');
        });
      }).catch(function () { say(T.fail, 'err'); })
        .then(function () { btn.disabled = false; });
    });
  }

  var main = document.getElementById('msgForm');
  if (main) bindForm(main);

  // ---- 내 글 삭제 (방명록식 비밀번호)
  var del = document.createElement('div');
  del.className = 'modal-backdrop msg-modal'; del.id = 'msgDelModal';
  del.innerHTML = '<div class="modal-card msg-del-card" role="dialog" aria-modal="true" aria-labelledby="msgDelTitle">' +
    '<button type="button" class="modal-close" data-close aria-label="' + T.close + '">✕</button>' +
    '<h3 class="serif-title" id="msgDelTitle">' + T.delTitle + '</h3><p class="msg-modal-sub">' + T.delSub + '</p>' +
    '<form novalidate><input type="password" name="pw" maxlength="20" autocomplete="off" aria-label="' + T.pwL + '" />' +
    '<div class="msg-actions"><button type="submit" class="btn-primary-lg">' + T.delBtn + '</button><p class="msg-status" role="status" aria-live="polite"></p></div></form></div>';
  document.body.appendChild(del);
  var delId = null, delOpener = null, dform = del.querySelector('form'), dst = del.querySelector('.msg-status');
  function dsay(m, k) { dst.textContent = m; dst.className = 'msg-status' + (k ? ' ' + k : ''); }
  function delClose() { del.classList.remove('active'); document.body.style.overflow = ''; if (delOpener && delOpener.focus && document.contains(delOpener)) delOpener.focus(); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-selfdel]');
    if (!b) return;
    e.preventDefault(); delId = b.getAttribute('data-selfdel'); delOpener = b;
    dform.pw.value = ''; dsay(''); del.classList.add('active'); document.body.style.overflow = 'hidden';
    setTimeout(function () { dform.pw.focus(); }, 30);
  });
  del.addEventListener('click', function (e) { if (e.target === del || e.target.closest('[data-close]')) delClose(); });
  document.addEventListener('keydown', function (e) {
    if (del.classList.contains('active') && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); delClose(); }
  }, true);
  dform.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = dform.pw.value, cfg = window.ONMAUM_CONFIG || {}, btn = dform.querySelector('[type=submit]');
    if (!pw) { dsay(T.delWrong, 'err'); return; }
    btn.disabled = true;
    fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/delete_own_message', {
      method: 'POST',
      headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_id: delId, p_pw: pw })
    }).then(function (r) {
      return r.text().then(function (t) {
        if (r.ok && t.trim() === 'true') {
          var card = document.querySelector('[data-msg-id="' + delId + '"]');
          if (card) {
            var g = document.createElement('p'); g.className = 'msg-gentle'; g.textContent = T.delOk;
            var list = card.parentNode; card.remove(); list.parentNode.insertBefore(g, list.nextSibling);
            setTimeout(function () { g.remove(); }, 6000);
          }
          delClose(); return;
        }
        dsay(/ONMAUM_TRIES/.test(t) ? T.delTries : r.ok ? T.delWrong : T.delFail, 'err');
      });
    }).catch(function () { dsay(T.delFail, 'err'); }).then(function () { btn.disabled = false; });
  });

  // ---- 하트 카드 → 한마디 모달
  if (!document.querySelector('[data-heart-say]') && !document.getElementById('heartsGrid')) return;
  var wrap = document.createElement('div');
  wrap.className = 'modal-backdrop msg-modal'; wrap.id = 'msgModal';
  wrap.innerHTML =
    '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="msgModalTitle">' +
    '<button type="button" class="modal-close" data-close aria-label="' + T.close + '">✕</button>' +
    '<h3 class="serif-title" id="msgModalTitle"></h3><p class="msg-modal-sub" id="msgModalSub"></p>' +
    '<form class="msg-form" novalidate>' +
    '<div class="msg-field"><label for="mmName">' + T.nameL + '</label><input id="mmName" name="author_name" type="text" maxlength="40" autocomplete="nickname" placeholder="' + T.nameP + '" required /><span class="msg-count">0 / 40</span></div>' +
    '<div class="msg-field"><label for="mmBody">' + T.bodyL + '</label><textarea id="mmBody" name="body" rows="4" maxlength="500" placeholder="' + T.bodyP + '" required></textarea><span class="msg-count">0 / 500</span></div>' +
    '<div class="msg-hp" aria-hidden="true"><label for="mmWebsite">Website</label><input id="mmWebsite" name="website" type="text" tabindex="-1" autocomplete="off" /></div>' +
    '<p class="msg-note">' + T.note + '</p>' +
    '<div class="msg-actions"><button type="submit" class="btn-primary-lg">' + T.send + '</button><p class="msg-status" role="status" aria-live="polite"></p></div>' +
    '</form></div>';
  document.body.appendChild(wrap);
  var mform = wrap.querySelector('form'), heartNo = null, opener = null;
  bindForm(mform, function () { return heartNo; });

  function focusables() { return [].slice.call(wrap.querySelectorAll('button, input:not([tabindex="-1"]), textarea')).filter(function (e) { return !e.disabled; }); }
  function open(no, nm, from) {
    heartNo = no ? +no : null; opener = from || null;
    document.getElementById('msgModalTitle').textContent = nm ? T.titleFor(nm) : T.titleAll;
    document.getElementById('msgModalSub').textContent = nm ? T.subFor : T.subAll;
    mform.querySelector('[name=author_name]').value = nm || '';
    mform.say(''); mform.recount(); mform.started = Date.now();
    wrap.classList.add('active'); document.body.style.overflow = 'hidden';
    setTimeout(function () { (nm ? mform.querySelector('[name=body]') : mform.querySelector('[name=author_name]')).focus(); }, 30);
  }
  function close() {
    wrap.classList.remove('active'); document.body.style.overflow = '';
    if (opener && opener.focus) opener.focus();
  }
  window.openMessageModal = open;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-heart-say]');
    if (b) { e.preventDefault(); e.stopPropagation(); open(b.getAttribute('data-heart-say'), b.getAttribute('data-heart-name'), b); }
  }, true);
  wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', function (e) {
    if (!wrap.classList.contains('active')) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    if (e.key === 'Tab') {
      var f = focusables(), i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }, true);
})();
