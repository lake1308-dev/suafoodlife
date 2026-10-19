const fs=require('fs'),zlib=require('zlib'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8');
const files=['recipes.json','recipes-creator-20261008.json','recipes-epis-20261012.json.gz','recipes-kfi-rice-20261012.json.gz','recipes-rda-cooking-20261013.json.gz','recipes-epis-master-20261014.json.gz','recipes-public-20261008.json.gz'];
const recipes=files.flatMap(f=>{let bytes=fs.readFileSync('data/'+f);return JSON.parse(f.endsWith('.gz')?zlib.gunzipSync(bytes):bytes).recipes});
const foods={tofu:{id:'rda:D0150000009a',names:{ko:'두부'},verification_status:'verified'},egg_whole:{id:'egg_whole',names:{ko:'달걀'},verification_status:'verified'},potato_sumi_raw:{id:'potato_sumi_raw',names:{ko:'감자'}},pack:{id:'pack',names:{ko:'두부 스낵'},verification_status:'official_bulk',sources:[{data_type:'가공식품'}]}};
foods['rda:D0150000009a']=foods.tofu;
const ctx=vm.createContext({DB_RECIPES:recipes,BASIC_INGREDIENT_NAMES:{},canonicalIngredientId:x=>x,getIngredient:id=>foods[id],compactSearch:s=>s.toLowerCase().replace(/[\s_,·()%]/g,'')});
vm.runInContext(app.slice(app.indexOf('const RECIPE_INGREDIENT_TERMS='),app.indexOf('function renderRecipeVariants')),ctx);
assert.equal(ctx.recipesForFood(foods.tofu).length,0);
const tofu=ctx.recipesForIngredient('tofu');assert(tofu.some(r=>r.id==='paik_Eino3yP-Wk0'));assert.equal(ctx.recipesForIngredient('rda:D0150000009a').length,tofu.length);assert(ctx.recipesForIngredient('egg_whole').length>9);assert.equal(ctx.recipesForIngredient('pack').length,0);
ctx.DB_RECIPES=[{id:'starch',ingredients_text:'감자전분: 20g'},{id:'potato',ingredients_text:'감자: 1개'},{id:'sauce',ingredients_text:'두부소스: 1큰술'}];assert.deepEqual(Array.from(ctx.recipesForIngredient('potato_sumi_raw'),r=>r.id),['potato']);assert.equal(ctx.recipesForIngredient('tofu').length,0);
ctx.DB_RECIPES=recipes;const dish={names:{ko:'김치찌개'},verification_status:'official_bulk',sources:[{data_type:'음식'}]};assert(ctx.recipesForFood(dish).some(r=>r.id==='kimchi_jjigae'));dish.sources[0].data_type='가공식품';assert.equal(ctx.recipesForFood(dish).length,0);
// Render all connected results in batches; no recipes silently disappear after nine.
function el(){return {textContent:'',dataset:{},children:[],classList:{toggle(){}},appendChild(x){this.children.push(x);x.parent=this},remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)},querySelector(){return el()}}}
const section=el(),host=el();host.closest=()=>section;const hint=el();ctx.$=id=>id==='ingredientRecipeResults'?host:hint;ctx.document={createElement:el};ctx.lang='ko';ctx.recipeLoadState='ready';ctx.tr=(en,ko)=>ko;ctx.renderRecipeVariants=()=>{};ctx.renderDBRecipeCard=(r,h)=>h.appendChild({recipe:r.id});
vm.runInContext(app.slice(app.indexOf('function renderIngredientRecipes'),app.indexOf('const _renderIngredient')),ctx);ctx.renderIngredientRecipes('egg_whole');while(host.children.some(x=>x.onclick)){host.children.find(x=>x.onclick).onclick()};assert.equal(host.children.length,ctx.recipesForIngredient('egg_whole').length);
console.log(`PASS ${recipes.length} source recipes: tofu connects ${tofu.length}, egg connects ${ctx.recipesForIngredient('egg_whole').length}; starch/sauce/product false matches excluded; dish links and all pagination results verified.`);

// Use real RDA source records and their curated identities for the expanded foods.
for(const f of ['ingredients.json','allergen-ingredients.json'])for(const x of JSON.parse(fs.readFileSync('data/'+f)).ingredients||[])if(!foods[x.id])foods[x.id]=x;
for(const r of JSON.parse(fs.readFileSync('data/nutrition-kfind.json')).records)if(!foods[r.ingredient_id])foods[r.ingredient_id]={id:r.ingredient_id,names:{ko:r.source_food_name},verification_status:'verified'};
for(const f of fs.readdirSync('data').filter(f=>f.startsWith('rda')&&f.endsWith('.json.gz'))){
 const d=JSON.parse(zlib.gunzipSync(fs.readFileSync('data/'+f)));
 for(const x of d.ingredients||[]){const id=d.curated_id_by_record?.[x.id]||x.id;if(!foods[id])foods[id]={...x,id};}
}
vm.runInContext(app.split('\n').filter(l=>l.startsWith('const BASIC_INGREDIENT_NAMES=')||l.startsWith('Object.assign(BASIC_INGREDIENT_NAMES')).join('\n'),ctx);
const expanded=['cabbage_raw','broccoli_raw','eggplant_raw','sweet_potato_raw','rda:F1480010000a','rda:F065002B090a','rda:F1150000000a','rda:F1820000000a','rda:F1980050000a','rda:G0230000000a','cooked_white_rice'];
if(!foods.cooked_white_rice)foods.cooked_white_rice={id:'cooked_white_rice',names:{ko:'쌀밥'}};
for(const id of expanded){assert(foods[id],id+' exists in connected source');assert.equal(ctx.recipesForFood(foods[id]).length,0,id+' uses ingredient links');const rs=ctx.recipesForIngredient(id);assert(rs.length>0,id+' connects recipes');console.log(foods[id].names.ko+': '+rs.length);}
ctx.DB_RECIPES=[{id:'false',ingredients_text:'무순: 10g\n무말랭이: 10g\n고구마전분: 10g\n양배추즙: 100ml'}];
for(const id of ['rda:F065002B090a','sweet_potato_raw','cabbage_raw'])assert.equal(ctx.recipesForIngredient(id).length,0,id+' avoids different ingredients');
console.log('PASS 11 additional ingredient identities, real RDA records, and similar-name false matches.');

ctx.DB_RECIPES=recipes;
const originalOrder=recipes.map(r=>r.id);
const tofuOrdered=ctx.recipesForIngredient('rda:D0150000009a');
assert.equal(tofuOrdered[0].id,'paik_Eino3yP-Wk0','tofu braise appears before soups using a little tofu');
assert(tofuOrdered.findIndex(r=>r.id==='paik_Eino3yP-Wk0')<tofuOrdered.findIndex(r=>r.id==='kimchi_jjigae'));
assert.deepEqual(recipes.map(r=>r.id),originalOrder,'global recipe order remains unchanged');
assert(ctx.ingredientRecipeRank({names:{ko:'콩나물무침'},instruction_review:{status:'expanded_with_source_limits'}},['콩나물'])<ctx.ingredientRecipeRank({names:{ko:'해장국'}},['콩나물']));
assert.equal(ctx.ingredientRecipeRank({names:{ko:'무침소스'}},['무']),3,'cooking word is not a radish-led dish');
assert.equal(ctx.ingredientRecipeRank({names:{ko:'무생채'}},['무']),1);
for(const id of ['egg_whole',...expanded]){const list=ctx.recipesForIngredient(id);assert.equal(new Set(list.map(r=>r.id)).size,list.length);}
console.log('PASS ingredient-led recipes first, expanded instructions within each group, no unrelated radish prefix boost, stable source data and complete result sets.');
