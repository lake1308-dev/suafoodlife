"""Inventory remaining RDA rows without changing live foods or allergens."""
import collections, gzip, hashlib, json, math, sys
from pathlib import Path
import openpyxl
root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
connected = set()
paths = [root/'data/rda-basic-1000.json.gz', root/'data/rda-foods-1001-2000.json.gz']
paths += sorted((root/'data').glob('rda-foods-2001-2500-p*.json.gz'))
for path in paths:
    data = json.load(gzip.open(path))
    connected.update(x['sources'][0]['source_record_id'] for x in data['ingredients'])
assert len(connected) == 2500
wb = openpyxl.load_workbook(source, read_only=True, data_only=True)
lookup = {r[0]: (r[1], r[2]) for r in list(wb['부록2)식품코드,국문명,영문명,학명 정보 '].values)[1:]}
counts = collections.Counter()
records = []
seen = set()
for rownum, row in enumerate(wb['국가표준식품성분 Database 10.4'].values, 1):
    if rownum < 4 or not isinstance(row[0], (int, float)): continue
    counts['source_rows'] += 1
    code, name = lookup[int(row[0])]
    assert name == row[3]
    assert code not in seen
    seen.add(code)
    if code in connected:
        counts['already_registered'] += 1
        continue
    valid = True
    missing = []
    for field, pos in [('kcal', 5), ('protein_g', 7), ('fat_g', 8), ('carbs_g', 10)]:
        try:
            value = float(row[pos])
            assert math.isfinite(value) and value >= 0
        except (ValueError, TypeError, AssertionError):
            missing.append(field)
            valid = False
    decision = 'reprocess' if valid else 'hold_source_validation'
    counts[decision] += 1
    records.append({'source_row': rownum, 'code': code, 'name': name,
                    'decision': decision, 'missing_core_fields': missing})
wb.close()
assert counts['source_rows'] == 3366
assert counts['already_registered'] == 2500
assert len(records) == 866
report = {'source_filename': source.name,
          'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'counts': dict(counts), 'permanent_exclusions': 0,
          'policy': 'Recommend remaining exact-code RDA records with valid original core nutrition for a subsequent import. Do not infer allergens or collapse different preparations by name.',
          'records': records}
(root/'data/unregistered-rda-review.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps({k:v for k,v in report.items() if k != 'records'}, ensure_ascii=False), flush=True)
