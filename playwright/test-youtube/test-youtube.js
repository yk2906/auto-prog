const { chromium } = require('playwright');

(async () => {
  // ブラウザを起動（ヘッドレスモードをオフにすると実際の動作が見えますが、ここではヘッドレスで実行します）
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('YouTubeを開いています...');
  await page.goto('https://www.youtube.com');

  // タイトルを取得して表示
  const title = await page.title();
  console.log('ページタイトル:', title);

  // スクリーンショットを保存（動作確認用）
  await page.screenshot({ path: 'youtube-screenshot.png' });
  console.log('スクリーンショットを保存しました: youtube-screenshot.png');

  await browser.close();
})();
