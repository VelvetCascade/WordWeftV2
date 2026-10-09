/**
 * WordWeft: READ-ONLY analytics adapter for the existing Google Sheet.
 *
 * This is a helper function, not a replacement for an existing doPost or doGet.
 * In the existing Apps Script's doGet(e), route ONLY action=admin_analytics:
 *
 *   if (e.parameter.action === 'admin_analytics')
 *     return wordweftAdminAnalytics(e);
 *
 * Configure Script Properties WORDWEFT_ADMIN_READ_TOKEN and
 * WORDWEFT_ANALYTICS_SHEET_ID. Deploy as Web App executing as owner.
 *
 * NO write, insert, update, format, delete or Mongo operations occur here.
 * The response contains aggregate counts only, never names, emails or IDs.
 */
function wordweftAdminAnalytics(e) {
  function respond(payload) {
    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty('WORDWEFT_ADMIN_READ_TOKEN');
  if (!token || !e || !e.parameter || e.parameter.token !== token) {
    return respond({ ok: false, error: 'forbidden' });
  }
  const days = Number(e.parameter.days || 30);
  if (![7, 30, 90].includes(days)) return respond({ ok: false, error: 'invalid_days' });
  const sheetId = properties.getProperty('WORDWEFT_ANALYTICS_SHEET_ID');
  if (!sheetId) return respond({ ok: false, error: 'missing_sheet_id' });
  const workbook = SpreadsheetApp.openById(sheetId);
  const cutoff = Date.now() - days * 86400000;
  const normalize = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const dayKey = date => Utilities.formatDate(date, 'Etc/UTC', 'yyyy-MM-dd');
  const categories = { pageViews: {}, devices: {}, browsers: {}, actions: {}, daily: {} };
  const eventSessions = new Set();
  const explicitSessions = new Set();
  let eventTotal = 0;
  let viewTotal = 0;
  let hasSeparatePageViews = false;
  const tabs = workbook.getSheets().map(sheet => {
    const columns = Math.min(40, sheet.getLastColumn());
    if (!columns || sheet.getLastRow() < 2) return null;
    const headers = sheet.getRange(1, 1, 1, columns).getDisplayValues()[0].map(normalize);
    function col() {
      for (const candidate of arguments) {
        const index = headers.indexOf(normalize(candidate));
        if (index >= 0) return index;
      }
      return -1;
    }
    const timestamp = col('timestamp', 'time', 'date');
    const action = col('action', 'eventaction');
    const sessionId = col('sessionid');
    const pagePath = col('pagepath', 'path', 'page');
    const device = col('devicetype', 'device');
    const browser = col('browser');
    const entryPage = col('entrypage');
    const tabName = normalize(sheet.getName());
    let kind = action >= 0 ? 'events' : (pagePath >= 0 ? 'pages' : entryPage >= 0 ? 'sessions' : 'skip');
    if (kind === 'pages') hasSeparatePageViews = true;
    return { sheet, columns, timestamp, action, sessionId, pagePath, device, browser, entryPage, kind, tabName };
  }).filter(Boolean);
  const increase = (group, name) => {
    const key = String(name || 'Unknown').trim().slice(0, 160) || 'Unknown';
    group[key] = (group[key] || 0) + 1;
  };
  const measurePage = (row, tab, d) => {
    viewTotal++;
    const path = tab.pagePath < 0 ? 'Unknown' : String(row[tab.pagePath] || 'Unknown')
      .split('?')[0].split('#')[0].slice(0, 160);
    increase(categories.pageViews, path);
    increase(categories.devices, tab.device < 0 ? 'Unknown' : row[tab.device]);
    increase(categories.browsers, tab.browser < 0 ? 'Unknown' : row[tab.browser]);
    const key = dayKey(d);
    if (!categories.daily[key]) categories.daily[key] = { day: key, pageViews: 0, events: 0 };
    categories.daily[key].pageViews++;
  };
  for (const tab of tabs) {
    // Skip huge historical scans; the newest 50k rows per tab are enough
    // for a bounded administrative read without any spreadsheet mutation.
    const last = tab.sheet.getLastRow();
    for (let end = last; end >= 2; end -= 2000) {
      const start = Math.max(2, end - 1999);
      const values = tab.sheet.getRange(start, 1, end - start + 1, tab.columns).getValues();
      for (const row of values) {
        const rawDate = tab.timestamp >= 0 ? row[tab.timestamp] : null;
        const d = rawDate instanceof Date ? rawDate : new Date(rawDate);
        if (isNaN(d.getTime()) || d.getTime() < cutoff || d.getTime() > Date.now() + 86400000) continue;
        if (tab.sessionId >= 0 && row[tab.sessionId]) {
          (tab.kind === 'sessions' ? explicitSessions : eventSessions).add(String(row[tab.sessionId]));
        }
        if (tab.kind === 'events') {
          eventTotal++;
          const action = String(row[tab.action] || 'Unknown');
          increase(categories.actions, action);
          const key = dayKey(d);
          if (!categories.daily[key]) categories.daily[key] = { day: key, pageViews: 0, events: 0 };
          categories.daily[key].events++;
          if (!hasSeparatePageViews && normalize(action) === 'pageview') measurePage(row, tab, d);
        } else if (tab.kind === 'pages') measurePage(row, tab, d);
      }
      if (start === 2 || last - start > 50000) break;
    }
  }
  function top(group, key, cap) {
    return Object.keys(group).sort((a, b) => group[b] - group[a]).slice(0, cap)
      .map(name => ({ [key]: name, count: group[name] }));
  }
  return respond({
    ok: true, periodDays: days,
    pageViews: viewTotal, sessions: explicitSessions.size || eventSessions.size,
    events: eventTotal,
    daily: Object.values(categories.daily).sort((a, b) => a.day.localeCompare(b.day)),
    topPages: top(categories.pageViews, 'path', 20),
    devices: top(categories.devices, 'name', 12),
    browsers: top(categories.browsers, 'name', 12),
    actions: top(categories.actions, 'name', 20),
  });
}
