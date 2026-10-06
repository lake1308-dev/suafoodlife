"""Review existing official food-type metadata; never infer allergen ingredients."""
import collections, gzip, hashlib, json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
records={}; inputs=[]
for path in sorted((root/'data').glob('nutrition-bulk*.json.gz')):
    data=json.loads(gzip.decompress(path.read_bytes()))
    inputs.append({'path':str(path.relative_to(root)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    for row in data.get('rows',[]):
        item=dict(zip(data['columns'],row))
        if item['code'] in records: raise ValueError('Duplicate food code')
        records[item['code']]=item
selected=[]
for food_type in ['음식','가공식품']:
    eligible=sorted((r for r in records.values() if r['type']==food_type and r['source']=='식품의약품안전처' and r['basis'] in ['100g','100ml']),key=lambda r:r['code'])
    if len(eligible)<2500: raise ValueError('Insufficient verified type metadata')
    selected.extend(eligible[:2500])
assert len(selected)==len({r['code'] for r in selected})==5000
out={'version':'1.0.0','batch':1,'record_count':5000,'policy':'Official food-type metadata only; allergen composition remains unverified.','counts':dict(collections.Counter(r['type'] for r in selected)),'records':{r['code']:{'name':r['name'],'type':r['type'],'basis':r['basis']} for r in selected}}
(root/'data/food-advice-batch-1.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
review={'record_count':5000,'source_record_count':len(records),'selection':'First 2500 eligible records per official food type, sorted by food code','checks':['Unique food codes','Exact source names and food types','100g/100ml basis preserved','Nutrition unchanged','No allergens inferred'],'inputs':inputs}
(root/'data/food-advice-review-1.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
print(out['counts'])
