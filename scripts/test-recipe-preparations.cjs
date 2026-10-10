const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync('data/recipes-creator-20261008.json','utf8'));
const app=fs.readFileSync('app.js','utf8');
const nodes=new Map();const el=()=>({children:[],classList:{add(){},remove(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},after(){},scrollIntoView(){}});
for(const id of ['recipe','recipeName','recipeMeta','recipeIngredients','recipeSteps','recipeNutritionNotice','recipeAllergens'])nodes.set(id,el());
const ctx={DB_RECIPES:data.recipes,currentDish:null,$:id=>nodes.get(id),document:{getElementById:id=>nodes.get(id),createElement:tag=>({...el(),tag})}};
vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('function creatorPortionIngredientLines('),app.indexOf('function renderDBRecipe(')),ctx);
const flatten=node=>node.children.flatMap(x=>[x,...flatten(x)]);
const linked=data.recipes.filter(r=>r.preparations);assert.equal(linked.length,26);assert.equal(linked.reduce((n,r)=>n+r.preparations.length,0),30);
for(const r of linked){for(const preparation of r.preparations){
 const target=data.recipes.find(x=>x.id===preparation.recipe_id);assert(target);assert.notEqual(target.id,r.id);
 const original=r.ingredients_text;ctx.renderPublicRecipe(r,false);
 const button=flatten(nodes.get('recipeNutritionNotice')).find(x=>x.tag==='button'&&x.textContent===preparation.name+' 만들기 →');assert(button);
 button.onclick();assert.equal(ctx.currentDish.id,target.id);assert.equal(nodes.get('recipeName').textContent,target.names.ko);
 const back=flatten(nodes.get('recipeNutritionNotice')).find(x=>x.tag==='button'&&x.textContent.includes('돌아가기'));assert(back);back.onclick();assert.equal(ctx.currentDish.id,r.id);assert.equal(r.ingredients_text,original);assert.equal(ctx.renderCreatorPreparations.returnTo,null);
}}
const parent=linked[0];ctx.renderPublicRecipe(parent,false);flatten(nodes.get('recipeNutritionNotice')).find(x=>x.tag==='button'&&x.textContent.endsWith('만들기 →')).onclick();ctx.renderPublicRecipe(data.recipes.find(r=>r.tags[0]==='비빔수제비'),false);assert.equal(ctx.renderCreatorPreparations.returnTo,null);assert(!flatten(nodes.get('recipeNutritionNotice')).some(x=>x.tag==='button'&&x.textContent.includes('돌아가기')));
ctx.DB_RECIPES=[];ctx.renderPublicRecipe(parent,false);assert(!flatten(nodes.get('recipeNutritionNotice')).some(x=>x.className==='recipe-preparations'));
assert(!app.slice(app.indexOf('function renderCreatorPreparations('),app.indexOf('function renderCreatorNutritionReference(')).includes('innerHTML'));
console.log('PASS 30 prerequisite links across 26 recipes: correct targets, opening preparation, return to original recipe, unrelated navigation reset, unavailable target hidden, safe text rendering');
