"""Connect ten 50-record batches from the supplied official workbook."""
import collections,gzip,hashlib,json,math,sys
from pathlib import Path
import openpyxl
src=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
w=openpyxl.load_workbook(src,read_only=True,data_only=True);sheet='국가표준식품성분 Database 10.4';rows=list(w[sheet].values)
fields={'kcal':5,'protein_g':7,'fat_g':8,'carbs_g':10,'sugars_g':11,'fiber_g':18,'sodium_mg':26,'cholesterol_mg':87,'sat_fat_g':90}
assert '가식부 100g' in rows[0][3] and rows[1][5]=='에너지' and rows[2][5]=='kcal'
lookup={r[0]:r[1:5] for r in list(w['부록2)식품코드,국문명,영문명,학명 정보 '].values)[1:]}
used=set();plain_roots=set();known={}
for path in ['data/rda-basic-1000.json.gz','data/rda-foods-1001-2000.json.gz']:
 d=json.loads(gzip.decompress((root/path).read_bytes()))
 assert d['original_sha256']==hashlib.sha256(src.read_bytes()).hexdigest()
 for x in d['ingredients']:
  used.add(x['id'])
  if x['category']=='basic_ingredient' and x['allergen_info']['status']!='unverified':
   r=x['names']['ko'].split(',')[0];plain_roots.add(r);known[r]=x['allergen_info']
def num(v):
 if v is None or str(v).strip() in ('','-','Tr','tr','ND','N.D.'):return None
 try:v=float(v)
 except (TypeError,ValueError):return None
 assert math.isfinite(v) and v>=0
 return int(v) if v.is_integer() else v
plain_states={'생것','말린것','삶은것','데친것','찐것','구운것','구운것(팬)','구운것(오븐)','볶은것','가루','밥','죽','미음','불린것','삶아서 말린것','말린것(자연건조)','동결건조','냉동','껍질 포함','껍질과 씨 포함','씨 포함'}
added=('양념','조미','첨가','소금','튀긴','통조림','젓갈','염장','염절임','가당','가공','훈제','소스','샐러드','장조림','혼합')
groups=collections.defaultdict(list)
for rownum,r in enumerate(rows[3:],4):
 if not isinstance(r[0],(int,float)):continue
 code,name,en,latin=lookup[int(r[0])];assert name==r[3]
 if 'rda:'+code in used or not str(r[4]).startswith(('농진청','수(','식약')):continue
 if any(t in name for t in ('미국산','중국산','일본산','호주산')):continue
 nutrients={k:num(r[i]) for k,i in fields.items()}
 if any(nutrients[k] is None for k in ('kcal','protein_g','fat_g','carbs_g')):continue
 parts=[x.strip() for x in name.split(',')];plain=parts[0] in plain_roots and parts[-1] in plain_states and not any(t in name for t in added)
 info={**known[parts[0]],'checked_on':'2026-10-07'} if plain else {'contains':[],'status':'unverified','basis':'composition_not_verified'}
 x={'id':'rda:'+code,'names':{'ko':name,'en':en},'aliases':{'ko':[],'en':[]},'category':'basic_ingredient' if plain else 'official_food','verification_status':'verified','nutrition_per_100g':nutrients,'allergen_info':info,'sources':[{'source':'농촌진흥청 국가표준식품성분 DB 10.4 (2026)','source_record_id':code,'source_food_name':name,'source_url':'https://www.nics.go.kr/food/kfi/fct/fctIntro/list','basis':'100g','data_type':('기본 재료' if plain else '공식 식품 자료')+' · 가식부 100g','reference_date':'2026-10-07','analysis_source':r[4],'workbook_sheet':sheet,'workbook_row':rownum}]}
 groups[r[2]].append(x)
selected=[]
while len(selected)<500:
 progressed=False
 for g in sorted(groups):
  if groups[g] and len(selected)<500:selected.append(groups[g].pop(0));progressed=True
 if not progressed:raise ValueError('Insufficient eligible domestic-analysis records')
assert len({x['id'] for x in selected})==500 and not {x['id'] for x in selected}&used
summary=[]
for i in range(10):
 batch=selected[i*50:(i+1)*50];counts=dict(collections.Counter(x['allergen_info']['status'] for x in batch))
 meta={'version':'0.1.0','source_version':'RDA DB 10.4 (2026)','source_url':'https://www.nics.go.kr/food/kfi/fct/fctIntro/list','license':'공공누리 제1유형 · 출처표시 (annual Excel DB)','original_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'record_count':50,'curated_id_by_record':{},'batch_number':i+1,'allergen_policy':'Reviewed single ingredient identities only. Mixed or processed food composition is unverified. No label or cross-contact inference.','ingredients':batch}
 filename=f'data/rda-foods-2001-2500-p{i+1}.json.gz';(root/filename).write_bytes(gzip.compress(json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
 summary.append({'batch':i+1,'file':filename,'count':50,'nutrient_cells_checked':450,'allergen_status_counts':counts,'ids':[x['id'] for x in batch]})
 print('Batch',i+1,50,counts)
review={'record_count':500,'previous_batch_overlap':0,'nutrient_cells_checked':4500,'allergen_status_counts':dict(collections.Counter(x['allergen_info']['status'] for x in selected)),'batches':summary}
(root/'data/rda-import-review-500.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
