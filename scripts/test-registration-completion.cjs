const fs=require('fs'),vm=require('vm'),assert=require('assert'),zlib=require('zlib'),path=require('path');
process.chdir(path.resolve(__dirname,'..'));
const app=fs.readFileSync('app.js','utf8');
const manifest=JSON.parse(fs.readFileSync('data/catalog-manifest.json'));
const codes=new Set();let imported=0,missing=0;
for(const chunk of manifest.chunks){
 const bytes=fs.readFileSync(chunk.path);
 assert.equal(require('crypto').createHash('sha256').update(bytes).digest('hex'),chunk.sha256);
 const data=JSON.parse(zlib.gunzipSync(bytes));assert.equal(data.rows.length,chunk.record_count);
 for(const row of data.rows){const item=Object.fromEntries(data.columns.map((key,i)=>[key,row[i]]));assert(!codes.has(item.code));codes.add(item.code);if(item.import_flag==='Y')imported++;
  for(const key of ['kcal','protein_g','fat_g','carbs_g','sugars_g','sodium_mg','cholesterol_mg','sat_fat_g'])assert(item[key]===null||Number.isFinite(Number(item[key])));
  if(['kcal','protein_g','fat_g','carbs_g','sugars_g','sodium_mg','cholesterol_mg','sat_fat_g'].some(key=>item[key]===null))missing++;
 }
}
assert.equal(codes.size,337780);assert.equal(imported,63048);
const context={console,Blob,Response,DecompressionStream,Uint8Array,TextDecoder,fetch:async url=>{const bytes=fs.readFileSync(url.split('?')[0]);return {ok:true,json:async()=>JSON.parse(bytes),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}}};
vm.createContext(context);
vm.runInContext("let DB_INGREDIENTS=[];const DB_ALIAS=new Map(),BASIC_INGREDIENT_NAMES={};const normalize=s=>s;function rebuildIngredientIndex(){};",context);
vm.runInContext(app.slice(app.indexOf('async function loadIngredientDB'),app.indexOf('const SEARCH_GROUPS=')),context);
(async()=>{
 await vm.runInContext('loadIngredientDB()',context);
 assert.equal(vm.runInContext('DB_INGREDIENTS.filter(x=>x.sources?.[0]?.workbook_sheet).length',context),3311);
 const primaryIds=['peanut_dried','apple_raw','strawberry_cultivated_raw','garlic_raw','cooked_white_rice','chicken_breast_raw','milk','egg_whole','pine_nut_raw'];
 for(const id of primaryIds){const item=vm.runInContext(`DB_INGREDIENTS.find(x=>x.id===${JSON.stringify(id)})`,context);assert(item,id+' missing');for(const key of ['kcal','protein_g','fat_g','carbs_g','sugars_g','sodium_mg','cholesterol_mg','sat_fat_g'])assert(Number.isFinite(item.nutrition_per_100g[key]),id+' '+key+' missing');}
 const newItems=JSON.parse(zlib.gunzipSync(fs.readFileSync('data/rda-foods-remaining-811.json.gz'))).ingredients;
 assert.equal(newItems.length,811);assert.equal(new Set(newItems.map(x=>x.id)).size,811);
 for(const item of newItems)assert.equal(item.allergen_info.status,'unverified');
 const elements={};context.document={querySelectorAll:()=>[]};context.elements=elements;
 vm.runInContext('let currentKey="sample",currentAmount=100;const sample={sources:[{basis:"100g"}],nutrition_per_100g:{kcal:100,protein_g:0,carbs_g:null,fat_g:2,sat_fat_g:null,sugars_g:null,sodium_mg:0,cholesterol_mg:null}};const getIngredient=()=>sample;const nutritionFor=()=>sample.nutrition_per_100g;const $=id=>elements[id]||(elements[id]={});const tr=(en,ko)=>ko;',context);
 vm.runInContext(app.slice(app.indexOf('function round1'),app.indexOf('const ALLERGEN_SOURCE_URL=')),context);vm.runInContext('updateNutrition()',context);
 assert.equal(elements.carbs.textContent,'—');assert.equal(elements.protein.textContent,'0g');assert.equal(elements.sodium.textContent,'0mg');assert(elements.nutritionAvailability.textContent.includes('—는 0이 아닙니다'));
 vm.runInContext('const product=DB_INGREDIENTS.find(x=>x.id==="chilsung_cider_250ml");sample.nutrition_per_100g=product.nutrition_per_100g;sample.sources=product.sources;currentAmount=250;updateNutrition();',context);
 assert.equal(elements.nutritionCalories.textContent,'110 kcal');assert.equal(elements.protein.textContent,'0g');assert.equal(elements.fat.textContent,'0g');assert.equal(elements.satfat.textContent,'0g');assert.equal(elements.cholesterol.textContent,'0mg');assert.equal(elements.sodium.textContent,'6mg');
 console.log('PASS primary foods complete; Chilsung 250ml label supplements and serving calculation.');
 console.log('PASS 337780 unique catalogue records, 63048 marked imports, 3311 RDA records; null/zero display; missing-value explanation.');
 console.log('Bulk records with partial display nutrition:',missing);
})().catch(err=>{console.error(err);process.exitCode=1});
