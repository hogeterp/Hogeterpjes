"""Only mocked APIs: no credentials or Firebase access."""
import contextlib
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import unittest
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('release', Path(__file__).resolve().parents[2] / 'scripts/firebase_rules_release.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
OLD = 'projects/hogeterpjes/rulesets/old'
NEW = 'projects/hogeterpjes/rulesets/new'


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.output = contextlib.redirect_stdout(io.StringIO())
        self.output.__enter__()
        self.env = patch.dict(os.environ, {}, clear=True)
        self.env.start()
        self.sha = hashlib.sha256((m.ROOT / 'firestore.rules').read_text().encode()).hexdigest()
        self.live = {'source': {'files': [{'content': 'old rules'}]}}

    def tearDown(self):
        self.env.stop()
        self.output.__exit__(None, None, None)

    def test_inspect_both_targets_uses_only_get(self):
        for target, (_, release) in m.TARGETS.items():
            with self.subTest(target=target), patch.object(m, 'api', side_effect=[{'rulesetName': OLD}, self.live]) as api:
                m.run('inspect', target)
                self.assertEqual([c.args[0] for c in api.call_args_list], ['GET', 'GET'])
                self.assertEqual(api.call_args_list[0].args[1], 'projects/hogeterpjes/releases/' + release)

    def test_bad_inputs_never_call_api(self):
        for args in [('wrong', 'firestore'), ('inspect', 'wrong'), ('publish', 'firestore'),
                     ('publish', 'firestore', 'wrong', OLD), ('publish', 'firestore', self.sha, '')]:
            with self.subTest(args=args), patch.object(m, 'api') as api:
                with self.assertRaises(ValueError): m.run(*args)
                api.assert_not_called()

    def test_changed_live_rules_prevent_writes(self):
        with patch.object(m, 'api', side_effect=[{'rulesetName': NEW}, self.live]) as api:
            with self.assertRaises(ValueError): m.run('publish', 'firestore', self.sha, OLD)
            self.assertEqual([c.args[0] for c in api.call_args_list], ['GET', 'GET'])

    def test_identical_rules_skip_writes(self):
        live = {'source': {'files': [{'content': (m.ROOT / 'firestore.rules').read_text()}]}}
        with patch.object(m, 'api', side_effect=[{'rulesetName': OLD}, live]) as api:
            m.run('publish', 'firestore', self.sha, OLD)
            self.assertEqual([c.args[0] for c in api.call_args_list], ['GET', 'GET'])

    def test_publish_updates_only_selected_release(self):
        for target, (filename, release) in m.TARGETS.items():
            sha = hashlib.sha256((m.ROOT / filename).read_text().encode()).hexdigest()
            with self.subTest(target=target), patch.object(m, 'api', side_effect=[{'rulesetName': OLD}, self.live,
                 {'name': NEW}, {'rulesetName': OLD}, {}, {'rulesetName': NEW}]) as api:
                m.run('publish', target, sha, OLD)
                self.assertEqual([c.args[0] for c in api.call_args_list], ['GET', 'GET', 'POST', 'GET', 'PATCH', 'GET'])
                self.assertEqual(api.call_args_list[4].args[1], 'projects/hogeterpjes/releases/' + release)
                self.assertEqual(api.call_args_list[2].args[2]['source']['files'][0]['name'], filename)

    def test_race_prevents_release_update(self):
        with patch.object(m, 'api', side_effect=[{'rulesetName': OLD}, self.live, {'name': NEW}, {'rulesetName': NEW}]) as api:
            with self.assertRaises(ValueError): m.run('publish', 'firestore', self.sha, OLD)
            self.assertNotIn('PATCH', [c.args[0] for c in api.call_args_list])

    def test_compile_failure_prevents_release_update(self):
        with patch.object(m, 'api', side_effect=[{'rulesetName': OLD}, self.live, RuntimeError('compile failed')]) as api:
            with self.assertRaises(RuntimeError): m.run('publish', 'firestore', self.sha, OLD)
            self.assertNotIn('PATCH', [c.args[0] for c in api.call_args_list])

    def test_release_is_verified(self):
        with patch.object(m, 'api', side_effect=[{'rulesetName': OLD}, self.live, {'name': NEW}, {'rulesetName': OLD}, {}, {'rulesetName': OLD}]):
            with self.assertRaises(RuntimeError): m.run('publish', 'firestore', self.sha, OLD)


if __name__ == '__main__': unittest.main()
