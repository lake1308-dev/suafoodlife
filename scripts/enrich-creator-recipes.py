import pathlib,json,re,math,gzip
repo=pathlib.Path(__file__).resolve().parents[1];p=repo/'data/recipes-creator-20261008.json';data=json.loads(p.read_text());rda={}
for source_path in (repo/'data').glob('rda-*.json.gz'):
 with gzip.open(source_path,'rt') as source_file:
  for record in json.load(source_file).get('ingredients',[]):rda[record['id']]=record
base=[('황설탕','rda:C0110040009a'),('물엿','rda:C0070000009a'),('진간장','rda:R0010010009a'),('참기름','rda:N0200000009a'),('통깨','rda:E0260020009n')]
maps={
'계란볶음밥':{'밥':'rda:A013000A039a','대파':'rda:F1910040000a','달걀':'rda:J0030000000a','식용유':'rda:N0220000009a','진간장':'rda:R0010010009a','MSG':'rda:R0310002825a','맛소금':'rda:R0200012819a'},
'불고기':dict(base+[('쇠고기등심','rda:I027003D110a'),('양파','rda:F1320000000a'),('양파 간 것','rda:F1320000000a'),('표고버섯','rda:G027000B010a'),('대파','rda:F1910040000a'),('홍고추','rda:F018000C020a'),('다진마늘','rda:F053000B060a'),('후춧가루','rda:R0410010005a')]),
'멸치볶음(고추장)':{'황설탕':'rda:C0110040009a','물엿':'rda:C0070000009a','참기름':'rda:N0200000009a','통깨':'rda:E0260020009n','중멸치':'rda:K0660001153a','청양고추':'rda:F0180080000a','식용유':'rda:N0220000009a','고추장':'rda:R0050010009a','고운 고춧가루':'rda:R0070000005a'},
'무생채(소금 양념)':{'무':'rda:F065002B090a','고운고춧가루':'rda:R0070000005a','황설탕':'rda:C0110040009a','간마늘':'rda:F053000B060a','식초':'rda:R0220060009a','꽃소금':'rda:R0200020009a','대파':'rda:F1910040000a','깨소금':'rda:E0260020009n'},
'멸치볶음':dict(base+[('중멸치','rda:K0660001153a'),('청양고추','rda:F0180080000a'),('식용유','rda:N0220000009a')])}
maps['잡채']={'당면':'rda:B0070010001a','시금치':'rda:F1150000000a','돼지고기(잡채용)':'rda:I014000F100a','건 목이버섯':'rda:G0080000001a','양파':'rda:F1320000000a','대파':'rda:F1910040000a','당근':'rda:F041000B090a','진간장':'rda:R0010010009a','황설탕':'rda:C0110040009a','참기름':'rda:N0200000009a','간 마늘':'rda:F053000B060a','식용유':'rda:N0220000009a','꽃소금':'rda:R0200020009a','통깨':'rda:E0260020009n','MSG':'rda:R0310002825a','후춧가루':'rda:R0410010005a','노두유':'rda:R0010010009a'}
maps['잡채(데쳐서 만들기)']=maps['잡채'].copy()
assumptions={'불고기':['쇠고기등심은 한우 등심 생것 자료를 사용했습니다. 등급·원산지·지방량에 따라 달라집니다.','진간장은 개량 양조간장, 통깨는 볶은 흰참깨 자료를 기준으로 계산했습니다.'], '멸치볶음':['식용유는 콩기름, 진간장은 개량 양조간장, 통깨는 볶은 흰참깨 자료를 기준으로 계산했습니다. 실제 제품이 다르면 값이 달라집니다.']}
nutrient_keys=['kcal','protein_g','carbs_g','fat_g','sodium_mg','sugars_g','sat_fat_g','cholesterol_mg'];nreviews=[]
assumptions['무생채(소금 양념)']=['무는 조선무 생것, 식초는 양조식초, 꽃소금은 대표 정제염 자료로 계산했습니다. 실제 제품 성분과는 다를 수 있습니다.','깨소금은 볶은 흰참깨를 갈아 쓴 것으로 가정했습니다. 소금을 섞은 제품이면 영양값이 달라집니다.','양념을 모두 먹는 기준입니다. 무에서 나온 국물이나 양념을 남기면 실제 섭취량은 줄어듭니다.']
assumptions['멸치볶음(고추장)']=['식용유는 콩기름, 고추장은 개량 고추장, 통깨는 볶은 흰참깨 자료를 기준으로 계산했습니다. 실제 제품에 따라 달라집니다.']
assumptions['계란볶음밥']=['밥은 멥쌀 백미밥, 달걀은 생것 식품성분을 기준으로 계산했습니다. 이미 기름이 들어간 달걀프라이 자료를 더하지 않습니다.','식용유는 콩기름, 진간장은 개량 양조간장, MSG는 화학조미료 가루, 맛소금은 가공염 맛소금 자료로 계산했습니다. 실제 제품에 따라 달라집니다.','원본에 적힌 식용유 40g을 모두 섭취하는 기준입니다. 팬에 남기는 기름에 따라 실제 섭취값은 줄어듭니다.','밥 1공기와 달걀 2개를 쓰는 전체 조리 분량입니다. 원본에 인분 수가 명시되지 않아 1인분 영양값으로 단정하지 않습니다.']
assumptions['잡채']=['당면은 삶기 전의 마른 고구마 당면 250g, 목이버섯은 말린 것 3g 기준입니다. 삶은 당면의 100g 값을 마른 무게에 곱하지 않습니다.','잡채용 돼지고기는 등심살 생것, 시금치와 채소는 생것 기준입니다. 부위·손질 상태에 따라 달라집니다.','진간장과 노두유는 대표 개량 양조간장 자료로 계산했습니다. 노두유의 실제 제품 성분은 미확인으로, 특히 당류·나트륨은 제품 표시값으로 보완해야 합니다.','식용유는 콩기름, 꽃소금은 정제염, 통깨는 볶은 흰참깨, MSG는 화학조미료 가루 자료를 사용했습니다.','모든 정량 재료를 합한 전체 조리 분량의 추정값입니다. 삶거나 데쳐 버리는 물로 빠지는 성분과 팬에 남는 기름은 계산하지 않았습니다.']
assumptions['잡채(데쳐서 만들기)']=assumptions['잡채'][:] + ['볶는 조리법과 같은 원본 재료 목록을 사용합니다. 데치는 과정의 성분 손실을 반영하지 않아 재료 기준 예상 합계는 같지만, 실제 완성 음식의 값이 같다는 뜻은 아닙니다.']
for r in data['recipes']:
 tag=r['tags'][0]
 if tag not in maps:
  nreviews.append({'recipe_id':r['id'],'status':'held','reason':'Ingredient identity, edible weight or mixed component basis needs individual review; no complete total generated'});continue
 ingredients=[]
 for raw in r['ingredients_text'].splitlines():
  if ':' not in raw:continue
  name=raw.split(':')[0].strip();assert name in maps[tag],(tag,name)
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
for allergen,names in {'알류':['달걀','계란','삶은달걀','달걀지단'],'쇠고기':['쇠고기등심','소고기(양지)','소고기(불고기용)','소양지','소 양지','불고기용소고기'],'돼지고기':['돼지고기','간돼지고기','돼지고기(잡채용)','돼지고기뒷다리살','삼겹살','뒷다리살','돼지고기 앞다리살(찌개용)'],'닭고기':['토막닭','닭다리살'],'대두':['두부','순두부','콩나물','삶은 콩나물'],'밀':['밀가루','밀가루떡'],'새우':['새우젓'],'오징어':['오징어','오징어채'],'우유':['버터'],'고등어':['고등어 통조림'],'메밀':['메밀면']}.items():
 for name in names:identities[clean(name)]=allergen
product_tokens=['김치','간장','고추장','된장','쌈장','소시지','통조림햄','어묵','새우젓','액젓','라면','카레가루','케첩','짜장소스','부침가루','미림','맛술','msg','미원','노두유','맛소금','치즈','식용유','다시다','양념장','우동','밀가루떡','참치캔','마요네즈','게맛살','단무지','우엉조림','유부','사골국물','굴소스','쫄면','메밀면','고등어 통조림','오징어채','케찹','연와사비','잡채']
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
data.update(version='1.5.0',nutrition_reference_count=len(maps),allergen_ingredient_review_count=len(areviews));p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(repo/'data/recipe-enrichment-review-20261008.json').write_text(json.dumps({'reviewed_on':'2026-10-08','recipe_count':len(data['recipes']),'nutrition_reference_estimates':len(maps),'nutrition_held':len(data['recipes'])-len(maps),'nutrition_items':nreviews,'allergen_ingredient_reviews':len(areviews),'allergen_items':areviews,'policy':'No certified complete allergen lists, no cross-contact claims, no allergen-free claims. Nutrition representative choices are disclosed.'},ensure_ascii=False,indent=2)+'\n')
