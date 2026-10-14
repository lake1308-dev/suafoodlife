const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync('data/recipes-creator-20261008.json','utf8'));
assert.equal(data.record_count,274);assert.equal(data.recipes.length,274);assert.equal(new Set(data.recipes.map(r=>r.id)).size,274);
const nodes=new Map();function el(){return {children:[],classList:{add(){},remove(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},after(){},scrollIntoView(){}}}
['recipe','recipeName','recipeMeta','recipeIngredients','recipeSteps','recipeNutritionNotice'].forEach(id=>nodes.set(id,el()));
const ctx={currentDish:null,$:id=>nodes.get(id),document:{getElementById:id=>nodes.get(id),createElement:()=>el()}};
vm.createContext(ctx);const app=fs.readFileSync('app.js','utf8');vm.runInContext(app.slice(app.indexOf('function creatorPortionIngredientLines('),app.indexOf('function renderDBRecipe(')),ctx);
for(const r of data.recipes){assert.equal(r.source.channel_id,'UCyn-K7rZLXjGl7VXGweIlcA');assert.equal(r.source.url,'https://www.youtube.com/watch?v='+r.source.record_id);assert.equal(r.source.description_sha256.length,64);assert(r.ingredients_text&&r.steps.ko.length>=2);assert.equal(r.source_nutrition,null);ctx.r=r;vm.runInContext('renderPublicRecipe(r,false)',ctx);assert.equal(nodes.get('recipeSteps').children.length,r.steps.ko.length);assert(nodes.get('recipeNutritionNotice').children.some(x=>x.href===r.source.url));assert(!nodes.get('recipeMeta').textContent.includes('식약처'));assert(nodes.get('recipeMeta').textContent.includes(r.servings?r.servings+'인분':'인분 수 미표기'));assert(nodes.get('recipeNutritionNotice').children.some(x=>x.textContent?.includes(r.nutrition_reference?'대표 식품성분 자료로 계산':'영양값은 아직 계산하지')));}
// Beginner instructions preserve source quantities, ingredient timing and limits.
const cream=data.recipes.find(r=>r.id==='paik_0bnFoRQebq0_cream');
assert(cream.steps.ko.some(x=>x.includes('중불')&&x.includes('노릇')));
assert(cream.steps.ko.some(x=>x.includes('약불')&&x.includes('밀가루 5g')));
assert(cream.steps.ko.some(x=>x.includes('편으로 썬 양송이는 아직 넣지')));
const tang=data.recipes.find(r=>r.id==='paik_WneiVYnZgHo');
assert(tang.steps.ko.some(x=>x.includes('전분가루 10g')&&x.includes('물 20g')));
for(const r of [cream,tang]){ctx.r=r;vm.runInContext('renderPublicRecipe(r,false)',ctx);assert(nodes.get('recipeNutritionNotice').children.some(x=>x.textContent?.includes(r.cooking_notice)));assert.equal(r.servings,null);}
const basic=JSON.parse(fs.readFileSync('data/recipes.json','utf8')).recipes.find(r=>r.id==='tangsuyuk');
assert(basic.example_recipe);assert.equal(basic.related_recipe_id,tang.id);
ctx.DB_RECIPES=data.recipes;ctx.renderDBRecipe=r=>{ctx.selected=r.id};ctx.r=basic;nodes.get('recipeNutritionNotice').replaceChildren();vm.runInContext('renderCookingNotice(r,$("recipeNutritionNotice"))',ctx);
const button=nodes.get('recipeNutritionNotice').children.find(x=>x.type==='button');assert(button);button.onclick();assert.equal(ctx.selected,tang.id);
const audit=JSON.parse(fs.readFileSync('data/recipe-cooking-detail-review-20261014.json','utf8'));
assert.equal(audit.creator_count,274);assert.equal(audit.other_recipe_count,2060);
assert.equal(data.recipes.filter(r=>r.source_cooking_details.length).length,95);
for(const r of data.recipes){
 for(const row of r.source_cooking_details){assert(row.source_step>=1);assert(row.facts.length);assert(row.facts.every(x=>/^(크기|시간|온도|불): /.test(x)));}
 if(r.cooking_detail_audit.status==='section_mapping_required')assert.equal(r.source_cooking_details.length,0);
 ctx.r=r;vm.runInContext('renderPublicRecipe(r,false)',ctx);
 if(r.source_cooking_details.length){const box=nodes.get('recipeNutritionNotice').children.find(x=>x.children?.some(t=>t.textContent==='원본에서 확인한 크기·시간·불 조절'));assert(box);assert(box.children.some(x=>x.textContent?.includes('단계 번호')));}
}
// A failed creator request must not prevent the existing public collection loading.
const loadSource=app.slice(app.indexOf('async function loadRecipeDB('),app.indexOf('function bulkToIngredient('));
(async()=>{for(const fail of [false,true]){const calls=[];const c={DB_RECIPES:[],console:{warn(){}},TextDecoder,fetch:async url=>{calls.push(url);if(url.includes('creator')){if(fail)throw Error('offline');return {ok:true,json:async()=>data};}if((url.includes('recipes-epis')||url.includes('recipes-kfi')||url.includes('recipes-rda-cooking')||url.includes('recipes-epis-master')))return {ok:false};if(url.includes('.gz'))return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({recipes:[{id:'public-sentinel'}]})).buffer};return {json:async()=>({recipes:[{id:'basic-sentinel'}]})};}};vm.createContext(c);vm.runInContext(loadSource,c);await c.loadRecipeDB();assert(c.DB_RECIPES.some(r=>r.id==='public-sentinel'));assert.equal(c.DB_RECIPES.length,fail?2:276);assert.equal(calls.length,7);}console.log('PASS 274 creator recipes: attribution, measured ingredients, original servings, no invented nutrition; loader handles unavailable creator data');})().catch(e=>{console.error(e);process.exitCode=1});
