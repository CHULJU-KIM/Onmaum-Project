/* 온마음 · 응원 메시지 작성 폼 (승인 전까지 비공개로 접수) */
(function () {
  var form = document.getElementById('msgForm');
  if (!form) return;
  var en = (document.documentElement.lang || '').indexOf('en') === 0;
  var T = en ? {
    empty: 'Please write your name and a message.',
    sending: 'Sending…',
    ok: 'Thank you. Your message has been received and will appear after we read it.',
    wait: 'Thank you! Please wait a moment before sending another message.',
    dup: 'This message was already received. Thank you.',
    links: 'Please leave out links so we can share your message safely.',
    busy: 'Many messages are arriving right now. Please try again in a few minutes.',
    fail: 'Sorry, the message could not be sent. Please try again in a moment.'
  } : {
    empty: '이름과 한마디를 적어 주세요.',
    sending: '보내는 중이에요…',
    ok: '고맙습니다. 마음이 잘 전해졌어요. 읽어 본 뒤 사이트에 공개할게요.',
    wait: '고맙습니다! 다음 글은 잠시 뒤에 남겨 주세요.',
    dup: '이미 같은 글이 접수됐어요. 고맙습니다.',
    links: '링크(주소)는 빼고 적어 주시면 안전하게 전해 드릴게요.',
    busy: '지금 글이 많이 몰리고 있어요. 몇 분 뒤에 다시 시도해 주세요.',
    fail: '죄송해요, 전송이 안 됐어요. 잠시 뒤 다시 시도해 주세요.'
  };
  var $ = function (id) { return document.getElementById(id); };
  var name = $('msgName'), body = $('msgBody'), hp = $('msgWebsite'), btn = $('msgSubmit'), st = $('msgStatus');
  var started = Date.now(), MIN_MS = 3000, COOLDOWN_MS = 60000, KEY = 'onmaum_msg_last';

  function count(el) {
    var c = form.querySelector('.msg-count[data-for="' + el.id + '"]');
    if (c) c.textContent = el.value.length + ' / ' + el.maxLength;
  }
  [name, body].forEach(function (el) { el.addEventListener('input', function () { count(el); }); count(el); });
  function say(msg, kind) { st.textContent = msg; st.className = 'msg-status' + (kind ? ' ' + kind : ''); }
  function last() { try { return +localStorage.getItem(KEY) || 0; } catch (e) { return 0; } }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var n = name.value.trim(), b = body.value.trim();
    if (!n || !b) { say(T.empty, 'err'); (n ? body : name).focus(); return; }
    // 봇: 숨은 칸을 채웠거나 너무 빨리 제출 → 조용히 성공처럼 보이고 저장 안 함
    if (hp.value || Date.now() - started < MIN_MS) { say(T.ok, 'ok'); form.reset(); count(name); count(body); return; }
    if (Date.now() - last() < COOLDOWN_MS) { say(T.wait, 'err'); return; }
    var cfg = window.ONMAUM_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) { say(T.fail, 'err'); return; }
    btn.disabled = true; say(T.sending);
    fetch(cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/messages', {
      method: 'POST',
      headers: { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ author_name: n.slice(0, 40), body: b.slice(0, 500) })
    }).then(function (r) {
      if (r.ok) {
        try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
        form.reset(); count(name); count(body); started = Date.now(); say(T.ok, 'ok'); return;
      }
      return r.text().then(function (t) {
        say(/ONMAUM_DUP/.test(t) ? T.dup : /ONMAUM_LINKS/.test(t) ? T.links : /ONMAUM_BUSY/.test(t) ? T.busy : T.fail, 'err');
      });
    }).catch(function () { say(T.fail, 'err'); })
      .then(function () { btn.disabled = false; });
  });
})();
