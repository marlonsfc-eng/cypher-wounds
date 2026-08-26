const ID = "cypher-2-toolkit";
const fget = (document, key) => document?.getFlag?.(ID, key);
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[character]);

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

async function chooseOption(title, prompt, options) {
  if (!Array.isArray(options) || !options.length) return null;
  if (options.length === 1) return options[0];
  return new Promise(resolve => {
    const buttons = {};
    options.forEach((option, index) => {
      buttons[`choice${index}`] = {
        label: String(option),
        callback: () => resolve(option)
      };
    });
    new Dialog({
      title,
      content: `<p>${prompt}</p>`,
      buttons,
      close: () => resolve(null)
    }).render(true);
  });
}

async function addTrainedSkill(actor, skillName, sourceId) {
  if (!skillName) return;
  const existing = actor.items.find(item =>
    item.type === "skill" && item.name.toLowerCase() === String(skillName).toLowerCase()
  );
  if (existing) return;
  await actor.createEmbeddedDocuments("Item", [{
    name: String(skillName),
    type: "skill",
    img: "icons/svg/book.svg",
    system: {
      description: `<p>Granted by descriptor.</p>`,
      archived: false,
      favorite: false,
      basic: { rating: "Trained" },
      settings: { general: { sorting: "Skill" } }
    },
    flags: {
      [ID]: {
        sourceId: `${sourceId}.skill.${String(skillName).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        category: "descriptor-skill"
      }
    }
  }]);
}

async function applyPackage(item) {
  const actor = item.parent;
  if (!actor || actor.documentName !== "Actor") return;
  const category = fget(item, "category");
  if (!["types", "foci", "descriptors"].includes(category) || fget(item, "applied")) return;

  const apply = fget(item, "apply") ?? {};
  const update = {};
  if (category === "types") update["system.basic.type"] = item.name;
  if (category === "foci") update["system.basic.focus"] = item.name;
  if (category === "descriptors") update["system.basic.descriptor"] = item.name;

  for (const [pool, amount] of Object.entries(apply.pools ?? {})) {
    const max = foundry.utils.getProperty(actor, `system.pools.${pool}.max`) ?? 0;
    const value = foundry.utils.getProperty(actor, `system.pools.${pool}.value`) ?? 0;
    update[`system.pools.${pool}.max`] = max + Number(amount || 0);
    update[`system.pools.${pool}.value`] = value + Number(amount || 0);
  }

  if (apply.poolChoice?.amount && Array.isArray(apply.poolChoice.options)) {
    const pool = await chooseOption(
      `${item.name} — Pool`,
      `Choose the Pool that gains +${Number(apply.poolChoice.amount)}.`,
      apply.poolChoice.options
    );
    if (pool) {
      const key = String(pool).toLowerCase();
      const max = foundry.utils.getProperty(actor, `system.pools.${key}.max`) ?? 0;
      const value = foundry.utils.getProperty(actor, `system.pools.${key}.value`) ?? 0;
      update[`system.pools.${key}.max`] = max + Number(apply.poolChoice.amount);
      update[`system.pools.${key}.value`] = value + Number(apply.poolChoice.amount);
    }
  }

  if (apply.edgeChoice) {
    const pool = await chooseEdge();
    if (pool) {
      const edge = foundry.utils.getProperty(actor, `system.pools.${pool}.edge`) ?? 0;
      update[`system.pools.${pool}.edge`] = edge + Number(apply.edgeChoice);
    }
  }

  if (Object.keys(update).length) await actor.update(update);

  if (category === "descriptors" && Array.isArray(apply.skillChoice)) {
    const skill = await chooseOption(
      `${item.name} — Skill`,
      "Choose the skill in which the character is trained.",
      apply.skillChoice
    );
    if (skill) await addTrainedSkill(actor, skill, fget(item, "sourceId") ?? item.uuid);
  }

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


function nativeRollDefaults(item) {
  const current = foundry.utils.deepClone(item.system ?? {});
  return {
    "system.version": Number(current.version ?? 2) || 2,
    "system.basic.cost": String(current.basic?.cost ?? "0"),
    "system.basic.pool": String(current.basic?.pool ?? "Pool"),
    "system.settings.general.sorting": String(current.settings?.general?.sorting ?? "Ability"),
    "system.settings.general.spellTier": String(current.settings?.general?.spellTier ?? "low"),
    "system.settings.general.unmaskedForm": String(current.settings?.general?.unmaskedForm ?? "Mask"),
    "system.settings.rollButton.pool": String(current.settings?.rollButton?.pool ?? current.basic?.pool ?? "Pool"),
    "system.settings.rollButton.skill": String(current.settings?.rollButton?.skill ?? "Practiced"),
    "system.settings.rollButton.assets": Number(current.settings?.rollButton?.assets ?? 0) || 0,
    "system.settings.rollButton.effort1": Number(current.settings?.rollButton?.effort1 ?? 0) || 0,
    "system.settings.rollButton.effort2": Number(current.settings?.rollButton?.effort2 ?? 0) || 0,
    "system.settings.rollButton.effort3": Number(current.settings?.rollButton?.effort3 ?? 0) || 0,
    "system.settings.rollButton.freeEffort": Number(current.settings?.rollButton?.freeEffort ?? 0) || 0,
    "system.settings.rollButton.stepModifier": String(current.settings?.rollButton?.stepModifier ?? "eased"),
    "system.settings.rollButton.additionalSteps": Number(current.settings?.rollButton?.additionalSteps ?? 0) || 0,
    "system.settings.rollButton.additionalCost": Number(current.settings?.rollButton?.additionalCost ?? 0) || 0,
    "system.settings.rollButton.damage": Number(current.settings?.rollButton?.damage ?? 0) || 0,
    "system.settings.rollButton.damagePerLOE": Number(current.settings?.rollButton?.damagePerLOE ?? 3) || 3,
    "system.settings.rollButton.teen": String(current.settings?.rollButton?.teen ?? ""),
    "system.settings.rollButton.bonus": Number(current.settings?.rollButton?.bonus ?? 0) || 0,
    "system.settings.rollButton.macroUuid": String(current.settings?.rollButton?.macroUuid ?? ""),
    "system.settings.rollButton.macroExecuteAsGM": Boolean(current.settings?.rollButton?.macroExecuteAsGM ?? false)
  };
}

async function normalizeImportedAbility(item) {
  if (!item || item.type !== "ability" || fget(item, "category") !== "abilities") return;
  const desired = nativeRollDefaults(item);
  const update = {};
  for (const [path, value] of Object.entries(desired)) {
    const current = foundry.utils.getProperty(item, path);
    if (current !== value) update[path] = value;
  }
  if (Object.keys(update).length) await item.update(update);
}

async function useNativeItemRoll(actor, item) {
  try {
    await normalizeImportedAbility(item);
    const macros = await import("/systems/cyphersystem/module/macros/macros.js");
    if (typeof macros.itemRollMacro !== "function") {
      throw new Error("The Cypher System native item roll function was not found.");
    }
    const macroUuid = item.system?.settings?.rollButton?.macroUuid ?? "";
    return macros.itemRollMacro(
      actor,
      item.id,
      "", "", "", "", "", "", "", "", "", "", "", "", false, "",
      macroUuid,
      ""
    );
  } catch (error) {
    console.error(`${ID} native imported ability roll failed`, error);
    ui.notifications.error(`Cypher 2 Toolkit: ${error.message}`);
  }
}

function isPlayerIntrusion(item) {
  return item?.type === "ability" && Boolean(fget(item, "playerIntrusion"));
}

function confirmPlayerIntrusion(actor, item) {
  return new Promise(resolve => {
    let answered = false;
    new Dialog({
      title: game.i18n.format("C2T.PlayerIntrusions.ConfirmTitle", {name: item.name}),
      content: `<p>${game.i18n.format("C2T.PlayerIntrusions.ConfirmUse", {actor: escapeHtml(actor.name), name: escapeHtml(item.name)})}</p><p class="hint">${game.i18n.localize("C2T.PlayerIntrusions.GmApproval")}</p>`,
      buttons: {
        use: {icon: '<i class="fa-solid fa-star"></i>', label: game.i18n.localize("C2T.PlayerIntrusions.SpendXp"), callback: () => { answered = true; resolve(true); }},
        cancel: {label: game.i18n.localize("C2T.PlayerIntrusions.Cancel"), callback: () => { answered = true; resolve(false); }}
      },
      default: "use",
      close: () => { if (!answered) resolve(false); }
    }, {width: 430}).render(true);
  });
}

async function usePlayerIntrusion(actor, item) {
  if (!isPlayerIntrusion(item) || !(game.user.isGM || actor.isOwner || item.isOwner)) return;
  const currentXp = Math.max(0, Number(actor.system?.basic?.xp) || 0);
  if (currentXp < 1) return ui.notifications.warn(game.i18n.format("C2T.PlayerIntrusions.NotEnoughXp", {actor: actor.name}));
  if (!await confirmPlayerIntrusion(actor, item)) return;
  let spent = false;
  try {
    await actor.update({"system.basic.xp": currentXp - 1});
    spent = true;
    const link = `@UUID[${item.uuid}]{${item.name}}`;
    const description = String(item.system?.description ?? item.system?.basic?.description ?? "");
    const content = await TextEditor.enrichHTML(`<article class="c2t-player-intrusion-chat"><h3><i class="fa-solid fa-star"></i> ${game.i18n.localize("C2T.PlayerIntrusions.ChatTitle")}</h3><p>${game.i18n.format("C2T.PlayerIntrusions.ChatUse", {actor: actor.name, intrusion: link})}</p>${description ? `<div>${description}</div>` : ""}</article>`, {async: true});
    await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), content});
    try {
      await item.update({
        [`flags.${ID}.intrusionUses`]: Math.max(0, Number(fget(item, "intrusionUses")) || 0) + 1,
        [`flags.${ID}.lastIntrusionUse`]: new Date().toISOString()
      });
    } catch (trackingError) {
      console.warn(`${ID} | Could not update Player Intrusion usage metadata`, trackingError);
    }
    ui.notifications.info(game.i18n.format("C2T.PlayerIntrusions.XpSpent", {actor: actor.name, name: item.name}));
  } catch (error) {
    if (spent) await actor.update({"system.basic.xp": currentXp});
    console.error(`${ID} | Player intrusion use failed`, error);
    ui.notifications.error(error.message);
  }
}

async function migrateImportedAbilities() {
  if (!game.user.isGM) return;
  for (const actor of game.actors ?? []) {
    for (const item of actor.items ?? []) await normalizeImportedAbility(item);
  }
}

Hooks.on("createItem", async item => {
  try {
    await normalizeImportedAbility(item);
    await applyPackage(item);
  }
  catch (error) {
    console.error(`${ID} package application failed`, error);
    ui.notifications.error(`Cypher 2 Toolkit: ${error.message}`);
  }
});

Hooks.once("ready", () => {
  migrateImportedAbilities().catch(error =>
    console.error(`${ID} imported ability migration failed`, error)
  );
});

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app.actor;
  if (!actor) return;

  const root = html?.find ? html : $(html);
  root.find("li.item[data-item-id]").each((_, element) => {
    const row = $(element);
    const itemId = row.attr("data-item-id") ?? row.data("item-id");
    const item = actor.items.get(itemId);
    if (!item || fget(item, "category") !== "abilities") return;

    if (isPlayerIntrusion(item)) {
      row.find(".item-roll, .c2t-native-fallback").addClass("c2t-hidden-player-intrusion-roll");
      row.find(".c2t-player-intrusion-use").remove();
      const use = $(`<a class="item-control c2t-player-intrusion-use" title="${game.i18n.localize("C2T.PlayerIntrusions.UseHint")}"><i class="fa-solid fa-star"></i><span>1 XP</span></a>`);
      use.on("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        await usePlayerIntrusion(actor, item);
      });
      const controls = row.find(".item-controls").first();
      controls.length ? controls.prepend(use) : row.append(use);
      return;
    }

    // Never alter or remove the Cypher System's native .item-roll button.
    // Only add a fallback if the active sheet template does not render it.
    row.find(".c2t-use, .c2t-native-fallback").remove();
    if (!row.find(".item-roll").length) {
      const fallback = $('<a class="item-control c2t-native-fallback" title="Roll Item"><i class="fa-solid fa-dice-d20"></i></a>');
      fallback.on("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        await useNativeItemRoll(actor, item);
      });
      row.find(".item-controls").prepend(fallback);
    }
  });
});
