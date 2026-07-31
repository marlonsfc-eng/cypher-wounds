const ID = "cypher-2-toolkit";
const fget = (document, key) => document?.getFlag?.(ID, key);

async function findImportedAbility(sourceId) {
  for (const pack of game.packs) {
    if (pack.documentName !== "Item" || !pack.collection.startsWith("world.")) continue;
    const documents = await pack.getDocuments();
    const found = documents.find(document => document.getFlag(ID, "sourceId") === sourceId);
    if (found) return found;
  }
  return null;
}

async function chooseEdge() {
  return new Promise(resolve => new Dialog({
    title: "Barbarian — Edge",
    content: "<p>Choose the Pool that gains +1 Edge.</p>",
    buttons: {
      might: { label: "Might", callback: () => resolve("might") },
      speed: { label: "Speed", callback: () => resolve("speed") },
      intellect: { label: "Intellect", callback: () => resolve("intellect") }
    },
    close: () => resolve(null)
  }).render(true));
}

async function applyPackage(item) {
  const actor = item.parent;
  if (!actor || actor.documentName !== "Actor") return;
  const category = fget(item, "category");
  if (!["types", "foci"].includes(category) || fget(item, "applied")) return;

  const apply = fget(item, "apply") ?? {};
  const update = {};
  if (category === "types") update["system.basic.type"] = item.name;
  if (category === "foci") update["system.basic.focus"] = item.name;

  for (const [pool, amount] of Object.entries(apply.pools ?? {})) {
    const max = foundry.utils.getProperty(actor, `system.pools.${pool}.max`) ?? 0;
    const value = foundry.utils.getProperty(actor, `system.pools.${pool}.value`) ?? 0;
    update[`system.pools.${pool}.max`] = max + Number(amount || 0);
    update[`system.pools.${pool}.value`] = value + Number(amount || 0);
  }

  if (apply.edgeChoice) {
    const pool = await chooseEdge();
    if (pool) {
      const edge = foundry.utils.getProperty(actor, `system.pools.${pool}.edge`) ?? 0;
      update[`system.pools.${pool}.edge`] = edge + Number(apply.edgeChoice);
    }
  }

  if (Object.keys(update).length) await actor.update(update);

  const refs = fget(item, "abilities") ?? [];
  const toCreate = [];
  for (const ref of refs) {
    if (actor.items.some(existing => existing.getFlag(ID, "sourceId") === ref)) continue;
    const source = await findImportedAbility(ref);
    if (source) {
      const data = source.toObject();
      delete data._id;
      toCreate.push(data);
    }
  }
  if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);

  await item.setFlag(ID, "applied", true);
  ui.notifications.info(`${item.name} applied to ${actor.name}.`);
}

async function useImportedAbility(actor, item) {
  const cost = Number(item.system.basic.cost ?? 0);
  const pool = String(item.system.basic.pool ?? "Pool");
  if (cost > 0 && ["Might", "Speed", "Intellect"].includes(pool)) {
    const key = pool.toLowerCase();
    const current = actor.system.pools?.[key]?.value ?? 0;
    const edge = actor.system.pools?.[key]?.edge ?? 0;
    const paid = Math.max(0, cost - edge);
    if (current < paid) return ui.notifications.warn(`${actor.name} does not have enough ${pool}.`);
    await actor.update({ [`system.pools.${key}.value`]: current - paid });
  }
  const content = `<div class="c2t-ability-card"><h3>${item.name}</h3>${item.system.description || ""}</div>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

Hooks.on("createItem", async item => {
  try { await applyPackage(item); }
  catch (error) {
    console.error(`${ID} package application failed`, error);
    ui.notifications.error(`Cypher 2 Toolkit: ${error.message}`);
  }
});

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app.actor;
  if (!actor) return;

  html.find("li.item[data-item-id]").each((_, element) => {
    const row = $(element);
    const item = actor.items.get(row.data("item-id"));
    if (!item || fget(item, "category") !== "abilities") return;

    // Imported abilities use the Cypher System's native item-pay/roll control.
    // Remove buttons created by older Toolkit versions to avoid overlapping click handlers.
    row.find(".c2t-use").remove();

    // Only add a fallback when the current Cypher sheet exposes no native roll button.
    if (!row.find(".item-pay").length && !row.find(".c2t-native-fallback").length) {
      const button = $('<a class="item-control c2t-native-fallback" title="Post ability to chat"><i class="fa-solid fa-message"></i></a>');
      button.on("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        await useImportedAbility(actor, item);
      });
      row.find(".item-controls").prepend(button);
    }
  });
});
