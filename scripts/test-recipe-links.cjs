const fs=require('fs'),zlib=require('zlib'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8');
const files=['recipes.json','recipes-creator-20261008.json','recipes-epis-20261012.json.gz','recipes-kfi-rice-20261012.json.gz','recipes-rda-cooking-20261013.json.gz','recipes-epis-master-20261014.json.gz','recipes-public-20261008.json.gz'];
const recipes=files.flatMap(f=>{let bytes=fs.readFileSync('data/'+f);return JSON.parse(f.endsWith('.gz')?zlib.gunzipSync(bytes):bytes).recipes});
const foods={tofu:{id:'rda:D0150000009a',names:{ko:'두부'},verification_status:'verified'},egg_whole:{id:'egg_whole',names:{ko:'달걀'},verification_status:'verified'},potato_sumi_raw:{id:'potato_sumi_raw',names:{ko:'감자'}},pack:{id:'pack',names:{ko:'두부 스낵'},verification_status:'official_bulk',sources:[{data_type:'가공식품'}]}};
const ctx=vm.createContext({DB_RECIPES:recipes,BASIC_INGREDIENT_NAMES:{},canonicalIngredientId:x=>x,getIngredient:id=>foods[id],compactSearch:s=>s.toLowerCase().replace(/[\s_,·()%]/g,'')});
vm.runInContext(app.slice(app.indexOf('const RECIPE_INGREDIENT_TERMS='),app.indexOf('function renderRecipeVariants')),ctx);
assert.equal(ctx.recipesForFood(foods.tofu).length,0);
const tofu=ctx.recipesForIngredient('tofu');assert(tofu.some(r=>r.id==='paik_Eino3yP-Wk0'));assert(ctx.recipesForIngredient('egg_whole').length>9);assert.equal(ctx.recipesForIngredient('pack').length,0);
ctx.DB_RECIPES=[{id:'starch',ingredients_text:'감자전분: 20g'},{id:'potato',ingredients_text:'감자: 1개'},{id:'sauce',ingredients_text:'두부소스: 1큰술'}];assert.deepEqual(Array.from(ctx.recipesForIngredient('potato_sumi_raw'),r=>r.id),['potato']);assert.equal(ctx.recipesForIngredient('tofu').length,0);
ctx.DB_RECIPES=recipes;const dish={names:{ko:'김치찌개'},verification_status:'official_bulk',sources:[{data_type:'음식'}]};assert(ctx.recipesForFood(dish).some(r=>r.id==='kimchi_jjigae'));dish.sources[0].data_type='가공식품';assert.equal(ctx.recipesForFood(dish).length,0);
// Render all connected results in batches; no recipes silently disappear after nine.
function el(){return {textContent:'',dataset:{},children:[],classList:{toggle(){}},appendChild(x){this.children.push(x);x.parent=this},remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)},querySelector(){return el()}}}
const section=el(),host=el();host.closest=()=>section;const hint=el();ctx.$=id=>id==='ingredientRecipeResults'?host:hint;ctx.document={createElement:el};ctx.lang='ko';ctx.recipeLoadState='ready';ctx.tr=(en,ko)=>ko;ctx.renderRecipeVariants=()=>{};ctx.renderDBRecipeCard=(r,h)=>h.appendChild({recipe:r.id});
vm.runInContext(app.slice(app.indexOf('function renderIngredientRecipes'),app.indexOf('const _renderIngredient')),ctx);ctx.renderIngredientRecipes('egg_whole');while(host.children.some(x=>x.onclick)){host.children.find(x=>x.onclick).onclick()};assert.equal(host.children.length,ctx.recipesForIngredient('egg_whole').length);
console.log(`PASS ${recipes.length} source recipes: tofu connects ${tofu.length}, egg connects ${ctx.recipesForIngredient('egg_whole').length}; starch/sauce/product false matches excluded; dish links and all pagination results verified.`);
