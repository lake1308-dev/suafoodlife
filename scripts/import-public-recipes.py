import csv,gzip,json,pathlib,sys,hashlib
src=pathlib.Path(sys.argv[1])
with gzip.open(src,'rt',encoding='utf-8-sig',newline='') as f:rows=list(csv.DictReader(f))
recipes=[];held=[];seen=set()
for r in rows:
 seq=r['RCP_SEQ'].strip();name=r['RCP_NM'].strip();steps=[r[f'MANUAL{i:02}'].strip() for i in range(1,21) if r[f'MANUAL{i:02}'].strip()]
 if not(seq and name and r['RCP_PARTS_DTLS'].strip() and r['MANUAL01'].strip()) or seq in seen:
  held.append({'source_id':seq,'name':name,'reason':'missing_required_fields_or_duplicate_id'});continue
 seen.add(seq)
 def number(key):
  try:
   v=float(r[key]);return v if v>=0 else None
  except (ValueError,TypeError):return None
 recipes.append({'id':'cookrcp01_'+seq,'names':{'ko':name,'en':name},'country':'Korea','region':'','category':r['RCP_WAY2'],'category_ko':r['RCP_PAT2'],'tags':[r['HASH_TAG']] if r['HASH_TAG'] else [],'servings':None,'ingredients':[],'ingredients_text':r['RCP_PARTS_DTLS'].strip(),'steps':{'ko':steps,'en':steps},'public_recipe':True,'nutrition_status':'source_values_not_recalculated','source_nutrition':{k:number(v) for k,v in {'kcal':'INFO_ENG','carbs_g':'INFO_CAR','protein_g':'INFO_PRO','fat_g':'INFO_FAT','sodium_mg':'INFO_NA'}.items()},'source_weight_text':r['INFO_WGT'],'source':{'name':'식품의약품안전처 조리식품의 레시피 DB','service_id':'COOKRCP01','record_id':seq,'url':'https://www.foodsafetykorea.go.kr/api/newDatasetDetail.do?svc_no=COOKRCP01','retrieved_on':'2026-10-08'}})
pathlib.Path('data/recipes-public-20261008.json').write_text(json.dumps({'version':'1.0.0','record_count':len(recipes),'recipes':recipes},ensure_ascii=False,separators=(',',':'))+'\n')
pathlib.Path('data/recipes-public-import-review-20261008.json').write_text(json.dumps({'source_records':len(rows),'imported_records':len(recipes),'held_records':held,'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'checks':['unique source IDs','required name, ingredients and first step','original ingredient quantities retained','no guessed servings or nutrient calculations','no product allergen declarations inferred']},ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(recipes)}; held {len(held)}')

with gzip.open('data/recipes-public-20261008.json.gz','wb') as f:f.write(pathlib.Path('data/recipes-public-20261008.json').read_bytes())
