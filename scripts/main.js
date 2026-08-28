import "./special-rolls.js";
import {CypherContentImporter, importCypherContent} from "./importer.js";
import {PrivateCampaignImporter, importPrivateCampaign} from "./campaign-importer.js";
import {CypherIconManager, MAPPING_SETTING} from "./icon-manager.js";
import "./content-automation.js";
import "./combat-assistant.js";
const MODULE_ID="cypher-2-toolkit";
Hooks.once("init",()=>{game.settings.register(MODULE_ID,"lastImport",{scope:"world",config:false,type:String,default:""});game.settings.register(MODULE_ID,"lastCampaignImport",{scope:"world",config:false,type:String,default:""});game.settings.register(MODULE_ID,MAPPING_SETTING,{scope:"world",config:false,type:String,default:"{}"});game.settings.registerMenu(MODULE_ID,"contentImporter",{name:"C2T.Importer.MenuName",label:"C2T.Importer.MenuLabel",hint:"C2T.Importer.MenuHint",icon:"fas fa-file-import",type:CypherContentImporter,restricted:true});game.settings.registerMenu(MODULE_ID,"privateCampaignImporter",{name:"Importar campanha privada",label:"Abrir importador de campanha",hint:"Importa um arquivo privado com Journals, Actors, Items, tabelas, cenas e assets, sem instalar outro módulo no servidor.",icon:"fas fa-book-open",type:PrivateCampaignImporter,restricted:true});game.settings.registerMenu(MODULE_ID,"iconManager",{name:"C2T.Icons.MenuName",label:"C2T.Icons.MenuLabel",hint:"C2T.Icons.MenuHint",icon:"fas fa-icons",type:CypherIconManager,restricted:true});});
Hooks.once("ready",()=>{game.cypher2Toolkit=game.cypher2Toolkit??{};Object.assign(game.cypher2Toolkit,{openImporter:()=>new CypherContentImporter().render(true),importContent:importCypherContent,openCampaignImporter:()=>new PrivateCampaignImporter().render(true),importPrivateCampaign,openIconManager:()=>new CypherIconManager().render(true)});});
