function generateNewSheetTitle(latestSheetTitle) {
  const title = (latestSheetTitle && typeof latestSheetTitle === 'string') ? latestSheetTitle : '';
  const match = title.match(/^[①-⑳]/);
  const nextNumber = match ? String.fromCharCode(match[0].charCodeAt(0) + 1) : '①';
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${nextNumber} ${month}月${day}日`;
}

// シート名末尾の「MM月DD日」からMMを取り出す（該当しなければnull）
function extractMonthFromTitle(title) {
  const match = (title || '').match(/(\d{2})月\d{2}日$/);
  return match ? match[1] : null;
}

function resolveCellsToClear(reportConfig, spreadsheetName) {
  if (reportConfig.cells_to_clear_by_name[spreadsheetName]) {
    log(`スプレッドシート名「${spreadsheetName}」用のクリア設定を使用（完全一致）`);
    return reportConfig.cells_to_clear_by_name[spreadsheetName];
  }
  const matchedPhrase = Object.keys(reportConfig.cells_to_clear_by_name_contains)
    .find(phrase => spreadsheetName.includes(phrase));
  if (matchedPhrase) {
    log(`スプレッドシート名「${spreadsheetName}」は「${matchedPhrase}」を含むため、専用のクリア設定を使用`);
    return reportConfig.cells_to_clear_by_name_contains[matchedPhrase];
  }
  return reportConfig.cells_to_clear;
}

// 新しいシートの8行目から「講師」「主催者」等のラベルを探し、その右にある最初の空でないセルの値を返す
const PERSON_IN_CHARGE_LABELS = ['講師', '主催者'];
function findPersonInCharge(newSheet) {
  const row = newSheet.getRange(8, 1, 1, newSheet.getLastColumn()).getValues()[0];
  const labelIndex = row.findIndex(cell => PERSON_IN_CHARGE_LABELS.includes(String(cell).trim()));
  if (labelIndex === -1) return null;
  for (let i = labelIndex + 1; i < row.length; i++) {
    const val = String(row[i]).trim();
    if (val) return val;
  }
  return null;
}

// 新しいシートの7行目にある「コース名　：値」「自主勉強会名　：値」形式のセルから値部分だけを取り出す
function findCourseOrEventName(newSheet) {
  const row = newSheet.getRange(7, 1, 1, newSheet.getLastColumn()).getValues()[0];
  const cellText = row.find(cell => String(cell).trim() !== '');
  if (!cellText) return null;
  const firstLine = String(cellText).split('\n')[0];
  const colonIndex = firstLine.indexOf('：');
  const value = colonIndex === -1 ? firstLine : firstLine.slice(colonIndex + 1);
  const trimmed = value.replace(/^[\s　]+|[\s　]+$/g, '');
  return trimmed || null;
}

// 目次シートのC5～C10に最初の空き行を探してコピー実施日を記載。
// D・E列: 新しいシートの実際の内容（講師/主催者、コース名/自主勉強会名）から反映する。
// 取得できなかった場合のみ、6行目以降なら1行上の値を引き継ぐ。
function updateTocSheet(spreadsheet, newSheet) {
  const tocSheet = spreadsheet.getSheetByName('目次');
  if (!tocSheet) {
    log('目次シートが見つかりませんでした');
    return;
  }
  const values = tocSheet.getRange(5, 3, 6, 1).getValues();
  const targetIndex = values.findIndex(([val]) => val === '' || val === null || String(val).trim() === '');
  if (targetIndex === -1) {
    log('目次シート: C5～C10がすべて埋まっているため日付を追記しません');
    return;
  }
  const targetRow = 5 + targetIndex;
  tocSheet.getRange(targetRow, 3).setValue(new Date()).setNumberFormat('yyyy/mm/dd');

  const person = findPersonInCharge(newSheet);
  if (person !== null) {
    tocSheet.getRange(targetRow, 4).setValue(person);
  } else if (targetRow > 5) {
    tocSheet.getRange(targetRow, 4).setValue(tocSheet.getRange(targetRow - 1, 4).getValue());
  }

  const courseOrEvent = findCourseOrEventName(newSheet);
  if (courseOrEvent !== null) {
    tocSheet.getRange(targetRow, 5).setValue(courseOrEvent);
  } else if (targetRow > 5) {
    tocSheet.getRange(targetRow, 5).setValue(tocSheet.getRange(targetRow - 1, 5).getValue());
  }

  log(`目次シートを更新しました（C${targetRow}に日付、D列=${person !== null ? person : '(前回値を引き継ぎ)'}、E列=${courseOrEvent !== null ? courseOrEvent : '(前回値を引き継ぎ)'}）`);
}

function copySpreadsheetReport() {
  log('=== copySpreadsheetReport 開始 ===');
  try {
    const config = getConfig();
    const reportConfig = config.daily_report;

    if (!reportConfig.parent_folder_id) {
      log('エラー: parent_folder_id が設定されていません');
      return;
    }

    const periodFolder = getLatestPeriodFolder(reportConfig.parent_folder_id);
    log(`対象期フォルダ: ${periodFolder.getName()} (ID: ${periodFolder.getId()})`);

    const spreadsheets = getFilesInFolder(periodFolder.getId(), MimeType.GOOGLE_SHEETS);
    if (spreadsheets.length === 0) {
      log('対象フォルダにスプレッドシートが見つかりませんでした');
      return;
    }
    log(`見つかったスプレッドシート数: ${spreadsheets.length}`);

    spreadsheets.forEach(function(spreadsheetItem, index) {
      log(`--- スプレッドシート ${index + 1}/${spreadsheets.length} を処理中: ${spreadsheetItem.name} ---`);
      try {
        const spreadsheet = SpreadsheetApp.openById(spreadsheetItem.id);
        const sheets = spreadsheet.getSheets();
        if (sheets.length === 0) {
          log(`スプレッドシート ${spreadsheetItem.name} にシートがありません`);
          return;
        }

        const latestSheet = sheets[sheets.length - 1];
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        if (extractMonthFromTitle(latestSheet.getName()) === currentMonth) {
          log(`スプレッドシート ${spreadsheetItem.name}: 今月(${currentMonth}月)のシート '${latestSheet.getName()}' が既に存在するためスキップします`);
          return;
        }

        const newSheetTitle = generateNewSheetTitle(latestSheet.getName());
        const newSheet = latestSheet.copyTo(spreadsheet);
        newSheet.setName(newSheetTitle);
        log(`シートを複製しました: ${newSheetTitle}`);

        const cellsToClear = resolveCellsToClear(reportConfig, spreadsheetItem.name);
        if (cellsToClear && cellsToClear.length > 0) {
          log(`クリアするセル数: ${cellsToClear.length}`);
          clearCells(newSheet, cellsToClear);
          log('セルをクリアしました');
        } else {
          log('クリアするセルが設定されていません');
        }

        updateDate(newSheet, reportConfig.date_cell);
        log('日付を更新しました');

        updateTocSheet(spreadsheet, newSheet);
        log(`スプレッドシート ${spreadsheetItem.name} に新しいシート '${newSheetTitle}' を作成しました`);

      } catch (error) {
        log(`スプレッドシート ${spreadsheetItem.name} の処理中にエラー: ${error}`);
        log(`エラースタック: ${error.stack || 'スタック情報なし'}`);
      }
    });

    log('=== copySpreadsheetReport 完了 ===');
  } catch (error) {
    log(`エラーが発生しました: ${error}`);
    log(`エラースタック: ${error.stack || 'スタック情報なし'}`);
  }
}
