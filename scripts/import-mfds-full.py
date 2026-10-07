"""Reconcile the existing catalogue with every domestic K-FCDB source record.

Reads the original workbook without editing it. No nutrient values are inferred.
"""
import sys, json, gzip, hashlib, math, io, os
from pathlib import Path
from collections import Counter
import openpyxl

root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
columns=['code','name','type','basis','kcal','protein_g','fat_g','carbs_g','sugars_g','fiber_g','sodium_mg','cholesterol_mg','sat_fat_g','source','reference_date','manufacturer','declared_weight']
fields={'kcal':'에너지(kcal)','protein_g':'단백질(g)','fat_g':'지방(g)','carbs_g':'탄수화물(g)','sugars_g':'당류(g)','fiber_g':'식이섬유(g)','sodium_mg':'나트륨(mg)','cholesterol_mg':'콜레스테롤(mg)','sat_fat_g':'포화지방산(g)'}
def clean(v):
    s=str(v or '').strip().lstrip('\ufeff')
    return '' if s=='해당없음' else s
def number(v):
    if v is None or str(v).strip() in ('','-','Tr','ND'): return None
    try: n=float(v)
    except (ValueError,TypeError): return None
    return n if math.isfinite(n) and n>=0 else None
def write_gzip(path,d):
    buffer=io.BytesIO()
    with gzip.GzipFile(filename=path.name,mode='wb',fileobj=buffer,mtime=0) as f:f.write(json.dumps(d,ensure_ascii=False,separators=(',',':')).encode())
    temporary=path.with_suffix(path.suffix+'.tmp')
    temporary.write_bytes(buffer.getvalue());os.replace(temporary,path)
catalog={}
details={}
for p in sorted((root/'data').glob('food-details-*.json.gz')):
    details.update(json.load(gzip.open(p))['records'])
for p in sorted((root/'data').glob('nutrition-bulk-*.json.gz')):
    d=json.load(gzip.open(p))
    for r in d['rows']:
        x=dict(zip(d['columns'],r));code=x['code'];assert code not in catalog
        x.update(details.get(code,{}));catalog[code]=x
assert len(catalog)==60000
old_codes=set(catalog)
stats=Counter();seen={};manifest=[];conflicts=[]
wb=openpyxl.load_workbook(source,read_only=True,data_only=True)
ws=wb.active;it=ws.iter_rows(values_only=True);headers=next(it);idx={h:i for i,h in enumerate(headers)}
for rownum,r in enumerate(it,2):
    stats['source_records']+=1
    get=lambda k:r[idx[k]]
    if get('수입여부')!='N':stats['excluded_import_or_unknown']+=1;continue
    if get('데이터구분명')!='가공식품':stats['excluded_other_type']+=1;continue
    code=clean(get('식품코드'));name=clean(get('식품명'));basis=clean(get('영양성분함량기준량'))
    if not code or not name or basis not in ('100g','100ml'):stats['excluded_identity_or_basis']+=1;continue
    values={k:number(get(v)) for k,v in fields.items()}
    if values['kcal'] is None:stats['excluded_no_energy']+=1;continue
    x={'code':code,'name':name,'type':'가공식품','basis':basis,**values,'source':'식품영양성분 데이터베이스(K-FCDB) · 식품의약품안전처','reference_date':'2026-09-29','manufacturer':clean(get('제조사명')),'declared_weight':clean(get('식품중량'))}
    if code in seen:
        if seen[code]==x:stats['duplicate_identical_source_codes']+=1
        else:stats['duplicate_conflicting_source_codes']+=1;conflicts.append(code)
        continue
    seen[code]=x
    previous=catalog.get(code)
    if previous:
        stats['existing_source_matches']+=1
        same_basis=previous['basis']==basis
        if same_basis:
            stats['filled_nutrient_cells']+=sum(previous.get(k) is None and values[k] is not None for k in fields)
            stats['revised_nutrient_cells']+=sum(previous.get(k) is not None and values[k] is not None and previous[k]!=values[k] for k in fields)
        else:stats['updated_basis_records']+=1
        stats['updated_existing_records']+=int(any(previous.get(k)!=x.get(k) for k in columns))
    else:stats['added_records']+=1
    catalog[code]=x
    manifest.append([code,rownum])
    if stats['source_records']%25000==0:print(dict(stats),flush=True)
assert stats['source_records']==323197
assert not conflicts, 'Conflicting source codes require review: '+str(conflicts[:20])
assert len(catalog)==60000+stats['added_records']
sha=hashlib.sha256(source.read_bytes()).hexdigest()
rows=sorted(catalog.values(),key=lambda x:x['code'])
files=[]
for i,start in enumerate(range(0,len(rows),5000),1):
    path=f'data/catalog-20260929-{i}.json.gz';subset=rows[start:start+5000]
    write_gzip(root/path,{'version':'2026-09-29','record_count':len(subset),'columns':columns,'rows':[[x.get(c) for c in columns] for x in subset]})
    files.append({'path':path,'record_count':len(subset),'sha256':hashlib.sha256((root/path).read_bytes()).hexdigest()})
(root/'data/catalog-manifest.json').write_text(json.dumps({'version':'2026-09-29','record_count':len(rows),'chunks':files},ensure_ascii=False,indent=2))
write_gzip(root/'data/mfds-full-source-rows.json.gz',manifest)
missing={k:sum(x.get(k) is None for x in rows) for k in fields}
review={'source_filename':source.name,'source_sha256':sha,**dict(stats),'result_catalog_count':len(rows),'rda_connected_count':2500,'source_verified_unique_records':len(seen),'source_verified_nutrient_cells':len(seen)*9,'retained_existing_not_matched':len(old_codes-set(seen)),'complete_core_records':sum(all(x.get(k) is not None for k in ('kcal','protein_g','fat_g','carbs_g')) for x in rows),'missing_nutrient_cells':missing,'records_with_missing_display_fields':sum(any(x.get(k) is None for k in fields if k!='fiber_g') for x in rows),'allergy_changes':0,'policy':'Keep existing catalogue; reconcile matching codes with current official values and original units. Add non-imported (N) processed foods with valid code, name, 100g/100ml basis and energy. Missing nutrients remain null. Identical duplicate codes collapse; conflicting codes block import.'}
(root/'data/mfds-full-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2))
print(json.dumps(review,ensure_ascii=False,indent=2),flush=True)
