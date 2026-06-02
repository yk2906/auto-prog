function syncMarkdownToCellReport3() {
    // --- 設定エリア ---
    // この名前と同じ名前の「スプレッドシート」と「Markdownファイル」を探します
    const targetFileName = '【項番3】Udemy受講レポート'; 
    
    // 今日の日付から「2月」のような文字列を作成（シート検索用）
    const today = new Date();
    const currentMonthName = (today.getMonth() + 1) + '月'; 
  
    const syncMap = {
      '### 内容': 'D14',
      '### 学んだこと': 'B21',
      '### 今後の活用': 'B28',
      '### 活用実践の成果': 'B34',
    };
    // 1番目・2番目…の見出しの「一番浅いインデント」だけを同期するセル（順にE9〜E13）
    const shallowCells = ['E9', 'E10', 'E11', 'E12', 'E13', 'E14'];
    // 各 E 列と同じ行の S 列に、タイトル行の「（17分）」形式の括弧内を同期（E9↔S9, E10↔S10 …）
    const shallowTimeCells = ['S9', 'S10', 'S11', 'S12', 'S13', 'S14'];
    // ----------------
  
    try {
      // 1. スプレッドシートを名前で検索
      const ssFiles = DriveApp.getFilesByName(targetFileName);
      let ssFile = null;
      while (ssFiles.hasNext()) {
        let file = ssFiles.next();
        if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
          ssFile = file;
          break;
        }
      }
      if (!ssFile) throw new Error('スプレッドシート「' + targetFileName + '」が見つかりません。');
      const ss = SpreadsheetApp.open(ssFile);
  
      // 2. 同じ名前の Markdownファイル（.md）を名前で検索
      const mdFiles = DriveApp.getFilesByName(targetFileName + '.md');
      // もし拡張子なしで保存している場合は DriveApp.getFilesByName(targetFileName)
      let mdFile = null;
      if (mdFiles.hasNext()) {
        mdFile = mdFiles.next();
      } else {
        // 拡張子 .md が付いていない可能性も考慮して再検索
        const mdFilesNoExt = DriveApp.getFilesByName(targetFileName);
        if (mdFilesNoExt.hasNext()) {
          mdFile = mdFilesNoExt.next();
        }
      }
      
      if (!mdFile) throw new Error('Markdownファイル「' + targetFileName + '.md」が見つかりません。');
  
      // 3. 「○月」を含むシートを自動で探す
      const allSheets = ss.getSheets();
      let targetSheet = null;
      for (let i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().indexOf(currentMonthName) !== -1) {
          targetSheet = allSheets[i];
          break;
        }
      }
      if (!targetSheet) throw new Error('名前に「' + currentMonthName + '」を含むシートが見つかりません。');
  
      // 4. 特定したMarkdownファイルの内容を解析
      const fullText = mdFile.getBlob().getDataAsString('UTF-8');
      const lines = fullText.split(/\r?\n/);
      
      // リスト行のインデント（リスト記号前の空白数）を返す。リスト行でなければ -1
      function getListIndent(l) {
        const m = l.match(/^(\s*)([-*]|\d+\.)/);
        return m ? m[1].length : -1;
      }
      // 括弧内が「所要時間」らしいものだけを採用（例: 「（17分）」→「17分」）。説明文の「（明るさ変更・…）」は除外
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
      // 見出しセクションを確定: syncMap用は全行、shallow用は「### 内容」のみ一番浅い行を1行ずつ順にE9〜E14へ
      function flushSection(target, items, res, shallowOut) {
        if (!target || items.length === 0) return;
        const allLines = items.map(x => x.line);
        res[target] = (res[target] || []).concat(allLines);
        if (target === '### 内容') {
          const minIndent = Math.min.apply(null, items.map(x => x.indent));
          const shallow = items.filter(x => x.indent === minIndent).map(x => x.line);
          shallow.forEach(function(line) { shallowOut.push([line]); }); // 1行ずつ別セルに振り分け
        }
      }
      
      let results = {};
      Object.keys(syncMap).forEach(key => results[key] = []);
      let shallowResults = []; // 一番浅い行を1行ずつ並べた配列の配列（1番目→E9, 2番目→E10 …）
      let currentTarget = null;
      let sectionListItems = []; // { indent, line } の配列（現在見出し配下のリスト）
  
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let trimmedLine = line.trim();
  
        // 行が見出し（#）で始まるかチェック
        if (trimmedLine.startsWith('#')) {
          flushSection(currentTarget, sectionListItems, results, shallowResults);
          sectionListItems = [];
          if (syncMap[trimmedLine]) {
            currentTarget = trimmedLine;
          } else {
            currentTarget = null;
          }
          continue;
        }
  
        // 抽出対象の見出し配下にいる場合、リスト行ならインデント付きで収集
        if (currentTarget) {
          if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*') || trimmedLine.match(/^\d+\./)) {
            const indent = getListIndent(line);
            if (indent >= 0) sectionListItems.push({ indent: indent, line: line });
          }
        }
      }
      flushSection(currentTarget, sectionListItems, results, shallowResults);
  
      // 5. 書き込み（syncMap: 全インデントそのまま / shallowCells: 1行目→E9, 2行目→E10…）
      Object.keys(syncMap).forEach(heading => {
        const cell = syncMap[heading];
        const data = results[heading].join('\n');
        targetSheet.getRange(cell).setValue(data || '');
      });
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

      // S9~S13の受講時間を合算してX9と目次シートのF列に書き込む
      const totalMinutes = collectedTimes.reduce((sum, t) => sum + parseStudyTime(t), 0);
      const formattedTotal = formatStudyTime(totalMinutes);
      targetSheet.getRange('X9').setValue(formattedTotal);
      writeTocStudyTime(ss, formattedTotal);

      console.log('同期完了: ' + targetFileName + ' -> ' + targetSheet.getName());
  
    } catch (e) {
      console.error(e.toString());
    }
  }