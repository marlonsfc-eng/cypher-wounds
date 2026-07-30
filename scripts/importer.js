const C2T_ID = "cypher-2-toolkit";

function c2tLocalize(key) { return game.i18n.localize(key); }
function slugify(value) {
  return String(value ?? "entry").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "entry";
}
function cleanObject(value) { return foundry.utils.deepClone(value ?? {}); }
function getSourceId(entry, category) { return String(entry.id ?? entry.sourceId ?? `${category}.${slugify(entry.name)}`); }
function htmlFromEntry(entry) {
  if (entry.html) return String(entry.html);
  if (entry.description) return `<div class="c2t-imported-description">${String(entry.description)}</div>`;
  return "<p></p>";
}

function buildImportContext(payload) {
  const types = new Map();
  const foci = new Map();
  for (const entry of payload.types ?? []) {
    const id = getSourceId(entry, "types");
    types.set(id, entry);
    types.set(slugify(entry.name), entry);
    types.set(id.replace(/^type\./, ""), entry);
  }
  for (const entry of payload.foci ?? []) {
    const id = getSourceId(entry, "foci");
    foci.set(id, entry);
    foci.set(slugify(entry.name), entry);
    foci.set(id.replace(/^focus\./, ""), entry);
  }
  return {payload, types, foci};
}

function resolveOrigin(entry, category, context) {
  const explicit = entry.origin ?? entry.sourceOrigin;
  if (explicit && typeof explicit === "object") {
    return {
      category: String(explicit.category ?? explicit.type ?? "general").toLowerCase(),
      id: explicit.id ? String(explicit.id) : null,
      name: String(explicit.name ?? explicit.label ?? "General Abilities")
    };
  }
  if (category !== "abilities") return null;

  const sourceId = getSourceId(entry, category);
  const abilityPrefix = sourceId.replace(/^ability\./, "");
  for (const sourceCategory of ["types", "foci"]) {
    const map = context[sourceCategory];
    for (const [key, source] of map.entries()) {
      if (!key || key.includes(".")) continue;
      if (abilityPrefix.startsWith(`${key}.`)) {
        return {
          category: sourceCategory === "types" ? "type" : "focus",
          id: getSourceId(source, sourceCategory),
          name: String(source.name)
        };
      }
    }
  }
  return {category: "general", id: null, name: "General Abilities"};
}

function itemData(entry, category="abilities", context=null) {
  const base = cleanObject(entry.document ?? entry.data);
  const origin = resolveOrigin(entry, category, context ?? {types:new Map(), foci:new Map()});
  const system = foundry.utils.mergeObject({
    description: htmlFromEntry(entry), archived: false, favorite: false,
    basic: { cost: Number(entry.cost ?? 0) || 0, pool: String(entry.pool ?? "Pool") },
    settings: {
      general: { sorting: String(entry.sorting ?? (category === "types" ? "Type" : category === "foci" ? "Focus" : "Ability")), spellTier: String(entry.spellTier ?? "low"), unmaskedForm: "Mask" },
      rollButton: {
        pool: String(entry.rollPool ?? entry.pool ?? "Pool"), skill: String(entry.skill ?? "Practiced"),
        assets: Number(entry.assets ?? 0) || 0, effort1: 0, effort2: 0, effort3: 0,
        freeEffort: Number(entry.freeEffort ?? 0) || 0,
        stepModifier: String(entry.stepModifier ?? "eased"), additionalSteps: Number(entry.additionalSteps ?? 0) || 0,
        additionalCost: Number(entry.additionalCost ?? 0) || 0, damage: Number(entry.damage ?? 0) || 0,
        damagePerLOE: Number(entry.damagePerLOE ?? 3) || 3, teen: "", bonus: Number(entry.bonus ?? 0) || 0,
        macroUuid: "", macroExecuteAsGM: false
      }
    }
  }, cleanObject(base.system), {inplace:false, overwrite:true});

  return foundry.utils.mergeObject({
    name: String(entry.name ?? "Unnamed Entry"), type: String(base.type ?? entry.type ?? "ability"),
    img: String(base.img ?? entry.img ?? "icons/svg/book.svg"), system,
    flags: { [C2T_ID]: {
      sourceId: getSourceId(entry, category), category, tier: entry.tier ?? null, source: entry.source ?? null,
      useMode: entry.useMode ?? "chat", abilities: Array.isArray(entry.abilities) ? entry.abilities : [],
      apply: entry.apply ?? null, origin
    }}
  }, base, {inplace:false, overwrite:true});
}

async function ensureWorldPack({name,label,type}) {
  const collection=`world.${name}`; let pack=game.packs.get(collection);
  if(!pack) pack=await foundry.documents.collections.CompendiumCollection.createCompendium({name,label,type,package:"world"});
  if(pack.locked) await pack.configure({locked:false});
  return pack;
}

function compendiumFolders(pack) {
  const collected = new Map();
  const add = folder => { if (folder?.id) collected.set(folder.id, folder); };
  const own = pack.folders?.contents ?? pack.folders ?? [];
  for (const folder of own) add(folder);
  for (const folder of game.folders ?? []) {
    const collection = folder.pack ?? folder.compendium?.collection;
    if (collection === pack.collection) add(folder);
  }
  return [...collected.values()];
}

function folderParentId(folder) {
  return folder?.folder?.id ?? folder?.folder ?? null;
}

async function ensureCompendiumFolder(pack, name, parentId=null) {
  const existing = compendiumFolders(pack).find(folder => folder.name === name && folderParentId(folder) === (parentId ?? null));
  if (existing) return existing;
  const data = {name, type: pack.documentName ?? "Item", folder: parentId ?? null, sorting: "a"};
  try {
    const FolderClass = CONFIG.Folder?.documentClass ?? globalThis.Folder;
    return await FolderClass.create(data, {pack: pack.collection});
  } catch (error) {
    console.warn(`${C2T_ID} | Could not create compendium folder ${name}`, error);
    return null;
  }
}

async function folderForEntry(pack, entry, category, context) {
  if (category === "abilities") {
    const origin = resolveOrigin(entry, category, context);
    const rootName = origin?.category === "type" ? "Types" : origin?.category === "focus" ? "Foci" : "General Abilities";
    const root = await ensureCompendiumFolder(pack, rootName);
    if (!origin || origin.category === "general") return root?.id ?? null;
    const source = await ensureCompendiumFolder(pack, origin.name, root?.id ?? null);
    const tier = Number(entry.tier);
    if (Number.isFinite(tier) && tier > 0) {
      const tierFolder = await ensureCompendiumFolder(pack, `Tier ${tier}`, source?.id ?? root?.id ?? null);
      return tierFolder?.id ?? source?.id ?? root?.id ?? null;
    }
    return source?.id ?? root?.id ?? null;
  }

  const group = entry.group ?? entry.genre ?? entry.category;
  if (group) return (await ensureCompendiumFolder(pack, String(group)))?.id ?? null;
  return null;
}

async function deleteOwnedFolders(pack) {
  const owned = compendiumFolders(pack).filter(folder => folder.getFlag?.(C2T_ID, "managed") || ["Types", "Foci", "General Abilities"].includes(folder.name));
  if (!owned.length) return;
  const ids = owned.sort((a,b)=>(b.depth??0)-(a.depth??0)).map(folder=>folder.id);
  try {
    const FolderClass = CONFIG.Folder?.documentClass ?? globalThis.Folder;
    await FolderClass.deleteDocuments(ids, {pack: pack.collection, deleteSubfolders: true, deleteContents: false});
  } catch (error) {
    console.warn(`${C2T_ID} | Could not clean old compendium folders`, error);
  }
}

async function markFolderManaged(folder) {
  if (!folder?.setFlag) return;
  try { await folder.setFlag(C2T_ID, "managed", true); } catch (_) {}
}

async function upsertDocuments(pack, entries, category, context, mode="update") {
  const existing=await pack.getDocuments();
  const bySource=new Map(existing.map(doc=>[doc.getFlag(C2T_ID,"sourceId"),doc]));
  let created=0,updated=0,deleted=0;
  if(mode==="replace") {
    const owned=existing.filter(doc=>doc.getFlag(C2T_ID,"sourceId"));
    if(owned.length){await pack.documentClass.deleteDocuments(owned.map(doc=>doc.id),{pack:pack.collection});deleted=owned.length;bySource.clear();}
    await deleteOwnedFolders(pack);
  }
  for(const entry of entries){
    const data=itemData(entry,category,context);
    const folderId=await folderForEntry(pack,entry,category,context);
    if(folderId) data.folder=folderId;
    const sourceId=foundry.utils.getProperty(data,`flags.${C2T_ID}.sourceId`); const match=bySource.get(sourceId);
    if(match&&mode==="update"){const update=foundry.utils.deepClone(data);update._id=match.id;await pack.documentClass.updateDocuments([update],{pack:pack.collection});updated++;}
    else {await pack.documentClass.createDocuments([data],{pack:pack.collection});created++;}
  }
  for (const folder of compendiumFolders(pack)) {
    if (["Types", "Foci", "General Abilities"].includes(folder.name) || folderParentId(folder)) await markFolderManaged(folder);
  }
  await pack.getIndex({fields:["name","folder","flags.cypher-2-toolkit.origin","flags.cypher-2-toolkit.tier"]});
  return {created,updated,deleted};
}

function validatePayload(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload)) throw new Error(c2tLocalize("C2T.Importer.InvalidRoot"));
  const supported=["types","foci","abilities"];
  if(!supported.some(key=>Array.isArray(payload[key]))) throw new Error(c2tLocalize("C2T.Importer.NoCollections"));
  for(const key of supported){if(payload[key]!==undefined&&!Array.isArray(payload[key])) throw new Error(`${key}: ${c2tLocalize("C2T.Importer.MustBeArray")}`);for(const entry of payload[key]??[]){if(!entry||typeof entry!=="object"||!entry.name) throw new Error(`${key}: ${c2tLocalize("C2T.Importer.MissingName")}`);}}
}

export async function importCypherContent(payload,options={}){
  if(!game.user.isGM) throw new Error(c2tLocalize("C2T.GMOnly")); validatePayload(payload);
  const mode=options.mode==="replace"?"replace":"update"; const prefix=slugify(options.prefix??payload.meta?.packPrefix??"cypher-2");
  const labels=payload.meta?.labels??{}; const summary={}; const context=buildImportContext(payload);
  for(const category of ["abilities","types","foci"]){
    if(!Array.isArray(payload[category])) continue;
    const defaultLabel=category==="abilities"?"Cypher 2 — Abilities":category==="types"?"Cypher 2 — Types":"Cypher 2 — Foci";
    const pack=await ensureWorldPack({name:`${prefix}-${category}`,label:labels[category]??defaultLabel,type:"Item"});
    summary[category]=await upsertDocuments(pack,payload[category],category,context,mode);
  }
  await game.settings.set(C2T_ID,"lastImport",JSON.stringify({date:new Date().toISOString(),meta:payload.meta??{},summary})); return summary;
}

export class CypherContentImporter extends FormApplication {
  static get defaultOptions(){return foundry.utils.mergeObject(super.defaultOptions,{id:"cypher-2-toolkit-importer",title:"C2T.Importer.Title",template:`modules/${C2T_ID}/templates/importer.hbs`,width:600,height:"auto",closeOnSubmit:false,submitOnChange:false});}
  getData(){let lastImport=null;try{lastImport=JSON.parse(game.settings.get(C2T_ID,"lastImport")||"null");}catch(_){}return{isGM:game.user.isGM,samplePath:`modules/${C2T_ID}/samples/content-example.json`,lastImport};}
  activateListeners(html){super.activateListeners(html);html.find("[data-action='download-sample']").on("click",async e=>{e.preventDefault();const r=await fetch(`modules/${C2T_ID}/samples/content-example.json`);saveDataToFile(await r.text(),"application/json","cypher-2-content-example.json");});}
  async _updateObject(_event,formData){const input=this.element.find("input[name='contentFile']")[0];const file=input?.files?.[0];if(!file)return ui.notifications.warn(c2tLocalize("C2T.Importer.SelectFile"));try{const summary=await importCypherContent(JSON.parse(await file.text()),{mode:formData.mode,prefix:formData.prefix});const lines=Object.entries(summary).map(([k,v])=>`<li><strong>${k}</strong>: ${v.created} ${c2tLocalize("C2T.Importer.Created")}, ${v.updated} ${c2tLocalize("C2T.Importer.Updated")}</li>`).join("");ui.notifications.info(c2tLocalize("C2T.Importer.Success"));new Dialog({title:c2tLocalize("C2T.Importer.Result"),content:`<div class="c2t-result"><ul>${lines}</ul></div>`,buttons:{ok:{label:"OK"}}}).render(true);this.render(false);}catch(error){console.error(`${C2T_ID} | Import failed`,error);ui.notifications.error(`${c2tLocalize("C2T.Importer.Failed")}: ${error.message}`);}}
}
