const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(require('zlib').gunzipSync(fs.readFileSync('data/recipes-epis-master-20261014.json.gz')));
assert.equal(data.recipes.length,154);assert.equal(new Set(data.recipes.map(r=>r.id)).size,154);
const nodes=new Map();function el(){return {children:[],classList:{add(){},remove(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},after(){},scrollIntoView(){}}}
['recipe','recipeName','recipeMeta','recipeIngredients','recipeSteps','recipeNutritionNotice'].forEach(id=>nodes.set(id,el()));
const ctx={currentDish:null,$:id=>nodes.get(id),document:{getElementById:id=>nodes.get(id),createElement:()=>el()}};
vm.createContext(ctx);const app=fs.readFileSync('app.js','utf8');vm.runInContext(app.slice(app.indexOf('function creatorPortionIngredientLines('),app.indexOf('function renderDBRecipe(')),ctx);
for(const r of data.recipes){assert(r.ingredients_text&&r.steps.ko.length);assert.equal(r.servings,null);assert.equal(r.ingredients.length,0);assert(!['epis_498','epis_359','epis_316','epis_275','epis_176'].includes(r.id));ctx.r=r;vm.runInContext('renderPublicRecipe(r,false)',ctx);assert.equal(nodes.get('recipeSteps').children.length,r.steps.ko.length);assert.equal(nodes.get('recipeName').textContent,r.names.ko);assert(nodes.get('recipeNutritionNotice').children.some(x=>x.href===r.source.url));}
const fake={...data.recipes[0],names:{ko:'<img onerror=alert(1)>'},ingredients_text:'<script>bad</script>'};ctx.r=fake;vm.runInContext('renderPublicRecipe(r,false)',ctx);assert.equal(nodes.get('recipeIngredients').children[0].textContent,fake.ingredients_text);
console.log('PASS all 154 EPIS master recipes render text, ingredients, ordered steps and attribution; no guessed servings; markup stays text');

const north=data.recipes.find(r=>r.names.ko==='북어국');assert.equal(north.steps.ko.length,7);assert(north.steps.ko[2].includes('0.3cm'));assert(data.recipes.every(r=>r.steps.ko.every(s=>s.trim()&&s!=='•')));

assert.equal(data.recipes.find(r=>r.id==='epis_master_342').steps.ko.length,5);assert.equal(data.recipes.find(r=>r.id==='epis_master_360').steps.ko.length,6);assert(!data.recipes.some(r=>['epis_master_316','epis_master_373'].includes(r.id)));
