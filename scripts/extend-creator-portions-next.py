"""Add portion controls after source serving and ingredient basis review."""
import json,pathlib,re
repo=pathlib.Path(__file__).resolve().parents[1];p=repo/'data/recipes-creator-20261008.json';data=json.loads(p.read_text())
reviewed={'쫄면':1,'들기름막라면':1,'갈치조림':2};items=[]
notice=' 재료량은 원본 인분에 비례한 참고값입니다. 양념은 입맛에 맞게 조절하고 조리 시간과 불 세기는 비례해서 바꾸지 마세요.'
for r in data['recipes']:
 tag=r['tags'][0]
 if tag not in reviewed:continue
 assert r['servings']==reviewed[tag]
 lines=[]
 for raw in r['ingredients_text'].splitlines():
  if raw.startswith('*') or raw.startswith('['):lines.append({'original_line':raw,'heading':True});continue
  name,value=raw.split(':',1) if ':' in raw else (raw,'')
  # Names in the reviewed source sometimes precede an amount without a colon.
  if not value:
   m=re.match(r'^(.*?)\s+(약간|약\d|\d)',raw)
   if m:name=raw[:m.start(2)].strip();value=raw[m.start(2):]
  m=re.search(r'(\d+(?:\.\d+)?)\s*(kg|g|ml|mL|L)\b',value)
  if m:
   amount=float(m[1]);unit=m[2].lower()
   if unit=='kg':amount*=1000;unit='g'
   elif unit=='l':amount*=1000;unit='ml'
   lines.append({'original_line':raw,'name':name.strip(),'amount':amount,'unit':unit});continue
  # Parse fractions as one amount, never the denominator as a whole count.
  m=re.search(r'(\d+(?:\.\d+)?)(?:/(\d+(?:\.\d+)?))?\s*(개|봉)',value)
  if m:lines.append({'original_line':raw,'name':name.strip(),'amount':float(m[1])/(float(m[2]) if m[2] else 1),'unit':m[3]})
  else:lines.append({'original_line':raw,'name':name.strip()})
 assert len(lines)==len(r['ingredients_text'].splitlines());r['portion_lines']=lines
 if notice not in r.get('portion_notice',''):r['portion_notice']=r.get('portion_notice','')+notice
 items.append({'recipe_id':r['id'],'name':tag,'original_servings':r['servings'],'source_url':r['source']['url'],'status':'source_servings_and_ingredient_basis_reviewed'})
data['version']='1.18.1';p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
(repo/'data/recipe-portions-next-review-20261009.json').write_text(json.dumps({'reviewed_on':'2026-10-09','added_controls':len(items),'items':items,'policy':'Measured weights or explicit package counts; fractions parsed; unknown amounts remain manual; original quantities restored; no proportional cooking time'},ensure_ascii=False,indent=2)+'\n')
