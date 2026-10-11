/*
 * 記録画面（LIFF）。場所を複数ボタンで選び、手段ボタンを1つ選んで送信する。
 * 場所・手段の一覧は毎回 GAS から受け取る（このファイルに農園の情報を書かない）。
 * 表示はすべて createElement と textContent で作る。キーボードを出す要素は倍率の入力欄だけ（進み具合はスライダー）。
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

/** 除草前の状態をつなぐ区切り（RecordForm.js の RECORD_FORM_STATE_JOINER_ と同じ値）。 */
var STATE_JOINER = ' / ';

/** 除草前の状態の行の先頭（RecordForm.js の RECORD_FORM_STATE_LINE_PREFIX_ と同じ値）。 */
var STATE_LINE_PREFIX = '除草前の状態：';

/** 除草前の状態の画面の文。 */
var RECORD_APP_STATE_TEXT = {
  heading: '除草前の状態（必須）',
  note: 'あてはまるものを1つ以上選んでください（いくつでも選べます）',
  missing: '（除草前の状態を選んでください）',
  notRecorded: '除草前の状態を記録できていない可能性があります（管理者に連絡してください）'
};

/** 倍率の範囲（RecordForm.js の RECORD_FORM_RATIO_MIN_・RECORD_FORM_RATIO_MAX_ と同じ値）。 */
var RATIO_MIN = 1;
var RATIO_MAX = 10000;

/** 結果・【記録】の行の先頭と接尾辞（RecordForm.js の同名の定数と同じ値）。 */
var PART_LINE_PREFIX = '部位：';
var DRUG_LINE_PREFIX = '薬剤：';
var PROGRESS_LINE_PREFIX = '進み具合：';
var RATIO_SUFFIX = '倍';
var PROGRESS_SUFFIX = '%';

/** 前回の記録を出す最大の行数（これを超えた分は「ほか n か所」）。 */
var PREVIOUS_MAX_LINES = 3;

/** 薬剤・倍率・部位・進み具合・詳しく・前回の記録の画面の文。 */
var RECORD_APP_DETAIL_TEXT = {
  drugHeading: '薬剤',
  ratioHeading: '倍率',
  ratioNoteHead: '何倍にうすめたかを数字で入れてください（1〜10000）。',
  ratioNoteTail: 'のときは薬剤と倍率を入れると送信できます',
  ratioError: '倍率は 1〜10000 の数字で入れてください',
  partHeading: '部位（任意）',
  partNote: '同じ場所でも部位ごとに分けて記録できます（「続けて記録する」で場所は残ります）',
  progressHeading: '進み具合（任意）',
  progressLabel: '進み具合',
  progressNone: '未入力',
  progressOpen: '進み具合を入れる',
  progressClear: '未入力に戻す',
  progressNote: '入れたいときだけ「進み具合を入れる」を押し、バーを動かして、この記録でどのくらい終わったかの感じを記録します。全部終わったときは入れなくてかまいません',
  partItem: '部位',
  progressItem: '進み具合',
  detailsOpenHead: '詳しく（',
  detailsOpenTail: '）',
  detailsClose: '詳しくを閉じる',
  summaryPrefix: '詳しく：',
  summaryJoiner: '／',
  itemJoiner: '・',
  moreHead: 'ほか ',
  moreTail: ' か所',
  notRecorded: '部位・薬剤・進み具合を記録できていない可能性があります（管理者に連絡してください）'
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

/**
 * GAS への要求オブジェクト。record で range が長さ1以上の配列のときだけ method の後に range（コピー）を付ける。
 * record で states が長さ1以上の配列のときだけ、その後に states（コピー）を付ける。
 * record で details があれば、その後に part → drug と ratio（両方そろうときだけ）→ progress → previous の順に付ける。
 */
function buildRequest(action, idToken, locations, method, range, states, details) {
  if (action === 'form') return { action: action, idToken: idToken };
  var req = { action: action, idToken: idToken, locations: locations, method: method };
  if (action === 'record' && Array.isArray(range) && range.length >= 1) req.range = range.slice();
  if (action === 'record' && Array.isArray(states) && states.length >= 1) req.states = states.slice();
  if (action === 'record' && details !== null && typeof details === 'object') {
    if (typeof details.part === 'string' && details.part !== '') req.part = details.part;
    if (typeof details.drug === 'string' && details.drug !== '' && Number.isInteger(details.ratio) &&
      details.ratio >= RATIO_MIN && details.ratio <= RATIO_MAX) {
      req.drug = details.drug;
      req.ratio = details.ratio;
    }
    if (Number.isSafeInteger(details.progress)) req.progress = details.progress;
    if (details.previous === true) req.previous = true;
  }
  return req;
}

/** 進み具合のバーの範囲と刻み { min, max, step } の形なら true。 */
function isProgressSpec(p) {
  if (p === null || typeof p !== 'object' || Array.isArray(p)) return false;
  if (!Number.isSafeInteger(p.min) || !Number.isSafeInteger(p.max) || !Number.isSafeInteger(p.step)) return false;
  return p.step >= 1 && p.min < p.max && (p.max - p.min) % p.step === 0;
}

/** 進み具合が未入力のときのつまみの位置（min と max の真ん中を刻みに丸めた値）。 */
function progressMiddle(p) {
  return p.min + Math.round((p.max - p.min) / 2 / p.step) * p.step;
}

/** 進み具合の文（null → 未入力、整数 → 何 %）。 */
function progressLabel(value) {
  if (value === null) return PROGRESS_LINE_PREFIX + RECORD_APP_DETAIL_TEXT.progressNone;
  return PROGRESS_LINE_PREFIX + value + PROGRESS_SUFFIX;
}

/** 倍率の入力を整数 1〜10000 に読む（全角数字も可）。読めなければ null。 */
function parseRatio(text) {
  if (typeof text !== 'string') return null;
  var s = text.normalize('NFKC').trim();
  if (!/^[0-9]{1,5}$/.test(s)) return null;
  var n = Number(s);
  return n >= RATIO_MIN && n <= RATIO_MAX ? n : null;
}

/**
 * locations（表示順）について previous の text を拾った新しい配列。見つからない場所は飛ばす。
 * 行が PREVIOUS_MAX_LINES を超えたら先頭の行＋「ほか n か所」。どちらかが配列でなければ []。引数は変えない。
 */
function previousLines(previous, locations) {
  if (!Array.isArray(previous) || !Array.isArray(locations)) return [];
  var lines = [];
  for (var i = 0; i < locations.length; i++) {
    for (var j = 0; j < previous.length; j++) {
      var p = previous[j];
      if (p !== null && typeof p === 'object' && p.location === locations[i] && typeof p.text === 'string') {
        lines.push(p.text);
        break;
      }
    }
  }
  if (lines.length <= PREVIOUS_MAX_LINES) return lines;
  var rest = lines.length - PREVIOUS_MAX_LINES;
  return lines.slice(0, PREVIOUS_MAX_LINES).concat([RECORD_APP_DETAIL_TEXT.moreHead + rest + RECORD_APP_DETAIL_TEXT.moreTail]);
}

/** options の順で selected に含まれるものの新しい配列（重複なし）。どちらかが配列でなければ []。引数は変えない。 */
function orderedStates(options, selected) {
  var out = [];
  if (!Array.isArray(options) || !Array.isArray(selected)) return out;
  for (var i = 0; i < options.length; i++) {
    if (selected.indexOf(options[i]) >= 0 && out.indexOf(options[i]) < 0) out.push(options[i]);
  }
  return out;
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
  var text = NOTICE_PREFIX + places.join('・') + ' ' + response.method;
  if (typeof response.part === 'string' && response.part !== '') text += '\n' + PART_LINE_PREFIX + response.part;
  if (typeof response.drug === 'string' && response.drug !== '' && Number.isInteger(response.ratio)) {
    text += '\n' + DRUG_LINE_PREFIX + response.drug + ' ' + response.ratio + RATIO_SUFFIX;
  }
  if (Number.isSafeInteger(response.progress)) text += '\n' + PROGRESS_LINE_PREFIX + response.progress + PROGRESS_SUFFIX;
  if (recordAppIsStringArray_(response.states) && response.states.length >= 1) {
    text += '\n' + STATE_LINE_PREFIX + response.states.join(STATE_JOINER);
  }
  return text;
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
  if (data.states !== undefined && !recordAppIsStringArray_(data.states)) return false;
  if (data.drugMethod !== undefined && typeof data.drugMethod !== 'string') return false;
  if (data.drugs !== undefined && !recordAppIsStringArray_(data.drugs)) return false;
  if (data.parts !== undefined && !recordAppIsStringArray_(data.parts)) return false;
  if (data.progress !== undefined && !isProgressSpec(data.progress)) return false;
  if (data.previous !== undefined && !recordAppIsPreviousList_(data.previous)) return false;
  return true;
}

/** 前回の記録の一覧（{ location, text } の配列）の形か。 */
function recordAppIsPreviousList_(a) {
  if (!Array.isArray(a)) return false;
  for (var i = 0; i < a.length; i++) {
    var p = a[i];
    if (p === null || typeof p !== 'object' || typeof p.location !== 'string' || typeof p.text !== 'string') return false;
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
  var TS = RECORD_APP_STATE_TEXT;
  var TD = RECORD_APP_DETAIL_TEXT;
  var state = { idToken: '', name: '', groups: [], methods: [], selected: [], range: [], method: '', sending: false, error: '', mine: [], cancelling: false, stateOptions: [], states: [],
    drugMethod: '', drugs: [], parts: [], progressSpec: null, previous: null, detailsOpen: false, drug: '', ratioText: '', part: '', progress: null, progressOpen: false };
  /** いま出ている送信ボタン（倍率の入力のたびに disabled だけを更新する）。 */
  var sendButton = null;

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
      (state.method !== '' ? state.method : T.noMethod) +
      (state.stateOptions.length >= 1 && state.states.length === 0 ? '／' + TS.missing : '');
  }

  function choiceButton(text, isSelected, onClick) {
    var b = button(text, 'choice' + (isSelected ? ' selected' : ''), onClick);
    b.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    b.disabled = state.sending;
    return b;
  }

  /** FORM に部位か進み具合があるとき「詳しく」を使う。 */
  function hasDetails() {
    return state.parts.length >= 1 || state.progressSpec !== null;
  }

  /** 薬剤・倍率の欄を出すか（薬剤の手段が選ばれていて、薬剤の選択肢があるとき）。 */
  function drugShown() {
    return state.drugMethod !== '' && state.drugs.length >= 1 && state.method === state.drugMethod;
  }

  /** 送信できるか（既存の条件＋状態の選択肢があれば1つ以上＋薬剤・倍率の欄が出ているときは薬剤と正しい倍率）。 */
  function ready() {
    if (!canSend(state.selected, state.method)) return false;
    if (state.stateOptions.length >= 1 && state.states.length === 0) return false;
    return !drugShown() || (state.drug !== '' && parseRatio(state.ratioText) !== null);
  }

  /** 場所以外の選択・入力とエラーを外す。 */
  function clearChoices() {
    state.range = [];
    state.method = '';
    state.states = [];
    state.drug = '';
    state.ratioText = '';
    state.part = '';
    state.progress = null;
    state.progressOpen = false;
    state.error = '';
  }

  function renderRange(card) {
    card.appendChild(el('h2', 'heading', T.rangeHeading));
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
    card.appendChild(ranges);
    card.appendChild(el('p', 'note', T.rangeNote));
  }

  function renderStates(card) {
    card.appendChild(el('h2', 'heading', TS.heading));
    var states = el('div', 'choices state-choices');
    state.stateOptions.forEach(function (s) {
      states.appendChild(choiceButton(s, state.states.indexOf(s) >= 0, function () {
        if (state.sending) return;
        state.states = toggleLocation(state.states, s);
        state.error = '';
        renderSelect();
      }));
    });
    card.appendChild(states);
    card.appendChild(el('p', 'note', TS.note));
  }

  /** 倍率のエラーの行を、入力が空でなく読めないときだけ出す（その場で更新）。 */
  function updateRatioError(area) {
    while (area.firstChild) area.removeChild(area.firstChild);
    if (state.ratioText !== '' && parseRatio(state.ratioText) === null) area.appendChild(el('p', 'status error', TD.ratioError));
  }

  function renderDrug(card) {
    card.appendChild(el('h2', 'heading', TD.drugHeading));
    var drugs = el('div', 'choices drug-choices');
    state.drugs.forEach(function (d) {
      drugs.appendChild(choiceButton(d, state.drug === d, function () {
        if (state.sending) return;
        state.drug = state.drug === d ? '' : d;
        state.error = '';
        renderSelect();
      }));
    });
    card.appendChild(drugs);
    card.appendChild(el('h2', 'heading', TD.ratioHeading));
    var input = el('input', 'ratio');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.setAttribute('inputmode', 'numeric');
    input.pattern = '[0-9]*';
    input.autocomplete = 'off';
    input.maxLength = 5;
    input.setAttribute('aria-label', TD.ratioHeading);
    input.style.width = '100%';
    input.style.height = '48px';
    input.style.fontSize = '18px';
    input.value = state.ratioText;
    input.disabled = state.sending;
    var errorArea = el('div');
    input.addEventListener('input', function () {
      if (state.sending) return;
      state.ratioText = String(input.value);
      updateRatioError(errorArea);
      if (sendButton !== null) sendButton.disabled = state.sending || !ready();
    });
    card.appendChild(input);
    card.appendChild(el('p', 'note', TD.ratioNoteHead + state.drugMethod + TD.ratioNoteTail));
    card.appendChild(errorArea);
    updateRatioError(errorArea);
  }

  function renderPart(card) {
    card.appendChild(el('h2', 'heading', TD.partHeading));
    var parts = el('div', 'choices part-choices');
    state.parts.forEach(function (p) {
      parts.appendChild(choiceButton(p, state.part === p, function () {
        if (state.sending) return;
        state.part = state.part === p ? '' : p;
        state.error = '';
        renderSelect();
      }));
    });
    card.appendChild(parts);
    card.appendChild(el('p', 'note', TD.partNote));
  }

  function renderProgress(card) {
    var spec = state.progressSpec;
    card.appendChild(el('h2', 'heading', TD.progressHeading));
    var label = el('p', 'progress-value', progressLabel(state.progress));
    card.appendChild(label);
    if (!state.progressOpen) {
      // スライダーは押したときだけ出す（縦のスワイプで値が入るのを防ぐ）。押しただけでは値を入れない
      var open = button(TD.progressOpen, 'again progress-open', function () {
        if (state.sending) return;
        state.progressOpen = true;
        renderSelect();
      });
      open.disabled = state.sending;
      card.appendChild(open);
      card.appendChild(el('p', 'note', TD.progressNote));
      return;
    }
    var slider = el('input', 'progress-bar');
    slider.type = 'range';
    slider.min = String(spec.min);
    slider.max = String(spec.max);
    slider.step = String(spec.step);
    slider.setAttribute('aria-label', TD.progressLabel);
    slider.style.width = '100%';
    slider.style.height = '48px';
    slider.value = String(state.progress !== null ? state.progress : progressMiddle(spec));
    if (state.progress !== null) slider.setAttribute('aria-valuetext', state.progress + PROGRESS_SUFFIX);
    slider.disabled = state.sending;
    var clearButton = button(TD.progressClear, 'reset progress-clear', function () {
      if (state.sending) return;
      state.progress = null;
      state.progressOpen = false;
      renderSelect();
    });
    clearButton.disabled = state.sending;
    slider.addEventListener('input', function () {
      if (state.sending) return;
      var v = Number(slider.value);
      if (!Number.isSafeInteger(v)) return;
      state.progress = v;
      label.textContent = progressLabel(v);
      slider.setAttribute('aria-valuetext', v + PROGRESS_SUFFIX);
    });
    card.appendChild(slider);
    card.appendChild(clearButton);
    card.appendChild(el('p', 'note', TD.progressNote));
  }

  /** 閉じているときの「詳しく：…」の要約（選んだものがなければ空文字）。 */
  function detailsSummary() {
    var items = [];
    if (state.part !== '') items.push(state.part);
    if (state.range.length >= 1) items.push(state.range.join(TD.itemJoiner));
    if (state.progress !== null) items.push(state.progress + PROGRESS_SUFFIX);
    return items.length ? TD.summaryPrefix + items.join(TD.summaryJoiner) : '';
  }

  function renderDetails(card) {
    var items = [];
    if (state.parts.length >= 1) items.push(TD.partItem);
    items.push(T.rangeHeading);
    if (state.progressSpec !== null) items.push(TD.progressItem);
    var toggle = button(state.detailsOpen ? TD.detailsClose : TD.detailsOpenHead + items.join(TD.itemJoiner) + TD.detailsOpenTail,
      'again details-toggle', function () {
        if (state.sending) return;
        state.detailsOpen = !state.detailsOpen;
        renderSelect();
      });
    toggle.setAttribute('aria-expanded', state.detailsOpen ? 'true' : 'false');
    toggle.disabled = state.sending;
    card.appendChild(toggle);
    if (!state.detailsOpen) {
      var summary = detailsSummary();
      if (summary !== '') card.appendChild(el('p', 'note', summary));
      return;
    }
    if (state.parts.length >= 1) renderPart(card);
    renderRange(card);
    if (state.progressSpec !== null) renderProgress(card);
  }

  function renderSelect() {
    clear();
    sendButton = null;
    var details = hasDetails();
    root.appendChild(el('p', 'name', state.name + T.nameSuffix));

    var placeCard = el('div', 'card card-place');
    root.appendChild(placeCard);
    placeCard.appendChild(el('h2', 'heading', T.locationsHeading));
    state.groups.forEach(function (g) {
      if (g.locations.length === 0) return;
      placeCard.appendChild(el('h3', 'group-label', g.label));
      var box = el('div', 'choices');
      g.locations.forEach(function (loc) {
        box.appendChild(choiceButton(loc, state.selected.indexOf(loc) >= 0, function () {
          if (state.sending) return;
          state.selected = toggleLocation(state.selected, loc);
          state.error = '';
          renderSelect();
        }));
      });
      placeCard.appendChild(box);
    });

    if (!details) renderRange(placeCard);

    if (state.previous !== null && state.selected.length >= 1) {
      var prev = el('div', 'previous');
      previousLines(state.previous, orderedSelection(state.groups, state.selected)).forEach(function (line) {
        prev.appendChild(el('p', 'note', line));
      });
      placeCard.appendChild(prev);
    }

    var methodCard = el('div', 'card card-method');
    root.appendChild(methodCard);
    methodCard.appendChild(el('h2', 'heading', T.methodsHeading));
    var methods = el('div', 'choices');
    state.methods.forEach(function (m) {
      methods.appendChild(choiceButton(m, state.method === m, function () {
        if (state.sending) return;
        state.method = state.method === m ? '' : m;
        if (state.method !== state.drugMethod) {
          state.drug = '';
          state.ratioText = '';
        }
        state.error = '';
        renderSelect();
      }));
    });
    methodCard.appendChild(methods);

    if (drugShown()) renderDrug(methodCard);

    if (state.stateOptions.length >= 1) {
      var statesCard = el('div', 'card card-states');
      root.appendChild(statesCard);
      renderStates(statesCard);
    }

    if (details) {
      var detailsCard = el('div', 'card card-details');
      root.appendChild(detailsCard);
      renderDetails(detailsCard);
    }

    root.appendChild(el('p', 'note', T.noticeInfo));

    var bar = el('div', 'actions');
    bar.appendChild(el('p', 'selection', selectionText()));
    if (state.sending) bar.appendChild(el('p', 'status', T.sending));
    else if (state.error !== '') bar.appendChild(el('p', 'status error', state.error));
    var row = el('div', 'action-row');
    var reset = button(T.reset, 'reset', function () {
      if (state.sending) return;
      state.selected = [];
      clearChoices();
      renderSelect();
    });
    reset.disabled = state.sending;
    row.appendChild(reset);
    var send = button(T.send, 'send', onSend);
    send.disabled = state.sending || !ready();
    sendButton = send;
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
    if (state.sending || !ready()) return;
    var details = { previous: state.previous !== null };
    if (state.part !== '') details.part = state.part;
    if (drugShown()) {
      details.drug = state.drug;
      details.ratio = parseRatio(state.ratioText);
    }
    if (state.progress !== null) details.progress = state.progress;
    state.sending = true;
    state.error = '';
    renderSelect();
    var locations = orderedSelection(state.groups, state.selected);
    var range = state.range.slice();
    var states = orderedStates(state.stateOptions, state.states);
    post(buildRequest('record', state.idToken, locations, state.method, range, states, details)).then(function (r) {
      state.sending = false;
      if (r.ok && recordAppIsRecordOk_(r.data)) {
        updatePrevious(r.data.previous);
        renderResult(r.data, range, states, details);
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

  /** RECORD_OK の previous で、その場所の前回の記録の行を差し替える（ない場所は加える）。 */
  function updatePrevious(list) {
    if (state.previous === null || !recordAppIsPreviousList_(list)) return;
    var next = state.previous.slice();
    list.forEach(function (p) {
      var item = { location: p.location, text: p.text };
      for (var i = 0; i < next.length; i++) {
        if (next[i].location === p.location) {
          next[i] = item;
          return;
        }
      }
      next.push(item);
    });
    state.previous = next;
  }

  /** 送った部位・薬剤と倍率・進み具合のどれかが応答と一致しなければ true。 */
  function detailsMissing(sent, data) {
    if (sent.part !== undefined && data.part !== sent.part) return true;
    if (sent.drug !== undefined && (data.drug !== sent.drug || data.ratio !== sent.ratio)) return true;
    if (sent.progress !== undefined && data.progress !== sent.progress) return true;
    return false;
  }

  function renderResult(data, sentRange, sentStates, sentDetails) {
    clear();
    root.appendChild(el('p', 'result', data.message));
    if (sentRange.length >= 1 && !sameRange(sentRange, data.range)) {
      root.appendChild(el('p', 'status error', T.rangeNotRecorded));
    }
    if (sentStates.length >= 1 && !sameRange(sentStates, data.states)) {
      root.appendChild(el('p', 'status error', TS.notRecorded));
    }
    if (detailsMissing(sentDetails, data)) {
      root.appendChild(el('p', 'status error', TD.notRecorded));
    }
    root.appendChild(el('p', 'note', T.noticeInfo));
    var noticeArea = el('div', 'notice-area');
    root.appendChild(noticeArea);
    var row = el('div', 'action-row result-actions');
    row.appendChild(button(T.again, 'again', function () {
      clearChoices();
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
    clearChoices();
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
      state.stateOptions = Array.isArray(data.states) ? data.states : [];
      state.states = [];
      state.drugMethod = typeof data.drugMethod === 'string' ? data.drugMethod : '';
      state.drugs = Array.isArray(data.drugs) ? data.drugs : [];
      state.parts = Array.isArray(data.parts) ? data.parts : [];
      state.progressSpec = data.progress !== undefined ? data.progress : null;
      state.previous = Array.isArray(data.previous) ? data.previous.slice() : null;
      state.detailsOpen = false;
      state.drug = '';
      state.ratioText = '';
      state.part = '';
      state.progress = null;
      state.progressOpen = false;
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
