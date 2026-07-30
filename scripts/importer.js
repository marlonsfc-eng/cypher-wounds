const C2T_ID = "cypher-2-toolkit";

function c2tLocalize(key) {
  return game.i18n.localize(key);
}

function slugify(value) {
  return String(value ?? "entry")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "entry";
}

function cleanObject(value) {
  return foundry.utils.deepClone(value ?? {});
}

function getSourceId(entry, category) {
  return String(entry.id ?? entry.sourceId ?? `${category}.${slugify(entry.name)}`);
}

function htmlFromEntry(entry) {
  if (entry.html) return String(entry.html);
  if (entry.description) return `<div class="c2t-imported-description">${String(entry.description)}</div>`;
  return "<p></p>";
}

function abilityData(entry) {
  const base = cleanObject(entry.document ?? entry.data);
  const system = foundry.utils.mergeObject({
    description: htmlFromEntry(entry),
    archived: false,
    favorite: false,
    basic: {
      cost: Number(entry.cost ?? 0) || 0,
      pool: String(entry.pool ?? "Pool")
    },
    settings: {
      general: {
        sorting: String(entry.sorting ?? "Ability"),
        spellTier: String(entry.spellTier ?? "low"),
        unmaskedForm: "Mask"
      },
      rollButton: {
        pool: String(entry.rollPool ?? entry.pool ?? "Pool"),
        skill: String(entry.skill ?? "Practiced"),
        assets: Number(entry.assets ?? 0) || 0,
        effort1: 0,
        effort2: 0,
        effort3: 0,
        freeEffort: 0,
        stepModifier: String(entry.stepModifier ?? "eased"),
        additionalSteps: Number(entry.additionalSteps ?? 0) || 0,
        additionalCost: Number(entry.additionalCost ?? 0) || 0,
        damage: Number(entry.damage ?? 0) || 0,
        damagePerLOE: Number(entry.damagePerLOE ?? 3) || 3,
        teen: "",
        bonus: Number(entry.bonus ?? 0) || 0,
        macroUuid: "",
        macroExecuteAsGM: false
      }
    }
  }, cleanObject(base.system), {inplace: false, overwrite: true});

  return foundry.utils.mergeObject({
    name: String(entry.name ?? "Unnamed Ability"),
    type: String(base.type ?? entry.type ?? "ability"),
    img: String(base.img ?? entry.img ?? "icons/svg/book.svg"),
    system,
    flags: {
      [C2T_ID]: {
        sourceId: getSourceId(entry, "abilities"),
        category: "abilities",
        tier: entry.tier ?? null,
        source: entry.source ?? null
      }
    }
  }, base, {inplace: false, overwrite: true});
}

function journalData(entry, category, abilityUuids = new Map()) {
  const base = cleanObject(entry.document ?? entry.data);
  let content = htmlFromEntry(entry);
  const refs = Array.isArray(entry.abilities) ? entry.abilities : [];
  if (refs.length) {
    const links = refs.map(ref => {
      const key = typeof ref === "string" ? ref : (ref.id ?? ref.name);
      const uuid = abilityUuids.get(String(key)) ?? abilityUuids.get(slugify(key));
      const label = typeof ref === "string" ? ref : (ref.name ?? key);
      return uuid ? `<li>@UUID[${uuid}]{${label}}</li>` : `<li>${label}</li>`;
    }).join("");
    content += `<hr><h2>${c2tLocalize("C2T.Importer.LinkedAbilities")}</h2><ul>${links}</ul>`;
  }
  const page = {
    name: String(entry.pageName ?? entry.name ?? "Content"),
    type: "text",
    text: {content, format: 1},
    title: {show: false, level: 1}
  };
  return foundry.utils.mergeObject({
    name: String(entry.name ?? "Unnamed Entry"),
    img: String(entry.img ?? "icons/svg/book.svg"),
    pages: [page],
    flags: {
      [C2T_ID]: {
        sourceId: getSourceId(entry, category),
        category,
        source: entry.source ?? null
      }
    }
  }, base, {inplace: false, overwrite: true});
}

async function ensureWorldPack({name, label, type}) {
  const collection = `world.${name}`;
  let pack = game.packs.get(collection);
  if (!pack) {
    pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
      name,
      label,
      type,
      package: "world"
    });
  }
  if (pack.locked) await pack.configure({locked: false});
  return pack;
}

async function upsertDocuments(pack, documents, mode = "update") {
  const existing = await pack.getDocuments();
  const bySource = new Map(existing.map(doc => [doc.getFlag(C2T_ID, "sourceId"), doc]));
  let created = 0;
  let updated = 0;
  let deleted = 0;

  if (mode === "replace") {
    const owned = existing.filter(doc => doc.getFlag(C2T_ID, "sourceId"));
    if (owned.length) {
      await pack.documentClass.deleteDocuments(owned.map(doc => doc.id), {pack: pack.collection});
      deleted = owned.length;
      bySource.clear();
    }
  }

  for (const data of documents) {
    const sourceId = foundry.utils.getProperty(data, `flags.${C2T_ID}.sourceId`);
    const match = bySource.get(sourceId);
    if (match && mode === "update") {
      const update = foundry.utils.deepClone(data);
      update._id = match.id;
      await pack.documentClass.updateDocuments([update], {pack: pack.collection});
      updated++;
    } else {
      await pack.documentClass.createDocuments([data], {pack: pack.collection});
      created++;
    }
  }
  await pack.getIndex({fields: ["name"]});
  return {created, updated, deleted};
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error(c2tLocalize("C2T.Importer.InvalidRoot"));
  const supported = ["types", "foci", "abilities"];
  if (!supported.some(key => Array.isArray(payload[key]))) throw new Error(c2tLocalize("C2T.Importer.NoCollections"));
  for (const key of supported) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) throw new Error(`${key}: ${c2tLocalize("C2T.Importer.MustBeArray")}`);
    for (const entry of payload[key] ?? []) {
      if (!entry || typeof entry !== "object" || !entry.name) throw new Error(`${key}: ${c2tLocalize("C2T.Importer.MissingName")}`);
    }
  }
}

export async function importCypherContent(payload, options = {}) {
  if (!game.user.isGM) throw new Error(c2tLocalize("C2T.GMOnly"));
  validatePayload(payload);
  const mode = options.mode === "replace" ? "replace" : "update";
  const prefix = slugify(options.prefix ?? payload.meta?.packPrefix ?? "cypher-2");
  const labels = payload.meta?.labels ?? {};
  const summary = {};
  const abilityUuids = new Map();

  if (Array.isArray(payload.abilities)) {
    const pack = await ensureWorldPack({name: `${prefix}-abilities`, label: labels.abilities ?? "Cypher 2 — Abilities", type: "Item"});
    const docs = payload.abilities.map(abilityData);
    summary.abilities = await upsertDocuments(pack, docs, mode);
    const imported = await pack.getDocuments();
    for (const doc of imported) {
      const sourceId = doc.getFlag(C2T_ID, "sourceId");
      if (!sourceId) continue;
      abilityUuids.set(sourceId, doc.uuid);
      abilityUuids.set(slugify(doc.name), doc.uuid);
      abilityUuids.set(doc.name, doc.uuid);
    }
  }

  for (const category of ["types", "foci"]) {
    if (!Array.isArray(payload[category])) continue;
    const defaultLabel = category === "types" ? "Cypher 2 — Types" : "Cypher 2 — Foci";
    const pack = await ensureWorldPack({name: `${prefix}-${category}`, label: labels[category] ?? defaultLabel, type: "JournalEntry"});
    const docs = payload[category].map(entry => journalData(entry, category, abilityUuids));
    summary[category] = await upsertDocuments(pack, docs, mode);
  }

  await game.settings.set(C2T_ID, "lastImport", JSON.stringify({date: new Date().toISOString(), meta: payload.meta ?? {}, summary}));
  return summary;
}

export class CypherContentImporter extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "cypher-2-toolkit-importer",
      title: "C2T.Importer.Title",
      template: `modules/${C2T_ID}/templates/importer.hbs`,
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false
    });
  }

  getData() {
    let lastImport = null;
    try { lastImport = JSON.parse(game.settings.get(C2T_ID, "lastImport") || "null"); } catch (_) {}
    return {
      isGM: game.user.isGM,
      samplePath: `modules/${C2T_ID}/samples/content-example.json`,
      lastImport
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("[data-action='download-sample']").on("click", async event => {
      event.preventDefault();
      const response = await fetch(`modules/${C2T_ID}/samples/content-example.json`);
      const text = await response.text();
      saveDataToFile(text, "application/json", "cypher-2-content-example.json");
    });
  }

  async _updateObject(_event, formData) {
    const input = this.element.find("input[name='contentFile']")[0];
    const file = input?.files?.[0];
    if (!file) return ui.notifications.warn(c2tLocalize("C2T.Importer.SelectFile"));
    try {
      const payload = JSON.parse(await file.text());
      const summary = await importCypherContent(payload, {
        mode: formData.mode,
        prefix: formData.prefix
      });
      const lines = Object.entries(summary).map(([key, value]) => `<li><strong>${key}</strong>: ${value.created} ${c2tLocalize("C2T.Importer.Created")}, ${value.updated} ${c2tLocalize("C2T.Importer.Updated")}</li>`).join("");
      ui.notifications.info(c2tLocalize("C2T.Importer.Success"));
      new Dialog({
        title: c2tLocalize("C2T.Importer.Result"),
        content: `<div class="c2t-result"><ul>${lines}</ul></div>`,
        buttons: {ok: {label: "OK"}}
      }).render(true);
      this.render(false);
    } catch (error) {
      console.error(`${C2T_ID} | Import failed`, error);
      ui.notifications.error(`${c2tLocalize("C2T.Importer.Failed")}: ${error.message}`);
    }
  }
}
