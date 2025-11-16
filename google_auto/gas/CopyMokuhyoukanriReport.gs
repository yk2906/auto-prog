/**
 * Googleカレンダーから今月のコーチ面談の日付を取得
 */
function getCoachingDates(calendarId) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  const calendar = CalendarApp.getCalendarById(calendarId);
  const events = calendar.getEvents(startOfMonth, endOfMonth);
  
  const coachingDates = [];
  events.forEach(function(event) {
    if (event.getTitle().indexOf('コーチ面談') !== -1) {
      const startDate = event.getStartTime();
      const dateString = Utilities.formatDate(startDate, Session.getScriptTimeZone(), 'yyyyMMdd');
      coachingDates.push(dateString);
    }
  });
  
  if (coachingDates.length === 0) {
    log('今月のコーチ面談の予定が見つかりませんでした');
  }
  
  return coachingDates;
}

/**
 * メイン処理: 目標管理レポートの自動生成
 */
function copyMokuhyoukanriReport() {
  try {
    const config = getConfig();
    const reportConfig = config.goal_management_report;
    
    if (!reportConfig.source_folder_id || !reportConfig.calendar_id) {
      log('エラー: source_folder_id または calendar_id が設定されていません');
      return;
    }
    
    // コーチ面談の日付を取得
    const coachingDates = getCoachingDates(reportConfig.calendar_id);
    if (coachingDates.length === 0) {
      return;
    }
    
    // 最新のスプレッドシートを取得
    const latestFile = getLatestFileInFolder(
      reportConfig.source_folder_id,
      MimeType.GOOGLE_SHEETS
    );
    
    if (!latestFile) {
      log('最新のスプレッドシートが見つかりませんでした');
      return;
    }
    
    const spreadsheet = SpreadsheetApp.openById(latestFile.getId());
    const sheets = spreadsheet.getSheets();
    
    if (sheets.length === 0) {
      log('スプレッドシートにシートがありません');
      return;
    }
    
    // 最新のシートを取得
    const latestSheet = sheets[sheets.length - 1];
    const newSheetTitle = coachingDates[0]; // 最初のコーチ面談の日付
    
    // シートを複製
    const newSheet = latestSheet.copyTo(spreadsheet);
    newSheet.setName(newSheetTitle);
    
    // 新しいシートのタブを赤色に
    newSheet.setTabColor('#ff0000');
    
    // 古いシートのタブを白色に
    latestSheet.setTabColor('#ffffff');
    
    // セルをクリア
    if (reportConfig.cells_to_clear) {
      clearCells(newSheet, reportConfig.cells_to_clear);
    }
    
    // 日付を更新
    if (reportConfig.date_cell) {
      updateDate(newSheet, reportConfig.date_cell);
    }
    
    log('新しいシート \'' + newSheetTitle + '\' を作成しました');
    
  } catch (error) {
    log('エラーが発生しました: ' + error.toString());
  }
}

