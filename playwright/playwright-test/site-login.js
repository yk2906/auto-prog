/**
 * メール＋パスワードでログインし、Bold ポータルの勤怠一覧を処理する。
 *
 * ログイン後: PORTAL_PAGE_A → PORTAL_PAGE_B
 * PAGE_B で日付要素を読み、実行日を含む直近7日間の行のみ処理（未来日は除外）。
 * 月・水: 「定時」前にテレワークチェックをオン。
 * 火・木・金: 「定時」前に申請→交通費アコーディオン→テンプレートを使用→保存。
 * 全日: 「定時」→「更新」。
 *
 * 使い方:
 *   LOGIN_URL=https://example.com/login \
 *   LOGIN_EMAIL=you@example.com \
 *   LOGIN_PASSWORD=secret \
 *   HEADED=1 \
 *   node playwright-test/site-login.js
 *
 * .env を使う例: set -a && source playwright-test/.env && set +a && node playwright-test/site-login.js
 *
 * 環境変数（任意）:
 *   LOGIN_BUTTON_NAME            ログインボタンの表示名（既定: Login）
 *   DATE_PARAGRAPH_SELECTOR      日付が入る p のセレクタ（既定: p.chakra-text.css-fivo40）
 *   SCHEDULE_YEAR                日程一覧の年（4桁）。未設定時は実行日の年
 *   SCHEDULE_MONTH               日程一覧の月（1–12）。未設定時は実行日の月
 *   SCHEDULE_ACTION_BUTTON_NAME  日程行で押すボタン名（既定: 定時）
 *   SCHEDULE_UPDATE_BUTTON_NAME  定時押下後に押すボタン名（既定: 更新）
 *   ROW_CHECKBOX_SELECTOR        フォールバック用 control のセレクタ（span.chakra-checkbox__control）
 *   ROW_CHECKBOX_INPUT_SELECTOR  テーブル行内の input（既定: input.chakra-checkbox__input）
 *   TELEWORK_COLUMN_INDEX        テレワークチェックがある列（0 始まり。既定: 1）
 *   AFTER_UPDATE_MS              「更新」押下後の待機ミリ秒（既定: 10000。0 で無効）
 *   SCHEDULE_APPLY_BUTTON_NAME   行の「申請」ボタン表示名（既定: 申請）
 *   EXPENSE_ACCORDION_LABEL      モーダル内アコーディオンの見出しテキスト（既定: 交通費 1）
 */
// ローカルおよび GitHub Actions (UTC) の両環境で JST として動作させる
process.env.TZ = 'Asia/Tokyo';

const { chromium } = require('playwright');

const PORTAL_PAGE_A = 'https://portal.bold.ne.jp/attendance';
const PORTAL_PAGE_B = 'https://portal.bold.ne.jp/attendance/view';

/** Chakra の css-* はビルドで変わることがある。変わったら DATE_PARAGRAPH_SELECTOR で上書き */
const DEFAULT_DATE_PARAGRAPH_SELECTOR = 'p.chakra-text.css-fivo40';
const DEFAULT_ROW_CHECKBOX_SELECTOR = 'span.chakra-checkbox__control, [class*="chakra-checkbox__control"]';
const DEFAULT_ROW_CHECKBOX_INPUT_SELECTOR =
  'input.chakra-checkbox__input, input[type="checkbox"][class*="chakra-checkbox__input"]';

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    console.error(`環境変数 ${name} が未設定です。`);
    process.exit(1);
  }
  return v.trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNetworkIdle(page) {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
}

/** サイトごとに input 構造が異なる場合はこの関数を書き換える */
async function fillEmailAndPassword(page, email, password) {
  const emailBox = page
    .getByRole('textbox', { name: /メール|e-?mail|電子メール|ユーザー名|username/i })
    .or(page.locator('input[type="email"]'))
    .or(page.locator('input[name="email"], input[name="username"]'))
    .first();

  const passwordBox = page
    .getByLabel(/パスワード|password/i)
    .or(page.locator('input[type="password"]'))
    .first();

  await emailBox.waitFor({ state: 'visible', timeout: 15_000 });
  await emailBox.fill(email);
  await passwordBox.fill(password);
}

const JA_WEEKDAY_TO_JS = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };

function getScheduleYearMonth() {
  const now = new Date();
  let year = now.getFullYear();
  let monthIndex = now.getMonth();

  const ys = process.env.SCHEDULE_YEAR?.trim();
  const ms = process.env.SCHEDULE_MONTH?.trim();
  if (ys && /^\d{4}$/.test(ys)) year = parseInt(ys, 10);
  if (ms && /^\d{1,2}$/.test(ms)) {
    const mm = parseInt(ms, 10);
    if (mm >= 1 && mm <= 12) monthIndex = mm - 1;
  }
  return { year, monthIndex };
}

function localNoonDate(year, monthIndex, day) {
  const d = new Date(year, monthIndex, day, 12, 0, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== monthIndex || d.getDate() !== day) return null;
  return d;
}

// 「1日(水)」形式。曜が合う月を基準月・前月・翌月の順で探す
function parseBoldDayWithWeekday(raw, ctx) {
  const t = String(raw).replace(/\s+/g, ' ').trim();
  const m = t.match(/(\d{1,2})日(?:\s*\(([日月火水木金土])\))?/);
  if (!m) return null;

  const day = parseInt(m[1], 10);
  if (day < 1 || day > 31) return null;

  const wantWd = m[2] !== undefined ? JA_WEEKDAY_TO_JS[m[2]] : undefined;

  for (const off of [0, -1, 1]) {
    const d = localNoonDate(ctx.year, ctx.monthIndex + off, day);
    if (!d) continue;
    if (wantWd === undefined || d.getDay() === wantWd) return d;
  }
  return null;
}

/** @returns {Date | null} ローカル日付の正午（比較用） */
function parseDateFromText(raw, scheduleCtx) {
  if (!raw) return null;
  const t = String(raw).replace(/\s+/g, ' ').trim();

  let m = t.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m) {
    const d = localNoonDate(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    if (d) return d;
  }
  m = t.match(/(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/);
  if (m) {
    const d = localNoonDate(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    if (d) return d;
  }
  m = t.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/);
  if (m) {
    const d = localNoonDate(parseInt(m[3], 10), parseInt(m[1], 10) - 1, parseInt(m[2], 10));
    if (d) return d;
  }
  m = t.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m) {
    const y = new Date().getFullYear();
    return new Date(y, parseInt(m[1], 10) - 1, parseInt(m[2], 10), 12, 0, 0, 0);
  }

  if (scheduleCtx) {
    const bold = parseBoldDayWithWeekday(t, scheduleCtx);
    if (bold) return bold;
  }

  return null;
}

function endOfLocalToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function getScheduleDateWindowIncludingRunDay() {
  const end = endOfLocalToday();
  const start = startOfLocalDay();
  start.setDate(start.getDate() - 6);
  return { start, end };
}

function getAfterUpdateDelayMs() {
  const raw = process.env.AFTER_UPDATE_MS?.trim();
  if (!raw) return 10000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 10000;
}

async function clickNamedButtonNearDateParagraph(pLocator, buttonName, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const pollMs = options.pollMs ?? 300;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const handle = await pLocator.elementHandle();
    if (!handle) {
      await sleep(pollMs);
      continue;
    }
    const clicked = await handle.evaluate((el, name) => {
      const matchesName = (b) => {
        const text = (b.textContent || '').replace(/\s+/g, ' ').trim();
        const label = (b.getAttribute('aria-label') || '').trim();
        return text === name || text.includes(name) || label === name || label.includes(name);
      };

      let scope = el.parentElement;
      for (let depth = 0; depth < 12 && scope && scope !== document.body; depth++) {
        const buttons = [...scope.querySelectorAll('button')].filter(
          (b) => b.offsetParent !== null && !b.disabled,
        );
        const target = buttons.find((b) => matchesName(b));
        if (target) {
          target.click();
          return true;
        }
        scope = scope.parentElement;
      }
      return false;
    }, buttonName);
    await handle.dispose();

    if (clicked) return;
    await sleep(pollMs);
  }

  throw new Error(
    `日付行の近くに名前「${buttonName}」の有効な button が ${timeoutMs}ms 以内に見つかりません（DOM・表記・disabled 解除待ちを要確認）`,
  );
}

async function runApplyAndExpenseTemplateFlow(page, rowParagraph) {
  const applyName = process.env.SCHEDULE_APPLY_BUTTON_NAME?.trim() || '申請';
  const expenseLabel = process.env.EXPENSE_ACCORDION_LABEL?.trim() || '交通費 1';

  await clickNamedButtonNearDateParagraph(rowParagraph, applyName);
  await waitForNetworkIdle(page);

  const outerDialog = page
    .getByRole('dialog')
    .filter({ has: page.locator('button.chakra-accordion__button').filter({ hasText: expenseLabel }) })
    .last();
  await outerDialog.waitFor({ state: 'visible', timeout: 25_000 });

  const accordionButton = outerDialog.locator('button.chakra-accordion__button').filter({ hasText: expenseLabel });
  await accordionButton.first().waitFor({ state: 'visible', timeout: 15_000 });
  const expanded = await accordionButton.first().getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await accordionButton.first().click();
    await sleep(400);
  }

  await outerDialog.getByRole('button', { name: 'テンプレートから追加' }).click({ timeout: 15_000 });
  await waitForNetworkIdle(page);

  const templateUseBtn = page.getByRole('button', { name: 'テンプレートを使用' }).first();
  await templateUseBtn.waitFor({ state: 'visible', timeout: 15_000 });
  await templateUseBtn.click();
  await waitForNetworkIdle(page);

  await outerDialog.getByRole('button', { name: '保存' }).click({ timeout: 20_000 });
  await waitForNetworkIdle(page);

  await outerDialog.waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
}

async function resolveCheckboxInputFromRow(row, inputSelector, teleworkColIndex) {
  const chakra = row.locator('label.chakra-checkbox input.chakra-checkbox__input').first();
  if ((await chakra.count()) > 0) return chakra;

  const cells = row.locator('td, [role="gridcell"]');
  const nCells = await cells.count();
  if (nCells > teleworkColIndex) {
    const cell = cells.nth(teleworkColIndex);
    let loc = cell.locator(inputSelector).first();
    if ((await loc.count()) === 0) loc = cell.locator('input[type="checkbox"]').first();
    if ((await loc.count()) > 0) return loc;
  }

  let loc = row.locator(inputSelector).first();
  if ((await loc.count()) === 0) loc = row.locator('input[type="checkbox"]').first();
  return (await loc.count()) > 0 ? loc : null;
}

async function ensureRowChakraCheckboxCheckedNearDateParagraph(pLocator, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const pollMs = options.pollMs ?? 400;
  const checkboxSelector = process.env.ROW_CHECKBOX_SELECTOR?.trim() || DEFAULT_ROW_CHECKBOX_SELECTOR;
  const inputSelector = process.env.ROW_CHECKBOX_INPUT_SELECTOR?.trim() || DEFAULT_ROW_CHECKBOX_INPUT_SELECTOR;
  const deadline = Date.now() + timeoutMs;

  // input.checked だけでは取りこぼすケースがあるため label/control の data-checked も確認する
  const isChakraCheckboxOn = async (inputLocator) => {
    if (await inputLocator.isChecked().catch(() => false)) return true;
    return inputLocator
      .evaluate((el) => {
        const label = el.closest('label');
        if (!label) return false;
        if (label.hasAttribute('data-checked')) return true;
        const ctrl = label.querySelector('[class*="chakra-checkbox__control"]');
        if (!ctrl) return false;
        return ctrl.hasAttribute('data-checked') || ctrl.getAttribute('data-state') === 'checked';
      })
      .catch(() => false);
  };

  const waitUntilChecked = async (inputLocator, maxMs = 3000) => {
    const end = Date.now() + maxMs;
    while (Date.now() < end) {
      if (await isChakraCheckboxOn(inputLocator)) return true;
      await sleep(80);
    }
    return false;
  };

  const teleworkColIndex = (() => {
    const raw = process.env.TELEWORK_COLUMN_INDEX?.trim();
    if (!raw) return 1;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 1;
  })();

  const CHAKRA_INTERACT_SETTLE_MS = 2500;

  // React のオーバーレイで通常クリックが取りこぼされることがあるため段階的に試みる
  const attemptCheckChakraInput = async (input, page) => {
    if (await isChakraCheckboxOn(input)) return true;

    await input.scrollIntoViewIfNeeded().catch(() => {});

    const parentTag = await input.locator('..').evaluate((el) => el.tagName).catch(() => '');
    const labelEl = parentTag === 'LABEL' ? input.locator('..') : input.locator('xpath=ancestor::label[1]');
    const ctl =
      (await labelEl.count()) > 0
        ? labelEl.locator('[class*="chakra-checkbox__control"]').first()
        : input.locator('xpath=ancestor::label[1]').locator('[class*="chakra-checkbox__control"]').first();

    const afterInteract = async (fn) => {
      await fn();
      return waitUntilChecked(input, CHAKRA_INTERACT_SETTLE_MS);
    };

    if ((await labelEl.count()) > 0 && (await afterInteract(() => labelEl.click({ force: true, timeout: 10_000 })))) {
      return true;
    }
    if ((await ctl.count()) > 0 && (await afterInteract(() => ctl.click({ force: true, timeout: 10_000 })))) {
      return true;
    }

    try {
      if (await afterInteract(() => input.check({ force: true, timeout: 10_000 }))) return true;
    } catch { /* 次へ */ }

    try {
      if (
        await afterInteract(async () => {
          await input.focus({ timeout: 5000 });
          await page.keyboard.press('Space');
        })
      ) {
        return true;
      }
    } catch { /* 次へ */ }

    if ((await ctl.count()) > 0) {
      await ctl.scrollIntoViewIfNeeded().catch(() => {});
      const box = await ctl.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        if (await afterInteract(() => page.mouse.click(cx, cy))) return true;
      }
    }

    if (
      await afterInteract(() =>
        input.evaluate((el) => {
          const label = el.closest('label');
          const control = label?.querySelector('[class*="chakra-checkbox__control"]');
          const chain = [control, label, el].filter(Boolean);
          const types = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
          for (const node of chain) {
            for (const type of types) {
              node.dispatchEvent(
                new MouseEvent(type, { bubbles: true, cancelable: true, composed: true, view: window }),
              );
            }
          }
        }),
      )
    ) {
      return true;
    }

    await input.evaluate((el) => el.click());
    return waitUntilChecked(input, CHAKRA_INTERACT_SETTLE_MS);
  };

  /** @returns {'already'|'clicked'|'none'} */
  const tryCheckboxInsideTableRow = async () => {
    const page = pLocator.page();
    // XPath 祖先より filter({ has }) のほうが確実なことが多い
    const rowCandidates = [
      page.locator('tbody tr[role="row"]').filter({ has: pLocator }),
      page.locator('tr[role="row"]').filter({ has: pLocator }),
      page.locator('tbody tr').filter({ has: pLocator }),
      pLocator.locator('xpath=./ancestor::tr[1]'),
      pLocator.locator('xpath=./ancestor::*[@role="row"][1]'),
    ];

    for (const row of rowCandidates) {
      if ((await row.count()) === 0) continue;

      const input = await resolveCheckboxInputFromRow(row, inputSelector, teleworkColIndex);
      if (!input) continue;

      if (await isChakraCheckboxOn(input)) return 'already';

      const ok = await attemptCheckChakraInput(input, page);
      if (ok) return 'clicked';

      const rowCtl = row.locator(checkboxSelector).first();
      if ((await rowCtl.count()) > 0) {
        await rowCtl.click({ force: true, timeout: 10_000 });
        if (await waitUntilChecked(input)) return 'clicked';
      }
    }

    return 'none';
  };

  const tryLabelThenControlClick = async (label, input) => {
    if (await isChakraCheckboxOn(input)) return 'already';
    await label.scrollIntoViewIfNeeded().catch(() => {});
    await label.click({ force: true, timeout: 8000 });
    if (await waitUntilChecked(input)) return 'clicked';
    const ctl = label.locator(checkboxSelector).first();
    if ((await ctl.count()) > 0) {
      await ctl.click({ force: true, timeout: 8000 });
      if (await waitUntilChecked(input)) return 'clicked';
    }
    return 'none';
  };

  /** @returns {'already'|'clicked'|'none'} */
  const tryToggleInAncestorScope = async (depth) => {
    const scope = pLocator.locator(`xpath=./ancestor::*[${depth}]`);

    const label = scope.locator('label:has(input[type="checkbox"])').first();
    if ((await label.count()) > 0) {
      return tryLabelThenControlClick(label, label.locator('input[type="checkbox"]'));
    }

    const roleCb = scope.getByRole('checkbox').first();
    if ((await roleCb.count()) > 0) {
      if (await roleCb.isChecked().catch(() => false)) return 'already';
      await roleCb.scrollIntoViewIfNeeded().catch(() => {});
      await roleCb.click({ force: true, timeout: 8000 });
      return (await roleCb.isChecked().catch(() => false)) ? 'clicked' : 'none';
    }

    const ctrl = scope.locator(checkboxSelector).first();
    if ((await ctrl.count()) > 0) {
      const inputInRow = scope.locator('input[type="checkbox"]').first();
      if ((await inputInRow.count()) > 0 && (await isChakraCheckboxOn(inputInRow))) return 'already';
      await ctrl.scrollIntoViewIfNeeded().catch(() => {});
      await ctrl.click({ force: true, timeout: 8000 });
      if ((await inputInRow.count()) > 0 && (await waitUntilChecked(inputInRow))) return 'clicked';
      return 'none';
    }

    return 'none';
  };

  const logCheckboxResultAndStop = (outcome, detailJa) => {
    if (outcome === 'already') {
      console.log('同一行のチェックボックスは既にオンです');
      return true;
    }
    if (outcome === 'clicked') {
      console.log(`同一行のチェックボックスをオンにしました（${detailJa}）`);
      return true;
    }
    return false;
  };

  while (Date.now() < deadline) {
    const tableOutcome = await tryCheckboxInsideTableRow();
    if (logCheckboxResultAndStop(tableOutcome, 'テーブル行内の input.chakra-checkbox__input')) return;

    for (let depth = 1; depth <= 12; depth++) {
      const outcome = await tryToggleInAncestorScope(depth);
      if (logCheckboxResultAndStop(outcome, '祖先スキャン フォールバック')) return;
    }
    await sleep(pollMs);
  }

  throw new Error(
    `同一行のチェックが ${timeoutMs}ms 以内にオンになりませんでした（ROW_CHECKBOX_INPUT_SELECTOR 等を確認）`,
  );
}

function isMondayOrWednesday(d) {
  const wd = d.getDay();
  return wd === 1 || wd === 3;
}

function isTuesdayThursdayFriday(d) {
  const wd = d.getDay();
  return wd === 2 || wd === 4 || wd === 5;
}

async function clickScheduleInWeekIncludingRunDay(page) {
  const selector = process.env.DATE_PARAGRAPH_SELECTOR?.trim() || DEFAULT_DATE_PARAGRAPH_SELECTOR;
  const scheduleCtx = getScheduleYearMonth();
  const { start: windowStart, end: windowEnd } = getScheduleDateWindowIncludingRunDay();
  console.log(
    `日程の年月コンテキスト: ${scheduleCtx.year}年${scheduleCtx.monthIndex + 1}月（SCHEDULE_YEAR / SCHEDULE_MONTH で変更可）`,
  );
  console.log(
    `更新対象の日付範囲（実行日を含む7日間）: ${windowStart.toLocaleDateString('ja-JP')} ～ ${windowEnd.toLocaleDateString('ja-JP')}（未来日は除外）`,
  );

  const items = page.locator(selector);
  await items.first().waitFor({ state: 'visible', timeout: 30_000 });

  const n = await items.count();
  const candidates = [];

  for (let i = 0; i < n; i++) {
    const p = items.nth(i);
    const text = (await p.textContent())?.trim() || '';
    const parsed = parseDateFromText(text, scheduleCtx);
    if (!parsed) {
      console.warn(`日付を解釈できません [${i}]: ${text.slice(0, 120)}`);
      continue;
    }
    const t = parsed.getTime();
    if (t >= windowStart.getTime() && t <= windowEnd.getTime()) {
      candidates.push({ i, date: parsed, text });
      console.log(`日程（7日以内の候補）: "${text}" → ${parsed.toLocaleDateString('ja-JP')}`);
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      '実行日を含む直近7日間に該当する日程が1件もありません。表示テキストの形式かセレクタ（DATE_PARAGRAPH_SELECTOR）を確認してください。',
    );
  }

  candidates.sort((a, b) => a.date.getTime() - b.date.getTime());

  const actionButtonName = process.env.SCHEDULE_ACTION_BUTTON_NAME?.trim() || '定時';
  const updateButtonName = process.env.SCHEDULE_UPDATE_BUTTON_NAME?.trim() || '更新';

  console.log(
    `上記7日間の ${candidates.length} 日について、月・水は「定時」前にチェックのみ、火・木・金は「定時」前に申請〜交通費テンプレート→保存、その後各行「${actionButtonName}」→「${updateButtonName}」（日付の古い順）`,
  );

  for (const c of candidates) {
    const rowParagraph = items.nth(c.i);
    if (isMondayOrWednesday(c.date)) {
      console.log(`月・水: 「定時」の前にチェック — "${c.text}"`);
      await ensureRowChakraCheckboxCheckedNearDateParagraph(rowParagraph);
      await waitForNetworkIdle(page);
    }
    if (isTuesdayThursdayFriday(c.date)) {
      console.log(`火・木・金: 申請→交通費→テンプレート→保存 — "${c.text}"`);
      await runApplyAndExpenseTemplateFlow(page, rowParagraph);
      await waitForNetworkIdle(page);
    }
  }

  for (const c of candidates) {
    const rowParagraph = items.nth(c.i);
    console.log(`行処理: "${c.text}" →「${actionButtonName}」`);
    await clickNamedButtonNearDateParagraph(rowParagraph, actionButtonName);
    await waitForNetworkIdle(page);

    console.log(`行処理: "${c.text}" →「${updateButtonName}」`);
    await clickNamedButtonNearDateParagraph(rowParagraph, updateButtonName, { timeoutMs: 20_000 });
    await waitForNetworkIdle(page);
  }

  const afterUpdateMs = getAfterUpdateDelayMs();
  if (afterUpdateMs > 0) {
    console.log(`全行処理後、${afterUpdateMs} ms 待機します（AFTER_UPDATE_MS で変更、0 でスキップ）`);
    await sleep(afterUpdateMs);
  }
}

(async () => {
  const loginUrl = requireEnv('LOGIN_URL');
  const email = requireEnv('LOGIN_EMAIL');
  const password = requireEnv('LOGIN_PASSWORD');
  const loginButtonName = process.env.LOGIN_BUTTON_NAME?.trim() || 'Login';

  const headless = !(process.env.HEADED === '1' || process.env.HEADLESS === '0');

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' });
  const page = await context.newPage();

  try {
    console.log('ログインページを開いています...');
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

    await fillEmailAndPassword(page, email, password);

    console.log('ログインを送信します...');
    await page.getByRole('button', { name: loginButtonName }).click();

    await waitForNetworkIdle(page);

    console.log('ログイン後のタイトル:', await page.title());

    console.log('遷移:', PORTAL_PAGE_A);
    await page.goto(PORTAL_PAGE_A, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(page);

    console.log('遷移:', PORTAL_PAGE_B);
    await page.goto(PORTAL_PAGE_B, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(page);

    await clickScheduleInWeekIncludingRunDay(page);

    console.log('最終ページのタイトル:', await page.title());
  } finally {
    await browser.close();
  }
})();
