"""Independently compare every imported nutrient cell with the original workbook."""
import sys,json,gzip,hashlib,math
from pathlib import Path
import openpyxl
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
manifest=json.loads((root/'data/catalog-manifest.json').read_text())
catalog={}
for chunk in manifest['chunks']:
    path=root/chunk['path'];assert hashlib.sha256(path.read_bytes()).hexdigest()==chunk['sha256']
    d=json.load(gzip.open(path));assert len(d['rows'])==d['record_count']==chunk['record_count']
    for r in d['rows']:
        x=dict(zip(d['columns'],r));assert x['code'] not in catalog
        catalog[x['code']]=x
assert len(catalog)==manifest['record_count']
source_rows=dict((row,code) for code,row in json.load(gzip.open(root/'data/mfds-full-source-rows.json.gz')))
fields={'kcal':'에너지(kcal)','protein_g':'단백질(g)','fat_g':'지방(g)','carbs_g':'탄수화물(g)','sugars_g':'당류(g)','fiber_g':'식이섬유(g)','sodium_mg':'나트륨(mg)','cholesterol_mg':'콜레스테롤(mg)','sat_fat_g':'포화지방산(g)'}
wb=openpyxl.load_workbook(source,read_only=True,data_only=True)
it=wb.active.iter_rows(values_only=True);headers=next(it);idx={h:i for i,h in enumerate(headers)}
checked=0;records=0
for rownum,r in enumerate(it,2):
    if rownum not in source_rows:continue
    code=source_rows[rownum];x=catalog[code]
    assert r[idx['식품코드']]==code and r[idx['수입여부']]=='N'
    assert r[idx['영양성분함량기준량']]==x['basis']
    assert str(r[idx['식품명']] or '').strip().lstrip('\ufeff')==x['name']
    for k,h in fields.items():
        v=r[idx[h]]
        if v is None or str(v).strip() in ('','-','Tr','ND'):expected=None
        else:
            try:expected=float(v)
            except (ValueError,TypeError):expected=None
            if expected is not None and (not math.isfinite(expected) or expected<0):expected=None
        assert x[k]==expected,(code,k,x[k],expected)
        checked+=1
    records+=1
assert records==len(source_rows)
review=json.loads((root/'data/mfds-full-review.json').read_text())
assert checked==review['source_verified_nutrient_cells']
review['independent_verification']={'records':records,'nutrient_cells':checked,'unit_and_identity_match':True,'unique_catalog_codes':len(catalog)}
(root/'data/mfds-full-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2))
print(json.dumps(review['independent_verification']),flush=True)
