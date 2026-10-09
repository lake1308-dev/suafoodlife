import pathlib,json,re,math,gzip
repo=pathlib.Path(__file__).resolve().parents[1];p=repo/'data/recipes-creator-20261008.json';data=json.loads(p.read_text());rda={}
for source_path in (repo/'data').glob('rda-*.json.gz'):
 with gzip.open(source_path,'rt') as source_file:
  for record in json.load(source_file).get('ingredients',[]):rda[record['id']]=record
base=[('황설탕','rda:C0110040009a'),('물엿','rda:C0070000009a'),('진간장','rda:R0010010009a'),('참기름','rda:N0200000009a'),('통깨','rda:E0260020009n')]
maps={
'감자짜글이':{'감자':'rda:B0010140000a','양파':'rda:F1320000000a','대파':'rda:F1910040000a','청양고추':'rda:F0180080000a','통조림햄':'rda:I0170090009a','간마늘':'rda:F053000B060a','된장':'rda:R0120020009a','고추장':'rda:R0050010009a','굵은고춧가루':'rda:R0070000005a','황설탕':'rda:C0110040009a','진간장':'rda:R0010010009a'},
'미역국':{'소고기(양지)':'rda:I027003D280a','자른미역':'rda:L0130000001a','참기름':'rda:N0200000009a','국간장':'rda:R0010030009a','다진마늘':'rda:F053000B060a','멸치액젓':'rda:K069001000Ia'},
'진미채볶음':{'오징어채':'rda:K623000F06Ba','고추장':'rda:R0050010009a','고운고춧가루':'rda:R0070000005a','참기름':'rda:N0200000009a','물엿':'rda:C0070000009a','황설탕':'rda:C0110040009a','마요네즈':'rda:R0150020009a','통깨':'rda:E0260020009n'},
'참치김치찌개':{'신김치':'rda:F2050070009a','양파':'rda:F1320000000a','두부':'rda:D0150000009a','참치캔':'rda:K001000000Sa','대파':'rda:F1910040000a','국간장':'rda:R0010030009a','간 마늘':'rda:F053000B060a','굵은 고춧가루':'rda:R0070000005a','청양고추':'rda:F0180080000a','황설탕':'rda:C0110040009a'},
'부추전초간장':{'진간장':'rda:R0010010009a','식초':'rda:R0220060009a','황설탕':'rda:C0110040009a'},
'전양념간장':{'진간장':'rda:R0010010009a','식초':'rda:R0220060009a','굵은고춧가루':'rda:R0070000005a','대파':'rda:F1910040000a','간마늘':'rda:F053000B060a','통깨':'rda:E0260020009n'},
'감자조림':{'감자':'rda:B0010140000a','양파':'rda:F1320000000a','진간장':'rda:R0010010009a','물엿':'rda:C0070000009a','소고기(불고기용)':'rda:I027003D110a','황설탕':'rda:C0110040009a','꽈리고추':'rda:F0180020000a','간마늘':'rda:F053000B060a'},
'콩나물국':{'콩나물':'rda:F1820000000a','대파':'rda:F1910040000a','간 마늘':'rda:F053000B060a','꽃소금':'rda:R0200020009a','국간장':'rda:R0010030009a','청양고추':'rda:F0180080000a'},
'장아찌소스':{'진간장':'rda:R0010010009a','식초':'rda:R0220060009a','설탕':'rda:C0110020009a'},
'새우젓무침':{'새우젓':'rda:K617006000Ia','간 마늘':'rda:F053000B060a','황설탕':'rda:C0110040009a','쪽파':'rda:F1910030000a','맛술':'rda:R0160000009a','참기름':'rda:N0200000009a','청양고추':'rda:F0180080000a','홍고추':'rda:F018000C020a','굵은 고춧가루':'rda:R0070000005a','통깨':'rda:E0260020009n'},
'애호박전':{'애호박':'rda:F1980050000a','건새우':'rda:K6130050003a','청양고추':'rda:F0180080000a','소금':'rda:R0200020009a','전분가루':'rda:B0140010005a','식용유':'rda:N0220000009a'},
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
assumptions['애호박전']=['건새우는 꽃새우를 삶아 말린 것, 전분가루는 감자전분, 소금은 정제염, 식용유는 콩기름 자료로 계산했습니다. 실제 종류와 제품이 다르면 값이 달라집니다.','원본의 식용유 50g과 반죽을 모두 섭취하는 전체 조리 분량 기준입니다. 팬에 남는 기름이나 반죽은 빼지 않았습니다.','전분을 감자전분으로 선택한 것은 영양 계산용 가정입니다. 실제 사용 제품의 밀 함유 여부는 별도로 확인해야 합니다.']
assumptions['새우젓무침']=['새우젓은 젓새우 젓갈, 맛술은 대표 맛술, 통깨는 볶은 흰참깨 자료로 계산했습니다. 젓갈 종류·염도와 제품에 따라 특히 나트륨과 당류가 달라집니다.','양념을 포함한 무침 전체 분량의 재료 합계입니다. 수육에 곁들여 조금씩 먹는 양념으로, 이 합계를 1인분 식사 영양값으로 해석하지 않습니다.','맛술의 조리 중 알코올 손실이나 숙성에 따른 변화를 반영하지 않았습니다. 실제 섭취량에 따라 값이 달라집니다.']
assumptions['콩나물국']=['콩나물과 채소는 생것, 국간장은 재래간장, 꽃소금은 정제염 자료를 사용했습니다. 실제 제품 염도에 따라 나트륨이 달라집니다.','정수물 2L는 열량과 주요 영양성분을 더하지 않는 물로 가정했습니다. 물 자체의 미량 무기질은 계산하지 않았습니다.','재료와 국물을 모두 먹는 전체 4인분의 예상 합계입니다. 국물을 남기면 특히 나트륨 섭취량이 줄어듭니다. 조리 후 100g 값은 아닙니다.']
assumptions['장아찌소스']=['진간장은 개량 양조간장, 식초는 양조식초, 설탕은 백설탕 자료로 계산했습니다. 실제 제품에 따라 값이 달라집니다.','물 360g은 열량과 주요 영양성분을 더하지 않는 물로 가정했습니다. 물 자체의 미량 무기질은 계산하지 않았습니다.','만든 소스 전체의 예상 합계입니다. 장아찌 채소에 흡수되는 양이나 남기는 소스는 확인되지 않아 완성 장아찌 또는 1인분 영양값으로 사용할 수 없습니다.']
assumptions['감자조림']=['감자는 수미 생것, 불고기용 소고기는 한우 등심 생것, 진간장은 개량 양조간장 자료로 계산했습니다. 실제 품종·부위·제품에 따라 값이 달라집니다.','물 470g은 열량과 주요 영양성분을 더하지 않는 물로 가정했습니다. 물 자체의 미량 무기질은 계산하지 않았습니다.','조림 양념과 모든 재료를 합한 전체 조리 분량의 예상값입니다. 남기는 국물·양념에 따라 특히 당류와 나트륨의 실제 섭취량이 줄어듭니다. 인분 수가 미지정이어서 1인분 또는 완성 후 100g 값으로 표시하지 않습니다.']
assumptions['부추전초간장']=['진간장은 개량 양조간장, 식초는 양조식초 자료를 사용했습니다. 실제 제품의 염도와 성분에 따라 값이 달라집니다.','소스를 만든 전체 준비량의 예상값입니다. 전의 영양값을 포함하지 않으며, 소스를 남기면 실제 섭취량은 줄어듭니다. 1인분 분량은 미확인입니다.']
assumptions['전양념간장']=assumptions['부추전초간장'][:] + ['통깨는 볶은 흰참깨 자료로 계산했습니다.']
assumptions['진미채볶음']=['오징어채는 조미하여 말린 오징어채, 고추장은 개량 고추장, 마요네즈는 일반 제품, 통깨는 볶은 흰참깨 자료로 계산했습니다. 제품의 당·기름·염도 차이에 따라 값이 달라집니다.','물 35g은 열량과 주요 영양성분을 더하지 않는 물로 가정했습니다. 물 자체의 미량 무기질은 계산하지 않았습니다.','원본 재료 목록의 참기름과 통깨까지 전량 포함한 전체 무침 분량의 예상값입니다. 남기는 양념은 차감하지 않았으며, 인분 수는 미확인입니다.']
assumptions['참치김치찌개']=['신김치는 대표 배추김치, 두부는 일반 두부, 국간장은 재래간장 자료로 계산했습니다. 김치 숙성도·제품·염도 차이가 반영되지 않은 대표 예상값입니다.','참치는 유지가 포함된 가다랑어 통조림 자료를 사용했습니다. 원본의 캔 기름을 함께 사용하는 조리법에 맞춘 선택이며, 추가 식용유를 중복해서 더하지 않습니다. 실제 제품 성분은 별도 확인이 필요합니다.','정수물 400ml는 열량과 주요 영양성분을 더하지 않는 물로 가정했습니다. 물 자체의 미량 무기질은 계산하지 않았습니다.','모든 재료와 국물을 먹는 원본 2인분 합계입니다. 국물을 남기면 특히 나트륨 섭취량이 줄어듭니다. 완성 후 100g 값은 아닙니다.']
assumptions['감자짜글이']=['감자는 수미 생것, 통조림햄은 돼지고기 함유 대표 통조림햄, 된장·고추장은 개량 제품, 진간장은 양조간장 자료로 계산했습니다. 실제 브랜드·품종·육류 구성과 염도에 따라 달라집니다.','물 700g은 열량과 주요 영양성분을 더하지 않는 물로 가정했습니다. 물 자체의 미량 무기질은 계산하지 않았습니다.','원본 목록의 정량 재료를 모두 섭취하는 전체 조리 분량 기준입니다. 기호에 따라 추가하는 간장과 남기는 국물·양념은 계산하지 않았습니다. 인분 수는 미확인입니다.','햄을 돼지고기 함유 대표 식품으로 선택한 것은 영양 계산용 가정입니다. 실제 햄의 알레르기 정보는 제품 표시를 별도로 확인해야 합니다.']
assumptions['미역국']=['양지는 한우 양지 생것, 국간장은 재래간장, 멸치액젓은 대표 액젓 자료로 계산했습니다. 부위·등급·제품 염도에 따라 값이 달라집니다.','미역 10g은 물에 불리기 전 말린 것 기준입니다. 불린 미역 10g으로 계산하지 않았습니다.','물 1.3L는 열량과 주요 영양성분을 더하지 않는 물로 가정했습니다. 물 자체의 미량 무기질은 계산하지 않았습니다.','재료와 국물을 모두 먹는 전체 조리 분량의 예상값입니다. 국물을 남기면 특히 나트륨 섭취량이 줄어듭니다. 인분 수와 완성 중량은 미확인으로, 1인분이나 완성 후 100g 값은 아닙니다.']
water_only={'감자짜글이':{'물'},'미역국':{'물'},'진미채볶음':{'물'},'참치김치찌개':{'정수 물'},'감자조림':{'물'},'콩나물국':{'정수물'},'장아찌소스':{'물'}}
assert all(isinstance(tag,str) for tag in maps), 'Recipe map keys must be names'
assert set(maps).issubset({r['tags'][0] for r in data['recipes']}), 'Recipe mappings must match registered recipes'
for r in data['recipes']:
 tag=r['tags'][0]
 if tag not in maps:
  nreviews.append({'recipe_id':r['id'],'status':'held','reason':'Ingredient identity, edible weight or mixed component basis needs individual review; no complete total generated'});continue
 ingredients=[]
 for raw in r['ingredients_text'].splitlines():
  if ':' not in raw:continue
  name=raw.split(':')[0].strip()
  if name in water_only.get(tag,set()):continue
  assert name in maps[tag],(tag,name)
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
for allergen,names in {'알류':['달걀','계란','삶은달걀','달걀지단','메추리알','달걀물'],'쇠고기':['쇠고기등심','소고기(양지)','소고기(불고기용)','소양지','소 양지','불고기용소고기','홍두깨살','우목심'],'돼지고기':['돼지고기','간돼지고기','돼지고기(잡채용)','돼지고기뒷다리살','삼겹살','뒷다리살','돼지고기 앞다리살(찌개용)','돼지고기 뒷다리살 덩어리','돼지고기 후지 슬라이스','돈등심(잡채용)','돼지고기(카레용)','돼지목살','돼지고기(등심)','돼지고기 후지(슬라이스)','돼지고기등심'],'닭고기':['토막닭','닭다리살','닭가슴살','닭(9호)','삶은 닭','토막 닭(9호)'],'대두':['두부','순두부','콩나물','삶은 콩나물','국산콩손두부'],'밀':['밀가루','밀가루떡'],'새우':['새우젓','건새우','자숙 새우'],'오징어':['오징어','오징어채'],'우유':['버터','우유','스틱버터','연유','모짜렐라치즈','파마산 치즈가루','파르메산 치즈','생크림','슬라이스치즈','체다치즈슬라이스','모차렐라 치즈','슬라이스 체다치즈'],'고등어':['고등어 통조림'],'토마토':['토마토'],'메밀':['메밀면']}.items():
 for name in names:identities[clean(name)]=allergen
product_tokens=['김치','간장','고추장','된장','쌈장','소시지','통조림햄','어묵','새우젓','액젓','라면','카레가루','케첩','짜장소스','부침가루','미림','맛술','msg','미원','노두유','맛소금','치즈','식용유','다시다','양념장','우동','밀가루떡','참치캔','마요네즈','게맛살','단무지','우엉조림','유부','사골국물','굴소스','쫄면','메밀면','고등어 통조림','오징어채','케찹','연와사비','잡채','식빵','치킨무','통조림참치','전분가루','튀김가루','만능볶음요리소스','베이컨','스파게티면','올리브유','만능양념장','훈연멸치가루','통조림골뱅이','소면','칼국수면','도토리묵','깍두기','갈아만든배','사과잼','마요소스','슬라이스햄','딸기잼','생수제비','조미김가루','탕수육','마가린']
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
data.update(version='1.21.1',nutrition_reference_count=len(maps),allergen_ingredient_review_count=len(areviews));p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(repo/'data/recipe-enrichment-review-20261008.json').write_text(json.dumps({'reviewed_on':'2026-10-08','recipe_count':len(data['recipes']),'nutrition_reference_estimates':len(maps),'nutrition_held':len(data['recipes'])-len(maps),'nutrition_items':nreviews,'allergen_ingredient_reviews':len(areviews),'allergen_items':areviews,'policy':'No certified complete allergen lists, no cross-contact claims, no allergen-free claims. Nutrition representative choices are disclosed.'},ensure_ascii=False,indent=2)+'\n')
