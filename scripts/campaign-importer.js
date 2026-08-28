import {mappedIcon} from "./icon-manager.js";
const MODULE_ID = "cypher-2-toolkit";
const MODULE_PATH = `modules/${MODULE_ID}`;
const FLAG_SCOPE = MODULE_ID;

function clone(value) {
  return foundry.utils.deepClone(value ?? {});
}

function slugify(value) {
  return String(value || "campanha")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "campanha";
}

function campaignId(payload) {
  return slugify(payload.meta?.id || payload.meta?.title || "campanha-privada");
}

function documentCampaign(document) {
  return document.getFlag(FLAG_SCOPE, "campaignId");
}

function documentSource(document) {
  return document.getFlag(FLAG_SCOPE, "campaignSourceId");
}

function managedFlags(campaign, id, extra = {}) {
  return {[FLAG_SCOPE]: {campaignId: campaign, campaignSourceId: id, campaignManaged: true, ...extra}};
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("O arquivo não contém um objeto JSON válido.");
  if (!payload.meta?.title) throw new Error("O arquivo não informa meta.title.");
  for (const key of ["journals", "actors", "items", "tables", "scenes"]) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) throw new Error(`A coleção ${key} precisa ser uma lista.`);
  }
  const ids = new Set();
  for (const key of ["journals", "actors", "items", "tables", "scenes"]) {
    for (const entry of payload[key] || []) {
      if (!entry.id || !entry.name) throw new Error(`Uma entrada de ${key} não possui id ou name.`);
      const compound = `${key}:${entry.id}`;
      if (ids.has(compound)) throw new Error(`Identificador duplicado: ${compound}.`);
      ids.add(compound);
    }
  }
  if (payload.assets !== undefined && !Array.isArray(payload.assets)) throw new Error("assets precisa ser uma lista.");
  for (const asset of payload.assets || []) {
    if (!asset.id || !asset.filename || !asset.data) throw new Error("Um asset não possui id, filename ou data.");
  }
  return payload;
}

function filePickerClass() {
  const Picker = foundry.applications?.apps?.FilePicker ?? globalThis.FilePicker;
  if (!Picker?.upload || !Picker?.createDirectory) throw new Error("A API de upload do File Picker não está disponível.");
  return Picker;
}

async function ensureUploadDirectory(Picker, path) {
  const parts = String(path).split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    try {
      await Picker.createDirectory("data", current, {notify: false});
    } catch (error) {
      try {
        await Picker.browse("data", current);
      } catch (_browseError) {
        throw new Error(`Não foi possível criar a pasta de assets '${current}': ${error.message}`);
      }
    }
  }
}

function decodeAsset(asset) {
  const raw = String(asset.data).replace(/^data:[^;]+;base64,/, "");
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new File([bytes], asset.filename, {type: asset.mimeType || "application/octet-stream"});
}

async function uploadAssets(payload, campaign) {
  const assets = payload.assets || [];
  if (!assets.length) return new Map();
  const Picker = filePickerClass();
  const basePath = `worlds/${game.world.id}/cypher-2-toolkit/${campaign}`;
  await ensureUploadDirectory(Picker, basePath);
  const paths = new Map();
  let completed = 0;
  for (const asset of assets) {
    const relativeFolder = String(asset.id).includes("/") ? String(asset.id).split("/").slice(0, -1).join("/") : "";
    const destination = relativeFolder ? `${basePath}/${relativeFolder}` : basePath;
    await ensureUploadDirectory(Picker, destination);
    const response = await Picker.upload("data", destination, decodeAsset(asset), {}, {notify: false});
    const path = response?.path || `${destination}/${asset.filename}`;
    paths.set(asset.id, path);
    paths.set(asset.filename, path);
    completed += 1;
    ui.notifications.info(`Assets da campanha: ${completed}/${assets.length}`, {permanent: false});
  }
  return paths;
}

function resolveAssets(content, assets) {
  let result = String(content ?? "");
  result = result.replace(/\{\{asset:([^}]+)}}/g, (_match, id) => assets.get(id) || id);
  for (const [id, path] of assets) {
    if (!id.includes("/")) continue;
    result = result.split(`modules/the-devils-spine-companion/${id}`).join(path);
  }
  return result;
}

async function ensureFolder(name, type, campaign, parent = null) {
  const parentId = parent?.id ?? parent ?? null;
  const existing = game.folders.find(folder => folder.name === name && folder.type === type &&
    (folder.folder?.id ?? folder.folder ?? null) === parentId && documentCampaign(folder) === campaign);
  if (existing) return existing;
  return Folder.create({name, type, folder: parentId, sorting: "a", flags: managedFlags(campaign, `folder.${type}.${name}`)});
}

async function campaignFolders(payload, campaign) {
  const title = payload.meta.folderName || payload.meta.title;
  const result = {};
  for (const type of ["JournalEntry", "Actor", "Item", "RollTable", "Scene"]) {
    result[type] = await ensureFolder(title, type, campaign);
  }
  result.handouts = await ensureFolder(payload.meta.handoutsFolder || "Handouts para jogadores", "JournalEntry", campaign, result.JournalEntry);
  return result;
}

function actorData(entry, folder, campaign, assets) {
  const level = Number(entry.level ?? 1);
  const health = Number(entry.health ?? level * 3);
  const image = assets.get(entry.img) || entry.img || "icons/svg/mystery-man.svg";
  return {
    name: entry.name, type: entry.type || "npc", img: image, folder: folder.id,
    system: entry.system ? clone(entry.system) : {
      version: 3, basic: {level}, pools: {health: {value: health, max: health}},
      combat: {damage: Number(entry.damage ?? level), armor: Number(entry.armor ?? 0)},
      description: resolveAssets(entry.summary || "", assets), notes: resolveAssets(entry.notes || "", assets),
      settings: {general: {initiativeBonus: 0, hideArchive: false}, equipment: {
        ammo: {active: false}, attacks: {active: false}, armor: {active: false},
        cyphers: {active: false, label: ""}, artifacts: {active: false, label: ""},
        oddities: {active: false, label: ""}, materials: {active: false, label: ""}
      }}
    },
    prototypeToken: entry.prototypeToken ? clone(entry.prototypeToken) : {
      name: entry.name, displayName: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER,
      disposition: entry.disposition ?? CONST.TOKEN_DISPOSITIONS.HOSTILE, actorLink: false,
      texture: {src: image}, bar1: {attribute: "pools.health"}
    },
    flags: managedFlags(campaign, entry.id, {sourcePage: entry.page ?? null})
  };
}

function itemData(entry, folder, campaign, assets) {
  if (entry.document || entry.data) {
    const supplied = clone(entry.document || entry.data);
    supplied.name = supplied.name || entry.name;
    supplied.type = supplied.type || entry.type || "equipment";
    const suppliedOpportunity = Boolean(entry.randomCypher ?? foundry.utils.getProperty(supplied, `flags.${MODULE_ID}.randomCypher`));
    if (supplied.type === "artifact") supplied.img = mappedIcon("artifact", supplied.name, supplied.img);
    if (supplied.type === "cypher") supplied.img = mappedIcon(suppliedOpportunity ? "opportunity" : "manifest", supplied.name, supplied.img);
    supplied.folder = folder.id;
    supplied.flags = foundry.utils.mergeObject(supplied.flags || {}, managedFlags(campaign, entry.id, {sourcePage: entry.page ?? null}), {inplace: false});
    return supplied;
  }
  const type = entry.type || "equipment";
  const fallbackImg = assets.get(entry.img) || entry.img || (type === "artifact" ? "icons/svg/sword.svg" : type === "cypher" ? "icons/svg/lightning.svg" : "icons/svg/item-bag.svg");
  const iconCategory = type === "artifact" ? "artifact" : type === "cypher" ? (entry.randomCypher ? "opportunity" : "manifest") : null;
  const base = {
    name: entry.name, type,
    img: iconCategory ? mappedIcon(iconCategory, entry.name, fallbackImg) : fallbackImg,
    folder: folder.id, flags: managedFlags(campaign, entry.id, {sourcePage: entry.page ?? null})
  };
  const description = resolveAssets(entry.description || "", assets);
  if (type === "artifact") base.system = {version: 2, description, archived: false, favorite: false, basic: {level: String(entry.level ?? ""), depletion: entry.depletion || "-", identified: true}, price: {value: 0, currency: "", priceTag: "", category: "none"}, settings: {general: {nameUnidentified: ""}}};
  else if (type === "cypher") base.system = {version: 2, description, archived: false, favorite: false, basic: {level: String(entry.level ?? ""), type: [0, 0], identified: true}, price: {value: 0, currency: "", priceTag: "", category: "none"}, settings: {general: {nameUnidentified: ""}}};
  else base.system = {version: 2, description, archived: false, favorite: false, basic: {level: String(entry.level ?? ""), quantity: Number(entry.quantity ?? 1)}, price: {value: 0, currency: "", priceTag: "", category: "none"}, settings: {general: {sorting: "Equipment"}}};
  return base;
}

async function upsertWorldDocuments(DocumentClass, entries, campaign, buildData) {
  const collection = game.collections.get(DocumentClass.documentName);
  if (!collection) throw new Error(`Coleção Foundry não encontrada: ${DocumentClass.documentName}`);
  const existing = new Map(collection.filter(doc => documentCampaign(doc) === campaign && documentSource(doc)).map(doc => [documentSource(doc), doc]));
  const documents = new Map();
  let created = 0;
  let updated = 0;
  for (const entry of entries || []) {
    const match = existing.get(entry.id);
    const data = buildData(entry);
    const document = match ? await match.update(data, {diff: false, recursive: false}) : await DocumentClass.create(data);
    match ? updated += 1 : created += 1;
    documents.set(entry.id, document);
  }
  return {documents, created, updated};
}

async function upsertJournals(entries, folders, campaign, assets) {
  const existing = new Map(game.journal.filter(doc => documentCampaign(doc) === campaign && documentSource(doc)).map(doc => [documentSource(doc), doc]));
  const documents = new Map();
  const rawPages = new Map();
  let created = 0;
  let updated = 0;
  for (const entry of entries || []) {
    const folder = entry.handouts ? folders.handouts : folders.JournalEntry;
    let journal = existing.get(entry.id);
    const wasExisting = Boolean(journal);
    const journalData = {name: entry.name, folder: folder.id, ownership: {default: entry.playerVisible ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER : CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE}, flags: managedFlags(campaign, entry.id, {preserve: Boolean(entry.preserve)})};
    if (!journal) { journal = await JournalEntry.create(journalData); created += 1; }
    else if (!entry.preserve) { await journal.update(journalData); updated += 1; }
    if (!entry.preserve || !journal.pages.size) {
      if (journal.pages.size) await journal.deleteEmbeddedDocuments("JournalEntryPage", journal.pages.map(page => page.id));
      const pages = (entry.pages || []).map((page, index) => ({
        name: page.name, type: "text", sort: (index + 1) * 100000,
        text: {format: CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML, content: resolveAssets(page.content, assets)},
        ownership: {default: entry.playerVisible ? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER : CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE},
        flags: managedFlags(campaign, `${entry.id}.${page.id}`, {pageId: page.id})
      }));
      if (pages.length) await journal.createEmbeddedDocuments("JournalEntryPage", pages);
    }
    documents.set(entry.id, journal);
    rawPages.set(entry.id, entry.preserve && wasExisting ? [] : entry.pages || []);
  }
  return {documents, rawPages, created, updated};
}

function linkMaps(all) {
  const maps = {journal: new Map(), actor: new Map(), item: new Map(), table: new Map(), scene: new Map()};
  for (const [id, journal] of all.journals.documents) {
    maps.journal.set(id, {uuid: journal.uuid, name: journal.name});
    maps.journal.set(id.replace(/^journal\./, ""), {uuid: journal.uuid, name: journal.name});
    for (const page of journal.pages) {
      const pageId = page.getFlag(FLAG_SCOPE, "pageId");
      if (!pageId) continue;
      maps.journal.set(`${id}|${pageId}`, {uuid: page.uuid, name: page.name});
      maps.journal.set(`${id.replace(/^journal\./, "")}|${pageId}`, {uuid: page.uuid, name: page.name});
    }
  }
  for (const category of ["actor", "item", "table", "scene"]) for (const [id, document] of all[`${category}s`].documents) maps[category].set(id, {uuid: document.uuid, name: document.name});
  return maps;
}

function resolveLinks(content, maps) {
  return String(content).replace(/\{\{(journal|actor|item|table|scene):([^}]+)}}/g, (_match, type, id) => {
    const target = maps[type].get(id);
    return target ? `@UUID[${target.uuid}]{${target.name}}` : `<span class="tds-missing-link">${id}</span>`;
  });
}

async function resolveJournalLinks(all, assets) {
  const maps = linkMaps(all);
  for (const [journalId, journal] of all.journals.documents) {
    const sourcePages = all.journals.rawPages.get(journalId) || [];
    for (const page of journal.pages) {
      const pageId = page.getFlag(FLAG_SCOPE, "pageId");
      const source = sourcePages.find(entry => entry.id === pageId);
      if (!source) continue;
      const content = resolveLinks(resolveAssets(source.content, assets), maps);
      if (page.text.content !== content) await page.update({"text.content": content});
    }
  }
}

async function upsertTables(entries, folder, campaign) {
  return upsertWorldDocuments(RollTable, entries, campaign, entry => ({
    name: entry.name, folder: folder.id, formula: entry.formula, replacement: true, displayRoll: true,
    results: (entry.results || []).map((text, index) => ({type: CONST.TABLE_RESULT_TYPES.TEXT, text, range: [index + 1, index + 1], weight: 1, drawn: false})),
    flags: managedFlags(campaign, entry.id, {sourcePage: entry.page ?? null})
  }));
}

async function upsertScenes(entries, folder, campaign, assets) {
  return upsertWorldDocuments(Scene, entries, campaign, entry => ({
    name: entry.name, folder: folder.id, active: false, navigation: false,
    background: {src: assets.get(entry.background) || entry.background || null}, width: entry.width, height: entry.height,
    padding: 0, grid: {type: CONST.GRID_TYPES.GRIDLESS, size: 100, distance: 1, units: "m"},
    tokenVision: false, fogExploration: false, flags: managedFlags(campaign, entry.id, {purpose: entry.purpose})
  }));
}

export async function importPrivateCampaign(rawPayload) {
  if (!game.user.isGM) throw new Error("Somente o GM pode importar campanhas.");
  if (game.system.id !== "cyphersystem") throw new Error("Este importador requer o sistema Cypher System.");
  const payload = validatePayload(rawPayload);
  const campaign = campaignId(payload);
  ui.notifications.info(`Preparando ${payload.meta.title}...`);
  const assets = await uploadAssets(payload, campaign);
  const folders = await campaignFolders(payload, campaign);
  const all = {};
  all.actors = await upsertWorldDocuments(Actor, payload.actors, campaign, entry => actorData(entry, folders.Actor, campaign, assets));
  all.items = await upsertWorldDocuments(Item, payload.items, campaign, entry => itemData(entry, folders.Item, campaign, assets));
  all.tables = await upsertTables(payload.tables, folders.RollTable, campaign);
  all.scenes = await upsertScenes(payload.scenes, folders.Scene, campaign, assets);
  all.journals = await upsertJournals(payload.journals, folders, campaign, assets);
  await resolveJournalLinks(all, assets);
  const summary = Object.fromEntries(Object.entries(all).map(([key, value]) => [key, {created: value.created, updated: value.updated}]));
  const importState = {date: new Date().toISOString(), title: payload.meta.title, campaign, version: payload.meta.version || "", summary};
  await game.settings.set(MODULE_ID, "lastCampaignImport", JSON.stringify(importState));
  ui.notifications.info(`${payload.meta.title} foi importada/atualizada com sucesso.`);
  const dashboard = all.journals.documents.get(payload.meta.dashboardId || "journal.dashboard");
  dashboard?.sheet.render(true);
  return summary;
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result)); }
      catch (error) { reject(new Error(`JSON inválido: ${error.message}`)); }
    };
    reader.readAsText(file, "utf-8");
  });
}

export class PrivateCampaignImporter extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "c2t-private-campaign-importer", title: "Cypher 2 Toolkit — Importar campanha privada",
      template: `${MODULE_PATH}/templates/campaign-importer.hbs`, width: 580, height: "auto", closeOnSubmit: false
    });
  }

  getData() {
    let lastImport = null;
    try { lastImport = JSON.parse(game.settings.get(MODULE_ID, "lastCampaignImport") || "null"); } catch (_error) {}
    return {lastImport};
  }

  async _updateObject(_event, formData) {
    const input = this.element.find('input[name="campaignFile"]')[0];
    const file = input?.files?.[0];
    if (!file) return ui.notifications.warn("Selecione o JSON privado da campanha.");
    const button = this.element.find('button[type="submit"]');
    button.prop("disabled", true);
    try {
      const payload = await readJsonFile(file);
      const summary = await importPrivateCampaign(payload);
      const lines = Object.entries(summary).map(([name, value]) => `<li><strong>${name}</strong>: ${value.created} criados, ${value.updated} atualizados</li>`).join("");
      new Dialog({title: "Importação concluída", content: `<ul>${lines}</ul>`, buttons: {ok: {label: "OK"}}}).render(true);
      this.render(false);
    } catch (error) {
      console.error(`${MODULE_ID} | Private campaign import failed`, error);
      ui.notifications.error(`Falha ao importar a campanha: ${error.message}`, {permanent: true});
    } finally {
      button.prop("disabled", false);
    }
  }
}
