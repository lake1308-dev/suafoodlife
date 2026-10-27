const fs=require('fs'),vm=require('vm'),assert=require('assert');const app=fs.readFileSync('app.js','utf8'),recipes=JSON.parse(fs.readFileSync('data/recipes.json')).recipes;
const elements={},handlers={},rendered=[];function el(id){return elements[id]||(elements[id]={value:'',textContent:'',hidden:false,innerHTML:'',classList:{add(){},remove(){},toggle(){}},addEventListener(event,fn){handlers[id+':'+event]=fn},focus(){}})}
const foods={};const ctx=vm.createContext({getIngredient:id=>foods[id],BASIC_INGREDIENT_NAMES:{egg_whole:"달걀"},normalize:s=>s.trim().toLowerCase(),lang:"ko",clearTimeout(){},document:{querySelector(){return null}},DB_RECIPES:recipes,compactSearch:s=>s.toLowerCase().replace(/[\s_,·()%]/g,''),$ :el,tr:(en,ko)=>ko,resetFoodView(){},closeIngredientSuggestions(){},renderIngredient:id=>rendered.push(id),searchIngredients:()=>[{id:'first'},{id:'second'}],findIngredientExact:()=> 'exact',searchTimer:null,bulkLoadState:'loaded',suggestionsRequested:false,pendingFoodSubmit:false,ingredientLoadState:'ready'});
vm.runInContext(app.slice(app.indexOf('function foodSearchLoading'),app.indexOf('function updateSearchReadiness')),ctx);
vm.runInContext(app.slice(app.indexOf('$("searchForm").addEventListener'),app.indexOf('document.querySelectorAll(".quick button")',app.indexOf('$("searchForm").addEventListener'))),ctx);
el('ingredientInput').value='라면';handlers['searchForm:submit']({preventDefault(){}});assert.equal(rendered.pop(),'first');
ctx.searchIngredients=()=>[];handlers['searchForm:submit']({preventDefault(){}});assert.equal(rendered.pop(),'exact');
// Missing ingredient batches must not be mistaken for a genuinely absent food.
ctx.findIngredientExact=()=>null;ctx.bulkLoadState='ready';ctx.ingredientLoadState='partial';handlers['searchForm:submit']({preventDefault(){}});assert(el('ingredientFallback').textContent.includes('새로고침'));
ctx.ingredientLoadState='ready';handlers['searchForm:submit']({preventDefault(){}});assert(el('ingredientFallback').textContent.includes('검색 결과가 없습니다'));
ctx.renderIngredientSuggestions=()=>{};ctx.findIngredientExact=()=>null;ctx.bulkLoadState='loading';handlers['searchForm:submit']({preventDefault(){}});assert(ctx.pendingFoodSubmit);
// A partial catalogue match must not win before the exact ingredient arrives.
ctx.searchIngredients=()=>[{id:'egg_soup'}];el('ingredientInput').value='달걀';
ctx.renderIngredientSuggestions=()=>{};
handlers['searchForm:submit']({preventDefault(){}});assert.equal(rendered.length,0);assert(ctx.pendingFoodSubmit);
vm.runInContext(app.slice(app.indexOf('function refreshPendingSearch'),app.indexOf('updateSearchReadiness();\nPromise.allSettled')),ctx);
ctx.bulkLoadState='ready';ctx.ingredientLoadState='loading';ctx.refreshPendingSearch();assert.equal(rendered.length,0);
ctx.ingredientLoadState='ready';ctx.searchIngredients=()=>[{id:'egg_whole'}];ctx.refreshPendingSearch();assert.equal(rendered.pop(),'egg_whole');
// Editing or explicitly selecting a suggestion cancels the queued automatic choice.
ctx.suggestionsRequested=false;ctx.refreshPendingSearch();assert.equal(rendered.length,0);

// A verified exact basic name can open before bulk products finish, after all ingredient merges.
foods.egg_whole={id:'egg_whole',verification_status:'verified',nutrition_per_100g:{kcal:140}};
ctx.suggestionsRequested=true;ctx.pendingFoodSubmit=true;ctx.bulkLoadState='loading';ctx.ingredientLoadState='loading';ctx.refreshPendingSearch();assert.equal(rendered.length,0);
ctx.ingredientLoadState='ready';ctx.refreshPendingSearch();assert.equal(rendered.pop(),'egg_whole');
handlers['searchForm:submit']({preventDefault(){}});assert.equal(rendered.pop(),'egg_whole');
el('ingredientInput').value='달걀국';handlers['searchForm:submit']({preventDefault(){}});assert.equal(rendered.length,0,'related dishes still wait for complete ranking');
el('ingredientInput').value='달걀';foods.egg_whole.nutrition_per_100g.kcal=null;handlers['searchForm:submit']({preventDefault(){}});assert.equal(rendered.length,0,'missing calories do not shortcut loading');
foods.egg_whole.nutrition_per_100g.kcal=140;foods.egg_whole.verification_status='product_label';handlers['searchForm:submit']({preventDefault(){}});assert.equal(rendered.length,0,'products do not shortcut loading');
vm.runInContext(app.slice(app.indexOf('function recipesForFood'),app.indexOf('function renderRecipeVariants')),ctx);
ctx.food={names:{ko:'김치찌개'},verification_status:'official_bulk',sources:[{data_type:'음식'}]};assert.equal(vm.runInContext('recipesForFood(food)[0].id',ctx),'kimchi_jjigae');ctx.food.names.ko='김치찌개, 돼지고기';assert.equal(vm.runInContext('recipesForFood(food)[0].id',ctx),'kimchi_jjigae');ctx.food.sources[0].data_type='가공식품';assert.equal(vm.runInContext('recipesForFood(food).length',ctx),0);
let hidden;elements.countryCards={innerHTML:'',classList:{toggle(k,v){hidden=v}},appendChild(){}};ctx.COUNTRY_META={};vm.runInContext(app.slice(app.indexOf('function renderRecipeVariants'),app.indexOf('function renderIngredientRecipes')),ctx);vm.runInContext('renderRecipeVariants(DB_RECIPES)',ctx);assert.equal(hidden,true);ctx.variants=[{regional_variant:true,country:'Korea',region:'Jeolla'},{regional_variant:true,country:'Korea',region:'Gangwon'}];ctx.document.createElement=()=>({});vm.runInContext('renderRecipeVariants(variants)',ctx);assert.equal(hidden,false);
console.log('PASS Enter selects first ranked result, exact fallback, pending load, exact verified basic food shortcut, no dish/product shortcuts; direct dish recipes exclude packaged products; regional selectors require multiple real variants.');
