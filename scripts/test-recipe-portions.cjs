const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync('data/recipes-creator-20261008.json','utf8'));
const app=fs.readFileSync('app.js','utf8');const nodes=new Map();function el(){return {children:[],classList:{add(){},remove(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},after(){},scrollIntoView(){}}}
['recipe','recipeName','recipeMeta','recipeIngredients','recipeSteps','recipeNutritionNotice'].forEach(id=>nodes.set(id,el()));
const ctx={currentDish:null,$:id=>nodes.get(id),document:{getElementById:id=>nodes.get(id),createElement:tag=>({...el(),tag})}};
vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('function creatorPortionIngredientLines('),app.indexOf('function renderDBRecipe(')),ctx);
const kimchi=data.recipes.find(r=>r.tags[0]==='김치찌개'),bean=data.recipes.find(r=>r.tags[0]==='콩나물무침');
assert(ctx.creatorPortionIngredientLines(kimchi,1).includes('돼지고기: 60g'));assert(ctx.creatorPortionIngredientLines(kimchi,4).includes('쌀뜨물: 760ml'));
assert(ctx.creatorPortionIngredientLines(bean,1).includes('콩나물: 80g'));assert(ctx.creatorPortionIngredientLines(bean,1).includes('msg(미원): 0.2g'));assert(ctx.creatorPortionIngredientLines(bean,1).includes('*주 재료*'));
assert.deepEqual(Array.from(ctx.creatorPortionIngredientLines(kimchi,kimchi.servings)),kimchi.ingredients_text.split(/\n+/));assert.deepEqual(Array.from(ctx.creatorPortionIngredientLines(kimchi,-1)),kimchi.ingredients_text.split(/\n+/));
assert.equal(data.recipes.filter(r=>r.portion_lines).length,7);
for(const r of data.recipes){ctx.renderPublicRecipe(r,false);const label=nodes.get('recipeNutritionNotice').children.find(x=>x.tag==='label');assert.equal(!!label,!!r.portion_lines);if(!label)continue;const select=label.children[0];const original=nodes.get('recipeIngredients').children.map(x=>x.textContent);select.value='1';select.onchange();assert.equal(r.selected_servings,1);assert.deepEqual(nodes.get('recipeIngredients').children.map(x=>x.textContent),Array.from(ctx.creatorPortionIngredientLines(r,1)));ctx.renderPublicRecipe(r,false);assert.deepEqual(nodes.get('recipeIngredients').children.map(x=>x.textContent),Array.from(ctx.creatorPortionIngredientLines(r,1)));r.selected_servings=r.servings;ctx.renderPublicRecipe(r,false);assert.deepEqual(nodes.get('recipeIngredients').children.map(x=>x.textContent),original);}
for(const tag of ['카레','잔치국수']){const r=data.recipes.find(r=>r.tags[0]===tag);assert(r.servings);assert(!r.portion_lines);assert(r.portion_notice.includes('전체 조리 분량'));}
const bibim=data.recipes.find(r=>r.tags[0]==='비빔밥');assert(ctx.creatorPortionIngredientLines(bibim,2).includes('계란: 2개'));assert(ctx.creatorPortionIngredientLines(bibim,2).some(s=>s.includes('김가루')&&s.includes('직접 조절')));assert(bibim.steps.ko.some(s=>s.includes('1000W')));
console.log('PASS 7 portion selectors: grams, kg, ml, count units, unknown amounts, 100-to-1 conversion, original restoration, selected state, mixed bases held');
