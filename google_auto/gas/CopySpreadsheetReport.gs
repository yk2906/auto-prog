function generateNewSheetTitle(latestSheetTitle) {
  const title = (latestSheetTitle && typeof latestSheetTitle === 'string') ? latestSheetTitle : '';
  const match = title.match(/^[①-⑳]/);
  const nextNumber = match ? String.fromCharCode(match[0].charCodeAt(0) + 1) : '①';
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${nextNumber} ${month}月${day}日`;
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

function parseStudyTime(text) {
  const s = String(text || '');
  const hourMatch = s.match(/(\d+)時間/);
  const minMatch = s.match(/(\d+)分/);
  return (hourMatch ? parseInt(hourMatch[1]) : 0) * 60 + (minMatch ? parseInt(minMatch[1]) : 0);
}

function formatStudyTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

// 目次シートのC5～C10に最初の空き行を探してコピー実施日を記載。
// D・E列: 6行目以降に記入する場合は1行上の値をコピー（前回の担当者等を引き継ぐため）。
function updateTocSheet(spreadsheet, studyTime) {
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
  if (studyTime) {
    tocSheet.getRange(targetRow, 6).setValue(studyTime);
  }
  if (targetRow > 5) {
    const prevValues = tocSheet.getRange(targetRow - 1, 4, 1, 2).getValues();
    tocSheet.getRange(targetRow, 4, 1, 2).setValues(prevValues);
  }
  log(`目次シートを更新しました（C${targetRow}にコピー日付、D・Eは1行上をコピー）`);
}

function copySpreadsheetReport() {
  log('=== copySpreadsheetReport 開始 ===');
  try {
    const config = getConfig();
    const reportConfig = config.daily_report;

    if (!reportConfig.source_folder_id) {
      log('エラー: source_folder_id が設定されていません');
      return;
    }

    const spreadsheets = getFilesInFolder(reportConfig.source_folder_id, MimeType.GOOGLE_SHEETS);
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
        const newSheetTitle = generateNewSheetTitle(latestSheet.getName());
        const newSheet = latestSheet.copyTo(spreadsheet);
        newSheet.setName(newSheetTitle);
        log(`シートを複製しました: ${newSheetTitle}`);

        // Udemy受講レポートはクリア前にS9~S13の受講時間を合算しておく
        const isUdemy = spreadsheetItem.name.includes('Udemy受講レポート');
        const studyTimeTotal = isUdemy
          ? [9, 10, 11, 12, 13].reduce((sum, row) => sum + parseStudyTime(newSheet.getRange(row, 19).getValue()), 0)
          : null;

        const cellsToClear = resolveCellsToClear(reportConfig, spreadsheetItem.name);
        if (cellsToClear && cellsToClear.length > 0) {
          log(`クリアするセル数: ${cellsToClear.length}`);
          clearCells(newSheet, cellsToClear);
          log('セルをクリアしました');
        } else {
          log('クリアするセルが設定されていません');
        }

        const studyTimeSummary = studyTimeTotal !== null ? formatStudyTime(studyTimeTotal) : null;
        if (studyTimeSummary !== null) {
          newSheet.getRange(9, 19).setValue(studyTimeSummary);
          log(`受講時間合計をS9に書き込みました: ${studyTimeSummary}`);
        }

        updateDate(newSheet, reportConfig.date_cell);
        log('日付を更新しました');

        updateTocSheet(spreadsheet, studyTimeSummary);
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
