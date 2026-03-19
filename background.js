// ================================================================
// Сповіщення про нові листи v2.2
// ================================================================

const i18n = browser.i18n.getMessage.bind(browser.i18n);

const EXCLUDED_FOLDER_TYPES = new Set(["drafts", "sent", "trash", "junk", "archive"]);

const MAX_SEEN = 5000;
const seen = new Set();

function addToSeen(id) {
  if (seen.size >= MAX_SEEN) {
    const first = seen.values().next().value;
    seen.delete(first);
  }
  seen.add(id);
}

const notifMap = new Map();
const folderCache = new Map();
const pendingByFolder = new Map();
let groupTimer = null;
const GROUP_DELAY_MS = 1500;

// ================================================================
// Polling — динамічний інтервал із налаштувань
// ================================================================
let pollingTimer = null;

async function getPollingInterval() {
  const { pollingInterval = 30 } = await browser.storage.local.get("pollingInterval");
  return Math.max(10, Math.min(300, pollingInterval)) * 1000;
}

async function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);
  const ms = await getPollingInterval();
  pollingTimer = setInterval(checkUnread, ms);
  console.log(i18n("pollingRestarted"), ms / 1000, "сек");
}

// Слухаємо зміни налаштувань — одразу перезапускаємо polling
browser.storage.onChanged.addListener((changes) => {
  if (changes.pollingInterval) startPolling();
});

// ================================================================
// Кешований запит папки
// ================================================================
async function getFolderObj(msgFolder) {
  if (!msgFolder) return null;

  const isObj = typeof msgFolder === "object";
  const cacheKey = isObj
    ? `${msgFolder.accountId}:${msgFolder.path}`
    : `id:${msgFolder}`;

  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey);

  try {
    const query = isObj
      ? { accountId: msgFolder.accountId, path: msgFolder.path }
      : { folderId: msgFolder };
    const results = await browser.folders.query(query);
    const folder = results[0] || null;
    if (folder) folderCache.set(cacheKey, folder);
    return folder;
  } catch (e) {
    console.error(i18n("getFolderFailed"), e);
    return null;
  }
}

// ================================================================
// Групове сповіщення
// ================================================================
function flushNotifications() {
  groupTimer = null;
  for (const [folderName, items] of pendingByFolder.entries()) {
    if (items.length === 1) {
      const { msgId, author, subject, folderObj } = items[0];
      const notifId = `mail-${msgId}-${Date.now()}`;
      notifMap.set(notifId, { msgId, folderObj });
      browser.notifications.create(notifId, {
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/icon.png"),
        title: `${i18n("notifTitleSingle")} "${folderName}"`,
        message: `${author}\n${subject}`,
      });
      console.log(`${i18n("notifSingle")} ${msgId} → ${author} — ${subject}`);
    } else {
      const notifId = `mail-group-${folderName}-${Date.now()}`;
      const { folderObj } = items[0];
      notifMap.set(notifId, { msgId: items[0].msgId, folderObj });
      const preview = items.slice(0, 3).map((it) => `• ${it.author}`).join("\n");
      const more = items.length > 3 ? `\n${i18n("notifMoreEmails")} ${items.length - 3}` : "";
      browser.notifications.create(notifId, {
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/icon.png"),
        title: `${items.length} ${i18n("notifTitleGroup")} "${folderName}"`,
        message: preview + more,
      });
      console.log(`${i18n("notifGroup")} ${items.length} ${i18n("notifGroupIn")} "${folderName}"`);
    }
  }
  pendingByFolder.clear();
}

function scheduleNotification(msgId, author, subject, folderObj) {
  const key = folderObj.name;
  if (!pendingByFolder.has(key)) pendingByFolder.set(key, []);
  pendingByFolder.get(key).push({ msgId, author, subject, folderObj });
  if (groupTimer) clearTimeout(groupTimer);
  groupTimer = setTimeout(flushNotifications, GROUP_DELAY_MS);
}

// ================================================================
// Обробка одного повідомлення
// ================================================================
async function processMessage(msg) {
  if (seen.has(msg.id)) return;
  addToSeen(msg.id);

  const folderObj = await getFolderObj(msg.folder);
  if (!folderObj) return;

  if (EXCLUDED_FOLDER_TYPES.has(folderObj.type)) {
    console.log(`${i18n("skippedEmail")} ${msg.id} ${i18n("skippedEmailIn")} "${folderObj.name}" (${i18n("skippedEmailType")} ${folderObj.type})`);
    return;
  }

  const author = msg.author || i18n("unknownAuthor");
  const subject = msg.subject || i18n("noSubject");
  scheduleNotification(msg.id, author, subject, folderObj);
}

// ================================================================
// Ініціалізація seen (з пагінацією)
// ================================================================
async function initializeSeen() {
  try {
    let result = await browser.messages.query({ unread: true });
    for (const m of result.messages) seen.add(m.id);
    while (result.id) {
      result = await browser.messages.continueList(result.id);
      for (const m of result.messages) seen.add(m.id);
    }
    console.log(i18n("seenInitialized"), seen.size, i18n("seenEmails"));
  } catch (e) {
    console.error(i18n("initSeenFailed"), e);
  }
}

// ================================================================
// Polling
// ================================================================
async function checkUnread() {
  try {
    let result = await browser.messages.query({ unread: true });
    const allMessages = [...result.messages];
    while (result.id) {
      result = await browser.messages.continueList(result.id);
      allMessages.push(...result.messages);
    }
    for (const msg of allMessages) {
      await processMessage(msg);
    }
  } catch (e) {
    console.error(i18n("checkUnreadFailed"), e);
  }
}

// ================================================================
// Клік по сповіщенню
// ================================================================
browser.notifications.onClicked.addListener(async (notificationId) => {
  const entry = notifMap.get(notificationId);
  if (!entry) return;
  notifMap.delete(notificationId);
  const { msgId, folderObj } = entry;

  try {
    const windows = await browser.windows.getAll({ populate: false });
    const mainWindow = windows.find((w) => w.type === "normal");
    if (mainWindow) {
      await browser.windows.update(mainWindow.id, { focused: true, state: "normal" });
    }
  } catch (e) {
    console.warn(i18n("focusWindowFailed"), e);
  }

  try {
    const tabs = await browser.mailTabs.query({});
    let mailTab = tabs.find((t) => !!t.displayedFolder);
    if (mailTab) {
      await browser.mailTabs.update(mailTab.id, { displayedFolder: folderObj });
    } else {
      mailTab = await browser.mailTabs.create({ displayedFolder: folderObj });
    }
    await browser.mailTabs.setSelectedMessages(mailTab.id, [msgId]);
    await browser.notifications.clear(notificationId);
  } catch (err) {
    console.error(i18n("openEmailFailed"), err);
  }
});

browser.notifications.onClosed.addListener((notificationId) => {
  notifMap.delete(notificationId);
});

// ================================================================
// Підписка на нові листи (миттєва реакція для Вхідних)
// ================================================================
if (browser.messages.onNewMailReceived) {
  browser.messages.onNewMailReceived.addListener(async (folder, messages) => {
    if (EXCLUDED_FOLDER_TYPES.has(folder.type)) return;
    for (const msg of messages) {
      await processMessage(msg);
    }
  });
  console.log(i18n("subscribedEvent"));
} else {
  console.warn(i18n("noEventSupport"));
}

// ================================================================
// Старт
// ================================================================
async function startup() {
  await initializeSeen();
  setTimeout(checkUnread, 500);
  await startPolling();
}

browser.runtime.onInstalled.addListener(startup);
browser.runtime.onStartup.addListener(startup);

console.log(i18n("bgStarted"), browser.runtime.id);
