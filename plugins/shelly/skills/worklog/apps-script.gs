// One-time setup for the /worklog webhook — do this in YOUR duplicated
// Technology Development Tracker (not Cedric's training sheet):
//
//   1. Open the duplicated spreadsheet → Extensions → Apps Script.
//   2. Replace the default code with this file. Change SECRET to a random string.
//   3. Deploy → New deployment → type "Web app" →
//      Execute as: Me · Who has access: Anyone → Deploy.
//   4. Copy the web-app URL. In ~/.claude/private/worklog-webhook.txt put the
//      URL on line 1 and the same SECRET on line 2.
//
// "Anyone" is required so curl can reach it without OAuth; the secret is what
// gates writes. Anyone re-deploying after editing must create a NEW deployment
// version or the old code keeps running.

const SECRET = 'CHANGE_ME_TO_A_RANDOM_STRING';

// A web app answers a POST with a 302 to script.googleusercontent.com, and curl
// -L follows that hop as a GET. Without a doGet, Google serves its own error
// page ("Cannot find script function: doGet") — which arrives AFTER doPost has
// already appended the row. That is the worst possible failure: the caller sees
// an error, the write succeeded, and a retry silently duplicates the row.
// Broke /worklog on 2026-07-30 and again on 2026-08-13.
function doGet() {
  return ContentService.createTextOutput('ok (worklog webhook alive; POST to append)');
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      return ContentService.createTextOutput('forbidden');
    }
    const sheetName = body.sheet || 'Work Log';
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput('no such sheet: ' + sheetName);
    }
    if (!Array.isArray(body.row) || body.row.length === 0) {
      return ContentService.createTextOutput('row must be a non-empty array');
    }
    // Makes retries safe. When delivery is ambiguous — the 2026-08-13 failure
    // above, a timeout, a dropped connection — the caller cannot tell whether
    // the row landed, so the only safe move today is to NOT retry and chase it
    // by hand. Comparing against recent rows turns a retry into a no-op instead.
    if (isDuplicateOfRecentRow(sheet, body.row)) {
      return ContentService.createTextOutput('duplicate — already logged, skipped');
    }
    sheet.appendRow(body.row);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  }
}

// True when `row` already appears in the last few rows of the sheet. Scoped to a
// small window so a legitimately repeated task months later still appends.
function isDuplicateOfRecentRow(sheet, row) {
  const WINDOW = 10;
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return false;
  const first = Math.max(1, lastRow - WINDOW + 1);
  const width = Math.max(sheet.getLastColumn(), row.length);
  const recent = sheet.getRange(first, 1, lastRow - first + 1, width).getDisplayValues();
  const incoming = row.map(function (cell) { return String(cell == null ? '' : cell).trim(); });
  return recent.some(function (existing) {
    return incoming.every(function (cell, i) {
      return cell === String(existing[i] == null ? '' : existing[i]).trim();
    });
  });
}
