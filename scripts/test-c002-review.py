import importlib.util
import json
from pathlib import Path
import tempfile

spec = importlib.util.spec_from_file_location('c002', Path(__file__).with_name('prepare-c002-review.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

# Synthetic records verify failure handling, not real product declarations.
base = {'PRDLST_REPORT_NO': 'TEST001', 'PRDLST_NM': '테스트제품', 'BSSH_NM': '테스트업체', 'RAWMTRL_NM': '대두', 'RAWMTRL_ORDNO': '1'}
rows = [base, dict(base), {**base, 'RAWMTRL_NM': '혼합간장', 'RAWMTRL_ORDNO': '2'}, {**base, 'BSSH_NM': '다른업체'}, {'PRDLST_REPORT_NO': 'TEST002'}]
result = module.prepare(rows)
assert result['distinct_product_count'] == 1
assert result['identity_conflict_count'] == 1
assert result['rejected_row_count'] == 1
assert result['verified_allergen_declaration_count'] == result['publication_count'] == 0
assert len(result['products'][0]['raw_materials']) == 2
assert result['products'][0]['composition_completeness'] == 'unverified'
assert 'contains' not in result['products'][0]
with tempfile.TemporaryDirectory() as folder:
    path = Path(folder) / 'response.json'
    path.write_text(json.dumps({'C002': {'RESULT': {'CODE': 'INFO-100'}}}))
    try:
        module.load_rows(path)
    except ValueError:
        pass
    else:
        raise AssertionError('Authentication failure must not become an empty successful batch')
    path.write_text(json.dumps({'C002': {'RESULT': {'CODE': 'INFO-000'}, 'row': [base]}}))
    assert len(module.load_rows(path)) == 1
print('PASS C002 grouping, duplicate rows, conflicting identity, missing fields, authentication errors; raw ingredients never become verified allergen labels.')
