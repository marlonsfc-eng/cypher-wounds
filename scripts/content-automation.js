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
  try {
    // Use the Cypher System's own roll engine. This is intentionally loaded
    // at click time so the Toolkit remains compatible with Foundry v13 and v14.
    const macros = await import("/systems/cyphersystem/module/macros/macros.js");
    if (typeof macros.allInOneRollDialog !== "function") {
      throw new Error("The Cypher System roll function was not found.");
    }

    const roll = item.system?.settings?.rollButton ?? {};
    const pool = String(roll.pool ?? item.system?.basic?.pool ?? "Pool");
    const skill = String(roll.skill ?? "Practiced");
    const assets = Number(roll.assets ?? 0) || 0;
    const effort1 = Number(roll.effort1 ?? 0) || 0;
    const effort2 = Number(roll.effort2 ?? 0) || 0;
    const effort3 = Number(roll.effort3 ?? 0) || 0;
    const additionalCost = Number(roll.additionalCost ?? 0) || 0;
    const additionalSteps = Number(roll.additionalSteps ?? 0) || 0;
    const stepModifier = String(roll.stepModifier ?? "eased");
    const damage = Number(roll.damage ?? 0) || 0;
    const damagePerLOE = Number(roll.damagePerLOE ?? 3) || 3;
    const teen = String(roll.teen ?? "");
    const bonus = Number(roll.bonus ?? 0) || 0;

    // Keep the normal dialog visible. The system itself handles ability cost,
    // Edge, Effort, damage, chat output, and the Toolkit wound modifier.
    await macros.allInOneRollDialog(
      actor,
      pool,
      skill,
      assets,
      effort1,
      effort2,
      additionalCost,
      additionalSteps,
      stepModifier,
      item.name,
      damage,
      effort3,
      damagePerLOE,
      teen,
      false,
      false,
      item.id,
      bonus
    );
  } catch (error) {
    console.error(`${ID} imported ability roll failed`, error);
    ui.notifications.error(`Cypher 2 Toolkit: ${error.message}`);
  }
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

  // Foundry v13 supplies a jQuery object here. Foundry v14 may supply either
  // jQuery or an HTMLElement depending on the sheet generation.
  const root = html?.find ? html : $(html);
  root.find("li.item[data-item-id]").each((_, element) => {
    const row = $(element);
    const itemId = row.attr("data-item-id") ?? row.data("item-id");
    const item = actor.items.get(itemId);
    if (!item || fget(item, "category") !== "abilities") return;

    // Imported abilities receive one Toolkit button that calls the system's
    // native all-in-one roll function directly. This avoids relying on the
    // sheet's version-specific click listener.
    row.find(".c2t-use, .c2t-native-fallback").remove();
    const button = $('<a class="item-control c2t-use" title="Use ability"><i class="fa-solid fa-play"></i></a>');
    button.on("click", async event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      await useImportedAbility(actor, item);
    });
    row.find(".item-controls").prepend(button);
  });
});
