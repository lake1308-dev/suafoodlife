const fs=require('fs'),assert=require('assert');
const d=JSON.parse(fs.readFileSync('data/recipes-creator-20261008.json'));
const audit=JSON.parse(fs.readFileSync('data/recipes-completion-review-20261011.json'));
const byName=n=>d.recipes.find(r=>r.tags[0]===n);
assert.equal(audit.video_reviews.length,32);assert.equal(audit.video_reviews.filter(v=>v.status==='added').length,29);
assert.equal(audit.items.length,54);assert.equal(audit.video_reviews.filter(v=>v.status==='held').length,3);
assert.equal(audit.items.reduce((n,x)=>n+(d.recipes.find(r=>r.id===x.recipe_id).preparations?.length||0),0),22);
for(const item of audit.items){const r=d.recipes.find(r=>r.id===item.recipe_id);assert(r);assert.equal(r.source.description_sha256,item.source_description_sha256);assert.equal(r.source.url,item.source_url);assert.equal(r.servings,item.servings);assert.equal(r.nutrition_status,'not_calculated');assert(!r.nutrition_reference);assert.equal(r.source.retrieved_on,'2026-10-11');}
assert.equal(byName('전복죽').servings,2);assert(byName('전복죽').ingredients_text.includes('*1인분 세팅 재료'));assert(!byName('전복죽').portion_lines);
assert(byName('전복죽').allergen_review.known_from_ingredients.includes('조개류(전복)'));
assert.deepEqual(byName('크림새우').allergen_review.known_from_ingredients,['새우']);assert(!byName('크림새우').ingredients_text.includes('우유'));assert(byName('크림새우').portion_notice.includes('1.8L'));
for(const n of ['후라이드치킨','양념치킨'])assert.deepEqual(byName(n).allergen_review.known_from_ingredients,['닭고기','우유']);
assert.equal(byName('빨간어묵').servings,null);assert(byName('빨간어묵').portion_notice.includes('3~4인분'));
assert(byName('누룽지백숙(냄비)').ingredients_text.includes('정수물: 1L'));assert(byName('누룽지백숙(전기밥솥)').ingredients_text.includes('540ml'));
assert.equal(byName('황태미역국').servings,4);assert(byName('황태미역국').ingredients_text.includes('불린 미역: 2컵(180g)'));
assert(!byName('콩나물찜').ingredients_text.includes('코다리'));assert(!byName('중국식볶음밥').ingredients_text.includes('새우'));
assert(byName('백순대볶음').ingredients_text.includes('대파: 1대(150g)'));assert(byName('백순대볶음').ingredients_text.includes('불린 당면: 50g'));assert(!byName('백순대볶음').allergen_review.known_from_ingredients.includes('돼지고기'));
assert(byName('고추냉이마요소스').ingredients_text.includes('진간장: 양 미표기'));assert(!byName('순대볶음'));
assert(byName('짜장떡볶이').preparations[0].amount_hint.includes('90g'));
assert(byName('멸치국수(부산·김해식)').preparations[0].amount_hint.includes('500ml'));
for(const n of ['봄동겉절이','미나리겉절이','참나물겉절이']){assert.equal(byName(n).servings,null);assert(byName(n).ingredients_text.includes('양 미표기'));}
console.log('PASS 32 reviewed sources, 54 traceable recipes, 22 preparation links; mixed servings, shellfish/egg facts, withheld cooking gaps, drained/bone weights and product uncertainties');
