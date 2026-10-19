const fs=require('fs'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync('app.js','utf8'),nodes=new Map();
function element(){return {children:[],textContent:'',value:'',classList:{toggle(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},removeAttribute(){}}}
const el=id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id)};
let food={verification_status:'verified',nutrition_per_100g:{kcal:140,protein_g:12.9,carbs_g:1.1,fat_g:8.5},sources:[{basis:'100g'}]};
const ctx={currentKey:'test',currentAmount:100,$:el,getIngredient:()=>food,nutritionFor:()=>food.nutrition_per_100g,tr:(en,ko)=>ko,document:{createElement:()=>element(),querySelectorAll:()=>[]}};vm.createContext(ctx);vm.runInContext(app.slice(app.indexOf('function round1('),app.indexOf('const ALLERGEN_SOURCE_URL=')),ctx);
ctx.updateNutrition();assert.equal(el('kcalValue').textContent,140);assert.equal(el('calorieReference').textContent,'자료 기준: 100g당 140 kcal');
ctx.currentAmount=150;ctx.updateNutrition();assert.equal(el('kcalValue').textContent,210);assert.equal(el('protein').textContent,'19.4g');assert.equal(el('calorieReference').textContent,'자료 기준: 100g당 140 kcal');assert(el('calorieSelectionLabel').textContent.includes('150g'));assert(el('nutritionAmountLabel').textContent.includes('150g'));assert.equal(el('kcalBasis').textContent,'kcal / 150g');
const products=JSON.parse(fs.readFileSync('data/products-curated.json','utf8')).products;food=products.find(x=>x.id==='chilsung_cider_250ml');assert(food);ctx.currentAmount=100;ctx.updateNutrition();ctx.renderPackagePortion(food);const button=el('packagePortion').children[0];assert(button.textContent.includes('250ml'));assert.equal(ctx.currentAmount,100,'showing pack button does not change amount');button.onclick();assert.equal(ctx.currentAmount,250);assert.equal(Number(el('kcalValue').textContent),Math.round(food.nutrition_per_100g.kcal*2.5));assert(el('calorieReference').textContent.includes('100ml'));assert(el('nutritionAmountLabel').textContent.includes('250ml'));
const official=JSON.parse(fs.readFileSync('data/products-official-labels-20261008.json','utf8')).products;food=official.find(x=>x.sources[0].declared_weight==='200g');assert(food);assert.equal(ctx.verifiedPackagePortion(food).amount,200);assert.equal(ctx.verifiedPackagePortion(food).unit,'g');
for(const candidate of [
 {...food,verification_status:'official_bulk'},
 {...food,nutrition_per_100g:{kcal:null}},
 {...food,sources:[{basis:'100g',declared_weight:'200ml'}]},
 {...food,sources:[{basis:'100g',declared_weight:'100g x 4개'}]},
 {...food,sources:[{basis:'100g',declared_weight:'5001g'}]},
 {...food,sources:[{basis:'100g',package_amount:250,package_unit:'ml'}]}
])assert.equal(ctx.verifiedPackagePortion(candidate),null);
ctx.renderPackagePortion({verification_status:'verified'});assert.equal(el('packagePortion').children.length,0,'switching to general ingredient clears old product action');
food={verification_status:'verified',nutrition_per_100g:{kcal:0},sources:[{basis:'100g'}]};ctx.currentAmount=150;ctx.updateNutrition();assert.equal(el('kcalValue').textContent,0);assert(el('calorieReference').textContent.includes('0 kcal'));
food.nutrition_per_100g.kcal=null;ctx.updateNutrition();assert.equal(el('kcalValue').textContent,'—');assert(el('calorieReference').textContent.includes('미확인'));
console.log('PASS selected amount vs fixed reference, all displayed nutrition scales, explicit product weight action, no automatic full-pack selection, no g/ml conversion, ambiguous/unverified weights hidden, zero vs unavailable.');
