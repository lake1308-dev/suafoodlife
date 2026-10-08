const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync('data/products-allergen-50-20261008.json'));
const products=data.products,app=fs.readFileSync('app.js','utf8');
assert.equal(products.length,50);assert.equal(new Set(products.map(x=>x.id)).size,50);
assert.equal(products.filter(x=>x.allergen_info.contains_status==='confirmed').length,41);
assert.equal(products.filter(x=>x.allergen_info.cross_contact_status==='confirmed').length,21);
for(const p of products){assert(Object.values(p.nutrition_per_100g).every(x=>x===null));assert(p.allergen_info.source_url.startsWith('https://www.kurly.com/goods/'));assert.equal(p.allergen_info.checked_on,'2026-10-08');}
const roasting=products.find(x=>x.id==='kurly_label_5060444');assert(roasting.allergen_info.contains.includes('땅콩'));assert(!roasting.allergen_info.contains.includes('우유'));assert(roasting.allergen_info.cross_contact.includes('우유'));
const held=products.find(x=>x.id==='kurly_label_5095163');assert.equal(held.allergen_info.contains.length,0);assert(held.allergen_info.review_note.includes('오기'));
const facilityOnly=products.find(x=>x.id==='kurly_label_1000357125');assert.equal(facilityOnly.allergen_info.contains.length,0);assert(facilityOnly.allergen_info.cross_contact.includes('땅콩'));
const elements={};function element(){return{children:[],textContent:'',append(...x){this.children.push(...x)},classList:{toggle(){}}}}
const context=vm.createContext({document:{createElement:element},lang:'ko',tr:(a,b)=>b,ALLERGEN_NAMES_EN:{},$:id=>elements[id]||(elements[id]=element())});
vm.runInContext(app.slice(app.indexOf('function setFoodAdviceMode'),app.indexOf('function renderPeanutTips')),context);
vm.runInContext('function appendAllergenGuide(){}',context);
vm.runInContext(app.slice(app.indexOf('function renderProductAllergenReview'),app.indexOf('function renderAllergy')),context);
function texts(n){return[n.textContent,...n.children.flatMap(texts)].filter(Boolean).join(' ')}
for(const p of products){elements.allergyContent=element();context.p=p;vm.runInContext('renderProductAllergenReview(p,p.allergen_info)',context);const text=texts(elements.allergyContent);assert(text.includes(p.names.ko));assert(text.includes('栄')===false);if(!p.allergen_info.contains.length)assert(text.includes('함유 정보 미확인'));if(!p.allergen_info.cross_contact.length)assert(text.includes('미확인 · 실제 포장'));}
console.log('PASS 50 product reviews: 41 confirmed declarations, 9 held, 21 cross-contact notices; facility-only and source typo remain unverified; unknown nutrition stays null.');
