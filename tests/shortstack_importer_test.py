"""Golden cells read visually from the pinned, personal-study PDF."""
import json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
@unittest.skipUnless(os.environ.get('POKER_RC40_PDF'),'personal PDF not supplied')
class ShortstackImportTest(unittest.TestCase):
 def test_imports_actions_and_excluded_arrival_hands(self):
  with tempfile.TemporaryDirectory(prefix='poker-rc40-') as output:
   run=subprocess.run([sys.executable,str(ROOT/'scripts/install-shortstack.py'),os.environ['POKER_RC40_PDF'],output],capture_output=True,text=True)
   self.assertEqual(run.returncode,0,run.stderr)
   data=json.loads((Path(output)/'shortstack.json').read_text())
   order=json.loads((Path(output)/'shortstack-manifest.json').read_text())['order']
   self.assertEqual(len(data['nodes']),35)
   def weight(node,token,hand):
    return next(a for a in data['nodes'][node] if a['token']==token)['weights'][order.index(hand)]
   self.assertEqual(weight('UTG|','RFI','AA'),10000)
   self.assertEqual(weight('UTG|','RFI','72o'),0)
   self.assertEqual(weight('UTG|','RFI','K6s'),5000)
   self.assertEqual(weight('UTG|','RFI','QJo'),5000)
   self.assertEqual(weight('BB|SB_RFI','allin','AQo'),5000)
   self.assertEqual(weight('UTG|UTG_RFI_BU_3bet','4bet','ATs'),5000)
   self.assertFalse(data['coverage']['UTG|UTG_RFI_CO_3bet'][order.index('72o')])
   self.assertTrue(data['coverage']['BB|SB_RFI'][order.index('72o')])
   self.assertEqual(next(a for a in data['nodes']['SB|UTG_RFI'] if a['token']=='3bet')['bb'],8)
   self.assertEqual(next(a for a in data['nodes']['SB|BU_RFI'] if a['token']=='3bet')['bb'],7)
if __name__=='__main__':unittest.main()
