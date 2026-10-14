"""Review 100 existing references without inventing missing recipe facts.
Preflight guidance is distinct from a manual rewrite of cooking instructions.
"""
import argparse,hashlib,json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1];ap=argparse.ArgumentParser();ap.add_argument('--source-dir',type=Path,required=True);args=ap.parse_args();src={}
for f in args.source_dir.glob('paik*-sources/*.details.json'):
 try:d=json.loads(f.read_text());src[d['videoId']]=d
 except (ValueError,KeyError):pass
p=root/'data/recipes-creator-20261008.json';d=json.loads(p.read_text());rs=[r for r in d['recipes'] if not r.get('instruction_review')][:100];assert len(rs)==100
out=[]
for r in rs:
 s=src[r['source']['record_id']]['shortDescription'];assert hashlib.sha256(s.encode()).hexdigest()==r['source']['description_sha256']
 lines=[x.strip() for x in r['ingredients_text'].splitlines() if x.strip()];steps=r['steps']['ko'];whole=' '.join(steps)
 # Unquantified lines are reported as written; headings are never ingredients.
 uncertain=[]
 for line in lines:
  if line.startswith(('*','-')) or any(x in line for x in ['재료 (','재료(','기준)','만들기용 재료','끓이기용 재료']):continue
  if not re.search(r'\d',line) or any(w in line for w in ['적당량','약간','미표기']):uncertain.append(line)
 details=[]
 for i,step in enumerate(steps,1):
  facts=[]
  for label,pat in [('불 세기',r'(?:중약|중강|약|중|강|센)\s*불'),('시간',r'\d+(?:\.\d+)?(?:\s*[~〜～–-]\s*\d+(?:\.\d+)?)?\s*(?:시간|분|초)(?![가-힣])'),('크기',r'\d+(?:\.\d+)?(?:\s*[~〜～–-]\s*\d+(?:\.\d+)?)?\s*(?:cm|mm|㎝|㎜)')]:
   vals=list(dict.fromkeys(m.group() for m in re.finditer(pat,step,re.I)))
   if vals:facts.append(label+': '+', '.join(vals))
  if facts:details.append({'step':i,'facts':facts})
 notes=[]
 if not re.search(r'(?:중약|중강|약|중|강|센)\s*불',whole) and re.search(r'볶|굽|삶|끓|튀|찌|찝',whole):notes.append('현재 조리 설명에는 불 세기가 없습니다. 임의의 공통 불 세기를 정하지 않았습니다.')
 if not re.search(r'\d+\s*(?:시간|분|초)',whole) and re.search(r'볶|굽|삶|끓|튀|찌|찝',whole):notes.append('현재 조리 설명에는 단계별 시간이 없습니다. 재료 크기·기기·익는 상태를 확인해야 합니다.')
 if r.get('servings') is None:notes.append('확인된 단일 인분 수가 없어 자동 분량 환산을 제공하지 않습니다.')
 groups=[x for x in lines if x.startswith('*')];
 if len(groups)>1:notes.append('재료 목록에 여러 준비 배합이 있습니다. 전체 준비량과 한 번에 쓰는 양을 구분하세요.')
 if r.get('preparations'):notes.append('별도로 만들어 쓰는 재료가 있습니다. 연결된 준비 레시피와 사용량을 먼저 확인하세요.')
 r['cooking_preflight']={'checked_on':'2026-10-14','review_kind':'source_identity_and_existing_instruction_scan','limits':notes,'unspecified_ingredients':uncertain,'existing_step_cues':details}
 out.append({'id':r['id'],'name':r['names']['ko'],'source_identity_verified':True,'manual_instruction_rewrite':False,'unspecified_ingredient_lines':len(uncertain),'step_cue_rows':len(details),'limits':notes})
report={'checked_on':'2026-10-14','target':100,'reviewed':len(out),'note':'Source identity and existing instruction coverage review; does not certify beginner completeness or replace manual section comparison.','items':out}
(root/'data/recipe-batch100-review-20261014.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');d['version']='1.49.0';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('Reviewed 100 sources and existing methods; added preflight guidance to 100 recipes. Manual rewrites are separate.')
