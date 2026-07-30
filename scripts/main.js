import {CypherContentImporter, importCypherContent} from "./importer.js";
import "./content-automation.js";
const MODULE_ID="cypher-2-toolkit";
Hooks.once("init",()=>{game.settings.register(MODULE_ID,"lastImport",{scope:"world",config:false,type:String,default:""});game.settings.registerMenu(MODULE_ID,"contentImporter",{name:"C2T.Importer.MenuName",label:"C2T.Importer.MenuLabel",hint:"C2T.Importer.MenuHint",icon:"fas fa-file-import",type:CypherContentImporter,restricted:true});});
Hooks.once("ready",()=>{game.cypher2Toolkit=game.cypher2Toolkit??{};Object.assign(game.cypher2Toolkit,{openImporter:()=>new CypherContentImporter().render(true),importContent:importCypherContent});});
