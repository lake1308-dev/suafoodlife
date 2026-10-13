"""Import official RDA cooking applications, preserving original text and quantities."""
import csv,gzip,json,hashlib,sys,zipfile,io
from pathlib import Path
src=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
z=zipfile.ZipFile(src);entry='(한식요리정보)FD_한식_활용-수정.csv';raw=z.read(entry)
rows=list(csv.DictReader(io.StringIO(raw.decode('cp949'))));recipes=[];held=[]
for i,row in enumerate(rows,2):
 ingredients=[x.strip() for x in row['재료'].split('_') if x.strip()];steps=[x.strip() for x in row['요리방법'].split('_') if x.strip()]
 if row['사용여부']!='Y' or not row['한식이름'].strip() or not ingredients or not steps:
  held.append({'row':i,'id':row['식품코드'],'reason':'inactive or missing required recipe text'});continue
 name=row['한식이름'].strip()
 recipes.append({'id':'rda_cooking_'+row['식품코드'],'names':{'ko':name,'en':name},'country':'Korea','region':'','category':'한식','category_ko':'한식','tags':[row['한식코드이름']],'servings':None,'ingredients':[],'ingredients_text':'\n'.join(ingredients),'steps':{'ko':steps,'en':steps},'public_recipe':True,'source_kind':'rda_cooking_reference','source_label':'농촌진흥청 활용요리','source_nutrition':{'kcal':None,'protein_g':None,'carbs_g':None,'fat_g':None,'sodium_mg':None},'nutrition_status':'not_calculated','source_weight_text':'','source':{'name':'농촌진흥청 한식요리정보','url':'https://www.data.go.kr/data/15137355/fileData.do','record_id':row['식품코드'],'filename':entry,'retrieved_on':'2026-10-13','license':'이용허락범위 제한 없음','original_sha256':hashlib.sha256(raw).hexdigest()},'source_tools_text':row['도구'],'source_preparation_name':row['한식코드이름']})
assert len({r['id'] for r in recipes})==len(recipes)
out={'version':'1.0.0','record_count':len(recipes),'recipes':recipes}
(root/'data/recipes-rda-cooking-20261013.json.gz').write_bytes(gzip.compress(json.dumps(out,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
review={'source_zip_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'source_entry':entry,'input_rows':len(rows),'accepted':len(recipes),'held':held,'rules':['Original underscore-delimited ingredients and steps preserved','No guessed servings or nutrition','Menu ingredients without cooking steps are not imported as recipes','GAP producer data excluded']}
(root/'data/recipes-rda-cooking-review-20261013.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
print(review)
