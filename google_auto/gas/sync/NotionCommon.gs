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
 * タイトルが完全一致する Notion ページ（object: 'page'）の ID を検索する。
 * ObsidianのDriveApp.getFilesByName相当。対象ページはインテグレーションに共有されている必要がある。
 */
function findNotionPageIdByTitle(title) {
  const result = notionApiRequest('https://api.notion.com/v1/search', {
    method: 'post',
    payload: JSON.stringify({
      query: title,
      filter: { value: 'page', property: 'object' }
    })
  });
  const matched = (result.results || []).filter(p => getNotionPageTitleText(p) === title);
  if (matched.length === 0) {
    throw new Error('Notionページ「' + title + '」が見つかりません。インテグレーションに共有されているか確認してください。');
  }
  return matched[0].id;
}

/**
 * NotionのページURL・共有リンク・素のIDのいずれを渡されても、32桁のハイフン無しIDを抽出する。
 * 例: https://app.notion.com/p/7-3a4b5b5ab776800eb7f6e9c57bbfb233 → 3a4b5b5ab776800eb7f6e9c57bbfb233
 */
function normalizeNotionId(rawIdOrUrl) {
  const value = String(rawIdOrUrl || '').trim();
  const match = value.match(/[0-9a-fA-F]{32}/);
  if (!match) {
    throw new Error('Notion のページID/URLとして解釈できません: ' + value);
  }
  return match[0];
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
      } else if (block.has_children) {
        queue.push(block.id);
      }
    }
  }

  throw new Error('親ページ配下にNotionページ「' + title + '」が見つかりません。ページが親ページ配下にあるか、統合に共有されているか確認してください。');
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

// 括弧内が「所要時間」らしいものだけを採用（例:「（17分）」→「17分」）
function notionIsDurationSegment(inner) {
  if (!inner) return false;
  inner = inner.trim();
  if (!/\d/.test(inner)) return false;
  return /(?:分|秒|時間|:)/.test(inner);
}

function notionExtractParenTime(text) {
  if (!text) return '';
  const candidates = [];
  const re = /（([^）]+)）|\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const inner = (m[1] || m[2] || '').trim();
    if (notionIsDurationSegment(inner)) candidates.push(inner);
  }
  return candidates.length ? candidates[candidates.length - 1] : '';
}

function notionGetListIndent(l) {
  const m = l.match(/^(\s*)([-*]|\d+\.)/);
  return m ? m[1].length : -1;
}

/**
 * 行配列（Markdown風）を見出し単位で syncMap のキーに振り分ける。
 * shallowHeading を指定した場合、そのセクションだけ「一番浅いインデント」の行を
 * 1行ずつ shallowResults に積む（既存のObsidian版report2/3と同じ挙動）。
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
        const indent = notionGetListIndent(line);
        if (indent >= 0) sectionListItems.push({ indent: indent, line: line });
      }
    }
  }
  flushSection(currentTarget, sectionListItems, results, shallowResults);

  return { results: results, shallowResults: shallowResults };
}
