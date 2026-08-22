const MODULE_ID = "cypher-2-toolkit";
const PANEL_ID = "c2t-cypher-opportunities";
const LAUNCHER_CLASS = "c2t-opportunity-launcher";
const STATE_SETTING = "cypherOpportunityState";
const ENABLED_SETTING = "cypherOpportunityAssistant";
const HISTORY_LIMIT = 18;
const HAND_SIZE = 3;

const CONTEXTS = ["combat", "defense", "social", "stealth", "exploration", "chase", "recovery", "knowledge", "survival", "dramatic"];

const CATALOG_ROWS = [
  ["Amazing effort", 254, "dramatic", "combat"], ["Berserk", 254, "combat", "dramatic"],
  ["Best tool", 254, "exploration", "knowledge"], ["Bleed", 254, "combat"],
  ["Burst of speed", 254, "chase", "combat"], ["Calm sniper", 254, "combat", "stealth"],
  ["Collateral damage", 254, "combat", "dramatic"], ["Combat enhancer", 254, "combat"],
  ["Counterattack", 254, "combat", "defense"], ["Crying jag", 254, "social", "dramatic"],
  ["Deflect wound", 255, "defense", "recovery"], ["Disarm", 255, "combat", "defense"],
  ["Disease recovery", 255, "recovery", "survival"], ["Double attack", 255, "combat"],
  ["Equipment cache", 255, "exploration", "dramatic"], ["Extended breath", 255, "survival", "exploration"],
  ["Feat of strength", 255, "combat", "exploration"], ["Focus fire", 255, "combat"],
  ["Fortuitous moment", 256, "dramatic", "social"], ["Fortunate fluke", 256, "dramatic"],
  ["Get to the point", 256, "social", "knowledge"], ["Hamper foe", 256, "combat", "defense"],
  ["Horizon observer", 256, "exploration", "knowledge"], ["Ignite", 256, "combat", "survival"],
  ["Improved acrobatics", 256, "chase", "exploration"], ["Improved blocking", 256, "defense", "combat"],
  ["Improved charm", 256, "social"], ["Improved climbing", 256, "exploration", "chase"],
  ["Improved deception", 256, "social", "stealth"], ["Improved dexterity", 257, "chase", "exploration"],
  ["Improved disguising", 257, "stealth", "social"], ["Improved dodging", 257, "defense", "chase"],
  ["Improved driving", 257, "chase", "exploration"], ["Improved escaping", 257, "chase", "defense"],
  ["Improved healing", 258, "recovery", "knowledge"], ["Improved initiative", 258, "combat", "dramatic"],
  ["Improved intimidation", 258, "social", "combat"], ["Improved jumping", 258, "chase", "exploration"],
  ["Improved lockpicking", 258, "stealth", "exploration"], ["Improved perception", 258, "knowledge", "exploration"],
  ["Improved pickpocketing", 258, "stealth", "social"], ["Improved repairing", 258, "knowledge", "exploration"],
  ["Improved sneaking", 259, "stealth"], ["Improved swimming", 259, "survival", "exploration"],
  ["Improvised range", 259, "combat", "exploration"], ["Improvised shelter", 259, "survival", "exploration"],
  ["Improvised shield", 259, "defense", "survival"], ["Inhibit foe", 259, "combat", "defense"],
  ["Inspire aggression", 259, "social", "combat"], ["Intellect replenisher", 260, "recovery", "knowledge"],
  ["Knockout", 260, "combat", "stealth"], ["Lucid moment", 260, "knowledge", "dramatic"],
  ["Maintain temperature", 260, "survival", "exploration"], ["Make passage", 260, "exploration", "dramatic"],
  ["Master password", 260, "knowledge", "stealth"], ["Mental concentration", 260, "knowledge", "dramatic"],
  ["Might replenisher", 261, "recovery", "combat"], ["Motivated aid", 261, "social", "dramatic"],
  ["Near-death experience", 261, "recovery", "dramatic"], ["Noncombat enhancer", 261, "exploration", "social", "knowledge"],
  ["Not me", 261, "defense", "social", "dramatic"], ["Offensive object break", 261, "combat", "exploration"],
  ["Pacify beast", 261, "social", "survival"], ["Perfect moment", 261, "dramatic", "combat"],
  ["Pidgin", 262, "social", "exploration"], ["Poison recovery", 262, "recovery", "survival"],
  ["Press the advantage", 262, "combat", "dramatic"], ["Push", 262, "combat", "defense"],
  ["Quick disable", 262, "stealth", "knowledge"], ["Quick feint", 262, "combat", "social"],
  ["Quick funds", 262, "social", "dramatic"], ["Remembering", 263, "knowledge", "dramatic"],
  ["Repel", 263, "defense", "combat"], ["Restrain", 263, "combat", "defense"],
  ["Reveal unseen", 263, "knowledge", "exploration"], ["Sated", 263, "survival", "recovery"],
  ["Secret", 263, "knowledge", "social"], ["Silent message", 263, "stealth", "social"],
  ["Slippery", 263, "chase", "defense"], ["Snap alert", 264, "defense", "knowledge"],
  ["Speed replenisher", 264, "recovery", "chase"], ["Take one for the team", 264, "defense", "dramatic"],
  ["Teach trick", 264, "social", "knowledge"], ["Traumatic amnesia", 264, "social", "dramatic"],
  ["Wound recovery", 264, "recovery", "survival"], ["Wounded desperation", 264, "combat", "dramatic", "recovery"]
];

const CATALOG = CATALOG_ROWS.map(([name, page, ...tags]) => ({ name, page, tags }));
let cypherSources = new Map();
let hand = [];
let panelOpen = false;
let state = { contexts: ["dramatic"], saved: [], history: [], collapsed: false, left: null, top: 120 };

const t = (key, data = {}) => game.i18n.format(`C2T.Opportunities.${key}`, data);
const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const catalogByName = new Map(CATALOG.map(entry => [normalize(entry.name), entry]));

function loadState() {
  try {
    const raw = JSON.parse(game.settings.get(MODULE_ID, STATE_SETTING) || "{}");
    state = {
      contexts: Array.isArray(raw.contexts) && raw.contexts.length ? raw.contexts.filter(context => CONTEXTS.includes(context)) : ["dramatic"],
      saved: Array.isArray(raw.saved) ? raw.saved.filter(name => catalogByName.has(normalize(name))).slice(0, 20) : [],
      history: Array.isArray(raw.history) ? raw.history.filter(name => catalogByName.has(normalize(name))).slice(-HISTORY_LIMIT) : [],
      collapsed: Boolean(raw.collapsed),
      left: raw.left !== null && raw.left !== undefined && Number.isFinite(Number(raw.left)) ? Number(raw.left) : null,
      top: Number.isFinite(Number(raw.top)) ? Number(raw.top) : 120
    };
  } catch (_) {}
}

async function saveState() {
  await game.settings.set(MODULE_ID, STATE_SETTING, JSON.stringify(state));
}

function sourceFromWorldItem(item) {
  return { name: item.name, img: item.img, uuid: item.uuid, type: item.type, description: item.system?.description ?? item.system?.basic?.description ?? "", explanation: item.getFlag?.(MODULE_ID, "explanation") ?? "", explanationPtBr: item.getFlag?.(MODULE_ID, "explanationPtBr") ?? "", source: "world", document: item };
}

async function buildSourceIndex() {
  const found = new Map();
  for (const item of game.items ?? []) {
    const key = normalize(item.name);
    if (catalogByName.has(key) && !found.has(key)) found.set(key, sourceFromWorldItem(item));
  }
  for (const pack of game.packs ?? []) {
    if (pack.documentName !== "Item") continue;
    try {
      const index = await pack.getIndex({ fields: ["name", "type", "img", "system.description", "system.basic.description", `flags.${MODULE_ID}.explanation`, `flags.${MODULE_ID}.explanationPtBr`] });
      for (const entry of index) {
        const key = normalize(entry.name);
        if (!catalogByName.has(key) || found.has(key)) continue;
        found.set(key, { name: entry.name, img: entry.img, uuid: entry.uuid, type: entry.type, description: entry.system?.description ?? entry.system?.basic?.description ?? "", explanation: foundry.utils.getProperty(entry, `flags.${MODULE_ID}.explanation`) ?? "", explanationPtBr: foundry.utils.getProperty(entry, `flags.${MODULE_ID}.explanationPtBr`) ?? "", source: pack.metadata?.label ?? pack.title ?? pack.collection, pack: pack.collection, id: entry._id ?? entry.id });
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not index Item pack ${pack.collection}`, error);
    }
  }
  cypherSources = found;
  return found;
}

async function resolveSource(entry) {
  const source = cypherSources.get(normalize(entry.name));
  if (!source) return null;
  if (source.document) return source.document;
  if (source.uuid) {
    try { return await fromUuid(source.uuid); } catch (_) {}
  }
  if (source.pack && source.id) return game.packs.get(source.pack)?.getDocument(source.id) ?? null;
  return null;
}

function contextLabel(context) {
  return t(`Context.${context[0].toUpperCase() + context.slice(1)}`);
}

function promptFor(entry) {
  const source = cypherSources.get(normalize(entry.name));
  const explanation = source?.explanationPtBr || source?.explanation;
  if (explanation) return escapeHtml(explanation);
  const active = state.contexts.find(context => entry.tags.includes(context)) ?? entry.tags[0] ?? "dramatic";
  return t(`Prompt.${active[0].toUpperCase() + active.slice(1)}`, { cypher: entry.name });
}

function weightedSuggestions(count = HAND_SIZE, excluded = []) {
  const blocked = new Set([...state.history, ...excluded].map(normalize));
  const saved = new Set(state.saved.map(normalize));
  let pool = CATALOG.filter(entry => !blocked.has(normalize(entry.name)) && !saved.has(normalize(entry.name)));
  if (pool.length < count) pool = CATALOG.filter(entry => !excluded.map(normalize).includes(normalize(entry.name)) && !saved.has(normalize(entry.name)));
  const selected = [];
  while (pool.length && selected.length < count) {
    const weighted = pool.map(entry => ({ entry, weight: 1 + entry.tags.filter(tag => state.contexts.includes(tag)).length * 6 + (cypherSources.has(normalize(entry.name)) ? 3 : 0) }));
    const total = weighted.reduce((sum, choice) => sum + choice.weight, 0);
    let roll = Math.random() * total;
    const picked = weighted.find(choice => (roll -= choice.weight) <= 0)?.entry ?? weighted.at(-1).entry;
    selected.push(picked);
    pool = pool.filter(entry => entry !== picked);
  }
  return selected;
}

function addHistory(names) {
  for (const name of names) {
    state.history = state.history.filter(existing => normalize(existing) !== normalize(name));
    state.history.push(name);
  }
  state.history = state.history.slice(-HISTORY_LIMIT);
}

function drawNewHand({ rememberCurrent = true } = {}) {
  if (rememberCurrent) addHistory(hand.map(entry => entry.name));
  hand = weightedSuggestions(HAND_SIZE);
  saveState();
  renderPanel();
}

function replaceSuggestion(name) {
  addHistory([name]);
  const index = hand.findIndex(entry => normalize(entry.name) === normalize(name));
  if (index < 0) return;
  const replacement = weightedSuggestions(1, hand.map(entry => entry.name))[0];
  if (replacement) hand[index] = replacement;
  saveState();
  renderPanel();
}

function toggleSaved(name) {
  const existing = state.saved.findIndex(saved => normalize(saved) === normalize(name));
  if (existing >= 0) state.saved.splice(existing, 1);
  else state.saved.unshift(name);
  state.saved = state.saved.slice(0, 20);
  saveState();
  renderPanel();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function effectSummary(description, maxLength = 190) {
  if (!description) return t("NoEffectSummary");
  const container = document.createElement("div");
  container.innerHTML = String(description);
  const plain = String(container.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!plain) return t("NoEffectSummary");
  return escapeHtml(plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trim()}…` : plain);
}

function cardHtml(entry) {
  const source = cypherSources.get(normalize(entry.name));
  const saved = state.saved.some(name => normalize(name) === normalize(entry.name));
  return `<article class="c2t-opportunity-card" data-cypher="${entry.name}">
    <header><img src="${source?.img || "icons/svg/mystery-man.svg"}" alt=""><div><strong>${entry.name}</strong><small>${t("Page", { page: entry.page })} · ${source ? t("Available") : t("ReferenceOnly")}</small></div></header>
    <div class="c2t-opportunity-tags">${entry.tags.map(tag => `<span>${contextLabel(tag)}</span>`).join("")}</div>
    <p class="c2t-opportunity-effect"><strong>${t("Effect")}:</strong> ${effectSummary(source?.description)}</p>
    <p>${promptFor(entry)}</p>
    <footer>
      <button type="button" data-opportunity-action="offer" title="${t("Offer")}" ${source ? "" : "disabled"}><i class="fa-solid fa-gift"></i> ${t("Offer")}</button>
      <button type="button" data-opportunity-action="save" title="${saved ? t("Unsave") : t("Save")}"><i class="${saved ? "fa-solid" : "fa-regular"} fa-star"></i></button>
      <button type="button" data-opportunity-action="replace" title="${t("Replace")}"><i class="fa-solid fa-shuffle"></i></button>
      <button type="button" data-opportunity-action="open" title="${t("OpenItem")}" ${source ? "" : "disabled"}><i class="fa-solid fa-up-right-from-square"></i></button>
    </footer>
  </article>`;
}

function savedHtml() {
  if (!state.saved.length) return `<p class="c2t-opportunity-empty">${t("NoSaved")}</p>`;
  return state.saved.map(name => {
    const entry = catalogByName.get(normalize(name));
    const available = cypherSources.has(normalize(name));
    return `<div class="c2t-opportunity-saved-item" data-cypher="${entry.name}"><span><i class="fa-solid fa-star"></i> ${entry.name}</span><div><button type="button" data-opportunity-action="offer" ${available ? "" : "disabled"}><i class="fa-solid fa-gift"></i></button><button type="button" data-opportunity-action="save"><i class="fa-solid fa-xmark"></i></button></div></div>`;
  }).join("");
}

function panelHtml() {
  const available = cypherSources.size;
  return `<section id="${PANEL_ID}" class="c2t-opportunity-panel ${state.collapsed ? "collapsed" : ""}" style="${state.left === null ? "right: 18px;" : `left: ${state.left}px;`} top: ${state.top}px;">
    <header class="c2t-opportunity-header">
      <div><i class="fa-solid fa-wand-sparkles"></i><span>${t("Title")}</span><small>${available}/${CATALOG.length}</small></div>
      <div class="c2t-opportunity-header-actions"><button type="button" data-panel-action="refresh" title="${t("RefreshCatalog")}"><i class="fa-solid fa-rotate"></i></button><button type="button" data-panel-action="collapse" title="${t("Collapse")}"><i class="fa-solid ${state.collapsed ? "fa-chevron-up" : "fa-chevron-down"}"></i></button><button type="button" data-panel-action="close" title="${t("Close")}"><i class="fa-solid fa-xmark"></i></button></div>
    </header>
    <div class="c2t-opportunity-body">
      <p class="c2t-opportunity-intro">${t("Intro")}</p>
      <div class="c2t-opportunity-contexts">${CONTEXTS.map(context => `<button type="button" data-context="${context}" class="${state.contexts.includes(context) ? "active" : ""}">${contextLabel(context)}</button>`).join("")}</div>
      <div class="c2t-opportunity-toolbar"><button type="button" data-panel-action="draw"><i class="fa-solid fa-shuffle"></i> ${t("NewHand")}</button><button type="button" data-panel-action="dramatic"><i class="fa-solid fa-bolt"></i> ${t("DramaticMoment")}</button></div>
      <div class="c2t-opportunity-hand">${hand.map(cardHtml).join("")}</div>
      <details class="c2t-opportunity-saved"><summary>${t("Saved", { count: state.saved.length })}</summary>${savedHtml()}</details>
      <footer class="c2t-opportunity-footer"><span>${t("History", { count: state.history.length })}</span><button type="button" data-panel-action="clear-history">${t("ClearHistory")}</button></footer>
    </div>
  </section>`;
}

function clampPanelPosition(element, left, top) {
  const width = element.offsetWidth || 390;
  const height = element.offsetHeight || 56;
  return { left: Math.max(4, Math.min(window.innerWidth - width - 4, left)), top: Math.max(4, Math.min(window.innerHeight - height - 4, top)) };
}

function bindDrag(panel) {
  const handle = panel.querySelector(".c2t-opportunity-header");
  handle?.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    panel.style.right = "auto";
    const move = moveEvent => {
      const position = clampPanelPosition(panel, moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
      panel.style.left = `${position.left}px`;
      panel.style.top = `${position.top}px`;
    };
    const end = endEvent => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      const position = clampPanelPosition(panel, endEvent.clientX - offsetX, endEvent.clientY - offsetY);
      state.left = position.left;
      state.top = position.top;
      saveState();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  });
}

function actorOptions() {
  return Array.from(game.actors ?? []).filter(actor => actor.type === "pc" && (actor.hasPlayerOwner || game.user.isGM)).sort((a, b) => a.name.localeCompare(b.name));
}

function offerChatContent(entry, actor, item, prompt) {
  const link = item?.uuid ? `@UUID[${item.uuid}]{${entry.name}}` : `<strong>${entry.name}</strong>`;
  return `<div class="c2t-opportunity-chat"><h3><i class="fa-solid fa-wand-sparkles"></i> ${t("ChatTitle")}</h3><p>${t("ChatOffer", { actor: actor.name, cypher: link })}</p><p><em>${prompt}</em></p></div>`;
}

async function cloneItemToActor(item, actor) {
  const data = item.toObject();
  delete data._id;
  delete data.folder;
  delete data.sort;
  delete data.ownership;
  delete data._stats;
  await actor.createEmbeddedDocuments("Item", [data]);
}

async function executeOffer(entry, html) {
  const actor = game.actors.get(String(html.find("[name=actor]").val()));
  const mode = String(html.find("[name=mode]:checked").val() ?? "remind");
  if (!actor) return ui.notifications.warn(t("ChooseActor")), false;
  const item = await resolveSource(entry);
  if (!item) return ui.notifications.warn(t("ItemNotFound")), false;
  const prompt = promptFor(entry);
  if (mode === "add") {
    await cloneItemToActor(item, actor);
    ui.notifications.info(t("Added", { cypher: entry.name, actor: actor.name }));
  } else if (mode === "whisper" || mode === "public") {
    const content = await TextEditor.enrichHTML(offerChatContent(entry, actor, item, prompt), { async: true });
    const message = { speaker: ChatMessage.getSpeaker({ actor }), content };
    if (mode === "whisper") {
      message.whisper = game.users.filter(user => user.isGM || actor.testUserPermission(user, "OWNER")).map(user => user.id);
    }
    await ChatMessage.create(message);
  } else {
    ui.notifications.info(t("Reminder", { actor: actor.name, cypher: entry.name }));
  }
  addHistory([entry.name]);
  state.saved = state.saved.filter(name => normalize(name) !== normalize(entry.name));
  const index = hand.findIndex(current => normalize(current.name) === normalize(entry.name));
  if (index >= 0) hand[index] = weightedSuggestions(1, hand.map(current => current.name))[0] ?? hand[index];
  await saveState();
  renderPanel();
  return true;
}

function openOfferDialog(entry) {
  const actors = actorOptions();
  if (!actors.length) return ui.notifications.warn(t("NoActors"));
  const content = `<form class="c2t-opportunity-offer"><p>${promptFor(entry)}</p><div class="form-group"><label>${t("Character")}</label><select name="actor">${actors.map(actor => `<option value="${actor.id}">${actor.name}</option>`).join("")}</select></div><fieldset><legend>${t("Delivery")}</legend>
    <label><input type="radio" name="mode" value="remind" checked> ${t("ModeRemind")}</label>
    <label><input type="radio" name="mode" value="add"> ${t("ModeAdd")}</label>
    <label><input type="radio" name="mode" value="whisper"> ${t("ModeWhisper")}</label>
    <label><input type="radio" name="mode" value="public"> ${t("ModePublic")}</label>
  </fieldset></form>`;
  const dialog = new Dialog({ title: `${t("Offer")}: ${entry.name}`, content, buttons: {
    apply: { icon: '<i class="fa-solid fa-check"></i>', label: t("ConfirmOffer"), callback: html => executeOffer(entry, html) },
    cancel: { label: t("Cancel") }
  } }, { width: 470 });
  dialog.render(true);
}

async function openSourceItem(entry) {
  const item = await resolveSource(entry);
  if (!item) return ui.notifications.warn(t("ItemNotFound"));
  item.sheet?.render(true);
}

function bindPanel(panel) {
  bindDrag(panel);
  panel.addEventListener("click", async event => {
    const contextButton = event.target.closest("[data-context]");
    if (contextButton) {
      const context = contextButton.dataset.context;
      state.contexts = state.contexts.includes(context) ? state.contexts.filter(value => value !== context) : [...state.contexts, context];
      if (!state.contexts.length) state.contexts = ["dramatic"];
      await saveState();
      drawNewHand({ rememberCurrent: false });
      return;
    }
    const panelAction = event.target.closest("[data-panel-action]")?.dataset.panelAction;
    if (panelAction === "collapse") { state.collapsed = !state.collapsed; await saveState(); renderPanel(); return; }
    if (panelAction === "close") { panelOpen = false; renderPanel(); return; }
    if (panelAction === "draw") { drawNewHand(); return; }
    if (panelAction === "dramatic") { state.contexts = ["dramatic"]; await saveState(); drawNewHand(); return; }
    if (panelAction === "clear-history") { state.history = []; await saveState(); drawNewHand({ rememberCurrent: false }); return; }
    if (panelAction === "refresh") { await buildSourceIndex(); renderPanel(); ui.notifications.info(t("CatalogRefreshed", { count: cypherSources.size })); return; }
    const actionElement = event.target.closest("[data-opportunity-action]");
    if (!actionElement || actionElement.disabled) return;
    const container = actionElement.closest("[data-cypher]");
    const entry = catalogByName.get(normalize(container?.dataset.cypher));
    if (!entry) return;
    const action = actionElement.dataset.opportunityAction;
    if (action === "offer") openOfferDialog(entry);
    if (action === "save") toggleSaved(entry.name);
    if (action === "replace") replaceSuggestion(entry.name);
    if (action === "open") openSourceItem(entry);
  });
}

function renderPanel() {
  document.getElementById(PANEL_ID)?.remove();
  if (!panelOpen || !game.user?.isGM || !game.settings.get(MODULE_ID, ENABLED_SETTING)) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = panelHtml();
  const panel = wrapper.firstElementChild;
  document.body.appendChild(panel);
  const position = clampPanelPosition(panel, panel.getBoundingClientRect().left, state.top);
  if (state.left !== null) panel.style.left = `${position.left}px`;
  panel.style.top = `${position.top}px`;
  bindPanel(panel);
}

async function openPanel() {
  panelOpen = true;
  await buildSourceIndex();
  if (!hand.length) hand = weightedSuggestions(HAND_SIZE);
  renderPanel();
}

function injectChatLauncher(_app, html) {
  if (!game.user?.isGM || !game.settings.get(MODULE_ID, ENABLED_SETTING)) return;
  const root = html?.[0] ?? html;
  if (!(root instanceof HTMLElement) || root.querySelector(`.${LAUNCHER_CLASS}`)) return;
  const form = root.matches?.("#chat-form") ? root : root.querySelector("#chat-form");
  if (!form) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = LAUNCHER_CLASS;
  button.title = t("OpenAssistant");
  button.innerHTML = `<i class="fa-solid fa-wand-sparkles"></i><span>${t("Launcher")}</span>`;
  button.addEventListener("click", openPanel);
  form.prepend(button);
}

function refreshChatLaunchers() {
  const chat = ui.chat?.element;
  if (chat) injectChatLauncher(ui.chat, chat);
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, ENABLED_SETTING, { name: "C2T.Opportunities.Settings.Enabled.Name", hint: "C2T.Opportunities.Settings.Enabled.Hint", scope: "world", config: true, type: Boolean, default: true, restricted: true });
  game.settings.register(MODULE_ID, STATE_SETTING, { scope: "client", config: false, type: String, default: "{}" });
});

Hooks.once("ready", async () => {
  if (!game.user.isGM) return;
  loadState();
  await buildSourceIndex();
  hand = weightedSuggestions(HAND_SIZE);
  refreshChatLaunchers();
  game.cypher2Toolkit = game.cypher2Toolkit ?? {};
  game.cypher2Toolkit.opportunities = { open: openPanel, close: () => { panelOpen = false; renderPanel(); }, refresh: async () => { await buildSourceIndex(); renderPanel(); }, draw: drawNewHand };
});

function refreshForStandaloneItem(item) {
  if (!game.user?.isGM || item?.parent?.documentName === "Actor") return;
  buildSourceIndex().then(renderPanel);
}

Hooks.on("createItem", refreshForStandaloneItem);
Hooks.on("updateItem", refreshForStandaloneItem);
Hooks.on("deleteItem", refreshForStandaloneItem);
Hooks.on("updateSetting", setting => {
  if (setting?.key === `${MODULE_ID}.${ENABLED_SETTING}`) {
    if (!game.settings.get(MODULE_ID, ENABLED_SETTING)) panelOpen = false;
    document.querySelectorAll(`.${LAUNCHER_CLASS}`).forEach(element => element.remove());
    refreshChatLaunchers();
    renderPanel();
  }
});
Hooks.on("renderChatLog", injectChatLauncher);
Hooks.on("renderChatPopout", injectChatLauncher);

