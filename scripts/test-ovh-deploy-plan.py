import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('planner',str(Path(__file__).with_name('ovh-deploy-plan.py')))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class PlannerTest(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
  self.root=Path(self.tmp.name);self.bundle=self.root/'bundle';self.bundle.mkdir()
  for name,data in [('index.html','one'),('.htaccess','deny'),('asset.css','red')]: (self.bundle/name).write_text(data)
  self.old=self.root/'old.json';self.out=self.root/'plan.lftp'
 def plan(self,**kw): return p.plan(self.bundle,self.old,'.','test',self.out,**kw)
 def baseline(self): self.plan();self.old.write_text(self.out.with_suffix('.json').read_text())
 def test_missing_then_unchanged(self):
  self.assertEqual(self.plan(),'full');self.baseline();self.assertEqual(self.plan(),'incremental');self.assertEqual(self.out.read_text(),'\n')
 def test_same_size_change_and_revert(self):
  self.baseline();(self.bundle/'asset.css').write_text('tan');self.plan();self.assertIn('asset.css',self.out.read_text());self.assertNotIn('index.html',self.out.read_text())
  self.old.write_text(self.out.with_suffix('.json').read_text());(self.bundle/'asset.css').write_text('red');self.plan();self.assertIn('asset.css',self.out.read_text())
 def test_removal_policy(self):
  self.baseline();(self.bundle/'asset.css').unlink();self.plan();self.assertNotIn('rm -f',self.out.read_text());self.plan(delete=True);self.assertIn('rm -f "./asset.css"',self.out.read_text())
 def test_corrupt_or_foreign_baseline(self):
  self.old.write_text('{');self.assertEqual(self.plan(),'full');self.baseline();v=json.loads(self.old.read_text());v['site']='other';self.old.write_text(json.dumps(v));self.assertEqual(self.plan(),'full')
 def test_force_repairs_unchanged(self):
  self.baseline();self.assertEqual(self.plan(force=True),'full')
 def test_protected_and_injected_paths(self):
  for name in ['../x','/x','newsletter-data/x.csv','api/salon-config.php','.env','x\nbye','x";rm -r .','a/./b']:
   with self.subTest(name=name),self.assertRaises(ValueError):p.safe_path(name)
 def test_symlink_rejected(self):
  (self.bundle/'link').symlink_to(self.bundle/'index.html')
  with self.assertRaises(ValueError):self.plan()
 def test_bad_baseline_falls_back_before_deletion(self):
  self.baseline();v=json.loads(self.old.read_text());v['files']['api/salon-config.php']='a'*64;self.old.write_text(json.dumps(v));self.assertEqual(self.plan(delete=True),'full');self.assertNotIn('rm -f',self.out.read_text())
unittest.main()
