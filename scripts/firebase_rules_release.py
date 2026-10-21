"""Inspect/publish one approved rules file; never access application records."""
import hashlib
import json
import os
from pathlib import Path
import urllib.request

PROJECT = 'hogeterpjes'
ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    'firestore': ('firestore.rules', 'cloud.firestore'),
    'storage': ('storage.rules', 'firebase.storage/hogeterpjes.firebasestorage.app'),
}


def api(method, resource, body=None):
    request = urllib.request.Request(
        'https://firebaserules.googleapis.com/v1/' + resource,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization': 'Bearer ' + os.environ['ACCESS_TOKEN'],
                 'Content-Type': 'application/json'}, method=method)
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def run(mode, target, expected_sha='', expected_live=''):
    if mode not in ('inspect', 'publish') or target not in TARGETS:
        raise ValueError('Invalid mode or target')
    filename, release_id = TARGETS[target]
    content = (ROOT / filename).read_text()
    digest = hashlib.sha256(content.encode()).hexdigest()
    release = f'projects/{PROJECT}/releases/{release_id}'
    if mode == 'publish' and (expected_sha != digest or not expected_live):
        raise ValueError('Publish requires the exact approved file hash and live ruleset')
    old = api('GET', release)['rulesetName']
    files = api('GET', old)['source']['files']
    same = len(files) == 1 and files[0]['content'] == content
    lines = [f'Target: {target}', f'Rules SHA256: `{digest}`',
             f'Current live ruleset: `{old}`', f'Exact contents match live: {same}']
    if mode == 'publish':
        if old != expected_live:
            raise ValueError('Live rules changed; inspect and review again')
        if same:
            lines.append('Already current; no changes made.')
        else:
            new = api('POST', f'projects/{PROJECT}/rulesets', {
                'source': {'files': [{'name': filename, 'content': content}]}})['name']
            if api('GET', release)['rulesetName'] != old:
                raise ValueError('Concurrent publication detected; release not updated')
            api('PATCH', release, {'release': {'name': release, 'rulesetName': new},
                                   'updateMask': 'ruleset_name'})
            if api('GET', release)['rulesetName'] != new:
                raise RuntimeError('Release verification failed; inspect current release')
            lines += [f'Published ruleset: `{new}`', f'Previous ruleset retained: `{old}`']
    else:
        lines.append('Read-only inspection: no rules or application data changed.')
    summary = '\n\n'.join(lines) + '\n'
    print(summary)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as output:
            output.write(summary)
    return lines


if __name__ == '__main__':
    run(os.environ.get('RELEASE_MODE', 'inspect'), os.environ.get('RULES_TARGET', 'firestore'),
        os.environ.get('EXPECTED_RULES_SHA256', ''), os.environ.get('EXPECTED_LIVE_RULESET', ''))
