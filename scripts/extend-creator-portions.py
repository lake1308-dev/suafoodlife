"""Scale only individually reviewed recipes with an explicit source serving count."""
import json,pathlib,re
repo=pathlib.Path(__file__).resolve().parents[1];p=repo/'data/recipes-creator-20261008.json';data=json.loads(p.read_text())
reviewed={'감자샐러드(대용량)':100,'닭고기덮밥':1,'매콤달걀덮밥':1,'닭개장(닭가슴살)':3,'육개장(20분 방식)':4};items=[]
for r in data['recipes']:
 tag=r['tags'][0]
 if tag not in reviewed:continue
 assert r['servings']==reviewed[tag]
 lines=[]
 for raw in r['ingredients_text'].splitlines():
  if raw.startswith('*'):
   lines.append({'original_line':raw,'heading':True});continue
  name,value=raw.split(':',1) if ':' in raw else (raw,'')
  m=re.search(r'(\d+(?:\.\d+)?)\s*(kg|g|ml|mL|L)\b',value)
  if m:
   amount=float(m[1]);unit=m[2].lower()
   if unit=='kg':amount*=1000;unit='g'
   elif unit=='l':amount*=1000;unit='ml'
   lines.append({'original_line':raw,'name':name.strip(),'amount':amount,'unit':unit});continue
  count=re.search(r'(\d+(?:\.\d+)?)\s*개',value)
  if count:lines.append({'original_line':raw,'name':name.strip(),'amount':float(count[1]),'unit':'개'})
  else:lines.append({'original_line':raw,'name':name.strip()})
 assert len(lines)==len(r['ingredients_text'].splitlines());r['portion_lines']=lines
 r['portion_notice']=r.get('portion_notice','')+' 재료량은 원본 인분에 비례한 참고값입니다. 기호에 따른 간과 실제 조리 시간·불 세기는 직접 조절해 주세요.'
 items.append({'recipe_id':r['id'],'name':tag,'original_servings':r['servings'],'status':'source_servings_and_ingredient_basis_reviewed'})
data['version']='1.14.1';p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(repo/'data/recipe-portions-extension-review-20261009.json').write_text(json.dumps({'reviewed_on':'2026-10-09','added_controls':len(items),'items':items,'policy':'Explicit source portions only; kg and L converted to g and ml; unspecified amounts remain manual; cooking time is never scaled'},ensure_ascii=False,indent=2)+'\n')
