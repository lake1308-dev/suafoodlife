"""Import manually reviewed structured rows from the official EPIS master CSV.
No images, introduction/health claims, invented quantities, or nutrition imported.
"""
import csv,gzip,hashlib,io,json,re,sys
from pathlib import Path
from lxml import html
root=Path(__file__).resolve().parents[1];raw=Path(sys.argv[1]).read_bytes()
rows=list(csv.DictReader(io.StringIO(raw.decode('cp949'))));assert len(rows)==705 and all(None not in r and all(v is not None for v in r.values()) for r in rows)
APPROVED={113,114,116,117,118,119,135,165,180,195,660,675}
def clean(s):
 s=re.sub(r'<br\s*/?>','\n',s,flags=re.I)
 d=html.fromstring('<div>'+s+'</div>')
 for x in d.xpath('.//script|.//style|.//img'):x.drop_tree()
 return '\n'.join(re.sub(r'\s+',' ',x).strip() for x in d.text_content().splitlines() if x.strip())
recipes=[];review=[]
for i,r in enumerate(rows):
 a=r['내용'].split('||');structured=len(a)==5
 status='accepted_manual_review' if i in APPROVED else 'pending_manual_review' if structured else 'held_unstructured_text'
 review.append({'csv_row':i+2,'title':r['제목'].strip(),'status':status,'has_separate_ingredients_and_method':structured,'record_sha256':hashlib.sha256(r['내용'].encode()).hexdigest()})
 if i not in APPROVED:continue
 assert structured
 ing=clean(a[3]);method=clean(a[2]);steps=[x.strip() for x in re.split(r'(?<!\d)\d{1,2}\s*[.)](?!\d)\s*',method) if x.strip()]
 assert ing and 2<=len(steps)<=12
 title=r['제목'].strip();recipes.append({'id':'epis_master_'+str(i+2),'names':{'ko':title,'en':title},'country':'Korea','region':'','category':'요리','category_ko':'요리','tags':[],'servings':None,'ingredients':[],'ingredients_text':ing,'steps':{'ko':steps,'en':steps},'public_recipe':True,'source_kind':'epis_master_reference','source_label':'농정원 고수요리법','source_nutrition':{'kcal':None,'protein_g':None,'carbs_g':None,'fat_g':None,'sodium_mg':None},'nutrition_status':'not_calculated','source_weight_text':'','source':{'name':'농림수산식품교육문화정보원 고수요리법','url':'https://www.data.go.kr/data/15050910/fileData.do','record_id':str(i+2),'retrieved_on':'2026-10-14','license':'이용허락범위 제한 없음','original_sha256':hashlib.sha256(raw).hexdigest()},'source_original_credit':clean(a[4]),'source_time_text':clean(a[0]),'source_registration_date':r['등록일']})
assert len(recipes)==12
(root/'data/recipes-epis-master-20261014.json.gz').write_bytes(gzip.compress(json.dumps({'version':'1.0.0','record_count':len(recipes),'recipes':recipes},ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
report={'reviewed_on':'2026-10-14','source_url':'https://www.data.go.kr/data/15050910/fileData.do','source_license':'이용허락범위 제한 없음','source_sha256':hashlib.sha256(raw).hexdigest(),'source_bytes':len(raw),'input_records':len(rows),'structured_records':sum(x['has_separate_ingredients_and_method'] for x in review),'accepted':len(recipes),'pending_structured':sum(x['status']=='pending_manual_review' for x in review),'held_unstructured':sum(x['status']=='held_unstructured_text' for x in review),'rules':['Only manually approved rows enter public recipe data','Original ingredient quantities and ordered cooking steps retained','Recipe source versions retained separately; title match alone does not prove duplication','Images, descriptions and health claims excluded','No inferred nutrition, allergens or portions'],'records':review}
(root/'data/recipes-epis-master-review-20261014.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print({k:v for k,v in report.items() if k not in ['records','rules']})
