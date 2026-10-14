"""Extract factual cooking measurements; never synthesize missing instructions.
Creator source sections must be unambiguous. Public records use published steps.
"""
import argparse,collections,gzip,hashlib,json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
num=r'\d+(?:\.\d+)?(?:\s*[~〜～–-]\s*\d+(?:\.\d+)?)?'
patterns=[('크기',re.compile(num+r'\s*(?:cm|㎝|mm|㎜)',re.I)),('시간',re.compile(num+r'\s*(?:시간|분|초)(?![가-힣])')),('온도',re.compile(num+r'\s*(?:℃|°C|도)(?![가-힣])',re.I)),('불',re.compile(r'(?:중\s*약|중\s*강|약|중|강|센)\s*불'))]
def facts(text):
 out=[]
 for label,pat in patterns:
  vs=list(dict.fromkeys(re.sub(r'\s+','',m.group()) for m in pat.finditer(text)))
  if vs:out.append(label+': '+', '.join(vs))
 return out
ap=argparse.ArgumentParser();ap.add_argument('--source-dir',type=Path,required=True);a=ap.parse_args()
sources={}
for f in a.source_dir.glob('paik*-sources/*.details.json'):
 try:
  d=json.loads(f.read_text());sources[d['videoId']]=d
 except (ValueError,KeyError):pass
p=root/'data/recipes-creator-20261008.json';creator=json.loads(p.read_text());freq=collections.Counter(r['source']['record_id'] for r in creator['recipes'])
review=[]
for r in creator['recipes']:
 src=sources.get(r['source']['record_id']);status='source_not_available';guide=[]
 if src:
  raw=src['shortDescription'];assert hashlib.sha256(raw.encode()).hexdigest()==r['source']['description_sha256'],r['id']
  # Do not merge separate dishes or versions, even if their headings look similar.
  headers=list(re.finditer(r'\[\s*(?:만드는\s*법|조리\s*방법|조리법)[^\]]*\]',raw))
  if len(headers)==1 and freq[r['source']['record_id']]==1:
   text=raw[headers[0].end():];text=re.split(r'\[\s*(?:Ingredients|Directions)\s*\]|한식을 사랑|\[음악\]',text,flags=re.I)[0]
   # Multiple numbered sequences / sub-recipe headings need human section mapping.
   nums=list(re.finditer(r'^\s*(\d+)\.\s*(.*)',text,re.M));starts=sum(m[1]=='1' for m in nums)
   if starts==1 and not re.search(r'^\s*\*[^\n]*(?:버전|양념장|소스|만들기)\s*$',text,re.M):
    for i,m in enumerate(nums):
     step=text[m.end(1)+1:nums[i+1].start() if i+1<len(nums) else len(text)].strip()
     # Trim English tail which can contain another numbering sequence.
     vals=facts(step)
     if vals:guide.append({'source_step':int(m[1]),'facts':vals})
    status='source_measurements_extracted' if guide else 'source_has_no_numeric_cooking_cues'
   else:status='section_mapping_required'
  else:status='section_mapping_required'
 r['source_cooking_details']=guide
 r['cooking_detail_audit']={'checked_on':'2026-10-14','status':status,'source_sha256':r['source']['description_sha256']}
 review.append({'id':r['id'],'name':r['names']['ko'],'status':status,'detail_rows':len(guide),'manually_expanded':bool(r.get('instruction_review'))})
creator['version']='1.31.0';p.write_text(json.dumps(creator,ensure_ascii=False,indent=2)+'\n')
public=[]
for path in [root/'data/recipes.json',*sorted((root/'data').glob('recipes*.json.gz'))]:
 d=json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_text())
 for r in d.get('recipes',[]):
  steps=r.get('steps',{}).get('ko',[]);public.append({'id':r['id'],'file':path.name,'step_count':len(steps),'has_measured_cooking_cues':any(facts(x) for x in steps),'status':'existing_steps_scanned_not_manual_completion'})
report={'checked_on':'2026-10-14','scope':'All published recipe records; structural audit is not recipe completeness certification','creator_count':len(review),'creator_status_counts':dict(collections.Counter(r['status'] for r in review)),'other_recipe_count':len(public),'creator_items':review,'other_items':public}
(root/'data/recipe-cooking-detail-review-20261014.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(report['creator_status_counts']);print('Other published records scanned:',len(public))
