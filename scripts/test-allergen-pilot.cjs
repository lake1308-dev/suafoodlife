const fs=require('fs'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8'),products=JSON.parse(fs.readFileSync('data/products-curated.json')).products,recipes=JSON.parse(fs.readFileSync('data/recipes.json')).recipes;
const pilot=products.filter(x=>x.allergen_info?.basis==='product_label_review');assert.equal(pilot.length,5);
const elements={};function element(){return {children:[],textContent:'',append(...x){this.children.push(...x)},classList:{toggle(){}}}}
const context=vm.createContext({document:{createElement:element,querySelector:s=>({value:amounts[Number(s.match(/\d+/)[0])]})},elements,products,recipes,lang:'ko',tr:(en,ko)=>ko,ALLERGEN_NAMES_EN:{},ALLERGEN_SOURCE_URL:'https://www.foodsafetykorea.go.kr/',getIngredient:id=>products.find(x=>x.id===id),canonicalIngredientId:id=>id,dbIngredientName:id=>id,$:id=>elements[id]||(elements[id]=element())});let amounts=[];
vm.runInContext(app.slice(app.indexOf('const INGREDIENT_ALLERGENS='),app.indexOf('function appendAllergenGuide')),context);
vm.runInContext(app.slice(app.indexOf('function recipeAllergenSummary'),app.indexOf('function updateRecipeAllergens')),context);
vm.runInContext(app.slice(app.indexOf('function setFoodAdviceMode'),app.indexOf('function renderPeanutTips')),context);
vm.runInContext('function appendAllergenGuide(){}',context);
vm.runInContext(app.slice(app.indexOf('function renderProductAllergenReview'),app.indexOf('function renderAllergy')),context);
function texts(n){return [n.textContent,...n.children.flatMap(texts)].filter(Boolean)}
for(const p of pilot){context.p=p;elements.allergyContent=element();vm.runInContext('renderProductAllergenReview(p,p.allergen_info)',context);const t=texts(elements.allergyContent).join(' ');assert(t.includes(p.names.ko));assert(t.includes('実')===false);if(p.id==='chilsung_cider_250ml'){assert(t.includes('함유 정보 미확인'));assert(!p.allergen_info.contains.includes('우유'));assert(t.includes('같은 제조시설 안내'));}if(p.id==='seoul_milk_na100_1l_label')assert(t.includes('전체 표시 추가 확인'));}
const egg=recipes.find(x=>x.id==='egg_fried_rice_reference');amounts=egg.ingredients.map(x=>x.amount);context.r=egg;
let result=vm.runInContext('recipeAllergenSummary(r)',context);assert(result.contains.includes('알류'));assert(result.unchecked.includes('soy_sauce_kr'));
amounts[1]=0;result=vm.runInContext('recipeAllergenSummary(r)',context);assert(!result.contains.includes('알류'));amounts[1]=50;assert(vm.runInContext('recipeAllergenSummary(r)',context).contains.includes('알류'));
assert.equal(recipes.filter(x=>['dakbokkeumtang_reference','doenjang_jjigae','kimchi_jjigae','bibimbap','egg_fried_rice_reference'].includes(x.id)&&x.example_recipe).length,5);
console.log('PASS 5 product reviews, separate facility/contains, unknown labels, 5 reference recipes; egg removal and restoration.');
