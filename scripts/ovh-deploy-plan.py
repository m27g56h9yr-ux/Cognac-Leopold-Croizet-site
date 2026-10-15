#!/usr/bin/env python3
"""Plan content-based uploads; an absent/invalid baseline forces the old full mirror."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import sys

MANIFEST = '.ovh-deploy-manifest.json'
PROTECTED = re.compile(r'(^|/)(\.git|\.github|newsletter-data|conversion-data|partner-data)(/|$)|(^|/)(newsletter-config\.php|conversion-config\.php|salon-config\.php|wp-config\.php|config\.php|config\..*|.*\.config\..*|\.htpasswd|\.user\.ini|php\.ini|\.env.*|.*\.env|.*\.local|.*\.pem|.*\.key|id_rsa.*|.*private.*)$')


def safe_path(value):
    path = PurePosixPath(value)
    if (not value or path.is_absolute() or '..' in path.parts
            or value != path.as_posix() or any(c in value for c in '\n\r\x00"\'\\$`;')
            or value == MANIFEST or PROTECTED.search(value)):
        raise ValueError('Unsafe deployment path: ' + repr(value))
    return value


def quote(value):
    if any(c in value for c in '\n\r\x00"\\$`'):
        raise ValueError('Unsafe command argument')
    return '"' + value + '"'


def plan(bundle, baseline, target, site, output, delete=False, force=False):
    if target != '.':
        safe_path(target)
    files = {}
    for file in sorted(bundle.rglob('*')):
        if file.is_symlink():
            raise ValueError('Symlinks are not supported: ' + str(file))
        if file.is_file():
            name = safe_path(file.relative_to(bundle).as_posix())
            files[name] = hashlib.sha256(file.read_bytes()).hexdigest()
    if 'index.html' not in files or '.htaccess' not in files:
        raise ValueError('Bundle must contain index.html and .htaccess')
    previous = None
    if not force:
        try:
            data = json.loads(baseline.read_text())
            assert data['version'] == 1 and data['site'] == site
            previous = data['files']
            assert isinstance(previous, dict) and 'index.html' in previous and '.htaccess' in previous
            for name, digest in previous.items():
                safe_path(name)
                assert isinstance(digest, str) and re.fullmatch('[a-f0-9]{64}', digest)
        except (OSError, ValueError, KeyError, AssertionError, TypeError):
            previous = None
    changed = [name for name in files if previous is None or previous.get(name) != files[name]]
    removed = sorted(set(previous or {}) - set(files)) if delete and previous is not None else []
    commands = []
    for name in removed:
        commands.append('rm -f ' + quote(target + '/' + name))
    parents = sorted({str(PurePosixPath(name).parent) for name in changed} - {'.'})
    for parent in parents:
        commands.append('mkdir -p ' + quote(target + '/' + parent))
    for name in changed:
        commands.append('put ' + quote(str(bundle / name)) + ' -o ' + quote(target + '/' + name))
    output.write_text('\n'.join(commands) + '\n')
    manifest = {'version': 1, 'site': site, 'commit': os.environ.get('GITHUB_SHA', ''), 'files': files}
    output.with_suffix('.json').write_text(json.dumps(manifest, sort_keys=True) + '\n')
    mode = 'full' if previous is None else 'incremental'
    print(f'{mode}: {len(changed)}/{len(files)} files, {len(removed)} removals', file=sys.stderr)
    return mode


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--target', required=True)
    parser.add_argument('--site', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--delete', action='store_true')
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    print(plan(args.bundle.resolve(), args.baseline, args.target, args.site, args.output, args.delete, args.force))
