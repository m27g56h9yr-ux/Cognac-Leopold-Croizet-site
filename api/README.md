# Newsletter endpoint

This static site cannot write directly to GitHub from the browser without exposing a secret token. On OVH, copy `newsletter-config.sample.php` to `newsletter-config.php`, keep that file private, and set a fine-grained GitHub token with write access to the target repository.

Expected private config:

```php
<?php
return [
    'github_owner' => 'm27g56h9yr-ux',
    'github_repo' => 'maison-des-pierres',
    'github_branch' => 'main',
    'github_path' => 'newsletter/subscribers.csv',
    'github_token' => 'github_pat_xxx',
    'hash_secret' => 'a-long-random-secret',
];
```

The endpoint appends subscribers to a CSV file through the GitHub Contents API and stores IP/user-agent only as hashes.
