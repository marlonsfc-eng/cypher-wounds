const MODULE_ID = "cypher-2-toolkit";
const RESOURCE_CACHE = new Map();
const POOL_CONFIG = [
  ["might", "C2T.Resources.Might", "M"],
  ["speed", "C2T.Resources.Speed", "S"],
  ["intellect", "C2T.Resources.Intellect", "I"],
  ["additional", "C2T.Resources.Additional", "+"]
];

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

function isPlayerCharacter(actor) {
  return actor?.documentName === "Actor" && actor.type === "pc";
}

function activePoolRoot(actor) {
  const isTeen = actor?.system?.basic?.unmaskedForm === "Teen";
  return isTeen ? actor?.system?.teen?.pools : actor?.system?.pools;
}

function hasAdditionalPool(actor) {
  return Boolean(actor?.system?.settings?.general?.additionalPool?.active);
}

export function getActorResourceSnapshot(actor) {
  if (!isPlayerCharacter(actor)) return null;

  const poolRoot = activePoolRoot(actor) ?? {};
  const pools = {};
  for (const [key, labelKey, shortLabel] of POOL_CONFIG) {
    if (key === "additional" && !hasAdditionalPool(actor)) continue;
    pools[key] = {
      key,
      label: localize(labelKey),
      shortLabel,
      value: numberValue(poolRoot?.[key]?.value),
      max: numberValue(poolRoot?.[key]?.max)
    };
  }

  return {
    xp: numberValue(actor.system?.basic?.xp),
    pools
  };
}

function snapshotChanges(previous, current) {
  if (!previous || !current) return [];
  const changes = [];

  if (previous.xp !== current.xp) {
    changes.push({
      label: localize("C2T.Resources.XP"),
      before: String(previous.xp),
      after: String(current.xp)
    });
  }

  const poolKeys = new Set([
    ...Object.keys(previous.pools ?? {}),
    ...Object.keys(current.pools ?? {})
  ]);
  for (const key of poolKeys) {
    const before = previous.pools?.[key];
    const after = current.pools?.[key];
    if (!before || !after) continue;
    if (before.value === after.value && before.max === after.max) continue;
    changes.push({
      label: after.label,
      before: `${before.value}/${before.max}`,
      after: `${after.value}/${after.max}`
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

