/**
 * Notion 連携の共通処理
 *
 * 利用前に GAS エディタの「プロジェクトの設定」→「スクリプト プロパティ」で
 * NOTION_API_TOKEN にインテグレーションのシークレットを設定してください。
 * また、同期対象の Notion ページをそのインテグレーションに共有（Connect）しておく必要があります。
 */

const NOTION_API_VERSION = '2022-06-28';

function getNotionToken() {
  const token = PropertiesService.getScriptProperties().getProperty('NOTION_API_TOKEN');
  if (!token) {
    throw new Error('スクリプトプロパティ「NOTION_API_TOKEN」が未設定です。GASエディタの「プロジェクトの設定」→「スクリプトプロパティ」から設定してください。');
  }
  return token;
}

function notionApiRequest(url, options) {
  const token = getNotionToken();
  const requestOptions = Object.assign({
    method: 'get',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Notion-Version': NOTION_API_VERSION,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  }, options || {});
  const response = UrlFetchApp.fetch(url, requestOptions);
  const code = response.getResponseCode();
  const body = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Notion API エラー (' + code + '): ' + body);
  }
  return JSON.parse(body);
}

function getNotionPageTitleText(page) {
  const props = page.properties || {};
  const titleKey = Object.keys(props).find(k => props[k].type === 'title');
  if (!titleKey) return '';
  return getRichTextPlain(props[titleKey].title);
}

/**
 * NotionのページURL・共有リンク・素のID（ハイフン有無どちらも）を渡されても、IDを抽出する。
 * - Notion API が返す block.id はハイフン付きUUID形式（例: 3a4b5b5a-b776-800e-b7f6-e9c57bbfb233）
 * - ページURLに含まれるIDはハイフン無しの32桁（例: .../p/7-3a4b5b5ab776800eb7f6e9c57bbfb233）
 * の両方に対応する。
 */
function normalizeNotionId(rawIdOrUrl) {
  const value = String(rawIdOrUrl || '').trim();
  const dashedMatch = value.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (dashedMatch) {
    return dashedMatch[0];
  }
  const plainMatch = value.match(/[0-9a-fA-F]{32}/);
  if (!plainMatch) {
    throw new Error('Notion のページID/URLとして解釈できません: ' + value);
  }
  return plainMatch[0];
}

/**
 * 指定した親ページ（URL/共有リンク/IDのいずれか）配下を辿り、
 * タイトルが完全一致する子ページ（child_page ブロック）のIDを探す。
 * 親ページさえインテグレーションに共有されていれば、配下のページは個別共有が不要（Notionの権限継承）。
 * トグルや区切りなど child_page 以外の入れ子ブロックも辿るため、階層が深くても見つけられる。
 */
function findNotionPageIdUnderParent(rootPageIdOrUrl, title) {
  const rootId = normalizeNotionId(rootPageIdOrUrl);
  const visited = {};
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited[currentId]) continue;
    visited[currentId] = true;

    const children = fetchNotionBlockChildren(currentId);
    for (let i = 0; i < children.length; i++) {
      const block = children[i];
      if (block.type === 'child_page') {
        if (block.child_page.title === title) {
          return block.id;
        }
        queue.push(block.id);
      } else if (block.type === 'child_database') {
        // テーブル/ボード表示のデータベースの場合、行（ページ）を問い合わせて探す
        const rows = queryNotionDatabase(block.id);
        for (let j = 0; j < rows.length; j++) {
          const row = rows[j];
          if (getNotionPageTitleText(row) === title) {
            return row.id;
          }
          queue.push(row.id);
        }
      } else if (block.has_children) {
        queue.push(block.id);
      }
    }
  }

  throw new Error('親ページ配下にNotionページ「' + title + '」が見つかりません。ページが親ページ配下にあるか、統合に共有されているか確認してください。');
}

function queryNotionDatabase(databaseId) {
  let rows = [];
  let cursor = null;
  do {
    const payload = cursor ? { start_cursor: cursor } : {};
    const result = notionApiRequest('https://api.notion.com/v1/databases/' + databaseId + '/query', {
      method: 'post',
      payload: JSON.stringify(payload)
    });
    rows = rows.concat(result.results || []);
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);
  return rows;
}

/**
 * デバッグ用: 指定した親ページ配下のブロックツリー（タイプ・タイトル・ID）を実行ログに出力する。
 * 「タイトルが見つかりません」というエラーが出たとき、実際の構造・正確なタイトル文字列を確認するために使う。
 */
function debugListNotionTree(rootPageIdOrUrl, maxDepth) {
  const rootId = normalizeNotionId(rootPageIdOrUrl);
  logNotionTree_(rootId, 0, maxDepth || 4);
}

function logNotionTree_(blockId, depth, maxDepth) {
  if (depth > maxDepth) return;
  const indent = '  '.repeat(depth);
  const children = fetchNotionBlockChildren(blockId);
  children.forEach(function(block) {
    if (block.type === 'child_page') {
      Logger.log(indent + '- [child_page] 「' + block.child_page.title + '」 id=' + block.id);
      logNotionTree_(block.id, depth + 1, maxDepth);
    } else if (block.type === 'child_database') {
      Logger.log(indent + '- [child_database] 「' + (block.child_database.title || '(無題)') + '」 id=' + block.id);
      const rows = queryNotionDatabase(block.id);
      rows.forEach(function(row) {
        Logger.log(indent + '    - [database_row] 「' + getNotionPageTitleText(row) + '」 id=' + row.id);
      });
    } else {
      let label = block.type;
      if (block[block.type] && block[block.type].rich_text) {
        label += ': ' + getRichTextPlain(block[block.type].rich_text);
      }
      Logger.log(indent + '- [' + label + '] id=' + block.id);
      if (block.has_children) {
        logNotionTree_(block.id, depth + 1, maxDepth);
      }
    }
  });
}

function getRichTextPlain(richTextArr) {
  return (richTextArr || []).map(t => t.plain_text).join('');
}

function fetchNotionBlockChildren(blockId) {
  let blocks = [];
  let cursor = null;
  do {
    let url = 'https://api.notion.com/v1/blocks/' + blockId + '/children?page_size=100';
    if (cursor) url += '&start_cursor=' + encodeURIComponent(cursor);
    const result = notionApiRequest(url);
    blocks = blocks.concat(result.results || []);
    cursor = result.has_more ? result.next_cursor : null;
  } while (cursor);
  return blocks;
}

const NOTION_HEADING_PREFIX = {
  heading_1: '# ',
  heading_2: '## ',
  heading_3: '### '
};
const NOTION_LIST_TYPES = ['bulleted_list_item', 'numbered_list_item', 'to_do'];

/**
 * Notionのブロックツリーを、既存のMarkdownパーサーがそのまま扱える「行配列」に変換する。
 * 見出し(#, ##, ###)とリスト系ブロック（ネストはインデントで表現）だけを対象とする。
 */
function notionBlockToLines(block, depth, lines) {
  const type = block.type;
  const indent = '  '.repeat(depth);

  if (NOTION_HEADING_PREFIX[type]) {
    lines.push(NOTION_HEADING_PREFIX[type] + getRichTextPlain(block[type].rich_text));
  } else if (NOTION_LIST_TYPES.indexOf(type) !== -1) {
    const marker = type === 'numbered_list_item' ? '1. ' : '- ';
    lines.push(indent + marker + getRichTextPlain(block[type].rich_text));
  } else if (type === 'paragraph') {
    const text = getRichTextPlain(block.paragraph.rich_text);
    if (text) lines.push(indent + text);
  }
  // toggle・画像・区切り線などその他のブロック種別は同期対象外（無視）

  if (block.has_children) {
    const nextDepth = NOTION_LIST_TYPES.indexOf(type) !== -1 ? depth + 1 : depth;
    const children = fetchNotionBlockChildren(block.id);
    children.forEach(child => notionBlockToLines(child, nextDepth, lines));
  }
}

function fetchNotionPageAsLines(pageId) {
  const topBlocks = fetchNotionBlockChildren(pageId);
  const lines = [];
  topBlocks.forEach(block => notionBlockToLines(block, 0, lines));
  return lines;
}

// 見出し単位での抽出（buildSyncResultsFromLines）、括弧内所要時間の抽出（extractParenTime）は
// Obsidian版と共通のため sync/SyncCommon.gs に集約されている。
