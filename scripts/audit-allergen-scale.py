"""Audit source readiness; never infer allergens from product names or nutrients."""
import gzip
import json
from pathlib import Path
from time import perf_counter

ROOT = Path(__file__).resolve().parents[1]
started = perf_counter()
manifest = json.loads((ROOT / 'data/catalog-manifest.json').read_text())
targets = []
seen = set()
for chunk in manifest['chunks']:
    # Imported-source batches remain outside the domestic-first review scope.
    if 'imported' in chunk['path']:
        continue
    with gzip.open(ROOT / chunk['path'], 'rt') as handle:
        data = json.load(handle)
    columns = data['columns']
    for values in data['rows']:
        record = dict(zip(columns, values))
        if record['type'] != '가공식품' or record['code'] in seen:
            continue
        seen.add(record['code'])
        targets.append({
            'source_record_id': record['code'],
            'product_name': record['name'],
            'manufacturer': record.get('manufacturer'),
            'declared_weight': record.get('declared_weight'),
            'source_file': chunk['path'],
            'source_columns': columns,
            'label_verification_status': 'pending_external_label',
            'reason': 'nutrition_source_has_no_product_allergen_declaration_or_cross_contact_notice',
            'recipe_status': 'not_reviewed',
        })
        if len(targets) == 1000:
            break
    if len(targets) == 1000:
        break
assert len(targets) == 1000
assert all(not any('allerg' in c.lower() or '알레르기' in c or '원재료' in c for c in r['source_columns']) for r in targets)
report = {
    'reviewed_on': '2026-10-08',
    'audit_kind': 'existing_nutrition_source_readiness_only',
    'source_records_inspected': len(targets),
    'new_allergen_declarations_verified': 0,
    'new_recipes_verified': 0,
    'pending_external_label_count': len(targets),
    'prior_batch_separate_from_this_audit': {'reviewed': 50, 'contains_confirmed': 41, 'contains_unverified': 9},
    'scaling_decision': 'Do not expand verified-allergen publication to 10000 or 100000 without product-specific label data.',
    'candidate_primary_source': 'https://www.data.go.kr/data/15062098/openapi.do',
    'primary_source_note': 'Product manufacturing reports include ingredients; availability of actual allergen declarations and facility notices still requires verification.',
    'targets': targets,
}
output = ROOT / 'data/allergen-source-readiness-1000-20261008.json'
output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'source_records_inspected': 1000, 'new_allergen_declarations_verified': 0, 'pending_external_label_count': 1000, 'seconds': round(perf_counter()-started, 2)}, ensure_ascii=False))
