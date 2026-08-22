const MODULE_ID = "cypher-2-toolkit";
const RESOURCE_CACHE = new Map();
const PC_POOL_CONFIG = [
  ["might", "C2T.Resources.Might", "M"],
  ["speed", "C2T.Resources.Speed", "S"],
  ["intellect", "C2T.Resources.Intellect", "I"],
  ["additional", "C2T.Resources.Additional", "+"]
];
const SUPPORTED_ACTOR_TYPES = new Set(["pc", "npc", "companion", "community", "vehicle"]);

const numberValue = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function localize(key) {
  return game.i18n.localize(key);
}

function escapeHtml(value) {
  const text = String(value ?? "");
  if (foundry.utils.escapeHTML) return foundry.utils.escapeHTML(text);
  return text.replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  })[character]);
}

function isSupportedActor(actor) {
  return actor?.documentName === "Actor" && SUPPORTED_ACTOR_TYPES.has(actor.type);
}

function activePoolRoot(actor) {
  const isTeen = actor?.system?.basic?.unmaskedForm === "Teen";
  return isTeen ? actor?.system?.teen?.pools : actor?.system?.pools;
}

function hasAdditionalPool(actor) {
  return Boolean(actor?.system?.settings?.general?.additionalPool?.active);
}

export function getActorResourceSnapshot(actor) {
  if (!isSupportedActor(actor)) return null;

  const stats = [];
  const addStat = (key, labelKey, shortLabel, value, max = null) => stats.push({
    key,
    label: localize(labelKey),
    shortLabel,
    value: numberValue(value),
    max: max === null || max === undefined ? null : numberValue(max)
  });

  if (actor.type !== "pc") {
    const health = actor.system?.pools?.health;
    if (health) addStat("health", "C2T.Resources.Health", "HP", health.value, health.max);

    if (actor.type === "npc" || actor.type === "companion") {
      addStat("level", "C2T.Resources.Level", "LV", actor.system?.basic?.level);
      addStat("damage", "C2T.Resources.Damage", "DMG", actor.system?.combat?.damage);
      addStat("armor", "C2T.Resources.Armor", "AR", actor.system?.combat?.armor);
    } else if (actor.type === "community") {
      const infrastructure = actor.system?.pools?.infrastructure;
      if (infrastructure) {
        addStat("infrastructure", "C2T.Resources.Infrastructure", "INF", infrastructure.value, infrastructure.max);
      }
      addStat("rank", "C2T.Resources.Rank", "RK", actor.system?.basic?.rank);
      addStat("damage", "C2T.Resources.Damage", "DMG", actor.system?.combat?.damage);
      addStat("armor", "C2T.Resources.Armor", "AR", actor.system?.combat?.armor);
    } else if (actor.type === "vehicle") {
      addStat("level", "C2T.Resources.Level", "LV", actor.system?.basic?.level);
      addStat("crew", "C2T.Resources.Crew", "CR", actor.system?.basic?.crew);
      addStat("weapons", "C2T.Resources.Weapons", "WP", actor.system?.basic?.weaponSystems);
    }

    return {actorType: actor.type, stats};
  }

  const poolRoot = activePoolRoot(actor) ?? {};
  addStat("xp", "C2T.Resources.XP", "XP", actor.system?.basic?.xp);
  for (const [key, labelKey, shortLabel] of PC_POOL_CONFIG) {
    if (key === "additional" && !hasAdditionalPool(actor)) continue;
    addStat(key, labelKey, shortLabel, poolRoot?.[key]?.value, poolRoot?.[key]?.max);
  }

  return {actorType: actor.type, stats};
}

function snapshotChanges(previous, current) {
  if (!previous || !current) return [];
  const changes = [];

  const previousStats = new Map((previous.stats ?? []).map(stat => [stat.key, stat]));
  const currentStats = new Map((current.stats ?? []).map(stat => [stat.key, stat]));
  const statKeys = new Set([...previousStats.keys(), ...currentStats.keys()]);
  const formattedValue = stat => stat.max === null ? String(stat.value) : `${stat.value}/${stat.max}`;

  for (const key of statKeys) {
    const before = previousStats.get(key);
    const after = currentStats.get(key);
    if (!before || !after) continue;
    if (before.value === after.value && before.max === after.max) continue;
    changes.push({
      label: after.label,
      before: formattedValue(before),
      after: formattedValue(after)
    });
  }

  return changes;
}

function loggingClient(userId) {
  if (!game.user?.isGM) return false;

  const initiatingUser = game.users.get(userId);
  if (initiatingUser?.isGM) return game.user.id === userId;

  const activeGMs = game.users
    .filter(user => user.isGM && user.active)
    .sort((left, right) => left.id.localeCompare(right.id));
  return activeGMs[0]?.id === game.user.id;
}

async function whisperResourceChanges(actor, changes, userId) {
  const recipients = ChatMessage.getWhisperRecipients("GM").map(user => user.id);
  if (!recipients.length) return;

  const userName = game.users.get(userId)?.name ?? localize("C2T.Resources.UnknownUser");
  const entries = changes.map(change => `
    <li>
      <strong>${escapeHtml(change.label)}</strong>
      <span>${escapeHtml(change.before)} <i class="fa-solid fa-arrow-right-long"></i> ${escapeHtml(change.after)}</span>
    </li>
  `).join("");
  const content = `
    <div class="c2t-resource-audit">
      <header><i class="fa-solid fa-eye"></i> ${escapeHtml(localize("C2T.Resources.AuditTitle"))}</header>
      <p><strong>${escapeHtml(actor.name)}</strong> · ${escapeHtml(userName)}</p>
      <ul>${entries}</ul>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({actor}),
    content,
    whisper: recipients
  });
}

function seedResourceCache() {
  RESOURCE_CACHE.clear();
  for (const actor of game.actors ?? []) {
    const snapshot = getActorResourceSnapshot(actor);
    if (snapshot) RESOURCE_CACHE.set(actor.id, snapshot);
  }
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "showResourcesInPanel", {
    name: "C2T.Resources.Settings.Panel.Name",
    hint: "C2T.Resources.Settings.Panel.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => Hooks.callAll("c2tRefreshResourcePanel")
  });
  game.settings.register(MODULE_ID, "resourceAudit", {
    name: "C2T.Resources.Settings.Audit.Name",
    hint: "C2T.Resources.Settings.Audit.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", seedResourceCache);

Hooks.on("createActor", actor => {
  const snapshot = getActorResourceSnapshot(actor);
  if (snapshot) RESOURCE_CACHE.set(actor.id, snapshot);
});

Hooks.on("deleteActor", actor => RESOURCE_CACHE.delete(actor.id));

Hooks.on("updateActor", async (actor, _changes, _options, userId) => {
  const current = getActorResourceSnapshot(actor);
  if (!current) return;

  const previous = RESOURCE_CACHE.get(actor.id);
  RESOURCE_CACHE.set(actor.id, current);
  const changes = snapshotChanges(previous, current);
  if (!changes.length) return;

  Hooks.callAll("c2tRefreshResourcePanel", actor);
  if (!game.settings.get(MODULE_ID, "resourceAudit")) return;
  if (!loggingClient(userId)) return;

  try {
    await whisperResourceChanges(actor, changes, userId);
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to create the private resource audit message.`, error);
  }
});


