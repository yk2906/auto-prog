function syncMarkdownToCell() {
    // --- 設定エリア ---
    const targetSpreadsheetName = '【項番2】udemy受講レポート_gas検証用'; 
    const fileId = '1UNyH2kLjwk_96Lwtld3xOkdpzcBn9rLP'; 
    
    // 今日の日付から「3月」のような文字列を作成
    const today = new Date();
    const currentMonthName = (today.getMonth() + 1) + '月'; // 実行時の月（例：3月）
  
    const syncMap = {
      '### 内容': 'D9',
      '### 学んだこと': 'B15',
      '### 今後の活用': 'B22',
      '### 活用実践の成果': 'B28',
    };
    // ----------------
  
    try {
      // 1. スプレッドシートを名前で検索
      const files = DriveApp.getFilesByName(targetSpreadsheetName);
      if (!files.hasNext()) throw new Error('スプレッドシートが見つかりません。');
      const ss = SpreadsheetApp.open(files.next());
  
      // 2. 「3月」を含むシートを自動で探す
      const allSheets = ss.getSheets();
      let targetSheet = null;
      
      for (let i = 0; i < allSheets.length; i++) {
        let name = allSheets[i].getName();
        if (name.indexOf(currentMonthName) !== -1) { // 名前に「3月」が含まれていれば
          targetSheet = allSheets[i];
          break;
        }
      }
  
      if (!targetSheet) {
        throw new Error('名前に「' + currentMonthName + '」を含むシートが見つかりません。');
      }
  
      // 3. Markdownファイルの内容を取得して解析（以前と同じ）
      const file = DriveApp.getFileById(fileId);
      const fullText = file.getBlob().getDataAsString('UTF-8');
      const lines = fullText.split(/\r?\n/);
      
      let results = {};
      Object.keys(syncMap).forEach(key => results[key] = []);
      let currentTarget = null;
  
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i]; // .trim() を外して元の空白を保持する
        let trimmedLine = line.trim(); // 判定用に、空白を除去した変数も用意
  
        // 行が見出し（#）で始まるかチェック
        if (trimmedLine.startsWith('#')) {
          if (syncMap[trimmedLine]) {
            currentTarget = trimmedLine;
          } else {
            currentTarget = null;
          }
          continue;
        }
  
        // 抽出対象の見出し配下にいる場合
        if (currentTarget) {
          // 空白を除去した状態でリスト記号から始まっているか判定
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.match(/^\d+\./)) {
            // 保存するのは「元の空白（インデント）が残っている line」
            results[currentTarget].push(line); 
          }
        }
      }
  
      // 4. 特定したシートのセルへ書き込み
      Object.keys(syncMap).forEach(heading => {
        const cell = syncMap[heading];
        const data = results[heading].join('\n');
        targetSheet.getRange(cell).setValue(data || '');
      });
  
      console.log(targetSheet.getName() + ' への同期が完了しました。');
  
    } catch (e) {
      console.error(e.toString());
    }
  }