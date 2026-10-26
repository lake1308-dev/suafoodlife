const fs=require('fs'),vm=require('vm'),assert=require('assert');const app=fs.readFileSync('app.js','utf8'),recipes=JSON.parse(fs.readFileSync('data/recipes-creator-20261008.json')).recipes;
const nodes={};class El{constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.classList={add(){},remove(){}}}append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x)}replaceChildren(){this.children=[]}setAttribute(k,v){this.attributes[k]=v}focus(){this.focused=true}select(){}scrollIntoView(){}after(){}}
const el=id=>nodes[id]||(nodes[id]=new El('div'));let copied='';const ctx=vm.createContext({URL,location:{href:'https://suafoodlife.com/?v=test'},navigator:{clipboard:{writeText:async text=>{copied=text}}},document:{createElement:tag=>new El(tag),getElementById:el,querySelector:()=>null},$:el,tr:(en,ko)=>ko,lang:'ko',DB_RECIPES:recipes,currentDish:null,renderRecipeCookingSteps(){},renderCookingNotice(){},renderCreatorNutritionReference(){},renderCreatorAllergenReview(){},renderDBRecipe(){}});
vm.runInContext(app.slice(app.indexOf('function creatorPortionIngredientLines('),app.indexOf('function renderCreatorNutritionReference(')),ctx);
vm.runInContext(app.slice(app.indexOf('function renderPublicRecipe('),app.indexOf('function renderDBRecipe(r,')),ctx);
const all=n=>[n,...n.children.flatMap(all)];const button=name=>all(el('recipeShare')).find(x=>x.tag==='button'&&x.textContent===name);
async function verify(r){assert.equal(el('recipeName').textContent,r.names.ko);await button('레시피 링크 복사').onclick();assert.equal(copied,'https://suafoodlife.com/#recipe='+encodeURIComponent(r.id));await button('재료 목록 복사').onclick();assert(copied.startsWith(r.names.ko+'\n'));assert(copied.endsWith('#recipe='+encodeURIComponent(r.id)));const lines=r.source_kind==='creator_reference'?ctx.creatorPortionIngredientLines(r,r.selected_servings||r.servings):r.ingredients_text.split(/\n+/);for(const line of lines.filter(x=>x.trim()))assert(copied.includes(line));}
(async()=>{let count=0;
 for(const r of recipes.filter(x=>x.preparations?.length)){
  for(const prep of r.preparations){const target=recipes.find(x=>x.id===prep.recipe_id);assert(target);
   ctx.renderCreatorPreparations.returnTo=null;ctx.renderPublicRecipe(r,false);await verify(r);
   const open=all(el('recipeNutritionNotice')).find(x=>x.tag==='button'&&x.textContent===prep.name+' 만들기 →');assert(open);open.onclick();await verify(target);
   const back=all(el('recipeNutritionNotice')).find(x=>x.tag==='button'&&x.textContent.startsWith('← '));assert(back);back.onclick();await verify(r);count++;
  }
 }
 const r=recipes.find(x=>x.id==='paik_DnQ09ZZCjCs');ctx.renderPublicRecipe(r,false);const select=all(el('recipeNutritionNotice')).find(x=>x.id==='creatorRecipeServings');select.value='4';select.onchange();await verify(r);assert(copied.includes('4인분'));assert(copied.includes('240g'));
 console.log('PASS '+count+' real preparation links: main dish → sauce/stock → return keeps title, copied link, shopping ingredients and serving changes synchronized.');
})().catch(err=>{console.error(err);process.exit(1)});
