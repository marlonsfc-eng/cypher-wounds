const MODULE_ID = "cypher-2-toolkit";
const MAPPING_SETTING = "iconMappings";
const ICON_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg", ".svg"];
const ICON_ROOTS = [
  "icons/skills", "icons/magic", "icons/equipment", "icons/weapons",
  "icons/commodities", "icons/consumables", "icons/tools", "icons/sundries"
];
const GENERIC_ICONS = new Set([
  "", "icons/svg/book.svg", "icons/svg/item-bag.svg", "icons/svg/lightning.svg",
  "icons/svg/sword.svg", "icons/svg/mystery-man.svg", "icons/svg/hazard.svg",
  "icons/svg/upgrade.svg"
]);
const CATEGORY_LABELS = {opportunity: "Opportunity Cyphers", manifest: "Manifest Cyphers", artifact: "Artifacts"};
const STOP_WORDS = new Set(["a", "an", "and", "at", "by", "for", "from", "in", "of", "on", "the", "to", "with", "improved", "quick"]);
const ALIASES = {
  armor: ["armour", "plate", "mail", "chest", "shield"], shield: ["armor", "ward", "block", "defense"],
  speed: ["movement", "move", "boot", "wing", "dash"], burst: ["speed", "movement", "explosion"],
  heal: ["healing", "health", "recovery", "medicine"], recovery: ["heal", "health", "restore"],
  wound: ["blood", "injury", "heal", "health"], poison: ["toxin", "venom", "vial"],
  mind: ["brain", "psychic", "mental", "thought"], intellect: ["mind", "brain", "knowledge"],
  fire: ["flame", "burn", "ignite"], ignite: ["fire", "flame", "spark"], cold: ["ice", "frost", "snow"],
  attack: ["weapon", "strike", "sword", "combat"], combat: ["weapon", "attack", "battle"],
  disarm: ["weapon", "sword", "hand"], restrain: ["chain", "rope", "bind", "trap"],
  push: ["force", "hand", "movement"], repel: ["force", "shield", "ward"],
  stealth: ["shadow", "sneak", "hidden"], disguise: ["mask", "face", "cloak"],
  perception: ["eye", "vision", "sight"], reveal: ["eye", "vision", "light"],
  tool: ["tools", "hammer", "wrench", "gear"], repair: ["tool", "hammer", "wrench", "gear"],
  device: ["machine", "gear", "technology", "tool"], artifact: ["relic", "device", "magic"],
  beast: ["animal", "creature", "paw"], breath: ["air", "wind", "lung"],
  jump: ["leap", "movement", "boot"], climb: ["rope", "mountain", "hand"],
  charm: ["heart", "social", "speech"], message: ["speech", "sound", "letter"],
  secret: ["hidden", "lock", "key", "scroll"], password: ["lock", "key", "rune"],
  strength: ["might", "muscle", "fist"], might: ["strength", "muscle", "fist"]
};

const t = (key, data = {}) => game.i18n.format(`C2T.Icons.${key}`, data);

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(value) {
  return normalize(value).split(" ").filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

export function iconMappingKey(category, name) {
  return `${category}:${normalize(name)}`;
}

export function readIconMappings() {
  try { return JSON.parse(game.settings.get(MODULE_ID, MAPPING_SETTING) || "{}"); }
  catch (_) { return {}; }
}

export function mappedIcon(category, name, fallback = "") {
  try { return String(readIconMappings()[iconMappingKey(category, name)] || fallback || ""); }
  catch (_) { return String(fallback || ""); }
}

function flagValue(document, key) {
  return document?.getFlag?.(MODULE_ID, key) ?? foundry.utils.getProperty(document, `flags.${MODULE_ID}.${key}`);
}

function itemCategory(item) {
  const opportunity = Boolean(flagValue(item, "randomCypher") || flagValue(item, "opportunity"));
  if (opportunity && (item.type === "cypher" || item.type === "ability")) return "opportunity";
  if (item.type === "cypher") return "manifest";
  if (item.type === "artifact") return "artifact";
  return null;
}

function isGenericIcon(path) {
  return GENERIC_ICONS.has(String(path ?? "").split("?")[0]);
}

function filePickerClass() {
  return foundry.applications?.apps?.FilePicker ?? globalThis.FilePicker;
}

function pathTokens(path) {
  return tokens(String(path).replace(/^icons\//, "").replace(/\.[^.]+$/, ""));
}

function expandedTokens(name) {
  const result = new Set(tokens(name));
  for (const token of [...result]) for (const alias of ALIASES[token] ?? []) result.add(alias);
  return result;
}

function iconScore(name, category, path) {
  const desired = expandedTokens(name);
  const available = new Set(pathTokens(path));
  let score = 0;
  for (const token of desired) {
    if (available.has(token)) score += 18;
    else if ([...available].some(candidate => candidate.startsWith(token) || token.startsWith(candidate))) score += 6;
  }
  const normalizedPath = normalize(path);
  if (category === "opportunity" && /icons (skills|magic)/.test(normalizedPath)) score += 4;
  if (category === "manifest" && /icons (magic|commodities|consumables|tools)/.test(normalizedPath)) score += 4;
  if (category === "artifact" && /icons (equipment|weapons|tools|magic)/.test(normalizedPath)) score += 5;
  return score;
}

async function browseIconTree(onProgress = null) {
  const Picker = filePickerClass();
  if (!Picker?.browse) throw new Error(t("FilePickerUnavailable"));
  const queue = [...ICON_ROOTS];
  const visited = new Set();
  const files = new Set();
  while (queue.length && visited.size < 900 && files.size < 9000) {
    const target = queue.shift();
    if (!target || visited.has(target)) continue;
    visited.add(target);
    let result;
    try { result = await Picker.browse("public", target, {extensions: ICON_EXTENSIONS}); }
    catch (error) {
      console.warn(`${MODULE_ID} | Could not browse core icon folder ${target}`, error);
      continue;
    }
    for (const file of result?.files ?? []) files.add(String(file));
    for (const directory of result?.dirs ?? []) if (String(directory).startsWith("icons/")) queue.push(String(directory));
    if (onProgress && visited.size % 20 === 0) onProgress(visited.size, files.size);
  }
  return [...files];
}

async function collectManagedItems() {
  const rows = new Map();
  const add = (item, uuid, source) => {
    const category = itemCategory(item);
    if (!category || !item.name) return;
    const key = iconMappingKey(category, item.name);
    const row = rows.get(key) ?? {key, category, categoryLabel: CATEGORY_LABELS[category], name: item.name, img: String(item.img ?? ""), refs: [], sources: new Set()};
    row.refs.push(uuid);
    row.sources.add(source);
    if (isGenericIcon(row.img) && !isGenericIcon(item.img)) row.img = String(item.img);
    rows.set(key, row);
  };
  for (const item of game.items ?? []) add(item, item.uuid, t("WorldItems"));
  for (const pack of game.packs ?? []) {
    if (pack.documentName !== "Item" || (!pack.collection.startsWith("world.") && pack.metadata?.packageType !== "world")) continue;
    try {
      const index = await pack.getIndex({fields: ["name", "type", "img", `flags.${MODULE_ID}.randomCypher`, `flags.${MODULE_ID}.opportunity`]});
      for (const entry of index) add(entry, entry.uuid ?? `Compendium.${pack.collection}.${entry._id ?? entry.id}`, pack.metadata?.label ?? pack.title ?? pack.collection);
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not index ${pack.collection} for icon management`, error);
    }
  }
  return [...rows.values()].map(row => ({...row, sources: [...row.sources].join(", "), count: row.refs.length})).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

async function updateDocumentsByUuid(updates) {
  const world = [];
  const packs = new Map();
  for (const update of updates) {
    if (update.uuid.startsWith("Compendium.")) {
      const parts = update.uuid.split(".");
      const collection = `${parts[1]}.${parts[2]}`;
      const documentId = parts.at(-1);
      if (!documentId || documentId === "Item") continue;
      if (!packs.has(collection)) packs.set(collection, []);
      packs.get(collection).push({_id: documentId, img: update.img});
    } else {
      const document = await fromUuid(update.uuid);
      if (document?.documentName === "Item") world.push({_id: document.id, img: update.img});
    }
  }
  if (world.length) await Item.updateDocuments(world);
  for (const [collection, entries] of packs) {
    const pack = game.packs.get(collection);
    if (!pack) continue;
    const wasLocked = pack.locked;
    try {
      if (wasLocked) await pack.configure({locked: false});
      await pack.documentClass.updateDocuments(entries, {pack: collection});
    } finally {
      if (wasLocked) await pack.configure({locked: true});
    }
  }
}

async function propagateToActors(selections) {
  let updated = 0;
  for (const actor of game.actors ?? []) {
    const changes = [];
    for (const item of actor.items ?? []) {
      const category = itemCategory(item);
      if (!category) continue;
      const img = selections.get(iconMappingKey(category, item.name));
      if (img && item.img !== img) changes.push({_id: item.id, img});
    }
    if (changes.length) {
      await actor.updateEmbeddedDocuments("Item", changes);
      updated += changes.length;
    }
  }
  return updated;
}

export class CypherIconManager extends FormApplication {
  constructor(options = {}) {
    super(options);
    this.rows = [];
    this.iconIndex = [];
    this.suggestions = new Map();
    this.category = "opportunity";
    this.query = "";
    this.loading = false;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "cypher-2-toolkit-icon-manager", title: "C2T.Icons.Title",
      template: `modules/${MODULE_ID}/templates/icon-manager.hbs`, width: 880, height: 720,
      resizable: true, closeOnSubmit: false, submitOnChange: false
    });
  }

  async getData() {
    if (!this.rows.length && !this.loading) {
      this.loading = true;
      this.rows = await collectManagedItems();
      this.loading = false;
      this.buildSuggestions();
    }
    const mappings = readIconMappings();
    const query = normalize(this.query);
    const visible = this.rows.filter(row => row.category === this.category && (!query || normalize(row.name).includes(query))).map(row => {
      const mapped = mappings[row.key] ?? "";
      const suggested = mapped || this.suggestions.get(row.key) || "";
      return {...row, mapped, suggested, displayImg: suggested || row.img || "icons/svg/item-bag.svg", generic: isGenericIcon(row.img), selected: isGenericIcon(row.img) || Boolean(mapped)};
    });
    const counts = Object.fromEntries(Object.keys(CATEGORY_LABELS).map(category => [category, this.rows.filter(row => row.category === category).length]));
    return {
      isGM: game.user.isGM, loading: this.loading, rows: visible, indexed: this.iconIndex.length,
      query: this.query, counts, opportunityActive: this.category === "opportunity",
      manifestActive: this.category === "manifest", artifactActive: this.category === "artifact"
    };
  }

  buildSuggestions() {
    const mappings = readIconMappings();
    const used = new Set(Object.values(mappings));
    this.suggestions.clear();
    if (!this.iconIndex.length) return;
    for (const row of this.rows) {
      if (mappings[row.key]) continue;
      let best = "";
      let bestScore = -1;
      for (const icon of this.iconIndex) {
        const score = iconScore(row.name, row.category, icon) - (used.has(icon) ? 3 : 0);
        if (score > bestScore) { best = icon; bestScore = score; }
      }
      if (best && bestScore >= 4) { this.suggestions.set(row.key, best); used.add(best); }
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-category]").on("click", event => { this.category = event.currentTarget.dataset.category; this.render(false); });
    html.find("[data-icon-search]").on("input", event => {
      this.query = event.currentTarget.value;
      const query = normalize(this.query);
      html.find("[data-icon-row]").each((_index, row) => { row.hidden = Boolean(query) && !normalize(row.querySelector(".c2t-icon-manager-name strong")?.textContent).includes(query); });
    });
    html.find("[data-action='index-icons']").on("click", async event => {
      event.preventDefault();
      const button = event.currentTarget;
      button.disabled = true;
      button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t("Indexing")}`;
      try {
        this.iconIndex = await browseIconTree((_folders, files) => { button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t("IndexedProgress", {count: files})}`; });
        this.buildSuggestions();
        ui.notifications.info(t("Indexed", {count: this.iconIndex.length}));
        this.render(false);
      } catch (error) {
        console.error(`${MODULE_ID} | Icon indexing failed`, error);
        ui.notifications.error(`${t("IndexFailed")}: ${error.message}`);
        button.disabled = false;
      }
    });
    html.find("[data-action='browse']").on("click", event => {
      event.preventDefault();
      const Picker = filePickerClass();
      if (!Picker) return ui.notifications.error(t("FilePickerUnavailable"));
      const picker = Picker.fromButton?.(event.currentTarget);
      if (picker) picker.render(true);
      else new Picker({type: "image", current: event.currentTarget.dataset.current ?? "icons", callback: path => this.setRowPath(html, event.currentTarget.dataset.key, path)}).render(true);
    });
    html.find("[data-icon-path]").on("change", event => this.setRowPath(html, event.currentTarget.dataset.key, event.currentTarget.value));
    html.find("img[data-current-preview]").on("error", event => {
      const row = event.currentTarget.closest("[data-icon-row]");
      row?.classList.add("broken");
      const checkbox = row?.querySelector("input[name='selected']");
      if (checkbox) checkbox.checked = true;
    });
    html.find("[data-action='select-generic']").on("click", event => { event.preventDefault(); html.find("[data-icon-row]").each((_i, row) => { row.querySelector("input[name='selected']").checked = row.classList.contains("generic") || row.classList.contains("broken"); }); });
    html.find("[data-action='select-all']").on("click", event => { event.preventDefault(); html.find("input[name='selected']").prop("checked", true); });
    html.find("[data-action='select-none']").on("click", event => { event.preventDefault(); html.find("input[name='selected']").prop("checked", false); });
    html.find("[data-action='apply']").on("click", event => { event.preventDefault(); this.applySelected(html); });
  }

  setRowPath(html, key, path) {
    const row = html.find("[data-icon-row]").filter((_index, element) => element.dataset.key === key);
    row.find("[data-icon-path]").val(path);
    row.find("[data-suggested-preview]").attr("src", path || "icons/svg/item-bag.svg");
    row.find("input[name='selected']").prop("checked", true);
  }

  async applySelected(html) {
    const selections = new Map();
    html.find("[data-icon-row]").each((_index, element) => {
      const row = $(element);
      if (!row.find("input[name='selected']").prop("checked")) return;
      const path = String(row.find("[data-icon-path]").val() ?? "").trim();
      if (path) selections.set(String(element.dataset.key), path);
    });
    if (!selections.size) return ui.notifications.warn(t("NothingSelected"));
    const refs = [];
    for (const row of this.rows) {
      const img = selections.get(row.key);
      if (!img) continue;
      for (const uuid of row.refs) refs.push({uuid, img});
    }
    try {
      await updateDocumentsByUuid(refs);
      const actorItems = html.find("[name='propagate']").prop("checked") ? await propagateToActors(selections) : 0;
      const mappings = {...readIconMappings(), ...Object.fromEntries(selections)};
      await game.settings.set(MODULE_ID, MAPPING_SETTING, JSON.stringify(mappings));
      ui.notifications.info(t("Applied", {items: refs.length, actors: actorItems}));
      this.rows = [];
      this.render(false);
    } catch (error) {
      console.error(`${MODULE_ID} | Icon application failed`, error);
      ui.notifications.error(`${t("ApplyFailed")}: ${error.message}`);
    }
  }

  async _updateObject() {}
}

export {MAPPING_SETTING};
