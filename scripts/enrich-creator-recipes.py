import pathlib,json,re,math,gzip
repo=pathlib.Path(__file__).resolve().parents[1];p=repo/'data/recipes-creator-20261008.json';data=json.loads(p.read_text());rda={}
for source_path in (repo/'data').glob('rda-*.json.gz'):
 with gzip.open(source_path,'rt') as source_file:
  for record in json.load(source_file).get('ingredients',[]):rda[record['id']]=record
base=[('황설탕','rda:C0110040009a'),('물엿','rda:C0070000009a'),('진간장','rda:R0010010009a'),('참기름','rda:N0200000009a'),('통깨','rda:E0260020009n')]
maps={
'불고기':dict(base+[('쇠고기등심','rda:I027003D110a'),('양파','rda:F1320000000a'),('양파 간 것','rda:F1320000000a'),('표고버섯','rda:G027000B010a'),('대파','rda:F1910040000a'),('홍고추','rda:F018000C020a'),('다진마늘','rda:F053000B060a'),('후춧가루','rda:R0410010005a')]),
'멸치볶음':dict(base+[('중멸치','rda:K0660001153a'),('청양고추','rda:F0180080000a'),('식용유','rda:N0220000009a')])}
assumptions={'불고기':['쇠고기등심은 한우 등심 생것 자료를 사용했습니다. 등급·원산지·지방량에 따라 달라집니다.','진간장은 개량 양조간장, 통깨는 볶은 흰참깨 자료를 기준으로 계산했습니다.'], '멸치볶음':['식용유는 콩기름, 진간장은 개량 양조간장, 통깨는 볶은 흰참깨 자료를 기준으로 계산했습니다. 실제 제품이 다르면 값이 달라집니다.']}
nutrient_keys=['kcal','protein_g','carbs_g','fat_g','sodium_mg','sugars_g','sat_fat_g','cholesterol_mg'];nreviews=[]
for r in data['recipes']:
 tag=r['tags'][0]
 if tag not in maps:
  nreviews.append({'recipe_id':r['id'],'status':'held','reason':'Ingredient identity, edible weight or mixed component basis needs individual review; no complete total generated'});continue
 ingredients=[]
 for raw in r['ingredients_text'].splitlines():
  if ':' not in raw:continue
  name=raw.split(':')[0];assert name in maps[tag],(tag,name)
  m=re.search(r'(\d+(?:\.\d+)?)\s*g\b',raw);assert m,(tag,raw)
  amount=float(m[1]);src=rda[maps[tag][name]];assert src['verification_status']=='verified';assert src['sources'][0]['basis']=='100g';assert math.isfinite(src['nutrition_per_100g']['kcal'])
  ingredients.append({'ingredient':name,'amount_g':amount,'source_record_id':src['sources'][0]['source_record_id'],'source_food_name':src['names']['ko'],'source_url':src['sources'][0]['source_url'],'basis_g':100,'nutrition_per_100g':src['nutrition_per_100g']})
 assert len(ingredients)==len(maps[tag]),(tag,len(ingredients))
 totals={k:round(sum(x['nutrition_per_100g'][k]*x['amount_g']/100 for x in ingredients),6) if all(isinstance(x['nutrition_per_100g'].get(k),(int,float)) for x in ingredients) else None for k in nutrient_keys}
 r['nutrition_reference']={'status':'estimated_reference','basis':'sum_of_measured_input_ingredients','complete_for_reference_ingredients':True,'source_name':'농촌진흥청 국가표준식품성분 DB 10.4 (2026)','reviewed_on':'2026-10-08','original_servings':r['servings'],'ingredients':ingredients,'totals':totals,'assumptions':assumptions[tag],'limitations':'레시피에 적힌 재료 무게와 대표 식품성분 자료로 계산한 추정값입니다. 실제 제품·조리 중 기름과 국물의 손실·먹는 양에 따라 달라지며, 조리 후 100g 영양값은 아닙니다.'};r['nutrition_status']='estimated_reference';nreviews.append({'recipe_id':r['id'],'status':'estimated_reference','ingredient_count':len(ingredients),'kcal':totals['kcal']})
print('Nutrition reference estimates',[(r['tags'][0],r['nutrition_reference']['totals']['kcal']) for r in data['recipes'] if r.get('nutrition_reference')])
# Only explicit ingredient identities. Product flavour names and recipe titles are not evidence.
def clean(s):return re.sub(r'\s+','',s).lower()
identities={}
for allergen,names in {'알류':['달걀','계란','삶은달걀'],'쇠고기':['쇠고기등심','소고기(양지)','소고기(불고기용)'],'돼지고기':['돼지고기','간돼지고기','돼지고기(잡채용)','돼지고기뒷다리살','삼겹살'],'닭고기':['토막닭','닭다리살'],'대두':['두부','순두부','콩나물'],'밀':['밀가루','밀가루떡'],'새우':['새우젓'],'오징어':['오징어'],'우유':['버터']}.items():
 for name in names:identities[clean(name)]=allergen
product_tokens=['김치','간장','고추장','된장','쌈장','소시지','통조림햄','어묵','새우젓','액젓','라면','카레가루','케첩','짜장소스','부침가루','미림','맛술','msg','미원','노두유','맛소금','치즈','식용유','다시다','양념장','우동','밀가루떡','참치캔']
url='https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412'
areviews=[]
for r in data['recipes']:
 evidence=[];checks=[]
 for raw in r['ingredients_text'].splitlines():
  if raw.startswith(('*','[')) or raw in ['간장 양념 재료','양념장 만들기용 재료'] or raw.startswith('찌개 끓이기용 재료'):continue
  name=raw.split(':')[0] if ':' in raw else re.split(r'\s+(?=[\d½¼])',raw,maxsplit=1)[0]
  norm=clean(name);allergen=identities.get(norm)
  if allergen:evidence.append({'ingredient':name,'allergen':allergen,'basis':'explicit_ingredient_identity','recipe_source_url':r['source']['url']})
  if any(t in norm for t in product_tokens) and name not in checks:checks.append(name)
 r['allergen_review']={'status':'ingredient_identity_reviewed_product_labels_pending','checked_on':'2026-10-08','known_from_ingredients':sorted(set(x['allergen'] for x in evidence)),'ingredient_evidence':evidence,'check_product_labels':checks,'classification_source_url':url,'cross_contact_status':'not_verified'}
 areviews.append({'recipe_id':r['id'],'known_from_ingredients':r['allergen_review']['known_from_ingredients'],'product_labels_pending':checks})
data.update(version='1.2.0',nutrition_reference_count=2,allergen_ingredient_review_count=len(areviews));p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(repo/'data/recipe-enrichment-review-20261008.json').write_text(json.dumps({'reviewed_on':'2026-10-08','recipe_count':30,'nutrition_reference_estimates':2,'nutrition_held':28,'nutrition_items':nreviews,'allergen_ingredient_reviews':30,'allergen_items':areviews,'policy':'No certified complete allergen lists, no cross-contact claims, no allergen-free claims. Nutrition representative choices are disclosed.'},ensure_ascii=False,indent=2)+'\n')
