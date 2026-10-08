const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync('data/recipes-public-20261008.json'));
assert.equal(data.recipes.length,1150);assert.equal(new Set(data.recipes.map(r=>r.id)).size,1150);
const nodes=new Map();function el(){return {children:[],classList:{add(){},remove(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},after(){},scrollIntoView(){}}}
['recipe','recipeName','recipeMeta','recipeIngredients','recipeSteps','recipeNutritionNotice'].forEach(id=>nodes.set(id,el()));
const ctx={currentDish:null,$:id=>nodes.get(id),document:{getElementById:id=>nodes.get(id),createElement:()=>el()}};
vm.createContext(ctx);const app=fs.readFileSync('app.js','utf8');vm.runInContext(app.slice(app.indexOf('function renderPublicRecipe('),app.indexOf('function renderDBRecipe(')),ctx);
for(const r of data.recipes){assert(r.ingredients_text&&r.steps.ko.length);assert.equal(r.servings,null);assert.equal(r.ingredients.length,0);ctx.r=r;vm.runInContext('renderPublicRecipe(r,false)',ctx);assert.equal(nodes.get('recipeSteps').children.length,r.steps.ko.length);assert.equal(nodes.get('recipeName').textContent,r.names.ko);assert(nodes.get('recipeNutritionNotice').children.some(x=>x.href===r.source.url));}
const fake={...data.recipes[0],names:{ko:'<img onerror=alert(1)>'},ingredients_text:'<script>bad</script>'};ctx.r=fake;vm.runInContext('renderPublicRecipe(r,false)',ctx);assert.equal(nodes.get('recipeIngredients').children[0].textContent,fake.ingredients_text);
console.log('PASS all 1150 public recipes render text, ingredients, ordered steps and attribution; no guessed servings; markup stays text');
