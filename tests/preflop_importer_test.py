import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('preflop_importer',Path(__file__).parents[1]/'scripts/install-preflop.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ImporterTest(unittest.TestCase):
    def test_weighted_and_unweighted_combinations_use_full_class_denominator(self):
        result=module.parse_range('[25.00]AsKs, AhKh, AdKd, AcKc[/25.00], AsAd')
        self.assertEqual(result['AKs'],2500)
        self.assertEqual(result['AA'],1667)
        self.assertEqual(result['72o'],0)
    def test_duplicate_or_malformed_combinations_cannot_inflate_source_weights(self):
        for text in ['AsKs, KsAs','[101]AsKs[/101]','[20]AsKs[/30]','AsAs','not-a-range']:
            with self.subTest(text=text):
                with self.assertRaises(ValueError):module.parse_range(text)
if __name__=='__main__':unittest.main()
