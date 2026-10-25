const fs=require('fs'),vm=require('vm'),assert=require('assert');const app=fs.readFileSync('app.js','utf8');
const nodes={};function el(){return {children:[],style:{},textContent:'',value:'',classList:{remove(){},add(){}},setAttribute(){},replaceChildren(){this.children=[]},append(...xs){this.children.push(...xs)},focus(){this.focused=true},select(){this.selected=true}}}
const recipe={id:'paik_Eino3yP-Wk0',names:{ko:'두부조림'}};const opened=[];let copied;
const ctx=vm.createContext({URL,location:{href:'https://suafoodlife.com/?v=test&private=value#homeRecipes',hash:''},navigator:{clipboard:{writeText:async s=>{copied=s}}},document:{createElement:el},$:id=>nodes[id]||(nodes[id]=el()),tr:(en,ko)=>ko,recipeLoadState:'loading',DB_RECIPES:[recipe],renderDBRecipe:r=>opened.push(r.id),returnTarget:null,lastRecipeTrigger:null});
vm.runInContext(app.slice(app.indexOf('function recipeShareURL'),app.indexOf('function renderDBRecipe(r,')),ctx);
(async()=>{
 const url=ctx.recipeShareURL(recipe.id);assert.equal(url,'https://suafoodlife.com/#recipe=paik_Eino3yP-Wk0');assert(!url.includes('private'));
 assert.equal(decodeURIComponent(new URL(ctx.recipeShareURL('한글 &/')).hash.slice(8)),'한글 &/');
 ctx.location.hash='#recipe='+recipe.id;ctx.openSharedRecipe();assert(nodes.sharedRecipeStatus.textContent.includes('불러오고'));assert.equal(opened.length,0);
 recipe.selected_servings=4;ctx.recipeLoadState='ready';ctx.openSharedRecipe();assert.equal(recipe.selected_servings,undefined);assert.equal(opened.pop(),recipe.id);assert.equal(ctx.returnTarget,'homeRecipes');
 ctx.location.hash='#recipe=not-found';ctx.openSharedRecipe();assert(nodes.sharedRecipeStatus.textContent.includes('열지 못했어요'));assert.equal(opened.length,0);
 ctx.location.hash='#recipe=%E0%A4%A';ctx.openSharedRecipe();assert.equal(opened.length,0);
 ctx.location.hash='#foodDiscovery';ctx.openSharedRecipe();assert.equal(nodes.sharedRecipeStatus.textContent,'');
 ctx.renderRecipeShare(recipe);await nodes.recipeShare.children[0].onclick();assert.equal(copied,url);assert(nodes.recipeShare.children[3].textContent.includes('복사했어요'));
 ctx.navigator.clipboard.writeText=async()=>{throw Error('permission denied')};await nodes.recipeShare.children[0].onclick();const input=nodes.recipeShare.children[2];assert.equal(input.value,url);assert(input.readOnly&&input.focused&&input.selected);
 ctx.navigator.clipboard=null;await nodes.recipeShare.children[0].onclick();assert.equal(input.value,url);
 const count=nodes.recipeShare.children.length;ctx.renderRecipeShare({...recipe,id:'kimchi_jjigae'});assert.equal(nodes.recipeShare.children.length,count);ctx.navigator.clipboard={writeText:async s=>{copied=s}};await nodes.recipeShare.children[0].onclick();assert(copied.endsWith('#recipe=kimchi_jjigae'));
 const base=JSON.parse(fs.readFileSync('data/recipes.json')).recipes[0],originalIngredients=JSON.stringify(base.ingredients);base.selected_servings=8;
 ctx.renderRecipeShare(base);const reset=nodes.recipeShare.children.find(x=>x.textContent==='원본 분량으로 되돌리기');assert(reset);reset.onclick();assert.equal(base.selected_servings,undefined);assert.equal(opened.pop(),base.id);assert.equal(JSON.stringify(base.ingredients),originalIngredients);
 assert.equal(ctx.recipeHasEditableAmounts({public_recipe:true,source_kind:'mfds'}),false);assert.equal(ctx.recipeHasEditableAmounts({public_recipe:true,source_kind:'creator_reference',servings:null,portion_lines:[]}),false);
 assert.equal(ctx.recipeHasEditableAmounts({public_recipe:true,source_kind:'creator_reference',servings:2,portion_lines:[]}),true);
 console.log('PASS restore action removes selected serving override, preserves original ingredient data, hides for non-editable recipes, shared links open original portions.');
 console.log('PASS clean same-site recipe URLs, encoded IDs, loading-to-open, unknown/malformed IDs, unrelated anchors, clipboard success, denied/unavailable fallback, recipe changes without stale links.');
})().catch(e=>{console.error(e);process.exit(1)});
