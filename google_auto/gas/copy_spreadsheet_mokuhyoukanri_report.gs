/**
 * 最新のシートをコピーし、特定のセルをクリアして新しいシートを作成します。
 * カレンダーから「コーチ面談」の予定を取得し、その日付をシート名にします。
 */
function copyLatestSheetAndClearCells() {
  const spreadsheetId = "1dHSv-X7yCVGpIRL4gRH_Hj-TDjG4M-xS6Xo-SLgecto";
  const calendarId = "yk050696@gmail.com";
  const ss = SpreadsheetApp.openById(spreadsheetId);
  
  // コーチ面談の日付を取得
  const coachingDates = getCoachingDates(calendarId);
  if (coachingDates.length === 0) {
    Logger.log("今月のコーチ面談の予定が見つかりませんでした。");
    return;
  }

  // 最新のシートを取得（一番右のシート）
  const sheets = ss.getSheets();
  const latestSheet = sheets[sheets.length - 1];
  const latestSheetName = latestSheet.getName();
  Logger.log("最新のシート '" + latestSheetName + "' をコピー中...");

  // 新しいシート名を生成 (YYYYMMDD)
  const newSheetName = coachingDates[0].replace(/-/g, "");
  
  // シートをコピー
  const newSheet = latestSheet.copyTo(ss).setName(newSheetName);
  
  // 新しいシートを一番右に移動
  ss.setActiveSheet(newSheet);
  ss.moveActiveSheet(ss.getSheets().length);

  // タブの色を設定 (赤: #ff0000, 白: #ffffff)
  newSheet.setTabColor("ff0000");
  latestSheet.setTabColor("ffffff");

  // 特定のセルを空白にする (1始まり)
  const columnToClear = 39; // AM列
  const rowsToClear = [22, 31, 40, 50, 60];
  rowsToClear.forEach(row => {
    newSheet.getRange(row, columnToClear).clearContent();
  });

  // 今日の日付を 8行目 5列目 (E8) に入力
  const today = new Date();
  // Pythonの %-m/%-d/%Y に合わせる (例: 4/5/2026)
  const formattedDate = Utilities.formatDate(today, Session.getScriptTimeZone(), "M/d/yyyy");
  newSheet.getRange(8, 5).setValue(formattedDate);

  Logger.log("新しいシート '" + newSheetName + "' を作成し、指定されたセルを更新しました。");
}

/**
 * 指定されたカレンダーから今月の「コーチ面談」の予定日を取得します。
 */
function getCoachingDates(calendarId) {
  const calendar = CalendarApp.getCalendarById(calendarId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const events = calendar.getEvents(startOfMonth, endOfMonth);
  const coachingDates = [];

  events.forEach(event => {
    if (event.getTitle().includes("コーチ面談")) {
      const date = Utilities.formatDate(event.getStartTime(), Session.getScriptTimeZone(), "yyyy-MM-dd");
      coachingDates.push(date);
    }
  });

  // 日付順にソート
  coachingDates.sort();

  return coachingDates;
}
