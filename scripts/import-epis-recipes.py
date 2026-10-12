import csv,json,gzip,hashlib,collections,re,sys
from pathlib import Path
import openpyxl
repo=Path(__file__).resolve().parents[1];up=Path(sys.argv[1])
bp=up/'레시피+기본정보_20261011.csv';sp=up/'레시피+과정정보_20261012.csv';ip=up/'레시피 재료정보.xlsx'
def csvread(p):return list(csv.reader(p.read_text(encoding='cp949').splitlines()))[1:]
b=csvread(bp);s=csvread(sp);ir=list(openpyxl.load_workbook(ip,read_only=True,data_only=True).active.values)[1:]
ings=collections.defaultdict(list);steps=collections.defaultdict(dict);conflicts=set();repairs=[]
for row in ir:ings[str(row[0])].append(row)
for row in s:
 rid,no=row[:2];n=int(no)
 if len(row)>4:repairs.append({'recipe_id':rid,'step':n,'original_field_count':len(row)})
 text=','.join(row[2:-1]).strip();tip=row[-1].strip()
 if n in steps[rid] and steps[rid][n]!=(text,tip):conflicts.add(rid)
 steps[rid][n]=(text,tip)
recipes=[];held=[]
for row in b:
 rid,name=row[:2];items=sorted(ings[rid],key=lambda x:int(x[1]));st=steps[rid];reason=[]
 if rid in conflicts:reason.append('conflicting_step_number')
 if not items or any(not str(x[2] or '').strip() for x in items):reason.append('missing_ingredient_name')
 if not st or sorted(st)!=list(range(1,max(st)+1)) or any(not x[0] for x in st.values()):reason.append('missing_cooking_step')
 if reason:held.append({'id':rid,'name':name,'reasons':reason});continue
 lines=[str(x[2]).strip()+' '+str(x[3] or '').strip()+' ('+str(x[5] or '').strip()+')' for x in items]
 kcal=re.fullmatch(r'(\d+(?:\.\d+)?)\s*Kcal',row[8].strip(),re.I);cal=float(kcal[1]) if kcal and float(kcal[1])>0 else None
 recipes.append({'id':'epis_'+rid,'names':{'ko':name,'en':name},'country':'Korea','region':'','category':row[6],'category_ko':row[4],'tags':[],'servings':None,'ingredients':[],'ingredients_text':'\n'.join(lines),'steps':{'ko':[st[n][0]+(' 참고: '+st[n][1] if st[n][1] else '') for n in sorted(st)],'en':[st[n][0] for n in sorted(st)]},'public_recipe':True,'source_kind':'epis_reference','source_label':'농정원 공개 레시피','source_servings_text':row[9],'source_time_text':row[7],'source_nutrition':{'kcal':cal,'protein_g':None,'carbs_g':None,'fat_g':None,'sodium_mg':None},'source_weight_text':'','nutrition_status':'source_calorie_basis_unverified','source_calorie_text':row[8],'source':{'name':'농림수산식품교육문화정보원','record_id':rid,'url':'https://data.mafra.go.kr/opendata/data/indexOpenDataDetail.do?data_id=20150827000000000464','retrieved_on':'2026-10-12'}})
d={'version':'1.0.0','record_count':len(recipes),'recipes':recipes}
(repo/'data/recipes-epis-20261012.json.gz').write_bytes(gzip.compress((json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n').encode(),mtime=0))
a={'checked_on':'2026-10-12','basic_records':len(b),'ingredient_rows':len(ir),'process_rows':len(s),'imported_records':len(recipes),'held':held,'ingredient_only_ids':sorted(set(ings)-{x[0] for x in b}),'process_only_ids':sorted(set(steps)-{x[0] for x in b}),'csv_comma_restorations':repairs,'sources':[{'filename':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [bp,ip,sp]],'policy':['Keep original ingredient quantities and source portion text; no gram conversions','Zero calorie source values treated as unavailable','Unverified calorie basis not converted to per person or per 100g','No inferred product allergens','Cuisine classification is not verified country of origin','Distinct source recipes retained even when dish names match']}
(repo/'data/recipes-epis-import-review-20261012.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
