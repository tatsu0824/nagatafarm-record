/*
 * 記録画面（LIFF）の在庫の画面。?go=stock（在庫を記録）・?go=stocklist（在庫を見る）で app.js から呼ばれる。
 * 種類・単位・品目・区分・残りの数は毎回 GAS（?route=stock）から受け取る（このファイルに品目名・種類名・単位などの現場の情報を書かない）。
 * 表示はすべて createElement と textContent で作る。キーボードを出す要素は数の入力欄だけ。
 * グループには何も送らない。読み込んだだけでは何もしない（app.js が stockAppStart を呼ぶ）。
 */

/** GAS への要求の待ち時間（ミリ秒）。 */
var STOCK_TIMEOUT_MS = 30000;

/** 画面の文言（1か所ずつ）。 */
var STOCK_APP_TEXT = {
  titleRecord: '在庫を記録',
  titleList: '在庫を見る',
  loading: '読み込み中…',
  loadFailed: '読み込めませんでした。電波のよい所で開き直してください',
  noRecordable: '記録できる品目がありません（管理者に連絡してください）',
  nameSuffix: 'さんとして記録します',
  kindHeading: '種類',
  kindPrefix: '種類：',
  groupHeading: '区分',
  itemHeading: '品目',
  moveHeading: '動き',
  countHeading: '数',
  unitOpen: '（',
  unitClose: '）',
  nowPrefix: 'いまの残り：',
  none: '記録なし',
  moveIn: '入れた',
  moveOut: '使った',
  moveCount: '数えなおし',
  noteIn: '入れた数（1〜999）',
  noteOut: '使った数（1〜999）',
  noteCount: 'いま数えた数（0〜999）。この数が残りになります',
  errorInOut: '数は 1〜999 の整数で入れてください',
  errorCount: '数は 0〜999 の整数で入れてください',
  toConfirm: '確認へ',
  reset: '選び直す',
  confirm: 'この内容で記録しますか？',
  expectedPrefix: '記録後の残り（見込み）：',
  send: '記録する',
  back: '戻る',
  sending: '送信中…',
  remainPrefix: '残り ',
  orderHead: '要発注：残りが目安（',
  orderTail: '）以下です',
  negative: '記録の数が合いません。数えなおしてください',
  sendUnknown: '送信できたか分かりません。「記録を取り消す」の一覧で確かめてから、もう一度記録してください',
  again: '続けて記録する',
  openList: '在庫を見る',
  openRecord: '在庫を記録する',
  asOfTail: ' 時点',
  orderCountHead: '要発注：',
  orderCountTail: '品目',
  orderCountNone: 'なし',
  kindNotReady: '設定がまだです（管理者に連絡してください）',
  kindEmpty: '品目がまだありません',
  groupMark: '■',
  markOrder: '（要発注）',
  markRecount: '（数えなおしてください）',
  markBoth: '（要発注・数えなおしてください）',
  cancelOpen: '記録を取り消す',
  cancelHeading: '取り消せる在庫の記録',
  cancelNote: '自分が24時間以内に記録したものだけ取り消せます',
  cancelEmpty: '取り消せる記録はありません',
  cancelConfirm: 'この記録を取り消しますか？',
  cancelYes: '取り消す',
  cancelNo: 'やめる',
  cancelUnknown: '取り消せたか分かりません。「続けて取り消す」で一覧を開き直して確かめてください',
  cancelMore: '続けて取り消す',
  backToRecord: '在庫の記録に戻る',
  close: '閉じる',
  batchOpen: 'まとめて記録（棚卸・納品）',
  batchOne: '1つずつ記録',
  batchNoteIn: '入れた数を書いてください（1〜999）。空欄の品目は記録しません',
  batchNoteOut: '使った数を書いてください（1〜999）。空欄の品目は記録しません',
  batchNoteCount: 'いま数えた数を書いてください（0〜999）。この数が残りになります。空欄の品目は記録しません',
  batchCountHead: '記録する品目：',
  batchInvalidHead: '数が正しくない品目があります：',
  batchConfirm: 'この内容でまとめて記録しますか？',
  batchBullet: '・',
  batchExpectedOpen: '（記録後の残り ',
  batchSend: 'まとめて記録する',
  batchAfter: '記録後の残り',
  batchBackToInput: '入力に戻る',
  batchLabelTail: 'の数'
};

/** まとめての記録で一度に送れる品目の上限。 */
var STOCK_BATCH_MAX = 200;

/** 動きの値（GAS の move と同じ）。この順にボタンを並べる。 */
var STOCK_MOVES = ['in', 'out', 'count'];

/**
 * URL のクエリから在庫の画面の種類を読む（app.js の readGoMap と同じ読み方）。
 * go がなければ、LIFF が付ける state の印がちょうど1つのとき、その中の最初の ? の後ろ（# の前まで）の go を読む。
 * 値がちょうど1つで stock → 'stock'、stocklist → 'stocklist'、ほか → ''。例外を投げない。
 */
function stockAppMode(search) {
  try {
    if (typeof search !== 'string' || typeof URLSearchParams !== 'function') return '';
    var p = new URLSearchParams(search);
    var list = p.getAll('go');
    if (list.length === 0) {
      var states = p.getAll('liff.state');
      if (states.length !== 1) return '';
      var q = states[0].indexOf('?');
      if (q < 0) return '';
      var rest = states[0].slice(q + 1);
      var h = rest.indexOf('#');
      if (h >= 0) rest = rest.slice(0, h);
      list = new URLSearchParams(rest).getAll('go');
    }
    if (list.length !== 1) return '';
    if (list[0] === 'stock') return 'stock';
    if (list[0] === 'stocklist') return 'stocklist';
    return '';
  } catch (e) {
    return '';
  }
}

/** 数の入力を読む。NFKC・前後の空白除きで 1〜3 桁の数字。in・out は 1〜999、count は 0〜999。ほかは null。 */
function stockParseCount(text, move) {
  if (typeof text !== 'string') return null;
  var min;
  if (move === 'in' || move === 'out') min = 1;
  else if (move === 'count') min = 0;
  else return null;
  var s = text.normalize('NFKC').trim();
  if (!/^[0-9]{1,3}$/.test(s)) return null;
  var n = Number(s);
  return n >= min && n <= 999 ? n : null;
}

/** 動きの語。 */
function stockMoveLabel(move) {
  if (move === 'in') return STOCK_APP_TEXT.moveIn;
  if (move === 'out') return STOCK_APP_TEXT.moveOut;
  if (move === 'count') return STOCK_APP_TEXT.moveCount;
  return '';
}

/** 記録後の残りの見込み（stock が null なら 0 として計算する）。 */
function stockExpected(stock, move, count) {
  var base = stock === null ? 0 : stock;
  if (move === 'in') return base + count;
  if (move === 'out') return base - count;
  if (move === 'count') return count;
  return base;
}

/** 一覧の1行（GAS の stockItemLine_(entry, unit) と同じ結果）。unit が文字列でなければ単位なし。 */
function stockItemLine(entry, unit) {
  var T = STOCK_APP_TEXT;
  if (entry === null || typeof entry !== 'object') return '';
  var u = typeof unit === 'string' ? unit : '';
  var stock = entry.stock;
  var line = entry.item + ' ' + (typeof stock === 'number' ? stock + u : T.none);
  var order = entry.order === true;
  var recount = typeof stock === 'number' && stock < 0;
  if (order && recount) return line + T.markBoth;
  if (order) return line + T.markOrder;
  if (recount) return line + T.markRecount;
  return line;
}

/**
 * 在庫の行の左と右の文字（{ name, amount }）。name は品目名と印、amount は残りの数と単位（null なら記録なし）。
 * stockItemLine(entry, unit) === entry.item + ' ' + amount + 印 になる。entry を変えない。例外を投げない。
 */
function stockItemParts(entry, unit) {
  var T = STOCK_APP_TEXT;
  if (entry === null || typeof entry !== 'object') return { name: '', amount: '' };
  var u = typeof unit === 'string' ? unit : '';
  var stock = entry.stock;
  var amount = typeof stock === 'number' ? stock + u : T.none;
  var order = entry.order === true;
  var recount = typeof stock === 'number' && stock < 0;
  var mark = '';
  if (order && recount) mark = T.markBoth;
  else if (order) mark = T.markOrder;
  else if (recount) mark = T.markRecount;
  return { name: entry.item + mark, amount: amount };
}

function stockListBody(idToken) {
  return { action: 'stockList', idToken: idToken };
}

function stockRecordBody(idToken, kind, item, move, count) {
  return { action: 'stockRecord', idToken: idToken, kind: kind, item: item, move: move, count: count };
}

function stockMineBody(idToken) {
  return { action: 'stockMine', idToken: idToken };
}

function stockCancelBody(idToken, rec) {
  return { action: 'stockCancel', idToken: idToken, kind: rec.kind, row: rec.row, recordedAt: rec.recordedAt, item: rec.item };
}

function stockIsObject_(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function stockIsIntOrNull_(v) {
  return v === null || (typeof v === 'number' && Number.isInteger(v));
}

function stockIsGroups_(groups) {
  return Array.isArray(groups) && groups.every(function (g) {
    return stockIsObject_(g) && typeof g.label === 'string' && Array.isArray(g.items) && g.items.every(function (e) {
      return stockIsObject_(e) && typeof e.item === 'string' && e.item.length >= 1 && stockIsIntOrNull_(e.stock) && typeof e.order === 'boolean';
    });
  });
}

/** STOCK_LIST_OK の形なら true。 */
function stockIsList(data) {
  if (!stockIsObject_(data) || data.result !== 'ok') return false;
  if (typeof data.name !== 'string' || typeof data.asOf !== 'string' || !Array.isArray(data.kinds)) return false;
  return data.kinds.every(function (k) {
    if (!stockIsObject_(k) || typeof k.kind !== 'string' || k.kind.length < 1 || typeof k.unit !== 'string' ||
      typeof k.ready !== 'boolean' || !stockIsGroups_(k.groups)) return false;
    if (k.ready) return k.unit.length >= 1;
    return k.groups.length === 0;
  });
}

/** STOCK_RECORD_OK の形なら true。 */
function stockIsRecordOk(data) {
  return stockIsObject_(data) && data.result === 'ok' && typeof data.message === 'string' && typeof data.kind === 'string' &&
    typeof data.unit === 'string' && typeof data.item === 'string' && typeof data.stock === 'number' && Number.isInteger(data.stock) &&
    typeof data.order === 'boolean' && stockIsIntOrNull_(data.threshold);
}

/** STOCK_MINE_OK の形なら true。 */
function stockIsMine(data) {
  if (!stockIsObject_(data) || data.result !== 'ok' || !Array.isArray(data.records)) return false;
  return data.records.every(function (r) {
    return stockIsObject_(r) && typeof r.kind === 'string' && typeof r.row === 'number' && Number.isSafeInteger(r.row) && r.row >= 2 &&
      typeof r.recordedAt === 'string' && typeof r.item === 'string' && typeof r.time === 'string' && typeof r.label === 'string';
  });
}

/** STOCK_CANCEL_OK の形なら true。 */
function stockIsCancelOk(data) {
  return stockIsObject_(data) && data.result === 'ok' && typeof data.message === 'string' && typeof data.kind === 'string' &&
    typeof data.unit === 'string' && typeof data.item === 'string' && stockIsIntOrNull_(data.stock);
}

/** 記録に使える種類（ready が真で品目が1個以上）を順を保って返す。data を変えない。形が違えば []。 */
function stockRecordKinds(data) {
  if (!stockIsList(data)) return [];
  return data.kinds.filter(function (k) {
    return k.ready && k.groups.some(function (g) { return g.items.length >= 1; });
  });
}

/**
 * まとめての表の行（[{ item, text }]。表の順）を読む。{ entries: [{ item, count }], invalid: [item, …] } を返す。
 * 空欄（文字列でない、または NFKC・前後の空白除きで ''）は飛ばす。形の違う要素も飛ばす。rows を変えない。例外を投げない。
 */
function stockBatchEntries(rows, move) {
  var out = { entries: [], invalid: [] };
  if (!Array.isArray(rows)) return out;
  rows.forEach(function (r) {
    if (r === null || typeof r !== 'object' || typeof r.item !== 'string' || r.item.length < 1) return;
    if (typeof r.text !== 'string' || r.text.normalize('NFKC').trim() === '') return;
    var n = stockParseCount(r.text, move);
    if (n === null) out.invalid.push(r.item);
    else out.entries.push({ item: r.item, count: n });
  });
  return out;
}

function stockBatchBody(idToken, kind, move, entries) {
  return {
    action: 'stockBatch', idToken: idToken, kind: kind, move: move,
    entries: entries.map(function (e) { return { item: e.item, count: e.count }; })
  };
}

/** STOCK_BATCH_OK の形なら true。 */
function stockIsBatchOk(data) {
  if (!stockIsObject_(data) || data.result !== 'ok') return false;
  if (typeof data.message !== 'string' || typeof data.kind !== 'string' || typeof data.unit !== 'string') return false;
  if (STOCK_MOVES.indexOf(data.move) < 0) return false;
  if (!Array.isArray(data.results) || data.results.length < 1) return false;
  return data.results.every(function (r) {
    return stockIsObject_(r) && typeof r.item === 'string' && r.item.length >= 1 &&
      typeof r.count === 'number' && Number.isInteger(r.count) && typeof r.stock === 'number' && Number.isInteger(r.stock) &&
      typeof r.order === 'boolean';
  });
}

/**
 * 在庫の画面を root の中に作る（ブラウザだけで使う）。mode は 'stock'（在庫を記録）か 'stocklist'（在庫を見る）。
 * app.js の関数・状態は使わない。
 */
function stockAppStart(root, config, idToken, mode) {
  var T = STOCK_APP_TEXT;
  var state = { name: '', kinds: [], kind: null, group: null, item: null, move: '', countText: '', count: null, sending: false, mine: [] };
  /** まとめての画面の状態（動き・表に入れた文字（品目名ごと）・その種類・確認へ進んだときの entries）。 */
  var batch = { kind: null, move: '', texts: Object.create(null), entries: [] };
  /** いま出ている「確認へ」のボタン（数の入力のたびに disabled だけを更新する）。 */
  var toConfirmButton = null;

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

  function choiceButton(text, isSelected, onClick) {
    var b = button(text, 'choice' + (isSelected ? ' selected' : ''), onClick);
    b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    return b;
  }

  function clear(title) {
    while (root.firstChild) root.removeChild(root.firstChild);
    document.title = title;
    root.appendChild(el('h1', 'title', title));
  }

  function showMessage(title, text) {
    clear(title);
    root.appendChild(el('p', 'message', text));
  }

  /** 在庫の行（左に品目名と印、右に数）。warn なら赤い太字（既存の status error）。 */
  function itemRow(entry, unit, warn) {
    var parts = stockItemParts(entry, unit);
    var row = el('div', warn ? 'status error' : 'name');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'baseline';
    row.style.gap = '8px';
    var left = el('div', '', parts.name);
    left.style.flex = '1 1 auto';
    left.style.minWidth = '0';
    left.style.overflowWrap = 'anywhere';
    var right = el('div', '', parts.amount);
    right.style.flex = '0 0 auto';
    right.style.textAlign = 'right';
    right.style.whiteSpace = 'nowrap';
    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function closeButton() {
    return button(T.close, 'close', function () {
      liff.closeWindow();
    });
  }

  /** GAS へ POST し、{ ok: true, data } か { ok: false } を返す（失敗・2xx 以外・JSON でない・時間切れは同じ扱い）。 */
  function post(body) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, STOCK_TIMEOUT_MS);
    return fetch(config.apiUrl + '?route=stock', {
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

  /** stockList を読み、正しければ onOk(data)。読めないときは title の画面に文を出す。 */
  function loadList(title, onOk) {
    showMessage(title, T.loading);
    post(stockListBody(idToken)).then(function (r) {
      if (!r.ok) {
        showMessage(title, T.loadFailed);
        return;
      }
      var data = r.data;
      if (data.result !== 'ok' && typeof data.message === 'string') {
        showMessage(title, data.message);
        return;
      }
      if (!stockIsList(data)) {
        showMessage(title, T.loadFailed);
        return;
      }
      onOk(data);
    }).catch(function () {
      showMessage(title, T.loadFailed);
    });
  }

  function findKind(name) {
    for (var i = 0; i < state.kinds.length; i++) if (state.kinds[i].kind === name) return state.kinds[i];
    return null;
  }

  function currentKind() {
    return state.kind !== null ? findKind(state.kind) : null;
  }

  function currentGroups() {
    var k = currentKind();
    return k !== null ? k.groups : [];
  }

  function currentUnit() {
    var k = currentKind();
    return k !== null ? k.unit : '';
  }

  function findGroup(label) {
    var groups = currentGroups();
    for (var i = 0; i < groups.length; i++) if (groups[i].label === label) return groups[i];
    return null;
  }

  function findEntry(item) {
    var groups = currentGroups();
    for (var i = 0; i < groups.length; i++) {
      var items = groups[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].item === item) return items[j];
    }
    return null;
  }

  /** いまの種類の区分が1つなら選ぶ。選んでいる区分がもう無ければ消す。 */
  function settleGroup() {
    if (state.group !== null && findGroup(state.group) === null) state.group = null;
    var groups = currentGroups();
    if (groups.length === 1) state.group = groups[0].label;
  }

  /** 一覧のデータで選ぶ画面を始める（種類・区分の選択は残す。品目・動き・数は消す）。 */
  function useList(data) {
    var kinds = stockRecordKinds(data);
    if (kinds.length === 0) {
      showMessage(T.titleRecord, T.noRecordable);
      return;
    }
    state.name = data.name;
    state.kinds = kinds;
    if (state.kind !== null && findKind(state.kind) === null) {
      state.kind = null;
      state.group = null;
    }
    if (state.kinds.length === 1) state.kind = state.kinds[0].kind;
    if (state.kind === null) state.group = null;
    settleGroup();
    state.item = null;
    state.move = '';
    state.countText = '';
    state.count = null;
    renderSelect();
  }

  function openRecord() {
    loadList(T.titleRecord, useList);
  }

  // ---- 在庫を記録（選ぶ画面） ----

  function ready() {
    return state.kind !== null && state.item !== null && state.move !== '' && stockParseCount(state.countText, state.move) !== null;
  }

  function updateCountError(area) {
    while (area.firstChild) area.removeChild(area.firstChild);
    if (state.countText !== '' && stockParseCount(state.countText, state.move) === null) {
      area.appendChild(el('p', 'status error', state.move === 'count' ? T.errorCount : T.errorInOut));
    }
  }

  function moveNote(move) {
    if (move === 'in') return T.noteIn;
    if (move === 'out') return T.noteOut;
    return T.noteCount;
  }

  function renderSelect() {
    toConfirmButton = null;
    clear(T.titleRecord);
    root.appendChild(el('p', 'name', state.name + T.nameSuffix));

    if (state.kinds.length >= 2) {
      var kindCard = el('div', 'card');
      kindCard.appendChild(el('h2', 'heading', T.kindHeading));
      var kindChoices = el('div', 'choices');
      state.kinds.forEach(function (k) {
        kindChoices.appendChild(choiceButton(k.kind, state.kind === k.kind, function () {
          if (state.kind === k.kind) return;
          state.kind = k.kind;
          state.group = null;
          settleGroup();
          state.item = null;
          state.move = '';
          state.countText = '';
          resetBatch();
          renderSelect();
        }));
      });
      kindCard.appendChild(kindChoices);
      root.appendChild(kindCard);
    } else if (state.kind !== null) {
      root.appendChild(el('p', 'note', T.kindPrefix + state.kind));
    }

    var unit = currentUnit();
    if (currentKind() !== null) {
      var groupCard = el('div', 'card');
      groupCard.appendChild(el('h2', 'heading', T.groupHeading));
      var groupChoices = el('div', 'choices');
      currentGroups().forEach(function (g) {
        groupChoices.appendChild(choiceButton(g.label, state.group === g.label, function () {
          if (state.group === g.label) return;
          state.group = g.label;
          state.item = null;
          state.move = '';
          state.countText = '';
          renderSelect();
        }));
      });
      groupCard.appendChild(groupChoices);
      root.appendChild(groupCard);
    }

    var group = state.group !== null ? findGroup(state.group) : null;
    if (group !== null) {
      var itemCard = el('div', 'card');
      itemCard.appendChild(el('h2', 'heading', T.itemHeading));
      var itemChoices = el('div', 'choices');
      group.items.forEach(function (e) {
        itemChoices.appendChild(choiceButton(e.item, state.item === e.item, function () {
          if (state.item === e.item) return;
          state.item = e.item;
          state.move = '';
          state.countText = '';
          renderSelect();
        }));
      });
      itemCard.appendChild(itemChoices);
      root.appendChild(itemCard);
    }

    var entry = state.item !== null ? findEntry(state.item) : null;
    if (entry !== null) {
      var moveCard = el('div', 'card');
      moveCard.appendChild(el('h2', 'heading', T.moveHeading));
      moveCard.appendChild(el('p', 'note', T.nowPrefix + (entry.stock === null ? T.none : entry.stock + unit)));
      var moveChoices = el('div', 'choices');
      STOCK_MOVES.forEach(function (m) {
        moveChoices.appendChild(choiceButton(stockMoveLabel(m), state.move === m, function () {
          if (state.move === m) return;
          state.move = m;
          renderSelect();
        }));
      });
      moveCard.appendChild(moveChoices);
      root.appendChild(moveCard);

      if (state.move !== '') {
        var countCard = el('div', 'card');
        countCard.appendChild(el('h2', 'heading', T.countHeading + T.unitOpen + unit + T.unitClose));
        var input = el('input', 'stock-count');
        input.type = 'text';
        input.inputMode = 'numeric';
        input.setAttribute('inputmode', 'numeric');
        input.pattern = '[0-9]*';
        input.autocomplete = 'off';
        input.maxLength = 3;
        input.setAttribute('aria-label', T.countHeading);
        input.style.width = '100%';
        input.style.height = '48px';
        input.style.fontSize = '18px';
        input.value = state.countText;
        var errorArea = el('div');
        input.addEventListener('input', function () {
          state.countText = String(input.value);
          updateCountError(errorArea);
          if (toConfirmButton !== null) toConfirmButton.disabled = !ready();
        });
        countCard.appendChild(input);
        countCard.appendChild(el('p', 'note', moveNote(state.move)));
        countCard.appendChild(errorArea);
        updateCountError(errorArea);
        root.appendChild(countCard);
      }
    }

    var bar = el('div', 'actions');
    var row = el('div', 'action-row');
    var toConfirm = button(T.toConfirm, 'send', function () {
      if (!ready()) return;
      state.count = stockParseCount(state.countText, state.move);
      renderConfirm();
    });
    toConfirm.disabled = !ready();
    toConfirmButton = toConfirm;
    row.appendChild(toConfirm);
    row.appendChild(button(T.reset, 'reset', function () {
      state.item = null;
      state.move = '';
      state.countText = '';
      renderSelect();
    }));
    bar.appendChild(row);
    var navRow = el('div', 'action-row');
    navRow.appendChild(button(T.openList, 'again', openList));
    navRow.appendChild(button(T.cancelOpen, 'again', openCancelList));
    bar.appendChild(navRow);
    var batchRow = el('div', 'action-row');
    batchRow.appendChild(button(T.batchOpen, 'again', renderBatch));
    bar.appendChild(batchRow);
    root.appendChild(bar);
  }

  // ---- 確認・送信・結果 ----

  function renderConfirm() {
    toConfirmButton = null;
    clear(T.titleRecord);
    var entry = findEntry(state.item);
    var stock = entry !== null ? entry.stock : null;
    var unit = currentUnit();
    var card = el('div', 'card');
    card.appendChild(el('h2', 'heading', T.confirm));
    card.appendChild(el('p', 'result', state.kind + '\n' + state.item + '\n' + stockMoveLabel(state.move) + ' ' + state.count + unit + '\n' +
      T.expectedPrefix + stockExpected(stock, state.move, state.count) + unit));
    root.appendChild(card);
    var row = el('div', 'action-row');
    var send = button(T.send, 'send', function () {
      if (state.sending) return;
      state.sending = true;
      send.disabled = true;
      back.disabled = true;
      root.appendChild(el('p', 'status', T.sending));
      post(stockRecordBody(idToken, state.kind, state.item, state.move, state.count)).then(function (r) {
        state.sending = false;
        renderRecordResult(r);
      }).catch(function () {
        state.sending = false;
        renderRecordResult({ ok: false });
      });
    });
    var back = button(T.back, 'reset', function () {
      if (state.sending) return;
      renderSelect();
    });
    row.appendChild(send);
    row.appendChild(back);
    root.appendChild(row);
  }

  function renderRecordResult(r) {
    clear(T.titleRecord);
    if (r.ok && stockIsRecordOk(r.data)) {
      var d = r.data;
      root.appendChild(el('p', 'result', d.message));
      root.appendChild(el('p', 'result', T.remainPrefix + d.stock + d.unit));
      if (d.order && d.threshold !== null) root.appendChild(el('p', 'status error', T.orderHead + d.threshold + d.unit + T.orderTail));
      if (d.stock < 0) root.appendChild(el('p', 'status error', T.negative));
    } else if (r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string') {
      root.appendChild(el('p', 'result', r.data.message));
    } else {
      root.appendChild(el('p', 'status error', T.sendUnknown));
    }
    var row1 = el('div', 'action-row result-actions');
    row1.appendChild(button(T.again, 'again', openRecord));
    row1.appendChild(button(T.openList, 'again', openList));
    root.appendChild(row1);
    var row2 = el('div', 'action-row result-actions');
    row2.appendChild(button(T.cancelOpen, 'reset', openCancelList));
    row2.appendChild(closeButton());
    root.appendChild(row2);
  }

  // ---- まとめて記録（棚卸・納品） ----

  /** まとめての動きと表の数を消す（種類を変えたとき・まとめての記録ができたとき・続けて記録するとき）。 */
  function resetBatch() {
    batch.kind = state.kind;
    batch.move = '';
    batch.texts = Object.create(null);
    batch.entries = [];
  }

  /** いまの種類の品目を表の順に並べた行（[{ item, text }]）。 */
  function batchRows() {
    var rows = [];
    currentGroups().forEach(function (g) {
      g.items.forEach(function (e) {
        rows.push({ item: e.item, text: Object.prototype.hasOwnProperty.call(batch.texts, e.item) ? batch.texts[e.item] : '' });
      });
    });
    return rows;
  }

  function batchState() {
    return stockBatchEntries(batchRows(), batch.move);
  }

  function batchReady(s) {
    return state.kind !== null && batch.move !== '' && s.entries.length >= 1 && s.entries.length <= STOCK_BATCH_MAX && s.invalid.length === 0;
  }

  function batchNote(move) {
    if (move === 'in') return T.batchNoteIn;
    if (move === 'out') return T.batchNoteOut;
    return T.batchNoteCount;
  }

  function updateBatchRowError(area, item) {
    while (area.firstChild) area.removeChild(area.firstChild);
    var text = Object.prototype.hasOwnProperty.call(batch.texts, item) ? batch.texts[item] : '';
    if (stockBatchEntries([{ item: item, text: text }], batch.move).invalid.length === 1) {
      area.appendChild(el('p', 'status error', batch.move === 'count' ? T.errorCount : T.errorInOut));
    }
  }

  /** 帯の文と「確認へ」の disabled を作り直す（帯の中の段のボタンはそのまま使う）。 */
  function updateBatchBar(bar, row, toConfirm) {
    while (bar.firstChild) bar.removeChild(bar.firstChild);
    var s = batchState();
    if (batch.move !== '') {
      bar.appendChild(el('p', 'note', T.batchCountHead + s.entries.length + T.orderCountTail));
      if (s.invalid.length >= 1) bar.appendChild(el('p', 'status error', T.batchInvalidHead + s.invalid.length + T.orderCountTail));
    }
    toConfirm.disabled = !batchReady(s);
    bar.appendChild(row);
  }

  /** 一覧のデータでまとめての画面を始め直す（種類は残す。動きと数は消す）。 */
  function useListBatch(data) {
    var kinds = stockRecordKinds(data);
    if (kinds.length === 0) {
      showMessage(T.titleRecord, T.noRecordable);
      return;
    }
    state.name = data.name;
    state.kinds = kinds;
    if (state.kind !== null && findKind(state.kind) === null) {
      state.kind = null;
      state.group = null;
    }
    if (state.kinds.length === 1) state.kind = state.kinds[0].kind;
    if (state.kind === null) state.group = null;
    settleGroup();
    state.item = null;
    state.move = '';
    state.countText = '';
    state.count = null;
    resetBatch();
    renderBatch();
  }

  /** まとめての画面（読んである一覧のデータを使う。読み直さない）。 */
  function renderBatch() {
    toConfirmButton = null;
    if (batch.kind !== state.kind) resetBatch();
    clear(T.titleRecord);
    root.appendChild(el('p', 'name', state.name + T.nameSuffix));

    if (state.kinds.length >= 2) {
      var kindCard = el('div', 'card');
      kindCard.appendChild(el('h2', 'heading', T.kindHeading));
      var kindChoices = el('div', 'choices');
      state.kinds.forEach(function (k) {
        kindChoices.appendChild(choiceButton(k.kind, state.kind === k.kind, function () {
          if (state.kind === k.kind) return;
          state.kind = k.kind;
          state.group = null;
          settleGroup();
          state.item = null;
          state.move = '';
          state.countText = '';
          resetBatch();
          renderBatch();
        }));
      });
      kindCard.appendChild(kindChoices);
      root.appendChild(kindCard);
    } else if (state.kind !== null) {
      root.appendChild(el('p', 'note', T.kindPrefix + state.kind));
    }

    var bar = el('div', 'actions');
    var row = el('div', 'action-row');
    var toConfirm = button(T.toConfirm, 'send', function () {
      var s = batchState();
      if (!batchReady(s)) return;
      batch.entries = s.entries;
      renderBatchConfirm();
    });
    row.appendChild(toConfirm);
    row.appendChild(button(T.batchOne, 'reset', function () {
      settleGroup();
      state.item = null;
      state.move = '';
      state.countText = '';
      state.count = null;
      renderSelect();
    }));

    if (currentKind() !== null) {
      var moveCard = el('div', 'card');
      moveCard.appendChild(el('h2', 'heading', T.moveHeading));
      var moveChoices = el('div', 'choices');
      STOCK_MOVES.forEach(function (m) {
        moveChoices.appendChild(choiceButton(stockMoveLabel(m), batch.move === m, function () {
          if (batch.move === m) return;
          batch.move = m;
          renderBatch();
        }));
      });
      moveCard.appendChild(moveChoices);
      root.appendChild(moveCard);

      if (batch.move !== '') {
        var unit = currentUnit();
        root.appendChild(el('p', 'note', batchNote(batch.move)));
        currentGroups().forEach(function (g) {
          if (g.items.length === 0) return;
          var card = el('div', 'card');
          card.appendChild(el('h2', 'heading', g.label + T.unitOpen + unit + T.unitClose));
          g.items.forEach(function (e) {
            var line = el('div');
            var r = el('div', 'action-row');
            r.style.alignItems = 'center';
            var name = el('p', 'name', e.item + '\n' + T.nowPrefix + (e.stock === null ? T.none : e.stock + unit));
            name.style.flex = '1 1 0';
            var input = el('input', 'stock-batch-count');
            input.type = 'text';
            input.inputMode = 'numeric';
            input.setAttribute('inputmode', 'numeric');
            input.pattern = '[0-9]*';
            input.autocomplete = 'off';
            input.maxLength = 3;
            input.setAttribute('aria-label', e.item + T.batchLabelTail);
            input.style.width = '96px';
            input.style.height = '48px';
            input.style.fontSize = '18px';
            input.style.flex = '0 0 96px';
            input.style.scrollMarginBottom = '200px';
            input.value = Object.prototype.hasOwnProperty.call(batch.texts, e.item) ? batch.texts[e.item] : '';
            var errorArea = el('div');
            input.addEventListener('input', function () {
              batch.texts[e.item] = String(input.value);
              updateBatchRowError(errorArea, e.item);
              updateBatchBar(bar, row, toConfirm);
            });
            r.appendChild(name);
            r.appendChild(input);
            line.appendChild(r);
            line.appendChild(errorArea);
            updateBatchRowError(errorArea, e.item);
            card.appendChild(line);
          });
          root.appendChild(card);
        });
      }
    }

    updateBatchBar(bar, row, toConfirm);
    root.appendChild(bar);
  }

  function renderBatchConfirm() {
    clear(T.titleRecord);
    var unit = currentUnit();
    var lines = [state.kind, stockMoveLabel(batch.move) + ' ' + batch.entries.length + T.orderCountTail];
    batch.entries.forEach(function (x) {
      var entry = findEntry(x.item);
      var stock = entry !== null ? entry.stock : null;
      lines.push(T.batchBullet + x.item + ' ' + x.count + unit + T.batchExpectedOpen + stockExpected(stock, batch.move, x.count) + unit + T.unitClose);
    });
    var card = el('div', 'card');
    card.appendChild(el('h2', 'heading', T.batchConfirm));
    card.appendChild(el('p', 'result', lines.join('\n')));
    root.appendChild(card);
    var bar = el('div', 'actions');
    var row = el('div', 'action-row');
    var send = button(T.batchSend, 'send', function () {
      if (state.sending) return;
      state.sending = true;
      send.disabled = true;
      back.disabled = true;
      bar.appendChild(el('p', 'status', T.sending));
      post(stockBatchBody(idToken, state.kind, batch.move, batch.entries)).then(function (r) {
        state.sending = false;
        renderBatchResult(r);
      }).catch(function () {
        state.sending = false;
        renderBatchResult({ ok: false });
      });
    });
    var back = button(T.back, 'reset', function () {
      if (state.sending) return;
      renderBatch();
    });
    row.appendChild(send);
    row.appendChild(back);
    bar.appendChild(row);
    root.appendChild(bar);
  }

  function renderBatchResult(r) {
    clear(T.titleRecord);
    var ok = r.ok && stockIsBatchOk(r.data);
    if (ok) {
      var d = r.data;
      resetBatch();
      root.appendChild(el('p', 'result', d.message));
      var orders = d.results.filter(function (x) { return x.order; }).length;
      if (orders >= 1) root.appendChild(el('p', 'status error', T.orderCountHead + orders + T.orderCountTail));
      if (d.results.some(function (x) { return x.stock < 0; })) root.appendChild(el('p', 'status error', T.negative));
      var card = el('div', 'card');
      card.appendChild(el('h2', 'heading', T.batchAfter));
      d.results.forEach(function (x) {
        card.appendChild(itemRow({ item: x.item, stock: x.stock, order: x.order }, d.unit, x.order || x.stock < 0));
      });
      root.appendChild(card);
    } else if (r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string') {
      root.appendChild(el('p', 'result', r.data.message));
    } else {
      root.appendChild(el('p', 'status error', T.sendUnknown));
    }
    var row1 = el('div', 'action-row result-actions');
    if (ok) {
      row1.appendChild(button(T.again, 'again', function () {
        loadList(T.titleRecord, useListBatch);
      }));
    } else {
      row1.appendChild(button(T.batchBackToInput, 'again', renderBatch));
    }
    row1.appendChild(button(T.openList, 'again', openList));
    root.appendChild(row1);
    var row2 = el('div', 'action-row result-actions');
    row2.appendChild(button(T.cancelOpen, 'reset', openCancelList));
    row2.appendChild(closeButton());
    root.appendChild(row2);
  }

  // ---- 在庫を見る ----

  function openList() {
    loadList(T.titleList, renderList);
  }

  function renderList(data) {
    clear(T.titleList);
    root.appendChild(el('p', 'note', data.asOf + T.asOfTail));
    var orders = 0;
    data.kinds.forEach(function (k) {
      k.groups.forEach(function (g) {
        g.items.forEach(function (e) { if (e.order) orders++; });
      });
    });
    if (orders >= 1) root.appendChild(el('p', 'status error', T.orderCountHead + orders + T.orderCountTail));
    else root.appendChild(el('p', 'note', T.orderCountHead + T.orderCountNone));
    data.kinds.forEach(function (k) {
      var card = el('div', 'card');
      card.appendChild(el('h2', 'heading', k.kind));
      var count = 0;
      k.groups.forEach(function (g) { count += g.items.length; });
      if (!k.ready) {
        card.appendChild(el('p', 'status error', T.kindNotReady));
      } else if (count === 0) {
        card.appendChild(el('p', 'note', T.kindEmpty));
      } else {
        k.groups.forEach(function (g) {
          card.appendChild(el('p', 'note', T.groupMark + g.label));
          g.items.forEach(function (e) {
            var warn = e.order || (e.stock !== null && e.stock < 0);
            card.appendChild(itemRow(e, k.unit, warn));
          });
        });
      }
      root.appendChild(card);
    });
    var row = el('div', 'action-row result-actions');
    row.appendChild(button(T.openRecord, 'again', function () {
      useList(data);
    }));
    row.appendChild(closeButton());
    root.appendChild(row);
  }

  // ---- 取り消し ----

  function backRow() {
    var row = el('div', 'action-row');
    row.appendChild(button(T.backToRecord, 'reset', openRecord));
    return row;
  }

  function openCancelList() {
    showMessage(T.titleRecord, T.loading);
    post(stockMineBody(idToken)).then(function (r) {
      if (r.ok && stockIsMine(r.data)) {
        state.mine = r.data.records;
        renderCancelList();
        return;
      }
      showMessage(T.titleRecord, r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string' ? r.data.message : T.loadFailed);
      root.appendChild(backRow());
    }).catch(function () {
      showMessage(T.titleRecord, T.loadFailed);
      root.appendChild(backRow());
    });
  }

  function recText(rec) {
    return rec.time + ' ' + rec.label;
  }

  function renderCancelList() {
    clear(T.titleRecord);
    root.appendChild(el('h2', 'heading', T.cancelHeading));
    root.appendChild(el('p', 'note', T.cancelNote));
    if (state.mine.length === 0) root.appendChild(el('p', 'note', T.cancelEmpty));
    state.mine.forEach(function (rec) {
      var row = el('div', 'action-row');
      row.appendChild(button(recText(rec), 'again', function () {
        renderCancelConfirm(rec);
      }));
      root.appendChild(row);
    });
    root.appendChild(backRow());
  }

  function renderCancelConfirm(rec) {
    clear(T.titleRecord);
    root.appendChild(el('p', 'note', T.kindPrefix + rec.kind));
    root.appendChild(el('p', 'result', recText(rec)));
    root.appendChild(el('p', 'message', T.cancelConfirm));
    var row = el('div', 'action-row');
    var yes = button(T.cancelYes, 'send', function () {
      if (state.sending) return;
      state.sending = true;
      yes.disabled = true;
      no.disabled = true;
      root.appendChild(el('p', 'status', T.sending));
      post(stockCancelBody(idToken, rec)).then(function (r) {
        state.sending = false;
        renderCancelResult(r);
      }).catch(function () {
        state.sending = false;
        renderCancelResult({ ok: false });
      });
    });
    var no = button(T.cancelNo, 'reset', function () {
      if (state.sending) return;
      renderCancelList();
    });
    row.appendChild(yes);
    row.appendChild(no);
    root.appendChild(row);
  }

  function renderCancelResult(r) {
    clear(T.titleRecord);
    if (r.ok && stockIsCancelOk(r.data)) {
      root.appendChild(el('p', 'result', r.data.message));
      if (r.data.stock !== null) {
        root.appendChild(el('p', 'result', T.remainPrefix + r.data.stock + r.data.unit));
        if (r.data.stock < 0) root.appendChild(el('p', 'status error', T.negative));
      }
    } else if (r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string') {
      root.appendChild(el('p', 'result', r.data.message));
    } else {
      root.appendChild(el('p', 'status error', T.cancelUnknown));
    }
    var row = el('div', 'action-row result-actions');
    row.appendChild(button(T.cancelMore, 'again', openCancelList));
    row.appendChild(button(T.backToRecord, 'reset', openRecord));
    row.appendChild(closeButton());
    root.appendChild(row);
  }

  if (mode === 'stocklist') openList();
  else openRecord();
}

if (typeof module !== 'undefined') {
  module.exports = {
    stockAppMode: stockAppMode,
    stockParseCount: stockParseCount,
    stockMoveLabel: stockMoveLabel,
    stockExpected: stockExpected,
    stockItemLine: stockItemLine,
    stockListBody: stockListBody,
    stockRecordBody: stockRecordBody,
    stockMineBody: stockMineBody,
    stockCancelBody: stockCancelBody,
    stockIsList: stockIsList,
    stockIsRecordOk: stockIsRecordOk,
    stockIsMine: stockIsMine,
    stockIsCancelOk: stockIsCancelOk,
    stockRecordKinds: stockRecordKinds
  };
}
