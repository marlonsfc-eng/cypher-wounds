const MODULE_ID = "cypher-2-toolkit";
const LEGACY_MODULE_ID = "cypher-wounds";
const DEFAULTS = Object.freeze({ minor: 3, moderate: 3, major: 3 });
const SEVERITIES = ["minor", "moderate", "major"];

const i18n = (key, data={}) => game.i18n.format(key, data);

function canEdit(actor) {
  if (!actor) return false;
  if (game.user.isGM) return true;
  return game.settings.get(MODULE_ID, "playersEdit") && actor.isOwner;
}

function normalize(data={}) {
  const capacity = {...DEFAULTS, ...(data.capacity ?? {})};
  const current = {minor:0, moderate:0, major:0, ...(data.current ?? {})};
  for (const s of SEVERITIES) {
    capacity[s] = Math.max(1, Number(capacity[s]) || DEFAULTS[s]);
    current[s] = Math.clamp(Number(current[s]) || 0, 0, capacity[s]);
  }
  return {capacity, current};
}

async function getData(actor) {
  return normalize(actor?.getFlag(MODULE_ID, "wounds") ?? {});
}

function hindrance(data) {
  const major = data.current.major;
  const moderatePenalty = data.current.moderate >= data.capacity.moderate ? 1 : 0;
  return major + moderatePenalty;
}

function isDead(data) {
  return data.current.major >= data.capacity.major;
}

async function saveData(actor, data) {
  const clean = normalize(data);
  await actor.setFlag(MODULE_ID, "wounds", clean);
  await syncEffect(actor, clean);
  if (isDead(clean) && game.settings.get(MODULE_ID, "markDefeated")) await markTokensDefeated(actor);
  return clean;
}

async function syncEffect(actor, data) {
  const existing = actor.effects.find(e => e.getFlag(MODULE_ID, "woundEffect"));
  const steps = hindrance(data);
  if (!steps) {
    if (existing) await existing.delete();
    return;
  }
  const label = `${i18n("CW.Title")}: ${steps === 1 ? i18n("CW.OneStep") : i18n("CW.Steps", {n: steps})}`;
  const effectData = {
    name: label,
    icon: "icons/svg/blood.svg",
    disabled: false,
    changes: [],
    flags: {[MODULE_ID]: {woundEffect: true, hindrance: steps}},
    description: `${i18n("CW.ModerateThreshold")} ${i18n("CW.MajorThreshold")}`
  };
  if (existing) await existing.update(effectData);
  else await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}

async function markTokensDefeated(actor) {
  const defeatedId = CONFIG.specialStatusEffects?.DEFEATED ?? "defeated";
  for (const token of actor.getActiveTokens(true, true)) {
    try { await token.document.toggleActiveEffect(defeatedId, {active:true}); } catch (_) {}
  }
}

async function announce(actor, key, severity) {
  if (!game.settings.get(MODULE_ID, "chatAnnouncements")) return;
  const content = `<div class="cypher-wounds-chat"><strong>${i18n("CW.Title")}</strong><p>${i18n(key,{name:actor.name,severity:game.i18n.localize(`CW.${severity[0].toUpperCase()+severity.slice(1)}`)})}</p></div>`;
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), content});
}

async function takeWound(actor, severity="minor") {
  if (!canEdit(actor)) return ui.notifications.warn(i18n("CW.NoPermission"));
  let data = await getData(actor);
  let idx = SEVERITIES.indexOf(severity);
  if (idx < 0) idx = 0;
  let applied = SEVERITIES[idx];
  while (idx < SEVERITIES.length && data.current[SEVERITIES[idx]] >= data.capacity[SEVERITIES[idx]]) idx++;
  if (idx >= SEVERITIES.length) {
    ui.notifications.warn(i18n("CW.MajorFull"));
    return data;
  }
  applied = SEVERITIES[idx];
  data.current[applied]++;
  data = await saveData(actor, data);
  if (applied !== severity) ui.notifications.info(i18n(severity === "minor" ? "CW.MinorFull" : "CW.ModerateFull"));
  await announce(actor, "CW.ChatTakes", applied);
  return data;
}

async function healWound(actor, severity=null) {
  if (!canEdit(actor)) return ui.notifications.warn(i18n("CW.NoPermission"));
  let data = await getData(actor);
  let target = severity;
  if (!target) target = [...SEVERITIES].reverse().find(s => data.current[s] > 0);
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
  data.current = {minor:0,moderate:0,major:0};
  await saveData(actor,data);
  if (game.settings.get(MODULE_ID,"chatAnnouncements")) await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content:`<strong>${i18n("CW.Title")}</strong><p>${i18n("CW.ChatClears",{name:actor.name})}</p>`});
}

function slotsHtml(data, severity, compact=false) {
  const cls = compact ? "cw-dot" : "cw-slot";
  return Array.from({length:data.capacity[severity]},(_,i)=>`<button type="button" class="${cls} ${severity} ${i < data.current[severity] ? "filled" : ""}" data-action="slot" data-severity="${severity}" data-index="${i}" aria-label="${severity} ${i+1}"></button>`).join("");
}

function statusHtml(data) {
  const steps = hindrance(data);
  if (isDead(data)) return `<span class="cw-danger">${i18n("CW.Dead")}</span>`;
  return steps ? (steps===1 ? i18n("CW.OneStep") : i18n("CW.Steps",{n:steps})) : i18n("CW.None");
}

async function openTracker(actor) {
  if (!actor) return ui.notifications.warn(i18n("CW.InvalidActor"));
  const data = await getData(actor);
  const content = `<div class="cypher-wounds-dialog" data-actor="${actor.uuid}">
    ${SEVERITIES.map(s=>`<div class="cw-row"><strong>${i18n(`CW.${s[0].toUpperCase()+s.slice(1)}`)}</strong><div class="cw-slots">${slotsHtml(data,s)}</div><button type="button" data-action="take" data-severity="${s}"><i class="fa-solid fa-plus"></i></button></div>`).join("")}
    <div class="cw-status"><strong>${i18n("CW.Status")}:</strong> ${statusHtml(data)} · <strong>${i18n("CW.Hindrance")}:</strong> ${statusHtml(data)}</div>
    <div class="cw-actions"><button type="button" data-action="heal"><i class="fa-solid fa-kit-medical"></i> ${i18n("CW.Heal")}</button><button type="button" data-action="configure"><i class="fa-solid fa-sliders"></i> ${i18n("CW.Configure")}</button><button type="button" data-action="reset"><i class="fa-solid fa-rotate-left"></i> ${i18n("CW.Reset")}</button></div>
  </div>`;
  new Dialog({title:`${i18n("CW.Title")}: ${actor.name}`,content,buttons:{close:{label:game.i18n.localize("Close")}},render:html=>bindTracker(html,actor)}).render(true);
}

function bindTracker(html, actor) {
  html.on("click","[data-action]",async ev=>{
    const el=ev.currentTarget; const action=el.dataset.action;
    if(action==="take") await takeWound(actor,el.dataset.severity);
    if(action==="heal") await healWound(actor);
    if(action==="reset") await clearWounds(actor);
    if(action==="slot") await setSlot(actor,el.dataset.severity,Number(el.dataset.index));
    if(action==="configure") return configure(actor);
    const app=Object.values(ui.windows).find(w=>w.element?.find?.(`.cypher-wounds-dialog[data-actor="${actor.uuid}"]`).length);
    app?.close(); openTracker(actor);
  });
}

async function configure(actor) {
  const data=await getData(actor);
  const content=`<form class="cw-config">${SEVERITIES.map(s=>`<div class="form-group"><label>${i18n(`CW.${s[0].toUpperCase()+s.slice(1)}`)}</label><input type="number" min="1" max="20" name="${s}" value="${data.capacity[s]}"></div>`).join("")}</form>`;
  new Dialog({title:i18n("CW.Configure"),content,buttons:{save:{label:i18n("CW.Save"),callback:async html=>{for(const s of SEVERITIES)data.capacity[s]=Number(html.find(`[name="${s}"]`).val());await saveData(actor,data);}},cancel:{label:i18n("CW.Cancel")}}}).render(true);
}

async function injectSheet(app, html) {
  if (!game.settings.get(MODULE_ID,"injectSheet")) return;
  const actor=app.actor; if(!actor || actor.type === "npc") return;
  const data=await getData(actor);
  html.find(".cypher-wounds-strip").remove();
  const strip=$(`<div class="cypher-wounds-strip"><span class="cw-title"><i class="fa-solid fa-heart-crack"></i> ${i18n("CW.Title")}</span>${SEVERITIES.map(s=>`<span class="cw-group"><span class="cw-label">${i18n(`CW.${s[0].toUpperCase()+s.slice(1)}`)}</span>${slotsHtml(data,s,true)}</span>`).join("")}<span>${statusHtml(data)}</span><button class="cw-open" type="button" title="${i18n("CW.Open")}"><i class="fa-solid fa-up-right-from-square"></i></button></div>`);
  const target=html.find("form").first();
  if(target.length) target.prepend(strip); else html.prepend(strip);
  strip.on("click","[data-action=slot]",async ev=>{ev.preventDefault();await setSlot(actor,ev.currentTarget.dataset.severity,Number(ev.currentTarget.dataset.index));app.render(false);});
  strip.find(".cw-open").on("click",ev=>{ev.preventDefault();openTracker(actor);});
}

Hooks.once("init",()=>{
  game.settings.register(MODULE_ID,"injectSheet",{name:"CW.Settings.Inject.Name",hint:"CW.Settings.Inject.Hint",scope:"world",config:true,type:Boolean,default:true});
  game.settings.register(MODULE_ID,"chatAnnouncements",{name:"CW.Settings.Chat.Name",hint:"CW.Settings.Chat.Hint",scope:"world",config:true,type:Boolean,default:true});
  game.settings.register(MODULE_ID,"markDefeated",{name:"CW.Settings.Defeated.Name",hint:"CW.Settings.Defeated.Hint",scope:"world",config:true,type:Boolean,default:true});
  game.settings.register(MODULE_ID,"playersEdit",{name:"CW.Settings.Players.Name",hint:"CW.Settings.Players.Hint",scope:"world",config:true,type:Boolean,default:true});
  game.settings.register(MODULE_ID,"tokenHUD",{name:"CW.Settings.TokenHUD.Name",hint:"CW.Settings.TokenHUD.Hint",scope:"world",config:true,type:Boolean,default:true});
});

async function migrateLegacyWounds() {
  if (!game.user.isGM) return;
  for (const actor of game.actors ?? []) {
    const current = actor.getFlag(MODULE_ID, "wounds");
    if (current) continue;
    const legacy = actor.getFlag(LEGACY_MODULE_ID, "wounds");
    if (legacy) await actor.setFlag(MODULE_ID, "wounds", normalize(legacy));
  }
}

Hooks.once("ready",async()=>{
  await migrateLegacyWounds();
  game.cypherWounds={open:openTracker,take:takeWound,heal:healWound,clear:clearWounds,getData,hindrance};
  game.cypher2Toolkit = game.cypher2Toolkit ?? {};
  Object.assign(game.cypher2Toolkit, {wounds: game.cypherWounds});
});

Hooks.on("renderActorSheet",injectSheet);
Hooks.on("getActorSheetHeaderButtons",(app,buttons)=>{if(app.actor?.type!=="npc")buttons.unshift({label:i18n("CW.Title"),class:"cypher-wounds-open",icon:"fas fa-heart-crack",onclick:()=>openTracker(app.actor)});});
Hooks.on("renderTokenHUD",async(hud,html,data)=>{
  if(!game.settings.get(MODULE_ID,"tokenHUD"))return;
  const actor=canvas.tokens.get(data._id)?.actor; if(!actor)return;
  const wounds=await getData(actor);
  const btn=$(`<div class="control-icon cypher-wounds-hud ${hindrance(wounds)?"active":""}" title="${i18n("CW.Open")}"><i class="fa-solid fa-heart-crack"></i></div>`);
  btn.on("click",()=>openTracker(actor)); html.find(".col.right").append(btn);
});
Hooks.on("updateActor",actor=>{for(const app of Object.values(actor.apps??{}))app.render(false);});
