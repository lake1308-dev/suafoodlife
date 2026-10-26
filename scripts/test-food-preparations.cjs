const fs=require('fs'),vm=require('vm'),zlib=require('zlib'),assert=require('assert');const app=fs.readFileSync('app.js','utf8');
class El{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attributes={}}replaceChildren(){this.children=[]}append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x)}setAttribute(k,v){this.attributes[k]=v}querySelectorAll(){return this.children.flatMap(x=>x.tag==='button'?[x]:x.querySelectorAll('button'))}focus(){this.focused=true}}
const host=new El('div'),foods=new Map();
for(const f of fs.readdirSync('data').filter(x=>/^rda-.*\.json\.gz$/.test(x))){const d=JSON.parse(zlib.gunzipSync(fs.readFileSync('data/'+f)));for(const food of d.ingredients||[])foods.set(d.curated_id_by_record?.[food.id]||food.id,food)}
for(const r of JSON.parse(fs.readFileSync('data/nutrition-kfind.json')).records)foods.set(r.ingredient_id,{id:r.ingredient_id,verification_status:'verified',sources:[{basis:'100g'}],nutrition_per_100g:r.nutrition_per_100g});
let current,selection;const ctx=vm.createContext({document:{createElement:tag=>new El(tag)},$:()=>host,getIngredient:id=>{const x=foods.get(id);return x&&{...x,id}},tr:(en,ko)=>ko,renderIngredient:(id,scroll,preserve)=>{selection={id,scroll,preserve};current=id;ctx.renderFoodPreparationChoices(ctx.getIngredient(id))}});
vm.runInContext(app.slice(app.indexOf('const FOOD_PREPARATION_GROUPS='),app.indexOf('function servingPresets(')),ctx);
for(const ids of [['egg_whole','rda:J0030000009b','rda:J0040000009m'],['chicken_breast_raw','rda:I008000D029b','rda:I008000D029g']]){
 for(const id of ids){ctx.renderFoodPreparationChoices(ctx.getIngredient(id));assert(!host.hidden);assert.equal(host.querySelectorAll().length,3);assert.equal(host.querySelectorAll().filter(x=>x.attributes['aria-pressed']==='true')[0].dataset.foodId,id);assert.equal(host.children[1].className,'food-preparation-buttons','cannot share amount-preset handlers');
 for(const target of ids){ctx.renderFoodPreparationChoices(ctx.getIngredient(id));host.querySelectorAll().find(x=>x.dataset.foodId===target).onclick();assert.deepEqual(selection,{id:target,scroll:false,preserve:true});assert(host.querySelectorAll().find(x=>x.dataset.foodId===target).focused)}
 }
}
for(const food of [null,{id:'other'},{id:'bulk:chicken'},{id:'branded_egg'}]){ctx.renderFoodPreparationChoices(food);assert(host.hidden);assert.equal(host.children.length,0)}
const backup=foods.get('rda:J0040000009m');foods.delete('rda:J0040000009m');ctx.renderFoodPreparationChoices(ctx.getIngredient('egg_whole'));assert.equal(host.querySelectorAll().length,2);foods.delete('rda:J0030000009b');ctx.renderFoodPreparationChoices(ctx.getIngredient('egg_whole'));assert(host.hidden);foods.set('rda:J0040000009m',backup);
console.log('PASS real official egg and chicken preparation choices, current selection, focus after switching, weight-preserving render request, no product/unknown leakage, missing-data fallback and separate amount controls.');
