const MODULE_ID = "cypher-2-toolkit";
const SOCKET_CHANNEL = `module.${MODULE_ID}`;
const STATE_FLAG = "combatAssistantState";
const PHASES = Object.freeze({fast: 0, normal: 1, last: 2});
const announcedTurns = new Set();
const declarationDialogs = new Map();
let originalComparator = null;
let combatActionQueue = Promise.resolve();

const t = (key, data = {}) => game.i18n.format(`C2T.Combat.${key}`, data);

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value ?? "");
  return element.innerHTML;
}

function primaryActiveGm() {
  return Array.from(game.users ?? []).filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0] ?? null;
}

function isCoordinator() {
  return game.user?.isGM && primaryActiveGm()?.id === game.user.id;
}

function assistantEnabled() {
  return game.settings.get(MODULE_ID, "combatAssistant");
}

function declarationsEnabled() {
  return assistantEnabled() && game.settings.get(MODULE_ID, "combatDeclarations");
}

function stateFor(combat) {
  return combat?.getFlag(MODULE_ID, STATE_FLAG) ?? null;
}

function participantCombatants(combat) {
  const includeNpcs = game.settings.get(MODULE_ID, "combatIncludeNpcs");
  return Array.from(combat?.combatants ?? []).filter(combatant => {
    if (!combatant.actor || combatant.isDefeated) return false;
    return combatant.actor.type === "pc" || includeNpcs;
  });
}

function canChoose(combatant, user) {
  if (!combatant?.actor || !user) return false;
  return user.isGM || combatant.actor.testUserPermission(user, "OWNER");
}

function phaseLabel(phase) {
  return t(phase === "fast" ? "Fast" : phase === "last" ? "Last" : "Normal");
}

function phaseIcon(phase) {
  return phase === "fast" ? "fa-forward-fast" : phase === "last" ? "fa-hourglass-end" : "fa-play";
}

function declarationContent(combat, state, participants) {
  const rows = participants.map(combatant => {
    const selected = state.declarations?.[combatant.id] ?? "";
    const statusControl = game.user.isGM && combatant.actor.type !== "pc"
      ? `<select class="c2t-combat-npc-phase" data-c2t-npc-phase="${combatant.id}" aria-label="${escapeHtml(t("ChooseNpcPhase", {name: combatant.name}))}">
          <option value="" ${selected ? "" : "selected"} disabled>${escapeHtml(t("Awaiting"))}</option>
          ${Object.keys(PHASES).map(phase => `<option value="${phase}" ${selected === phase ? "selected" : ""}>${escapeHtml(phaseLabel(phase))}</option>`).join("")}
        </select>`
      : `<span class="c2t-combat-monitor-status ${selected || "pending"}"><i class="fa-solid ${selected ? phaseIcon(selected) : "fa-clock"}"></i> ${escapeHtml(selected ? phaseLabel(selected) : t("Awaiting"))}</span>`;
    return `<div class="c2t-combat-participant" data-combatant-row="${combatant.id}">
      <img src="${escapeHtml(combatant.img || combatant.actor.img)}" alt="">
      <div class="c2t-combat-participant-name"><strong>${escapeHtml(combatant.name)}</strong><small>${selected ? escapeHtml(phaseLabel(selected)) : escapeHtml(t("Awaiting"))}</small></div>
      ${statusControl}
    </div>`;
  }).join("");
  const chosen = participants.filter(combatant => state.declarations?.[combatant.id]).length;
  const status = state.resolved ? t("ResolvedStatus") : t("Progress", {chosen, total: participants.length});
  return `<section class="c2t-combat-declaration ${state.resolved ? "resolved" : "pending"}">
    <header><div><i class="fa-solid fa-list-ol"></i><strong>${escapeHtml(t("RoundDeclaration", {round: state.round}))}</strong></div><span>${escapeHtml(status)}</span></header>
    <p>${escapeHtml(t("DeclarationIntro"))}</p>
    <div class="c2t-combat-participants">${rows || `<p class="c2t-combat-empty">${escapeHtml(t("NoParticipants"))}</p>`}</div>
  </section>`;
}

function localParticipants(combat) {
  const participants = participantCombatants(combat);
  return game.user.isGM ? participants : participants.filter(combatant => canChoose(combatant, game.user));
}

function closeDeclarationDialogs(combatId) {
  for (const [key, dialog] of declarationDialogs) {
    if (!key.startsWith(`${combatId}:`)) continue;
    declarationDialogs.delete(key);
    dialog.close();
  }
}

function closeCombatantPrompt(combatId, combatantId) {
  const key = `${combatId}:${combatantId}`;
  const dialog = declarationDialogs.get(key);
  if (!dialog) return;
  declarationDialogs.delete(key);
  dialog.close();
}

function showCombatantPrompt(combat, combatant) {
  const key = `${combat.id}:${combatant.id}`;
  if (declarationDialogs.has(key)) return;
  const choose = phase => {
    declarationDialogs.delete(key);
    dispatchCombatAction({action: "combatDeclare", combatId: combat.id, combatantId: combatant.id, phase});
    ui.notifications.info(t("ChoiceSent", {name: combatant.name, phase: phaseLabel(phase)}));
  };
  const dialog = new Dialog({
    title: t("CharacterDeclarationTitle", {name: combatant.name, round: combat.round}),
    content: `<section class="c2t-combat-choice"><img src="${escapeHtml(combatant.img || combatant.actor.img)}" alt=""><div><strong>${escapeHtml(combatant.name)}</strong><p>${escapeHtml(t("CharacterDeclarationIntro"))}</p></div></section>`,
    buttons: {
      fast: {icon: `<i class="fa-solid ${phaseIcon("fast")}"></i>`, label: phaseLabel("fast"), callback: () => choose("fast")},
      normal: {icon: `<i class="fa-solid ${phaseIcon("normal")}"></i>`, label: phaseLabel("normal"), callback: () => choose("normal")},
      last: {icon: `<i class="fa-solid ${phaseIcon("last")}"></i>`, label: phaseLabel("last"), callback: () => choose("last")}
    },
    default: "normal",
    close: () => { if (declarationDialogs.get(key) === dialog) declarationDialogs.delete(key); }
  }, {width: 470});
  declarationDialogs.set(key, dialog);
  dialog.render(true);
}

function bindGmMonitor(dialog, combat) {
  dialog.element?.find?.("[data-c2t-npc-phase]")
    .off("change.c2tCombatNpc")
    .on("change.c2tCombatNpc", event => {
      const select = event.currentTarget;
      if (!(select.value in PHASES)) return;
      select.disabled = true;
      dispatchCombatAction({action: "combatDeclare", combatId: combat.id, combatantId: select.dataset.c2tNpcPhase, phase: select.value});
    });
}

function showGmMonitor(combat, state) {
  const participants = participantCombatants(combat);
  if (!participants.length) return;
  const key = `${combat.id}:gm`;
  const content = declarationContent(combat, state, participants);
  const existing = declarationDialogs.get(key);
  if (existing) {
    existing.data.content = content;
    existing.render(true);
    return;
  }
  const dialog = new Dialog({
    title: t("RoundDeclaration", {round: state.round}),
    content,
    buttons: {
      resolve: {icon: '<i class="fa-solid fa-check"></i>', label: t("ResolveNow"), callback: () => dispatchCombatAction({action: "combatResolve", combatId: combat.id})},
      close: {label: t("ClosePopup")}
    },
    default: "resolve",
    render: app => bindGmMonitor(app, combat),
    close: () => { if (declarationDialogs.get(key) === dialog) declarationDialogs.delete(key); }
  }, {width: 520, resizable: true});
  declarationDialogs.set(key, dialog);
  dialog.render(true);
}

function showDeclarationDialog(combat) {
  const state = stateFor(combat);
  if (!combat?.started || !state || state.round !== combat.round || state.resolved) {
    if (combat?.id) closeDeclarationDialogs(combat.id);
    return;
  }
  if (game.user.isGM) return showGmMonitor(combat, state);
  for (const combatant of localParticipants(combat)) {
    if (state.declarations?.[combatant.id]) closeCombatantPrompt(combat.id, combatant.id);
    else showCombatantPrompt(combat, combatant);
  }
}

function broadcastDeclaration(combat) {
  showDeclarationDialog(combat);
  if (isCoordinator()) game.socket.emit(SOCKET_CHANNEL, {action: "combatShowDeclaration", combatId: combat.id});
}

function installCombatComparator() {
  const CombatClass = CONFIG.Combat.documentClass;
  if (!CombatClass?.prototype?._sortCombatants || originalComparator) return;
  originalComparator = CombatClass.prototype._sortCombatants;
  CombatClass.prototype._sortCombatants = function c2tSortCombatants(a, b) {
    const state = stateFor(this);
    if (declarationsEnabled() && state?.resolved && Number(state.round) === Number(this.round)) {
      const aPhase = PHASES[state.declarations?.[a.id] ?? "normal"] ?? PHASES.normal;
      const bPhase = PHASES[state.declarations?.[b.id] ?? "normal"] ?? PHASES.normal;
      if (aPhase !== bPhase) return aPhase - bPhase;
    }
    return originalComparator.call(this, a, b);
  };
}

async function beginRoundDeclaration(combat) {
  if (!isCoordinator() || !declarationsEnabled() || !combat?.started) return;
  const existing = stateFor(combat);
  if (existing?.round === combat.round) return;
  const state = {round: combat.round, resolved: false, declarations: {}, createdAt: Date.now()};
  await combat.setFlag(MODULE_ID, STATE_FLAG, state);
  broadcastDeclaration(combat);
  if (!participantCombatants(combat).length) await resolveDeclarations(combat);
}

async function resolveDeclarations(combat) {
  if (!isCoordinator()) return;
  const state = foundry.utils.deepClone(stateFor(combat));
  if (!state || state.round !== combat.round) return;
  for (const combatant of participantCombatants(combat)) state.declarations[combatant.id] ||= "normal";
  state.resolved = true;
  state.resolvedAt = Date.now();
  await combat.setFlag(MODULE_ID, STATE_FLAG, state);
  combat.setupTurns();
  await combat.update({turn: 0}, {c2tCombatAssistant: true});
  closeDeclarationDialogs(combat.id);
  game.socket.emit(SOCKET_CHANNEL, {action: "combatCloseDeclaration", combatId: combat.id});
  ui.combat?.render({force: true});
  window.setTimeout(() => announceCurrentTurn(combat), 250);
}

async function reopenDeclarations(combat) {
  if (!isCoordinator()) return;
  const state = foundry.utils.deepClone(stateFor(combat));
  if (!state || state.round !== combat.round) return;
  state.resolved = false;
  state.declarations = {};
  delete state.resolvedAt;
  await combat.setFlag(MODULE_ID, STATE_FLAG, state);
  combat.setupTurns();
  await combat.update({turn: 0}, {c2tCombatAssistant: true});
  broadcastDeclaration(combat);
  ui.combat?.render({force: true});
}

async function handleCombatAction(payload) {
  const combat = game.combats.get(payload.combatId);
  if (payload.action === "combatShowDeclaration") return showDeclarationDialog(combat);
  if (payload.action === "combatCloseDeclaration") return combat && closeDeclarationDialogs(combat.id);
  if (payload.action === "combatDeclarationAccepted") {
    if (!combat) return;
    closeCombatantPrompt(combat.id, payload.combatantId);
    if (payload.userId === game.user.id) {
      const combatant = combat.combatants.get(payload.combatantId);
      ui.notifications.info(t("ChoiceConfirmed", {name: combatant?.name ?? "", phase: phaseLabel(payload.phase)}));
    }
    return;
  }
  if (!isCoordinator()) return;
  const user = game.users.get(payload.userId);
  const state = foundry.utils.deepClone(stateFor(combat));
  if (!combat || !user || !state || state.round !== combat.round) return;
  if (payload.action === "combatResolve" && user.isGM) return resolveDeclarations(combat);
  if (payload.action === "combatReopen" && user.isGM) return reopenDeclarations(combat);
  if (payload.action !== "combatDeclare" || state.resolved || !(payload.phase in PHASES)) return;
  const combatant = combat.combatants.get(payload.combatantId);
  if (!canChoose(combatant, user) || !participantCombatants(combat).some(entry => entry.id === combatant.id)) return;
  state.declarations[combatant.id] = payload.phase;
  await combat.setFlag(MODULE_ID, STATE_FLAG, state);
  game.socket.emit(SOCKET_CHANNEL, {
    action: "combatDeclarationAccepted",
    combatId: combat.id,
    combatantId: combatant.id,
    phase: payload.phase,
    userId: payload.userId
  });
  broadcastDeclaration(combat);
  const participants = participantCombatants(combat);
  if (participants.length && participants.every(entry => state.declarations[entry.id])) await resolveDeclarations(combat);
}

function processCombatAction(payload) {
  const mutatesState = ["combatDeclare", "combatResolve", "combatReopen"].includes(payload?.action);
  if (!mutatesState || !isCoordinator()) return handleCombatAction(payload);
  const task = combatActionQueue.then(() => handleCombatAction(payload));
  combatActionQueue = task.catch(error => {
    console.error(`${MODULE_ID} | Queued combat action failed`, error);
  });
  return task;
}

function dispatchCombatAction(data) {
  const payload = {...data, userId: game.user.id};
  if (isCoordinator()) return processCombatAction(payload);
  if (!primaryActiveGm()) return ui.notifications.warn(t("NoActiveGm"));
  game.socket.emit(SOCKET_CHANNEL, payload);
}

async function announceCurrentTurn(combat) {
  if (!isCoordinator() || !assistantEnabled() || !game.settings.get(MODULE_ID, "combatTurnReminders") || !combat?.started) return;
  const state = stateFor(combat);
  if (declarationsEnabled() && state?.round === combat.round && !state.resolved) return;
  const combatant = combat.combatant;
  if (!combatant?.actor) return;
  const key = `${combat.id}:${combat.round}:${combat.turn}:${combatant.id}`;
  if (announcedTurns.has(key)) return;
  announcedTurns.add(key);
  const phase = state?.resolved ? state.declarations?.[combatant.id] ?? "normal" : "normal";
  let wounds = "";
  if (combatant.actor.type === "pc" && game.cypherWounds?.getData) {
    const data = await game.cypherWounds.getData(combatant.actor);
    const entries = [];
    if (data.current.minor) entries.push(`I ${data.current.minor}/${data.capacity.minor}`);
    if (data.current.moderate) entries.push(`II ${data.current.moderate}/${data.capacity.moderate}`);
    if (data.current.major) entries.push(`III ${data.current.major}/${data.capacity.major}`);
    const hindrance = game.cypherWounds.hindrance(data);
    wounds = `<div class="c2t-combat-turn-details"><span><i class="fa-solid fa-heart-crack"></i> ${entries.length ? entries.join(" · ") : escapeHtml(t("NoWounds"))}</span>${hindrance ? `<strong>${escapeHtml(t("Hindrance", {value: hindrance}))}</strong>` : ""}</div>`;
  }
  const content = `<section class="c2t-combat-turn-card phase-${phase}"><header><i class="fa-solid ${phaseIcon(phase)}"></i><div><strong>${escapeHtml(t("TurnOf", {name: combatant.name}))}</strong><small>${escapeHtml(t("RoundAndPhase", {round: combat.round, phase: phaseLabel(phase)}))}</small></div></header>${wounds}</section>`;
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: combatant.actor}), content, flags: {[MODULE_ID]: {combatTurnReminder: {combatId: combat.id, round: combat.round, turn: combat.turn}}}});
}

function injectTrackerBadges(_app, html) {
  if (!assistantEnabled()) return;
  const combat = game.combat;
  const state = stateFor(combat);
  if (!combat || !state?.resolved || state.round !== combat.round) return;
  const root = html?.[0] ?? html;
  if (!(root instanceof HTMLElement)) return;
  for (const row of root.querySelectorAll("[data-combatant-id]")) {
    const phase = state.declarations?.[row.dataset.combatantId];
    if (!phase || phase === "normal" || row.querySelector(".c2t-combat-phase-badge")) continue;
    const badge = document.createElement("span");
    badge.className = `c2t-combat-phase-badge ${phase}`;
    badge.innerHTML = `<i class="fa-solid ${phaseIcon(phase)}"></i> ${escapeHtml(phaseLabel(phase))}`;
    const target = row.querySelector(".token-name, .combatant-name, .name") ?? row;
    target.append(badge);
  }
}

function scheduleRoundDeclaration(combat) {
  window.setTimeout(() => beginRoundDeclaration(combat).catch(error => console.error(`${MODULE_ID} | Combat declaration failed`, error)), 200);
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "combatAssistant", {name: "C2T.Combat.Settings.Enabled.Name", hint: "C2T.Combat.Settings.Enabled.Hint", scope: "world", config: true, type: Boolean, default: true, restricted: true});
  game.settings.register(MODULE_ID, "combatDeclarations", {name: "C2T.Combat.Settings.Declarations.Name", hint: "C2T.Combat.Settings.Declarations.Hint", scope: "world", config: true, type: Boolean, default: true, restricted: true});
  game.settings.register(MODULE_ID, "combatIncludeNpcs", {name: "C2T.Combat.Settings.Npcs.Name", hint: "C2T.Combat.Settings.Npcs.Hint", scope: "world", config: true, type: Boolean, default: false, restricted: true});
  game.settings.register(MODULE_ID, "combatTurnReminders", {name: "C2T.Combat.Settings.Reminders.Name", hint: "C2T.Combat.Settings.Reminders.Hint", scope: "world", config: true, type: Boolean, default: true, restricted: true});
  installCombatComparator();
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET_CHANNEL, payload => {
    if (String(payload?.action || "").startsWith("combat")) processCombatAction(payload).catch(error => console.error(`${MODULE_ID} | Combat socket action failed`, error));
  });
  game.cypher2Toolkit = game.cypher2Toolkit ?? {};
  game.cypher2Toolkit.combat = {beginRound: () => beginRoundDeclaration(game.combat), resolve: () => resolveDeclarations(game.combat), reopen: () => reopenDeclarations(game.combat)};
  if (game.combat?.started) scheduleRoundDeclaration(game.combat);
  if (game.combat?.started && stateFor(game.combat)?.round === game.combat.round) window.setTimeout(() => showDeclarationDialog(game.combat), 350);
});

Hooks.on("combatStart", scheduleRoundDeclaration);
Hooks.on("combatRound", scheduleRoundDeclaration);
Hooks.on("combatTurnChange", combat => window.setTimeout(async () => {
  try {
    await beginRoundDeclaration(combat);
    await announceCurrentTurn(combat);
  } catch (error) {
    console.error(`${MODULE_ID} | Combat turn workflow failed`, error);
  }
}, 300));
Hooks.on("renderCombatTracker", injectTrackerBadges);
Hooks.on("renderApplicationV2", (app, element) => {
  if (app?.constructor?.name === "CombatTracker" || app?.options?.id === "combat") injectTrackerBadges(app, element);
});
Hooks.on("updateCombat", (combat, changes) => {
  if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${STATE_FLAG}`)) return;
  combat.setupTurns();
  ui.combat?.render({force: true});
  showDeclarationDialog(combat);
});
