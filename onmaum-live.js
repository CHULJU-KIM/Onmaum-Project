/* 온마음 라이브 데이터 로더
 * - Supabase 가 설정돼 있으면 발행된 소식지·하트·이야기·메시지를 불러와 화면을 갱신
 * - 설정이 없거나, 4초 안에 응답이 없거나, 오류가 나면 → 지금의 정적 데이터를 그대로 사용
 * - 관리자 페이지 미리보기(postMessage)도 여기서 받음
 * 같은 파일을 Node(scripts/bake.mjs)에서도 변환 함수로 재사용합니다.
 */
(function (root) {
  'use strict';
  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var en = false; // en.html 은 lang=en 일 때 영문 필드를 우선

  function toIssues(rows) {
    rows = (rows || []).slice().sort(function (a, b) { return b.vol_no - a.vol_no; });
    return rows.map(function (r, idx) {
      var pages = (r.pages || []).slice().sort(function (a, b) { return a.position - b.position; });
      var card = pages.filter(function (p) { return p.edition === 'card'; }).map(function (p) { return p.image_path; });
      var orig = pages.filter(function (p) { return p.edition === 'original'; }).map(function (p) { return p.image_path; });
      return {
        id: r.slug, vol: r.vol_label, badge: r.badge || (r.vol_label + ' · ONMAUM NEWSLETTER'), isNew: idx === 0,
        date: r.date_label, title: (en && r.title_en) || r.title, subtitle: (en && r.subtitle_en) || r.subtitle || '',
        kpis: r.kpis || [], pagesCard: card.length ? card : orig, pagesOriginal: orig.length ? orig : card, notes: r.notes || []
      };
    });
  }
  function toHearts(rows) {
    return (rows || []).map(function (h) { return [h.no, h.name, h.card_path || null, (en && h.message_en) || h.message || null]; })
      .sort(function (a, b) { return a[0] - b[0]; });
  }
  function fmtDate(d) {
    if (!d) return '';
    var x = new Date(d); return x.getFullYear() + '. ' + (x.getMonth() + 1) + '. ' + x.getDate() + '.';
  }
  function storiesHtml(rows) {
    return (rows || []).map(function (p) {
      var img = (p.images || [])[0];
      var kind = p.kind === 'notice' ? (en ? 'NOTICE' : '공지') : (en ? 'FIELD STORY' : '현장 이야기');
      return '<article class="story-card">' + (img ? '<img src="' + esc(img) + '" alt="' + esc(p.title) + '" loading="lazy" />' : '') +
        '<div class="sc-body"><span class="story-kind">' + kind + '</span><h3>' + esc((en && p.title_en) || p.title) + '</h3><p>' +
        esc((en && p.body_en) || p.body) + '</p><time>' + fmtDate(p.published_at) + '</time></div></article>';
    }).join('');
  }
  function messagesHtml(msgs, hearts) {
    var items = (hearts || []).filter(function (h) { return h.message; })
      .map(function (h) { return { body: (en && h.message_en) || h.message, who: 'Onmaum Heart ' + h.no + ' · ' + h.name }; })
      .concat((msgs || []).map(function (m) { return { body: m.body, who: m.author_name, id: m.self_deletable ? m.id : null }; }));
    return items.map(function (m) {
      return '<div class="message-card"' + (m.id ? ' data-msg-id="' + esc(m.id) + '"' : '') + '>“' + esc(m.body) + '”<b>' + esc(m.who) + '</b>' +
        (m.id ? '<button type="button" class="msg-selfdel" data-selfdel="' + esc(m.id) + '">' + (en ? 'Delete' : '삭제') + '</button>' : '') + '</div>';
    }).join('');
  }
  var api = { toIssues: toIssues, toHearts: toHearts, storiesHtml: storiesHtml, messagesHtml: messagesHtml, esc: esc };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.OnmaumLive = api;
  en = (document.documentElement.lang || '').indexOf('en') === 0;

  function replaceArr(arr, items) { arr.splice.apply(arr, [0, arr.length].concat(items)); }
  function apply(d) {
    try {
      if (d.issues && d.issues.length && typeof NEWSLETTERS_DATA !== 'undefined' && root.renderNewsletterHub) {
        replaceArr(NEWSLETTERS_DATA, toIssues(d.issues));
        try { currentIssueIdx = 0; currentPageIdx = 0; } catch (e) {}
        root.renderNewsletterHub();
      }
      if (d.hearts && d.hearts.length && typeof ONMAUM_HEARTS !== 'undefined' && root.renderHearts) {
        replaceArr(ONMAUM_HEARTS, toHearts(d.hearts));
        root.renderHearts();
      }
      if (d.posts) setSection('stories', 'storiesGrid', storiesHtml(d.posts));
      if (d.messages || d.hearts) setSection('messages', 'messagesList', messagesHtml(d.messages, d.hearts));
    } catch (e) { if (root.console) console.warn('[onmaum] live data skipped', e); }
  }
  function setSection(secId, boxId, html) {
    var sec = document.getElementById(secId), box = document.getElementById(boxId);
    if (!sec || !box) return;
    box.innerHTML = html;
    if (secId === 'messages') { // 작성 폼이 있으니 비어도 섹션은 보임
      sec.hidden = false; box.hidden = !html;
      var empty = document.getElementById('messagesEmpty'); if (empty) empty.hidden = !!html;
    } else sec.hidden = !html;
  }
  root.OnmaumLive.apply = apply;

  // 관리자 미리보기: 같은 출처에서 온 메시지만 받음
  root.addEventListener('message', function (ev) {
    if (ev.origin !== location.origin || !ev.data || ev.data.type !== 'onmaum-preview') return;
    apply(ev.data.payload || {});
    if (ev.data.scrollTo) { var t = document.getElementById(ev.data.scrollTo); if (t) t.scrollIntoView(); }
  });

  var cfg = root.ONMAUM_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || /[?&]static=1/.test(location.search)) return; // 정적 모드
  var base = cfg.supabaseUrl.replace(/\/$/, '') + '/rest/v1/';
  var headers = { apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey };
  function get(path) {
    var ctl = root.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { ctl && ctl.abort(); }, 4000);
    return fetch(base + path, { headers: headers, signal: ctl && ctl.signal })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  Promise.all([
    get('issues?select=*,pages(*)&status=eq.published&order=vol_no.desc').catch(function () { return null; }),
    get('hearts?select=no,name,card_path,message,message_en&status=eq.published&order=no').catch(function () { return null; }),
    get('posts?select=*&status=eq.published&order=published_at.desc&limit=12').catch(function () { return null; }),
    get('messages?select=id,author_name,body,self_deletable,created_at&status=eq.approved&order=created_at.desc&limit=30').catch(function () { return null; })
  ]).then(function (r) {
    var go = function () { apply({ issues: r[0], hearts: r[1], posts: r[2], messages: r[3] }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  });
})(typeof window !== 'undefined' ? window : globalThis);
