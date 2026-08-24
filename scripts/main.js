import "./special-rolls.js";
import {CypherContentImporter, importCypherContent} from "./importer.js";
import {PrivateCampaignImporter, importPrivateCampaign} from "./campaign-importer.js";
import "./content-automation.js";
const MODULE_ID="cypher-2-toolkit";
Hooks.once("init",()=>{game.settings.register(MODULE_ID,"lastImport",{scope:"world",config:false,type:String,default:""});game.settings.register(MODULE_ID,"lastCampaignImport",{scope:"world",config:false,type:String,default:""});game.settings.registerMenu(MODULE_ID,"contentImporter",{name:"C2T.Importer.MenuName",label:"C2T.Importer.MenuLabel",hint:"C2T.Importer.MenuHint",icon:"fas fa-file-import",type:CypherContentImporter,restricted:true});game.settings.registerMenu(MODULE_ID,"privateCampaignImporter",{name:"Importar campanha privada",label:"Abrir importador de campanha",hint:"Importa um arquivo privado com Journals, Actors, Items, tabelas, cenas e assets, sem instalar outro módulo no servidor.",icon:"fas fa-book-open",type:PrivateCampaignImporter,restricted:true});});
Hooks.once("ready",()=>{game.cypher2Toolkit=game.cypher2Toolkit??{};Object.assign(game.cypher2Toolkit,{openImporter:()=>new CypherContentImporter().render(true),importContent:importCypherContent,openCampaignImporter:()=>new PrivateCampaignImporter().render(true),importPrivateCampaign});});
