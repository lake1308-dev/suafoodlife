const fs=require('fs'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8');
async function run(failure){
 const el={dataset:{}};
 const ctx={console:{warn(){}},Blob,Response,DecompressionStream,TextDecoder,Uint8Array,DB_INGREDIENTS:[],DB_ALIAS:new Map(),BASIC_INGREDIENT_NAMES:{},bulkLoadState:'ready',ingredientLoadState:'loading',DB_BULK:[],lang:'ko',normalize:s=>s,rebuildIngredientIndex(){},refreshPendingSearch(){},tr:(en,ko)=>ko,$:()=>el,fetch:async url=>{const p=url.split('?')[0];if(p===failure)throw Error('network');const bytes=fs.readFileSync(p);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes}}};
 vm.createContext(ctx);
 vm.runInContext(app.slice(app.indexOf('function foodSearchLoading()'),app.indexOf('let FOOD_DETAILS=')),ctx);
 vm.runInContext(app.slice(app.indexOf('async function loadIngredientDB()'),app.indexOf('const SEARCH_GROUPS=')),ctx);
 await ctx.loadIngredientDB();return {ctx,el};
}
(async()=>{
 const ok=await run('');assert.equal(ok.ctx.ingredientLoadState,'ready');assert.equal(ok.el.textContent,'음식 검색 준비 완료');
 const partial=await run('data/nutrition-kfind.json');assert.equal(partial.ctx.ingredientLoadState,'partial');assert(partial.ctx.DB_INGREDIENTS.some(x=>x.id==='eggplant_raw'));assert(partial.el.textContent.includes('일부 검색 자료'));assert.equal(partial.el.dataset.state,'partial');
 const batch=await run('data/rda-basic-1000.json.gz');assert.equal(batch.ctx.ingredientLoadState,'partial');assert(batch.ctx.DB_INGREDIENTS.some(x=>x.id==='eggplant_raw'));assert(batch.el.textContent.includes('새로고침'));
 console.log('PASS: normal load, optional network failure and RDA batch failure report accurate readiness while retaining available ingredients.');
})().catch(e=>{console.error(e);process.exitCode=1});
