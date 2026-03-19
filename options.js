const i18n = browser.i18n.getMessage.bind(browser.i18n);

// Локалізація сторінки
function applyI18n() {
  const t = (id, key) => {
    const el = document.getElementById(id);
    const msg = i18n(key);
    if (el && msg) el.textContent = msg;
  };
  t("title",          "optionsTitle");
  t("label-interval", "optionsIntervalLabel");
  t("hint-interval",  "optionsIntervalHint");
  t("btn-save",       "optionsSave");
  t("saved-text",     "optionsSaved");
}

// Завантаження збережених значень
async function load() {
  const { pollingInterval = 30 } = await browser.storage.local.get("pollingInterval");
  document.getElementById("interval").value = pollingInterval;
}

// Збереження
document.getElementById("save").addEventListener("click", async () => {
  let val = parseInt(document.getElementById("interval").value, 10);
  if (isNaN(val) || val < 10) val = 10;
  if (val > 300) val = 300;
  document.getElementById("interval").value = val;

  await browser.storage.local.set({ pollingInterval: val });

  const msg = document.getElementById("saved-msg");
  msg.style.display = "inline";
  setTimeout(() => { msg.style.display = "none"; }, 2000);
});

applyI18n();
load();
