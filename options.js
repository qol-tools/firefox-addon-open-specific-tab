const DEFAULTS = {
  blockPatterns: [],
  allowInEditable: true,
  blockWhenMeta: true,
};

const patternsEl = document.getElementById("patterns");
const allowInEditableEl = document.getElementById("allowInEditable");
const blockWhenMetaEl = document.getElementById("blockWhenMeta");
const statusEl = document.getElementById("status");

function linesToPatterns(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function patternsToLines(patterns) {
  return (patterns || []).join("\n");
}

async function loadOptions() {
  const data = await browser.storage.sync.get(DEFAULTS);
  patternsEl.value = patternsToLines(data.blockPatterns);
  allowInEditableEl.checked = Boolean(data.allowInEditable);
  blockWhenMetaEl.checked = Boolean(data.blockWhenMeta);
}

async function saveOptions() {
  const blockPatterns = linesToPatterns(patternsEl.value);
  const allowInEditable = allowInEditableEl.checked;
  const blockWhenMeta = blockWhenMetaEl.checked;

  await browser.storage.sync.set({
    blockPatterns,
    allowInEditable,
    blockWhenMeta,
  });

  statusEl.textContent = "Saved";
  setTimeout(() => {
    statusEl.textContent = "";
  }, 1200);
}

document.getElementById("save").addEventListener("click", saveOptions);
loadOptions();
