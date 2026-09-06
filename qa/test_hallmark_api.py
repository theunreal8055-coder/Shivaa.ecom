#!/usr/bin/env python3
"""Feature 1 HTTP regressions against the real api.php in an isolated database.
Run: python3 qa/test_hallmark_api.py (PHP_BIN may point to php-wasm-cli).
All TST… identifiers and sessions are synthetic QA fixtures, never BIS data.
"""
import json
import unittest
from hallmark_test_support import IsolatedCMS, ROOT, ADMIN_TOKEN, CUSTOMER_TOKEN, ENTRY


class HallmarkAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = (ROOT / 'cms/data/db.json').read_bytes()
        cls.server = IsolatedCMS().__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.server.close()
        assert (ROOT / 'cms/data/db.json').read_bytes() == cls.original, 'Repository DB must never change'

    def setUp(self):
        self.server.reset()
        self.pid, self.other = self.server.ids[:2]
        self.path = f'admin/products/{self.pid}/hallmark'

    def request(self, path, **kwargs):
        return self.server.request(path, **kwargs)

    def save(self, entries=None, revision=0, **kwargs):
        return self.request(self.path, method='PUT', token=ADMIN_TOKEN,
                            body={'entries': [ENTRY] if entries is None else entries, 'expectedRevision': revision}, **kwargs)

    def test_status_is_never_connected_or_verified(self):
        status, data, headers = self.request('hallmark/status')
        self.assertEqual(status, 200)
        self.assertEqual(data['mode'], 'official_handoff')
        self.assertFalse(data['automaticLookupAvailable'])
        for key in ('source', 'record', 'checkedAt'):
            self.assertIsNone(data[key])
        self.assertFalse(data['verified'])
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertEqual(data['officialLinks']['bisCare'], 'https://www.bis.gov.in/bis-apps/?lang=en')

    def test_normalisation_does_not_verify_or_persist_anything(self):
        before = self.server.db_file.read_bytes()
        status, data, headers = self.request('hallmark/lookup', method='POST', body={'huid': ' \ttst0a1\r\n'})
        self.assertEqual(status, 503)
        self.assertEqual(data['huid'], 'TST0A1')
        self.assertTrue(data['formatValid'])
        self.assertFalse(data['verified'])
        self.assertEqual(data['status'], 'unavailable')
        self.assertIsNone(data['record'])
        self.assertIsNone(data['checkedAt'])
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertEqual(before, self.server.db_file.read_bytes())

    def test_checks_do_not_require_a_database(self):
        self.server.db_file.unlink()
        try:
            self.assertEqual(self.request('hallmark/status')[0], 200)
            self.assertEqual(self.request('hallmark/lookup', method='POST', body={'huid': ENTRY['huid']})[0], 503)
        finally:
            self.server.reset()

    def test_bad_inputs_and_method_restrictions(self):
        for value in ('', 'TST01', 'TST0A12', 'TST 01', 'TST-01', '<svg/>', 'ＴST0A1', 'TSTß1', None, 123456, True, ['TST0A1'], {'code': 'TST0A1'}):
            with self.subTest(value=value):
                status, data, _ = self.request('hallmark/lookup', method='POST', body={'huid': value})
                self.assertEqual(status, 422)
                self.assertFalse(data['verified'])
        for body in ({}, {'huid': 'TST0A1', 'verified': True}, {'huid': 'TST0A1', 'source': 'BIS'}):
            self.assertEqual(self.request('hallmark/lookup', method='POST', body=body)[0], 400)
        for raw in (b'{', b'[]', b'null', b'false', b'"TST0A1"'):
            self.assertEqual(self.request('hallmark/lookup', method='POST', raw=raw)[0], 400)
        self.assertEqual(self.request('hallmark/lookup', method='POST', raw=b'x' * 1025)[0], 413)
        self.assertEqual(self.request('hallmark/lookup', method='POST', raw=b'huid=TST0A1', content_type='application/x-www-form-urlencoded')[0], 415)
        for method in ('GET', 'PUT', 'DELETE'):
            status, _, headers = self.request('hallmark/lookup', method=method)
            self.assertEqual(status, 405)
            self.assertEqual(headers['Allow'], 'POST')
        self.assertEqual(self.request('hallmark/status', method='POST', body={})[0], 405)

    def test_staff_routes_require_admin(self):
        for token in (None, CUSTOMER_TOKEN):
            self.assertEqual(self.request(self.path, token=token)[0], 403)
            self.assertEqual(self.request(self.path, method='PUT', token=token, body={'entries': [ENTRY], 'expectedRevision': 0})[0], 403)
        self.assertEqual(self.request(self.path, token=ADMIN_TOKEN)[1]['hallmark']['entries'], [])
        self.assertEqual(self.request('admin/products/missing/hallmark', token=ADMIN_TOKEN)[0], 404)

    def test_staff_save_public_projection_and_removal(self):
        status, data, _ = self.save()
        self.assertEqual(status, 200)
        self.assertEqual(data['hallmark']['entries'][0], ENTRY)
        self.assertFalse(data['product']['hallmark']['verified'])
        db = json.loads(self.server.db_file.read_text())
        stored = db['products'][0]['hallmark']
        self.assertEqual(stored['provenance'], 'staff_entered')
        self.assertEqual(stored['updatedBy'], 'qa_admin')
        self.assertNotIn('verified', stored)
        db['users'][1]['wishlist'] = [self.pid]
        self.server.db_file.write_text(json.dumps(db))
        for path, token in (('products', None), (f'products/{self.pid}', None), (f'products/{self.other}', None), ('wishlist', CUSTOMER_TOKEN)):
            status, public, _ = self.request(path, token=token)
            self.assertEqual(status, 200)
            self.assertNotIn('sourceNote', json.dumps(public))
            self.assertNotIn(ENTRY['sourceNote'], json.dumps(public))
            self.assertNotIn('qa_admin', json.dumps(public))
        status, cleared, _ = self.save(entries=[], revision=1)
        self.assertEqual(status, 200)
        self.assertEqual(cleared['product']['hallmark']['status'], 'not_provided')
        self.assertEqual(cleared['hallmark']['revision'], 2)
        self.assertEqual(cleared['hallmark']['entries'], [])
        self.assertEqual(list(self.server.db_file.parent.glob('db.json.huid.*')), [])

    def test_conflicts_validation_and_generic_write_bypass(self):
        self.assertEqual(self.save()[0], 200)
        before = self.server.db_file.read_bytes()
        self.assertEqual(self.save(entries=[], revision=0)[0], 409)
        self.assertEqual(self.request(f'admin/products/{self.other}/hallmark', method='PUT', token=ADMIN_TOKEN, body={'entries': [ENTRY], 'expectedRevision': 0})[0], 409)
        for entries in ([ENTRY, ENTRY], [{**ENTRY, 'sourceNote': ''}], [{**ENTRY, 'verified': True}], [ENTRY] * 51, 'TST0A1'):
            self.assertIn(self.save(entries=entries, revision=1)[0], (409, 422))
        for field in ('hallmark', 'huid', 'HUID', 'bisVerified', 'hallmarkStatus'):
            for method, path in (('PUT', f'products/{self.pid}'), ('POST', 'products')):
                self.assertEqual(self.request(path, method=method, token=ADMIN_TOKEN, body={field: {'verified': True}})[0], 422)
        self.assertEqual(self.server.db_file.read_bytes(), before)
        self.assertEqual(self.request('products/missing', method='PUT', token=ADMIN_TOKEN, body={'name': 'QA only'})[0], 404)

    def test_legacy_verified_flags_are_not_evidence(self):
        db = json.loads(self.server.db_file.read_text())
        db['products'][0].update({'huid': 'TST0A1', 'bisVerified': True, 'hallmark': {'verified': True, 'record': {'source': 'forged'}}})
        self.server.db_file.write_text(json.dumps(db))
        product = self.request(f'products/{self.pid}')[1]['product']
        self.assertEqual(product['hallmark']['status'], 'not_provided')
        self.assertFalse(product['hallmark']['verified'])
        self.assertEqual(product['hallmark']['entries'], [])
        self.assertNotIn('huid', product)
        self.assertNotIn('bisVerified', product)
        self.assertTrue(self.request(self.path, token=ADMIN_TOKEN)[1]['hallmark']['needsReview'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
