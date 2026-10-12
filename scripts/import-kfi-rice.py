"""Import official HWPX rice recipes using cell coordinates and merged-cell spans."""
import zipfile,io,xml.etree.ElementTree as ET,json,gzip,re,hashlib,sys
from pathlib import Path
repo=Path(__file__).resolve().parents[1];src=Path(sys.argv[1]);recipes=[];audit=[]
def text(e):return ''.join(n.text or '' for n in e.iter() if n.tag.endswith('}t')).strip()
def grid(t):
 rows={};original={}
 for tr in t:
  if not tr.tag.endswith('}tr'):continue
  for c in tr:
   if not c.tag.endswith('}tc'):continue
   a=next(n for n in c if n.tag.endswith('}cellAddr'));s=next(n for n in c if n.tag.endswith('}cellSpan'))
   x,y=int(a.attrib['colAddr']),int(a.attrib['rowAddr']);v=text(c);original[(y,x)]=v
   for yy in range(y,y+int(s.attrib['rowSpan'])):
    for xx in range(x,x+int(s.attrib['colSpan'])):rows.setdefault(yy,{})[xx]=v
 return rows,original
with zipfile.ZipFile(src) as outer:
 for filename in sorted(outer.namelist(),key=lambda n:int(n.split('.')[0])):
  raw=outer.read(filename);rid=filename.split('.')[0];name=filename.split('. ',1)[1].removesuffix('.hwpx')
  with zipfile.ZipFile(io.BytesIO(raw)) as h:
   roots=[ET.fromstring(h.read(f)) for f in sorted(h.namelist()) if f.startswith('Contents/section') and f.endswith('.xml')]
  tables=[t for r in roots for t in r.iter() if t.tag.endswith('}tbl')];ingredients=[];steps=[];step_sources=[]
  ing_tables=[]
  for t in tables:
   g,o=grid(t)
   if any(v=='원재료' for (y,x),v in o.items() if y==0):
    gc=next(x for (y,x),v in o.items() if y==1 and v=='g');nc=gc-4
    for y,row in sorted(g.items()):
     if y<2:continue
     nm=row[nc];qty=row[gc];assert nm and re.fullmatch(r'\d+(?:\.\d+)?',qty),(filename,y,nm,qty)
     group=row.get(0,'') if nc else ''
     ingredients.append({'name':nm,'grams_text':qty,'group':group,'preparation':row.get(gc+3,''),'source_composition_text':row.get(gc+5,''),'source_origin_text':row.get(nc+1,''),'source_part_text':row.get(nc+3,''),'table_row':y})
    ing_tables.append(t)
   elif any(v=='과정' for (y,x),v in o.items() if y==0):
    for (y,x),v in sorted(o.items()):
     if x==1 and re.match(r'^\d+\.',v):
      group=g[y].get(0,'');clean=re.sub(r'^\d+\.\s*','',v)
      steps.append((group+' — ' if group else '')+clean);step_sources.append({'table':tables.index(t),'row':y,'original_text':v})
  assert len(ing_tables)==1 and ingredients and steps,filename
  alltext=' '.join(text(r) for r in roots);m=re.search(r'(\d+)인 기준',alltext);assert m,filename
  portion=m[0];lines=[(x['group']+' / ' if x['group'] else '')+x['name']+(' ['+x['source_part_text']+']' if x['source_part_text'] not in ['','-'] else '')+' '+x['grams_text']+'g'+(' ('+x['preparation']+')' if x['preparation'] not in ['','-'] else '') for x in ingredients]
  recipes.append({'id':'kfi_rice_'+rid,'names':{'ko':name,'en':name},'country':'Korea','region':'','category':'밥류','category_ko':'한식','tags':[],'servings':None,'ingredients':[],'ingredients_text':'\n'.join(lines),'steps':{'ko':steps,'en':steps},'public_recipe':True,'source_kind':'kfi_reference','source_label':'한식진흥원 정밀레시피','source_servings_text':portion,'source_time_text':'총 조리시간 미표기','source_nutrition':dict.fromkeys(['kcal','protein_g','carbs_g','fat_g','sodium_mg']),'nutrition_status':'not_calculated','source_weight_text':'','source_ingredient_details':ingredients,'source':{'name':'한식진흥원 한식 정밀레시피(밥류)','url':'https://www.data.go.kr/data/15142529/fileData.do','record_id':rid,'filename':filename,'retrieved_on':'2026-10-12','license':'공공누리 제1유형 출처표시','original_sha256':hashlib.sha256(raw).hexdigest()}})
  audit.append({'id':'kfi_rice_'+rid,'name':name,'source_portion':portion,'ingredient_rows':len(ingredients),'cooking_steps':len(steps),'step_sources':step_sources})
d={'version':'1.0.0','record_count':len(recipes),'recipes':recipes};assert len(recipes)==30
(repo/'data/recipes-kfi-rice-20261012.json.gz').write_bytes(gzip.compress((json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n').encode(),mtime=0))
(repo/'data/recipes-kfi-rice-review-20261012.json').write_text(json.dumps({'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'imported_records':30,'records':audit,'policy':['Merged cells expanded by explicit coordinates','Original grams column only; no oz/lb conversions','Original cooking and plating instructions retained with component headings','No inference of nutrient totals from partial composition notes','No inferred full allergen declarations','Distinct official versions retained under source IDs']},ensure_ascii=False,indent=2)+'\n')
print([(r['names']['ko'],len(r['source_ingredient_details']),len(r['steps']['ko'])) for r in recipes])
