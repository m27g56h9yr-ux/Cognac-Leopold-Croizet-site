#!/usr/bin/env python3
"""HTTP and storage integration tests; exclusively synthetic contacts, isolated temp store."""
from concurrent.futures import ThreadPoolExecutor
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import secrets
import socket
import signal
import sqlite3
import stat
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('PHP_BINARY', 'php')
VERSION = 'salon-contact-2026-10-15-v6'
checks = 0

def check(value, label):
    global checks
    assert value, label
    checks += 1

with tempfile.TemporaryDirectory(prefix='lc-salon-test-') as temp:
    private = Path(temp) / 'private'
    admin = secrets.token_hex(32)
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    env = dict(os.environ, LC_SALON_PRIVATE_DIR=str(private), LC_SALON_TEST_MODE='1', LC_SALON_ADMIN_HASH=hashlib.sha256(admin.encode()).hexdigest(), PHP_CLI_SERVER_WORKERS='4')
    log = open(Path(temp) / 'server.log', 'wb')
    server = subprocess.Popen([PHP, '-S', f'127.0.0.1:{port}', '-t', str(ROOT)], env=env, stdout=log, stderr=log, start_new_session=True)
    def http(path='/api/salon-contact.php', body=None, origin=base, method=None, auth=False, content='application/json'):
        headers = {'Origin': origin, 'Content-Type': content}
        if auth: headers['Authorization'] = 'Bearer ' + admin
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(base + path, data=data, headers=headers, method=method)
        try:
            response = urllib.request.urlopen(req, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read().decode()
        return response.status, json.loads(raw) if 'application/json' in response.headers.get('Content-Type', '') else raw, response.headers
    def send(body, **kwargs):
        code, result, _ = http()
        check(code == 200 and result['ok'], 'challenge available')
        body = dict(body, challenge=result['challenge'])
        return http(body=body, **kwargs)
    def signup(**kw):
        return dict(action='subscribe', consent_version=VERSION, **kw)
    def counts():
        code, result, _ = http('/api/salon-admin.php', auth=True)
        check(code == 200, 'private read-back')
        return result['counts']
    try:
        for i in range(100):
            try:
                code, data, headers = http('/api/salon-contact.php?action=health')
                break
            except (OSError, urllib.error.URLError): time.sleep(.05)
        check(code == 200 and data['status'] == 'ready', 'health')
        check('no-store' in headers['Cache-Control'], 'no caching')
        db = sqlite3.connect(private / 'consents.sqlite')
        check(stat.S_IMODE(private.stat().st_mode) == 0o700, 'private directory mode')
        check(stat.S_IMODE((private / 'master.key').stat().st_mode) == 0o600, 'key mode')
        check(stat.S_IMODE((private / 'consents.sqlite').stat().st_mode) == 0o600, 'database mode')
        check(http('/api/salon-admin.php')[0] == 401, 'admin needs authentication')
        check(send(signup(consent_sms=False, consent_email=False))[1]['status'] == 'consent_required', 'no implicit consent')
        check(send(signup(consent_sms='true', phone='0612345678'))[1]['status'] == 'consent_required', 'strict boolean consent')
        check(send(signup(consent_sms=True, phone='0123456789'))[1]['status'] == 'invalid_sms', 'landline rejected')
        check(send(signup(consent_email=True, email='bad'))[1]['status'] == 'invalid_email', 'email invalid')
        # Reset the isolated test rate buckets between groups, not in the application.
        db.execute('DELETE FROM limits'); db.commit()
        check(send(signup(consent_email=True, email='test@example.com'), origin='https://evil.example')[0] == 403, 'cross origin rejected')
        check(send(dict(signup(consent_email=True, email='test@example.com'), company_url='bot'))[0] == 422, 'honeypot')
        check(http(body={}, content='text/plain')[0] == 415, 'json only')
        check(http(body={'x': 'a' * 9000})[0] == 413, 'body bounded')
        check(http(method='DELETE')[0] == 405, 'method bounded')
        check(send(dict(signup(consent_email=True, email='test@example.com'), consent_version='old'))[0] == 409, 'version exact')
        check(http(body=signup(consent_email=True, email='test@example.com'))[0] == 400, 'challenge required')
        code, saved, _ = send(signup(consent_sms=True, phone='06 12 34 56 78', email='discard@example.com'))
        check(code == 200 and saved['status'] == 'saved', 'sms alone')
        check(counts()['active_sms'] == 1 and counts()['active_email'] == 0, 'unchecked email not saved')
        code, saved, _ = send(signup(consent_email=True, email='Both@Example.com', consent_sms=True, phone='+33 6 98 76 54 32'))
        check(code == 200, 'both channels')
        token = saved['manage_url'].split('#')[1]
        check('example.com' not in token and '698765432' not in token, 'opaque link')
        check(send({'action':'inspect', 'token':token})[1]['channels'] == [{'channel':'sms','state':'active'},{'channel':'email','state':'active'}], 'independent read-back')
        check(send({'action':'inspect', 'token':token + 'x'})[0] == 400, 'token tampering')
        code, _, _ = send({'action':'withdraw', 'token':token, 'channels':['sms']})
        check(code == 200, 'withdraw sms')
        check(counts()['active_sms'] == 1 and counts()['active_email'] == 1, 'email stays active')
        check(send({'action':'withdraw', 'token':token, 'channels':['sms']})[0] == 200, 'withdraw idempotent')
        check(send({'action':'withdraw', 'email':'both@example.com', 'channels':['email']})[0] == 200, 'lost-link opposition')
        check(counts()['active_email'] == 0, 'email removed')
        check(send({'action':'withdraw', 'email':'unknown@example.com', 'channels':['email']})[1] == {'ok':True,'status':'withdrawn'}, 'no registration enumeration')
        db.execute('DELETE FROM limits'); db.commit()
        code, saved, _ = send(signup(consent_email=True, email='single@example.com', phone='0677777777'))
        check(code == 200, 'email alone')
        check(counts()['active_sms'] == 1, 'unchecked phone not saved')
        # A used nonce cannot be replayed.
        challenge = http()[1]['challenge']
        payload = dict(signup(consent_email=True, email='single@example.com'), challenge=challenge)
        check(http(body=payload)[0] == 200, 'repeat explicit consent deduplicated')
        check(http(body=payload)[0] == 409, 'replay denied')
        check(counts()['active_email'] == 1, 'dedup by channel')
        code, exported, _ = http('/api/salon-admin.php?format=csv', auth=True)
        records = list(csv.DictReader(io.StringIO(exported)))
        check(code == 200 and len(records) == 2, 'only active contacts exported')
        check(all(r['adult_confirmed'] == '' for r in records), 'no fabricated adult confirmation')
        check(all(r['consent_text'].startswith('Je souhaite recevoir') for r in records), 'new explicit consent wording retained')
        check(all(r['contact'] != 'both@example.com' for r in records), 'withdrawn absent from export')
        check(all(r['unsubscribe_url'].startswith('https://cognac-leopold-croizet.com/salon/desinscription/#') for r in records), 'campaign links per channel')
        check(any(r['contact'].startswith("'+33") for r in records), 'csv formula protection')
        raw = (private / 'consents.sqlite').read_bytes()
        for value in [b'0612345678', b'+33612345678', b'both@example.com', b'single@example.com', b'discard@example.com', b'127.0.0.1']:
            check(value not in raw, 'no clear coordinates or raw ip')
        check(db.execute('SELECT count(*) FROM consent_events').fetchone()[0] >= 8, 'dated consent and withdrawal proofs')
        check(db.execute('SELECT count(*) FROM contacts WHERE state="withdrawn" AND cipher!=""').fetchone()[0] == 0, 'withdrawal erases payload')
        db.execute('DELETE FROM limits'); db.commit()
        with ThreadPoolExecutor(max_workers=4) as pool:
            answers = list(pool.map(lambda _: send(signup(consent_email=True, email='concurrent@example.com'))[0], range(4)))
        check(answers == [200]*4, 'concurrent submissions succeed')
        check(db.execute('SELECT count(*) FROM contacts WHERE channel="email" AND state="active"').fetchone()[0] == 2, 'concurrent deduplication')
        db.execute('UPDATE contacts SET expires_at="2000-01-01T00:00:00+00:00" WHERE state="active"'); db.commit()
        check(counts()['active_sms'] == 0 and counts()['active_email'] == 0, 'expiry excludes contacts')
        check(db.execute('SELECT count(*) FROM contacts WHERE cipher!=""').fetchone()[0] == 0, 'expiry erases payload')
        db.execute('UPDATE contacts SET expires_at="2000-01-01T00:00:00+00:00"'); db.execute('UPDATE consent_events SET expires_at="2000-01-01T00:00:00+00:00"'); db.commit()
        counts()
        check(db.execute('SELECT count(*) FROM contacts').fetchone()[0] == 0, 'opposition expiry purge')
        check(db.execute('SELECT count(*) FROM consent_events').fetchone()[0] == 0, 'proof expiry purge')
        db.execute('DELETE FROM limits'); db.commit()
        for i in range(13): code, result, _ = send(signup(consent_email=False))
        check(code == 429 and result['status'] == 'rate_limited', 'anti-abuse limit enforced')
        db.close()
        print(f'Salon endpoint: {checks} checks passed; isolated data removed, no messages sent.')
    finally:
        os.killpg(server.pid, signal.SIGTERM); server.wait(timeout=10); log.close()
