"""Import the user-supplied official RDA workbook; never substitute missing values."""
import sys,json,gzip,hashlib,math,collections
from pathlib import Path
import openpyxl
src=Path(sys.argv[1]);w=openpyxl.load_workbook(src,read_only=True,data_only=True)
sheet='국가표준식품성분 Database 10.4';rows=list(w[sheet].values);headers,units=rows[1:3]
assert '가식부 100g' in rows[0][3]
fields={'kcal':5,'protein_g':7,'fat_g':8,'carbs_g':10,'sugars_g':11,'fiber_g':18,'sodium_mg':26,'cholesterol_mg':87,'sat_fat_g':90}
assert headers[5]=='에너지' and units[5]=='kcal' and units[87]=='mg' and units[90]=='g'
lookup={r[0]:(r[1],r[2],r[3],r[4]) for r in list(w['부록2)식품코드,국문명,영문명,학명 정보 '].values)[1:]}
assert len(lookup)==3366
byindex={int(r[0]):(i,r) for i,r in enumerate(rows[3:],4) if isinstance(r[0],(int,float))}
url='https://www.nics.go.kr/food/kfi/fct/fctIntro/list'
allergy_url='https://www.foodsafetykorea.go.kr/portal/board/boardDetail.do?bbs_no=bbs001&menu_no=3120&ntctxt_no=1091412'
# Explicit representative selection, not a nutrient average across varieties.
chosen={'milk':2846,'egg_whole':2059,'walnut_raw':695,'pine_nut_raw':670,'buckwheat_grain':14,'soybean_raw':557,'wheat_grain':165,'wheat_flour':175,'crab_raw':2644,'shrimp':2716,'squid_raw':2735,'mackerel_raw':2116,'oyster_raw':2555,'abalone_raw':2609,'mussel_raw':2577}
root_allergens={'달걀':'알류','거위알':'알류','기러기알':'알류','메추리알':'알류','오리알':'알류','칠면조알':'알류','우유':'우유','메밀':'메밀','땅콩':'땅콩','대두':'대두','밀':'밀','잣':'잣','호두':'호두','게':'게','새우':'새우','오징어':'오징어','고등어':'고등어','굴':'조개류','전복':'조개류','담치':'조개류','복숭아':'복숭아','토마토':'토마토','방울토마토':'토마토','닭 부산물':'닭고기','닭고기':'닭고기','돼지고기':'돼지고기','소고기':'쇠고기','쇠고기':'쇠고기'}
# Other shellfish are also within the Korean shellfish category.
for root in ['가리비','꼬막','대합','바지락','백합','피조개','재첩','키조개','모시조개','새조개','조개','고둥','소라','각시수랑','우렁이']:root_allergens[root]='조개류'
reviewed_groups={'곡류 및 그 제품','감자류 및 전분류','두류','견과류 및 종실류','채소류','버섯류','과일류','육류 및 그 제품','난류','어패류 및 그 제품','해조류','우유 및 그 제품'}
def number(v):
 if v is None or str(v).strip() in ('','-','Tr','tr','ND','N.D.'):return None
 try:n=float(v)
 except (ValueError,TypeError):return None
 assert math.isfinite(n) and n>=0
 return int(n) if n.is_integer() else n

def make(idx):
 rownum,r=byindex[idx];code,name,en,latin=lookup[idx];assert name==r[3]
 root=name.split(',')[0].strip();label=root_allergens.get(root)
 info={'contains':[label] if label else [],'status':'contains' if label else ('unverified' if root in {'멧돼지고기','꿩고기'} else 'not_listed'),'source_url':allergy_url,'checked_on':'2026-10-06','basis':'single_ingredient_identity'}
 return {'id':'rda:'+code,'names':{'ko':name,'en':en},'aliases':{'ko':[],'en':[]},'category':'basic_ingredient','verification_status':'verified','nutrition_per_100g':{k:number(r[i]) for k,i in fields.items()},'allergen_info':info,'sources':[{'source':'농촌진흥청 국가표준식품성분 DB 10.4 (2026)','source_record_id':code,'source_food_name':name,'source_url':url,'basis':'100g','data_type':'기본 재료 · 가식부 100g','reference_date':'2026-10-06','analysis_source':r[4],'workbook_sheet':sheet,'workbook_row':rownum}]}

curated=json.load(open('data/allergen-ingredients.json'))
for x in curated['ingredients']:
 r=make(chosen[x['id']]);x.update(nutrition_per_100g=r['nutrition_per_100g'],sources=r['sources'],verification_status='verified');assert all(x['nutrition_per_100g'][k] is not None for k in ['kcal','protein_g','fat_g','carbs_g'])
curated['version']='0.2.0';curated['policy']='Official DB 10.4 per 100g edible portion; explicit representative selection, missing cells remain null.'
Path('data/allergen-ingredients.json').write_text(json.dumps(curated,ensure_ascii=False,indent=2)+'\n')

# First 1,000: the 15 representatives plus unseasoned raw, domestically analysed ingredients.
selected=list(chosen.values());groups=collections.defaultdict(list)
for idx,(_,r) in byindex.items():
 name=str(r[3]);root=name.split(',')[0].strip()
 if idx in selected or r[2] not in reviewed_groups or not name.endswith('생것') or not str(r[4]).startswith(('농진청','수(','식약')):continue
 if root.endswith('면') or '국수' in root or root in {'당면','잡곡','돼지불고기','국수','우동','라면','빵','곤약(구약나물)'} or any(t in name for t in ['양념','조미','가공','미국산','중국산','일본산','호주산']):continue
 if any(number(r[fields[k]]) is None for k in ['kcal','protein_g','fat_g','carbs_g']):continue
 groups[r[2]].append(idx)
while len(selected)<1000:
 progressed=False
 for group in sorted(groups):
  if groups[group] and len(selected)<1000:selected.append(groups[group].pop(0));progressed=True
 if not progressed:raise ValueError('Not enough reviewed raw ingredients')
batch=[make(i) for i in selected]
assert len(batch)==len(set(x['id'] for x in batch))==1000
mapping={make(idx)['id']:id for id,idx in chosen.items()}
meta={'version':'0.1.0','source_version':'RDA DB 10.4 (2026)','source_url':url,'license':'공공누리 제1유형 · 출처표시 (annual Excel DB)','original_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'record_count':1000,'curated_id_by_record':mapping,'allergen_policy':'Identity classification of unseasoned single ingredients; not-listed does not mean allergy-free. No product-label or cross-contact inference.','ingredients':batch}
Path('data/rda-basic-1000.json.gz').write_bytes(gzip.compress(json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
Path('data/rda-import-review.json').write_text(json.dumps({k:v for k,v in meta.items() if k!='ingredients'}|{'contains_count':sum(bool(x['allergen_info']['contains']) for x in batch),'not_listed_count':sum(x['allergen_info']['status']=='not_listed' for x in batch),'unverified_count':sum(x['allergen_info']['status']=='unverified' for x in batch),'selected_representatives':chosen},ensure_ascii=False,indent=2)+'\n')
print('Verified representatives:',[(x['names']['ko'],x['sources'][0]['source_food_name'],x['nutrition_per_100g']['kcal']) for x in curated['ingredients']])
print('Batch:',len(batch),'contains',sum(bool(x['allergen_info']['contains']) for x in batch))

# Second 1,000: distinct domestic-analysis records; prefer plain prepared ingredients.
# A processed-food name alone cannot establish its complete allergen composition.
plain_states={'생것','말린것','삶은것','데친것','찐것','구운것','구운것(팬)','구운것(오븐)','볶은것','가루','밥','죽','미음','불린것','삶아서 말린것','말린것(자연건조)','동결건조','냉동','껍질 포함','껍질과 씨 포함','씨 포함'}
reviewed_roots={x['names']['ko'].split(',')[0] for x in batch if x['allergen_info']['status']!='unverified'}
added_terms=('양념','조미','첨가','소금','튀긴','통조림','젓갈','염장','염절임','가당','가공','훈제','소스','샐러드','장조림','혼합')
def plain_identity(idx):
 name=str(byindex[idx][1][3]);parts=[p.strip() for p in name.split(',')]
 return parts[0] in reviewed_roots and parts[-1] in plain_states and not any(t in name for t in added_terms)
candidates=[]
for idx,(_,r) in byindex.items():
 if idx in selected or not str(r[4]).startswith(('농진청','수(','식약')):continue
 if any(t in str(r[3]) for t in ('미국산','중국산','일본산','호주산')):continue
 if any(number(r[fields[k]]) is None for k in ('kcal','protein_g','fat_g','carbs_g')):continue
 candidates.append(idx)
candidates.sort(key=lambda idx:(not plain_identity(idx),idx))
selected2=candidates[:1000];assert len(selected2)==1000 and not set(selected)&set(selected2)
batch2=[]
for idx in selected2:
 x=make(idx)
 if not plain_identity(idx):
  x['category']='official_food'
  x['sources'][0]['data_type']='공식 식품 자료 · 가식부 100g'
  x['allergen_info']={'contains':[],'status':'unverified','basis':'composition_not_verified'}
 batch2.append(x)
meta2={k:v for k,v in meta.items() if k not in {'ingredients','curated_id_by_record'}}
meta2.update(version='0.1.0',batch_number=2,curated_id_by_record={},ingredients=batch2,
 allergen_policy='Only reviewed plain ingredient identities are classified. Processed or mixed records remain unverified; no complete product allergen composition is inferred.')
Path('data/rda-foods-1001-2000.json.gz').write_bytes(gzip.compress(json.dumps(meta2,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
counts=collections.Counter(x['allergen_info']['status'] for x in batch2)
Path('data/rda-import-review-2.json').write_text(json.dumps({k:v for k,v in meta2.items() if k!='ingredients'}|{'allergen_status_counts':dict(counts),'previous_batch_overlap':0},ensure_ascii=False,indent=2)+'\n')
print('Second batch:',len(batch2),'allergen statuses:',dict(counts))
