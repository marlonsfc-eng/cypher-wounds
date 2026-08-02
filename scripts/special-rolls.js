const C2T_SPECIAL_ID = "cypher-2-toolkit";

const MINOR_EFFECTS = [
  { id: "damage-object", label: "Damage object", description: "Add +3 damage to the total, then split the damage between the foe and an object of your choice they are holding." },
  { id: "distract", label: "Distract", description: "For one round, all of the foe’s tasks are hindered." },
  { id: "knock-back", label: "Knock back", description: "The foe is knocked or forced back a few feet." },
  { id: "move-past", label: "Move past", description: "As an extra action on your turn, move a short distance at the end of the attack." },
  { id: "specific-body-part", label: "Strike a specific body part", description: "Strike a specific spot. The GM determines the special effect, if any." },
  { id: "custom", label: "Another minor effect", description: "Describe a positive or helpful effect related to the task; player and GM must agree." }
];

const MAJOR_EFFECTS = [
  { id: "disarm", label: "Disarm", description: "The foe drops one object that it is holding." },
  { id: "impair", label: "Impair", description: "For the rest of the combat, all tasks the foe attempts are hindered." },
  { id: "knock-down", label: "Knock down", description: "The foe is knocked prone. It can get up on its turn." },
  { id: "stun", label: "Stun", description: "The foe loses its next action." },
  { id: "extra-action", label: "Extra action", description: "When nothing else seems appropriate, gain an extra action that same round." },
  { id: "custom", label: "Another major effect", description: "Describe a strongly beneficial effect related to the task; player and GM must agree." }
];

function isSuccessful(data) {
  if (Number(data.baseDifficulty ?? -1) < 0) return true;
  const finalDifficulty = Number(data.finalDifficulty ?? data.baseDifficulty ?? 0);
  const beaten = Number(data.difficulty ?? Math.floor(Number(data.rollTotal ?? data.roll?.total ?? 0) / 3));
  return beaten >= finalDifficulty;
}

function isDamageAttack(data) {
  return Number(data.totalDamage ?? data.damageWithEffect ?? data.damage ?? 0) > 0;
}

function findRollMessage(actor, data) {
  const total = Number(data.roll?.total ?? data.rollTotal ?? 0);
  const actorId = actor?.id;
  return [...game.messages.contents].reverse().find(message => {
    const stored = message.flags?.data ?? message.flags?.cyphersystem?.data;
    const messageTotal = Number(message.rolls?.[0]?.total ?? stored?.roll?.total ?? stored?.rollTotal ?? -999);
    return messageTotal === total && (!actorId || message.speaker?.actor === actorId);
  });
}

function specialCard({ roll, title, text, damage = null }) {
  const damageLine = damage === null ? "" : `<p><strong>Total damage:</strong> ${damage}</p>`;
  return `<section class="c2t-special-roll-card c2t-special-${roll}">
    <header><i class="fa-solid fa-sparkles"></i> ${title}</header>
    <p>${text}</p>${damageLine}
  </section>`;
}

async function appendToMessage(message, html, flags = {}) {
  if (!message) {
    await ChatMessage.create({ content: html, flags: { [C2T_SPECIAL_ID]: flags } });
    return;
  }
  const flavor = `${message.flavor ?? ""}${html}`;
  const existing = foundry.utils.deepClone(message.getFlag(C2T_SPECIAL_ID, "specialRoll") ?? {});
  await message.update({
    flavor,
    [`flags.${C2T_SPECIAL_ID}.specialRoll`]: foundry.utils.mergeObject(existing, flags, { inplace: false, overwrite: true })
  });
}

async function refundTwentyCost(actor, data, message) {
  const pool = String(data.pool ?? "");
  const amount = Number(data.costTotal ?? 0) || 0;
  if (!actor || amount <= 0 || !["Might", "Speed", "Intellect"].includes(pool)) return;
  const key = pool.toLowerCase();
  const current = Number(actor.system.pools?.[key]?.value ?? 0);
  const max = Number(actor.system.pools?.[key]?.max ?? current + amount);
  await actor.update({ [`system.pools.${key}.value`]: Math.min(max, current + amount) });
  await appendToMessage(message, specialCard({
    roll: 20,
    title: "Natural 20 — action cost restored",
    text: `${amount} ${pool} point${amount === 1 ? "" : "s"} restored. The point cost of the action is 0.`
  }), { refunded: true, refundPool: pool, refundAmount: amount });
}

function effectChoiceHtml(kind, effects, allowDamage, damageBonus) {
  const damageButton = allowDamage ? `<button type="button" data-choice="damage"><strong>+${damageBonus} damage</strong><span>Use the damage bonus instead of a ${kind} effect.</span></button>` : "";
  const effectButtons = effects.map(effect => `<button type="button" data-choice="${effect.id}"><strong>${effect.label}</strong><span>${effect.description}</span></button>`).join("");
  return `<div class="c2t-special-choice"><p>Choose the result of this natural roll.</p>${damageButton}${effectButtons}</div>`;
}

async function askCustomEffect(kind) {
  return new Promise(resolve => {
    new Dialog({
      title: `${kind[0].toUpperCase() + kind.slice(1)} effect`,
      content: `<form><div class="form-group"><label>Describe the agreed effect</label><textarea name="effect" rows="4"></textarea></div></form>`,
      buttons: {
        save: { label: "Use effect", callback: html => resolve(String(html.find('[name="effect"]').val() ?? "").trim()) },
        cancel: { label: "Cancel", callback: () => resolve("") }
      },
      default: "save",
      close: () => resolve("")
    }).render(true);
  });
}

async function chooseSpecialResult(actor, data, message, roll) {
  const kind = roll === 19 ? "minor" : "major";
  const damageBonus = roll === 19 ? 3 : 4;
  const effects = roll === 19 ? MINOR_EFFECTS : MAJOR_EFFECTS;
  const damageAttack = isDamageAttack(data) && isSuccessful(data);

  return new Promise(resolve => {
    const dialog = new Dialog({
      title: `Natural ${roll}: ${kind} effect${damageAttack ? " or damage" : ""}`,
      content: effectChoiceHtml(kind, effects, damageAttack, damageBonus),
      buttons: { cancel: { label: "Decide later", callback: () => resolve(null) } },
      render: html => {
        html.on("click", "[data-choice]", async event => {
          const choice = event.currentTarget.dataset.choice;
          dialog.close();
          if (choice === "damage") {
            const base = Number(data.totalDamage ?? data.damageWithEffect ?? data.damage ?? 0);
            const total = base + damageBonus;
            await appendToMessage(message, specialCard({
              roll,
              title: `Natural ${roll}: +${damageBonus} damage`,
              text: `The damage bonus was chosen instead of a ${kind} effect.`,
              damage: total
            }), { roll, choice: "damage", damageBonus, totalDamage: total });
            resolve({ choice: "damage", total });
            return;
          }

          const selected = effects.find(effect => effect.id === choice);
          if (!selected) return resolve(null);
          let description = selected.description;
          if (choice === "custom") {
            const custom = await askCustomEffect(kind);
            if (!custom) return resolve(null);
            description = custom;
          }
          await appendToMessage(message, specialCard({
            roll,
            title: `Natural ${roll}: ${selected.label}`,
            text: description
          }), { roll, choice: selected.id, effect: description });
          resolve({ choice: selected.id, description });
        });
      },
      close: () => resolve(null)
    });
    dialog.render(true);
  });
}

async function handleSpecialRoll(actor, data) {
  try {
    if (!game.settings.get(C2T_SPECIAL_ID, "specialRollAutomation")) return;
    const roll = Number(data.roll?.total ?? data.rollTotal ?? 0);
    if (![17, 18, 19, 20].includes(roll)) return;
    if (!isSuccessful(data)) return;

    const message = findRollMessage(actor, data);
    if (message?.getFlag(C2T_SPECIAL_ID, "specialRoll")?.handled) return;
    if (message) await message.setFlag(C2T_SPECIAL_ID, "specialRoll", { handled: true, roll });

    if (roll === 20) await refundTwentyCost(actor, data, message);

    if ((roll === 17 || roll === 18) && isDamageAttack(data)) {
      const bonus = roll === 17 ? 1 : 2;
      const base = Number(data.totalDamage ?? data.damageWithEffect ?? data.damage ?? 0);
      const total = base + bonus;
      await appendToMessage(message, specialCard({
        roll,
        title: `Natural ${roll}: +${bonus} damage`,
        text: "Damage bonus applied automatically.",
        damage: total
      }), { handled: true, roll, choice: "damage", damageBonus: bonus, totalDamage: total });
      return;
    }

    if (roll === 19 || roll === 20) await chooseSpecialResult(actor, data, message, roll);
  } catch (error) {
    console.error(`${C2T_SPECIAL_ID} | Special roll automation failed`, error);
    ui.notifications.error(`Cypher 2 Toolkit: special roll automation failed (${error.message})`);
  }
}

Hooks.once("init", () => {
  game.settings.register(C2T_SPECIAL_ID, "specialRollAutomation", {
    name: "Special roll automation (17–20)",
    hint: "Applies damage bonuses for 17–18 and offers the Cypher 2 minor/major effect choices for 19–20.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.on("rollEngine", (actor, data) => handleSpecialRoll(actor, data));
