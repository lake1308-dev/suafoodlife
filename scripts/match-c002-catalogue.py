"""Match audited nutrition targets to C002 candidates without publishing claims."""
import argparse,csv,gzip,json,re
from collections import Counter,defaultdict
from pathlib import Path

def normalized(value):
    # Whitespace normalization only: brand, factory and product qualifiers stay.
    return re.sub(r'\s+', '', value or '').casefold()

def match(source, targets):
    wanted={normalized(t['product_name']) for t in targets}
    index=defaultdict(list)
    with gzip.open(source,'rt',encoding='utf-8-sig',newline='') as stream:
        for row in csv.DictReader(stream):
            name=normalized(row['PRDLST_NM'])
            if name in wanted:
                index[name].append({k:row[k] for k in ('PRDLST_REPORT_NO','PRDLST_NM','BSSH_NM','RAWMTRL_NM','CHNG_DT','ETQTY_XPORT_PRDLST_YN')})
    results=[]
    for target in targets:
        candidates=index[normalized(target['product_name'])]
        exact=[r for r in candidates if normalized(r['BSSH_NM'])==normalized(target['manufacturer'])]
        status=('unique_name_and_maker_candidate' if len(exact)==1 else 'multiple_name_and_maker_candidates' if exact else 'name_only_candidates' if candidates else 'no_name_match')
        results.append({**target,'match_status':status,'exact_name_and_maker_count':len(exact),'c002_candidates':candidates,'allergen_declaration_status':'pending_product_label','cross_contact_status':'unverified','publication_status':'held'})
    return {'checked_on':'2026-10-08','target_count':len(targets),'match_counts':dict(Counter(r['match_status'] for r in results)),'new_verified_allergen_count':0,'new_published_count':0,'matching_rules':['Whitespace and case normalization only.','A unique name and manufacturer match remains a candidate: package size and product identity need review.','Name-only matches are never merged.','C002 ingredients do not establish absence of allergens or cross-contact.'],'targets':results}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path);parser.add_argument('targets',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args()
    with gzip.open(args.targets,'rt',encoding='utf-8') as stream:targets=json.load(stream)['targets']
    report=match(args.source,targets)
    with gzip.open(args.output,'wt',encoding='utf-8') as stream:json.dump(report,stream,ensure_ascii=False)
    print(json.dumps({k:v for k,v in report.items() if k!='targets'},ensure_ascii=False))
