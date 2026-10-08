const $=id=>document.getElementById(id);
let lang=(navigator.language||"en").toLowerCase().startsWith("ko")?"ko":"en";
let suggestionIndex=-1,suggestionsRequested=false,pendingFoodSubmit=false;
let currentKey=null,currentDish=null,returnTarget="result",currentAmount=100,lastRecipeTrigger=null;
let DB_INGREDIENTS=[],DB_ALIAS=new Map(),DB_BULK=[],DB_BULK_BY_NAME=new Map(),DB_BULK_BY_ID=new Map();
const BASIC_INGREDIENT_NAMES={apple_raw:"사과",strawberry_cultivated_raw:"딸기",peanut_dried:"땅콩",garlic_raw:"마늘",tomato_raw:"토마토",onion_raw:"양파",carrot_root_raw:"당근",banana_raw:"바나나",potato_sumi_raw:"감자",cabbage_raw:"양배추",peach_white_raw:"복숭아",korean_melon_seed_removed_raw:"참외",pineapple_raw:"파인애플",sweet_potato_raw:"고구마",green_onion_raw:"대파",kabocha_squash_raw:"단호박",chestnut_raw:"밤",pomegranate_raw:"석류",eggplant_raw:"가지",broccoli_raw:"브로콜리",asparagus_raw:"아스파라거스",lettuce_butterhead_green_raw:"상추"};
function ingredientDisplayName(x){return lang==="ko"?(BASIC_INGREDIENT_NAMES[x.id]||x.names.ko):x.names.en;}
Object.assign(BASIC_INGREDIENT_NAMES,{"milk": "우유", "egg_whole": "달걀", "walnut_raw": "호두", "pine_nut_raw": "잣", "buckwheat_grain": "메밀", "soybean_raw": "대두", "wheat_grain": "밀", "wheat_flour": "밀가루", "crab_raw": "게", "shrimp": "새우", "squid_raw": "오징어", "mackerel_raw": "고등어", "oyster_raw": "굴", "abalone_raw": "전복", "mussel_raw": "홍합"});
let DB_RECIPES=[];
let bulkLoadState="loading";
let FOOD_DETAILS={};
let FOOD_ADVICE_BATCH={};
const SOURCE_REVIEW_FLAGS=new Set(["P109-401040100-2363","P109-401040100-2365","P109-401040100-2366"]);
async function loadFoodDetails(){
 try{
 const records=await Promise.all(Array.from({length:12},async(_,i)=>{
  const res=await fetch(`data/food-details-${i+1}.json.gz?v=20261007`,{cache:"no-store"});if(!res.ok)throw new Error("Food details unavailable");
  const stream=new Blob([await res.arrayBuffer()]).stream().pipeThrough(new DecompressionStream("gzip"));
  return (await new Response(stream).json()).records||{};
 }));FOOD_DETAILS=Object.assign({},...records);
 }catch(err){console.warn("Full food details unavailable; using starter details",err);try{const res=await fetch("data/food-details.json?v=0.1.0",{cache:"no-store"});if(res.ok)FOOD_DETAILS=(await res.json()).records||{}}catch{}}

}
function foodSearchIdentity(x){const s=x.sources?.[0]||{};return JSON.stringify([normalize(x.names.ko),s.basis||"100g",s.data_type||x.category,{manufacturer:s.manufacturer??FOOD_DETAILS[s.food_code]?.manufacturer,declared_weight:s.declared_weight??FOOD_DETAILS[s.food_code]?.declared_weight},x.nutrition_per_100g])}
const SMALL_SERVING_CATEGORIES=new Set(["spice","seasoning","sweetener","oil"]);
const VERIFIED_RECIPE_IDS={egg:"egg_whole",flour:"wheat_flour",tomato:"tomato_raw",onion:"onion_raw",garlic:"garlic_raw",minced_garlic:"garlic_raw",carrot:"carrot_root_raw",green_onion:"green_onion_raw",pork_tenderloin:"pork_tenderloin_raw",pork_shoulder:"pork_shoulder_raw",rice_cooked:"cooked_white_rice"};
function canonicalIngredientId(id){return VERIFIED_RECIPE_IDS[id]||id}
function dishUsesIngredient(d,id){return d.main.some(x=>canonicalIngredientId(x)===canonicalIngredientId(id))}

const I={
 chicken:["Chicken","닭고기",165,31,0,3.6,["chicken","닭","닭고기","닭가슴살"]],
 egg:["Egg","달걀",143,13,1.1,9.5,["egg","eggs","달걀","계란"]],
 tofu:["Tofu","두부",76,8,1.9,4.8,["tofu","두부"]],
 rice:["Cooked rice","밥",130,2.7,28,0.3,["rice","밥","쌀밥","cooked rice"]],
 potato:["Potato","감자",77,2,17,0.1,["potato","potatoes","감자"]],
 sweetpotato:["Sweet potato","고구마",86,1.6,20,0.1,["sweet potato","고구마"]],
 beef:["Beef","소고기",250,26,0,15,["beef","소고기","쇠고기"]],
 pork:["Pork","돼지고기",242,27,0,14,["pork","돼지고기"]],
 salmon:["Salmon","연어",208,20,0,13,["salmon","연어"]],
 tuna:["Tuna","참치",132,29,0,1,["tuna","참치"]],
 shrimp:["Shrimp","새우",99,24,0.2,0.3,["shrimp","prawn","새우"]],
 onion:["Onion","양파",40,1.1,9.3,0.1,["onion","양파"]],
 garlic:["Garlic","마늘",149,6.4,33,0.5,["garlic","마늘"]],
 carrot:["Carrot","당근",41,0.9,10,0.2,["carrot","당근"]],
 tomato:["Tomato","토마토",18,0.9,3.9,0.2,["tomato","tomatoes","토마토"]],
 cabbage:["Cabbage","양배추",25,1.3,5.8,0.1,["cabbage","양배추"]],
 spinach:["Spinach","시금치",23,2.9,3.6,0.4,["spinach","시금치"]],
 broccoli:["Broccoli","브로콜리",34,2.8,6.6,0.4,["broccoli","브로콜리"]],
 mushroom:["Mushroom","버섯",22,3.1,3.3,0.3,["mushroom","mushrooms","버섯","양송이버섯"]],
 banana:["Banana","바나나",89,1.1,23,0.3,["banana","바나나"]],
 apple:["Apple","사과",52,0.3,14,0.2,["apple","사과"]],
 milk:["Milk","우유",61,3.2,4.8,3.3,["milk","우유"]],
 cheese:["Cheese","치즈",402,25,1.3,33,["cheese","치즈"]],
 yogurt:["Plain yogurt","플레인 요거트",61,3.5,4.7,3.3,["yogurt","yoghurt","요거트","요구르트"]],
 butter:["Butter","버터",717,0.9,0.1,81,["butter","버터"]],
 oats:["Oats","귀리",389,16.9,66,6.9,["oats","oat","귀리","오트밀"]],
 lentils:["Lentils","렌틸콩",116,9,20,0.4,["lentils","lentil","렌틸콩"]],
 chickpeas:["Chickpeas","병아리콩",164,8.9,27,2.6,["chickpeas","chickpea","병아리콩"]],
 noodles:["Noodles","면",138,4.5,25,2.1,["noodles","noodle","면","국수"]],
 flour:["Wheat flour","밀가루",364,10,76,1,["flour","wheat flour","밀가루"]],
 soy:["Soy sauce","간장",53,8.1,4.9,0.6,["soy sauce","간장"]],
 gochujang:["Gochujang","고추장",228,5,43,3,["gochujang","고추장"]],
 doenjang:["Doenjang","된장",198,12,27,6,["doenjang","된장"]]
};

const EXTRA={
 chicken:{sat:1.0,sugar:0,sodium:74,chol:85,allergy:["none","Chicken is an allergen listed in Korean labeling requirements.","닭고기는 국내 알레르기 표시 대상입니다."]},
 egg:{sat:3.1,sugar:0.4,sodium:142,chol:372,allergy:["major","Egg","달걀","Egg is a major food allergen.","달걀은 주요 식품 알레르겐입니다."]},
 tofu:{sat:0.7,sugar:0.6,sodium:7,chol:0,allergy:["major","Soy","대두","Tofu is made from soybeans.","두부는 대두로 만들어집니다."]},
 rice:{sat:0.1,sugar:0.1,sodium:1,chol:0,allergy:["none","Rice is not one of the common major food allergens.","쌀은 일반적인 주요 식품 알레르겐에 해당하지 않습니다."]},
 salmon:{sat:3.1,sugar:0,sodium:59,chol:55,allergy:["major","Fish","생선","Salmon is a fish allergen.","연어는 생선 알레르겐에 해당합니다."]},
 milk:{sat:1.9,sugar:5.1,sodium:43,chol:10,allergy:["major","Milk","우유","Milk is a major food allergen.","우유는 주요 식품 알레르겐입니다."]},
 cheese:{sat:21,sugar:0.5,sodium:621,chol:105,allergy:["major","Milk","우유","Cheese contains milk proteins.","치즈에는 우유 단백질이 포함됩니다."]},
 shrimp:{sat:0.1,sugar:0,sodium:111,chol:189,allergy:["major","Shellfish","갑각류","Shrimp is a crustacean shellfish allergen.","새우는 갑각류 알레르겐입니다."]},
 soy:{sat:0.1,sugar:0.4,sodium:5493,chol:0,allergy:["major","Soy","대두","Soy sauce contains soy and may also contain wheat depending on the product.","간장은 대두를 포함하며 제품에 따라 밀이 포함될 수 있습니다."]},
 flour:{sat:0.2,sugar:0.3,sodium:2,chol:0,allergy:["major","Wheat","밀","Wheat flour is a wheat allergen.","밀가루는 밀 알레르겐입니다."]}
};
const DISHES=[
 {id:"dak",country:"Korea",countryKo:"한국",region:"Gangwon",regionKo:"강원",type:"Stew",typeKo:"국·탕·찌개",name:"Dakbokkeumtang",nameKo:"닭볶음탕",main:["chicken","potato","onion"],desc:"Spicy braised chicken with potato and vegetables.",descKo:"닭과 감자를 매콤하게 끓이는 한국식 닭요리.",time:"45 min",ing:["Chicken 500g","Potato 2","Onion 1","Carrot 1","Gochujang 2 tbsp","Soy sauce 2 tbsp","Garlic 1 tbsp"],ingKo:["닭 500g","감자 2개","양파 1개","당근 1개","고추장 2큰술","간장 2큰술","다진 마늘 1큰술"],steps:["Cut chicken and vegetables.","Mix seasoning with water.","Simmer chicken for 15 minutes.","Add vegetables and cook until tender."],stepsKo:["닭과 채소를 썰어요.","양념에 물을 섞어요.","닭을 약 15분 끓여요.","채소를 넣고 익을 때까지 끓여요."]},
 {id:"butter",country:"India",countryKo:"인도",region:"North India",regionKo:"북인도",type:"Curry",typeKo:"커리",name:"Butter Chicken",nameKo:"버터치킨",main:["chicken","butter","tomato"],desc:"Creamy tomato curry with aromatic spices.",descKo:"토마토와 향신료가 어우러진 부드러운 치킨커리.",time:"40 min",ing:["Chicken 500g","Tomato puree 300g","Butter 30g","Cream 100ml","Garam masala","Garlic","Ginger"],ingKo:["닭 500g","토마토 퓌레 300g","버터 30g","생크림 100ml","가람마살라","마늘","생강"],steps:["Brown chicken.","Cook aromatics and spices in butter.","Add tomato and simmer.","Add chicken and cream."],stepsKo:["닭을 노릇하게 구워요.","버터에 향신료를 볶아요.","토마토를 넣고 끓여요.","닭과 생크림을 넣어요."]},
 {id:"fajita",country:"USA",countryKo:"미국",region:"Texas",regionKo:"텍사스",type:"Grill",typeKo:"구이·볶음",name:"Chicken Fajitas",nameKo:"치킨 파히타",main:["chicken","onion"],desc:"Sizzling chicken, peppers and onion for tortillas.",descKo:"닭과 파프리카·양파를 볶아 또띠아와 먹는 요리.",time:"25 min",ing:["Chicken breast 400g","Bell peppers 2","Onion 1","Lime","Cumin","Tortillas"],ingKo:["닭가슴살 400g","파프리카 2개","양파 1개","라임","큐민","또띠아"],steps:["Slice ingredients.","Season chicken.","Sear chicken.","Add vegetables and lime."],stepsKo:["재료를 썰어요.","닭에 간을 해요.","닭을 볶아요.","채소와 라임을 넣어요."]},
 {id:"mapo",country:"China",countryKo:"중국",region:"Sichuan",regionKo:"쓰촨",type:"Stir-fry",typeKo:"볶음",name:"Mapo Tofu",nameKo:"마파두부",main:["tofu"],desc:"Silky tofu in a spicy Sichuan-style sauce.",descKo:"매콤하고 감칠맛 나는 사천식 두부요리.",time:"25 min",ing:["Tofu 400g","Ground meat 150g","Doubanjiang","Garlic","Ginger"],ingKo:["두부 400g","다진 고기 150g","두반장","마늘","생강"],steps:["Brown meat.","Add aromatics and doubanjiang.","Add tofu and water.","Simmer gently."],stepsKo:["고기를 볶아요.","향신료와 두반장을 넣어요.","두부와 물을 넣어요.","부드럽게 끓여요."]},
 {id:"sundubu",country:"Korea",countryKo:"한국",region:"Seoul/Gyeonggi",regionKo:"서울·경기",type:"Stew",typeKo:"국·탕·찌개",name:"Sundubu-jjigae",nameKo:"순두부찌개",main:["tofu","egg"],desc:"Soft tofu stew with a spicy savory broth.",descKo:"순두부를 얼큰한 국물에 끓이는 한국 찌개.",time:"25 min",ing:["Soft tofu 350g","Gochugaru","Garlic","Onion","Egg 1","Stock"],ingKo:["순두부 350g","고춧가루","마늘","양파","달걀 1개","육수"],steps:["Sauté aromatics.","Add stock.","Add tofu.","Finish with egg."],stepsKo:["향신채를 볶아요.","육수를 부어요.","순두부를 넣어요.","달걀을 넣어 마무리해요."]},
 {id:"aloo",country:"India",countryKo:"인도",region:"North India",regionKo:"북인도",type:"Curry",typeKo:"커리",name:"Aloo Gobi",nameKo:"알루 고비",main:["potato"],desc:"Potato and cauliflower cooked with warming spices.",descKo:"감자와 콜리플라워를 향신료와 익히는 인도요리.",time:"35 min",ing:["Potato 3","Cauliflower","Tomato","Turmeric","Cumin"],ingKo:["감자 3개","콜리플라워","토마토","강황","큐민"],steps:["Toast spices.","Add vegetables.","Add tomato.","Cover and cook."],stepsKo:["향신료를 볶아요.","채소를 넣어요.","토마토를 넣어요.","뚜껑을 덮고 익혀요."]},
 {id:"tortilla",country:"Spain",countryKo:"스페인",region:"Nationwide",regionKo:"전국",type:"Pan-fry",typeKo:"부침·팬요리",name:"Spanish Tortilla",nameKo:"스페인식 또르띠야",main:["potato","egg","onion"],desc:"Thick potato and egg omelette.",descKo:"감자와 달걀로 만드는 도톰한 스페인식 오믈렛.",time:"35 min",ing:["Potato 3","Eggs 5","Onion 1","Olive oil","Salt"],ingKo:["감자 3개","달걀 5개","양파 1개","올리브오일","소금"],steps:["Slice potato and onion.","Cook in olive oil.","Mix with eggs.","Cook and flip."],stepsKo:["감자와 양파를 썰어요.","올리브오일에 익혀요.","달걀과 섞어요.","익히다가 뒤집어요."]},
 {id:"salmonteriyaki",country:"Japan",countryKo:"일본",region:"Nationwide",regionKo:"전국",type:"Grill",typeKo:"구이",name:"Salmon Teriyaki",nameKo:"연어 데리야키",main:["salmon","soy"],desc:"Glazed salmon with a sweet-savory soy sauce.",descKo:"달콤짭짤한 간장소스를 입힌 연어요리.",time:"20 min",ing:["Salmon 2 fillets","Soy sauce","Mirin","Sugar"],ingKo:["연어 2조각","간장","미림","설탕"],steps:["Mix sauce.","Sear salmon.","Add sauce.","Glaze until shiny."],stepsKo:["소스를 섞어요.","연어를 구워요.","소스를 넣어요.","윤기 나게 졸여요."]}
];

function tr(en,ko){return lang==="ko"?ko:en}
function normalize(s){return s.trim().toLowerCase().replace(/\s+/g," ")}
function rebuildIngredientIndex(){
 DB_ALIAS=new Map();
 DB_INGREDIENTS.forEach(x=>{
  const terms=[x.names?.ko,x.names?.en,...(x.aliases?.ko||[]),...(x.aliases?.en||[])].filter(Boolean);
  terms.forEach(t=>DB_ALIAS.set(normalize(t),x.id));
 });
 Object.entries(VERIFIED_RECIPE_IDS).forEach(([legacy,id])=>{
  if(!DB_INGREDIENTS.some(x=>x.id===id))return;
  [legacy,...(I[legacy]?.[6]||[])].forEach(term=>DB_ALIAS.set(normalize(term),id));
 });
}
async function loadRecipeDB(){
 try{
  const res=await fetch("data/recipes.json?v=0.2.3",{cache:"no-store"});
  const data=await res.json(); DB_RECIPES=data.recipes||[];
  try{const creatorRes=await fetch("data/recipes-creator-20261008.json?v=1.0.0",{cache:"no-store"});if(creatorRes.ok){const creator=await creatorRes.json();DB_RECIPES.push(...(creator.recipes||[]));}}catch(err){console.warn("Creator reference recipes unavailable.",err)}
  const publicRes=await fetch("data/recipes-public-20261008.json.gz?v=1.0.0",{cache:"no-store"});
  if(publicRes.ok){const bytes=new Uint8Array(await publicRes.arrayBuffer());const extra=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).json():JSON.parse(new TextDecoder().decode(bytes));DB_RECIPES.push(...(extra.recipes||[]));}
 }catch(err){console.warn("Recipe DB unavailable; using bundled fallback.",err)}
}
function bulkToIngredient(row,cols){
 const x=Object.fromEntries(cols.map((k,i)=>[k,row[i]]));
 const id="bulk:"+x.code;
 const basisReview=SOURCE_REVIEW_FLAGS.has(x.code);if(basisReview)["kcal","protein_g","fat_g","carbs_g","sugars_g","fiber_g","sodium_mg","cholesterol_mg","sat_fat_g"].forEach(k=>x[k]=null);
 ["kcal","protein_g","fat_g","carbs_g","sugars_g","fiber_g","sodium_mg","cholesterol_mg","sat_fat_g"].forEach(k=>{x[k]=x[k]==null||String(x[k]).trim()===""?null:Number(x[k]);if(!Number.isFinite(x[k]))x[k]=null});
 return {id,names:{ko:x.name,en:x.name},aliases:{ko:[],en:[]},category:"official_food",verification_status:"official_bulk",
  nutrition_per_100g:{kcal:x.kcal,protein_g:x.protein_g,fat_g:x.fat_g,carbs_g:x.carbs_g,sugars_g:x.sugars_g,fiber_g:x.fiber_g,sodium_mg:x.sodium_mg,cholesterol_mg:x.cholesterol_mg,sat_fat_g:x.sat_fat_g},
  _normalizedName:normalize(x.name),_compactName:compactSearch(x.name),_compactVendor:compactSearch(x.manufacturer||""),
  sources:[{review_status:basisReview?"basis_conflict":null,import_flag:x.import_flag,manufacturer:x.manufacturer,declared_weight:x.declared_weight,food_code:x.code,food_name:x.name,source:x.source,reference_date:x.reference_date,basis:x.basis,data_type:x.type}]};
}
async function loadBulkNutritionDB(){
 DB_BULK=[];DB_BULK_BY_NAME=new Map();DB_BULK_BY_ID=new Map();
 try{
  const res=await fetch("data/catalog-manifest.json?v=20261007-quality",{cache:"no-store"});if(!res.ok)throw new Error("catalog manifest unavailable");
  const manifest=await res.json();if(!Array.isArray(manifest.chunks)||!manifest.record_count)throw new Error("invalid catalogue manifest");
  try{const advice=await fetch("data/food-advice-batch-1.json?v=20261007",{cache:"no-store"});if(advice.ok){const data=await advice.json();if(data.record_count===5000&&Object.keys(data.records||{}).length===5000)FOOD_ADVICE_BATCH=data.records}}catch(err){console.warn("Food advice unavailable",err)}
  let next=0;const failures=[];
  const worker=async()=>{
   while(next<manifest.chunks.length){
    const chunk=manifest.chunks[next++];
    try{
     const response=await fetch(chunk.path+"?v=20261007-quality",{cache:"no-store"});if(!response.ok)throw new Error("catalogue chunk "+response.status);
     const buf=await response.arrayBuffer(),bytes=new Uint8Array(buf);
     const text=bytes[0]===0x1f&&bytes[1]===0x8b?await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text():new TextDecoder().decode(bytes);
     const data=JSON.parse(text);if(data.record_count!==chunk.record_count||data.rows?.length!==chunk.record_count)throw new Error("catalogue count mismatch");
     const items=data.rows.map(row=>bulkToIngredient(row,data.columns));
     for(const item of items){if(DB_BULK_BY_ID.has(item.id))throw new Error("duplicate catalogue ID");DB_BULK_BY_ID.set(item.id,item);DB_BULK_BY_NAME.set(item._normalizedName,item.id);DB_BULK.push(item)}
     const count=$("coverageCount");if(count)count.textContent=DB_BULK.length.toLocaleString(lang==="ko"?"ko-KR":"en-US");
    }catch(err){failures.push({path:chunk.path,message:err.message})}
   }
  };
  await Promise.all(Array.from({length:4},worker));
  bulkLoadState=failures.length||DB_BULK.length!==manifest.record_count?"partial":"ready";
  if(failures.length)console.warn("Some catalogue chunks failed; loaded records remain available",failures);
  if(!DB_BULK.length)throw new Error("no catalogue records loaded");
 }catch(err){bulkLoadState=DB_BULK.length?"partial":"failed";console.warn("Catalogue loading failed; starter ingredients remain available",err)}
}
async function loadIngredientDB(){
 try{
  const [baseRes,kfindRes]=await Promise.all([fetch("data/ingredients.json?v=1.2.1",{cache:"no-store"}),fetch("data/nutrition-kfind.json?v=0.1.16",{cache:"no-store"})]);
  if(!baseRes.ok)throw new Error("ingredient DB "+baseRes.status);
  const data=await baseRes.json(),base=(data.ingredients||[]).filter(x=>x.status!=="placeholder_pending_curation"),byId=new Map(base.map(x=>[x.id,x]));
  if(kfindRes.ok){
   const kfind=await kfindRes.json();
   (kfind.records||[]).forEach(r=>{
    const id=r.ingredient_id,existing=byId.get(id);
    if(existing){existing.nutrition_per_100g=r.nutrition_per_100g;existing.verification_status="verified";existing.sources=existing.sources||[];return}
    byId.set(id,{id,names:{ko:r.source_food_name,en:r.source_food_name},aliases:{ko:[],en:[]},category:"verified_food",nutrition_per_100g:r.nutrition_per_100g,verification_status:"verified",sources:[{source_key:"K-FIND",source_record_id:r.source_food_code,source_food_name:r.source_food_name,basis:"100g",source:r.source_url}]})
   })
  }else console.warn("K-FIND nutrition DB unavailable; keeping base ingredient DB.",kfindRes.status);
  try{const pr=await fetch("data/products-curated.json?v=0.1.3",{cache:"no-store"});if(pr.ok){const pd=await pr.json();(pd.products||[]).forEach(x=>byId.set(x.id,x));}}catch(err){console.warn("Curated products unavailable",err)}
  try{const res=await fetch("data/products-allergen-50-20261008.json?v=0.1.3",{cache:"no-store"});if(res.ok){const data=await res.json();(data.products||[]).forEach(x=>byId.set(x.id,x))}}catch(err){console.warn("Product allergen review batch unavailable",err)}
  try{const res=await fetch("data/products-official-labels-20261008.json?v=0.1.3",{cache:"no-store"});if(res.ok){const data=await res.json();(data.products||[]).forEach(x=>byId.set(x.id,x))}}catch(err){console.warn("Official product labels unavailable",err)}
  try{const res=await fetch("data/allergen-ingredients.json?v=0.2.0",{cache:"no-store"});if(res.ok){const data=await res.json();(data.ingredients||[]).forEach(x=>{const existing=byId.get(x.id);byId.set(x.id,{...existing,...x})})}}catch(err){console.warn("Basic allergen ingredients unavailable",err)}
  const rdaBatches=[{url:"data/rda-basic-1000.json.gz?v=20261006",count:1000},{url:"data/rda-foods-1001-2000.json.gz?v=20261006",count:1000},...Array.from({length:10},(_,i)=>({url:`data/rda-foods-2001-2500-p${i+1}.json.gz?v=20261007`,count:50})),{url:"data/rda-foods-remaining-811.json.gz?v=20261007-quality",count:811}];
  for(const {url,count} of rdaBatches){try{
   const res=await fetch(url,{cache:"no-store"});if(!res.ok)throw new Error("RDA DB "+res.status);
   const buf=new Uint8Array(await res.arrayBuffer());
   const text=buf[0]===0x1f&&buf[1]===0x8b?await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text():new TextDecoder().decode(buf);
   const data=JSON.parse(text);if(data.record_count!==count||data.ingredients?.length!==count)throw new Error("Incomplete RDA ingredient batch");
   data.ingredients.forEach(x=>{const id=data.curated_id_by_record?.[x.id]||x.id,existing=byId.get(id);byId.set(id,existing?{...x,...existing,nutrition_per_100g:x.nutrition_per_100g,sources:x.sources,allergen_info:x.allergen_info}:{...x,id})});
  }catch(err){console.warn("RDA batch unavailable; keeping other connected records.",url,err)}}
  DB_INGREDIENTS=[...byId.values()];rebuildIngredientIndex();
  Object.entries(BASIC_INGREDIENT_NAMES).forEach(([id,name])=>{if(byId.has(id))DB_ALIAS.set(normalize(name),id)});
 }catch(err){console.warn("Ingredient DB unavailable; using bundled fallback.",err)}
}
const SEARCH_GROUPS=[
 ["계란","달걀"],["소고기","쇠고기","우육"],["돼지고기","돈육"],["닭고기","계육"],["후라이","프라이"],["후라이드","프라이드"],
 ["아메리카노","아메리카노커피"],["커피","커피음료"],["라면","라멘"],
 ["김치찌개","김치 찌개"],["된장찌개","된장 찌개"],["순두부찌개","순두부 찌개"],["볶음밥","볶음 밥"],
 ["삼겹살","돼지고기 삼겹살"],["곱창","소곱창","돼지곱창"],["막창","돼지막창","소막창"],["대창","소대창"],
 ["우유","밀크"],["요거트","요구르트"],["돈까스","돈가스"],["짜장면","자장면"],["햄버거","버거"],["카레","커리"],["초밥","스시"],["쥬스","주스"],["제육","제육볶음"],["순대국","순댓국"],["닭도리탕","닭볶음탕"],["고구마","sweet potato"],["감자","potato"]
];
const SEARCH_SYNONYMS=new Map();
SEARCH_GROUPS.forEach(g=>g.forEach(x=>SEARCH_SYNONYMS.set(normalize(x),g.filter(y=>normalize(y)!==normalize(x)).map(normalize))));
const SEARCH_RELATED={"콜라":["탄산음료"],"사이다":["탄산음료"],"치킨":["닭고기"],"제육":["돼지고기볶음"]};
function compactSearch(s){return normalize(s).replace(/[\s_\-()\[\],.·]/g,"")}
function editDistance(a,b,max=2){
 if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){const cur=[i];let rowMin=i;for(let j=1;j<=b.length;j++){cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));rowMin=Math.min(rowMin,cur[j])}if(rowMin>max)return max+1;prev=cur}return prev[b.length];
}
function searchTerms(raw){
 const q=normalize(raw),terms=[q,...(SEARCH_SYNONYMS.get(q)||[]),...(SEARCH_RELATED[q]||[])];return [...new Set(terms.filter(Boolean))];
}
const SEARCH_FALSE_POSITIVES={"곱창":["곱창김"],"콜라":["콜라겐"],"사이다":["사이다비니거","사이다 비니거"]};
function prepareFoodSearch(terms){
 const primary=terms[0];return {primary,pc:compactSearch(primary),bad:(SEARCH_FALSE_POSITIVES[primary]||[]).map(normalize),plans:terms.map((q,ti)=>({q,qc:compactSearch(q),penalty:ti===0?0:(SEARCH_RELATED[primary]||[]).includes(q)?6:2})),tokens:primary.split(/\s+/).map(compactSearch).filter(Boolean)};
}
function scoreFoodName(name,terms,cachedName,cachedCompact,prepared){
 const n=cachedName??normalize(name),nc=cachedCompact??compactSearch(n),query=prepared||prepareFoodSearch(terms);let score=Infinity;
 for(const {q,qc,penalty} of query.plans){if(n===q||nc===qc)score=Math.min(score,penalty);else if(n.startsWith(q)||nc.startsWith(qc))score=Math.min(score,1+penalty);else if(n.includes(q)||nc.includes(qc))score=Math.min(score,2+penalty)}
 if(query.bad.some(x=>n.includes(x)))score+=20;
 const {primary,pc}=query;if(score<Infinity){if(n===primary||nc===pc)score-=6;else if(n.startsWith(primary+"_")||n.startsWith(primary+" ")||nc.startsWith(pc))score-=3;else if(n.includes("_"+primary)||n.includes(" "+primary))score-=1}
 return score;
}
function searchIngredients(raw,limit=20){
 const terms=searchTerms(raw);if(!terms[0])return [];const scored=[],query=prepareFoodSearch(terms);
 DB_BULK.forEach(x=>{
 let score=scoreFoodName(x.names.ko,terms,x._normalizedName,x._compactName,query);
 if(!Number.isFinite(score)){
  const vendor=x.sources?.[0]?.manufacturer??FOOD_DETAILS[x.sources?.[0]?.food_code]?.manufacturer;
  if(vendor){const name=x._compactName||compactSearch(x.names.ko),maker=x._compactVendor||compactSearch(vendor),tokens=query.tokens;if(tokens.length&&tokens.every(t=>name.includes(t)||maker.includes(t)))score=8;}
 }
 if(query.pc!=="라면"&&query.pc.endsWith("라면")&&(x.sources?.[0]?.data_type==="음식"||/(볶음밥|김밥|주먹밥|리소토)/.test(x.names.ko)))score+=4;
 if(score<Infinity)scored.push({id:x.id,name:x.names.ko,score});
});
 DB_INGREDIENTS.forEach(x=>{const names=[BASIC_INGREDIENT_NAMES[x.id],x.names?.ko,x.names?.en,...(x.aliases?.ko||[]),...(x.aliases?.en||[])].filter(Boolean);let score=Math.min(...names.map(n=>scoreFoodName(n,terms,undefined,undefined,query)));if(BASIC_INGREDIENT_NAMES[x.id]&&normalize(BASIC_INGREDIENT_NAMES[x.id])===terms[0])score=-50;if(score<Infinity)scored.push({id:x.id,name:ingredientDisplayName(x),score})});
 if(!scored.length&&compactSearch(terms[0]).length>=3){
  const q=compactSearch(terms[0]),max=q.length<=4?1:2;
  DB_BULK.forEach(x=>{const n=x._compactName||compactSearch(x.names.ko);if(n.length>=q.length-2&&n.length<=q.length+4){const head=n.slice(0,Math.min(n.length,q.length+1)),d=editDistance(q,head,max);if(d<=max)scored.push({id:x.id,name:x.names.ko,score:10+d})}});
 }
 const seen=new Set(),results=[];scored.sort((a,b)=>a.score-b.score||a.name.length-b.name.length||a.name.localeCompare(b.name,"ko"));for(const x of scored){const item=getIngredient(x.id),key=item?foodSearchIdentity(item):x.id;if(seen.has(key))continue;seen.add(key);results.push(x);if(results.length>=limit)break}return results;
}
function findIngredientExact(raw){
 const q=normalize(raw);const dbid=DB_ALIAS.get(q);if(dbid)return dbid;
 const exact=DB_BULK.filter(x=>(x._normalizedName??normalize(x.names.ko))===q);if(exact.length){if(new Set(exact.map(foodSearchIdentity)).size>1)return null;return exact[0].id}
 for(const alt of SEARCH_SYNONYMS.get(q)||[]){const a=DB_ALIAS.get(alt);if(a)return a;const matches=DB_BULK.filter(x=>(x._normalizedName??normalize(x.names.ko))===alt);if(matches.length&&new Set(matches.map(foodSearchIdentity)).size===1)return matches[0].id}
 for(const [k,v] of Object.entries(I))if(v[6].some(a=>normalize(a)===q))return k;return null;
}
function findIngredient(raw){return findIngredientExact(raw)||searchIngredients(raw,1)[0]?.id||null}
function closeIngredientSuggestions(){
 suggestionsRequested=false;pendingFoodSubmit=false;
 clearTimeout(searchTimer);suggestionIndex=-1;$("ingredientSuggestions").classList.remove("show");$("ingredientInput").setAttribute("aria-expanded","false");$("ingredientInput").removeAttribute("aria-activedescendant");
}
function renderIngredientSuggestions(raw){
 const host=$("ingredientSuggestions");if(!host)return;const q=normalize(raw);if(!q){host.innerHTML="";closeIngredientSuggestions();return}
 const list=searchIngredients(raw,12);host.innerHTML="";host.setAttribute("role","listbox");
 list.forEach(x=>{const item=getIngredient(x.id),src=item?.sources?.[0],b=document.createElement("button"),left=document.createElement("span"),title=document.createElement("strong"),meta=document.createElement("small"),right=document.createElement("small");b.type="button";b.className="ingredient-suggestion";b.id="food-option-"+x.id;b.setAttribute("role","option");b.setAttribute("aria-selected","false");left.className="ingredient-suggestion-main";title.textContent=x.name;meta.className="ingredient-suggestion-meta";const detail=src?.manufacturer!==undefined?src:FOOD_DETAILS[src?.food_code]||src||{};const type=src?.data_type==="음식"?tr("General dish · varies by preparation","일반 음식 · 조리법별 차이"):src?.data_type||(item?.verification_status==="pending"?tr("Nutrition verification pending","영양정보 확인 중"):tr("Basic ingredient","기본 재료"));const kcal=item?.nutrition_per_100g?.kcal;const status=item?.verification_status==="allergen_identity"?tr("Allergen identity checked · nutrition pending","알레르기 재료 확인 · 영양값 확인 중"):item?.verification_status==="product_label"?tr("Retailer label source","판매처 표시정보"):item?.verification_status==="verified"?tr("Official source checked","공식 출처 확인"):item?.verification_status==="official_bulk"?tr("Official nutrition dataset","공식 영양성분 자료"):tr("Nutrition verification pending","영양정보 확인 중");meta.textContent=[type,status,detail.manufacturer,detail.declared_weight].filter((v,i,a)=>v&&a.indexOf(v)===i).join(" · ")+(kcal!=null?` · ${Math.round(kcal)} kcal / ${src?.basis||"100g"}`:"");right.className="ingredient-suggestion-basis";right.textContent=src?.basis||"100g";left.append(title,meta);b.append(left,right);b.onclick=()=>{$("ingredientInput").value=x.name;closeIngredientSuggestions();renderIngredient(x.id)};host.appendChild(b)});
 suggestionIndex=-1;host.classList.toggle("show",list.length>0);$("ingredientInput").setAttribute("aria-expanded",list.length?"true":"false");$("ingredientInput").removeAttribute("aria-activedescendant");
}
function moveSuggestion(delta){const host=$("ingredientSuggestions"),items=[...host.querySelectorAll(".ingredient-suggestion")];if(!items.length)return;suggestionIndex=suggestionIndex<0?(delta<0?items.length-1:0):(suggestionIndex+delta+items.length)%items.length;items.forEach((x,i)=>{const active=i===suggestionIndex;x.classList.toggle("active",active);x.setAttribute("aria-selected",active?"true":"false")});$("ingredientInput").setAttribute("aria-activedescendant",items[suggestionIndex].id);items[suggestionIndex].scrollIntoView({block:"nearest"})}
function chooseSuggestion(){const items=[...$("ingredientSuggestions").querySelectorAll(".ingredient-suggestion")];if(suggestionIndex>=0&&items[suggestionIndex]){items[suggestionIndex].click();return true}return false}
function getIngredient(id){const canonical=canonicalIngredientId(id);return DB_INGREDIENTS.find(x=>x.id===canonical)||DB_BULK_BY_ID.get(id)||null}
function servingPresets(id){
 const x=getIngredient(id);
 if(x?.category==="nut")return [10,20,30,100];
 if(x?.sources?.[0]?.package_amount)return [100,x.sources[0].package_amount,500,1000];
 if(x && SMALL_SERVING_CATEGORIES.has(x.category)) return [1,5,10,15,30];
 return [50,100,150,200];
}
function nutritionFor(id){
 const x=getIngredient(id);
 if(x){const n=x.nutrition_per_100g||{};if(x.verification_status==="verified"&&n.kcal!=null)return n;return n}
 // Foods without connected official nutrition retain an unknown value.
 return {};
}
function applyLang(){
 document.documentElement.lang=lang;
 document.querySelectorAll("[data-en]").forEach(el=>{if(!el.classList.contains("coverage"))el.textContent=el.dataset[lang]});
 document.querySelectorAll(".quick button").forEach(b=>{const labels={chicken:["닭고기","Chicken"],egg:["달걀","Egg"],tofu:["두부","Tofu"],rice:["밥","Rice"],tomato:["토마토","Tomato"],salmon:["연어","Salmon"]};const pair=labels[b.dataset.query];if(pair)b.textContent=pair[lang==="ko"?0:1]});
 const cov=$("coverageCount");if(cov){const p=cov.closest(".coverage"),count=DB_BULK.length,status=bulkLoadState==="loading"?tr("loading","불러오는 중"):bulkLoadState==="partial"?tr("partially loaded","일부 로드"):bulkLoadState==="failed"?tr("load failed","로드 실패"):tr("loaded","로드 완료");if(p)p.innerHTML=lang==="ko"?`국내 공식 자료 기반: <span id="coverageCount">${count.toLocaleString("ko-KR")}</span>건 · ${status} · 농촌진흥청 식품·재료 ${DB_INGREDIENTS.filter(x=>x.sources?.[0]?.workbook_sheet).length.toLocaleString("ko-KR")}건`:`Korean official food database: <span id="coverageCount">${count.toLocaleString("en-US")}</span> records · ${status} · RDA foods and ingredients: ${DB_INGREDIENTS.filter(x=>x.sources?.[0]?.workbook_sheet).length.toLocaleString("en-US")}`;}
 $("langBtn").textContent=lang==="ko"?"English":"한국어";
 $("ingredientInput").placeholder=lang==="ko"?"음식명·제품명·업체명으로 검색":"Search food, product or manufacturer";
 $("recipeSearchInput").placeholder=lang==="ko"?"닭볶음탕, 한국요리, 매운 요리...":"Chicken curry, Korean, spicy...";
 $("countrySearchInput").placeholder=lang==="ko"?"베트남, 그리스, 브라질...":"Vietnam, Greece, Brazil...";
 $("ingredientInput").setAttribute("aria-label",tr("Food, product or ingredient search","음식·제품·재료 검색"));
 $("recipeSearchInput").setAttribute("aria-label",tr("Recipe search","레시피 검색"));
 $("countrySearchInput").setAttribute("aria-label",tr("Country search","나라 검색"));
 if($("ingredientSuggestions").classList.contains("show"))renderIngredientSuggestions($("ingredientInput").value);
 if($("recipeSearchResults").innerHTML.trim())recipeSearch($("recipeSearchInput").value);
 if($("countrySearchResults").innerHTML.trim())countrySearch($("countrySearchInput").value);
 renderExplorerFilters();
 if(currentKey) renderIngredient(currentKey,false,true);
 if(currentDish && !$("recipe").classList.contains("hidden")){if(currentDish.names&&currentDish.ingredients){const amounts=[...document.querySelectorAll(".recipe-amount")].map(x=>({value:x.value,previous:x.dataset.previous}));renderDBRecipe(currentDish,false);document.querySelectorAll(".recipe-amount").forEach((el,i)=>{if(amounts[i]!=null){el.value=amounts[i].value;if(amounts[i].previous)el.dataset.previous=amounts[i].previous;const removed=Number(el.value)===0;el.closest("li")?.classList.toggle("removed",removed);const btn=el.closest("li")?.querySelector(".recipe-remove");if(btn)btn.textContent=removed?tr("Restore","복원"):tr("Remove","빼기")}});updateDBRecipeNutrition()}else renderRecipe(currentDish,false)}
}
function round1(n){return Math.round(n*10)/10}
function updateNutrition(){
 if(!currentKey)return; const n=nutritionFor(currentKey); const factor=currentAmount/100;
 const basis=getIngredient(currentKey)?.sources?.[0]?.basis||"100g", amountUnit=basis==="100ml"?"ml":"g";
 const val=(x,unit)=>x==null?"—":round1(x*factor)+unit;
 $("kcalValue").textContent=n.kcal==null?"—":Math.round(n.kcal*factor);
 $("kcalBasis").textContent="kcal / "+currentAmount+amountUnit;
 $("protein").textContent=val(n.protein_g,"g");
 $("carbs").textContent=val(n.carbs_g,"g");
 $("fat").textContent=val(n.fat_g,"g");
 $("nutritionCalories").textContent=n.kcal==null?"—":Math.round(n.kcal*factor)+" kcal";
 const x={}, db=getIngredient(currentKey), dn=db?.nutrition_per_100g||{};
 $("satfat").textContent=dn.sat_fat_g!=null?val(dn.sat_fat_g,"g"):(x.sat==null?"—":round1(x.sat*factor)+"g");
 $("sugars").textContent=dn.sugars_g!=null?val(dn.sugars_g,"g"):(x.sugar==null?"—":round1(x.sugar*factor)+"g");
 $("sodium").textContent=dn.sodium_mg!=null?Math.round(dn.sodium_mg*factor)+"mg":(x.sodium==null?"—":Math.round(x.sodium*factor)+"mg");
 $("cholesterol").textContent=dn.cholesterol_mg!=null?Math.round(dn.cholesterol_mg*factor)+"mg":(x.chol==null?"—":Math.round(x.chol*factor)+"mg");
 const availability=$("nutritionAvailability");if(availability){
  const labels=[["kcal","열량","Calories"],["protein_g","단백질","Protein"],["carbs_g","탄수화물","Carbs"],["fat_g","지방","Fat"],["sat_fat_g","포화지방","Saturated fat"],["sugars_g","당류","Sugars"],["sodium_mg","나트륨","Sodium"],["cholesterol_mg","콜레스테롤","Cholesterol"]];
  const missing=labels.filter(([key])=>n[key]==null).map(([,ko,en])=>tr(en,ko));
  availability.textContent=missing.length?tr("Values unavailable in the connected source: ","연결된 자료에서 확인되지 않은 값: ")+missing.join(", ")+tr(". — is not zero. Available values remain usable; package labels can be checked for missing product values.",". —는 0이 아닙니다. 있는 값은 그대로 이용할 수 있으며, 제품은 포장 영양표시로 추가 확인할 수 있습니다."):tr("All eight displayed nutrition values are available. Values scale with your entered amount.","표시하는 영양정보 8개가 모두 연결되어 있습니다. 입력한 섭취량에 맞춰 계산됩니다.");
 }
 document.querySelectorAll(".amount-presets button").forEach(b=>b.classList.toggle("active",Number(b.dataset.grams)===currentAmount));
}
const ALLERGEN_SOURCE_URL="https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412";
const INGREDIENT_ALLERGENS={"peanut_dried": "땅콩", "tomato_raw": "토마토", "peach_white_raw": "복숭아", "chicken_breast_raw": "닭고기", "pork_belly_raw": "돼지고기", "pork_tenderloin_raw": "돼지고기", "pork_shoulder_raw": "돼지고기", "beef_hanwoo_round_grade1_raw": "쇠고기", "beef_hanwoo_brisket_grade1_raw": "쇠고기", "chicken": "닭고기", "egg": "알류", "egg_whole": "알류", "tofu": "대두", "beef": "쇠고기", "pork": "돼지고기", "shrimp": "새우", "milk": "우유", "cheese": "우유", "flour": "밀", "wheat_flour": "밀", "pork_loin": "돼지고기", "beef_rib": "쇠고기", "beef_ground": "쇠고기", "soybean_sprout": "대두", "butter": "우유", "heavy_cream": "우유", "parmesan": "우유"};
const ALLERGEN_NAMES_EN={"땅콩": "Peanut", "토마토": "Tomato", "복숭아": "Peach", "닭고기": "Chicken", "돼지고기": "Pork", "쇠고기": "Beef", "알류": "Egg", "대두": "Soybean", "새우": "Shrimp", "우유": "Milk", "밀": "Wheat", "호두":"Walnut", "잣":"Pine nut", "메밀":"Buckwheat", "게":"Crab", "오징어":"Squid", "고등어":"Mackerel", "조개류":"Shellfish"};
const BASIC_ALLERGEN_INFO={"milk": {"contains": ["우유"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "egg_whole": {"contains": ["알류"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "walnut_raw": {"contains": ["호두"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "pine_nut_raw": {"contains": ["잣"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "buckwheat_grain": {"contains": ["메밀"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "soybean_raw": {"contains": ["대두"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "wheat_grain": {"contains": ["밀"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "wheat_flour": {"contains": ["밀"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "crab_raw": {"contains": ["게"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "shrimp": {"contains": ["새우"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "squid_raw": {"contains": ["오징어"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "mackerel_raw": {"contains": ["고등어"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "oyster_raw": {"contains": ["조개류"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "abalone_raw": {"contains": ["조개류"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}, "mussel_raw": {"contains": ["조개류"], "source_url": "https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412", "checked_on": "2026-10-06", "basis": "ingredient_identity"}};
function ingredientAllergenInfo(key){const db=getIngredient(key),label=INGREDIENT_ALLERGENS[db?.id||canonicalIngredientId(key)];const starter=BASIC_ALLERGEN_INFO[canonicalIngredientId(key)];return (db?.allergen_info?.basis==="product_label_review"?db.allergen_info:null)||starter||(label?{contains:[label],source_url:ALLERGEN_SOURCE_URL,reviewed_on:"2026-10-06",basis:"ingredient_identity"}:db?.allergen_info||null)}
function appendAllergenGuide(host){
 const details=document.createElement("details"),summary=document.createElement("summary"),p=document.createElement("p"),a=document.createElement("a");
 summary.textContent=tr("Korean allergen labeling guide","국내 알레르기 표시 기준 보기");
 p.textContent=tr("Labeling covers eggs (poultry), milk, buckwheat, peanut, soybean, wheat, pine nut, walnut, crab, shrimp, squid, mackerel, shellfish (including oyster, abalone and mussel), peach, tomato, chicken, pork, beef and sulfites (at least 10 mg/kg sulfur dioxide in the final product). Foods outside this list can also cause allergies. Contained ingredients and shared-facility notices are different; check both on the product label.","국내 표시 대상은 알류(가금류), 우유, 메밀, 땅콩, 대두, 밀, 잣, 호두, 게, 새우, 오징어, 고등어, 조개류(굴·전복·홍합 포함), 복숭아, 토마토, 닭고기, 돼지고기, 쇠고기, 아황산류입니다. 아황산류는 최종제품의 이산화황이 10mg/kg 이상일 때 해당합니다. 목록 밖의 식품도 알레르기를 일으킬 수 있습니다. 함유 성분과 같은 제조시설의 혼입 가능성은 다른 정보이므로 제품 표시에서 각각 확인하세요.");
 a.href=ALLERGEN_SOURCE_URL;a.target="_blank";a.rel="noopener noreferrer";a.textContent=tr("MFDS source ↗","식약처 안내 출처 ↗");details.append(summary,p,a);host.append(details);
}
function recipeAllergenSummary(r){
 const contains=new Set(),unchecked=[];
 r.ingredients.forEach((x,i)=>{const el=document.querySelector('.recipe-amount[data-i="'+i+'"]');if(Number(el?.value??x.amount)<=0)return;const info=ingredientAllergenInfo(x.ingredient_id);if(info?.contains?.length)info.contains.forEach(v=>contains.add(v));if((!info?.contains?.length&&info?.status!=="not_listed")||["tofu","soybean_sprout"].includes(x.ingredient_id))unchecked.push(dbIngredientName(x.ingredient_id))});
 return {contains:[...contains],unchecked};
}
function updateRecipeAllergens(r){
 let box=$("recipeAllergens");if(!box){box=document.createElement("div");box.id="recipeAllergens";box.className="allergy-content";$("recipeIngredients").after(box)}box.classList.remove("hidden");box.innerHTML="";
 const info=recipeAllergenSummary(r),status=document.createElement("p"),note=document.createElement("p");status.className="allergy-status";
 const names=info.contains.map(x=>lang==="ko"?x:(ALLERGEN_NAMES_EN[x]||x));status.textContent=names.length?tr("⚠ Included ingredient allergens: ","⚠ 포함된 재료의 알레르기 유발 식품·원료: ")+names.join(" · "):tr("Allergen information needs checking","알레르기 정보 확인 필요");
 note.textContent=tr("Based on the current recipe ingredients and amounts. Removing an ingredient does not rule out cross-contact. Product labels and additional ingredients still need checking.","현재 레시피의 재료와 입력한 양을 기준으로 표시합니다. 재료를 빼도 혼입 가능성이 없어지는 것은 아닙니다. 사용 제품의 표시사항과 추가 재료를 확인하세요.");box.append(status,note);
 if(r.allergen_review_note){const p=document.createElement("p");p.textContent=r.allergen_review_note;box.append(p)}
 if(r.id==="dakbokkeumtang_reference"){const p=document.createElement("p");p.textContent=tr("Additional check: verify the allergen labels of your gochujang and soy sauce. Other versions of this dish may use different ingredients.","추가 확인: 사용하는 고추장·간장 제품의 알레르기 표시를 확인하세요. 다른 조리법이나 업소의 닭볶음탕은 재료가 다를 수 있습니다.");box.append(p)}
 if(info.unchecked.length){const p=document.createElement("p");p.textContent=tr("No connected allergen data: ","알레르기 자료 미연결 재료: ")+info.unchecked.join(", ");box.append(p)}appendAllergenGuide(box);
}
function setFoodAdviceMode(mode){
 const tips=mode==="tips",dish=mode==="dish";
 $("foodAdviceIcon").textContent=tips?"🌿":"⚠️";
 $("foodAdviceLabel").textContent=tips?tr("INGREDIENT TIPS","재료 참고정보"):tr("ALLERGY","알레르기 정보");
 $("foodAdviceTitle").textContent=tips?tr("Eating and choosing tips","먹을 때 참고할 점"):dish?tr("Allergens and ingredients","알레르기·재료 확인"):tr("Allergy information","알레르기 정보");
 $("foodAdviceNote").textContent=tips?tr("Amount examples are calculations, not a recommended serving. Check individual food allergies separately.","먹는 양 예시는 계산 참고용이며 권장량이 아닙니다. 개인별 식품 알레르기는 별도로 확인하세요."):tr("For safety, check product labels and individual medical advice.","안전을 위해 제품 표시사항과 개인별 의료 조언을 함께 확인하세요.");
 $("foodAdviceCard").classList.toggle("ingredient-tips-card",tips);
}
function appendFoodAdvice(host,title,text){const section=document.createElement("div"),h=document.createElement("h4"),p=document.createElement("p");section.className="food-advice-item";h.textContent=title;p.textContent=text;section.append(h,p);host.append(section)}
function renderPeanutTips(db){
 const host=$("allergyContent"),kcal=db?.nutrition_per_100g?.kcal;host.innerHTML="";setFoodAdviceMode("tips");
 appendFoodAdvice(host,tr("Compare the same preparation","조리 상태를 맞춰 고르기"),tr("These values are for dried peanuts. Roasted, salted or coated peanuts and peanut butter are separate foods; choose the matching record.","현재 값은 말린 땅콩 기준입니다. 볶은 땅콩·소금첨가 땅콩·코팅 땅콩·땅콩버터는 해당 항목을 따로 선택하세요."));
 appendFoodAdvice(host,tr("Amount examples","먹는 양으로 계산해 보기"),Number.isFinite(kcal)?tr(`20g: ${Math.round(kcal*0.2)} kcal · 30g: ${Math.round(kcal*0.3)} kcal. Enter your actual edible amount in the calculator.`,`20g은 ${Math.round(kcal*0.2)}kcal, 30g은 ${Math.round(kcal*0.3)}kcal입니다. 실제 먹는 땅콩의 무게를 계산기에 입력하세요.`):tr("Verified energy is not connected yet. No amount estimate is shown.","검증된 열량이 아직 연결되지 않아 먹는 양별 예상값은 표시하지 않습니다."));
 appendFoodAdvice(host,tr("When choosing a product","제품으로 먹을 때 확인하기"),tr("For peanut snacks, sauces or peanut butter, compare the product's sugar, sodium and allergen labeling. Ingredient nutrition is not the finished product's nutrition.","땅콩과자·땅콩소스·땅콩버터는 제품별 당류·나트륨·알레르기 표시를 확인하세요. 기본 땅콩의 영양값을 완성 제품의 값으로 사용하지 마세요."));
}
function isBasicFoodAdvice(db){
 return !!db&&db.verification_status!=="product_label"&&(db.category==="basic_ingredient"||Object.hasOwn(BASIC_INGREDIENT_NAMES,db.id)||["vegetable","fruit"].includes(db.category));
}
function renderBasicFoodTips(db){
 const host=$("allergyContent"),source=db.sources?.[0]||{},kcal=db.nutrition_per_100g?.kcal;
 host.innerHTML="";setFoodAdviceMode("tips");
 const original=source.source_food_name||db.names.ko;
 appendFoodAdvice(host,tr("Match the selected food","선택한 재료의 상태 확인"),tr(`Selected record: ${original}. Match variety and preparation such as raw, dried or cooked to the food you eat.`, `현재 선택한 자료는 ‘${original}’입니다. 생것·말린 것·삶은 것 등 조리 상태와 품종을 실제 먹는 재료에 맞춰 선택하세요.`));
 const basis=source.basis||"100g",isMass=!/ml/i.test(basis);
 appendFoodAdvice(host,tr("Calculate the edible amount","먹는 부분의 무게로 계산"),isMass&&Number.isFinite(kcal)?tr(`50g: ${Math.round(kcal*0.5)} kcal · 100g: ${Math.round(kcal)} kcal. Remove discarded parts before weighing; these are calculation examples, not serving recommendations.`,`50g은 ${Math.round(kcal*0.5)}kcal, 100g은 ${Math.round(kcal)}kcal입니다. 껍질·씨·뼈 등 먹지 않는 부분을 제외한 무게를 입력하세요. 예시 무게는 권장 섭취량이 아닙니다.`):tr("Use the amount and unit shown in the calculator. Unconnected nutrient values remain blank.","계산기에 표시된 기준 단위와 섭취량을 확인하세요. 아직 연결되지 않은 영양값은 빈칸으로 표시됩니다."));
 appendFoodAdvice(host,tr("When prepared with other ingredients","양념하거나 제품으로 먹을 때"),tr("Added sugar, salt, oil and sauces change nutrition. Choose the matching product or calculate its recipe; check allergen labeling for the actual ingredients.","설탕·소금·기름·소스를 더하면 영양값이 달라집니다. 가공 제품은 해당 제품을 고르고, 요리는 사용한 재료로 계산하세요. 알레르기는 실제 제품 표시와 조리 재료를 확인하세요."));
}
function isDakbokkeumtang(db){return /^(닭볶음탕|닭도리탕)$/.test(db?.names?.ko||"")&&db?.verification_status!=="product_label"&&db?.sources?.[0]?.data_type!=="가공식품"}
function renderDakFoodAdvice(){
 const host=$("allergyContent");host.innerHTML="";setFoodAdviceMode("dish");
 appendFoodAdvice(host,tr("Check the recipe you actually use","실제 조리법을 기준으로 확인"),tr("The reference recipe uses chicken, potato, onion, carrot, gochujang, soy sauce and garlic. Its chicken ingredient is an allergen source. This does not establish every restaurant or product's ingredients.","아래 참고 레시피는 닭고기·감자·양파·당근·고추장·간장·마늘을 사용합니다. 이 예시의 닭고기는 알레르기 유발 식품에 해당합니다. 모든 업소·제품의 원재료가 같다는 뜻은 아닙니다."));
 appendFoodAdvice(host,tr("Check seasoning labels","양념에서 추가로 확인"),tr("Check the allergen labels on the gochujang and soy sauce you use. Their complete allergen composition has not been verified here.","사용하는 고추장·간장의 알레르기 표시를 따로 확인하세요. 이곳에서는 해당 양념 제품의 전체 알레르기 원료를 아직 확인하지 않았습니다."));
 const recipe=DB_RECIPES.find(x=>x.id==="dakbokkeumtang_reference");if(recipe){const button=document.createElement("button");button.type="button";button.className="advice-recipe-button";button.textContent=tr("View reference recipe and ingredients →","참고 레시피·재료 확인 →");button.onclick=()=>{lastRecipeTrigger=button;returnTarget="result";renderDBRecipe(recipe)};host.append(button)}
 appendAllergenGuide(host);
}
function reviewedFoodAdvice(db){
 const src=db?.sources?.[0],record=FOOD_ADVICE_BATCH[src?.food_code];
 return record&&record.name===db.names.ko&&record.type===src.data_type&&record.basis===src.basis?record:null;
}
function renderReviewedFoodAdvice(db,record){
 const host=$("allergyContent"),product=record.type==="가공식품";host.innerHTML="";setFoodAdviceMode("dish");
 $("foodAdviceTitle").textContent=product?tr("Product label and allergens","제품 표시·알레르기 확인"):tr("Allergens and ingredients","알레르기·재료 확인");
 appendFoodAdvice(host,tr("Confirmed in the source","자료에서 확인된 내용"),tr(`The official source classifies this record as ${product?"processed food":"a dish"}. Nutrition uses ${record.basis}; allergen composition is not included.`,`공식 자료에서 ‘${record.type}’으로 분류된 항목입니다. 영양정보는 ${record.basis} 기준이며, 이 자료에는 원재료별 알레르기 정보가 포함되어 있지 않습니다.`));
 appendFoodAdvice(host,product?tr("Check the exact package","실제 제품 포장에서 확인"):tr("Check the actual recipe","실제 조리 재료로 확인"),product?tr("Match the manufacturer, product name and package size. Check its ingredients, allergen declaration and shared-facility notice; similarly named products may differ.","제조업체·제품명·포장 용량을 맞춘 뒤 원재료명, 알레르기 표시, 같은 제조시설 안내를 확인하세요. 이름이 비슷해도 제품별 원료는 다를 수 있습니다."):tr("Ingredients and sauces vary by recipe and restaurant. Ask about the actual ingredients and allergen or cross-contact information; the dish name does not establish its composition.","조리법·업소에 따라 재료와 양념이 달라집니다. 실제 사용한 재료·소스와 알레르기·혼입 안내를 확인하세요. 음식 이름만으로 포함 원료를 확정하지 않습니다."));
 appendFoodAdvice(host,tr("Verification status","알레르기 확인 상태"),tr("Allergen composition has not been verified. Missing information does not mean allergy-free.","원재료별 알레르기 정보는 아직 확인되지 않았습니다. 정보가 없다는 뜻과 알레르기가 없다는 뜻은 다릅니다."));
 appendAllergenGuide(host);
}
function renderProductAllergenReview(db,info){
 const host=$("allergyContent");host.innerHTML="";setFoodAdviceMode("dish");
 appendFoodAdvice(host,tr("Exact product reviewed","확인한 제품"),db.names.ko+" · "+info.checked_on);
 const names=info.contains.map(x=>lang==="ko"?x:(ALLERGEN_NAMES_EN[x]||x));
 appendFoodAdvice(host,tr("Contained allergens","함유 원료"),names.length?names.join(" · ")+(info.contains_status==="ingredient_identity"?tr(" (product identity; full label not verified)"," (제품 유형으로 확인 · 전체 표시 추가 확인)"):""):tr("Not verified; missing information does not mean allergy-free.","함유 정보 미확인 · 정보가 없다는 뜻과 알레르기가 없다는 뜻은 다릅니다."));
 appendFoodAdvice(host,info.cross_contact_kind==="possible_cross_contact"?tr("Possible cross-contact notice","혼입 가능성 안내"):tr("Shared manufacturing facility","같은 제조시설 안내"),info.cross_contact.length?info.cross_contact.map(x=>lang==="ko"?x:(ALLERGEN_NAMES_EN[x]||x)).join(" · ")+tr(" — separate from contained ingredients."," · 함유 원료와 별도 정보입니다."):tr("Not verified. Check the package.","미확인 · 실제 포장을 확인하세요."));
 if(info.review_note)appendFoodAdvice(host,tr("Review status","추가 확인 사항"),info.review_note);
 appendFoodAdvice(host,tr("Match the package","실제 포장과 대조하기"),tr("Applies only to this product and size, not cups, other flavors or export versions. Labels may change.","이 제품·용량에 한해 연결한 정보입니다. 컵·다른 맛·해외용 제품에는 적용하지 않습니다. 실제 포장의 최신 표시를 확인하세요."));
 const link=document.createElement("a");link.href=info.source_url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=tr("Product information source ↗","제품 표시정보 출처 ↗");host.append(link);appendAllergenGuide(host);
}
function renderAllergy(key){
 const host=$("allergyContent"),db=getIngredient(key),info=ingredientAllergenInfo(key);
 if(info?.basis==="product_label_review"){renderProductAllergenReview(db,info);return}
 if(db?.id==="peanut_dried"){renderPeanutTips(db);return}
 if(isBasicFoodAdvice(db)){renderBasicFoodTips(db);return}
 if(isDakbokkeumtang(db)){renderDakFoodAdvice();return}
 const reviewed=reviewedFoodAdvice(db);if(reviewed){renderReviewedFoodAdvice(db,reviewed);return}
 setFoodAdviceMode("allergy");
 if(info?.contains?.length){
  host.innerHTML="";const status=document.createElement("p"),note=document.createElement("p"),link=document.createElement("a");
  const names=info.contains.map(x=>lang==="ko"?x:(ALLERGEN_NAMES_EN[x]||x)).join(" · ");
  status.className="allergy-status";status.textContent=tr("⚠ Food allergen: ","⚠ 알레르기 유발 식품·원료: ")+names;
  note.textContent=tr("This ingredient contains an allergen listed by MFDS. Other allergens and shared-facility notices depend on the packaged product; check its label.","이 재료는 식약처가 안내하는 알레르기 유발 성분에 해당하거나 이를 포함합니다. 다른 알레르기 원료와 같은 제조시설 안내는 개별 제품 표시를 확인하세요.");
  link.href=info.source_url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=tr("MFDS allergen information ↗","식약처 알레르기 정보 출처 ↗");host.append(status,note,link);appendAllergenGuide(host);return;
 }
 if(info?.status==="not_listed"){
  host.innerHTML="";const status=document.createElement("p"),note=document.createElement("p");status.className="allergy-status";
  status.textContent=tr("Not among the listed ingredient allergens","재료명 기준 국내 표시 대상 목록에 해당하지 않음");
  note.textContent=tr("This is an identity comparison for an unseasoned ingredient, not an allergy-free guarantee. Other foods can cause allergies; processing, added ingredients and cross-contact need separate checks.","양념하지 않은 단일 재료의 이름을 표시 대상 목록과 대조한 결과입니다. 알레르기가 없다는 뜻은 아닙니다. 다른 식품도 알레르기를 일으킬 수 있으며 가공·첨가 원료·혼입 가능성은 별도로 확인해야 합니다.");host.append(status,note);appendAllergenGuide(host);return;
 }
 if(info?.basis==="composition_not_verified"){
  host.innerHTML="";const status=document.createElement("p"),note=document.createElement("p");status.className="allergy-status";
  status.textContent=tr("Allergen composition being verified","원재료별 알레르기 정보 확인 중");
  note.textContent=tr("Nutrition is connected, but the food name does not establish all ingredients or cross-contact. Check the specific product label or recipe. This does not mean allergy-free.","영양정보는 연결됐지만 식품명만으로 모든 원재료와 혼입 가능성을 확정할 수 없습니다. 실제 제품의 표시사항이나 조리법을 확인하세요. 알레르기가 없다는 뜻은 아닙니다.");host.append(status,note);appendAllergenGuide(host);return;
 }
 if(db?.verification_status==="official_bulk"){
  host.innerHTML="";const status=document.createElement("p"),note=document.createElement("p");status.className="allergy-status";status.textContent=tr("Allergen data not included in this nutrition dataset","이 영양성분 데이터에는 알레르기 정보가 포함되어 있지 않습니다");note.textContent=tr("This does not mean allergy-free. For packaged foods, check the label; dish ingredients vary by recipe and restaurant.","알레르기가 없다는 뜻은 아닙니다. 가공식품은 제품 표시사항을, 조리음식은 조리법·업소별 원재료를 확인하세요.");host.append(status,note);appendAllergenGuide(host);return;
 }
 host.innerHTML='<p class="allergy-status">'+tr("Information being verified","정보 확인 중")+'</p><p>'+tr("No verified allergen information is connected yet. This does not mean allergy-free.","아직 확인된 알레르기 정보가 연결되지 않았습니다. 알레르기가 없다는 뜻은 아닙니다.")+'</p>';appendAllergenGuide(host);
}

function renderIngredient(key,scroll=true,preserveAmount=false){
 if(scroll){$("ingredientFallback").classList.add("hidden");$("recipe").classList.add("hidden");$("explorer").classList.add("hidden");currentDish=null;lastRecipeTrigger=null}
 currentKey=key; const d=I[key], db=getIngredient(key);
 const presets=servingPresets(key); if(!preserveAmount)currentAmount=presets.includes(100)?100:(presets.includes(5)?5:presets[0]);
 document.querySelectorAll(".amount-presets button").forEach((b,i)=>{if(presets[i]!=null){b.style.display="";b.dataset.grams=presets[i];b.textContent=presets[i]+(db?.sources?.[0]?.basis==="100ml"?"ml":"g");b.classList.toggle("active",presets[i]===currentAmount)}else b.style.display="none"});
 $("amountInput").value=currentAmount;
 $("ingredientName").textContent=db?ingredientDisplayName(db):(lang==="ko"?d[1]:d[0]);
 const verified=(db?.verification_status==="verified"||db?.verification_status==="official_bulk"||db?.verification_status==="product_label")&&db?.nutrition_per_100g?.kcal!=null;
 const officialBasis=db?.sources?.[0]?.basis||"100g";
 const amountUnit=officialBasis==="100ml"?"ml":"g";if($("amountUnit"))$("amountUnit").textContent=amountUnit;$("amountInput").setAttribute("aria-label",lang==="ko"?`섭취량 (${amountUnit})`:`Amount (${amountUnit})`);
 $("amountBasisNote").textContent=tr(`Based on ${officialBasis}. Enter the amount you actually eat in ${amountUnit}. This is not automatically a whole pack or cup; g and ml are not interchangeable.`,`원본 ${officialBasis} 기준입니다. 실제 먹는 양을 ${amountUnit}로 입력하세요. 한 봉지·한 컵 전체로 자동 계산하지 않으며 g와 ml는 서로 환산하지 않습니다.`);
 $("ingredientNote").textContent=verified?(db?.verification_status==="official_bulk"?tr(`Official nutrition data per ${officialBasis}. Values below scale with the amount you enter.`,`공식 ${officialBasis} 기준 영양정보입니다. 아래 수치는 입력한 섭취량에 맞춰 계산됩니다.`):tr(`Verified nutrition per ${officialBasis}. Choose a dish below or browse by country.`,`검증된 ${officialBasis} 기준 영양정보입니다. 아래 요리를 고르거나 나라별로 둘러보세요.`)):tr("Nutrition data is being matched to official sources. Unverified values are not displayed.","공식 자료와 영양정보를 대조 중입니다. 검증되지 않은 수치는 표시하지 않습니다.");
 if(db?.verification_status==="official_bulk"&&db?.sources?.[0]?.data_type==="음식")$("ingredientNote").textContent+=tr(" This is general dish data, not a specific branded product. Preparation and serving size can change the values."," 일반 음식 자료이며 특정 브랜드 제품의 영양값이 아닙니다. 조리법과 섭취량에 따라 달라질 수 있습니다.");
 if(db?.verification_status==="product_label")$("ingredientNote").textContent=tr("Product information uses the source and calculation basis below. Unverified nutrients remain blank; check the actual package for changes.","제품 표시정보의 출처와 계산 기준은 아래에서 확인하세요. 미확인 영양값은 빈칸으로 남기며, 변경 여부는 실제 포장 표시를 확인하세요.");
 if(key==="peanut_dried")$("ingredientNote").textContent=tr("Dried peanuts, edible portion per 100g. Roasted, salted and coated products have different values.","말린 땅콩의 먹는 부분 100g 기준입니다. 볶음·소금첨가·코팅 제품은 영양값이 다릅니다.");
 if(db?.sources?.[0]?.workbook_sheet)$("ingredientNote").textContent=tr("Edible portion per 100g. Source preparation/variety: ","껍질·뼈 등 먹지 않는 부분을 제외한 100g 기준입니다. 원본 조리 상태·품종: ")+db.sources[0].source_food_name;
 if(db?.sources?.[0]?.review_status==="basis_conflict")$("ingredientNote").textContent=tr("The source calculation basis differs substantially from the manufacturer retail label. Nutrition calculation is on hold while the basis is reviewed.","원본 DB의 계산 기준과 본사직영 판매처 표시값에 큰 차이가 있어 기준을 재확인 중입니다. 확인 전까지 이 기록의 영양 계산을 보류합니다.");
 renderFoodSource(key);
 $("amountInput").removeAttribute("aria-invalid");$("amountError").textContent="";
 $("amountInput").value=currentAmount; updateNutrition(); renderAllergy(key);
 $("result").classList.remove("hidden");
 renderCountryCards();
 if(scroll) $("result").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderFoodSource(key){
 const host=$("foodSource");if(!host)return;const db=getIngredient(key),src=db?.sources?.[0];host.innerHTML="";
 if(!src){host.classList.add("hidden");return}host.classList.remove("hidden");
 const detail=src.manufacturer!==undefined?src:FOOD_DETAILS[src.food_code]||src;
 const rows=[[tr("Original food name","원본 식품명"),src.source_food_name||src.food_name],[tr("Manufacturer","제조·판매업체"),detail.manufacturer],[tr("Declared product weight","원본 식품중량"),detail.declared_weight],[tr("Data type","식품 유형"),src.data_type],[tr("Import status","수입 여부"),src.import_flag==="Y"?tr("Imported product (official Korean dataset)","수입제품 · 국내 공식 DB 수록"):null],[tr("Review status","검토 상태"),src.review_status==="basis_conflict"?tr("Calculation basis under review","계산 기준 재확인 중"):null],[tr("Calculation basis","계산 기준"),src.basis],[tr("Label basis","원본 표시 기준"),src.label_basis],[tr("Checked date","확인·기준일"),src.reference_date],[tr("Food code","식품코드"),src.food_code||src.source_record_id],[tr("Analysis source","분석 자료"),src.analysis_source],[tr("Source","출처"),src.source_key||src.source]].filter(x=>x[1]);
 rows.forEach(([label,value])=>{const row=document.createElement("div"),l=document.createElement("span"),v=document.createElement("strong");l.textContent=label;v.textContent=value;row.append(l,v);host.appendChild(row)});
 const sourceUrl=src.source_url||(/^https?:\/\//.test(src.source||"")?src.source:null);
 if(sourceUrl){const link=document.createElement("a");link.href=sourceUrl;link.target="_blank";link.rel="noopener noreferrer";link.textContent=db.verification_status==="product_label"?tr("View source product information ↗","제품 표시정보 출처 보기 ↗"):tr("View nutrition data source ↗","영양정보 출처 보기 ↗");host.appendChild(link)}
}
function renderDishCards(list,target){
 target.innerHTML="";
 if(!list.length){target.innerHTML='<div class="empty">'+tr("Nutrition found. Recipe links for this ingredient are being expanded now.","영양정보는 찾았습니다. 이 재료의 요리 연결은 계속 확장 중입니다.")+"</div>";return}
 list.forEach(d=>{
  const c=document.createElement("article"); c.className="dish-card";c.tabIndex=0;c.setAttribute("role","button");c.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();c.click()}});
  c.innerHTML='<span class="country">'+tr(d.country,d.countryKo)+" · "+tr(d.region,d.regionKo)+'</span><h3>'+tr(d.name,d.nameKo)+'</h3><p>'+tr(d.desc,d.descKo)+'</p><span class="open">'+tr("View recipe →","레시피 보기 →")+"</span>";
  c.onclick=()=>{lastRecipeTrigger=c;returnTarget=target.id==="exploreGrid"?"explorer":"result";renderRecipe(d)};
  target.appendChild(c);
 });
}
function renderRecipe(d,scroll=true){
 const pilot=d.id==="dak"&&DB_RECIPES.find(x=>x.id==="dakbokkeumtang_reference");if(pilot){renderDBRecipe(pilot,scroll);return}
 currentDish=d;["recipeNutritionLive","recipeNutritionNotice","recipeAllergens"].forEach(id=>$(id)?.classList.add("hidden"));$("recipe").classList.remove("hidden");$("recipeName").textContent=tr(d.name,d.nameKo);$("recipeMeta").textContent=tr("Approx. ","약 ")+d.time;
 $("recipeIngredients").innerHTML=(lang==="ko"?d.ingKo:d.ing).map(x=>"<li>"+x+"</li>").join("");
 $("recipeSteps").innerHTML=(lang==="ko"?d.stepsKo:d.steps).map(x=>"<li>"+x+"</li>").join("");
 if(scroll)$("recipe").scrollIntoView({behavior:"smooth",block:"start"});
}
let country="Korea",region="All",type="All";
const COUNTRY_META={
 Korea:["🇰🇷","한국"],USA:["🇺🇸","미국"],China:["🇨🇳","중국"],Japan:["🇯🇵","일본"],India:["🇮🇳","인도"],Italy:["🇮🇹","이탈리아"],France:["🇫🇷","프랑스"],Mexico:["🇲🇽","멕시코"],Thailand:["🇹🇭","태국"],Spain:["🇪🇸","스페인"],
 Vietnam:["🇻🇳","베트남"],Turkey:["🇹🇷","튀르키예"],Greece:["🇬🇷","그리스"],Germany:["🇩🇪","독일"],Brazil:["🇧🇷","브라질"],Indonesia:["🇮🇩","인도네시아"],Malaysia:["🇲🇾","말레이시아"],Philippines:["🇵🇭","필리핀"],Portugal:["🇵🇹","포르투갈"],Morocco:["🇲🇦","모로코"]
};
const FEATURED_COUNTRIES=["Korea","USA","China","Japan","India","Italy","France","Mexico","Thailand","Spain","Vietnam","Greece"];
const REGION_META={
 Korea:[["Seoul/Gyeonggi","서울·경기"],["Gangwon","강원"],["Chungcheong","충청"],["Gyeongsang","경상"],["Jeolla","전라"],["Jeju","제주"]],
 USA:[["Northeast","북동부"],["South","남부"],["Midwest","중서부"],["Southwest","남서부"],["West Coast","서부해안"],["Hawaii","하와이"]],
 China:[["Sichuan","쓰촨"],["Cantonese","광둥"],["Shandong","산둥"],["Jiangsu/Zhejiang","장쑤·저장"],["Hunan","후난"],["Northeast","동북"]],
 Japan:[["Hokkaido","홋카이도"],["Kanto","간토"],["Kansai","간사이"],["Chubu","주부"],["Chugoku/Shikoku","주고쿠·시코쿠"],["Kyushu/Okinawa","규슈·오키나와"]],
 India:[["North India","북인도"],["South India","남인도"],["West India","서인도"],["East India","동인도"],["Northeast India","북동인도"]],
 Italy:[["North Italy","북부"],["Central Italy","중부"],["South Italy","남부"],["Sicily/Sardinia","시칠리아·사르데냐"]],
 France:[["North/Paris","북부·파리"],["West","서부"],["East","동부"],["Southwest","남서부"],["Provence/Mediterranean","프로방스·지중해"]],
 Mexico:[["North","북부"],["Central","중부"],["Pacific","태평양 연안"],["Gulf","멕시코만"],["Oaxaca","오악사카"],["Yucatan","유카탄"]],
 Thailand:[["North","북부"],["Northeast/Isan","북동부·이산"],["Central","중부"],["South","남부"]],
 Spain:[["North","북부"],["Catalonia","카탈루냐"],["Central","중부"],["Valencia","발렌시아"],["Andalusia","안달루시아"],["Islands","도서지역"]]
};
function uniq(arr){return [...new Set(arr)]}
function filterButton(text,val,kind,active){
 const b=document.createElement("button");b.type="button";b.textContent=text;b.className=active?"active":"";b.onclick=()=>{if(kind==="region"){region=val;type="All"}if(kind==="type")type=val;renderExplorerFilters()};return b
}
function countriesForCurrent(){return FEATURED_COUNTRIES}
function renderCountryCards(){
 const host=$("countryCards"); if(!host)return; host.innerHTML="";
 if(currentKey){renderRecipeVariants(recipesForFood(getIngredient(currentKey)));return}
 [document.querySelector(".country-title"),$("countrySearchForm"),$("countrySearchResults"),host].forEach(el=>el?.classList.remove("hidden"));
 const available=countriesForCurrent().filter(c=>DISHES.some(d=>d.country===c));
 available.forEach(c=>{
  const meta=COUNTRY_META[c]||["🌍",c]; let all=DISHES.filter(d=>d.country===c && (!currentKey||dishUsesIngredient(d,currentKey)));
  if(currentKey&&!all.length)all=DISHES.filter(d=>d.country===c);
  const regions=uniq(all.map(d=>d.region)).map(r=>[r,(all.find(x=>x.region===r)||{}).regionKo||r]);
  const card=document.createElement("article");card.className="country-card";
  const head=document.createElement("div");head.className="country-head";head.tabIndex=0;head.setAttribute("role","button");head.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();head.click()}});
  head.innerHTML='<span class="flag" role="img" aria-label="'+tr(c,meta[1])+'">'+meta[0]+'</span><div><h3>'+tr(c,meta[1])+'</h3><small>'+tr("See all dishes","전체 요리 보기")+'</small></div>';
  head.onclick=()=>openCountry(c,"All");card.appendChild(head);
  const links=document.createElement("div");links.className="region-links";
  regions.slice(0,6).forEach(pair=>{const r=Array.isArray(pair)?pair[0]:pair;const ko=Array.isArray(pair)?pair[1]:r;const b=document.createElement("button");b.textContent=tr(r,ko);b.onclick=()=>openCountry(c,r);links.appendChild(b)});card.appendChild(links);
  const allLink=document.createElement("span");allLink.className="country-all";allLink.tabIndex=0;allLink.setAttribute("role","button");allLink.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();allLink.click()}});allLink.textContent=tr("All "+c+" dishes →",meta[1]+" 전체 요리 →");allLink.onclick=()=>openCountry(c,"All");card.appendChild(allLink);
  host.appendChild(card);
 });
}
function openCountry(c,r="All"){
 $("recipe").classList.add("hidden");country=c;region=r;type="All";$("explorer").classList.remove("hidden");
 const filtered=DISHES.filter(d=>d.country===c&&(!currentKey||dishUsesIngredient(d,currentKey)));
 if(currentKey&&!filtered.length){const x=getIngredient(currentKey),isBulk=x?.verification_status==="official_bulk";if(isBulk)currentKey=null}
 renderExplorerFilters();$("explorer").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderExplorerFilters(){
 const rf=$("regionFilters"),tf=$("typeFilters");rf.innerHTML=tf.innerHTML="";
 const meta=COUNTRY_META[country]||["🌍",country];$("explorerFlag").textContent=meta[0];$("explorerTitle").textContent=tr(country,meta[1]);$("explorerSubtitle").textContent=tr("Choose a region or cooking style.","지역 또는 요리방식을 선택하세요.");
 let base=DISHES.filter(d=>d.country===country && (!currentKey||dishUsesIngredient(d,currentKey)));
 if(currentKey&&!base.length){base=DISHES.filter(d=>d.country===country);$("explorerSubtitle").textContent=tr("No direct match for the searched food here, so showing all dishes from this country.","검색한 식품과 직접 연결된 요리가 없어 이 나라의 전체 요리를 보여드립니다.")}
 const validRegions=new Set(base.map(d=>d.region));if(region!=="All"&&!validRegions.has(region))region="All";
 rf.appendChild(filterButton(tr("All regions","전체 지역"),"All","region",region==="All"));(REGION_META[country]||uniq(base.map(d=>d.region)).map(r=>[r,(base.find(x=>x.region===r)||{}).regionKo||r])).forEach(pair=>{const r=pair[0],ko=pair[1];rf.appendChild(filterButton(tr(r,ko),r,"region",region===r))});
 const regionBase=region==="All"?base:base.filter(d=>d.region===region);
 const validTypes=new Set(regionBase.map(d=>d.type));if(type!=="All"&&!validTypes.has(type))type="All";
 tf.appendChild(filterButton(tr("All styles","전체 방식"),"All","type",type==="All"));uniq(regionBase.map(d=>d.type)).forEach(tp=>{const d=regionBase.find(x=>x.type===tp);tf.appendChild(filterButton(tr(tp,d.typeKo),tp,"type",type===tp))});
 let list=regionBase;if(type!=="All")list=list.filter(d=>d.type===type);renderDishCards(list,$("exploreGrid"));
}
let searchTimer=null;$("ingredientInput").addEventListener("input",e=>{suggestionsRequested=!!e.target.value.trim();pendingFoodSubmit=false;suggestionIndex=-1;clearTimeout(searchTimer);$("ingredientFallback")?.classList.add("hidden");searchTimer=setTimeout(()=>renderIngredientSuggestions(e.target.value),120)});
$("ingredientInput").addEventListener("keydown",e=>{const host=$("ingredientSuggestions");if(e.key==="Escape"){closeIngredientSuggestions()}else if(host.classList.contains("show")&&e.key==="ArrowDown"){e.preventDefault();moveSuggestion(1)}else if(host.classList.contains("show")&&e.key==="ArrowUp"){e.preventDefault();moveSuggestion(-1)}else if(host.classList.contains("show")&&e.key==="Enter"&&suggestionIndex>=0){e.preventDefault();chooseSuggestion()}});
$("searchForm").addEventListener("submit",e=>{
 e.preventDefault();clearTimeout(searchTimer);resetFoodView();const raw=$("ingredientInput").value;if(!raw.trim()){closeIngredientSuggestions();const hint=$("ingredientFallback");hint.classList.remove("hidden");hint.textContent=tr("Enter a food, product or ingredient name.","음식·제품·재료 이름을 입력해 주세요.");$("ingredientInput").focus();return}const list=searchIngredients(raw,20),k=findIngredientExact(raw);
 const first=list[0]?.id||k;
 if(first){closeIngredientSuggestions();$("ingredientFallback")?.classList.add("hidden");renderIngredient(first);return}
 closeIngredientSuggestions();$("result").classList.add("hidden");
 if(bulkLoadState==="loading"){suggestionsRequested=true;pendingFoodSubmit=true;}
 const fallback=$("ingredientFallback");if(fallback){fallback.classList.remove("hidden");fallback.textContent=bulkLoadState==="loading"?tr("Official food data is still loading. Matching results will appear when loading finishes.","공식 식품 데이터를 불러오는 중입니다. 준비가 끝나면 일치하는 검색 목록이 자동으로 표시됩니다."):bulkLoadState==="failed"?tr("The official food database could not be loaded. Verified starter ingredients are still available.","공식 식품 데이터베이스를 불러오지 못했습니다. 검증된 기본 재료 검색은 사용할 수 있습니다."):tr(`No match for “${raw}”. Try a shorter name or another common spelling.`,`“${raw}” 검색 결과가 없습니다. 더 짧은 이름이나 다른 흔한 표기로 검색해 보세요.`)}
});
document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>{const q=b.dataset.query;$("ingredientInput").value=lang==="ko"?b.textContent:q;closeIngredientSuggestions();$("ingredientFallback").classList.add("hidden");const exact=findIngredientExact(q),list=searchIngredients(q,20);if(exact){renderIngredient(exact);return}if(list.length){renderIngredient(list[0].id);return}const fallback=$("ingredientFallback");$("result").classList.add("hidden");if(fallback){fallback.classList.remove("hidden");fallback.textContent=tr("No matching food found.","일치하는 식품을 찾지 못했습니다.")}});
$("amountInput").addEventListener("input",e=>{const raw=Number(e.target.value);if(!Number.isFinite(raw)||raw<=0){e.target.setAttribute("aria-invalid","true");$("amountError").textContent=tr("Enter an amount between 1 and 5,000.","섭취량을 1~5,000 사이로 입력해 주세요.");return}e.target.removeAttribute("aria-invalid");$("amountError").textContent="";const v=Math.max(1,Math.min(5000,raw));currentAmount=v;if(v!==raw)e.target.value=v;updateNutrition()});
document.querySelectorAll(".amount-presets button").forEach(b=>b.onclick=()=>{const v=Number(b.dataset.grams);if(!Number.isFinite(v)||v<=0)return;currentAmount=v;$("amountInput").value=currentAmount;$("amountInput").removeAttribute("aria-invalid");$("amountError").textContent="";updateNutrition()});
$("langBtn").onclick=()=>{lang=lang==="ko"?"en":"ko";applyLang()};
$("exploreBtn").onclick=()=>{currentKey=null;resetFoodView();closeIngredientSuggestions();country="Korea";region="All";type="All";$("explorer").classList.remove("hidden");renderCountryCards();renderExplorerFilters();$("explorer").scrollIntoView({behavior:"smooth",block:"start"})};
$("exploreBack").onclick=()=>{$("explorer").classList.add("hidden");($("result").classList.contains("hidden")?$("searchForm"):$("countryCards"))?.scrollIntoView({behavior:"smooth",block:"start"})};
function resetFoodView(){
 currentKey=null;currentDish=null;lastRecipeTrigger=null;["result","recipe","explorer"].forEach(id=>$(id).classList.add("hidden"));
}
function countrySearch(q){
 const raw=normalize(q),host=$("countrySearchResults");host.innerHTML="";
 if(!raw){host.innerHTML='<div class="recipe-no-result">'+tr("Enter a country name.","나라 이름을 입력해 주세요.")+"</div>";$("countrySearchInput").focus();return}
 const matches=Object.entries(COUNTRY_META).map(([en,m])=>{const a=normalize(en),b=normalize(m[1]);const score=a===raw||b===raw?0:a.startsWith(raw)||b.startsWith(raw)?1:a.includes(raw)||b.includes(raw)?2:Infinity;return {en,m,score}}).filter(x=>x.score<Infinity).sort((a,b)=>a.score-b.score||a.en.localeCompare(b.en)).slice(0,8).map(x=>[x.en,x.m]);
 if(!matches.length){host.innerHTML='<div class="recipe-no-result">'+tr("Country not found yet. We are expanding worldwide coverage.","아직 등록되지 않은 나라입니다. 전 세계 국가로 계속 확장하고 있습니다.")+'</div>';return}
 matches.forEach(([en,m])=>{const d=document.createElement("div");d.className="country-result";d.tabIndex=0;d.setAttribute("role","button");d.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();d.click()}});d.innerHTML='<span>'+m[0]+'</span><b>'+tr(en,m[1])+'</b><small>'+tr("Open →","보기 →")+'</small>';d.onclick=()=>openCountry(en,"All");host.appendChild(d)})
}
$("countrySearchForm").addEventListener("submit",e=>{e.preventDefault();countrySearch($("countrySearchInput").value)});
const RECIPE_LABELS_KO={tofu:"두부",chicken:"닭고기",egg_whole:"달걀",bacon:"베이컨",basil:"바질",beef_ground:"다진 소고기",beef_rib:"소갈비",bell_pepper:"피망",black_pepper:"후추",bread_white:"식빵",butter:"버터",canola_oil:"카놀라유",chili_powder_kr:"고춧가루",cumin:"커민",doenjang:"된장",fish_cake:"어묵",garaetteok:"가래떡",ginger:"생강",gochujang:"고추장",green_chili:"풋고추",heavy_cream:"생크림",kimchi:"김치",lime:"라임",olive_oil:"올리브유",parmesan:"파르메산 치즈",pasta_dry:"건조 파스타",pork_loin:"돼지 등심",radish:"무",rice_vinegar:"쌀식초",sesame_oil:"참기름",soy_sauce_kr:"간장",soybean_sprout:"콩나물",spinach:"시금치",tapioca:"타피오카",tortilla_wheat:"밀 토르티야",udon:"우동면",wheat_flour:"밀가루",white_sugar:"설탕",zucchini:"주키니"};
function dbIngredientName(id){
 const x=getIngredient(id); if(x)return ingredientDisplayName(x);
 return lang==="ko"?(RECIPE_LABELS_KO[id]||id.replaceAll("_"," ")):id.replaceAll("_"," ");
}
function renderDBRecipeCard(r,host){
 const c=document.createElement("article");c.className="dish-card";c.tabIndex=0;c.setAttribute("role","button");c.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();c.click()}});
 const meta=[r.country,r.region].filter(Boolean).join(" · ");
 const country=document.createElement("span");country.className="country";country.textContent=meta;
 const title=document.createElement("h3");title.textContent=lang==="ko"?r.names.ko:r.names.en;
 const summary=document.createElement("p");summary.textContent=r.public_recipe?r.category_ko+" · "+(r.source_label||"식약처 레시피"):r.ingredients.slice(0,5).map(x=>dbIngredientName(x.ingredient_id)).join(" · ");
 const open=document.createElement("span");open.className="open";open.textContent=tr("View recipe →","레시피·재료 보기 →");c.append(country,title,summary,open);
 c.onclick=()=>{lastRecipeTrigger=c;returnTarget=host.id==="ingredientRecipeResults"?"result":host.id==="exploreGrid"?"explorer":"recipeSearchResults";renderDBRecipe(r)};host.appendChild(c);
}
function calculateDBRecipeNutrition(r){
 const totals={kcal:0,protein_g:0,carbs_g:0,fat_g:0,sat_fat_g:0,sugars_g:0,sodium_mg:0,cholesterol_mg:0};
 let verified=0,missing=[],missingNutrients=new Set();
 r.ingredients.forEach((line,i)=>{
  const input=document.querySelector('.recipe-amount[data-i="'+i+'"]');
  const amount=input?Math.max(0,Number(input.value)||0):line.amount;
  if(amount===0)return;
  const ing=getIngredient(line.ingredient_id), n=ing?.nutrition_per_100g;
  if(line.unit!=="g" || !ing || ing.verification_status!=="verified" || !n || !Number.isFinite(n.kcal)){missing.push(dbIngredientName(line.ingredient_id));return}
  verified++; const f=amount/100;
  Object.keys(totals).forEach(k=>{if(Number.isFinite(n[k]))totals[k]+=n[k]*f;else missingNutrients.add(k)});
 });
 if(!verified)Object.keys(totals).forEach(k=>missingNutrients.add(k));
 missingNutrients.forEach(k=>totals[k]=null);
 return {totals,verified,missing,complete:missing.length===0};
}
function updateDBRecipeNutrition(){
 const r=currentDish;if(!r||!r.ingredients||r.public_recipe)return;
 updateRecipeAllergens(r);
 const out=calculateDBRecipeNutrition(r), servings=Math.max(1,Number(r.servings)||1), t=out.totals;
 const box=document.getElementById("recipeNutritionLive");if(!box)return;
 const fmt=(v,u)=>v==null?"—":Math.round(v*10)/10+u, partial=out.verified&&!out.complete;
 const prefix=partial?tr("Verified ingredients subtotal","검증된 재료 부분합계"):tr("Calculated nutrition","계산된 영양정보");
 box.innerHTML='<strong>'+prefix+'</strong>'+
 '<div>'+tr(partial?"Verified subtotal":"Whole recipe",partial?"검증분 합계":"전체 레시피")+': '+(out.verified?Math.round(t.kcal)+" kcal":"—")+'</div>'+
 '<div>'+tr(partial?"Verified subtotal per serving":"Per serving",partial?"검증분 1인분":"1인분")+': '+(out.verified?Math.round(t.kcal/servings)+" kcal":"—")+'</div>'+
 '<div>'+tr("Protein","단백질")+': '+(out.verified?fmt(t.protein_g==null?null:t.protein_g/servings,"g"):"—")+' · '+tr("Carbs","탄수화물")+': '+(out.verified?fmt(t.carbs_g==null?null:t.carbs_g/servings,"g"):"—")+' · '+tr("Fat","지방")+': '+(out.verified?fmt(t.fat_g==null?null:t.fat_g/servings,"g"):"—")+'</div>'+
 (out.complete?'<small>'+tr("All included ingredients use verified nutrition data.","포함된 모든 재료가 검증된 영양정보를 사용합니다.")+'</small>':'<small>'+tr("Not a full-recipe total. Missing verified data: ","전체 레시피 영양값이 아닙니다. 미포함 재료: ")+out.missing.join(", ")+'</small>');
}
function renderPublicRecipe(r,scroll=true){
 currentDish=r;$("recipe").classList.remove("hidden");
 $("recipeName").textContent=r.names.ko;
 $("recipeMeta").textContent=r.category_ko+" · "+(r.source_label||"식약처 공개 레시피")+(r.source_kind==="creator_reference"?" · "+(r.servings?r.servings+"인분 (원본 기준)":"원본 인분 수 미표기"):" · "+r.category);
 $("recipeIngredients").replaceChildren();
 r.ingredients_text.split(/\n+/).forEach(line=>{const li=document.createElement("li");li.textContent=line;$("recipeIngredients").appendChild(li)});
 $("recipeSteps").replaceChildren();
 r.steps.ko.forEach(step=>{const li=document.createElement("li");li.textContent=step.replace(/^\d+\.\s*/,"");$("recipeSteps").appendChild(li)});
 ["recipeAllergens","recipeNutritionLive"].forEach(id=>document.getElementById(id)?.classList.add("hidden"));
 let note=document.getElementById("recipeNutritionNotice");if(!note){note=document.createElement("p");note.id="recipeNutritionNotice";note.className="data-note";$("recipeMeta").after(note)}
 note.classList.remove("hidden");note.replaceChildren();
 const text=document.createElement("span");text.textContent="재료와 분량은 출처의 조리 예시를 유지했습니다. 알레르기는 사용하는 재료·제품의 표시를 확인하세요. ";note.appendChild(text);
 const link=document.createElement("a");link.href=r.source.url;link.target="_blank";link.rel="noopener noreferrer";link.textContent=r.source_kind==="creator_reference"?"출처: "+r.source.name+" · 공식 영상 보기":"출처: 식품의약품안전처 · 레시피 번호 "+r.source.record_id;note.appendChild(link);
 if(r.source_kind==="creator_reference"){const editorial=document.createElement("p");editorial.textContent=r.editorial_notice+" 영양값은 아직 계산하지 않았습니다. 원본 분량을 임의로 1인분으로 환산하지 않았습니다.";note.appendChild(editorial);if(scroll)$("recipe").scrollIntoView({behavior:"smooth",block:"start"});return}
 const nutrition=document.createElement("p");const n=r.source_nutrition;const fmt=(v,u)=>Number.isFinite(v)?v+u:"미제공";
 nutrition.textContent="출처 제공 영양값: 열량 "+fmt(n.kcal," kcal")+" · 단백질 "+fmt(n.protein_g,"g")+" · 탄수화물 "+fmt(n.carbs_g,"g")+" · 지방 "+fmt(n.fat_g,"g")+" · 나트륨 "+fmt(n.sodium_mg,"mg")+". "+(r.source_weight_text?"출처 중량 표기: "+r.source_weight_text:"기준 중량이 제공되지 않아 100g 또는 1인분 값으로 환산하지 않았습니다.")+" 재료별 재계산값이 아닙니다.";note.appendChild(nutrition);
 if(scroll)$("recipe").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderDBRecipe(r,scroll=true){
 if(r.public_recipe){renderPublicRecipe(r,scroll);return}
 currentDish=r;$("recipe").classList.remove("hidden");
 $("recipeName").textContent=lang==="ko"?r.names.ko:r.names.en;
 $("recipeMeta").textContent=tr(r.country+" · "+r.region+" · "+r.servings+" servings",r.country+" · "+r.region+" · "+r.servings+"인분 · "+(r.example_recipe?"참고용 기본 예시":"표준 레시피 기준"));
 $("recipeIngredients").innerHTML=r.ingredients.map((x,i)=>'<li data-ri="'+i+'"><span>'+dbIngredientName(x.ingredient_id)+'</span> <input class="recipe-amount" data-i="'+i+'" aria-label="'+dbIngredientName(x.ingredient_id)+' '+tr("amount (","섭취량 (")+x.unit+")"+'" type="number" min="0" max="10000" step="1" inputmode="decimal" value="'+x.amount+'" style="width:78px"> '+x.unit+' <button type="button" class="recipe-remove" data-i="'+i+'">'+tr("Remove","빼기")+'</button></li>').join("");
 $("recipeSteps").innerHTML=(lang==="ko"?r.steps.ko:r.steps.en).map(x=>"<li>"+x+"</li>").join("");
 let note=document.getElementById("recipeNutritionNotice");
 if(!note){note=document.createElement("p");note.id="recipeNutritionNotice";note.className="data-note";$("recipeMeta").after(note)}
 note.classList.remove("hidden");
 note.textContent=tr("Nutrition recalculates from the amounts below. If any ingredient lacks verified data, the result is clearly shown as a verified-ingredient subtotal, not a full-recipe total.","아래 재료 양에 따라 영양정보가 다시 계산됩니다. 검증 데이터가 없는 재료가 있으면 전체 레시피 값이 아니라 검증된 재료의 부분합계로 명확히 표시합니다.");
 let live=document.getElementById("recipeNutritionLive");if(!live){live=document.createElement("div");live.id="recipeNutritionLive";live.className="recipe-nutrition-live";$("recipeIngredients").after(live)}
 live.classList.remove("hidden");
 document.querySelectorAll(".recipe-amount").forEach(el=>el.addEventListener("input",e=>{const raw=Number(e.target.value);if(!Number.isFinite(raw)||raw<0){e.target.value=0}else if(raw>10000){e.target.value=10000}const li=e.target.closest("li"),btn=li?.querySelector(".recipe-remove");if(Number(e.target.value)>0){li?.classList.remove("removed");if(btn)btn.textContent=tr("Remove","빼기")}updateDBRecipeNutrition()}));
 document.querySelectorAll(".recipe-remove").forEach(btn=>btn.onclick=()=>{const input=document.querySelector('.recipe-amount[data-i="'+btn.dataset.i+'"]'),li=btn.closest("li");if(!input)return;if(Number(input.value)>0){input.dataset.previous=input.value;input.value=0;li?.classList.add("removed");btn.textContent=tr("Restore","복원")}else{input.value=input.dataset.previous||r.ingredients[Number(btn.dataset.i)]?.amount||0;li?.classList.remove("removed");btn.textContent=tr("Remove","빼기")}updateDBRecipeNutrition()});
 updateDBRecipeNutrition();if(scroll)$("recipe").scrollIntoView({behavior:"smooth",block:"start"});
}
function recipeMatchScore(raw,fields){
 const vals=fields.filter(Boolean).map(x=>normalize(String(x)));let best=Infinity;
 vals.forEach(v=>{if(v===raw)best=Math.min(best,0);else if(v.startsWith(raw))best=Math.min(best,1);else if(v.includes(raw))best=Math.min(best,2)});
 return best
}
function recipeSearch(q){
 const raw=normalize(q),host=$("recipeSearchResults");host.innerHTML="";if(!raw){host.innerHTML='<div class="recipe-no-result">'+tr("Enter a dish name, country, or cooking style.","요리 이름, 나라 또는 요리방식을 입력해 주세요.")+"</div>";$("recipeSearchInput").focus();return}
 const db=DB_RECIPES.map(r=>({r,score:recipeMatchScore(raw,[r.names.en,r.names.ko,r.country,r.region,r.category,r.category_ko,...(r.tags||[]),...(r.tags_ko||[])])})).filter(x=>x.score<Infinity).sort((a,b)=>a.score-b.score||Number(!!b.r.verified_source)-Number(!!a.r.verified_source)||(lang==="ko"?a.r.names.ko:a.r.names.en).localeCompare(lang==="ko"?b.r.names.ko:b.r.names.en,"ko")).slice(0,18);
 if(db.length){db.forEach(x=>renderDBRecipeCard(x.r,host));return}
 const matches=DISHES.map(d=>({d,score:recipeMatchScore(raw,[d.name,d.nameKo,d.country,d.countryKo,d.region,d.regionKo,d.type,d.typeKo,d.desc,d.descKo])})).filter(x=>x.score<Infinity).sort((a,b)=>a.score-b.score||tr(a.d.name,a.d.nameKo).localeCompare(tr(b.d.name,b.d.nameKo),"ko")).slice(0,12).map(x=>x.d);
 if(!matches.length){host.innerHTML='<div class="recipe-no-result">'+tr("No matching recipe yet. Try a shorter dish name, country, region, or cooking style.","일치하는 레시피가 없습니다. 요리 이름을 짧게 쓰거나 나라·지역·요리방식으로 검색해 보세요.")+'</div>';return}
 renderDishCards(matches,host);
}
$("recipeSearchForm").addEventListener("submit",e=>{e.preventDefault();recipeSearch($("recipeSearchInput").value)});
$("recipeBack").onclick=()=>{$("recipe").classList.add("hidden");const target=$(returnTarget)||$("recipeSearchForm")||$("result");target?.scrollIntoView({behavior:"smooth",block:"start"});if(lastRecipeTrigger?.isConnected)lastRecipeTrigger.focus({preventScroll:true});else{target?.setAttribute("tabindex","-1");target?.focus({preventScroll:true})}};
applyLang();
function refreshPendingSearch(){
 if(!suggestionsRequested)return;
 const raw=$("ingredientInput").value;if(!raw.trim())return;
 if(pendingFoodSubmit){const first=searchIngredients(raw,1)[0];if(first){closeIngredientSuggestions();renderIngredient(first.id);return}}
 renderIngredientSuggestions(raw);
 const hint=$("ingredientFallback");
 if(searchIngredients(raw,1).length)hint?.classList.add("hidden");
 else if(bulkLoadState!=="loading"&&hint&&!hint.classList.contains("hidden"))hint.textContent=bulkLoadState==="failed"?tr("The official database could not load. Verified starter ingredients remain available.","공식 식품 자료를 불러오지 못했습니다. 검증된 기본 재료는 검색할 수 있습니다."):tr(`No match for “${raw}”. Try a shorter food name.`,`“${raw}” 검색 결과가 없습니다. 음식 이름을 더 짧게 입력해 보세요.`);
}
loadIngredientDB().then(()=>{
 refreshPendingSearch();
 return Promise.all([loadBulkNutritionDB().then(refreshPendingSearch),loadRecipeDB()]);
}).then(()=>{renderCountryCards();applyLang();refreshPendingSearch()});

function recipesForIngredient(id){
 return DB_RECIPES.filter(r=>r.ingredients?.some(x=>canonicalIngredientId(x.ingredient_id)===canonicalIngredientId(id)));
}
function recipesForFood(food){
 if(!food)return [];
 const name=compactSearch(food.names.ko),source=food.sources?.[0];
 if(food.verification_status==="official_bulk"&&source?.data_type!=="음식")return [];
 return DB_RECIPES.filter(r=>[r.names.ko,r.names.en,...(r.tags||[])].some(term=>{const q=compactSearch(term);return q&& (name===q||(source?.data_type==="음식"&&name.startsWith(q)))}));
}
function renderRecipeVariants(list){
 const host=$("countryCards");if(!host)return;
 const variants=list.filter(r=>r.regional_variant===true);
 const groups=new Set(variants.map(r=>r.country+"|"+r.region));
 const show=groups.size>1;
 [document.querySelector(".country-title"),$("countrySearchForm"),$("countrySearchResults"),host].forEach(el=>el?.classList.toggle("hidden",!show));
 host.innerHTML="";if(!show)return;
 variants.forEach(r=>{const button=document.createElement("button");button.type="button";button.className="country-card";const c=COUNTRY_META[r.country]?.[1]||r.country;button.textContent=tr(r.country,c)+" · "+(lang==="ko"?(r.region_ko||r.region):r.region);button.onclick=()=>{lastRecipeTrigger=button;returnTarget="result";renderDBRecipe(r)};host.appendChild(button)});
}
function renderIngredientRecipes(id){
 const host=$("ingredientRecipeResults"),hint=$("ingredientRecipeHint"),section=host?.closest(".ingredient-recipes");if(!host)return;host.innerHTML="";
 const food=getIngredient(id),dishRecipes=recipesForFood(food);
 const list=dishRecipes.length?dishRecipes:recipesForIngredient(id);
 section?.classList.toggle("hidden",!list.length);
 const heading=section?.querySelector("h2"),label=section?.querySelector(".label");
 if(heading){heading.textContent=dishRecipes.length?tr("Recipe and ingredients","레시피·재료 바로 보기"):tr("Recipes using this ingredient","이 재료로 만들 수 있는 요리");heading.dataset.en=dishRecipes.length?"Recipe and ingredients":"Recipes using this ingredient";heading.dataset.ko=dishRecipes.length?"레시피·재료 바로 보기":"이 재료로 만들 수 있는 요리";}
 if(label)label.textContent=dishRecipes.length?tr("RECIPE","레시피"):tr("COOK WITH THIS","이 재료로 요리하기");
 if(hint)hint.textContent=tr(list.length+" connected recipes. Select one to view ingredients and steps.","연결된 레시피 "+list.length+"개 · 선택하면 재료와 만드는 방법이 바로 열립니다.");
 list.slice(0,9).forEach(r=>renderDBRecipeCard(r,host));
 renderRecipeVariants(dishRecipes);
}
const _renderIngredient=renderIngredient;
renderIngredient=function(key,scroll=true,preserveAmount=false){
 _renderIngredient(key,scroll,preserveAmount);
 const x=getIngredient(key)||getIngredient(currentKey)||DB_INGREDIENTS.find(z=>z.id===key);
 if(x)renderIngredientRecipes(x.id);
};

function nutritionVerified(x){const n=x?.nutrition_per_100g||{};return Number.isFinite(n.kcal)&&Array.isArray(x?.sources)&&x.sources.length>0;}
function nutritionStatusText(x){return nutritionVerified(x)?tr("Official nutrition data connected","공식 영양정보 연결됨"):tr("Nutrition data verification pending","영양정보 검증 중");}
