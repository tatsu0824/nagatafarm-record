/*
 * 記録画面（LIFF）。場所を複数ボタンで選び、手段ボタンを1つ選んで送信する。
 * 場所・手段の一覧は毎回 GAS から受け取る（このファイルに農園の情報を書かない）。
 * 表示はすべて createElement と textContent で作る。キーボードを出す要素は作らない。
 */

/** グループへ送る文の先頭（Handler.js の無視の条件と同じ文字列）。 */
var NOTICE_PREFIX = '【記録】';

/** 取り消したときグループへ送る文の先頭（Handler.js の無視の条件と同じ文字列）。 */
var CANCEL_NOTICE_PREFIX = '【取消】';

/** 範囲の方角（この順に並べる。RecordForm.js・Alert.js の定数と同じ）。 */
var RANGE_DIRECTIONS = ['東', '西', '南', '北'];

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
  rangeHeading: '範囲',
  rangeWhole: '全体',
  rangeNote: '方角は複数選べます。東・西・南・北の4つがそろうと全体を除草したことになります',
  rangeNotRecorded: '範囲を記録できていない可能性があります（管理者に連絡してください）',
  methodsHeading: '手段',
  send: '送信',
  reset: '選び直す',
  again: '続けて記録する',
  close: '閉じる'
};

/** 記録の取り消しの画面の文。 */
var RECORD_APP_CANCEL_TEXT = {
  open: '記録を取り消す',
  listHeading: '取り消せる記録',
  listNote: '自分が24時間以内に記録したものだけ取り消せます',
  noticeInfo: 'グループのトークから開いたときだけ、グループに【取消】を送ります',
  empty: '取り消せる記録はありません',
  pick: '取り消す',
  back: '記録に戻る',
  confirm: 'この記録を取り消しますか？',
  no: 'やめる',
  yes: '取り消す',
  cancelling: '取り消し中…',
  unknown: '取り消せたか分かりません。「続けて取り消す」で一覧を開き直して確かめてください',
  noticeFailed: 'グループへの【取消】の送信に失敗しました（取り消しはできています）',
  more: '続けて取り消す'
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

/** GAS への要求オブジェクト。record で range が長さ1以上の配列のときだけ method の後に range（コピー）を付ける。 */
function buildRequest(action, idToken, locations, method, range) {
  if (action === 'form') return { action: action, idToken: idToken };
  var req = { action: action, idToken: idToken, locations: locations, method: method };
  if (action === 'record' && Array.isArray(range) && range.length >= 1) req.range = range.slice();
  return req;
}

/** 記録できた場所があるときグループへ送る文、それ以外は null。範囲があれば各場所を「コード（東・南）」にする。 */
function buildNoticeText(response) {
  if (response === null || typeof response !== 'object') return null;
  if (response.result !== 'ok' || !Array.isArray(response.recorded) || response.recorded.length === 0) return null;
  if (typeof response.method !== 'string') return null;
  var places = response.recorded;
  if (recordAppIsStringArray_(response.range) && response.range.length >= 1) {
    var suffix = '（' + response.range.join('・') + '）';
    places = places.map(function (code) { return code + suffix; });
  }
  return NOTICE_PREFIX + places.join('・') + ' ' + response.method;
}

/**
 * 範囲の選択を切り替えた新しい配列（引数は変えない）。
 * 全体 → []。方角 → あれば除き、なければ加える。それ以外 → 方角だけのコピー。どれも東西南北の順。
 */
function toggleRange(range, dir) {
  if (dir === RECORD_APP_TEXT.rangeWhole) return [];
  var list = Array.isArray(range) ? range : [];
  var out = [];
  for (var i = 0; i < RANGE_DIRECTIONS.length; i++) {
    var d = RANGE_DIRECTIONS[i];
    var has = list.indexOf(d) >= 0;
    if (d === dir) has = !has;
    if (has) out.push(d);
  }
  return out;
}

/** グループのトークから開いたときだけ true。 */
function shouldSendNotice(contextType) {
  return contextType === 'group';
}

/**
 * URL のクエリ（例 ?loc=<場所>）から、地図が渡した場所コードを1つ取り出す。なければ null。
 * loc がなければ liff.state の中の loc を読む。候補がちょうど1個で長さ 1〜100 のときだけ返す。例外を投げない。
 */
function readPresetLocation(search) {
  try {
    if (typeof search !== 'string' || typeof URLSearchParams !== 'function') return null;
    var p = new URLSearchParams(search);
    var list = p.getAll('loc');
    if (list.length === 0) {
      var states = p.getAll('liff.state');
      if (states.length !== 1) return null;
      var q = states[0].indexOf('?');
      if (q < 0) return null;
      var rest = states[0].slice(q + 1);
      var h = rest.indexOf('#');
      if (h >= 0) rest = rest.slice(0, h);
      list = new URLSearchParams(rest).getAll('loc');
    }
    if (list.length !== 1) return null;
    var v = list[0];
    return typeof v === 'string' && v.length >= 1 && v.length <= 100 ? v : null;
  } catch (e) {
    return null;
  }
}

/** Parser.js の normalizeText_ と同じ規則の正規化。 */
function recordAppPresetKey_(s) {
  return s.normalize('NFKC').replace(/　/g, ' ').toUpperCase().trim();
}

/** groups の表示順で、正規化して code と一致する最初の表記1つだけの新しい配列。なければ []。引数は変えない。 */
function presetSelection(groups, code) {
  if (typeof code !== 'string') return [];
  var want = recordAppPresetKey_(code);
  if (want === '' || !Array.isArray(groups)) return [];
  for (var g = 0; g < groups.length; g++) {
    var group = groups[g];
    if (group === null || typeof group !== 'object' || !Array.isArray(group.locations)) continue;
    for (var i = 0; i < group.locations.length; i++) {
      var loc = group.locations[i];
      if (typeof loc === 'string' && recordAppPresetKey_(loc) === want) return [loc];
    }
  }
  return [];
}

/** 自分の取り消せる記録の一覧の要求。 */
function buildMineRequest(idToken) {
  return { action: 'mine', idToken: idToken };
}

/** 取り消しの要求。値は一覧の項目のまま（item は変えない。time・label は含めない）。 */
function buildCancelRequest(idToken, item) {
  return { action: 'cancel', idToken: idToken, row: item.row, receivedAt: item.receivedAt, locationCode: item.locationCode };
}

/** 取り消せたときグループへ送る文、それ以外は null。 */
function buildCancelNoticeText(response) {
  if (!recordAppIsCancelOk_(response)) return null;
  var c = response.cancelled;
  if (c.label === '' || c.time === '') return null;
  return CANCEL_NOTICE_PREFIX + c.label + '（' + c.time + ' の記録）';
}

/** 自分の取り消せる記録の一覧の応答（MINE_OK）の形なら true。 */
function isMineResponse(data) {
  if (data === null || typeof data !== 'object' || data.result !== 'ok' || !Array.isArray(data.records)) return false;
  for (var i = 0; i < data.records.length; i++) {
    var r = data.records[i];
    if (r === null || typeof r !== 'object') return false;
    if (typeof r.row !== 'number' || !Number.isInteger(r.row) || r.row < 2) return false;
    if (typeof r.receivedAt !== 'string' || typeof r.locationCode !== 'string' ||
      typeof r.time !== 'string' || typeof r.label !== 'string') return false;
  }
  return true;
}

/** CANCEL_OK の形か。 */
function recordAppIsCancelOk_(data) {
  if (data === null || typeof data !== 'object' || data.result !== 'ok' || typeof data.message !== 'string') return false;
  var c = data.cancelled;
  return c !== null && typeof c === 'object' && typeof c.time === 'string' && typeof c.label === 'string';
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
  var TC = RECORD_APP_CANCEL_TEXT;
  var config = typeof RECORD_APP_CONFIG !== 'undefined' ? RECORD_APP_CONFIG : null;
  var state = { idToken: '', name: '', groups: [], methods: [], selected: [], range: [], method: '', sending: false, error: '', mine: [], cancelling: false };

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
      (state.range.length ? state.range.join('・') : T.rangeWhole) + '／' +
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

    root.appendChild(el('h2', 'heading', T.rangeHeading));
    var ranges = el('div', 'choices');
    [T.rangeWhole].concat(RANGE_DIRECTIONS).forEach(function (dir) {
      var isSelected = dir === T.rangeWhole ? state.range.length === 0 : state.range.indexOf(dir) >= 0;
      ranges.appendChild(choiceButton(dir, isSelected, function () {
        if (state.sending) return;
        state.range = toggleRange(state.range, dir);
        state.error = '';
        renderSelect();
      }));
    });
    root.appendChild(ranges);
    root.appendChild(el('p', 'note', T.rangeNote));

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
      state.range = [];
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
    var cancelRow = el('div', 'action-row');
    var cancelOpen = button(TC.open, 'again cancel-open', function () {
      if (state.sending) return;
      openCancelList();
    });
    cancelOpen.disabled = state.sending;
    cancelRow.appendChild(cancelOpen);
    root.appendChild(cancelRow);
    root.appendChild(bar);
  }

  function onSend() {
    if (state.sending || !canSend(state.selected, state.method)) return;
    state.sending = true;
    state.error = '';
    renderSelect();
    var locations = orderedSelection(state.groups, state.selected);
    var range = state.range.slice();
    post(buildRequest('record', state.idToken, locations, state.method, range)).then(function (r) {
      state.sending = false;
      if (r.ok && recordAppIsRecordOk_(r.data)) {
        renderResult(r.data, range);
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

  /** 送った範囲と応答の range が同じ並びか。 */
  function sameRange(sent, got) {
    if (!Array.isArray(got) || got.length !== sent.length) return false;
    for (var i = 0; i < sent.length; i++) if (got[i] !== sent[i]) return false;
    return true;
  }

  function renderResult(data, sentRange) {
    clear();
    root.appendChild(el('p', 'result', data.message));
    if (sentRange.length >= 1 && !sameRange(sentRange, data.range)) {
      root.appendChild(el('p', 'status error', T.rangeNotRecorded));
    }
    root.appendChild(el('p', 'note', T.noticeInfo));
    var noticeArea = el('div', 'notice-area');
    root.appendChild(noticeArea);
    var row = el('div', 'action-row result-actions');
    row.appendChild(button(T.again, 'again', function () {
      state.selected = [];
      state.range = [];
      state.method = '';
      state.error = '';
      renderSelect();
    }));
    row.appendChild(button(T.close, 'close', function () {
      liff.closeWindow();
    }));
    root.appendChild(row);
    var cancelRow = el('div', 'action-row');
    cancelRow.appendChild(button(TC.open, 'again cancel-open', openCancelList));
    root.appendChild(cancelRow);
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

  // ---- 記録の取り消し ----

  /** 場所・範囲・手段の選択とエラーを全部解除して選ぶ画面へ（FORM を送り直さない）。 */
  function backToRecord() {
    state.selected = [];
    state.range = [];
    state.method = '';
    state.error = '';
    renderSelect();
  }

  function backRow() {
    var row = el('div', 'action-row');
    row.appendChild(button(TC.back, 'reset cancel-back', backToRecord));
    return row;
  }

  /** mine を送って一覧を開く（押したときだけ）。 */
  function openCancelList() {
    showMessage(T.loading);
    post(buildMineRequest(state.idToken)).then(function (r) {
      if (r.ok && isMineResponse(r.data)) {
        state.mine = r.data.records;
        renderCancelList();
        return;
      }
      showMessage(r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string' ? r.data.message : T.loadFailed);
      root.appendChild(backRow());
    }).catch(function () {
      showMessage(T.loadFailed);
      root.appendChild(backRow());
    });
  }

  function itemText(item) {
    return item.time + ' ' + item.label;
  }

  function renderCancelList() {
    clear();
    root.appendChild(el('h2', 'heading', TC.listHeading));
    root.appendChild(el('p', 'note', TC.listNote));
    root.appendChild(el('p', 'note', TC.noticeInfo));
    if (state.mine.length === 0) root.appendChild(el('p', 'message', TC.empty));
    state.mine.forEach(function (item) {
      var box = el('div');
      box.appendChild(el('p', 'result', itemText(item)));
      box.appendChild(button(TC.pick, 'again cancel-pick', function () {
        renderCancelConfirm(item);
      }));
      root.appendChild(box);
    });
    root.appendChild(backRow());
  }

  function renderCancelConfirm(item) {
    clear();
    root.appendChild(el('p', 'message', TC.confirm));
    root.appendChild(el('p', 'result', itemText(item)));
    var row = el('div', 'action-row');
    var no = button(TC.no, 'reset cancel-no', function () {
      if (state.cancelling) return;
      renderCancelList();
    });
    var yes = button(TC.yes, 'send cancel-yes', function () {
      if (state.cancelling) return;
      state.cancelling = true;
      no.disabled = true;
      yes.disabled = true;
      root.appendChild(el('p', 'status', TC.cancelling));
      post(buildCancelRequest(state.idToken, item)).then(function (r) {
        state.cancelling = false;
        renderCancelResult(r);
      }).catch(function () {
        state.cancelling = false;
        renderCancelResult({ ok: false });
      });
    });
    row.appendChild(no);
    row.appendChild(yes);
    root.appendChild(row);
  }

  function cancelResultRow() {
    var row = el('div', 'action-row result-actions');
    row.appendChild(button(TC.more, 'again cancel-more', openCancelList));
    row.appendChild(button(TC.back, 'reset cancel-back', backToRecord));
    row.appendChild(button(T.close, 'close', function () {
      liff.closeWindow();
    }));
    return row;
  }

  function renderCancelResult(r) {
    clear();
    if (r.ok && recordAppIsCancelOk_(r.data)) {
      root.appendChild(el('p', 'result', r.data.message));
      root.appendChild(el('p', 'note', TC.noticeInfo));
      var noticeArea = el('div', 'notice-area');
      root.appendChild(noticeArea);
      root.appendChild(cancelResultRow());
      sendCancelNotice(r.data, noticeArea);
      return;
    }
    if (r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string') {
      root.appendChild(el('p', 'result', r.data.message));
    } else {
      root.appendChild(el('p', 'status error', TC.unknown));
    }
    root.appendChild(cancelResultRow());
  }

  function sendCancelNotice(data, noticeArea) {
    var text = buildCancelNoticeText(data);
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
      noticeArea.appendChild(el('p', 'status error', TC.noticeFailed));
    });
  }

  function loadForm(preset) {
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
      state.selected = presetSelection(data.groups, preset);
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
    var preset;
    try {
      preset = readPresetLocation(window.location.search);
    } catch (e) {
      preset = null;
    }
    loadForm(preset);
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
    NOTICE_PREFIX: NOTICE_PREFIX,
    toggleRange: toggleRange,
    RANGE_DIRECTIONS: RANGE_DIRECTIONS,
    readPresetLocation: readPresetLocation,
    presetSelection: presetSelection
  };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  recordAppStart_();
}
