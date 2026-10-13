"""Collect official Jeonbuk cooking pages for review; never auto-publish recipes.
Usage: python scripts/collect-jeonbuk-cooking.py --cache-dir /path/to/cache [--fetch]
Requires lxml. Raw text remains in the supplied cache, not in the public app.
"""
import argparse, concurrent.futures, hashlib, json, re, subprocess
from pathlib import Path
from lxml import html
BASE='https://jbfood.go.kr'
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--cache-dir',required=True);p.add_argument('--fetch',action='store_true');args=p.parse_args()
cache=Path(args.cache_dir);cache.mkdir(parents=True,exist_ok=True)
def fetch(record_id):
 dest=cache/(record_id+'.html')
 if not dest.exists():
  if not args.fetch:return False
  tmp=dest.with_suffix('.tmp')
  result=subprocess.run(['curl','-fsSL','--max-time','25',BASE+'/juhtml/food/vod.html?thid='+record_id,'-o',str(tmp)],capture_output=True)
  if result.returncode:tmp.unlink(missing_ok=True);return False
  tmp.replace(dest)
 return True
assert fetch('149'),'Starting detail page unavailable'
seed=(cache/'149.html').read_bytes()
ids=list(dict.fromkeys(x.decode() for x in re.findall(rb'vod.html\?thid=(\d+)',seed)))
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: downloaded=list(pool.map(fetch,ids))
issues={
 '149':['Ingredient section lists beef 1.8kg; transcript lists 1kg; cooking steps use additional unlisted ingredients'],
 '40':['Cooking steps use radish and sesame absent from ingredient section'],
 '52':['Ingredient section lists water 3L; cooking steps use 5L'],
 '3':['Cooking steps use egg yolk and other ingredients absent from ingredient section'],
 '29':['Ingredient section uses non-glutinous rice flour; steps use glutinous rice flour'],
 '121':['Cooking steps use soybean paste absent from ingredient section'],
 '183':['Cooking steps use pork and several vegetables absent from ingredient section'],
 '11':['Cooking steps use bone broth, ginger and seaweed absent from ingredient section'],
 '20':['Cooking steps use carrot and perilla absent from ingredient section'],
 '15':['Ingredient section lists water 6 cups; cooking steps use 8 cups'],
 '9':['Ingredient section lists clams 660g; transcript lists 1kg'],
 '23':['Transcript narration and displayed method differ in water amount and timing'],
 '237':['Cooking steps use beef absent from ingredient section'],
 '322':['Cooking steps use cinnamon absent from ingredient section'],
 '18':['Cooking steps use a broth and several ingredients absent from ingredient section'],
 '312':['Ingredient section lists rice flour 8 cups; cooking steps use 6 cups'],
 '57':['Cooking steps use egg absent from ingredient section'],
 '50':['Ingredient section ratio is 1kg fruit to 1kg sugar; transcript ratio is 300g to 200g'],
 '24':['Ingredient section, transcript captions and narration disagree on seasoning quantities'],
 '5':['Ingredient section uses beef; cooking steps use pork'],
 '332':['Ingredient section lists honey and water 5 cups; cooking steps use sugar and water 3L'],
 '290':['Cooking steps use glutinous rice, malt and soy sauce absent from ingredient section'],
 '228':['Cooking steps use beef absent from ingredient section'],
 '4':['Several distinct dishes are combined; not a single complete recipe'],
}
records=[]
for record_id,ok in zip(ids,downloaded):
 url=BASE+'/juhtml/food/vod.html?thid='+record_id
 if not ok:records.append({'record_id':record_id,'url':url,'status':'fetch_failed'});continue
 raw=(cache/(record_id+'.html')).read_bytes();doc=html.fromstring(raw.decode('cp949'))
 def text(cls):
  nodes=doc.xpath('//div[@class="'+cls+'"]');return nodes[0].text_content().strip() if nodes else ''
 ing,method,transcript=text('material'),text('recipeBox'),text('subtitles')
 complete=bool(ing and method); problems=issues.get(record_id,[])
 records.append({'record_id':record_id,'name':doc.xpath('//h2')[0].text_content().strip(),'url':url,'original_sha256':hashlib.sha256(raw).hexdigest(),'has_ingredients':bool(ing),'has_cooking_steps':bool(method),'has_transcript':bool(transcript),'ingredient_characters':len(ing),'method_characters':len(method),'status':'held_missing_recipe_text' if not complete else 'held_source_inconsistency' if problems else 'pending_manual_consistency_review','review_findings':problems})
review={'reviewed_on':'2026-10-13','source_catalog':'https://www.data.go.kr/data/15136205/fileData.do','catalog_license':'이용허락범위 제한 없음','catalog_format':'MP4','catalog_record_count':53,'linked_detail_count':len(ids),'downloaded_detail_count':sum(downloaded),'complete_text_count':sum(r.get('has_ingredients',False) and r.get('has_cooking_steps',False) for r in records),'accepted_recipe_count':0,'status_counts':{s:sum(r['status']==s for r in records) for s in sorted({r['status'] for r in records})},'rules':['Public recipe database unchanged','Never merge differing ingredient quantities from page and transcript','Missing quantities, nutrition and allergens are not invented','Text reuse scope must be verified independently of the MP4 catalogue license','Raw source pages retained only in the cache directory; repository review contains metadata only'],'records':records}
(ROOT/'data/jeonbuk-cooking-review-20261013.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in review.items() if k not in ['records','rules']})
