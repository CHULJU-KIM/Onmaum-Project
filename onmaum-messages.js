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
    titleFor: function (n) { return '♡ ' + n + '님의 마음 한마디'; }, titleAll: '🧡 마음을 전하는 한마디',
    subFor: '카드의 이름을 미리 넣어 두었어요. 편하게 바꾸셔도 돼요.', subAll: '아이들에게, 마을에, 함께하는 분들께 전하고 싶은 말을 남겨 주세요.'
  };
  var MIN_MS = 3000, COOLDOWN_MS = 60000, KEY = 'onmaum_msg_last';
  function last() { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } }

  function bindForm(form, extra) {
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
      if (Date.now() - last() < COOLDOWN_MS) { say(T.wait, 'err'); return; }
      var cfg = window.ONMAUM_CONFIG || {};
      if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { say(T.fail, 'err'); return; }
      var row = { author_name: n.slice(0, 40), body: b.slice(0, 500) };
      var hn = extra && extra(); if (hn) row.heart_no = hn;
      btn.disabled = true; say(T.sending);
      fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/messages', {
        method: 'POST',
        headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      }).then(function (r) {
        if (r.ok) {
          try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
          body.value = ''; form.recount(); form.started = Date.now(); say(T.ok, 'ok'); return;
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
