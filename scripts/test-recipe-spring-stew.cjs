const assert=require('node:assert/strict'),fs=require('node:fs');
const d=JSON.parse(fs.readFileSync('data/recipes-creator-20261008.json')),a=JSON.parse(fs.readFileSync('data/recipes-spring-stew-review-20261011.json'));const get=id=>d.recipes.find(r=>r.id==='paik_'+id);
assert.equal(a.added_recipe_records,13);assert.equal(a.reviewed_video_sources,17);assert.equal(a.video_reviews.filter(v=>!v.records_added).length,5);
for(const x of a.items){const r=d.recipes.find(r=>r.id===x.recipe_id);assert(r);assert.equal(r.nutrition_reference,undefined);assert.equal(r.source_nutrition,null);assert.equal(r.source.description_sha256,x.source_description_sha256);}
assert(get('YLd78Yqoy9I').allergen_review.known_from_ingredients.includes('게'));assert.equal(get('YLd78Yqoy9I').servings,null);
assert(get('RmZyxKOUbfs').allergen_review.known_from_ingredients.includes('알류'));assert(!get('gUYeEasWU58').allergen_review.known_from_ingredients.includes('알류'));assert(get('gUYeEasWU58').allergen_review.known_from_ingredients.includes('새우'));
assert(get('cTayVZxM0nw').allergen_review.known_from_ingredients.includes('조개류(꼬막)'));assert(!get('cTayVZxM0nw').ingredients_text.includes('양념장'));
assert.equal(get('qioLJwafP8I').servings,null);assert(get('qioLJwafP8I').steps.ko.some(s=>s.includes('기름을 빼지')));
assert.equal(get('uu8BqXy6lf4').servings,4);assert(get('uu8BqXy6lf4').ingredients_text.includes('불린 미역'));
assert.deepEqual(get('3OwIXlvjjyk').allergen_review.known_from_ingredients,['돼지고기','알류']);assert(!get('3OwIXlvjjyk').ingredients_text.includes('식초'));
assert.equal(get('llZ1ii59BVs').servings,1);assert.equal(get('llZ1ii59BVs').preparations[0].recipe_id,'paik_llZ1ii59BVs_tofu');assert(get('llZ1ii59BVs_tofu').ingredients_text.includes('10개'));assert(!get('llZ1ii59BVs').ingredients_text.includes('10개'));
console.log('PASS 13 records from 12 official videos: shellfish and crab identities, quail eggs versus fish roe, retained tuna oil, soaked seaweed weights, missing source steps held, separate tofu preparation amounts');
