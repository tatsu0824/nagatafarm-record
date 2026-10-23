/*
 * 記録画面（LIFF）の在庫の画面。?go=stock（在庫を記録）・?go=stocklist（在庫を見る）で app.js から呼ばれる。
 * 種類・単位・品目・区分・残りの数は毎回 GAS（?route=stock）から受け取る（このファイルに品目名・種類名・単位などの現場の情報を書かない）。
 * 表示はすべて createElement と textContent で作る。キーボードを出す要素は、数の入力欄・品目名で探す欄・JAN コードの番号の欄だけ。
 * 在庫を記録の画面には、品目名で探す欄と、カメラで JAN コード（13けたのバーコード）を読む機能を置く。
 * バーコードを読むライブラリ（ZXing）は、初めて読むときに1回だけ、版を固定し SRI を付けて読む（このフォルダーに置かない）。
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
  batchLabelTail: 'の数',
  searchHeading: '品目を探す',
  searchLabel: '品目名の一部',
  searchNote: '名前の一部で探せます（ひらがな・カタカナ、英数字の全角・半角のどちらでも）',
  searchNone: '当てはまる品目がありません',
  searchMoreHead: 'ほか ',
  searchMoreTail: '件。もう少し詳しく入れてください',
  scanOpen: 'バーコードを読む',
  scanNote: 'JAN コード（13けたのバーコード）をカメラに写してください。読めると自動で次へ進みます',
  scanPreparing: 'カメラを準備しています…',
  scanManual: '番号を入れる',
  scanAgain: 'もう一度読む',
  scanNoCamera: 'この画面ではカメラを使えません。「番号を入れる」で JAN の数字を入れてください',
  scanDenied: 'カメラの使用が許可されていません。LINE アプリにカメラの使用を許可するか、「番号を入れる」で JAN の数字を入れてください',
  scanLibFailed: '読み取りの準備ができませんでした。電波のよい所でもう一度お試しいただくか、「番号を入れる」で JAN の数字を入れてください',
  scanFailed: 'カメラを起動できませんでした。「番号を入れる」で JAN の数字を入れてください',
  scanTimeout: '読み取れませんでした。明るい所でバーコードを大きく写すか、「番号を入れる」で JAN の数字を入れてください',
  janNote: 'JAN コード（バーコードの下の13けたの数字）を入れてください',
  janLabel: 'JAN コード',
  janErrorDigits: '13けたの数字で入れてください',
  janErrorCheck: 'JAN コードが正しくありません。数字を確かめてください',
  janSend: '照会する',
  janSending: '照会中…',
  janFailed: '照会できませんでした。電波のよい所でもう一度お試しください',
  janNotListed: 'この品目は画面の一覧にありません。画面を開き直してください',
  janPickHeading: '当てはまる品目を選んでください',
  janOtherKind: 'いまの種類にない品目：',
  listSep: '、',
  janTablePreparing: '照合の準備中…',
  janTableFailed: '照合表を読めませんでした。1件ずつ照会します（少し時間がかかります）',
  regNote: 'バーコードを続けて読めます。読むたびに下の一覧に足されます',
  regPlus: ' ＋1（',
  regHeading: '読んだ品目',
  regEmpty: 'まだありません',
  regRemove: '消す',
  regCheckHeading: '確かめてください',
  regToRecord: '記録へ',
  regKindOpen: '「',
  regKindMid: '」の品目です。一覧は「',
  regKindTail: '」の品目だけまとめて記録できます：',
  regQuitAsk: '読んだ一覧を消してやめますか？',
  regQuitYes: '消してやめる',
  regQuitNo: '続ける',
  regAgain: '続けて読む',
  regBackToList: '一覧に戻る'
};

/** まとめての記録で一度に送れる品目の上限。 */
var STOCK_BATCH_MAX = 200;

/** 動きの値（GAS の move と同じ）。この順にボタンを並べる。 */
var STOCK_MOVES = ['in', 'out', 'count'];

/** 品目名で探すときに出す品目の上限。 */
var STOCK_SEARCH_MAX = 20;

/** JAN コードの照会の応答の status と、候補の上限（GAS と同じ）。 */
var STOCK_JAN_STATUSES = ['one', 'pick', 'unknown', 'not_in_sheet'];
var STOCK_JAN_MAX_CANDIDATES = 20;

/** バーコードを読むライブラリ（ZXing 0.21.3。jsDelivr から版を固定し、SRI を付けて読む）。 */
var STOCK_SCAN_LIB_URL = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
var STOCK_SCAN_LIB_SRI = 'sha384-BzBxP10ZE72aitqj5UMmUsbKFliP/DZqA8Wq+BNNhlIJDGoEd1tpkMYXOg9+n6sB';

/** ライブラリの読み込みの待ち時間と、カメラで読み続ける時間（ミリ秒）。 */
var STOCK_SCAN_LIB_TIMEOUT_MS = 15000;
var STOCK_SCAN_TIMEOUT_MS = 60000;

/** 読めた後に次の読み取りを始めるまでの待ち時間（ZXing の BrowserMultiFormatReader の2つ目の引数。ミリ秒）。 */
var STOCK_SCAN_BETWEEN_MS = 100;

/** 続けて読む画面で、同じ JAN をもう1回数えるまでに空ける時間（ミリ秒）。 */
var STOCK_SCAN_SAME_MS = 1500;

/** 対応表を受け取る前に読んだ JAN を溜める数と、確かめてくださいの項目の上限。 */
var STOCK_SCAN_QUEUE_MAX = 20;
var STOCK_SCAN_CHECK_MAX = 20;

/** JAN の対応表の要素の上限（GAS と同じ）。 */
var STOCK_JAN_TABLE_MAX = 1000;

/** 読めたときの音（方形波の周波数 Hz・長さ ms・音量）と振動。 */
var STOCK_BEEP_GOOD = { freq: 1000, ms: 80, gain: 0.1, vibrate: 40 };
var STOCK_BEEP_WARN = { freq: 400, ms: 200, gain: 0.1, vibrate: [40, 60, 40] };

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
 * 品目名で探すときのキー。NFKC にし、ひらがな（U+3041〜U+3096）をカタカナにし、大文字にし、空白類をすべて除く。
 * 入力と品目名の両方に同じキーを使う。文字列でなければ ''。
 */
function stockSearchKey(text) {
  if (typeof text !== 'string') return '';
  var s = text.normalize('NFKC');
  var out = '';
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    out += c >= 0x3041 && c <= 0x3096 ? String.fromCharCode(c + 0x60) : s.charAt(i);
  }
  return out.toUpperCase().replace(/\s+/g, '');
}

/**
 * 品目名のキーが入力のキーを含む品目を、種類の順・区分の順・品目の順に返す（{ hits: [{ kind, group, item }], more }）。
 * kinds は stockRecordKinds の形。more は limit を超えた数。キーが空なら何も返さない。形の違う要素は飛ばす。入力を変えない。例外を投げない。
 */
function stockSearchItems(kinds, text, limit) {
  var out = { hits: [], more: 0 };
  try {
    var key = stockSearchKey(text);
    if (key === '' || !Array.isArray(kinds)) return out;
    var max = typeof limit === 'number' && Number.isInteger(limit) && limit >= 1 ? limit : STOCK_SEARCH_MAX;
    kinds.forEach(function (k) {
      if (!stockIsObject_(k) || typeof k.kind !== 'string' || k.kind.length < 1 || !Array.isArray(k.groups)) return;
      k.groups.forEach(function (g) {
        if (!stockIsObject_(g) || typeof g.label !== 'string' || !Array.isArray(g.items)) return;
        g.items.forEach(function (e) {
          if (!stockIsObject_(e) || typeof e.item !== 'string' || e.item.length < 1) return;
          if (stockSearchKey(e.item).indexOf(key) < 0) return;
          if (out.hits.length < max) out.hits.push({ kind: k.kind, group: g.label, item: e.item });
          else out.more++;
        });
      });
    });
    return out;
  } catch (err) {
    return { hits: [], more: 0 };
  }
}

/** カメラの起動の失敗の種類。許可されないときは denied、ほか（形の違うものも）は failed。 */
function stockScanErrorKind(err) {
  try {
    if (err !== null && typeof err === 'object') {
      var n = err.name;
      if (n === 'NotAllowedError' || n === 'SecurityError' || n === 'PermissionDeniedError') return 'denied';
    }
  } catch (e) {
    return 'failed';
  }
  return 'failed';
}

/**
 * JAN コードの入力を読む（{ jan, error }）。NFKC・前後の空白除きで、空か12けた以下の数字は打っている途中（error は空）。
 * 13けたの数字でチェックデジットが正しければ jan、違えば error は check。ほか（数字でない字・14けた以上）は digits。
 */
function stockJanCheck(text) {
  if (typeof text !== 'string') return { jan: null, error: '' };
  var s = text.normalize('NFKC').trim();
  if (s === '' || /^[0-9]{1,12}$/.test(s)) return { jan: null, error: '' };
  if (!/^[0-9]{13}$/.test(s)) return { jan: null, error: 'digits' };
  var sum = 0;
  for (var i = 0; i < 12; i++) sum += Number(s.charAt(i)) * (i % 2 === 0 ? 1 : 3);
  if (Number(s.charAt(12)) !== (10 - (sum % 10)) % 10) return { jan: null, error: 'check' };
  return { jan: s, error: '' };
}

function stockJanBody(idToken, jan) {
  return { action: 'stockJan', idToken: idToken, jan: jan };
}

/** STOCK_JAN_OK の形なら true（候補の数は status ごとの決まりに合うこと）。 */
function stockIsJanOk(data) {
  if (!stockIsObject_(data) || data.result !== 'ok') return false;
  if (typeof data.jan !== 'string' || !/^[0-9]{13}$/.test(data.jan)) return false;
  if (STOCK_JAN_STATUSES.indexOf(data.status) < 0 || typeof data.message !== 'string') return false;
  var c = data.candidates;
  if (!Array.isArray(c) || c.length > STOCK_JAN_MAX_CANDIDATES) return false;
  var shaped = c.every(function (x) {
    return stockIsObject_(x) && typeof x.kind === 'string' && x.kind.length >= 1 && typeof x.item === 'string' && x.item.length >= 1;
  });
  if (!shaped) return false;
  if (data.status === 'one') return c.length === 1;
  if (data.status === 'pick') return c.length >= 1;
  return c.length === 0;
}

function stockJanTableBody(idToken) {
  return { action: 'stockJanTable', idToken: idToken };
}

/**
 * STOCK_JAN_TABLE_OK の形なら true。entries は長さ 0〜1000 の配列で、各要素に result: 'ok' を足すと stockIsJanOk が真、
 * status が unknown でなく、jan が重ならないこと。例外を投げない。
 */
function stockIsJanTableOk(data) {
  try {
    if (!stockIsObject_(data) || data.result !== 'ok') return false;
    var list = data.entries;
    if (!Array.isArray(list) || list.length > STOCK_JAN_TABLE_MAX) return false;
    var seen = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!stockIsObject_(e) || !stockIsJanOk(Object.assign({}, e, { result: 'ok' })) || e.status === 'unknown') return false;
      if (seen[e.jan] === true) return false;
      seen[e.jan] = true;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/** 形が正しければ JAN → { jan, status, message, candidates } の表（Object.create(null)。写しを入れる）。正しくなければ null。入力を変えない。 */
function stockJanTableMap(data) {
  if (!stockIsJanTableOk(data)) return null;
  var map = Object.create(null);
  data.entries.forEach(function (e) {
    map[e.jan] = {
      jan: e.jan, status: e.status, message: e.message,
      candidates: e.candidates.map(function (c) { return { kind: c.kind, item: c.item }; })
    };
  });
  return map;
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
  /** 品目名で探す文字（1つずつ・まとめて）と、JAN コードで選んだ直後に1回だけ出す文。 */
  var search = { one: '', batch: '', flash: '' };
  /** まとめての画面の品目ごとの数の欄（探して選んだときにフォーカスを移す）。 */
  var batchInputs = Object.create(null);
  /** バーコードの読み取り（ライブラリの読み込みの状態・読み込みを待つ関数・いまのカメラ・開いた元の画面）。 */
  var scan = { lib: '', waiters: [], cur: null, origin: 'one', audio: null, audioTried: false };
  /** JAN の対応表（state は ''・loading・ok・failed）と、受け取る前に読んだ JAN・照会中の JAN。この画面の間だけ持つ。 */
  var jt = { state: '', map: null, queue: [], inflight: Object.create(null) };
  /** 続けて読む画面（一覧の種類・行・確かめてください・JAN ごとの最後に読めた時刻・動き・送る entries・いまの画面の部品）。 */
  var reg = { kind: null, rows: [], checks: [], last: Object.create(null), gen: 0, move: '', entries: [], view: null, beeped: null };

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
    reg.view = null;
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
    root.appendChild(searchCard('one', function (hit) {
      selectItem(hit.kind, hit.group, hit.item);
    }));

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
    batchInputs = Object.create(null);
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
        root.appendChild(searchCard('batch', function (hit) {
          focusBatchItem(hit.item);
        }));
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
            batchInputs[e.item] = input;
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
    renderEntriesConfirm(state.kind, batch.move, batch.entries, renderBatch, renderBatchResult);
  }

  /** その種類の品目の行（読んである一覧）。なければ null。 */
  function kindEntry(kind, item) {
    var k = findKind(kind);
    if (k === null) return null;
    for (var i = 0; i < k.groups.length; i++) {
      var items = k.groups[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].item === item) return items[j];
    }
    return null;
  }

  /** まとめての確認の画面（まとめて・続けて読むの両方で使う）。送った結果は onResult(r)。 */
  function renderEntriesConfirm(kind, move, entries, onBack, onResult) {
    clear(T.titleRecord);
    var k = findKind(kind);
    var unit = k !== null ? k.unit : '';
    var lines = [kind, stockMoveLabel(move) + ' ' + entries.length + T.orderCountTail];
    entries.forEach(function (x) {
      var entry = kindEntry(kind, x.item);
      var stock = entry !== null ? entry.stock : null;
      lines.push(T.batchBullet + x.item + ' ' + x.count + unit + T.batchExpectedOpen + stockExpected(stock, move, x.count) + unit + T.unitClose);
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
      post(stockBatchBody(idToken, kind, move, entries)).then(function (r) {
        state.sending = false;
        onResult(r);
      }).catch(function () {
        state.sending = false;
        onResult({ ok: false });
      });
    });
    var back = button(T.back, 'reset', function () {
      if (state.sending) return;
      onBack();
    });
    row.appendChild(send);
    row.appendChild(back);
    bar.appendChild(row);
    root.appendChild(bar);
  }

  function renderBatchResult(r) {
    var ok = renderEntriesResult(r);
    if (ok) resetBatch();
    var row1 = el('div', 'action-row result-actions');
    if (ok) {
      row1.appendChild(button(T.again, 'again', function () {
        loadList(T.titleRecord, useListBatch);
      }));
    } else {
      row1.appendChild(button(T.batchBackToInput, 'again', renderBatch));
    }
    resultRows(row1);
  }

  /** 結果の画面の1段目（row1 に在庫を見るを足す）と2段目（記録を取り消す・閉じる）。 */
  function resultRows(row1) {
    row1.appendChild(button(T.openList, 'again', openList));
    root.appendChild(row1);
    var row2 = el('div', 'action-row result-actions');
    row2.appendChild(button(T.cancelOpen, 'reset', openCancelList));
    row2.appendChild(closeButton());
    root.appendChild(row2);
  }

  /** まとめての結果の画面のボタンより上（まとめて・続けて読むの両方で使う）。記録できたら true。 */
  function renderEntriesResult(r) {
    clear(T.titleRecord);
    var ok = r.ok && stockIsBatchOk(r.data);
    if (ok) {
      var d = r.data;
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
    return ok;
  }

  // ---- 品目名で探す ----

  /** 探した品目・JAN コードの候補のボタンの文字。1つずつで使える種類が2つ以上なら種類を添える。 */
  function hitText(hit, mode) {
    return mode === 'one' && state.kinds.length >= 2 ? hit.item + T.unitOpen + hit.kind + T.unitClose : hit.item;
  }

  /** 結果の場所だけを作り直す（mode は one か batch。まとめてでは、いまの種類の品目だけを探す）。 */
  function renderSearchResults(area, mode, onPick) {
    while (area.firstChild) area.removeChild(area.firstChild);
    if (stockSearchKey(search[mode]) === '') return;
    var k = currentKind();
    var kinds = mode === 'one' ? state.kinds : (k !== null ? [k] : []);
    var r = stockSearchItems(kinds, search[mode], STOCK_SEARCH_MAX);
    if (r.hits.length === 0) {
      area.appendChild(el('p', 'note', T.searchNone));
      return;
    }
    var choices = el('div', 'choices');
    r.hits.forEach(function (hit) {
      choices.appendChild(choiceButton(hitText(hit, mode), false, function () {
        onPick(hit);
      }));
    });
    area.appendChild(choices);
    if (r.more >= 1) area.appendChild(el('p', 'note', T.searchMoreHead + r.more + T.searchMoreTail));
  }

  /** 探すカード（見出し・探す欄・注記・結果の場所・バーコードを読むボタン、JAN コードで選んだ直後だけ応答の文）。 */
  function searchCard(mode, onPick) {
    var card = el('div', 'card');
    card.appendChild(el('h2', 'heading', T.searchHeading));
    var input = el('input', 'stock-search');
    input.type = 'text';
    input.autocomplete = 'off';
    input.maxLength = 30;
    input.setAttribute('aria-label', T.searchLabel);
    input.style.width = '100%';
    input.style.height = '48px';
    input.style.fontSize = '18px';
    input.value = search[mode];
    var area = el('div');
    input.addEventListener('input', function () {
      search[mode] = String(input.value);
      renderSearchResults(area, mode, onPick);
    });
    card.appendChild(input);
    card.appendChild(el('p', 'note', T.searchNote));
    card.appendChild(area);
    renderSearchResults(area, mode, onPick);
    var row = el('div', 'action-row');
    var opened = false;
    row.appendChild(button(T.scanOpen, 'again', function () {
      if (opened) return;
      opened = true;
      prepareAudio();
      loadJanTable();
      if (mode === 'batch') {
        scan.origin = 'batch';
        renderScan();
      } else {
        renderRegister();
      }
    }));
    card.appendChild(row);
    if (search.flash !== '') {
      card.appendChild(el('p', 'status', search.flash));
      search.flash = '';
    }
    return card;
  }

  /** 1つずつの画面で品目を選ぶ（種類が変わったときは、種類のボタンと同じく、まとめての状態を消す）。 */
  function selectItem(kind, group, item) {
    if (state.kind !== kind) {
      state.kind = kind;
      resetBatch();
    }
    state.group = group;
    state.item = item;
    state.move = '';
    state.countText = '';
    search.one = '';
    renderSelect();
  }

  /** まとめての画面で、その品目の数の欄に移る（画面を作り直さない）。 */
  function focusBatchItem(item) {
    var input = batchInputs[item];
    if (input === undefined) return;
    input.focus();
    input.scrollIntoView({ block: 'center' });
  }

  /** 読んである一覧にある品目なら { kind, group, item }、なければ null。 */
  function findListed(kind, item) {
    var k = findKind(kind);
    if (k === null) return null;
    for (var i = 0; i < k.groups.length; i++) {
      var items = k.groups[i].items;
      for (var j = 0; j < items.length; j++) if (items[j].item === item) return { kind: kind, group: k.groups[i].label, item: item };
    }
    return null;
  }

  /** 読み取り・番号・結果の画面から、開いた元の画面（1つずつ／まとめて）に戻る。選択・探す文字・表の数はそのまま。 */
  function backToOrigin() {
    if (scan.origin === 'batch') renderBatch();
    else if (scan.origin === 'reg') renderRegister();
    else renderSelect();
  }

  // ---- バーコードを読む ----

  function scanLibReady() {
    return typeof ZXing !== 'undefined' && ZXing !== null && typeof ZXing.BrowserMultiFormatReader === 'function' &&
      ZXing.BarcodeFormat !== undefined && ZXing.DecodeHintType !== undefined;
  }

  /** ライブラリを読み、done(読めたか) を呼ぶ。読めた後は読み直さない。失敗したら次に呼ばれたときに読み直す。 */
  function loadScanLib(done) {
    if (scan.lib === 'ok') {
      done(true);
      return;
    }
    scan.waiters.push(done);
    if (scan.lib === 'loading') return;
    scan.lib = 'loading';
    var settled = false;
    var timer = null;
    var finish = function (ok) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      scan.lib = ok ? 'ok' : '';
      var list = scan.waiters;
      scan.waiters = [];
      list.forEach(function (f) { f(ok); });
    };
    var tag = document.createElement('script');
    tag.onload = function () { finish(scanLibReady()); };
    tag.onerror = function () { finish(false); };
    tag.src = STOCK_SCAN_LIB_URL;
    tag.integrity = STOCK_SCAN_LIB_SRI;
    tag.crossOrigin = 'anonymous';
    tag.async = true;
    timer = setTimeout(function () { finish(false); }, STOCK_SCAN_LIB_TIMEOUT_MS);
    document.head.appendChild(tag);
  }

  /** カメラを止める（読み取りのクラスの reset、すべてのトラックの stop、映像を外す、60秒のタイマーを消す）。止めた後の読み取りは捨てる。 */
  function stopScan(s) {
    if (s.stopped) return;
    s.stopped = true;
    if (scan.cur === s) scan.cur = null;
    if (s.reader !== null) {
      try {
        s.reader.reset();
      } catch (e) {
        // 止めるときの例外は無視する（トラックは下で止める）
      }
    }
    stopTracks(s.stream);
    s.video.srcObject = null;
    if (s.timer !== null) clearTimeout(s.timer);
  }

  function stopTracks(stream) {
    if (stream && typeof stream.getTracks === 'function') stream.getTracks().forEach(function (t) { t.stop(); });
  }

  /** カメラを止めて、状態の場所に文を出す（ボタンはそのまま）。 */
  function scanError(s, text) {
    if (s.stopped) return;
    stopScan(s);
    s.status.className = 'status error';
    s.status.textContent = text;
  }

  function scanCameraError(s, err) {
    scanError(s, stockScanErrorKind(err) === 'denied' ? T.scanDenied : T.scanFailed);
  }

  /**
   * 60秒読めないとき：カメラを止め、文を出し、ボタンの段に「もう一度読む」を足す。
   * 続けて読む画面では、段の「記録へ」を残し、「番号を入れる」の前に足す（一覧・確かめてくださいは残す）。
   */
  function scanTimeout(s) {
    if (s.stopped) return;
    scanError(s, T.scanTimeout);
    var again = false;
    var b = button(T.scanAgain, 'again', function () {
      if (again) return;
      again = true;
      if (s.reg) renderRegister();
      else renderScan();
    });
    if (s.reg) {
      s.row.insertBefore(b, s.manual);
      return;
    }
    while (s.row.firstChild) s.row.removeChild(s.row.firstChild);
    s.row.appendChild(b);
    s.row.appendChild(s.manual);
    s.row.appendChild(s.cancel);
  }

  /**
   * 読み取りの結果。正しい JAN コードのときだけ受け付ける。続けて読む画面では読み続ける。
   * まとめての画面では、すぐカメラを止めて引く（1回だけ）。
   */
  function onScanResult(s, result) {
    if (s.stopped || result === null || typeof result !== 'object') return;
    var text = typeof result.getText === 'function' ? result.getText() : result.text;
    var c = stockJanCheck(text);
    if (c.jan === null) return;
    if (s.reg) {
      regRead(s, c.jan);
      return;
    }
    stopScan(s);
    s.status.className = 'status';
    s.status.textContent = T.janSending;
    s.manual.disabled = true;
    s.cancel.disabled = true;
    if (sendJan(c.jan, true) === 'wait') s.status.textContent = T.janTablePreparing;
  }

  /** カメラが映ったときの状態の文（対応表を受け取れなかったときは、その文を p.note で出す）。 */
  function scanIdle(s) {
    if (jt.state === 'failed') {
      s.status.className = 'note';
      s.status.textContent = T.janTableFailed;
    } else {
      s.status.className = 'status';
      s.status.textContent = '';
    }
  }

  /** カメラの映像の要素。 */
  function scanVideo(maxHeight) {
    var video = document.createElement('video');
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.maxHeight = maxHeight;
    return video;
  }

  // ---- 音・振動 ----

  /** 音を鳴らすための AudioContext を1つだけ作る（バーコードを読むを押した操作の中で呼ぶ）。作れなければ音なしで続ける。 */
  function prepareAudio() {
    if (scan.audioTried) return;
    scan.audioTried = true;
    try {
      var Ctor = typeof AudioContext === 'function' ? AudioContext : (typeof webkitAudioContext === 'function' ? webkitAudioContext : null);
      if (Ctor === null) return;
      scan.audio = new Ctor();
      if (typeof scan.audio.resume === 'function') {
        var p = scan.audio.resume();
        if (p && typeof p.then === 'function') p.then(null, function () {});
      }
    } catch (e) {
      scan.audio = null;
    }
  }

  /** よい音（good が真）か注意の音を鳴らし、振動させる。どちらも失敗は無視する。 */
  function beep(good) {
    var b = good ? STOCK_BEEP_GOOD : STOCK_BEEP_WARN;
    var a = scan.audio;
    if (a !== null) {
      try {
        var osc = a.createOscillator();
        var gain = a.createGain();
        osc.type = 'square';
        osc.frequency.value = b.freq;
        gain.gain.value = b.gain;
        osc.connect(gain);
        gain.connect(a.destination);
        var t = a.currentTime;
        osc.start(t);
        osc.stop(t + b.ms / 1000);
      } catch (e) {
        // 鳴らせなくても続ける
      }
    }
    try {
      if (typeof navigator !== 'undefined' && navigator && typeof navigator.vibrate === 'function') navigator.vibrate(b.vibrate);
    } catch (e) {
      // 振動できなくても続ける
    }
  }

  // ---- JAN の対応表で引く ----

  /** 対応表を受け取る（受け取り中・受け取った後は送らない。受け取れなかったときは、次に押したときに送り直す）。 */
  function loadJanTable() {
    if (jt.state === 'loading' || jt.state === 'ok') return;
    jt.state = 'loading';
    post(stockJanTableBody(idToken)).then(janTableDone).catch(function () {
      janTableDone({ ok: false });
    });
  }

  /** 対応表の応答。溜めた JAN を読んだ順に引く。 */
  function janTableDone(r) {
    if (jt.state !== 'loading') return;
    var map = r.ok ? stockJanTableMap(r.data) : null;
    jt.map = map;
    jt.state = map !== null ? 'ok' : 'failed';
    var s = scan.cur;
    if (s !== null && !s.stopped && (jt.state === 'failed' || s.status.textContent === T.janTablePreparing)) scanIdle(s);
    var list = jt.queue;
    jt.queue = [];
    list.forEach(function (q) { lookupJan(q.jan, q.done, q.onQuery, q.owner); });
  }

  /**
   * JAN を引く。表を受け取る前は溜める（'wait'）。表にあれば通信せずに done を呼ぶ（'hit'）。
   * 表にない・表を受け取れなかったときは stockJan で照会する（'query'。照会の前に onQuery を呼ぶ）。
   * done には stockJan の応答と同じ形（{ ok, data }）を渡す。
   */
  function lookupJan(jan, done, onQuery, owner) {
    if (jt.state === 'loading') {
      jt.queue.push({ jan: jan, done: done, onQuery: onQuery, owner: owner });
      if (jt.queue.length > STOCK_SCAN_QUEUE_MAX) jt.queue.shift();
      return 'wait';
    }
    var e = jt.map !== null ? jt.map[jan] : undefined;
    if (e !== undefined) {
      done({ ok: true, data: { result: 'ok', jan: e.jan, status: e.status, message: e.message, candidates: e.candidates } });
      return 'hit';
    }
    if (typeof onQuery === 'function') onQuery();
    queryJan(jan, done);
    return 'query';
  }

  /** stockJan で照会する。同じ JAN の照会は同時に1つだけ（応答をそれぞれの done に渡す）。 */
  function queryJan(jan, done) {
    var waiting = jt.inflight[jan];
    if (waiting !== undefined) {
      waiting.push(done);
      return;
    }
    jt.inflight[jan] = [done];
    var finish = function (r) {
      var list = jt.inflight[jan];
      if (list === undefined) return;
      delete jt.inflight[jan];
      list.forEach(function (f) { f(r); });
    };
    post(stockJanBody(idToken, jan)).then(finish).catch(function () {
      finish({ ok: false });
    });
  }

  // ---- 続けて読む（レジ） ----

  function regRowOf(item) {
    for (var i = 0; i < reg.rows.length; i++) if (reg.rows[i].item === item) return reg.rows[i];
    return null;
  }

  function regInvalid(x) {
    return stockParseCount(x.text, 'in') === null;
  }

  function regReady() {
    return reg.rows.length >= 1 && reg.rows.length <= STOCK_BATCH_MAX && !reg.rows.some(regInvalid);
  }

  /**
   * 一覧・確かめてください・動き・JAN ごとの最後に読めた時刻・表を待っている読み取りの溜めを消す。
   * 番号（gen）を進めるので、この後に届いた照会の応答や、表の到着による溜めの処理は一覧に足さない。対応表はそのまま持つ。
   */
  function regReset() {
    jt.queue = jt.queue.filter(function (q) { return q.owner !== 'reg'; });
    reg.kind = null;
    reg.rows = [];
    reg.checks = [];
    reg.last = Object.create(null);
    reg.gen++;
    reg.move = '';
    reg.entries = [];
  }

  /** 続けて読む画面（説明・カメラ・状態の文・読んだ品目・確かめてください・帯）。一覧はそのまま使い、カメラを起動する。 */
  function renderRegister() {
    if (scan.cur !== null) stopScan(scan.cur);
    scan.origin = 'reg';
    toConfirmButton = null;
    clear(T.titleRecord);
    root.appendChild(el('p', 'note', T.regNote));
    var area = el('div');
    var video = scanVideo('35vh');
    area.appendChild(video);
    root.appendChild(area);
    var status = el('p', 'status', T.scanPreparing);
    root.appendChild(status);
    var listCard = el('div', 'card');
    root.appendChild(listCard);
    var bar = el('div', 'actions');
    var countNote = el('p', 'note', '');
    var row = el('div', 'action-row');
    var s = { video: video, status: status, row: row, manual: null, cancel: null, stream: null, reader: null, timer: null, stopped: false, reg: true };
    var v = { s: s, listCard: listCard, heading: null, empty: null, rows: Object.create(null), checkCard: el('div', 'card'), bar: bar,
      countNote: countNote, send: null, quit: false };
    v.send = button(T.regToRecord, 'send', function () {
      if (!regReady()) return;
      stopScan(s);
      reg.entries = reg.rows.map(function (x) { return { item: x.item, count: stockParseCount(x.text, 'in') }; });
      reg.move = '';
      renderRegMove();
    });
    s.manual = button(T.scanManual, 'again', function () {
      stopScan(s);
      renderJanInput();
    });
    s.cancel = button(T.cancelNo, 'reset', function () {
      if (reg.rows.length === 0 && reg.checks.length === 0) {
        regReset();
        stopScan(s);
        renderSelect();
        return;
      }
      regAskQuit(v);
    });
    row.appendChild(v.send);
    row.appendChild(s.manual);
    row.appendChild(s.cancel);
    bar.appendChild(countNote);
    bar.appendChild(row);
    root.appendChild(bar);
    reg.view = v;
    regBuildList(v);
    regShowChecks();
    regUpdateBar();
    scan.cur = s;
    startScan(s);
  }

  /** やめるで一覧か確かめてくださいがあるとき：帯の中で確かめる（カメラはそのまま）。 */
  function regAskQuit(v) {
    if (v.quit) return;
    v.quit = true;
    var msg = el('p', 'message', T.regQuitAsk);
    var row = el('div', 'action-row');
    row.appendChild(button(T.regQuitYes, 'reset', function () {
      regReset();
      stopScan(v.s);
      renderSelect();
    }));
    row.appendChild(button(T.regQuitNo, 'again', function () {
      v.bar.removeChild(msg);
      v.bar.removeChild(row);
      v.quit = false;
    }));
    v.bar.appendChild(msg);
    v.bar.appendChild(row);
  }

  /** 読んだ品目のカードを作る。 */
  function regBuildList(v) {
    var card = v.listCard;
    while (card.firstChild) card.removeChild(card.firstChild);
    v.heading = el('h2', 'heading', '');
    card.appendChild(v.heading);
    v.empty = el('p', 'note', T.regEmpty);
    v.rows = Object.create(null);
    if (reg.rows.length === 0) card.appendChild(v.empty);
    reg.rows.forEach(function (x) { regAppendRow(v, x); });
    regUpdateHeading(v);
  }

  /** 読んだ品目の1行（品目・数の欄・消す）。数の入力・消すでは画面を作り直さない。 */
  function regAppendRow(v, x) {
    var line = el('div', 'action-row');
    line.style.alignItems = 'center';
    var name = el('p', 'name', x.item);
    name.style.flex = '1 1 0';
    var input = el('input', 'stock-scan-count');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.setAttribute('inputmode', 'numeric');
    input.pattern = '[0-9]*';
    input.autocomplete = 'off';
    input.maxLength = 3;
    input.setAttribute('aria-label', x.item + T.batchLabelTail);
    input.style.width = '96px';
    input.style.height = '48px';
    input.style.fontSize = '18px';
    input.style.flex = '0 0 96px';
    input.style.scrollMarginBottom = '200px';
    input.value = x.text;
    input.addEventListener('input', function () {
      x.text = String(input.value);
      regRowError(v, x);
      regUpdateBar();
    });
    var remove = button(T.regRemove, 'reset', function () {
      regRemoveRow(x);
    });
    remove.style.flex = '0 0 auto';
    line.appendChild(name);
    line.appendChild(input);
    line.appendChild(remove);
    v.listCard.appendChild(line);
    v.rows[x.item] = { line: line, input: input, error: null };
    regRowError(v, x);
  }

  /** 行の下のエラーの文を出す・消す。 */
  function regRowError(v, x) {
    var ui = v.rows[x.item];
    if (ui === undefined) return;
    var bad = regInvalid(x);
    if (bad && ui.error === null) {
      ui.error = el('p', 'status error', T.errorInOut);
      v.listCard.insertBefore(ui.error, ui.line.nextSibling);
    } else if (!bad && ui.error !== null) {
      v.listCard.removeChild(ui.error);
      ui.error = null;
    }
  }

  function regRemoveRow(x) {
    var i = reg.rows.indexOf(x);
    if (i < 0) return;
    reg.rows.splice(i, 1);
    if (reg.rows.length === 0) reg.kind = null;
    var v = reg.view;
    if (v === null) return;
    var ui = v.rows[x.item];
    if (ui !== undefined) {
      v.listCard.removeChild(ui.line);
      if (ui.error !== null) v.listCard.removeChild(ui.error);
      delete v.rows[x.item];
    }
    if (reg.rows.length === 0) v.listCard.appendChild(v.empty);
    regUpdateHeading(v);
    regUpdateBar();
  }

  function regUpdateHeading(v) {
    v.heading.textContent = reg.rows.length === 0 ? T.regHeading : T.regHeading + T.unitOpen + reg.kind + T.unitClose;
  }

  /** 帯の品目の数と「記録へ」の disabled。 */
  function regUpdateBar() {
    var v = reg.view;
    if (v === null) return;
    v.countNote.textContent = reg.rows.length + T.orderCountTail;
    v.send.disabled = !regReady();
  }

  /** 状態の文（カメラが止まった後は変えない）。 */
  function regStatus(text) {
    var v = reg.view;
    if (v === null || v.s.stopped) return;
    v.s.status.className = 'status';
    v.s.status.textContent = text;
  }

  /** 一覧に足す（あれば数 +1。999 で止める）。 */
  function regAdd(hit) {
    if (reg.rows.length === 0) reg.kind = hit.kind;
    var v = reg.view;
    var x = regRowOf(hit.item);
    var n;
    if (x === null) {
      x = { item: hit.item, text: '1' };
      n = 1;
      reg.rows.push(x);
      if (v !== null) {
        if (v.empty.parentNode === v.listCard) v.listCard.removeChild(v.empty);
        regAppendRow(v, x);
      }
    } else {
      var c = stockParseCount(x.text, 'in');
      n = Math.min((c === null ? 0 : c) + 1, 999);
      x.text = String(n);
      if (v !== null && v.rows[x.item] !== undefined) {
        v.rows[x.item].input.value = x.text;
        regRowError(v, x);
      }
    }
    if (v !== null) {
      regUpdateHeading(v);
      regUpdateBar();
    }
    regStatus(x.item + T.regPlus + n + T.unitClose);
  }

  /** 確かめてくださいの項目を置く（同じ JAN は置き換える。最大20で古いものを消す）。 */
  function regSetCheck(jan, c) {
    c.jan = jan;
    for (var i = 0; i < reg.checks.length; i++) {
      if (reg.checks[i].jan === jan) {
        reg.checks[i] = c;
        return;
      }
    }
    reg.checks.push(c);
    if (reg.checks.length > STOCK_SCAN_CHECK_MAX) reg.checks.shift();
  }

  function regDropCheck(jan) {
    reg.checks = reg.checks.filter(function (c) { return c.jan !== jan; });
  }

  /** 確かめてくださいのカードを作り直す（項目がなければ外す）。 */
  function regShowChecks() {
    var v = reg.view;
    if (v === null) return;
    var card = v.checkCard;
    while (card.firstChild) card.removeChild(card.firstChild);
    if (reg.checks.length === 0) {
      if (card.parentNode === root) root.removeChild(card);
      return;
    }
    card.appendChild(el('h2', 'heading', T.regCheckHeading));
    reg.checks.forEach(function (c) { card.appendChild(regCheckEl(c)); });
    if (card.parentNode !== root) root.insertBefore(card, v.bar);
  }

  function regCheckEl(c) {
    var d = el('div');
    if (c.type === 'pending') {
      d.appendChild(el('p', 'note', T.janSending));
      return d;
    }
    if (c.type === 'pick') {
      d.appendChild(el('p', 'result', c.message));
      if (c.hits.length >= 1) {
        var choices = el('div', 'choices');
        c.hits.forEach(function (hit) {
          choices.appendChild(choiceButton(hitText(hit, 'one'), false, function () {
            regUseHit(c.jan, hit);
          }));
        });
        d.appendChild(choices);
      }
    } else {
      d.appendChild(el('p', 'status error', c.text));
    }
    d.appendChild(button(T.regRemove, 'reset', function () {
      regDropCheck(c.jan);
      regShowChecks();
    }));
    return d;
  }

  /** 品目を一覧に足す（一覧と違う種類なら確かめてくださいに出す）。足せたら true。 */
  function regUseHit(jan, hit) {
    if (reg.rows.length >= 1 && hit.kind !== reg.kind) {
      regSetCheck(jan, { type: 'error', text: T.regKindOpen + hit.kind + T.regKindMid + reg.kind + T.regKindTail + hit.item });
      regShowChecks();
      return false;
    }
    regDropCheck(jan);
    regAdd(hit);
    regShowChecks();
    return true;
  }

  /** 引いた結果（stockJan の応答と同じ形）を一覧か確かめてくださいに入れ、音を鳴らす（続けて読む画面が出ているときだけ）。 */
  function regApply(jan, r) {
    var good = false;
    if (r.ok && stockIsJanOk(r.data)) {
      var d = r.data;
      var listed = [];
      d.candidates.forEach(function (c) {
        var hit = findListed(c.kind, c.item);
        if (hit !== null) listed.push(hit);
      });
      if (d.status !== 'one' && d.status !== 'pick') {
        regSetCheck(jan, { type: 'error', text: d.message });
      } else if (listed.length === 0) {
        regSetCheck(jan, { type: 'error', text: T.janNotListed });
      } else if (d.status === 'one') {
        good = regUseHit(jan, listed[0]);
      } else {
        regSetCheck(jan, { type: 'pick', message: d.message, hits: listed.filter(function (hit) {
          return reg.rows.length === 0 || hit.kind === reg.kind;
        }) });
      }
    } else if (r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string') {
      regSetCheck(jan, { type: 'error', text: r.data.message });
    } else {
      regSetCheck(jan, { type: 'error', text: T.janFailed });
    }
    regShowChecks();
    // 照会の応答1つにつき1回だけ鳴らす（照会中に同じ JAN を何回数えても、同じ応答のオブジェクトが来る）
    if (reg.view !== null && reg.beeped !== r) {
      reg.beeped = r;
      beep(good);
    }
  }

  /**
   * 続けて読む画面で読めた JAN：60秒を延ばし、同じ JAN は最後に読めてから 1.5秒以上たったときだけ数える。
   * 表で引き、なければ照会する（照会中は確かめてくださいに照会中…）。
   */
  function regRead(s, jan) {
    if (s.timer !== null) clearTimeout(s.timer);
    s.timer = setTimeout(function () { scanTimeout(s); }, STOCK_SCAN_TIMEOUT_MS);
    var now = Date.now();
    var prev = reg.last[jan];
    reg.last[jan] = now;
    if (prev !== undefined && now - prev < STOCK_SCAN_SAME_MS) return;
    var gen = reg.gen;
    var how = lookupJan(jan, function (r) {
      if (gen === reg.gen) regApply(jan, r);
    }, function () {
      if (gen !== reg.gen) return;
      regSetCheck(jan, { type: 'pending' });
      regShowChecks();
    }, 'reg');
    if (how === 'wait') regStatus(T.janTablePreparing);
  }

  /** 記録への後の動きの画面。 */
  function renderRegMove() {
    clear(T.titleRecord);
    root.appendChild(el('p', 'note', T.kindPrefix + reg.kind));
    var card = el('div', 'card');
    card.appendChild(el('h2', 'heading', T.moveHeading));
    var choices = el('div', 'choices');
    STOCK_MOVES.forEach(function (m) {
      choices.appendChild(choiceButton(stockMoveLabel(m), reg.move === m, function () {
        if (reg.move === m) return;
        reg.move = m;
        renderRegMove();
      }));
    });
    card.appendChild(choices);
    if (reg.move !== '') card.appendChild(el('p', 'note', moveNote(reg.move)));
    root.appendChild(card);
    var bar = el('div', 'actions');
    var row = el('div', 'action-row');
    var go = button(T.toConfirm, 'send', function () {
      if (reg.move === '') return;
      renderEntriesConfirm(reg.kind, reg.move, reg.entries, renderRegMove, renderRegResult);
    });
    go.disabled = reg.move === '';
    row.appendChild(go);
    row.appendChild(button(T.back, 'reset', function () {
      renderRegister();
    }));
    bar.appendChild(row);
    root.appendChild(bar);
  }

  /** 続けて読むの結果（記録できたら一覧を消す）。 */
  function renderRegResult(r) {
    var ok = renderEntriesResult(r);
    var row1 = el('div', 'action-row result-actions');
    if (ok) {
      r.data.results.forEach(function (x) {
        var entry = kindEntry(r.data.kind, x.item);
        if (entry === null) return;
        entry.stock = x.stock;
        entry.order = x.order;
      });
      regReset();
      row1.appendChild(button(T.regAgain, 'again', function () {
        renderRegister();
      }));
    } else {
      row1.appendChild(button(T.regBackToList, 'again', function () {
        renderRegister();
      }));
    }
    resultRows(row1);
  }

  function startScan(s) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      scanError(s, T.scanNoCamera);
      return;
    }
    loadScanLib(function (ok) {
      if (s.stopped) return;
      if (!ok) {
        scanError(s, T.scanLibFailed);
        return;
      }
      var p;
      try {
        p = navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
      } catch (err) {
        scanCameraError(s, err);
        return;
      }
      Promise.resolve(p).then(function (stream) {
        if (s.stopped) {
          stopTracks(stream);
          return;
        }
        s.stream = stream;
        s.video.srcObject = stream;
        scanIdle(s);
        s.timer = setTimeout(function () { scanTimeout(s); }, STOCK_SCAN_TIMEOUT_MS);
        var hints = new Map();
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13]);
        s.reader = new ZXing.BrowserMultiFormatReader(hints, STOCK_SCAN_BETWEEN_MS);
        var d = s.reader.decodeFromVideoElementContinuously(s.video, function (result) {
          onScanResult(s, result);
        });
        if (d && typeof d.then === 'function') {
          d.then(null, function (err) { scanCameraError(s, err); });
        }
      }).catch(function (err) {
        scanCameraError(s, err);
      });
    });
  }

  /** 読み取りの画面（説明・カメラの場所・状態の文・番号を入れる／やめる）。 */
  function renderScan() {
    if (scan.cur !== null) stopScan(scan.cur);
    clear(T.titleRecord);
    root.appendChild(el('p', 'note', T.scanNote));
    var area = el('div');
    var video = scanVideo('50vh');
    area.appendChild(video);
    root.appendChild(area);
    var status = el('p', 'status', T.scanPreparing);
    root.appendChild(status);
    var row = el('div', 'action-row');
    var s = { video: video, status: status, row: row, manual: null, cancel: null, stream: null, reader: null, timer: null, stopped: false };
    s.manual = button(T.scanManual, 'again', function () {
      stopScan(s);
      renderJanInput();
    });
    s.cancel = button(T.cancelNo, 'reset', function () {
      stopScan(s);
      backToOrigin();
    });
    row.appendChild(s.manual);
    row.appendChild(s.cancel);
    root.appendChild(row);
    scan.cur = s;
    startScan(s);
  }

  // ---- JAN コードの番号・照会の結果 ----

  /** 番号の画面。 */
  function renderJanInput() {
    clear(T.titleRecord);
    root.appendChild(el('p', 'note', T.janNote));
    var input = el('input', 'stock-jan');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.setAttribute('inputmode', 'numeric');
    input.pattern = '[0-9]*';
    input.autocomplete = 'off';
    input.maxLength = 13;
    input.setAttribute('aria-label', T.janLabel);
    input.style.width = '100%';
    input.style.height = '48px';
    input.style.fontSize = '18px';
    var errorArea = el('div');
    var row = el('div', 'action-row');
    var send = button(T.janSend, 'send', function () {
      var c = stockJanCheck(String(input.value));
      if (c.jan === null || state.sending) return;
      send.disabled = true;
      back.disabled = true;
      root.appendChild(el('p', 'status', T.janSending));
      sendJan(c.jan);
    });
    var back = button(T.back, 'reset', function () {
      if (state.sending) return;
      backToOrigin();
    });
    var update = function () {
      var c = stockJanCheck(String(input.value));
      while (errorArea.firstChild) errorArea.removeChild(errorArea.firstChild);
      if (c.error === 'digits') errorArea.appendChild(el('p', 'status error', T.janErrorDigits));
      else if (c.error === 'check') errorArea.appendChild(el('p', 'status error', T.janErrorCheck));
      send.disabled = c.jan === null;
    };
    input.addEventListener('input', update);
    root.appendChild(input);
    root.appendChild(errorArea);
    row.appendChild(send);
    row.appendChild(back);
    root.appendChild(row);
    update();
  }

  /**
   * JAN コードを引く（表で引き、なければ照会する。本文は1回だけ送る）。戻り値は lookupJan と同じ。
   * 続けて読む画面から来たときは、結果を一覧か確かめてくださいに入れて、続けて読む画面に戻る。
   * sound が真（まとめての画面のカメラで読んだとき）は、その品目の行へ移れるならよい音、ほかは注意の音を鳴らす。
   */
  function sendJan(jan, sound) {
    if (state.sending) return '';
    state.sending = true;
    var origin = scan.origin;
    return lookupJan(jan, function (r) {
      state.sending = false;
      if (origin === 'reg') {
        regApply(jan, r);
        renderRegister();
        return;
      }
      if (sound === true) beep(janGoesToRow(r));
      renderJanResult(r);
    }, null);
  }

  /** まとめての画面で、その結果がいまの種類の品目の行へ移るもの（one で一覧にある）なら true。 */
  function janGoesToRow(r) {
    if (!r.ok || !stockIsJanOk(r.data) || r.data.status !== 'one') return false;
    var hit = findListed(r.data.candidates[0].kind, r.data.candidates[0].item);
    return hit !== null && hit.kind === state.kind;
  }

  /** 結果の画面の「もう一度読む」と「戻る」。 */
  function janRow() {
    var row = el('div', 'action-row');
    var again = false;
    row.appendChild(button(T.scanAgain, 'again', function () {
      if (again) return;
      again = true;
      renderScan();
    }));
    row.appendChild(button(T.back, 'reset', backToOrigin));
    return row;
  }

  function renderJanMessage(className, text) {
    clear(T.titleRecord);
    root.appendChild(el('p', className, text));
    root.appendChild(janRow());
  }

  /** 照会で決まった品目を、開いた元の画面で選ぶ（message があれば探すカードに1回だけ出す）。 */
  function useJanItem(hit, message) {
    search.flash = message;
    if (scan.origin === 'batch') {
      renderBatch();
      focusBatchItem(hit.item);
    } else {
      selectItem(hit.kind, hit.group, hit.item);
    }
    search.flash = '';
  }

  /**
   * 選ぶ画面。読んである一覧にない候補は除く（何も残らなければ一覧にないの結果の画面）。
   * まとめてでは、一覧にあっていまの種類と違う候補は文で知らせ、残りをボタンにする。
   */
  function renderJanPick(d) {
    var shown = [];
    var others = [];
    d.candidates.forEach(function (c) {
      var hit = findListed(c.kind, c.item);
      if (hit === null) return;
      if (scan.origin === 'batch' && hit.kind !== state.kind) others.push(hit);
      else shown.push(hit);
    });
    if (shown.length === 0 && others.length === 0) {
      renderJanMessage('status error', T.janNotListed);
      return;
    }
    clear(T.titleRecord);
    root.appendChild(el('p', 'result', d.message));
    if (shown.length >= 1) {
      var card = el('div', 'card');
      card.appendChild(el('h2', 'heading', T.janPickHeading));
      var choices = el('div', 'choices');
      shown.forEach(function (hit) {
        choices.appendChild(choiceButton(hitText(hit, scan.origin), false, function () {
          useJanItem(hit, '');
        }));
      });
      card.appendChild(choices);
      root.appendChild(card);
    }
    if (others.length >= 1) {
      root.appendChild(el('p', 'note', T.janOtherKind + others.map(function (c) {
        return c.item + T.unitOpen + c.kind + T.unitClose;
      }).join(T.listSep)));
    }
    root.appendChild(janRow());
  }

  function renderJanResult(r) {
    if (r.ok && stockIsJanOk(r.data)) {
      var d = r.data;
      if (d.status === 'one') {
        var hit = findListed(d.candidates[0].kind, d.candidates[0].item);
        if (hit === null) renderJanMessage('status error', T.janNotListed);
        else if (scan.origin === 'batch' && hit.kind !== state.kind) renderJanPick(d);
        else useJanItem(hit, d.message);
      } else if (d.status === 'pick') {
        renderJanPick(d);
      } else {
        renderJanMessage('result', d.message);
      }
    } else if (r.ok && r.data.result !== 'ok' && typeof r.data.message === 'string') {
      renderJanMessage('result', r.data.message);
    } else {
      renderJanMessage('status error', T.janFailed);
    }
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
