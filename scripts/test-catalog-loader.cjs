const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path');process.chdir(path.resolve(__dirname,'..'));
const app=fs.readFileSync('app.js','utf8');
const manifest=JSON.parse(fs.readFileSync('data/catalog-manifest.json'));
const prefix=`let lang='ko',DB_BULK=[],DB_BULK_BY_NAME,DB_BULK_BY_ID,FOOD_ADVICE_BATCH={},FOOD_DETAILS={},bulkLoadState='loading';
const DB_INGREDIENTS=[{id:'peanut_dried',names:{ko:'땅콩, 말린것',en:'Peanut'},sources:[{}],nutrition_per_100g:{kcal:520}}];
const BASIC_INGREDIENT_NAMES={peanut_dried:'땅콩'};
const normalize=s=>s.trim().toLowerCase().replace(/\\s+/g,' ');
const $=()=>null;
const ingredientDisplayName=x=>BASIC_INGREDIENT_NAMES[x.id]||x.names.ko;
const getIngredient=id=>DB_BULK_BY_ID.get(id)||DB_INGREDIENTS.find(x=>x.id===id);
`;
const functions=app.slice(app.indexOf('function bulkToIngredient'),app.indexOf('async function loadIngredientDB'))+app.slice(app.indexOf('const SEARCH_GROUPS='),app.indexOf('function findIngredientExact'))+app.slice(app.indexOf('function foodSearchIdentity'),app.indexOf('const SMALL_SERVING_CATEGORIES'));
async function run(failPath){
 let active=0,peak=0;
 const context={console,Blob,Response,DecompressionStream,TextDecoder,Uint8Array,fetch:async url=>{
  const file=url.split('?')[0];if(file===failPath)return {ok:false,status:503};
  active++;peak=Math.max(peak,active);
  const b=fs.readFileSync(file);
  await new Promise(resolve=>setImmediate(resolve));active--;
  return {ok:true,status:200,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),json:async()=>JSON.parse(b)};
 }};
 vm.createContext(context);vm.runInContext(prefix+functions,context);await vm.runInContext('loadBulkNutritionDB()',context);
 const state=vm.runInContext('({count:DB_BULK.length,state:bulkLoadState,unique:DB_BULK_BY_ID.size})',context);
 assert(peak<=4,'network concurrency exceeds four');
 if(failPath){const omitted=manifest.chunks.find(x=>x.path===failPath).record_count;assert.equal(state.count,manifest.record_count-omitted);assert.equal(state.state,'partial');return}
 assert.equal(state.count,manifest.record_count);assert.equal(state.unique,state.count);assert.equal(state.state,'ready');
 assert.equal(vm.runInContext("searchIngredients('땅콩')[0].id",context),'peanut_dried');
 for(const q of ['라면','칠성사이다','삼양라면','진라면','신라면','롯데칠성','투지팜비트야채생즙']){
  const before=performance.now();const hits=vm.runInContext(`searchIngredients(${JSON.stringify(q)})`,context);assert(hits.length,q+' not found');console.log(q,hits.length,Math.round(performance.now()-before)+'ms',hits[0].name);
 }
 const unit=vm.runInContext("DB_BULK.find(x=>x.names.ko==='투지팜비트야채생즙')",context);assert.equal(unit.sources[0].basis,'100ml');assert.equal(unit.nutrition_per_100g.kcal,39);
 console.log('PASS',state.count,'unique catalogue records; core ingredient priority; brand/vendor search; original 100ml basis; concurrency',peak);
}
(async()=>{await run();await run(manifest.chunks[0].path);console.log('PASS partial load keeps remaining records searchable')})().catch(err=>{console.error(err);process.exitCode=1});
