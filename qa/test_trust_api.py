#!/usr/bin/env python3
"""Feature 2 HTTP checks against the real PHP API in an isolated database.
Only the owner's existing CIN, UDYAM and address are used as positive fixtures.
Malicious/unapproved values are QA-only and are never published.
"""
import copy
import json
import unittest
from hallmark_test_support import IsolatedCMS, ROOT


class TrustAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = (ROOT / 'cms/data/db.json').read_bytes()
        cls.server = IsolatedCMS().__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.server.close()
        assert (ROOT / 'cms/data/db.json').read_bytes() == cls.original

    def setUp(self):
        self.server.reset()
        self.expected = {key: self.server.fixture['settings'][key] for key in ('cin', 'udyam', 'address')}
        self.expected_gstin = self.server.fixture['settings']['gstin']

    def test_public_read_only_allowlist_uses_existing_data(self):
        before = self.server.db_file.read_bytes()
        status, data, headers = self.server.request('trust')
        self.assertEqual(status, 200)
        self.assertEqual(data['business'], self.expected)
        self.assertEqual(data['schemaVersion'], 1)
        self.assertEqual(data['source'], 'store_settings')
        self.assertEqual(data['gstin'], self.expected_gstin)   # owner-confirmed since v105
        self.assertEqual(data['certificates'], [])
        self.assertEqual(data['registryVerification'], {'performed': False, 'checkedAt': None})
        self.assertEqual(set(data), {'schemaVersion', 'source', 'business', 'gstin', 'certificates', 'registryVerification'})
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        self.assertEqual(before, self.server.db_file.read_bytes())

    def test_gstin_is_validated_not_assumed(self):
        for bad in (None, '', 'UNCONFIRMED_QA_ONLY', '08AAICE5666R1Z', '08AAICE5666R1ZPZ',
                    '08AAICE5666R1ZZ', 123456, [], {'gstin': '08AAICE5666R1ZP'}):
            with self.subTest(gstin=bad):
                db = copy.deepcopy(self.server.fixture)
                db['settings']['gstin'] = bad
                self.server.db_file.write_text(json.dumps(db))
                status, data, _ = self.server.request('trust')
                self.assertEqual(status, 200)
                # 08AAICE5666R1ZZ keeps the shape but fails the mod-36 checksum
                self.assertIsNone(data['gstin'])
                self.assertEqual(data['business'], self.expected)
        db = copy.deepcopy(self.server.fixture)
        db['settings']['gstin'] = '  ' + self.expected_gstin.lower() + '\n'
        self.server.db_file.write_text(json.dumps(db))
        status, data, _ = self.server.request('trust')
        self.assertEqual(status, 200)
        self.assertEqual(data['gstin'], self.expected_gstin, 'trimmed/upper-cased like the KYC gate, never rewritten')

    def test_missing_and_malformed_details_do_not_use_fallbacks(self):
        for settings in ({}, None, False, {'cin': [], 'udyam': 'UNCONFIRMED_QA_ONLY', 'address': 123}):
            with self.subTest(settings=settings):
                db = copy.deepcopy(self.server.fixture)
                db['settings'] = settings
                self.server.db_file.write_text(json.dumps(db))
                status, data, _ = self.server.request('trust')
                self.assertEqual(status, 200)
                self.assertEqual(data['business'], {'cin': None, 'udyam': None, 'address': None})
                self.assertEqual(data['gstin'], None)
                self.assertEqual(data['certificates'], [])

    def test_partial_data_is_preserved_not_completed(self):
        db = copy.deepcopy(self.server.fixture)
        db['settings'] = {'cin': self.expected['cin']}
        self.server.db_file.write_text(json.dumps(db))
        status, data, _ = self.server.request('trust')
        self.assertEqual(status, 200)
        self.assertEqual(data['business'], {'cin': self.expected['cin'], 'udyam': None, 'address': None})

    def test_private_unapproved_and_forged_fields_cannot_leak(self):
        db = copy.deepcopy(self.server.fixture)
        db['settings'].update({
            'gstin': 'UNCONFIRMED_QA_ONLY', 'gstApi': {'key': 'QA_PRIVATE_MARKER'},
            'certificates': [{'url': 'https://example.invalid/qa-only.pdf', 'verified': True}],
            'certificateUrl': 'javascript:alert(1)', 'cinVerified': True,
            'udyamVerified': True, 'checkedAt': 'QA_NOT_A_REAL_CHECK_TIME', 'trustScore': 100,
        })
        self.server.db_file.write_text(json.dumps(db))
        status, data, _ = self.server.request('trust')
        self.assertEqual(status, 200)
        self.assertEqual(data['business'], self.expected)
        self.assertIsNone(data['gstin'])
        self.assertEqual(data['certificates'], [])
        for marker in ('QA_PRIVATE_MARKER', 'UNCONFIRMED_QA_ONLY', 'example.invalid', 'javascript:', 'cinVerified', 'trustScore', 'QA_NOT_A_REAL_CHECK_TIME'):
            self.assertNotIn(marker, json.dumps(data))

    def test_request_cannot_change_or_inject_details(self):
        before = self.server.db_file.read_bytes()
        for method in ('POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'):
            status, data, headers = self.server.request('trust', method=method, body={'cin': 'UNCONFIRMED_QA_ONLY'})
            self.assertEqual(status, 405)
            self.assertEqual(headers['Allow'], 'GET')
            self.assertNotIn('business', data)
        status, data, _ = self.server.request('trust?cin=UNCONFIRMED_QA_ONLY&verified=true')
        self.assertEqual(status, 200)
        self.assertEqual(data['business'], self.expected)
        self.assertFalse(data['registryVerification']['performed'])
        self.assertEqual(before, self.server.db_file.read_bytes())

    def test_unreadable_database_is_an_error_not_a_sample_profile(self):
        self.server.db_file.write_text('{invalid QA database')
        before = self.server.db_file.read_bytes()
        status, data, _ = self.server.request('trust')
        self.assertEqual(status, 500)
        self.assertNotIn('business', data)
        self.assertNotIn(self.expected['cin'], json.dumps(data))
        self.assertEqual(before, self.server.db_file.read_bytes())

    def test_reading_trust_does_not_regress_huid_contract(self):
        self.server.request('trust')
        status, data, _ = self.server.request('hallmark/status')
        self.assertEqual(status, 200)
        self.assertFalse(data['automaticLookupAvailable'])
        self.assertFalse(data['verified'])
        self.assertIsNone(data['record'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
