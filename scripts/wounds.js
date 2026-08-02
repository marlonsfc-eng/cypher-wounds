const MODULE_ID = "cypher-2-toolkit";
const LEGACY_MODULE_ID = "cypher-wounds";
const MODEL_VERSION = 2;
const DEFAULTS = Object.freeze({ minor: 3, moderate: 3, major: 3 });
const SEVERITIES = ["minor", "moderate", "major"];

const i18n = (key, data = {}) => game.i18n.format(key, data);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function canEdit(actor) {
  if (!actor) return false;
  if (game.user.isGM) return true;
  return game.settings.get(MODULE_ID, "playersEdit") && actor.isOwner;
}

function emptyCurrent() { return { minor: 0, moderate: 0, major: 0 }; }
function emptyBonuses() { return { minor: 0, moderate: 0, major: 0 }; }

function itemWoundBonus(item) {
  const apply = item?.getFlag?.(MODULE_ID, "apply") ?? item?.flags?.[MODULE_ID]?.apply ?? {};
  const wounds = apply?.wounds ?? {};
  return {
    minor: Number(wounds.minor ?? 0) || 0,
    moderate: Number(wounds.moderate ?? 0) || 0,
    major: Number(wounds.major ?? 0) || 0
  };
}

function deriveItemBonuses(actor) {
  const total = emptyBonuses();
  for (const item of actor?.items ?? []) {
    const bonus = itemWoundBonus(item);
    for (const severity of SEVERITIES) total[severity] += bonus[severity];
  }
  return total;
}

function sumRecordedBonuses(recorded = {}) {
  const total = emptyBonuses();
  for (const source of Object.values(recorded ?? {})) {
    for (const severity of SEVERITIES) total[severity] += Number(source?.[severity] ?? 0) || 0;
  }
  return total;
}

function migrateRaw(actor, raw = {}) {
  if (raw.modelVersion === MODEL_VERSION && raw.baseCapacity) return foundry.utils.deepClone(raw);

  const oldCapacity = { ...DEFAULTS, ...(raw.capacity ?? raw.baseCapacity ?? {}) };
  const currentItemBonuses = deriveItemBonuses(actor);
  const recordedBonuses = sumRecordedBonuses(actor?.getFlag?.(MODULE_ID, "capacityBonuses") ?? {});
  const baseCapacity = {};

  for (const severity of SEVERITIES) {
    const cap = Math.max(1, Number(oldCapacity[severity]) || DEFAULTS[severity]);
    if (recordedBonuses[severity]) {
      baseCapacity[severity] = Math.max(1, cap - recordedBonuses[severity]);
    } else if (cap === DEFAULTS[severity] + currentItemBonuses[severity]) {
      baseCapacity[severity] = DEFAULTS[severity];
    } else {
      baseCapacity[severity] = cap;
    }
  }

  return {
    modelVersion: MODEL_VERSION,
    baseCapacity,
    current: { ...emptyCurrent(), ...(raw.current ?? {}) }
  };
}

function normalizeStored(actor, raw = {}) {
  const stored = migrateRaw(actor, raw);
  const baseCapacity = { ...DEFAULTS, ...(stored.baseCapacity ?? {}) };
  const current = { ...emptyCurrent(), ...(stored.current ?? {}) };
  const bonuses = deriveItemBonuses(actor);
  const capacity = {};

  for (const severity of SEVERITIES) {
    baseCapacity[severity] = Math.max(1, Number(baseCapacity[severity]) || DEFAULTS[severity]);
    capacity[severity] = Math.max(1, baseCapacity[severity] + bonuses[severity]);
    current[severity] = clamp(Number(current[severity]) || 0, 0, capacity[severity]);
  }

  return { modelVersion: MODEL_VERSION, baseCapacity, bonuses, capacity, current };
}

async function getData(actor) {
  return normalizeStored(actor, actor?.getFlag(MODULE_ID, "wounds") ?? {});
}

async function saveData(actor, data) {
  const clean = normalizeStored(actor, data);
  const stored = {
    modelVersion: MODEL_VERSION,
    baseCapacity: clean.baseCapacity,
    current: clean.current
  };
  await actor.setFlag(MODULE_ID, "wounds", stored);
  await syncEffect(actor, clean);
  if (isDead(clean) && game.settings.get(MODULE_ID, "markDefeated")) await markTokensDefeated(actor);
  refreshActorTokens(actor);
  return clean;
}

function hindrance(data) {
  return Number(data.current.major || 0) + (data.current.moderate >= data.capacity.moderate ? 1 : 0);
}

function isDead(data) { return data.current.major >= data.capacity.major; }

async function syncEffect(actor, data) {
  const existing = actor.effects.find(effect => effect.getFlag(MODULE_ID, "woundEffect"));
  const steps = hindrance(data);
  if (!steps) {
    if (existing) await existing.delete();
    return;
  }
  const label = `${i18n("CW.Title")}: ${steps === 1 ? i18n("CW.OneStep") : i18n("CW.Steps", { n: steps })}`;
  const effectData = {
    name: label,
    icon: "icons/svg/blood.svg",
    disabled: false,
    changes: [],
    flags: { [MODULE_ID]: { woundEffect: true, hindrance: steps } },
    description: `${i18n("CW.ModerateThreshold")} ${i18n("CW.MajorThreshold")}`
  };
  if (existing) await existing.update(effectData);
  else await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}

async function markTokensDefeated(actor) {
  const defeatedId = CONFIG.specialStatusEffects?.DEFEATED ?? "defeated";
  for (const token of actor.getActiveTokens(true, true)) {
    try { await token.document.toggleActiveEffect(defeatedId, { active: true }); } catch (_) {}
  }
}

async function announce(actor, key, severity) {
  if (!game.settings.get(MODULE_ID, "chatAnnouncements")) return;
  const localized = game.i18n.localize(`CW.${severity[0].toUpperCase() + severity.slice(1)}`);
  const content = `<div class="cypher-wounds-chat"><strong>${i18n("CW.Title")}</strong><p>${i18n(key, { name: actor.name, severity: localized })}</p></div>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content });
}

async function takeWound(actor, severity = "minor") {
  if (!canEdit(actor)) return ui.notifications.warn(i18n("CW.NoPermission"));
  let data = await getData(actor);
  let idx = Math.max(0, SEVERITIES.indexOf(severity));
  while (idx < SEVERITIES.length && data.current[SEVERITIES[idx]] >= data.capacity[SEVERITIES[idx]]) idx++;
  if (idx >= SEVERITIES.length) {
    ui.notifications.warn(i18n("CW.MajorFull"));
    return data;
  }
  const applied = SEVERITIES[idx];
  data.current[applied]++;
  data = await saveData(actor, data);
  if (applied !== severity) ui.notifications.info(i18n(severity === "minor" ? "CW.MinorFull" : "CW.ModerateFull"));
  await announce(actor, "CW.ChatTakes", applied);
  return data;
}

async function healWound(actor, severity = null) {
  if (!canEdit(actor)) return ui.notifications.warn(i18n("CW.NoPermission"));
  let data = await getData(actor);
  const target = severity ?? [...SEVERITIES].reverse().find(s => data.current[s] > 0);
  if (!target || data.current[target] <= 0) return data;
  data.current[target]--;
  data = await saveData(actor, data);
  await announce(actor, "CW.ChatHeals", target);
  return data;
}

async function setSlot(actor, severity, index) {
  if (!canEdit(actor)) return ui.notifications.warn(i18n("CW.NoPermission"));
  const data = await getData(actor);
  data.current[severity] = data.current[severity] === index + 1 ? index : index + 1;
  return saveData(actor, data);
}

async function clearWounds(actor) {
  if (!canEdit(actor)) return ui.notifications.warn(i18n("CW.NoPermission"));
  const data = await getData(actor);
  data.current = emptyCurrent();
  await saveData(actor, data);
  if (game.settings.get(MODULE_ID, "chatAnnouncements")) {
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<strong>${i18n("CW.Title")}</strong><p>${i18n("CW.ChatClears", { name: actor.name })}</p>` });
  }
}

function slotsHtml(data, severity, compact = false) {
  const cls = compact ? "cw-dot" : "cw-slot";
  return Array.from({ length: data.capacity[severity] }, (_, i) => `<button type="button" class="${cls} ${severity} ${i < data.current[severity] ? "filled" : ""}" data-action="slot" data-severity="${severity}" data-index="${i}" aria-label="${severity} ${i + 1}"></button>`).join("");
}

function statusHtml(data) {
  const steps = hindrance(data);
  if (isDead(data)) return `<span class="cw-danger">${i18n("CW.Dead")}</span>`;
  return steps ? (steps === 1 ? i18n("CW.OneStep") : i18n("CW.Steps", { n: steps })) : i18n("CW.None");
}

async function openTracker(actor) {
  if (!actor) return ui.notifications.warn(i18n("CW.InvalidActor"));
  const data = await getData(actor);
  const bonusLine = SEVERITIES.map(s => `${i18n(`CW.${s[0].toUpperCase() + s.slice(1)}`)} +${data.bonuses[s]}`).join(" · ");
  const content = `<div class="cypher-wounds-dialog" data-actor="${actor.uuid}">
    ${SEVERITIES.map(s => `<div class="cw-row"><strong>${i18n(`CW.${s[0].toUpperCase() + s.slice(1)}`)}</strong><div class="cw-slots">${slotsHtml(data, s)}</div><button type="button" data-action="take" data-severity="${s}"><i class="fa-solid fa-plus"></i></button></div>`).join("")}
    <div class="cw-derived-note"><strong>${i18n("CW.ItemBonuses")}:</strong> ${bonusLine}</div>
    <div class="cw-status"><strong>${i18n("CW.Status")}:</strong> ${statusHtml(data)} · <strong>${i18n("CW.Hindrance")}:</strong> ${statusHtml(data)}</div>
    <div class="cw-actions"><button type="button" data-action="heal"><i class="fa-solid fa-kit-medical"></i> ${i18n("CW.Heal")}</button><button type="button" data-action="configure"><i class="fa-solid fa-sliders"></i> ${i18n("CW.ConfigureBase")}</button><button type="button" data-action="reset"><i class="fa-solid fa-rotate-left"></i> ${i18n("CW.Reset")}</button></div>
  </div>`;
  new Dialog({ title: `${i18n("CW.Title")}: ${actor.name}`, content, buttons: { close: { label: game.i18n.localize("Close") } }, render: html => bindTracker(html, actor) }).render(true);
}

function bindTracker(html, actor) {
  html.on("click", "[data-action]", async event => {
    const element = event.currentTarget;
    const action = element.dataset.action;
    if (action === "take") await takeWound(actor, element.dataset.severity);
    if (action === "heal") await healWound(actor);
    if (action === "reset") await clearWounds(actor);
    if (action === "slot") await setSlot(actor, element.dataset.severity, Number(element.dataset.index));
    if (action === "configure") return configure(actor);
    const app = Object.values(ui.windows).find(window => window.element?.find?.(`.cypher-wounds-dialog[data-actor="${actor.uuid}"]`).length);
    app?.close();
    openTracker(actor);
  });
}

async function configure(actor) {
  const data = await getData(actor);
  const content = `<form class="cw-config"><p>${i18n("CW.ConfigureBaseHint")}</p>${SEVERITIES.map(s => `<div class="form-group"><label>${i18n(`CW.${s[0].toUpperCase() + s.slice(1)}`)}</label><input type="number" min="1" max="20" name="${s}" value="${data.baseCapacity[s]}"><span>+${data.bonuses[s]} = ${data.capacity[s]}</span></div>`).join("")}</form>`;
  new Dialog({
    title: i18n("CW.ConfigureBase"), content,
    buttons: {
      save: { label: i18n("CW.Save"), callback: async html => {
        for (const s of SEVERITIES) data.baseCapacity[s] = Number(html.find(`[name="${s}"]`).val());
        await saveData(actor, data);
      } },
      cancel: { label: i18n("CW.Cancel") }
    }
  }).render(true);
}

async function injectSheet(app, html) {
  if (!game.settings.get(MODULE_ID, "injectSheet")) return;
  const actor = app.actor;
  if (!actor || actor.type === "npc") return;
  const data = await getData(actor);
  html.find(".cypher-wounds-strip").remove();
  const strip = $(`<div class="cypher-wounds-strip"><span class="cw-title"><i class="fa-solid fa-heart-crack"></i> ${i18n("CW.Title")}</span>${SEVERITIES.map(s => `<span class="cw-group"><span class="cw-label">${i18n(`CW.${s[0].toUpperCase() + s.slice(1)}`)}</span>${slotsHtml(data, s, true)}</span>`).join("")}<span class="cw-status-text">${statusHtml(data)}</span><button class="cw-open" type="button" title="${i18n("CW.Open")}"><i class="fa-solid fa-up-right-from-square"></i></button></div>`);
  const form = html.find("form").first();
  const header = form.find("header.sheet-header").first();
  if (header.length) header.before(strip);
  else if (form.length) form.prepend(strip);
  else html.prepend(strip);
  strip.on("click", "[data-action=slot]", async event => { event.preventDefault(); await setSlot(actor, event.currentTarget.dataset.severity, Number(event.currentTarget.dataset.index)); app.render(false); });
  strip.find(".cw-open").on("click", event => { event.preventDefault(); openTracker(actor); });
}

function drawCircle(graphics, x, y, radius, color, filled) {
  if (typeof graphics.circle === "function" && typeof graphics.stroke === "function") {
    graphics.circle(x, y, radius);
    if (filled) graphics.fill({ color, alpha: 0.95 });
    graphics.stroke({ color, width: 2, alpha: 0.95 });
  } else {
    graphics.lineStyle(2, color, 0.95);
    if (filled) graphics.beginFill(color, 0.95);
    graphics.drawCircle(x, y, radius);
    if (filled) graphics.endFill();
  }
}

function drawRoundedRectCompat(graphics, x, y, width, height, radius, fill, alpha=1) {
  if (typeof graphics.roundRect === "function" && typeof graphics.fill === "function") {
    graphics.roundRect(x, y, width, height, radius).fill({color: fill, alpha});
  } else {
    graphics.beginFill(fill, alpha);
    graphics.drawRoundedRect(x, y, width, height, radius);
    graphics.endFill();
  }
}

function drawProgressRing(graphics, radius, color, ratio) {
  const safeRatio = clamp(Number(ratio) || 0, 0, 1);
  if (typeof graphics.circle === "function" && typeof graphics.stroke === "function") {
    graphics.circle(0, 0, radius).stroke({color: 0x111111, width: 3, alpha: 0.72});
    if (safeRatio > 0) {
      graphics.moveTo(0, -radius);
      graphics.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * safeRatio);
      graphics.stroke({color, width: 3, alpha: 1});
    }
  } else {
    graphics.lineStyle(3, 0x111111, 0.72);
    graphics.drawCircle(0, 0, radius);
    if (safeRatio > 0) {
      graphics.lineStyle(3, color, 1);
      graphics.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * safeRatio);
    }
  }
}

function makeTokenText(value, fontSize, fill=0xffffff, weight="700") {
  const style = new PIXI.TextStyle({
    fontFamily: "Arial, sans-serif",
    fontSize,
    fontWeight: weight,
    fill,
    align: "center",
    stroke: 0x111111,
    strokeThickness: Math.max(1, Math.round(fontSize / 8))
  });
  const label = new PIXI.Text(String(value), style);
  label.anchor?.set?.(0.5);
  return label;
}

function drawCompactMeters(token, data, container) {
  const colors = {
    minor: 0x35b7c8,       // cyan: superficial strain
    moderate: 0xf0a12b,    // amber: serious injury
    major: 0xd63b5c        // crimson/magenta: critical injury
  };
  const labels = { minor: "I", moderate: "II", major: "III" };

  const panelWidth = Math.max(54, Math.min(token.w - 6, 112));
  const panelHeight = Math.max(22, Math.min(30, token.h * 0.22));
  const panelX = (token.w - panelWidth) / 2;
  const panelY = Math.max(3, token.h - panelHeight - 4);

  const background = new PIXI.Graphics();
  drawRoundedRectCompat(background, panelX, panelY, panelWidth, panelHeight, 7, 0x0b0d10, 0.82);
  container.addChild(background);

  const spacing = panelWidth / 3;
  const radius = Math.max(6, Math.min(10, panelHeight * 0.31));
  const numberSize = Math.max(7, Math.min(11, radius * 1.05));
  const tierSize = Math.max(5, Math.min(8, radius * 0.72));

  SEVERITIES.forEach((severity, index) => {
    const centerX = panelX + spacing * (index + 0.5);
    const centerY = panelY + panelHeight * 0.53;
    const current = Number(data.current[severity] ?? 0);
    const capacity = Math.max(1, Number(data.capacity[severity] ?? 1));
    const ratio = current / capacity;

    const ring = new PIXI.Graphics();
    drawProgressRing(ring, radius, colors[severity], ratio);
    ring.position.set(centerX, centerY);
    container.addChild(ring);

    const count = makeTokenText(current, numberSize);
    count.position.set(centerX, centerY);
    container.addChild(count);

    const tier = makeTokenText(labels[severity], tierSize, colors[severity], "800");
    tier.position.set(centerX, panelY + 4);
    container.addChild(tier);
  });

  const steps = hindrance(data);
  if (steps > 0) {
    const badge = new PIXI.Graphics();
    const badgeRadius = Math.max(6, Math.min(9, panelHeight * 0.28));
    if (typeof badge.circle === "function" && typeof badge.fill === "function") {
      badge.circle(0, 0, badgeRadius).fill({color: 0x15171b, alpha: 0.96}).stroke({color: 0xffffff, width: 1.5, alpha: 0.92});
    } else {
      badge.lineStyle(1.5, 0xffffff, 0.92);
      badge.beginFill(0x15171b, 0.96);
      badge.drawCircle(0, 0, badgeRadius);
      badge.endFill();
    }
    badge.position.set(panelX + panelWidth - 2, panelY + 2);
    container.addChild(badge);

    const hinder = makeTokenText(`−${steps}`, Math.max(6, badgeRadius * 0.9));
    hinder.position.set(badge.position.x, badge.position.y);
    container.addChild(hinder);
  }
}

function drawLegacyTracks(token, data, container) {
  const radius = Math.max(3, Math.min(6, token.w / 18));
  const gap = radius * 2.6;
  const groupGap = radius * 1.5;
  const counts = SEVERITIES.map(severity => data.capacity[severity]);
  const totalWidth = counts.reduce((sum, count) => sum + count * gap, 0) + groupGap * 2;
  let x = (token.w - totalWidth) / 2 + radius;
  const y = token.h + radius + 4;
  const colors = { minor: 0x35b7c8, moderate: 0xf0a12b, major: 0xd63b5c };

  for (const severity of SEVERITIES) {
    for (let i = 0; i < data.capacity[severity]; i++) {
      const graphic = new PIXI.Graphics();
      drawCircle(graphic, 0, 0, radius, colors[severity], i < data.current[severity]);
      graphic.position.set(x, y);
      container.addChild(graphic);
      x += gap;
    }
    x += groupGap;
  }
}

async function refreshTokenWounds(token) {
  if (!token?.actor || !canvas?.ready) return;
  const enabled = game.settings.get(MODULE_ID, "tokenCircles");
  const visibility = game.settings.get(MODULE_ID, "tokenCircleVisibility");
  const displayMode = game.settings.get(MODULE_ID, "tokenWoundDisplay");
  const allowed = visibility === "all" || game.user.isGM || token.actor.isOwner;
  const old = token.getChildByName?.("cypher2WoundCircles") ?? token.children?.find(child => child.name === "cypher2WoundCircles");
  if (old) old.destroy({ children: true });
  if (!enabled || !allowed || visibility === "none") return;

  const data = await getData(token.actor);
  const container = new PIXI.Container();
  container.name = "cypher2WoundCircles";
  container.eventMode = "none";
  container.interactiveChildren = false;
  container.zIndex = 9999;
  container.sortableChildren = true;

  if (displayMode === "tracks") drawLegacyTracks(token, data, container);
  else drawCompactMeters(token, data, container);

  token.addChild(container);
}
function refreshActorTokens(actor) {
  for (const token of actor?.getActiveTokens?.(true, true) ?? []) refreshTokenWounds(token).catch(console.error);
}

function applyRollHindranceNonDestructive(app, html) {
  try {
    const data = app.object ?? {};
    const actor = fromUuidSync(data.actorUuid);
    if (!actor || app._c2tWoundsPrepared) return;
    getData(actor).then(wounds => {
      const steps = hindrance(wounds);
      if (!steps || app._c2tWoundsPrepared) return;
      app._c2tWoundsPrepared = true;

      const currentModifier = Math.abs(Number(data.difficultyModifier ?? 0) || 0);
      const currentNet = String(data.easedOrHindered ?? "eased") === "hindered" ? -currentModifier : currentModifier;
      const net = currentNet - steps;
      data.easedOrHindered = net < 0 ? "hindered" : "eased";
      data.difficultyModifier = Math.abs(net);

      html.find('[name="easedOrHindered"], #easedOrHindered').val(data.easedOrHindered);
      html.find('[name="difficultyModifier"], #difficultyModifier').val(data.difficultyModifier);
      const label = steps === 1 ? i18n("CW.RollHinderedOne") : i18n("CW.RollHinderedMany", { n: steps });
      const header = app.element?.find?.(".window-header") ?? $();
      if (header.length && !header.find(".c2t-wound-roll-badge").length) {
        header.find(".window-title").after(`<span class="c2t-wound-roll-badge" title="${label}"><i class="fa-solid fa-heart-crack"></i> ${steps}</span>`);
      } else if (!header.length && !html.find(".c2t-wound-roll-inline").length) {
        const settings = html.find('[name="easedOrHindered"], #easedOrHindered').first().closest(".form-group, .flexrow, div");
        const badge = `<span class="c2t-wound-roll-inline"><i class="fa-solid fa-heart-crack"></i> ${label}</span>`;
        if (settings.length) settings.append(badge);
      }
    }).catch(error => console.error(`${MODULE_ID} | Wound roll preparation failed`, error));
  } catch (error) {
    console.error(`${MODULE_ID} | Wound roll preparation failed`, error);
  }
}


Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "injectSheet", { name: "CW.Settings.Inject.Name", hint: "CW.Settings.Inject.Hint", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, "chatAnnouncements", { name: "CW.Settings.Chat.Name", hint: "CW.Settings.Chat.Hint", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, "markDefeated", { name: "CW.Settings.Defeated.Name", hint: "CW.Settings.Defeated.Hint", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, "playersEdit", { name: "CW.Settings.Players.Name", hint: "CW.Settings.Players.Hint", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, "tokenHUD", { name: "CW.Settings.TokenHUD.Name", hint: "CW.Settings.TokenHUD.Hint", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, "universalWoundApplicator", { name: "Aplicador universal de wounds", hint: "Exibe um painel flutuante para aplicar e curar wounds sem abrir a ficha.", scope: "world", config: true, type: Boolean, default: true });
  game.settings.register(MODULE_ID, "tokenCircles", { name: "CW.Settings.TokenCircles.Name", hint: "Deprecated: wound indicators are now shown in the universal wound panel.", scope: "world", config: false, type: Boolean, default: false });
  game.settings.register(MODULE_ID, "tokenWoundDisplay", { name: "Wounds: visualização no token", hint: "Compacta mantém os indicadores dentro do token; trilhas preserva os círculos externos antigos.", scope: "world", config: true, type: String, choices: { compact: "Medidores compactos", tracks: "Trilhas de círculos (legado)" }, default: "compact" });
  game.settings.register(MODULE_ID, "tokenCircleVisibility", { name: "CW.Settings.TokenVisibility.Name", hint: "CW.Settings.TokenVisibility.Hint", scope: "world", config: true, type: String, choices: { all: "CW.Settings.TokenVisibility.All", owners: "CW.Settings.TokenVisibility.Owners", none: "CW.Settings.TokenVisibility.None" }, default: "owners" });
  game.settings.register(MODULE_ID, "autoRollHindrance", { name: "CW.Settings.AutoHinder.Name", hint: "CW.Settings.AutoHinder.Hint", scope: "world", config: true, type: Boolean, default: true });
});

async function migrateLegacyWounds() {
  if (!game.user.isGM) return;
  for (const actor of game.actors ?? []) {
    let current = actor.getFlag(MODULE_ID, "wounds");
    if (!current) current = actor.getFlag(LEGACY_MODULE_ID, "wounds");
    if (!current) continue;
    const clean = normalizeStored(actor, current);
    await actor.setFlag(MODULE_ID, "wounds", { modelVersion: MODEL_VERSION, baseCapacity: clean.baseCapacity, current: clean.current });
  }
}

Hooks.once("ready", async () => {
  await migrateLegacyWounds();
  game.cypherWounds = { open: openTracker, take: takeWound, heal: healWound, clear: clearWounds, getData, saveData, hindrance, refreshToken: refreshTokenWounds };
  game.cypher2Toolkit = game.cypher2Toolkit ?? {};
  Object.assign(game.cypher2Toolkit, { wounds: game.cypherWounds });
  for (const token of canvas?.tokens?.placeables ?? []) refreshTokenWounds(token).catch(console.error);
});

Hooks.on("renderRollEngineDialogSheet", (app, html) => {
  if (game.settings.get(MODULE_ID, "autoRollHindrance")) applyRollHindranceNonDestructive(app, html);
});
Hooks.on("renderActorSheet", injectSheet);
Hooks.on("getActorSheetHeaderButtons", (app, buttons) => { if (app.actor?.type !== "npc") buttons.unshift({ label: i18n("CW.Title"), class: "cypher-wounds-open", icon: "fas fa-heart-crack", onclick: () => openTracker(app.actor) }); });
Hooks.on("renderTokenHUD", async (hud, html, data) => {
  if (!game.settings.get(MODULE_ID, "tokenHUD")) return;

  // Foundry v13 exposes the Token through hud.object. Older code relied on
  // data._id, which is not consistently present in v13.
  const token =
    hud?.object ??
    canvas?.tokens?.get?.(data?._id) ??
    canvas?.tokens?.get?.(data?.id) ??
    null;

  const actor = token?.actor ?? token?.document?.actor ?? null;
  if (!actor || actor.type === "npc") return;
  if (!(game.user.isGM || actor.isOwner)) return;

  const root = html?.find ? html : $(html);
  const rightColumn = root.find(".col.right");
  const leftColumn = root.find(".col.left");
  const column = rightColumn.length ? rightColumn : leftColumn;
  if (!column.length) {
    console.warn(`${MODULE_ID} | Token HUD column not found`, {hud, html, data});
    return;
  }

  // Avoid duplicates when the HUD is re-rendered.
  root.find(".cypher-wounds-hud, .c2t-quick-wound").remove();

  const wounds = await getData(actor);

  const tracker = $(`
    <div class="control-icon cypher-wounds-hud ${hindrance(wounds) ? "active" : ""}"
         title="Abrir controle de wounds">
      <i class="fa-solid fa-heart-crack"></i>
    </div>
  `);
  tracker.on("click", event => {
    event.preventDefault();
    event.stopPropagation();
    openTracker(actor);
  });
  column.append(tracker);

  const quick = [
    ["minor", "I", "Marcar Minor wound"],
    ["moderate", "II", "Marcar Moderate wound"],
    ["major", "III", "Marcar Major wound"]
  ];

  for (const [severity, mark, title] of quick) {
    const button = $(`
      <div class="control-icon c2t-quick-wound ${severity}" title="${title}">
        <span>${mark}</span>
      </div>
    `);
    button.on("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      await takeWound(actor, severity);
    });
    column.append(button);
  }
});



function universalSeverityLabel(severity) {
  return ({minor: "Minor", moderate: "Moderate", major: "Major"})[severity] ?? severity;
}

function getOwnedPcActors() {
  return (game.actors ?? []).filter(actor =>
    actor.type === "pc" && (game.user.isGM || actor.isOwner)
  );
}

function resolveApplicatorTargets() {
  const targeted = [...(game.user.targets ?? [])]
    .map(token => token.actor)
    .filter(actor => actor?.type === "pc" && (game.user.isGM || actor.isOwner));
  if (targeted.length) return [...new Map(targeted.map(actor => [actor.id, actor])).values()];

  const controlled = (canvas?.tokens?.controlled ?? [])
    .map(token => token.actor)
    .filter(actor => actor?.type === "pc" && (game.user.isGM || actor.isOwner));
  if (controlled.length) return [...new Map(controlled.map(actor => [actor.id, actor])).values()];

  if (game.user.character?.type === "pc" && (game.user.isGM || game.user.character.isOwner)) {
    return [game.user.character];
  }

  const owned = getOwnedPcActors();
  return owned.length === 1 ? owned : [];
}

function applicatorTargetLabel(targets) {
  if (!targets.length) return "Nenhum personagem";
  if (targets.length === 1) return targets[0].name;
  if (targets.length <= 3) return targets.map(actor => actor.name).join(", ");
  return `${targets.length} personagens`;
}

function getApplicatorPosition() {
  try {
    return JSON.parse(localStorage.getItem(`${MODULE_ID}.applicatorPosition`) || "null");
  } catch (_) {
    return null;
  }
}

function saveApplicatorPosition(left, top) {
  localStorage.setItem(`${MODULE_ID}.applicatorPosition`, JSON.stringify({left, top}));
}

function getApplicatorSize() {
  try {
    return JSON.parse(localStorage.getItem(`${MODULE_ID}.applicatorSize`) || "null");
  } catch (_) {
    return null;
  }
}

function saveApplicatorSize(width, height) {
  localStorage.setItem(`${MODULE_ID}.applicatorSize`, JSON.stringify({width, height}));
}

function clearApplicatorSize() {
  localStorage.removeItem(`${MODULE_ID}.applicatorSize`);
}

async function refreshUniversalApplicator() {
  const panel = $("#c2t-universal-wound-applicator");
  if (!panel.length) return;

  const targets = resolveApplicatorTargets();
  panel.find(".c2t-applicator-target").text(applicatorTargetLabel(targets));
  panel.toggleClass("disabled", !targets.length);
  panel.find("button[data-action]").prop("disabled", !targets.length);

  const status = panel.find(".c2t-applicator-status");
  status.empty();

  if (!targets.length) {
    status.append('<div class="c2t-applicator-empty">Selecione ou marque um personagem como alvo.</div>');
    return;
  }

  for (const actor of targets) {
    const data = await getData(actor);
    const actorRow = $(`
      <div class="c2t-applicator-actor" data-actor-id="${actor.id}">
        <div class="c2t-applicator-actor-name">${actor.name}</div>
        <div class="c2t-applicator-tracks"></div>
        <div class="c2t-applicator-hinder">
          Hinder global: <strong>${hindrance(data)}</strong>
        </div>
      </div>
    `);

    const tracks = actorRow.find(".c2t-applicator-tracks");
    const config = [
      ["minor", "I", "Minor"],
      ["moderate", "II", "Moderate"],
      ["major", "III", "Major"]
    ];

    for (const [severity, tier, label] of config) {
      const current = Number(data.current[severity] ?? 0);
      const capacity = Number(data.capacity[severity] ?? 0);
      const track = $(`
        <div class="c2t-applicator-track ${severity}">
          <div class="c2t-applicator-track-head">
            <span class="tier">${tier}</span>
            <span class="label">${label}</span>
            <strong>${current}/${capacity}</strong>
          </div>
          <div class="c2t-applicator-track-dots" aria-label="${label}: ${current} de ${capacity}"></div>
        </div>
      `);

      const dots = track.find(".c2t-applicator-track-dots");
      const maxVisible = Math.max(0, capacity);
      for (let i = 0; i < maxVisible; i++) {
        dots.append(`<span class="c2t-applicator-dot ${i < current ? "filled" : ""}"></span>`);
      }
      tracks.append(track);
    }

    status.append(actorRow);
  }
}

async function applyToApplicatorTargets(action, severity=null) {
  const targets = resolveApplicatorTargets();
  if (!targets.length) {
    return ui.notifications.warn("Selecione um token de personagem ou marque-o como alvo.");
  }

  for (const actor of targets) {
    if (action === "heal") await healWound(actor);
    else if (action === "add" && SEVERITIES.includes(severity)) await takeWound(actor, severity);
    else if (action === "remove" && SEVERITIES.includes(severity)) {
      const data = await getData(actor);
      data.current[severity] = Math.max(0, Number(data.current[severity] ?? 0) - 1);
      await saveData(actor, data);
    }
  }

  const verb = action === "heal"
    ? "Curado 1 wound"
    : action === "remove"
      ? `Removido 1 ${universalSeverityLabel(severity)} wound`
      : `Aplicado 1 ${universalSeverityLabel(severity)} wound`;

  ui.notifications.info(`${verb} em ${applicatorTargetLabel(targets)}.`);

  panel.find(".c2t-applicator-reset-size").on("click", event => {
    event.preventDefault();
    event.stopPropagation();
    clearApplicatorSize();
    panel.css({width: "", height: ""});
  });

  const resizeHandle = panel.find(".c2t-applicator-resize");
  resizeHandle.on("pointerdown", event => {
    event.preventDefault();
    event.stopPropagation();

    const rect = panel[0].getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;

    const move = moveEvent => {
      const width = Math.max(230, Math.min(window.innerWidth - rect.left, startWidth + moveEvent.clientX - startX));
      const height = Math.max(160, Math.min(window.innerHeight - rect.top, startHeight + moveEvent.clientY - startY));
      panel.css({width: `${width}px`, height: `${height}px`});
    };

    const up = () => {
      $(window).off("pointermove.c2tResize", move);
      $(window).off("pointerup.c2tResize", up);
      const finalRect = panel[0].getBoundingClientRect();
      saveApplicatorSize(finalRect.width, finalRect.height);
    };

    $(window).on("pointermove.c2tResize", move);
    $(window).on("pointerup.c2tResize", up);
  });

  refreshUniversalApplicator();
}

function makeUniversalWoundApplicator() {
  $("#c2t-universal-wound-applicator").remove();
  if (!game.settings.get(MODULE_ID, "universalWoundApplicator")) return;

  const panel = $(`
    <section id="c2t-universal-wound-applicator" class="c2t-wound-applicator">
      <header class="c2t-applicator-header">
        <span><i class="fa-solid fa-heart-crack"></i> Wounds</span>
        <div class="c2t-applicator-header-actions">
          <button type="button" class="c2t-applicator-reset-size" title="Restaurar tamanho">
            <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
          </button>
          <button type="button" class="c2t-applicator-collapse" title="Recolher">
            <i class="fa-solid fa-chevron-down"></i>
          </button>
        </div>
      </header>
      <div class="c2t-applicator-body">
        <div class="c2t-applicator-target-row">
          <span class="c2t-applicator-target-label">Alvo:</span>
          <strong class="c2t-applicator-target">Nenhum personagem</strong>
        </div>

        <div class="c2t-applicator-status"></div>

        <div class="c2t-applicator-actions">
          <button type="button" data-action="add" data-severity="minor" class="minor" title="Aplicar Minor wound">I</button>
          <button type="button" data-action="add" data-severity="moderate" class="moderate" title="Aplicar Moderate wound">II</button>
          <button type="button" data-action="add" data-severity="major" class="major" title="Aplicar Major wound">III</button>
          <button type="button" data-action="heal" class="heal" title="Curar o wound mais grave">
            <i class="fa-solid fa-kit-medical"></i>
          </button>
        </div>
        <div class="c2t-applicator-hint">Shift + clique remove um wound do tipo escolhido.</div>
      </div>
      <div class="c2t-applicator-resize" title="Redimensionar"></div>
    </section>
  `);

  $("body").append(panel);

  const saved = getApplicatorPosition();
  if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
    panel.css({left: `${saved.left}px`, top: `${saved.top}px`, bottom: "auto"});
  }

  const savedSize = getApplicatorSize();
  if (savedSize && Number.isFinite(savedSize.width) && Number.isFinite(savedSize.height)) {
    panel.css({
      width: `${savedSize.width}px`,
      height: `${savedSize.height}px`
    });
  }

  panel.find("[data-action]").on("click", async event => {
    event.preventDefault();
    const button = event.currentTarget;
    const action = button.dataset.action;
    const severity = button.dataset.severity ?? null;
    const effectiveAction = action === "add" && event.shiftKey ? "remove" : action;
    await applyToApplicatorTargets(effectiveAction, severity);
  });

  panel.find(".c2t-applicator-collapse").on("click", event => {
    event.preventDefault();
    panel.toggleClass("collapsed");
    const icon = panel.find(".c2t-applicator-collapse i");
    icon.toggleClass("fa-chevron-down fa-chevron-up");
  });

  const header = panel.find(".c2t-applicator-header");
  header.on("pointerdown", event => {
    if ($(event.target).closest("button").length) return;
    event.preventDefault();

    const rect = panel[0].getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const move = moveEvent => {
      const width = rect.width;
      const height = rect.height;
      const left = Math.max(0, Math.min(window.innerWidth - width, moveEvent.clientX - offsetX));
      const top = Math.max(0, Math.min(window.innerHeight - height, moveEvent.clientY - offsetY));
      panel.css({left: `${left}px`, top: `${top}px`, bottom: "auto"});
    };

    const up = () => {
      $(window).off("pointermove.c2tApplicator", move);
      $(window).off("pointerup.c2tApplicator", up);
      const finalRect = panel[0].getBoundingClientRect();
      saveApplicatorPosition(finalRect.left, finalRect.top);
    };

    $(window).on("pointermove.c2tApplicator", move);
    $(window).on("pointerup.c2tApplicator", up);
  });

  refreshUniversalApplicator();
}

Hooks.once("ready", makeUniversalWoundApplicator);
Hooks.on("canvasReady", () => {
  makeUniversalWoundApplicator();
  refreshUniversalApplicator();
});
Hooks.on("controlToken", refreshUniversalApplicator);
Hooks.on("targetToken", refreshUniversalApplicator);
Hooks.on("updateUser", refreshUniversalApplicator);

Hooks.on("refreshToken", token => refreshTokenWounds(token).catch(console.error));
Hooks.on("drawToken", token => refreshTokenWounds(token).catch(console.error));
Hooks.on("updateActor", actor => {
  refreshActorTokens(actor);
  for (const app of Object.values(actor.apps ?? {})) app.render(false);
});
Hooks.on("createItem", item => { if (item.parent?.documentName === "Actor") refreshActorTokens(item.parent); });
Hooks.on("deleteItem", item => { if (item.parent?.documentName === "Actor") refreshActorTokens(item.parent); });
Hooks.on("updateItem", item => { if (item.parent?.documentName === "Actor") refreshActorTokens(item.parent); });
