/**
 * sync/ 配下（Obsidian版・Notion版どちらのレポート同期スクリプトからも共通で使う処理。
 * 「Markdown風の行配列 → 見出し単位で抽出 → スプレッドシートへ書き込み」という一連の流れを集約する。
 */

/**
 * リスト行のインデント（リスト記号前の空白数）を返す。リスト行でなければ -1。
 */
function getListIndent(line) {
  const m = line.match(/^(\s*)([-*]|\d+\.)/);
  return m ? m[1].length : -1;
}

// 括弧内が「所要時間」らしいものだけを採用（例:「（17分）」→「17分」）。説明文の「（明るさ変更・…）」は除外
function isDurationSegment(inner) {
  if (!inner) return false;
  inner = inner.trim();
  if (!/\d/.test(inner)) return false;
  return /(?:分|秒|時間|:)/.test(inner);
}

function extractParenTime(text) {
  if (!text) return '';
  const candidates = [];
  const re = /（([^）]+)）|\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = (m[1] || m[2] || '').trim();
    if (isDurationSegment(inner)) candidates.push(inner);
  }
  return candidates.length ? candidates[candidates.length - 1] : '';
}

/**
 * 行配列（Markdown風）を見出し単位で syncMap のキーに振り分ける。
 * shallowHeading を指定した場合、そのセクションだけ「一番浅いインデント」の行を
 * 1行ずつ shallowResults に積む（Udemy受講レポート系の「E9〜E14に1コースずつ」用）。
 *
 * @returns {{results: Object<string,string[]>, shallowResults: string[][]}}
 */
function buildSyncResultsFromLines(lines, syncMap, shallowHeading) {
  function flushSection(target, items, res, shallowOut) {
    if (!target || items.length === 0) return;
    res[target] = (res[target] || []).concat(items.map(x => x.line));
    if (shallowHeading && target === shallowHeading) {
      const minIndent = Math.min.apply(null, items.map(x => x.indent));
      items.filter(x => x.indent === minIndent)
        .forEach(x => shallowOut.push([x.line]));
    }
  }

  const results = {};
  Object.keys(syncMap).forEach(key => results[key] = []);
  const shallowResults = [];
  let currentTarget = null;
  let sectionListItems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('#')) {
      flushSection(currentTarget, sectionListItems, results, shallowResults);
      sectionListItems = [];
      currentTarget = syncMap[trimmedLine] ? trimmedLine : null;
      continue;
    }

    if (currentTarget) {
      if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.match(/^\d+\./)) {
        const indent = getListIndent(line);
        if (indent >= 0) sectionListItems.push({ indent: indent, line: line });
      }
    }
  }
  flushSection(currentTarget, sectionListItems, results, shallowResults);

  return { results: results, shallowResults: shallowResults };
}

/**
 * スプレッドシートを名前で検索する。folderId を指定した場合はそのフォルダ配下限定、
 * 省略した場合は Drive 全体（アクセス可能な範囲）から検索する。
 */
function findSpreadsheetByName(targetName, folderId) {
  const searchRoot = folderId ? DriveApp.getFolderById(folderId) : DriveApp;
  const files = searchRoot.getFilesByName(targetName);
  let ssFile = null;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      ssFile = file;
      break;
    }
  }
  if (!ssFile) throw new Error('スプレッドシート「' + targetName + '」が見つかりません。');
  return SpreadsheetApp.open(ssFile);
}

/**
 * スプレッドシート内から、名前に指定の月表記（例:「7月」）を含む最初のシートを返す。
 */
function findSheetByMonthName(spreadsheet, monthName) {
  const sheet = spreadsheet.getSheets().find(s => s.getName().indexOf(monthName) !== -1);
  if (!sheet) throw new Error('名前に「' + monthName + '」を含むシートが見つかりません。');
  return sheet;
}

/**
 * 同名のMarkdownファイル（.md）をDrive全体から名前で検索し、行配列として返す。
 * 拡張子 .md が付いていない場合も考慮して再検索する。
 */
function fetchObsidianMarkdownLines(targetFileName) {
  const mdFiles = DriveApp.getFilesByName(targetFileName + '.md');
  let mdFile = null;
  if (mdFiles.hasNext()) {
    mdFile = mdFiles.next();
  } else {
    const mdFilesNoExt = DriveApp.getFilesByName(targetFileName);
    if (mdFilesNoExt.hasNext()) {
      mdFile = mdFilesNoExt.next();
    }
  }
  if (!mdFile) throw new Error('Markdownファイル「' + targetFileName + '.md」が見つかりません。');

  const fullText = mdFile.getBlob().getDataAsString('UTF-8');
  return fullText.split(/\r?\n/);
}

/**
 * 見出し→セルの単純な書き込み（「一番浅いインデントの抽出」が無いレポート用。例: 項番4）。
 */
function writeSimpleReport(targetSheet, syncMap, results) {
  Object.keys(syncMap).forEach(heading => {
    const cell = syncMap[heading];
    targetSheet.getRange(cell).setValue(results[heading].join('\n') || '');
  });
}

/**
 * 見出し→セルの書き込みに加え、「一番浅いインデント」を1行ずつ shallowCells に振り分け、
 * 各行の括弧内所要時間を shallowTimeCells に、合計時間をX9・目次シートに書き込む
 * （Udemy受講レポート系＝項番2・項番3用）。
 * 併せて、過去シートでX9が未計算（空）の場合はS列から合算して埋める。
 */
function writeShallowReport(ss, targetSheet, syncMap, results, shallowResults, shallowCells, shallowTimeCells) {
  writeSimpleReport(targetSheet, syncMap, results);

  const collectedTimes = [];
  for (let i = 0; i < shallowResults.length && i < shallowCells.length; i++) {
    const cellValue = shallowResults[i].join('\n') || '';
    targetSheet.getRange(shallowCells[i]).setValue(cellValue);
    const timeStr = extractParenTime(cellValue);
    targetSheet.getRange(shallowTimeCells[i]).setValue(timeStr);
    collectedTimes.push(timeStr);
  }
  for (let j = shallowResults.length; j < shallowCells.length; j++) {
    targetSheet.getRange(shallowCells[j]).setValue('');
    targetSheet.getRange(shallowTimeCells[j]).setValue('');
    collectedTimes.push('');
  }
  // shallowCellsに対応しない分のshallowTimeCells（同期対象外の手動入力欄）は、
  // 上書きせず既存値をそのまま集計に含める
  for (let k = shallowCells.length; k < shallowTimeCells.length; k++) {
    collectedTimes.push(targetSheet.getRange(shallowTimeCells[k]).getValue());
  }

  const totalMinutes = collectedTimes.reduce((sum, t) => sum + parseStudyTime(t), 0);
  const formattedTotal = formatStudyTime(totalMinutes);
  targetSheet.getRange('X9').setValue(formattedTotal);
  writeTocStudyTime(ss, formattedTotal);

  // 過去シートのX9が未計算（空）の場合、shallowTimeCellsから合算して書き込む
  ss.getSheets().forEach(function(sheet) {
    if (sheet.getName() === targetSheet.getName()) return;
    const existingX9 = sheet.getRange('X9').getValue();
    if (existingX9 !== '' && existingX9 !== null && existingX9 !== 0) return;
    const backfillTimes = shallowTimeCells.map(cell => sheet.getRange(cell).getValue());
    const backfillTotal = backfillTimes.reduce((sum, t) => sum + parseStudyTime(String(t)), 0);
    if (backfillTotal > 0) {
      sheet.getRange('X9').setValue(formatStudyTime(backfillTotal));
    }
  });
}
