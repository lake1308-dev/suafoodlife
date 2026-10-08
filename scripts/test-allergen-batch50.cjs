const fs=require('fs'),vm=require('vm'),assert=require('assert');
const data=JSON.parse(fs.readFileSync('data/products-allergen-50-20261008.json'));
const products=data.products,app=fs.readFileSync('app.js','utf8');
assert.equal(products.length,50);assert.equal(new Set(products.map(x=>x.id)).size,50);
assert.equal(products.filter(x=>x.allergen_info.contains_status==='confirmed').length,43);
assert.equal(products.filter(x=>x.allergen_info.cross_contact_status==='confirmed').length,22);
for(const p of products){if(!['kurly_label_1000244528','kurly_label_1001453756','kurly_label_1000244534'].includes(p.id))assert(Object.values(p.nutrition_per_100g).every(x=>x===null));assert(p.allergen_info.source_url.startsWith('https://'));assert.equal(p.allergen_info.checked_on,'2026-10-08');}
const roasting=products.find(x=>x.id==='kurly_label_5060444');assert(roasting.allergen_info.contains.includes('땅콩'));assert(!roasting.allergen_info.contains.includes('우유'));assert(roasting.allergen_info.cross_contact.includes('우유'));
assert(roasting.allergen_info.cross_contact.includes('메밀'));assert(!roasting.allergen_info.cross_contact.includes('밀'));
const held=products.find(x=>x.id==='kurly_label_5095163');assert.equal(held.allergen_info.contains.length,0);assert(held.allergen_info.review_note.includes('오기'));
const facilityOnly=products.find(x=>x.id==='kurly_label_1000357125');assert.equal(facilityOnly.allergen_info.contains.length,0);assert(facilityOnly.allergen_info.cross_contact.includes('땅콩'));
const elements={};function element(){return{children:[],textContent:'',append(...x){this.children.push(...x)},classList:{toggle(){}}}}
const context=vm.createContext({document:{createElement:element},lang:'ko',tr:(a,b)=>b,ALLERGEN_NAMES_EN:{},$:id=>elements[id]||(elements[id]=element())});
vm.runInContext(app.slice(app.indexOf('function setFoodAdviceMode'),app.indexOf('function renderPeanutTips')),context);
vm.runInContext('function appendAllergenGuide(){}',context);
vm.runInContext(app.slice(app.indexOf('function renderProductAllergenReview'),app.indexOf('function renderAllergy')),context);
function texts(n){return[n.textContent,...n.children.flatMap(texts)].filter(Boolean).join(' ')}
for(const p of products){elements.allergyContent=element();context.p=p;vm.runInContext('renderProductAllergenReview(p,p.allergen_info)',context);const text=texts(elements.allergyContent);assert(text.includes(p.names.ko));assert(text.includes('栄')===false);if(!p.allergen_info.contains.length)assert(text.includes('함유 정보 미확인'));if(!p.allergen_info.cross_contact.length)assert(text.includes('미확인 · 실제 포장'));}
console.log('PASS 50 product reviews: 43 confirmed declarations, 7 held, 22 cross-contact notices; facility-only and source typo remain unverified; 47 unknown nutrition records stay null; 3 official nutrition records filled.');

const milk=products.find(p=>p.id==='kurly_label_1001453756');assert.equal(milk.sources[0].basis,'100ml');assert.equal(milk.nutrition_per_100g.kcal,65);assert.equal(milk.allergen_info.contains_status,'unverified');
const coleslaw=products.find(p=>p.id==='kurly_label_1000244528');assert.deepEqual(coleslaw.allergen_info.contains,['알류','우유','대두']);assert.equal(coleslaw.nutrition_per_100g.kcal,515);

const oriental=products.find(p=>p.id==='kurly_label_1000244534');assert.deepEqual(oriental.allergen_info.contains,['대두','밀']);assert.equal(oriental.nutrition_per_100g.sodium_mg,1100);assert(oriental.allergen_info.cross_contact.includes('아황산류'));
