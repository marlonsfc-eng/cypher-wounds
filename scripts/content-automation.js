const ID="cypher-2-toolkit";
const fget=(d,k)=>d?.getFlag?.(ID,k);

async function findImportedAbility(sourceId){
  for(const pack of game.packs){
    if(pack.documentName!=="Item"||!pack.collection.startsWith("world.")) continue;
    const docs=await pack.getDocuments(); const found=docs.find(d=>d.getFlag(ID,"sourceId")===sourceId); if(found)return found;
  }
  return null;
}

async function chooseEdge(actor){
  return new Promise(resolve=>new Dialog({title:"Barbarian — Edge",content:"<p>Choose the Pool that gains +1 Edge.</p>",buttons:{might:{label:"Might",callback:()=>resolve("might")},speed:{label:"Speed",callback:()=>resolve("speed")},intellect:{label:"Intellect",callback:()=>resolve("intellect")}},close:()=>resolve(null)}).render(true));
}

async function applyPackage(item){
  const actor=item.parent; if(!actor||actor.documentName!=="Actor")return;
  const category=fget(item,"category"); if(!["types","foci"].includes(category)||fget(item,"applied"))return;
  const apply=fget(item,"apply")??{}; const update={};
  if(category==="types") update["system.basic.type"]=item.name;
  if(category==="foci") update["system.basic.focus"]=item.name;
  for(const [pool,amount] of Object.entries(apply.pools??{})){
    const max=foundry.utils.getProperty(actor,`system.pools.${pool}.max`)??0;
    const value=foundry.utils.getProperty(actor,`system.pools.${pool}.value`)??0;
    update[`system.pools.${pool}.max`]=max+Number(amount||0); update[`system.pools.${pool}.value`]=value+Number(amount||0);
  }
  if(apply.edgeChoice){const pool=await chooseEdge(actor);if(pool){const edge=foundry.utils.getProperty(actor,`system.pools.${pool}.edge`)??0;update[`system.pools.${pool}.edge`]=edge+Number(apply.edgeChoice);}}
  if(Object.keys(update).length)await actor.update(update);
  if(apply.wounds&&game.cypherWounds?.applyCapacityBonus){
    await game.cypherWounds.applyCapacityBonus(actor,fget(item,"sourceId")??item.uuid,apply.wounds);
  } else if(apply.wounds&&game.cypherWounds?.getData){
    const data=await game.cypherWounds.getData(actor);
    for(const [s,a] of Object.entries(apply.wounds))data.capacity[s]=(data.capacity[s]??3)+Number(a||0);
    if(game.cypherWounds.saveData) await game.cypherWounds.saveData(actor,data);
    else await actor.setFlag(ID,"wounds",data);
  }
  const refs=fget(item,"abilities")??[]; const toCreate=[];
  for(const ref of refs){if(actor.items.some(i=>i.getFlag(ID,"sourceId")===ref))continue;const src=await findImportedAbility(ref);if(src){const data=src.toObject();delete data._id;toCreate.push(data);}}
  if(toCreate.length)await actor.createEmbeddedDocuments("Item",toCreate);
  await item.setFlag(ID,"applied",true); ui.notifications.info(`${item.name} applied to ${actor.name}.`);
}

async function useImportedAbility(actor,item){
  const cost=Number(item.system.basic.cost??0); const pool=String(item.system.basic.pool??"Pool");
  if(cost>0&&["Might","Speed","Intellect"].includes(pool)){
    const key=pool.toLowerCase(); const current=actor.system.pools?.[key]?.value??0; const edge=actor.system.pools?.[key]?.edge??0; const paid=Math.max(0,cost-edge);
    if(current<paid)return ui.notifications.warn(`${actor.name} does not have enough ${pool}.`);
    await actor.update({[`system.pools.${key}.value`]:current-paid});
  }
  const content=`<div class="c2t-ability-card"><h3>${item.name}</h3>${item.system.description||""}</div>`;
  await ChatMessage.create({speaker:ChatMessage.getSpeaker({actor}),content});
}

async function reconcileAppliedPackages(){
  if(!game.user.isGM||!game.cypherWounds?.applyCapacityBonus)return;
  for(const actor of game.actors??[]){
    for(const item of actor.items??[]){
      const category=fget(item,"category");
      const apply=fget(item,"apply")??{};
      if(["types","foci"].includes(category)&&apply.wounds){
        await game.cypherWounds.applyCapacityBonus(actor,fget(item,"sourceId")??item.uuid,apply.wounds);
      }
    }
  }
}

Hooks.once("ready",()=>reconcileAppliedPackages().catch(e=>console.error(`${ID} reconciliation failed`,e)));

Hooks.on("createItem",async item=>{try{await applyPackage(item);}catch(e){console.error(`${ID} package application failed`,e);ui.notifications.error(`Cypher 2 Toolkit: ${e.message}`);}});
Hooks.on("renderActorSheet",(app,html)=>{
  const actor=app.actor;if(!actor)return;
  html.find("li.item[data-item-id]").each((_,el)=>{const row=$(el),item=actor.items.get(row.data("item-id"));if(!item||fget(item,"category")!=="abilities"||row.find(".c2t-use").length)return;const btn=$('<a class="item-control c2t-use" title="Use ability"><i class="fa-solid fa-play"></i></a>');btn.on("click",async ev=>{ev.preventDefault();ev.stopPropagation();await useImportedAbility(actor,item);});row.find(".item-controls").prepend(btn);});
});
