const assert=require('node:assert/strict'),fs=require('node:fs');
const d=JSON.parse(fs.readFileSync('data/recipes-creator-20261008.json')),a=JSON.parse(fs.readFileSync('data/recipes-noodle-seafood-review-20261011.json'));const get=id=>d.recipes.find(r=>r.id==='paik_'+id);
assert.equal(a.added_recipe_records,18);assert.equal(a.official_video_sources,15);
for(const x of a.items){const r=d.recipes.find(r=>r.id===x.recipe_id);assert(r);assert.equal(r.nutrition_reference,undefined);assert.equal(r.source_nutrition,null);assert.equal(r.source.description_sha256,x.source_description_sha256);}
assert.deepEqual(get('gJDxWPoMHgo').allergen_review.known_from_ingredients,['땅콩','새우','알류']);assert(get('gJDxWPoMHgo').portion_notice.includes('합산하지'));
assert(get('kD9Qg139l9g').allergen_review.known_from_ingredients.includes('조개류(굴)'));assert.equal(get('kD9Qg139l9g').servings,null);
assert.deepEqual(get('Sh8kjldrKf8_egg').allergen_review.known_from_ingredients,['대두','새우','알류','오징어']);
assert(!get('cNfbDK9vIFI').ingredients_text.includes('달걀'));assert.equal(get('cNfbDK9vIFI').servings,null);
assert(!get('K55CPyYTUJI').ingredients_text.includes('굴'));assert(!get('K55CPyYTUJI').steps.ko.join('').includes('시간'));
assert(get('WGqcdDem0Vg').ingredients_text.includes('650ml'));assert(get('GlQZFTUeRoI').steps.ko.some(s=>s.includes('100ml')));assert.equal(get('nj-DjQFEZb0').servings,2);
assert(!get('qVtqpAfJNb4').ingredients_text.includes('분말'));assert(get('u8s0XK5WXuw').allergen_review.known_from_ingredients.includes('쇠고기'));
console.log('PASS 18 recipes from 15 sources: shellfish and peanut identities, shared broth allergens, mixed weights, missing quantities held, original portions and linked sauces');
