/*
 * 記録画面（LIFF）。場所を複数ボタンで選び、手段ボタンを1つ選んで送信する。
 * 場所・手段の一覧は毎回 GAS から受け取る（このファイルに農園の情報を書かない）。
 * 表示はすべて createElement と textContent で作る。キーボードを出す要素は作らない。
 */

/** グループへ送る文の先頭（Handler.js の無視の条件と同じ文字列）。 */
var NOTICE_PREFIX = '【記録】';

/** GAS への要求の待ち時間（ミリ秒）。 */
var RECORD_APP_TIMEOUT_MS = 30000;

var RECORD_APP_TEXT = {
  notConfigured: '記録画面の設定がまだです（管理者に連絡してください）',
  loading: '読み込み中…',
  liffFailed: 'LINE の準備ができませんでした。画面を閉じて開き直してください',
  loadFailed: '読み込めませんでした。電波のよい所で開き直してください',
  emptyMasters: '場所マスタ・手段マスタが空です（管理者に連絡してください）',
  sending: '送信中…',
  sendUnknown: '送信できたか分かりません。もう一度「送信」を押してください（10分以内の同じ記録は二重になりません）',
  noticeInfo: 'グループのトークから開いたときだけ、グループに【記録】を送ります',
  noticeFailed: 'グループへの【記録】の送信に失敗しました（記録はできています）',
  nameSuffix: 'さんとして記録します',
  selectedPrefix: '選択中：',
  noLocation: '（場所を選んでください）',
  noMethod: '（手段を選んでください）',
  title: '除草の記録',
  locationsHeading: '場所',
  methodsHeading: '手段',
  send: '送信',
  reset: '選び直す',
  again: '続けて記録する',
  close: '閉じる'
};

// ---- 純粋関数 ----

/** config に LIFF ID と GAS の exec URL が正しい形で入っているとき true。 */
function isValidConfig(c) {
  if (c === null || typeof c !== 'object') return false;
  if (typeof c.liffId !== 'string' || typeof c.apiUrl !== 'string') return false;
  return /^\d{1,20}-[A-Za-z0-9]{1,40}$/.test(c.liffId) &&
    /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/.test(c.apiUrl);
}

/** selected に code があれば除き、なければ末尾に加えた新しい配列を返す（引数は変えない）。 */
function toggleLocation(selected, code) {
  var list = Array.isArray(selected) ? selected : [];
  var out = [];
  var found = false;
  for (var i = 0; i < list.length; i++) {
    if (list[i] === code) found = true;
    else out.push(list[i]);
  }
  if (!found) out.push(code);
  return out;
}

/** groups の表示順に並べた、selected に含まれる表記の配列。 */
function orderedSelection(groups, selected) {
  var out = [];
  if (!Array.isArray(groups) || !Array.isArray(selected)) return out;
  for (var g = 0; g < groups.length; g++) {
    var locs = groups[g] && Array.isArray(groups[g].locations) ? groups[g].locations : [];
    for (var i = 0; i < locs.length; i++) {
      if (selected.indexOf(locs[i]) >= 0 && out.indexOf(locs[i]) < 0) out.push(locs[i]);
    }
  }
  return out;
}

/** 場所が1つ以上、手段が空でない文字列のとき true。 */
function canSend(selected, method) {
  return Array.isArray(selected) && selected.length >= 1 && typeof method === 'string' && method !== '';
}

/** GAS への要求オブジェクト。 */
function buildRequest(action, idToken, locations, method) {
  if (action === 'form') return { action: action, idToken: idToken };
  return { action: action, idToken: idToken, locations: locations, method: method };
}

/** 記録できた場所があるときグループへ送る文、それ以外は null。 */
function buildNoticeText(response) {
  if (response === null || typeof response !== 'object') return null;
  if (response.result !== 'ok' || !Array.isArray(response.recorded) || response.recorded.length === 0) return null;
  if (typeof response.method !== 'string') return null;
  return NOTICE_PREFIX + response.recorded.join('・') + ' ' + response.method;
}

/** グループのトークから開いたときだけ true。 */
function shouldSendNotice(contextType) {
  return contextType === 'group';
}

// ---- 画面（ブラウザのときだけ動く） ----

function recordAppIsStringArray_(a) {
  if (!Array.isArray(a)) return false;
  for (var i = 0; i < a.length; i++) if (typeof a[i] !== 'string') return false;
  return true;
}

/** FORM_OK の形か。 */
function recordAppIsForm_(data) {
  if (data.result !== 'ok' || typeof data.name !== 'string') return false;
  if (!Array.isArray(data.groups) || !recordAppIsStringArray_(data.methods)) return false;
  for (var i = 0; i < data.groups.length; i++) {
    var g = data.groups[i];
    if (g === null || typeof g !== 'object' || typeof g.label !== 'string' || !recordAppIsStringArray_(g.locations)) return false;
  }
  return true;
}

/** RECORD_OK の形か。 */
function recordAppIsRecordOk_(data) {
  return data.result === 'ok' && typeof data.message === 'string' && Array.isArray(data.recorded);
}

function recordAppStart_() {
  var root = document.getElementById('app');
  var T = RECORD_APP_TEXT;
  var config = typeof RECORD_APP_CONFIG !== 'undefined' ? RECORD_APP_CONFIG : null;
  var state = { idToken: '', name: '', groups: [], methods: [], selected: [], method: '', sending: false, error: '' };

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function button(text, className, onClick) {
    var b = el('button', className, text);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  }

  function clear() {
    while (root.firstChild) root.removeChild(root.firstChild);
    root.appendChild(el('h1', 'title', T.title));
  }

  function showMessage(text) {
    clear();
    root.appendChild(el('p', 'message', text));
  }

  /** GAS へ POST し、{ ok: true, data } か { ok: false } を返す（失敗・2xx 以外・JSON でない・時間切れは同じ扱い）。 */
  function post(body) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, RECORD_APP_TIMEOUT_MS);
    return fetch(config.apiUrl + '?route=record', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal
    }).then(function (res) {
      if (!res.ok) throw new Error('http');
      return res.text();
    }).then(function (text) {
      clearTimeout(timer);
      var data = JSON.parse(text);
      if (data === null || typeof data !== 'object' || Array.isArray(data)) return { ok: false };
      return { ok: true, data: data };
    }).catch(function () {
      clearTimeout(timer);
      return { ok: false };
    });
  }

  function selectionText() {
    var locs = orderedSelection(state.groups, state.selected);
    return T.selectedPrefix + (locs.length ? locs.join('・') : T.noLocation) + '／' +
      (state.method !== '' ? state.method : T.noMethod);
  }

  function choiceButton(text, isSelected, onClick) {
    var b = button(text, 'choice' + (isSelected ? ' selected' : ''), onClick);
    b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    b.disabled = state.sending;
    return b;
  }

  function renderSelect() {
    clear();
    root.appendChild(el('p', 'name', state.name + T.nameSuffix));

    root.appendChild(el('h2', 'heading', T.locationsHeading));
    state.groups.forEach(function (g) {
      if (g.locations.length === 0) return;
      root.appendChild(el('h3', 'group-label', g.label));
      var box = el('div', 'choices');
      g.locations.forEach(function (loc) {
        box.appendChild(choiceButton(loc, state.selected.indexOf(loc) >= 0, function () {
          if (state.sending) return;
          state.selected = toggleLocation(state.selected, loc);
          state.error = '';
          renderSelect();
        }));
      });
      root.appendChild(box);
    });

    root.appendChild(el('h2', 'heading', T.methodsHeading));
    var methods = el('div', 'choices');
    state.methods.forEach(function (m) {
      methods.appendChild(choiceButton(m, state.method === m, function () {
        if (state.sending) return;
        state.method = state.method === m ? '' : m;
        state.error = '';
        renderSelect();
      }));
    });
    root.appendChild(methods);

    root.appendChild(el('p', 'note', T.noticeInfo));

    var bar = el('div', 'actions');
    bar.appendChild(el('p', 'selection', selectionText()));
    if (state.sending) bar.appendChild(el('p', 'status', T.sending));
    else if (state.error !== '') bar.appendChild(el('p', 'status error', state.error));
    var row = el('div', 'action-row');
    var reset = button(T.reset, 'reset', function () {
      if (state.sending) return;
      state.selected = [];
      state.method = '';
      state.error = '';
      renderSelect();
    });
    reset.disabled = state.sending;
    row.appendChild(reset);
    var send = button(T.send, 'send', onSend);
    send.disabled = state.sending || !canSend(state.selected, state.method);
    row.appendChild(send);
    bar.appendChild(row);
    root.appendChild(bar);
  }

  function onSend() {
    if (state.sending || !canSend(state.selected, state.method)) return;
    state.sending = true;
    state.error = '';
    renderSelect();
    var locations = orderedSelection(state.groups, state.selected);
    post(buildRequest('record', state.idToken, locations, state.method)).then(function (r) {
      state.sending = false;
      if (r.ok && recordAppIsRecordOk_(r.data)) {
        renderResult(r.data);
        return;
      }
      if (r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string') state.error = r.data.message;
      else state.error = T.sendUnknown;
      renderSelect();
    }).catch(function () {
      state.sending = false;
      state.error = T.sendUnknown;
      renderSelect();
    });
  }

  function renderResult(data) {
    clear();
    root.appendChild(el('p', 'result', data.message));
    root.appendChild(el('p', 'note', T.noticeInfo));
    var noticeArea = el('div', 'notice-area');
    root.appendChild(noticeArea);
    var row = el('div', 'action-row result-actions');
    row.appendChild(button(T.again, 'again', function () {
      state.selected = [];
      state.method = '';
      state.error = '';
      renderSelect();
    }));
    row.appendChild(button(T.close, 'close', function () {
      liff.closeWindow();
    }));
    root.appendChild(row);
    sendNotice(data, noticeArea);
  }

  function sendNotice(data, noticeArea) {
    var text = buildNoticeText(data);
    if (text === null) return;
    var type;
    try {
      var context = liff.getContext();
      type = context ? context.type : undefined;
    } catch (e) {
      type = undefined;
    }
    if (!shouldSendNotice(type)) return;
    Promise.resolve().then(function () {
      return liff.sendMessages([{ type: 'text', text: text }]);
    }).catch(function () {
      noticeArea.appendChild(el('p', 'status error', T.noticeFailed));
    });
  }

  function loadForm() {
    post(buildRequest('form', state.idToken)).then(function (r) {
      if (!r.ok) {
        showMessage(T.loadFailed);
        return;
      }
      var data = r.data;
      if (data.result !== 'ok') {
        showMessage(typeof data.message === 'string' ? data.message : T.loadFailed);
        return;
      }
      if (!recordAppIsForm_(data)) {
        showMessage(T.loadFailed);
        return;
      }
      var count = 0;
      for (var i = 0; i < data.groups.length; i++) count += data.groups[i].locations.length;
      if (count === 0 || data.methods.length === 0) {
        showMessage(T.emptyMasters);
        return;
      }
      state.name = data.name;
      state.groups = data.groups;
      state.methods = data.methods;
      renderSelect();
    }).catch(function () {
      showMessage(T.loadFailed);
    });
  }

  if (!isValidConfig(config)) {
    showMessage(T.notConfigured);
    return;
  }
  showMessage(T.loading);
  Promise.resolve().then(function () {
    return liff.init({ liffId: config.liffId, withLoginOnExternalBrowser: true });
  }).then(function () {
    var token = liff.getIDToken();
    if (typeof token !== 'string' || token === '') {
      showMessage(T.liffFailed);
      return;
    }
    state.idToken = token;
    loadForm();
  }, function () {
    showMessage(T.liffFailed);
  }).catch(function () {
    showMessage(T.liffFailed);
  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    isValidConfig: isValidConfig,
    toggleLocation: toggleLocation,
    orderedSelection: orderedSelection,
    canSend: canSend,
    buildRequest: buildRequest,
    buildNoticeText: buildNoticeText,
    shouldSendNotice: shouldSendNotice,
    NOTICE_PREFIX: NOTICE_PREFIX
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  recordAppStart_();
}
