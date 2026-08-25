const MODULE_ID = "cypher-2-toolkit";
const CAROLINGIAN_ID = "crlngn-ui";
const VISIBILITY_SETTING = "carolingianWoundsVisibility";
const ENABLED_SETTING = "carolingianWounds";
const TRACKER_SELECTOR = "#combat-popout .combat-tracker";
let carouselObserver = null;
let observedTracker = null;
let refreshTimer = null;
let retryCount = 0;

function carolingianActive() {
  return Boolean(game.modules.get(CAROLINGIAN_ID)?.active);
}

function integrationEnabled() {
  return carolingianActive() && game.settings.get(MODULE_ID, ENABLED_SETTING);
}

function canSeeWounds(actor) {
  const visibility = game.settings.get(MODULE_ID, VISIBILITY_SETTING);
  if (visibility === "all") return true;
  if (visibility === "gm") return game.user.isGM;
  return game.user.isGM || actor.testUserPermission(game.user, "OWNER");
}

function isWoundActor(actor) {
  return actor?.type === "pc" || Boolean(actor?.getFlag?.(MODULE_ID, "wounds"));
}

function severityLabel(severity) {
  return ({minor: "I", moderate: "II", major: "III"})[severity];
}

function severityName(severity) {
  return game.i18n.localize(({minor: "CW.Minor", moderate: "CW.Moderate", major: "CW.Major"})[severity]);
}

function makeSeverityChip(severity, wounds) {
  const current = Number(wounds.current?.[severity] ?? 0);
  const capacity = Number(wounds.capacity?.[severity] ?? 0);
  const chip = document.createElement("span");
  chip.className = `c2t-carousel-wound-chip ${severity}${current ? " marked" : " empty"}`;
  chip.title = `${severityName(severity)}: ${current}/${capacity}`;
  chip.innerHTML = `<b>${severityLabel(severity)}</b><span>${current}/${capacity}</span>`;
  return chip;
}

async function renderCard(card, combat) {
  card.querySelector(":scope > .c2t-carousel-wounds")?.remove();
  const combatant = combat?.combatants?.get(card.dataset.combatantId);
  const actor = combatant?.actor;
  if (!actor || !isWoundActor(actor) || !canSeeWounds(actor) || !game.cypherWounds?.getData) return;
  const wounds = await game.cypherWounds.getData(actor);
  if (!card.isConnected || card.querySelector(":scope > .c2t-carousel-wounds")) return;
  const strip = document.createElement("div");
  strip.className = "c2t-carousel-wounds";
  strip.dataset.actorId = actor.id;
  for (const severity of ["minor", "moderate", "major"]) strip.appendChild(makeSeverityChip(severity, wounds));
  const hindrance = Number(game.cypherWounds.hindrance?.(wounds) ?? 0);
  if (hindrance) {
    const badge = document.createElement("span");
    badge.className = "c2t-carousel-hindrance";
    badge.title = game.i18n.format("C2T.Carolingian.HindranceTitle", {value: hindrance});
    badge.textContent = `H${hindrance}`;
    strip.appendChild(badge);
  }
  const resource = card.querySelector(":scope > .token-resource");
  resource ? resource.before(strip) : card.appendChild(strip);
}

function observeTracker(tracker) {
  carouselObserver?.disconnect();
  observedTracker = tracker;
  carouselObserver = new MutationObserver(mutations => {
    const relevant = mutations.some(mutation => Array.from(mutation.addedNodes).some(node =>
      node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains("c2t-carousel-wounds")) ||
      Array.from(mutation.removedNodes).some(node => node.nodeType === Node.ELEMENT_NODE && !node.classList?.contains("c2t-carousel-wounds")));
    if (relevant) scheduleRefresh(60);
  });
  carouselObserver.observe(tracker, {childList: true, subtree: true});
}

async function refreshCarouselWounds() {
  window.clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!integrationEnabled()) {
    carouselObserver?.disconnect();
    observedTracker = null;
    document.querySelectorAll(".c2t-carousel-wounds").forEach(element => element.remove());
    return;
  }
  const tracker = document.querySelector(TRACKER_SELECTOR);
  if (!tracker) {
    carouselObserver?.disconnect();
    observedTracker = null;
    if (retryCount < 5) {
      retryCount += 1;
      scheduleRefresh(250);
    }
    return;
  }
  retryCount = 0;
  carouselObserver?.disconnect();
  const combat = game.combat;
  const cards = Array.from(tracker.querySelectorAll(":scope > li.combatant[data-combatant-id]"));
  await Promise.all(cards.map(card => renderCard(card, combat)));
  observeTracker(tracker);
}

function scheduleRefresh(delay = 80) {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => refreshCarouselWounds().catch(error =>
    console.error(`${MODULE_ID} | Carolingian wound integration failed`, error)), delay);
}

function actorWoundsChanged(changes) {
  return foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.wounds`) ||
    foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.capacityBonuses`);
}

function itemAffectsActor(item) {
  return item?.parent?.documentName === "Actor";
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, ENABLED_SETTING, {
    name: "C2T.Carolingian.Settings.Enabled.Name",
    hint: "C2T.Carolingian.Settings.Enabled.Hint",
    scope: "world", config: true, type: Boolean, default: true, restricted: true,
    onChange: () => scheduleRefresh(0)
  });
  game.settings.register(MODULE_ID, VISIBILITY_SETTING, {
    name: "C2T.Carolingian.Settings.Visibility.Name",
    hint: "C2T.Carolingian.Settings.Visibility.Hint",
    scope: "world", config: true, type: String, default: "all", restricted: true,
    choices: {
      all: "C2T.Carolingian.Settings.Visibility.All",
      owners: "C2T.Carolingian.Settings.Visibility.Owners",
      gm: "C2T.Carolingian.Settings.Visibility.GM"
    },
    onChange: () => scheduleRefresh(0)
  });
});

Hooks.once("ready", () => {
  if (carolingianActive()) scheduleRefresh(150);
});

Hooks.on("renderCombatTracker", () => scheduleRefresh(100));
Hooks.on("renderApplicationV2", app => {
  if (app?.constructor?.name === "CombatTracker" || app?.options?.id === "combat") scheduleRefresh(100);
});
Hooks.on("combatStart", () => scheduleRefresh(150));
Hooks.on("combatRound", () => scheduleRefresh(150));
Hooks.on("combatTurnChange", () => scheduleRefresh(100));
Hooks.on("updateCombat", () => scheduleRefresh(100));
Hooks.on("createCombatant", () => scheduleRefresh(120));
Hooks.on("deleteCombatant", () => scheduleRefresh(120));
Hooks.on("updateActor", (_actor, changes) => { if (actorWoundsChanged(changes)) scheduleRefresh(40); });
Hooks.on("createItem", item => { if (itemAffectsActor(item)) scheduleRefresh(60); });
Hooks.on("updateItem", item => { if (itemAffectsActor(item)) scheduleRefresh(60); });
Hooks.on("deleteItem", item => { if (itemAffectsActor(item)) scheduleRefresh(60); });
