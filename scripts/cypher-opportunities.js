const MODULE_ID = "cypher-2-toolkit";
const PANEL_ID = "c2t-cypher-opportunities";
const STATE_SETTING = "cypherOpportunityState";
const ENABLED_SETTING = "cypherOpportunityAssistant";
const HISTORY_LIMIT = 18;
const HAND_SIZE = 3;
const SOCKET_CHANNEL = `module.${MODULE_ID}`;
const OFFER_FLAG = "cypherOffer";
const OPPORTUNITY_CATEGORY = "Combat Opportunities";
const SCENE_PLAN_FLAG = "cypherOpportunityPlan";

const CONTEXTS = ["combat", "defense", "social", "stealth", "exploration", "chase", "recovery", "knowledge", "survival", "dramatic"];

const CATALOG_ROWS = [
  ["Amazing effort", 254, "dramatic", "combat"], ["Berserk", 254, "combat", "dramatic"],
  ["Best tool", 254, "exploration", "knowledge"], ["Bleed", 254, "combat"],
  ["Burst of speed", 254, "chase", "combat"], ["Calm sniper", 254, "combat", "stealth"],
  ["Collateral damage", 254, "combat", "dramatic"], ["Combat enhancer", 254, "combat"],
  ["Counterattack", 254, "combat", "defense"], ["Crying jag", 254, "social", "dramatic"],
  ["Deflect wound", 255, "defense", "recovery"], ["Disarm", 255, "combat", "defense"],
  ["Disease recovery", 255, "recovery", "survival"], ["Double attack", 255, "combat"],
  ["Equipment cache", 255, "exploration", "dramatic"], ["Extended breath", 255, "survival", "exploration"],
  ["Feat of strength", 255, "combat", "exploration"], ["Focus fire", 255, "combat"],
  ["Fortuitous moment", 256, "dramatic", "social"], ["Fortunate fluke", 256, "dramatic"],
  ["Get to the point", 256, "social", "knowledge"], ["Hamper foe", 256, "combat", "defense"],
  ["Horizon observer", 256, "exploration", "knowledge"], ["Ignite", 256, "combat", "survival"],
  ["Improved acrobatics", 256, "chase", "exploration"], ["Improved blocking", 256, "defense", "combat"],
  ["Improved charm", 256, "social"], ["Improved climbing", 256, "exploration", "chase"],
  ["Improved deception", 256, "social", "stealth"], ["Improved dexterity", 257, "chase", "exploration"],
  ["Improved disguising", 257, "stealth", "social"], ["Improved dodging", 257, "defense", "chase"],
  ["Improved driving", 257, "chase", "exploration"], ["Improved escaping", 257, "chase", "defense"],
  ["Improved healing", 258, "recovery", "knowledge"], ["Improved initiative", 258, "combat", "dramatic"],
  ["Improved intimidation", 258, "social", "combat"], ["Improved jumping", 258, "chase", "exploration"],
  ["Improved lockpicking", 258, "stealth", "exploration"], ["Improved perception", 258, "knowledge", "exploration"],
  ["Improved pickpocketing", 258, "stealth", "social"], ["Improved repairing", 258, "knowledge", "exploration"],
  ["Improved sneaking", 259, "stealth"], ["Improved swimming", 259, "survival", "exploration"],
  ["Improvised range", 259, "combat", "exploration"], ["Improvised shelter", 259, "survival", "exploration"],
  ["Improvised shield", 259, "defense", "survival"], ["Inhibit foe", 259, "combat", "defense"],
  ["Inspire aggression", 259, "social", "combat"], ["Intellect replenisher", 260, "recovery", "knowledge"],
  ["Knockout", 260, "combat", "stealth"], ["Lucid moment", 260, "knowledge", "dramatic"],
  ["Maintain temperature", 260, "survival", "exploration"], ["Make passage", 260, "exploration", "dramatic"],
  ["Master password", 260, "knowledge", "stealth"], ["Mental concentration", 260, "knowledge", "dramatic"],
  ["Might replenisher", 261, "recovery", "combat"], ["Motivated aid", 261, "social", "dramatic"],
  ["Near-death experience", 261, "recovery", "dramatic"], ["Noncombat enhancer", 261, "exploration", "social", "knowledge"],
  ["Not me", 261, "defense", "social", "dramatic"], ["Offensive object break", 261, "combat", "exploration"],
  ["Pacify beast", 261, "social", "survival"], ["Perfect moment", 261, "dramatic", "combat"],
  ["Pidgin", 262, "social", "exploration"], ["Poison recovery", 262, "recovery", "survival"],
  ["Press the advantage", 262, "combat", "dramatic"], ["Push", 262, "combat", "defense"],
  ["Quick disable", 262, "stealth", "knowledge"], ["Quick feint", 262, "combat", "social"],
  ["Quick funds", 262, "social", "dramatic"], ["Remembering", 263, "knowledge", "dramatic"],
  ["Repel", 263, "defense", "combat"], ["Restrain", 263, "combat", "defense"],
  ["Reveal unseen", 263, "knowledge", "exploration"], ["Sated", 263, "survival", "recovery"],
  ["Secret", 263, "knowledge", "social"], ["Silent message", 263, "stealth", "social"],
  ["Slippery", 263, "chase", "defense"], ["Snap alert", 264, "defense", "knowledge"],
  ["Speed replenisher", 264, "recovery", "chase"], ["Take one for the team", 264, "defense", "dramatic"],
  ["Teach trick", 264, "social", "knowledge"], ["Traumatic amnesia", 264, "social", "dramatic"],
  ["Wound recovery", 264, "recovery", "survival"], ["Wounded desperation", 264, "combat", "dramatic", "recovery"]
];

const CATALOG = CATALOG_ROWS.map(([name, page, ...tags]) => ({ name, page, tags }));
const NARRATIVE_IDEAS = new Map(Object.entries({
  "Amazing effort": "Quando tudo parece exigir mais do que o corpo aguenta, o personagem encontra uma reserva inesperada de determinação.",
  "Berserk": "A pressão da luta rompe o último freio: por alguns instantes, atacar parece mais importante do que se proteger.",
  "Best tool": "Entre os objetos à mão, o personagem percebe justamente aquilo que pode resolver o problema — ainda que nunca tenha sido feito para isso.",
  "Bleed": "O golpe encontra uma abertura pequena, mas decisiva, e deixa uma lesão que continua cobrando seu preço.",
  "Burst of speed": "Uma rota se abre por um instante, e o personagem reage antes que alguém consiga fechá-la.",
  "Calm sniper": "Em meio ao caos, tudo fica silencioso por um segundo e o alvo parece perfeitamente alinhado.",
  "Collateral damage": "O impacto atinge muito mais do que o alvo: cenário, cobertura e posição tornam-se parte do ataque.",
  "Combat enhancer": "O ritmo do confronto finalmente faz sentido, revelando uma maneira mais eficiente de lutar naquele momento.",
  "Counterattack": "Ao se defender, o personagem percebe que o ataque adversário também deixou uma brecha perfeita para responder.",
  "Crying jag": "Uma emoção represada vem à tona no pior — ou talvez no melhor — momento possível, mudando o tom da cena.",
  "Deflect wound": "No instante do impacto, um movimento, obstáculo ou golpe de sorte transforma um ferimento sério em algo suportável.",
  "Disarm": "A empunhadura vacila, o terreno atrapalha ou a guarda se abre: há uma chance clara de arrancar a arma do oponente.",
  "Disease recovery": "O organismo finalmente reage ao que o debilitava, como se tivesse encontrado a resposta de que precisava.",
  "Double attack": "Dois alvos se alinham, ou o primeiro movimento conduz naturalmente a um segundo golpe antes da reação inimiga.",
  "Equipment cache": "Um esconderijo, compartimento esquecido ou resto de expedição contém exatamente o tipo de recurso que faltava.",
  "Extended breath": "O personagem controla a respiração e descobre que ainda consegue resistir muito além do esperado.",
  "Feat of strength": "A urgência transforma esforço em potência, permitindo mover, romper ou sustentar algo que parecia impossível.",
  "Focus fire": "O personagem identifica o ponto que todos precisam atingir e coordena o ataque no instante certo.",
  "Fortuitous moment": "Uma coincidência improvável reorganiza a cena e coloca a oportunidade certa ao alcance do personagem.",
  "Fortunate fluke": "Algo dá certo pelo motivo errado — e, por sorte, o resultado é exatamente o necessário.",
  "Get to the point": "Uma palavra, gesto ou detalhe corta toda a distração e leva a conversa diretamente ao que realmente importa.",
  "Hamper foe": "O terreno, a postura ou um erro do adversário oferece uma forma simples de limitar seus próximos movimentos.",
  "Horizon observer": "Ao olhar além do óbvio, o personagem percebe movimento, relevo ou sinais que revelam o que existe adiante.",
  "Ignite": "Uma faísca, fonte de calor ou material vulnerável permite que o fogo surja exatamente onde fará diferença.",
  "Improved acrobatics": "O ambiente oferece apoios e impulsos que transformam uma manobra arriscada em um movimento fluido.",
  "Improved blocking": "O personagem entende o padrão do ataque e posiciona a defesa no lugar certo antes do impacto.",
  "Improved charm": "Um detalhe em comum ou uma reação sincera cria uma conexão imediata com quem está ouvindo.",
  "Improved climbing": "Fendas, saliências e apoios antes invisíveis formam uma rota clara para a subida.",
  "Improved deception": "A situação fornece um detalhe verdadeiro que torna a mentira muito mais convincente.",
  "Improved dexterity": "Por alguns instantes, mãos e reflexos acompanham o pensamento sem qualquer hesitação.",
  "Improved disguising": "Luz, postura e pequenos elementos do ambiente completam o disfarce melhor do que qualquer preparação.",
  "Improved dodging": "O personagem antecipa a trajetória do perigo e já está saindo do caminho quando ele chega.",
  "Improved driving": "A máquina responde perfeitamente, e o terreno parece indicar a manobra que ninguém mais tentaria.",
  "Improved escaping": "Uma falha na contenção ou um instante de distração revela a saída que estava faltando.",
  "Improved healing": "Um sinal no ferimento mostra ao personagem a intervenção exata capaz de estabilizar a situação.",
  "Improved initiative": "O personagem reconhece o início da ameaça antes dos demais e age no primeiro instante possível.",
  "Improved intimidation": "Uma demonstração precisa deixa claro que resistir terá consequências muito piores do que cooperar.",
  "Improved jumping": "Distância e impulso se encaixam, revelando o ponto exato de onde saltar e onde aterrissar.",
  "Improved lockpicking": "O mecanismo oferece uma resistência reveladora, como se mostrasse ao personagem onde deve ser manipulado.",
  "Improved perception": "Um som deslocado, uma sombra ou uma ausência chama atenção e faz o detalhe escondido se destacar.",
  "Improved pickpocketing": "A atenção do alvo se desvia no momento perfeito, deixando seus pertences desprotegidos.",
  "Improved repairing": "O defeito revela sua lógica e uma solução improvisada parece capaz de manter tudo funcionando.",
  "Improved sneaking": "Ruídos, sombras e movimentos ao redor criam uma passagem discreta que talvez não se repita.",
  "Improved swimming": "A corrente deixa de ser obstáculo e passa a indicar como avançar com muito menos esforço.",
  "Improvised range": "Altura, ricochete ou uma posição privilegiada coloca um alvo distante ao alcance do ataque.",
  "Improvised shelter": "Destroços, vegetação ou estruturas próximas podem ser reunidos rapidamente em uma proteção segura.",
  "Improvised shield": "Um objeto resistente entra na trajetória do perigo e pode servir de defesa por tempo suficiente.",
  "Inhibit foe": "O personagem percebe o hábito que antecede as ações do inimigo e encontra uma maneira de quebrar seu ritmo.",
  "Inspire aggression": "Uma provocação ou demonstração de coragem incendeia os ânimos e empurra alguém para o confronto.",
  "Intellect replenisher": "Uma lembrança, descoberta ou breve pausa organiza os pensamentos e devolve clareza ao personagem.",
  "Knockout": "O adversário fica exposto por um instante, oferecendo a chance de encerrar a luta com um único golpe preciso.",
  "Lucid moment": "A confusão se desfaz subitamente e o personagem enxerga a situação com uma clareza quase impossível.",
  "Maintain temperature": "O personagem encontra uma forma de conservar ou dissipar calor, mantendo o corpo e os recursos em equilíbrio.",
  "Make passage": "Uma fraqueza na barreira revela onde abrir caminho sem precisar seguir a rota esperada.",
  "Master password": "Padrões, pistas e hábitos do criador convergem para uma palavra ou código que parece inevitavelmente correto.",
  "Mental concentration": "Mesmo cercado por distrações, o personagem encontra um ponto de foco e sustenta o pensamento necessário.",
  "Might replenisher": "Adrenalina, descanso breve ou pura teimosia devolve força aos músculos cansados.",
  "Motivated aid": "A ajuda chega com propósito renovado, e quem colabora percebe exatamente como fazer a diferença.",
  "Near-death experience": "Ao chegar perto do fim, o personagem encontra um motivo urgente para continuar e se agarra a ele.",
  "Noncombat enhancer": "Fora da luta, tempo, ferramentas e circunstâncias se alinham para favorecer uma tarefa importante.",
  "Not me": "O perigo hesita, muda de direção ou encontra um alvo mais imediato, deixando o personagem fora de seu foco.",
  "Offensive object break": "O personagem nota a peça, apoio ou cobertura cuja destruição prejudicará diretamente o adversário.",
  "Pacify beast": "A criatura demonstra um medo ou necessidade que pode ser reconhecido e acalmado sem violência.",
  "Perfect moment": "Todas as condições se alinham por um breve instante; esperar mais significaria perder a oportunidade.",
  "Pidgin": "Gestos, palavras parecidas e contexto bastam para construir uma linguagem improvisada entre desconhecidos.",
  "Poison recovery": "O corpo começa a expulsar a toxina, e uma intervenção simples acelera essa reação.",
  "Press the advantage": "O inimigo ainda tenta se recompor do último revés, abrindo espaço para manter a pressão.",
  "Push": "O equilíbrio do alvo falha perto de uma borda, obstáculo ou posição que o personagem pode explorar.",
  "Quick disable": "O mecanismo tem um ponto vulnerável visível, permitindo neutralizá-lo antes que alguém reaja.",
  "Quick feint": "Um movimento convincente atrai a defesa para o lado errado e cria uma abertura imediata.",
  "Quick funds": "Uma dívida lembrada, objeto negociável ou pequena reserva esquecida fornece os recursos necessários.",
  "Remembering": "Uma imagem, palavra ou sensação desperta a lembrança exata que parecia perdida.",
  "Repel": "Força, posição e impulso se combinam para afastar a ameaça e recuperar espaço na cena.",
  "Restrain": "Roupas, cabos, terreno ou a própria postura do alvo oferecem uma chance de prendê-lo no lugar.",
  "Reveal unseen": "Poeira, reflexos, ruídos ou alterações no ambiente denunciam aquilo que não podia ser visto diretamente.",
  "Sated": "Uma pequena quantidade de alimento, água ou energia satisfaz muito mais do que deveria naquele momento.",
  "Secret": "Uma pausa, contradição ou detalhe fora do lugar revela que alguém está escondendo algo importante.",
  "Silent message": "Olhares, sinais discretos ou uma coincidência sonora permitem transmitir uma ideia sem chamar atenção.",
  "Slippery": "A contenção perde firmeza e o personagem encontra espaço para escapar antes que seja ajustada.",
  "Snap alert": "Um pressentimento ou sinal quase imperceptível coloca o personagem em alerta no instante anterior ao perigo.",
  "Speed replenisher": "O ritmo volta às pernas e aos reflexos, como se o cansaço tivesse sido deixado para trás.",
  "Take one for the team": "O personagem percebe que pode entrar no caminho do perigo e impedir que ele alcance outra pessoa.",
  "Teach trick": "Uma explicação rápida e um bom exemplo permitem que outra pessoa repita uma técnica inesperada.",
  "Traumatic amnesia": "O choque do momento embaralha uma lembrança específica, tornando-a distante ou inacessível.",
  "Wound recovery": "O ferimento responde melhor do que o esperado ao cuidado, ao repouso ou à determinação do personagem.",
  "Wounded desperation": "A dor transforma hesitação em urgência e permite uma reação extrema quando recuar já não parece possível."
}));
let cypherSources = new Map();
let hand = [];
let panelOpen = false;
let searchQuery = "";
let selectedCypher = "";
const overflowTimers = new Map();
const openOverflowDialogs = new Set();
let state = { contexts: ["dramatic"], saved: [], history: [], collapsed: false, view: "suggestions", left: null, top: 80 };

const t = (key, data = {}) => game.i18n.format(`C2T.Opportunities.${key}`, data);
const normalize = value => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const catalogByName = new Map(CATALOG.map(entry => [normalize(entry.name), entry]));

function loadState() {
  try {
    const raw = JSON.parse(game.settings.get(MODULE_ID, STATE_SETTING) || "{}");
    state = {
      contexts: Array.isArray(raw.contexts) && raw.contexts.length ? raw.contexts.filter(context => CONTEXTS.includes(context)) : ["dramatic"],
      saved: Array.isArray(raw.saved) ? raw.saved.filter(name => catalogByName.has(normalize(name))).slice(0, 20) : [],
      history: Array.isArray(raw.history) ? raw.history.filter(name => catalogByName.has(normalize(name))).slice(-HISTORY_LIMIT) : [],
      collapsed: Boolean(raw.collapsed),
      view: ["suggestions", "catalog", "saved", "scene"].includes(raw.view) ? raw.view : "suggestions",
      left: raw.left !== null && raw.left !== undefined && Number.isFinite(Number(raw.left)) ? Number(raw.left) : null,
      top: Number.isFinite(Number(raw.top)) ? Number(raw.top) : 120
    };
  } catch (_) {}
}

async function saveState() {
  await game.settings.set(MODULE_ID, STATE_SETTING, JSON.stringify(state));
}

function sourceFromWorldItem(item) {
  return { name: item.name, img: item.img, uuid: item.uuid, type: item.type, description: item.system?.description ?? item.system?.basic?.description ?? "", source: "world", document: item };
}

async function buildSourceIndex() {
  const found = new Map();
  for (const item of game.items ?? []) {
    const key = normalize(item.name);
    if (catalogByName.has(key) && !found.has(key)) found.set(key, sourceFromWorldItem(item));
  }
  for (const pack of game.packs ?? []) {
    if (pack.documentName !== "Item") continue;
    try {
      const index = await pack.getIndex({ fields: ["name", "type", "img", "system.description", "system.basic.description"] });
      for (const entry of index) {
        const key = normalize(entry.name);
        if (!catalogByName.has(key) || found.has(key)) continue;
        found.set(key, { name: entry.name, img: entry.img, uuid: entry.uuid, type: entry.type, description: entry.system?.description ?? entry.system?.basic?.description ?? "", source: pack.metadata?.label ?? pack.title ?? pack.collection, pack: pack.collection, id: entry._id ?? entry.id });
      }
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not index Item pack ${pack.collection}`, error);
    }
  }
  cypherSources = found;
  return found;
}

async function resolveSource(entry) {
  const source = cypherSources.get(normalize(entry.name));
  if (!source) return null;
  if (source.document) return source.document;
  if (source.uuid) {
    try { return await fromUuid(source.uuid); } catch (_) {}
  }
  if (source.pack && source.id) return game.packs.get(source.pack)?.getDocument(source.id) ?? null;
  return null;
}

function contextLabel(context) {
  return t(`Context.${context[0].toUpperCase() + context.slice(1)}`);
}

function weightedSuggestions(count = HAND_SIZE, excluded = []) {
  const blocked = new Set([...state.history, ...excluded].map(normalize));
  const saved = new Set(state.saved.map(normalize));
  const excludedNames = new Set(excluded.map(normalize));
  const contextualCatalog = CATALOG.filter(entry => entry.tags.some(tag => state.contexts.includes(tag)));
  const eligibleCatalog = contextualCatalog.length ? contextualCatalog : CATALOG;
  let pool = eligibleCatalog.filter(entry => !blocked.has(normalize(entry.name)) && !saved.has(normalize(entry.name)));
  if (pool.length < count) pool = eligibleCatalog.filter(entry => !excludedNames.has(normalize(entry.name)) && !saved.has(normalize(entry.name)));
  const selected = [];
  while (pool.length && selected.length < count) {
    const weighted = pool.map(entry => ({ entry, weight: 1 + entry.tags.filter(tag => state.contexts.includes(tag)).length * 6 + (cypherSources.has(normalize(entry.name)) ? 3 : 0) }));
    const total = weighted.reduce((sum, choice) => sum + choice.weight, 0);
    let roll = Math.random() * total;
    const picked = weighted.find(choice => (roll -= choice.weight) <= 0)?.entry ?? weighted.at(-1).entry;
    selected.push(picked);
    pool = pool.filter(entry => entry !== picked);
  }
  return selected;
}

function addHistory(names) {
  for (const name of names) {
    state.history = state.history.filter(existing => normalize(existing) !== normalize(name));
    state.history.push(name);
  }
  state.history = state.history.slice(-HISTORY_LIMIT);
}

function drawNewHand({ rememberCurrent = true } = {}) {
  if (rememberCurrent) addHistory(hand.map(entry => entry.name));
  hand = weightedSuggestions(HAND_SIZE);
  state.view = "suggestions";
  searchQuery = "";
  selectedCypher = "";
  saveState();
  renderPanel();
}

function replaceSuggestion(name) {
  addHistory([name]);
  const index = hand.findIndex(entry => normalize(entry.name) === normalize(name));
  if (index < 0) return;
  const replacement = weightedSuggestions(1, hand.map(entry => entry.name))[0];
  if (replacement) hand[index] = replacement;
  saveState();
  renderPanel();
}

function toggleSaved(name) {
  const existing = state.saved.findIndex(saved => normalize(saved) === normalize(name));
  if (existing >= 0) state.saved.splice(existing, 1);
  else state.saved.unshift(name);
  state.saved = state.saved.slice(0, 20);
  saveState();
  renderPanel();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function effectSummary(description, maxLength = 190) {
  if (!description) return t("NoEffectSummary");
  const container = document.createElement("div");
  container.innerHTML = String(description);
  const effectBlocks = [...container.querySelectorAll("p"), ...container.querySelectorAll("div")];
  const effectBlock = effectBlocks.find(element => /^\s*Effect\s*:/i.test(element.textContent ?? ""));
  const plain = String(effectBlock?.textContent ?? container.textContent ?? "").replace(/^\s*Effect\s*:\s*/i, "").replace(/\s+/g, " ").trim();
  if (!plain) return t("NoEffectSummary");
  return escapeHtml(plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trim()}…` : plain);
}

function plainDescription(description) {
  const container = document.createElement("div");
  container.innerHTML = String(description ?? "");
  return String(container.textContent ?? "").replace(/\s+/g, " ").trim();
}

function narrativeIdea(entry) {
  return NARRATIVE_IDEAS.get(entry.name) ?? t("NarrativeFallback");
}

function searchableEntryText(entry) {
  const source = cypherSources.get(normalize(entry.name));
  return normalize([
    entry.name,
    entry.tags.map(contextLabel).join(" "),
    narrativeIdea(entry),
    plainDescription(source?.description)
  ].join(" "));
}

function matchingCatalogEntries(query) {
  const terms = normalize(query).split(" ").filter(Boolean);
  if (!terms.length) return CATALOG;
  return CATALOG.filter(entry => {
    const text = searchableEntryText(entry);
    return terms.every(term => text.includes(term));
  });
}

function planningScene() {
  return canvas?.scene ?? game.scenes?.active ?? null;
}

function scenePlan(scene = planningScene()) {
  const plan = scene?.getFlag?.(MODULE_ID, SCENE_PLAN_FLAG);
  return Array.isArray(plan) ? plan.filter(item => item?.id && item?.name) : [];
}

function pendingScenePlanCount(scene = planningScene()) {
  return scenePlan(scene).filter(item => item.status === "pending" || item.status === "offered").length;
}

async function saveScenePlan(plan, scene = planningScene()) {
  if (!scene || !game.user?.isGM) return false;
  await scene.setFlag(MODULE_ID, SCENE_PLAN_FLAG, plan);
  Hooks.callAll("c2tScenePlanChanged", scene, plan);
  renderPanel();
  return true;
}

async function updatePlanStatus(sceneId, planId, status) {
  if (!sceneId || !planId || !game.user?.isGM) return;
  const scene = game.scenes.get(sceneId);
  if (!scene) return;
  const plan = scenePlan(scene);
  const index = plan.findIndex(item => item.id === planId);
  if (index < 0) return;
  plan[index] = {...plan[index], status, updatedAt: new Date().toISOString()};
  await saveScenePlan(plan, scene);
}

function planStatusLabel(status) {
  const normalized = ["pending", "offered", "accepted", "rejected", "delivered", "skipped"].includes(status) ? status : "pending";
  return t(`PlanStatus.${normalized[0].toUpperCase()}${normalized.slice(1)}`);
}

function plannedActorLabel(item) {
  return game.actors.get(item.actorId)?.name ?? t("DecideWhenOffering");
}

function scenePlanHtml() {
  const scene = planningScene();
  if (!scene) return `<section class="c2t-opportunity-workspace"><div class="c2t-opportunity-empty-state"><i class="fa-solid fa-clapperboard"></i><p>${escapeHtml(t("NoActiveScene"))}</p></div></section>`;
  const plan = scenePlan(scene);
  const rows = plan.map(item => {
    const entry = catalogByName.get(normalize(item.name));
    const source = entry ? cypherSources.get(normalize(entry.name)) : null;
    const pool = item.pool ? opportunityPoolLabel(item.pool) : t("DecideWhenOffering");
    const cost = item.cost !== null && item.cost !== "" && Number.isFinite(Number(item.cost)) ? Number(item.cost) : t("DecideWhenOffering");
    const narrative = item.narrative || (entry ? narrativeIdea(entry) : "");
    return `<article class="c2t-scene-plan-entry status-${escapeHtml(item.status || "pending")}" data-plan-id="${escapeHtml(item.id)}" data-cypher="${escapeHtml(item.name)}" draggable="true">
      <span class="c2t-scene-plan-handle" title="${t("DragToReorder")}"><i class="fa-solid fa-grip-vertical"></i></span>
      <img src="${source?.img || "icons/svg/mystery-man.svg"}" alt="">
      <div class="c2t-scene-plan-content"><header><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(planStatusLabel(item.status))}</span></header><p>${escapeHtml(narrative)}</p><small><i class="fa-solid fa-user"></i> ${escapeHtml(plannedActorLabel(item))} <i class="fa-solid fa-gauge-high"></i> ${escapeHtml(pool)} · ${escapeHtml(cost)}</small></div>
      <div class="c2t-scene-plan-actions"><button type="button" data-plan-action="offer" title="${t("OfferNow")}" ${entry && source ? "" : "disabled"}><i class="fa-solid fa-gift"></i> ${t("OfferNow")}</button><button type="button" data-plan-action="edit" title="${t("EditScenePlan")}"><i class="fa-solid fa-pen"></i></button><button type="button" data-plan-action="${item.status === "skipped" ? "restore" : "skip"}" title="${item.status === "skipped" ? t("RestorePending") : t("MarkSkipped")}"><i class="fa-solid ${item.status === "skipped" ? "fa-rotate-left" : "fa-forward"}"></i></button><button type="button" data-plan-action="remove" title="${t("RemoveFromPlan")}"><i class="fa-solid fa-trash"></i></button></div>
    </article>`;
  }).join("");
  return `<section class="c2t-opportunity-workspace c2t-scene-plan-workspace"><header><h3>${escapeHtml(t("ScenePlanHeading", {scene: scene.name}))}</h3><span>${escapeHtml(t("ScenePlanSummary", {pending: pendingScenePlanCount(scene), total: plan.length}))}</span></header>${plan.length ? `<div class="c2t-scene-plan-list">${rows}</div>` : `<div class="c2t-opportunity-empty-state"><i class="fa-solid fa-list-check"></i><p>${escapeHtml(t("NoScenePlan"))}</p></div>`}</section>`;
}

function cardHtml(entry, {replaceable = false} = {}) {
  const source = cypherSources.get(normalize(entry.name));
  const saved = state.saved.some(name => normalize(name) === normalize(entry.name));
  const selected = normalize(selectedCypher) === normalize(entry.name);
  return `<article class="c2t-opportunity-card ${selected ? "selected" : ""}" data-cypher="${entry.name}" tabindex="0">
    <header><img src="${source?.img || "icons/svg/mystery-man.svg"}" alt=""><div><strong>${entry.name}</strong><small>${t("Page", { page: entry.page })} · ${source ? t("Available") : t("ReferenceOnly")}</small></div></header>
    <div class="c2t-opportunity-tags">${entry.tags.map(tag => `<span>${contextLabel(tag)}</span>`).join("")}</div>
    <p class="c2t-opportunity-effect"><strong>${t("Effect")}:</strong> ${effectSummary(source?.description)}</p>
    <p class="c2t-opportunity-narrative-idea"><i class="fa-solid fa-lightbulb"></i><span><strong>${t("NarrativeIdea")}:</strong> ${escapeHtml(narrativeIdea(entry))}</span></p>
    <footer class="${replaceable ? "has-replace" : ""}">
      <button type="button" data-opportunity-action="offer" title="${t("Offer")}" ${source ? "" : "disabled"}><i class="fa-solid fa-gift"></i> ${t("Offer")}</button>
      <button type="button" data-opportunity-action="save" title="${saved ? t("Unsave") : t("Save")}"><i class="${saved ? "fa-solid" : "fa-regular"} fa-star"></i></button>
      <button type="button" data-opportunity-action="plan" title="${t("AddToScenePlan")}"><i class="fa-solid fa-list-check"></i></button>
      ${replaceable ? `<button type="button" data-opportunity-action="replace" title="${t("Replace")}"><i class="fa-solid fa-shuffle"></i></button>` : ""}
      <button type="button" data-opportunity-action="open" title="${t("OpenItem")}" ${source ? "" : "disabled"}><i class="fa-solid fa-up-right-from-square"></i></button>
    </footer>
  </article>`;
}

function workspaceHtml() {
  if (!searchQuery.trim() && state.view === "scene") return scenePlanHtml();
  let entries;
  let title;
  let empty;
  let replaceable = false;
  if (searchQuery.trim()) {
    entries = matchingCatalogEntries(searchQuery);
    title = t("SearchResults", {count: entries.length});
    empty = t("NoSearchResults");
  } else if (state.view === "catalog") {
    entries = CATALOG;
    title = t("FullCatalog", {count: entries.length});
    empty = t("NoSearchResults");
  } else if (state.view === "saved") {
    entries = state.saved.map(name => catalogByName.get(normalize(name))).filter(Boolean);
    title = t("Saved", {count: entries.length});
    empty = t("NoSaved");
  } else {
    entries = hand;
    title = t("SceneSuggestions");
    empty = t("NoSearchResults");
    replaceable = true;
  }
  return `<section class="c2t-opportunity-workspace">
    <header><h3>${escapeHtml(title)}</h3><span>${searchQuery.trim() ? escapeHtml(t("SearchingFor", {query: searchQuery.trim()})) : ""}</span></header>
    ${entries.length ? `<div class="c2t-opportunity-hand">${entries.map(entry => cardHtml(entry, {replaceable})).join("")}</div>` : `<div class="c2t-opportunity-empty-state"><i class="fa-solid fa-magnifying-glass"></i><p>${escapeHtml(empty)}</p></div>`}
  </section>`;
}

function panelHtml() {
  const available = cypherSources.size;
  const planned = scenePlan().length;
  return `<section id="${PANEL_ID}" class="c2t-opportunity-panel ${state.collapsed ? "collapsed" : ""}" style="${state.left === null ? "right: 18px;" : `left: ${state.left}px;`} top: ${state.top}px;">
    <header class="c2t-opportunity-header">
      <div><i class="fa-solid fa-wand-sparkles"></i><span>${t("Title")}</span><small>${available}/${CATALOG.length}</small></div>
      <div class="c2t-opportunity-header-actions"><button type="button" data-panel-action="refresh" title="${t("RefreshCatalog")}"><i class="fa-solid fa-rotate"></i></button><button type="button" data-panel-action="collapse" title="${t("Collapse")}"><i class="fa-solid ${state.collapsed ? "fa-chevron-up" : "fa-chevron-down"}"></i></button><button type="button" data-panel-action="close" title="${t("Close")}"><i class="fa-solid fa-xmark"></i></button></div>
    </header>
    <div class="c2t-opportunity-body">
      <div class="c2t-opportunity-navigation">
        <div class="c2t-opportunity-search"><i class="fa-solid fa-magnifying-glass"></i><input type="search" data-opportunity-search value="${escapeHtml(searchQuery)}" placeholder="${t("SearchPlaceholder")}" autocomplete="off"><button type="button" data-panel-action="clear-search" title="${t("ClearSearch")}" ${searchQuery ? "" : "hidden"}><i class="fa-solid fa-xmark"></i></button></div>
        <div class="c2t-opportunity-view-tabs">
          <button type="button" data-view="suggestions" class="${!searchQuery && state.view === "suggestions" ? "active" : ""}"><i class="fa-solid fa-wand-sparkles"></i> ${t("SuggestionsTab")}</button>
          <button type="button" data-view="catalog" class="${searchQuery || state.view === "catalog" ? "active" : ""}"><i class="fa-solid fa-table-cells-large"></i> ${t("CatalogTab")}</button>
          <button type="button" data-view="saved" class="${!searchQuery && state.view === "saved" ? "active" : ""}"><i class="fa-solid fa-star"></i> ${t("SavedTab", {count: state.saved.length})}</button>
          <button type="button" data-view="scene" class="${!searchQuery && state.view === "scene" ? "active" : ""}"><i class="fa-solid fa-list-check"></i> ${t("ScenePlanTab", {count: planned})}</button>
        </div>
      </div>
      <div class="c2t-opportunity-scene-tools">
        <div><strong>${t("SceneContext")}</strong><small>${t("ContextHint")}</small></div>
        <div class="c2t-opportunity-contexts">${CONTEXTS.map(context => `<button type="button" data-context="${context}" class="${state.contexts.includes(context) ? "active" : ""}">${contextLabel(context)}</button>`).join("")}</div>
        <div class="c2t-opportunity-toolbar"><button type="button" data-panel-action="draw"><i class="fa-solid fa-shuffle"></i> ${t("NewHand")}</button><button type="button" data-panel-action="dramatic"><i class="fa-solid fa-bolt"></i> ${t("DramaticMoment")}</button></div>
      </div>
      <div data-opportunity-workspace>${workspaceHtml()}</div>
      <footer class="c2t-opportunity-footer"><span>${t("History", { count: state.history.length })}</span><button type="button" data-panel-action="clear-history">${t("ClearHistory")}</button></footer>
    </div>
  </section>`;
}

function clampPanelPosition(element, left, top) {
  const width = element.offsetWidth || 390;
  const height = element.offsetHeight || 56;
  return { left: Math.max(4, Math.min(window.innerWidth - width - 4, left)), top: Math.max(4, Math.min(window.innerHeight - height - 4, top)) };
}

function bindDrag(panel) {
  const handle = panel.querySelector(".c2t-opportunity-header");
  handle?.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    panel.style.right = "auto";
    const move = moveEvent => {
      const position = clampPanelPosition(panel, moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
      panel.style.left = `${position.left}px`;
      panel.style.top = `${position.top}px`;
    };
    const end = endEvent => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      const position = clampPanelPosition(panel, endEvent.clientX - offsetX, endEvent.clientY - offsetY);
      state.left = position.left;
      state.top = position.top;
      saveState();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  });
}

function actorOptions() {
  return Array.from(game.actors ?? []).filter(actor => actor.type === "pc" && (actor.hasPlayerOwner || game.user.isGM)).sort((a, b) => a.name.localeCompare(b.name));
}

function primaryActiveGm() {
  return Array.from(game.users ?? []).filter(user => user.active && user.isGM).sort((a, b) => a.id.localeCompare(b.id))[0] ?? null;
}

function actorAudience(actor) {
  return Array.from(game.users ?? []).filter(user => user.isGM || actor.testUserPermission(user, "OWNER")).map(user => user.id);
}

function activeActorOwner(actor) {
  return Array.from(game.users ?? []).filter(user => user.active && !user.isGM && actor.testUserPermission(user, "OWNER")).sort((a, b) => a.id.localeCompare(b.id))[0] ?? primaryActiveGm();
}

function isLimitEligibleCypher(item) {
  return item?.type === "cypher"
    && !item.system?.archived
    && !item.getFlag?.(MODULE_ID, "randomCypher");
}

function carriedCyphers(actor) {
  return Array.from(actor?.items ?? []).filter(isLimitEligibleCypher);
}

function actorCypherLimit(actor) {
  const limit = Number(actor?.system?.equipment?.cypherLimit);
  return Number.isFinite(limit) ? Math.max(0, limit) : 0;
}

const OPPORTUNITY_POOLS = new Set(["might", "speed", "intellect"]);

function opportunityPoolLabel(pool) {
  const key = pool === "speed" ? "Speed" : pool === "intellect" ? "Intellect" : "Might";
  return game.i18n.localize(`C2T.Resources.${key}`);
}

function opportunityPoolPath(actor, pool) {
  const teen = actor?.system?.basic?.unmaskedForm === "Teen";
  return teen ? `system.teen.pools.${pool}.value` : `system.pools.${pool}.value`;
}

function opportunityPoolValue(actor, pool) {
  const teen = actor?.system?.basic?.unmaskedForm === "Teen";
  const root = teen ? actor?.system?.teen?.pools : actor?.system?.pools;
  return Number(root?.[pool]?.value ?? 0);
}

async function spendOpportunityCost(actor, pool, cost) {
  const normalizedPool = OPPORTUNITY_POOLS.has(pool) ? pool : "might";
  const normalizedCost = Math.max(0, Math.trunc(Number(cost) || 0));
  const current = opportunityPoolValue(actor, normalizedPool);
  if (current < normalizedCost) return {ok: false, pool: normalizedPool, cost: normalizedCost, current};
  const path = opportunityPoolPath(actor, normalizedPool);
  await actor.update({[path]: current - normalizedCost});
  return {ok: true, pool: normalizedPool, cost: normalizedCost, current, path};
}

async function restoreOpportunityCost(actor, payment) {
  if (payment?.ok && payment.cost > 0) await actor.update({[payment.path]: payment.current});
}

async function notifyInsufficientPool(actor, pool, cost, current) {
  const content = `<div class="c2t-opportunity-chat"><h3><i class="fa-solid fa-circle-exclamation"></i> ${t("CannotAcceptTitle")}</h3><p>${t("CannotAfford", {actor: actor.name, pool: opportunityPoolLabel(pool), cost, current})}</p></div>`;
  await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content, whisper: actorAudience(actor)});
}

function opportunityItemDescription(description, opportunity) {
  const container = document.createElement("div");
  container.innerHTML = String(description ?? "");
  container.querySelectorAll(".c2t-acquired-opportunity").forEach(element => element.remove());
  for (const element of Array.from(container.querySelectorAll("p, div"))) {
    if (/^\s*Explanation\s*:/i.test(element.textContent ?? "")) element.remove();
  }
  const narrative = escapeHtml(opportunity.narrative).replace(/\n/g, "<br>");
  const narrativeBlock = narrative ? `<p><strong>${t("Narrative")}:</strong> ${narrative}</p>` : "";
  return `<div class="c2t-acquired-opportunity">${narrativeBlock}<p><strong>${t("AcquisitionCost")}:</strong> ${opportunity.cost} ${opportunityPoolLabel(opportunity.pool)} (${t("EdgeIgnored")})</p></div>${container.innerHTML}`;
}

function offerChatContent(entry, actor, item, narrative, pool, cost, interactive = false) {
  const link = item?.uuid ? `@UUID[${item.uuid}]{${entry.name}}` : `<strong>${entry.name}</strong>`;
  const actions = interactive ? `<div class="c2t-cypher-offer-actions"><button type="button" data-c2t-offer-action="accept"><i class="fa-solid fa-check"></i> ${t("Accept")}</button><button type="button" data-c2t-offer-action="reject"><i class="fa-solid fa-xmark"></i> ${t("Reject")}</button></div>` : "";
  const narrativeHtml = escapeHtml(narrative).replace(/\n/g, "<br>");
  const narrativeBlock = narrativeHtml ? `<p><em>${narrativeHtml}</em></p>` : "";
  return `<div class="c2t-opportunity-chat"><h3><i class="fa-solid fa-wand-sparkles"></i> ${t("ChatTitle")}</h3><p>${t("ChatOffer", { actor: actor.name, cypher: link })}</p>${narrativeBlock}<p class="c2t-opportunity-cost"><strong>${t("OpportunityCost", {cost, pool: opportunityPoolLabel(pool)})}</strong> ${t("EdgeIgnored")}</p>${actions}</div>`;
}

function opportunityAbilityData(item, opportunity) {
  const original = item.toObject();
  const description = opportunityItemDescription(
    foundry.utils.getProperty(original, "system.description") ?? foundry.utils.getProperty(original, "system.basic.description"),
    opportunity
  );
  const moduleFlags = foundry.utils.mergeObject(original.flags?.[MODULE_ID] ?? {}, {
    randomCypher: true,
    category: "abilities",
    opportunity: {
      ...opportunity,
      sourceUuid: opportunity.sourceUuid ?? item.uuid ?? null,
      acquiredAt: opportunity.acquiredAt ?? new Date().toISOString(),
      usedOnce: Boolean(opportunity.usedOnce),
      useCount: Math.max(0, Number(opportunity.useCount) || 0)
    }
  }, {inplace: false, overwrite: true});
  return {
    name: original.name,
    type: "ability",
    img: original.img,
    system: {
      version: 2,
      description,
      archived: Boolean(original.system?.archived),
      favorite: Boolean(original.system?.favorite),
      basic: {cost: opportunity.usedOnce ? "1" : "0", pool: opportunity.usedOnce ? "XP" : "Pool"},
      settings: {
        general: {sorting: OPPORTUNITY_CATEGORY, spellTier: "low", unmaskedForm: "Mask"},
        rollButton: {pool: "Pool", skill: "Practiced", assets: 0, effort1: 0, effort2: 0, effort3: 0, freeEffort: 0, stepModifier: "eased", additionalSteps: 0, additionalCost: 0, damage: 0, damagePerLOE: 3, teen: "", bonus: 0, macroUuid: "", macroExecuteAsGM: false}
      }
    },
    flags: foundry.utils.mergeObject(original.flags ?? {}, {[MODULE_ID]: moduleFlags}, {inplace: false, overwrite: true})
  };
}

async function cloneItemToActor(item, actor, opportunity = null) {
  const data = opportunity ? opportunityAbilityData(item, opportunity) : item.toObject();
  delete data._id;
  delete data.folder;
  delete data.sort;
  delete data.ownership;
  delete data._stats;
  const created = await actor.createEmbeddedDocuments("Item", [data]);
  return created[0] ?? null;
}

async function sendDirectDeliveryNotice(actor, item, narrative, pool, cost) {
  const link = item?.uuid ? `@UUID[${item.uuid}]{${item.name}}` : `<strong>${item.name}</strong>`;
  const narrativeHtml = escapeHtml(narrative).replace(/\n/g, "<br>");
  const narrativeBlock = narrativeHtml ? `<p><em>${narrativeHtml}</em></p>` : "";
  const content = await TextEditor.enrichHTML(`<div class="c2t-opportunity-chat"><h3><i class="fa-solid fa-gift"></i> ${t("ReceivedTitle")}</h3><p>${t("ReceivedDirect", {actor: actor.name, cypher: link})}</p>${narrativeBlock}<p class="c2t-opportunity-cost">${t("CostPaid", {cost, pool: opportunityPoolLabel(pool)})} ${t("EdgeIgnored")}</p></div>`, {async: true});
  await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content, whisper: actorAudience(actor)});
}

async function createInteractiveOffer(entry, actor, item, narrative, pool, cost, mode, planContext = {}) {
  const content = await TextEditor.enrichHTML(offerChatContent(entry, actor, item, narrative, pool, cost, true), {async: true});
  const data = {
    speaker: ChatMessage.getSpeaker(), content,
    flags: {[MODULE_ID]: {[OFFER_FLAG]: {actorId: actor.id, itemUuid: item.uuid, itemName: entry.name, narrative, pool, cost, status: "pending", planSceneId: planContext.sceneId ?? null, planId: planContext.planId ?? null}}}
  };
  if (mode === "whisper") data.whisper = actorAudience(actor);
  await ChatMessage.create(data);
}

async function executeOffer(entry, html, planContext = {}) {
  const actor = game.actors.get(String(html.find("[name=actor]").val()));
  const mode = String(html.find("[name=mode]:checked").val() ?? "remind");
  const narrative = String(html.find("[name=narrative]").val() ?? "").trim();
  const pool = String(html.find("[name=pool]").val() ?? "might");
  const cost = Math.max(0, Math.trunc(Number(html.find("[name=cost]").val()) || 0));
  if (!actor) return ui.notifications.warn(t("ChooseActor")), false;
  const item = await resolveSource(entry);
  if (!item) return ui.notifications.warn(t("ItemNotFound")), false;
  if (mode === "add") {
    const payment = await spendOpportunityCost(actor, pool, cost);
    if (!payment.ok) {
      await notifyInsufficientPool(actor, payment.pool, payment.cost, payment.current);
      return false;
    }
    let created;
    try {
      created = await cloneItemToActor(item, actor, {narrative, pool: payment.pool, cost: payment.cost, delivery: "direct"});
    } catch (error) {
      await restoreOpportunityCost(actor, payment);
      throw error;
    }
    await sendDirectDeliveryNotice(actor, created ?? item, narrative, payment.pool, payment.cost);
    await updatePlanStatus(planContext.sceneId, planContext.planId, "delivered");
    ui.notifications.info(t("Added", { cypher: entry.name, actor: actor.name }));
  } else if (mode === "whisper" || mode === "public") {
    await createInteractiveOffer(entry, actor, item, narrative, pool, cost, mode, planContext);
    await updatePlanStatus(planContext.sceneId, planContext.planId, "offered");
  } else {
    ui.notifications.info(t("Reminder", { actor: actor.name, cypher: entry.name }));
  }
  addHistory([entry.name]);
  state.saved = state.saved.filter(name => normalize(name) !== normalize(entry.name));
  const index = hand.findIndex(current => normalize(current.name) === normalize(entry.name));
  if (index >= 0) hand[index] = weightedSuggestions(1, hand.map(current => current.name))[0] ?? hand[index];
  await saveState();
  renderPanel();
  return true;
}

function openOfferDialog(entry, defaults = {}) {
  const actors = actorOptions();
  if (!actors.length) return ui.notifications.warn(t("NoActors"));
  const selectedPool = OPPORTUNITY_POOLS.has(defaults.pool) ? defaults.pool : "might";
  const defaultCost = defaults.cost !== null && defaults.cost !== "" && Number.isFinite(Number(defaults.cost)) ? Math.max(0, Math.trunc(Number(defaults.cost))) : 1;
  const content = `<form class="c2t-opportunity-offer"><div class="form-group"><label>${t("Character")}</label><select name="actor">${actors.map(actor => `<option value="${actor.id}" ${actor.id === defaults.actorId ? "selected" : ""}>${escapeHtml(actor.name)}</option>`).join("")}</select></div>
    <div class="form-group c2t-opportunity-narrative"><label>${t("Narrative")}</label><textarea name="narrative" rows="4" placeholder="${t("NarrativePlaceholder")}">${escapeHtml(defaults.narrative ?? "")}</textarea></div>
    <div class="c2t-opportunity-payment"><div class="form-group"><label>${t("Pool")}</label><select name="pool"><option value="might" ${selectedPool === "might" ? "selected" : ""}>${game.i18n.localize("C2T.Resources.Might")}</option><option value="speed" ${selectedPool === "speed" ? "selected" : ""}>${game.i18n.localize("C2T.Resources.Speed")}</option><option value="intellect" ${selectedPool === "intellect" ? "selected" : ""}>${game.i18n.localize("C2T.Resources.Intellect")}</option></select></div><div class="form-group"><label>${t("Cost")}</label><input type="number" name="cost" value="${defaultCost}" min="0" step="1"></div></div><p class="hint">${t("CostHint")}</p>
    <fieldset><legend>${t("Delivery")}</legend>
    <label><input type="radio" name="mode" value="remind"> ${t("ModeRemind")}</label>
    <label><input type="radio" name="mode" value="add"> ${t("ModeAdd")}</label>
    <label><input type="radio" name="mode" value="whisper" checked> ${t("ModeWhisper")}</label>
    <label><input type="radio" name="mode" value="public"> ${t("ModePublic")}</label>
  </fieldset></form>`;
  const dialog = new Dialog({ title: `${t("Offer")}: ${entry.name}`, content, buttons: {
    apply: { icon: '<i class="fa-solid fa-check"></i>', label: t("ConfirmOffer"), callback: html => executeOffer(entry, html, defaults) },
    cancel: { label: t("Cancel") }
  } }, { width: 470 });
  dialog.render(true);
}

function openPlanDialog(entry, existing = null) {
  const scene = planningScene();
  if (!scene) return ui.notifications.warn(t("NoActiveScene"));
  const actors = actorOptions();
  const current = existing ?? {};
  const content = `<form class="c2t-scene-plan-form">
    <p class="hint">${t("PlanDialogHint", {scene: escapeHtml(scene.name)})}</p>
    <div class="form-group c2t-opportunity-narrative"><label>${t("PlannedTrigger")}</label><textarea name="narrative" rows="4" placeholder="${escapeHtml(narrativeIdea(entry))}">${escapeHtml(current.narrative ?? "")}</textarea></div>
    <div class="form-group"><label>${t("PlannedTarget")}</label><select name="actor"><option value="">${t("DecideWhenOffering")}</option>${actors.map(actor => `<option value="${actor.id}" ${actor.id === current.actorId ? "selected" : ""}>${escapeHtml(actor.name)}</option>`).join("")}</select></div>
    <div class="c2t-opportunity-payment"><div class="form-group"><label>${t("PlannedPool")}</label><select name="pool"><option value="">${t("DecideWhenOffering")}</option><option value="might" ${current.pool === "might" ? "selected" : ""}>${game.i18n.localize("C2T.Resources.Might")}</option><option value="speed" ${current.pool === "speed" ? "selected" : ""}>${game.i18n.localize("C2T.Resources.Speed")}</option><option value="intellect" ${current.pool === "intellect" ? "selected" : ""}>${game.i18n.localize("C2T.Resources.Intellect")}</option></select></div><div class="form-group"><label>${t("PlannedCost")}</label><input type="number" name="cost" value="${current.cost !== null && current.cost !== "" && Number.isFinite(Number(current.cost)) ? Number(current.cost) : ""}" min="0" step="1" placeholder="1"></div></div>
  </form>`;
  new Dialog({title: `${t(existing ? "EditScenePlan" : "AddToScenePlan")}: ${entry.name}`, content, buttons: {
    save: {icon: '<i class="fa-solid fa-check"></i>', label: t("SavePlan"), callback: async html => {
      const plan = scenePlan(scene);
      const id = existing?.id ?? foundry.utils.randomID();
      const rawCost = String(html.find("[name=cost]").val() ?? "").trim();
      const item = {
        ...current, id, name: entry.name,
        narrative: String(html.find("[name=narrative]").val() ?? "").trim(),
        actorId: String(html.find("[name=actor]").val() ?? ""),
        pool: String(html.find("[name=pool]").val() ?? ""),
        cost: rawCost === "" ? null : Math.max(0, Math.trunc(Number(rawCost) || 0)),
        status: current.status ?? "pending",
        createdAt: current.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      const index = plan.findIndex(planned => planned.id === id);
      if (index >= 0) plan[index] = item;
      else plan.push(item);
      await saveScenePlan(plan, scene);
      ui.notifications.info(t(index >= 0 ? "PlanUpdated" : "PlanAdded", {cypher: entry.name, scene: scene.name}));
    }},
    cancel: {label: t("Cancel")}
  }}, {width: 520}).render(true);
}

async function updateOfferMessage(message, offer, actor, item, status, responder) {
  const link = item?.uuid ? `@UUID[${item.uuid}]{${item.name}}` : `<strong>${offer.itemName}</strong>`;
  const key = status === "accepted" ? "OfferAccepted" : "OfferRejected";
  const icon = status === "accepted" ? "fa-circle-check" : "fa-circle-xmark";
  const content = await TextEditor.enrichHTML(`<div class="c2t-opportunity-chat resolved ${status}"><h3><i class="fa-solid ${icon}"></i> ${t("ChatTitle")}</h3><p>${t(key, {actor: actor.name, cypher: link, user: responder.name, cost: offer.cost, pool: opportunityPoolLabel(offer.pool)})}</p></div>`, {async: true});
  await message.update({content, [`flags.${MODULE_ID}.${OFFER_FLAG}.status`]: status});
}

async function handleOfferDecision(payload) {
  if (!game.user.isGM) return;
  const message = game.messages.get(payload.messageId);
  const offer = message?.getFlag(MODULE_ID, OFFER_FLAG);
  const actor = game.actors.get(offer?.actorId);
  const responder = game.users.get(payload.userId);
  if (!message || !offer || offer.status !== "pending" || !actor || !responder) return;
  if (!responder.isGM && !actor.testUserPermission(responder, "OWNER")) return;
  if (payload.decision === "reject") {
    await updateOfferMessage(message, offer, actor, null, "rejected", responder);
    await updatePlanStatus(offer.planSceneId, offer.planId, "rejected");
    return;
  }
  if (payload.decision !== "accept") return;
  await message.update({[`flags.${MODULE_ID}.${OFFER_FLAG}.status`]: "processing"});
  let payment = null;
  try {
    const source = await fromUuid(offer.itemUuid);
    if (!source || source.documentName !== "Item") throw new Error(t("ItemNotFound"));
    payment = await spendOpportunityCost(actor, offer.pool, offer.cost);
    if (!payment.ok) {
      await message.update({[`flags.${MODULE_ID}.${OFFER_FLAG}.status`]: "pending", [`flags.${MODULE_ID}.${OFFER_FLAG}.lastAttempt`]: Date.now()});
      await notifyInsufficientPool(actor, payment.pool, payment.cost, payment.current);
      return;
    }
    const created = await cloneItemToActor(source, actor, {narrative: offer.narrative, pool: payment.pool, cost: payment.cost, delivery: "accepted-offer"});
    await updateOfferMessage(message, offer, actor, created ?? source, "accepted", responder);
    await updatePlanStatus(offer.planSceneId, offer.planId, "accepted");
  } catch (error) {
    await restoreOpportunityCost(actor, payment);
    await message.update({[`flags.${MODULE_ID}.${OFFER_FLAG}.status`]: "pending"});
    console.error(`${MODULE_ID} | Cypher offer acceptance failed`, error);
    ui.notifications.error(error.message);
  }
}

async function dispatchDecision(payload) {
  const data = {...payload, userId: game.user.id};
  if (game.user.isGM) return handleOfferDecision(data);
  if (!primaryActiveGm()) return ui.notifications.warn(t("NoActiveGm"));
  game.socket.emit(SOCKET_CHANNEL, {action: "offerDecision", ...data});
}

function bindOfferMessage(message, html) {
  const offer = message.getFlag(MODULE_ID, OFFER_FLAG);
  if (!offer || offer.status !== "pending") return;
  const actor = game.actors.get(offer.actorId);
  const allowed = actor && (game.user.isGM || actor.testUserPermission(game.user, "OWNER"));
  const root = html?.[0] ?? html;
  if (!(root instanceof HTMLElement)) return;
  for (const button of root.querySelectorAll("[data-c2t-offer-action]")) {
    button.disabled = !allowed;
    button.addEventListener("click", async event => {
      event.preventDefault();
      root.querySelectorAll("[data-c2t-offer-action]").forEach(element => { element.disabled = true; });
      await dispatchDecision({messageId: message.id, decision: button.dataset.c2tOfferAction});
    });
  }
}

function isOpportunityItem(item) {
  return item?.type === "ability" && Boolean(item.getFlag?.(MODULE_ID, "opportunity"));
}

function itemDescription(item) {
  return String(item?.system?.description ?? item?.system?.basic?.description ?? "");
}

async function publishItemToChat(actor, item, {opportunity = false} = {}) {
  const link = `@UUID[${item.uuid}]{${item.name}}`;
  const description = itemDescription(item);
  const heading = opportunity ? t("UseTitle") : t("CypherChatTitle");
  const content = await TextEditor.enrichHTML(`<article class="c2t-item-chat ${opportunity ? "opportunity" : "cypher"}"><h3><i class="fa-solid ${opportunity ? "fa-bolt" : "fa-wand-magic-sparkles"}"></i> ${heading}</h3><p>${link}</p>${description ? `<div class="c2t-item-chat-description">${description}</div>` : ""}</article>`, {async: true});
  return ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), content});
}

function confirmXpUse(actor, item) {
  return new Promise(resolve => {
    let answered = false;
    new Dialog({
      title: t("RepeatTitle", {cypher: item.name}),
      content: `<p>${t("RepeatConfirm", {actor: actor.name, cypher: item.name})}</p>`,
      buttons: {
        use: {icon: '<i class="fa-solid fa-star"></i>', label: t("SpendXp"), callback: () => { answered = true; resolve(true); }},
        cancel: {label: t("Cancel"), callback: () => { answered = true; resolve(false); }}
      },
      default: "use",
      close: () => { if (!answered) resolve(false); }
    }, {width: 410}).render(true);
  });
}

async function useOpportunity(actor, item) {
  if (!isOpportunityItem(item) || !(game.user.isGM || item.isOwner || actor.isOwner)) return;
  const opportunity = foundry.utils.deepClone(item.getFlag(MODULE_ID, "opportunity") ?? {});
  const repeated = Boolean(opportunity.usedOnce);
  const currentXp = Math.max(0, Number(actor.system?.basic?.xp) || 0);
  if (repeated) {
    if (currentXp < 1) return ui.notifications.warn(t("NotEnoughXp", {actor: actor.name}));
    if (!await confirmXpUse(actor, item)) return;
  }
  let xpSpent = false;
  try {
    if (repeated) {
      await actor.update({"system.basic.xp": currentXp - 1});
      xpSpent = true;
    }
    await publishItemToChat(actor, item, {opportunity: true});
    opportunity.usedOnce = true;
    opportunity.known = true;
    opportunity.useCount = Math.max(0, Number(opportunity.useCount) || 0) + 1;
    opportunity.lastUsedAt = new Date().toISOString();
    await item.update({
      [`flags.${MODULE_ID}.opportunity`]: opportunity,
      "system.basic.cost": "1",
      "system.basic.pool": "XP",
      "system.settings.general.sorting": OPPORTUNITY_CATEGORY
    });
    ui.notifications.info(repeated ? t("XpSpent", {cypher: item.name}) : t("NowKnown", {cypher: item.name}));
  } catch (error) {
    if (xpSpent) await actor.update({"system.basic.xp": currentXp});
    throw error;
  }
}

async function migrateDeliveredOpportunities() {
  if (!game.user.isGM || primaryActiveGm()?.id !== game.user.id) return;
  let migrated = 0;
  for (const actor of game.actors ?? []) {
    const legacy = Array.from(actor.items ?? []).filter(item => item.type === "cypher" && item.getFlag?.(MODULE_ID, "opportunity"));
    for (const item of legacy) {
      const opportunity = foundry.utils.deepClone(item.getFlag(MODULE_ID, "opportunity") ?? {});
      const created = await actor.createEmbeddedDocuments("Item", [opportunityAbilityData(item, opportunity)]);
      if (!created.length) continue;
      await actor.deleteEmbeddedDocuments("Item", [item.id]);
      migrated += 1;
    }
  }
  if (migrated) ui.notifications.info(t("Migrated", {count: migrated}));
}

function injectItemControls(app, html) {
  const actor = app?.actor;
  if (!actor) return;
  const root = html?.find ? html : $(html);
  root.find("li.item[data-item-id]").each((_index, element) => {
    const row = $(element);
    const item = actor.items.get(String(row.attr("data-item-id") ?? row.data("item-id")));
    if (!item) return;
    row.find(".c2t-opportunity-use, .c2t-cypher-chat-link").remove();
    const controls = row.find(".item-controls").first();
    if (item.type === "cypher") {
      row.find("a[title], button[title], [data-tooltip]").each((_i, control) => {
        const label = `${control.getAttribute("title") ?? ""} ${control.getAttribute("data-tooltip") ?? ""}`;
        if (/subtle|manifest|sutil|sútil|manifesto/i.test(label)) control.classList.add("c2t-hidden-cypher-type");
      });
      const link = $('<a class="item-control c2t-cypher-chat-link" title="'+t("LinkToChat")+'"><i class="fa-solid fa-message"></i></a>');
      link.on("click", async event => {
        event.preventDefault();
        event.stopPropagation();
        await publishItemToChat(actor, item);
      });
      controls.length ? controls.prepend(link) : row.append(link);
      return;
    }
    if (!isOpportunityItem(item)) return;
    row.find(".item-roll, .c2t-native-fallback").addClass("c2t-hidden-opportunity-roll");
    const repeated = Boolean(item.getFlag(MODULE_ID, "opportunity")?.usedOnce);
    const use = $(`<a class="item-control c2t-opportunity-use" title="${t(repeated ? "UseForXp" : "UseFirst")}"><i class="fa-solid ${repeated ? "fa-star" : "fa-bolt"}"></i><span>${repeated ? "1 XP" : ""}</span></a>`);
    use.on("click", async event => {
      event.preventDefault();
      event.stopPropagation();
      await useOpportunity(actor, item);
    });
    controls.length ? controls.prepend(use) : row.append(use);
  });
}

async function overflowChat(actor, key, data = {}) {
  const content = await TextEditor.enrichHTML(`<div class="c2t-cypher-limit-chat"><h3><i class="fa-solid fa-triangle-exclamation"></i> ${t("LimitTitle")}</h3><p>${t(key, {actor: actor.name, ...data})}</p></div>`, {async: true});
  await ChatMessage.create({speaker: ChatMessage.getSpeaker(), content, whisper: actorAudience(actor)});
}

function showOverflowDialog(payload) {
  if (payload.targetUserId !== game.user.id) return;
  const actor = game.actors.get(payload.actorId);
  if (!actor || openOverflowDialogs.has(actor.id)) return;
  const cyphers = carriedCyphers(actor);
  const limit = actorCypherLimit(actor);
  const excess = Math.max(0, cyphers.length - limit);
  if (!excess) return;
  openOverflowDialogs.add(actor.id);
  const rows = cyphers.map(item => `<label class="c2t-cypher-limit-choice"><input type="checkbox" name="discard" value="${item.id}"><img src="${item.img}" alt=""><span>${escapeHtml(item.name)}</span></label>`).join("");
  const dialog = new Dialog({
    title: t("LimitDialogTitle", {actor: actor.name}),
    content: `<form class="c2t-cypher-limit-form"><p>${t("LimitDialogIntro", {count: cyphers.length, limit, excess})}</p><div>${rows}</div></form>`,
    buttons: {
      discard: {icon: '<i class="fa-solid fa-trash"></i>', label: t("DiscardSelected"), callback: html => {
        const discardIds = html.find("input[name='discard']:checked").map((_index, input) => input.value).get();
        if (discardIds.length < excess) {
          ui.notifications.warn(t("ChooseEnough", {excess}));
          window.setTimeout(() => showOverflowDialog({...payload, force: true}), 100);
          return;
        }
        submitOverflowDecision({actorId: actor.id, discardIds, keep: false});
      }},
      keep: {icon: '<i class="fa-solid fa-box-archive"></i>', label: t("KeepOverLimit"), callback: () => submitOverflowDecision({actorId: actor.id, discardIds: [], keep: true})}
    },
    default: "discard",
    close: () => openOverflowDialogs.delete(actor.id)
  }, {width: 430});
  dialog.render(true);
}

async function resolveOverflowDecision(payload) {
  if (!game.user.isGM) return;
  const actor = game.actors.get(payload.actorId);
  const responder = game.users.get(payload.userId);
  if (!actor || !responder || (!responder.isGM && !actor.testUserPermission(responder, "OWNER"))) return;
  const cyphers = carriedCyphers(actor);
  const limit = actorCypherLimit(actor);
  if (payload.keep) {
    await overflowChat(actor, "KeptOverLimit", {count: cyphers.length, limit, user: responder.name});
    return;
  }
  const validIds = new Set(cyphers.map(item => item.id));
  const discardIds = Array.from(new Set(payload.discardIds ?? [])).filter(id => validIds.has(id));
  if (cyphers.length - discardIds.length > limit) {
    const target = activeActorOwner(actor);
    if (target) {
      const dialogPayload = {action: "showOverflow", targetUserId: target.id, actorId: actor.id};
      if (target.id === game.user.id) showOverflowDialog(dialogPayload);
      else game.socket.emit(SOCKET_CHANNEL, dialogPayload);
    }
    return;
  }
  const names = cyphers.filter(item => discardIds.includes(item.id)).map(item => item.name).join(", ");
  if (discardIds.length) await actor.deleteEmbeddedDocuments("Item", discardIds);
  await overflowChat(actor, "DiscardedForLimit", {items: names, count: carriedCyphers(actor).length, limit, user: responder.name});
}

async function submitOverflowDecision(payload) {
  openOverflowDialogs.delete(payload.actorId);
  const data = {...payload, userId: game.user.id};
  if (game.user.isGM) return resolveOverflowDecision(data);
  if (!primaryActiveGm()) return ui.notifications.warn(t("NoActiveGm"));
  game.socket.emit(SOCKET_CHANNEL, {action: "overflowDecision", ...data});
}

async function coordinateOverflow(actor) {
  if (!game.user.isGM || primaryActiveGm()?.id !== game.user.id) return;
  const cyphers = carriedCyphers(actor);
  const limit = actorCypherLimit(actor);
  if (cyphers.length <= limit) return;
  const excess = cyphers.length - limit;
  await overflowChat(actor, "LimitExceeded", {count: cyphers.length, limit, excess});
  const target = activeActorOwner(actor);
  if (!target) return;
  const payload = {action: "showOverflow", targetUserId: target.id, actorId: actor.id};
  if (target.id === game.user.id) showOverflowDialog(payload);
  else game.socket.emit(SOCKET_CHANNEL, payload);
}

function scheduleOverflowCheck(item) {
  const actor = item?.parent;
  if (!isLimitEligibleCypher(item) || actor?.documentName !== "Actor" || actor.type !== "pc") return;
  if (!game.user.isGM || primaryActiveGm()?.id !== game.user.id) return;
  window.clearTimeout(overflowTimers.get(actor.id));
  overflowTimers.set(actor.id, window.setTimeout(() => {
    overflowTimers.delete(actor.id);
    coordinateOverflow(actor);
  }, 200));
}

function scheduleLimitChangeCheck(actor, changes) {
  if (actor?.type !== "pc" || !foundry.utils.hasProperty(changes, "system.equipment.cypherLimit")) return;
  if (!game.user.isGM || primaryActiveGm()?.id !== game.user.id) return;
  window.clearTimeout(overflowTimers.get(actor.id));
  overflowTimers.set(actor.id, window.setTimeout(() => {
    overflowTimers.delete(actor.id);
    coordinateOverflow(actor);
  }, 200));
}

function scheduleArchiveChangeCheck(item, changes) {
  if (item?.type !== "cypher" || !foundry.utils.hasProperty(changes, "system.archived")) return;
  if (item.getFlag?.(MODULE_ID, "randomCypher")) return;
  scheduleOverflowCheck(item);
}

async function handleOpportunitySocket(payload) {
  if (payload?.action === "showOverflow") return showOverflowDialog(payload);
  if (!game.user.isGM || primaryActiveGm()?.id !== game.user.id) return;
  if (payload?.action === "offerDecision") return handleOfferDecision(payload);
  if (payload?.action === "overflowDecision") return resolveOverflowDecision(payload);
}

async function openSourceItem(entry) {
  const item = await resolveSource(entry);
  if (!item) return ui.notifications.warn(t("ItemNotFound"));
  item.sheet?.render(true);
}

function bindPanel(panel) {
  bindDrag(panel);
  let draggedPlanId = null;
  panel.addEventListener("dragstart", event => {
    const row = event.target.closest(".c2t-scene-plan-entry[data-plan-id]");
    if (!row) return;
    draggedPlanId = row.dataset.planId;
    row.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedPlanId);
  });
  panel.addEventListener("dragover", event => {
    const row = event.target.closest(".c2t-scene-plan-entry[data-plan-id]");
    if (!row || row.dataset.planId === draggedPlanId) return;
    event.preventDefault();
    panel.querySelectorAll(".c2t-scene-plan-entry.drop-target").forEach(element => element.classList.remove("drop-target"));
    row.classList.add("drop-target");
  });
  panel.addEventListener("drop", async event => {
    const target = event.target.closest(".c2t-scene-plan-entry[data-plan-id]");
    if (!target || !draggedPlanId || target.dataset.planId === draggedPlanId) return;
    event.preventDefault();
    const plan = scenePlan();
    const from = plan.findIndex(item => item.id === draggedPlanId);
    const to = plan.findIndex(item => item.id === target.dataset.planId);
    if (from >= 0 && to >= 0) {
      const [moved] = plan.splice(from, 1);
      plan.splice(to, 0, moved);
      await saveScenePlan(plan);
    }
  });
  panel.addEventListener("dragend", () => {
    draggedPlanId = null;
    panel.querySelectorAll(".c2t-scene-plan-entry.dragging, .c2t-scene-plan-entry.drop-target").forEach(element => element.classList.remove("dragging", "drop-target"));
  });
  const search = panel.querySelector("[data-opportunity-search]");
  search?.addEventListener("input", event => {
    searchQuery = event.currentTarget.value;
    selectedCypher = "";
    const workspace = panel.querySelector("[data-opportunity-workspace]");
    if (workspace) workspace.innerHTML = workspaceHtml();
    panel.querySelector("[data-panel-action='clear-search']")?.toggleAttribute("hidden", !searchQuery);
    panel.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("active", button.dataset.view === "catalog"));
  });
  panel.addEventListener("click", async event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.view = viewButton.dataset.view;
      searchQuery = "";
      selectedCypher = "";
      await saveState();
      renderPanel();
      return;
    }
    const contextButton = event.target.closest("[data-context]");
    if (contextButton) {
      const context = contextButton.dataset.context;
      state.contexts = state.contexts.includes(context) ? state.contexts.filter(value => value !== context) : [...state.contexts, context];
      if (!state.contexts.length) state.contexts = ["dramatic"];
      await saveState();
      drawNewHand({ rememberCurrent: false });
      return;
    }
    const panelAction = event.target.closest("[data-panel-action]")?.dataset.panelAction;
    if (panelAction === "collapse") { state.collapsed = !state.collapsed; await saveState(); renderPanel(); return; }
    if (panelAction === "close") { panelOpen = false; renderPanel(); return; }
    if (panelAction === "clear-search") { searchQuery = ""; selectedCypher = ""; renderPanel(); return; }
    if (panelAction === "draw") { drawNewHand(); return; }
    if (panelAction === "dramatic") { state.contexts = ["dramatic"]; await saveState(); drawNewHand(); return; }
    if (panelAction === "clear-history") { state.history = []; await saveState(); drawNewHand({ rememberCurrent: false }); return; }
    if (panelAction === "refresh") { await buildSourceIndex(); renderPanel(); ui.notifications.info(t("CatalogRefreshed", { count: cypherSources.size })); return; }
    const planActionElement = event.target.closest("[data-plan-action]");
    if (planActionElement) {
      if (planActionElement.disabled) return;
      const row = planActionElement.closest("[data-plan-id]");
      const plan = scenePlan();
      const index = plan.findIndex(item => item.id === row?.dataset.planId);
      if (index < 0) return;
      const item = plan[index];
      const entry = catalogByName.get(normalize(item.name));
      const action = planActionElement.dataset.planAction;
      if (action === "edit" && entry) openPlanDialog(entry, item);
      if (action === "offer" && entry) openOfferDialog(entry, {sceneId: planningScene()?.id, planId: item.id, actorId: item.actorId, narrative: item.narrative, pool: item.pool, cost: item.cost});
      if (action === "skip" || action === "restore") {
        plan[index] = {...item, status: action === "skip" ? "skipped" : "pending", updatedAt: new Date().toISOString()};
        await saveScenePlan(plan);
      }
      if (action === "remove") {
        plan.splice(index, 1);
        await saveScenePlan(plan);
        ui.notifications.info(t("PlanRemoved", {cypher: item.name}));
      }
      return;
    }
    const actionElement = event.target.closest("[data-opportunity-action]");
    if (!actionElement) {
      const card = event.target.closest(".c2t-opportunity-card[data-cypher]");
      if (!card) return;
      selectedCypher = selectedCypher === card.dataset.cypher ? "" : card.dataset.cypher;
      const workspace = panel.querySelector("[data-opportunity-workspace]");
      if (workspace) workspace.innerHTML = workspaceHtml();
      return;
    }
    if (actionElement.disabled) return;
    const container = actionElement.closest("[data-cypher]");
    const entry = catalogByName.get(normalize(container?.dataset.cypher));
    if (!entry) return;
    const action = actionElement.dataset.opportunityAction;
    if (action === "offer") openOfferDialog(entry);
    if (action === "save") toggleSaved(entry.name);
    if (action === "plan") openPlanDialog(entry);
    if (action === "replace") replaceSuggestion(entry.name);
    if (action === "open") openSourceItem(entry);
  });
}

function renderPanel() {
  document.getElementById(PANEL_ID)?.remove();
  if (!panelOpen || !game.user?.isGM || !game.settings.get(MODULE_ID, ENABLED_SETTING)) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = panelHtml();
  const panel = wrapper.firstElementChild;
  document.body.appendChild(panel);
  const position = clampPanelPosition(panel, panel.getBoundingClientRect().left, state.top);
  if (state.left !== null) panel.style.left = `${position.left}px`;
  panel.style.top = `${position.top}px`;
  bindPanel(panel);
}

async function openPanel() {
  panelOpen = true;
  await buildSourceIndex();
  if (!hand.length) hand = weightedSuggestions(HAND_SIZE);
  renderPanel();
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, ENABLED_SETTING, { name: "C2T.Opportunities.Settings.Enabled.Name", hint: "C2T.Opportunities.Settings.Enabled.Hint", scope: "world", config: true, type: Boolean, default: true, restricted: true });
  game.settings.register(MODULE_ID, STATE_SETTING, { scope: "client", config: false, type: String, default: "{}" });
});

Hooks.once("ready", async () => {
  game.cypher2Toolkit = game.cypher2Toolkit ?? {};
  game.socket.on(SOCKET_CHANNEL, handleOpportunitySocket);
  if (game.user.isGM) {
    loadState();
    await buildSourceIndex();
    hand = weightedSuggestions(HAND_SIZE);
    game.cypher2Toolkit.opportunities = { open: openPanel, close: () => { panelOpen = false; renderPanel(); }, refresh: async () => { await buildSourceIndex(); renderPanel(); }, draw: drawNewHand, pendingSceneCount: pendingScenePlanCount };
  }
  migrateDeliveredOpportunities().catch(error => console.error(`${MODULE_ID} | Opportunity migration failed`, error));
});

function refreshForStandaloneItem(item) {
  if (!game.user?.isGM || item?.parent?.documentName === "Actor") return;
  buildSourceIndex().then(renderPanel);
}

Hooks.on("createItem", refreshForStandaloneItem);
Hooks.on("createItem", scheduleOverflowCheck);
Hooks.on("updateItem", refreshForStandaloneItem);
Hooks.on("updateItem", scheduleArchiveChangeCheck);
Hooks.on("deleteItem", refreshForStandaloneItem);
Hooks.on("renderChatMessage", bindOfferMessage);
Hooks.on("renderActorSheet", injectItemControls);
Hooks.on("updateActor", scheduleLimitChangeCheck);
Hooks.on("updateSetting", setting => {
  if (setting?.key === `${MODULE_ID}.${ENABLED_SETTING}`) {
    if (!game.settings.get(MODULE_ID, ENABLED_SETTING)) panelOpen = false;
    renderPanel();
  }
});
Hooks.on("canvasReady", () => { if (panelOpen) renderPanel(); });
Hooks.on("updateScene", (scene, changes) => {
  if (panelOpen && scene.id === planningScene()?.id && foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${SCENE_PLAN_FLAG}`)) renderPanel();
});

