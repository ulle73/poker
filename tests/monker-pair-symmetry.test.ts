import {describe,it,expect} from 'vitest';
import {auditPairSymmetry} from '../scripts/monker-audit/policy-audit.mjs';
import fixture from './fixtures/monker-3p-turn-pairs-10114.json';
import fourPlayers from './fixtures/monker-4p-turn-pairs-10114.json';
import sixPlayers from './fixtures/monker-6p-turn-pairs-10114.json';
import selectedLimit from './fixtures/monker-6p-turn-2p1-10114.json';

describe('exact multiway pair symmetry',()=>{
  it('accepts the explicitly user-selected 2.1 percent threshold without changing the historical default',()=>{
    expect(auditPairSymmetry(selectedLimit,{qualityMetric:'max-unilateral'})!.accepted).toBe(false);
    const result=auditPairSymmetry(selectedLimit,{qualityMetric:'max-unilateral',maxErrorPct:2.1});
    expect(result!.qualityErrorPct).toBeCloseTo(2.0985117714431,10);expect(result!.accepted).toBe(true);
  });
  it('preserves full enumeration values and information-set best responses while grouping river ranks',()=>{
    const result=auditPairSymmetry(fixture);
    expect(result).not.toBeNull();
    expect(result!.nashConvPct).toBeCloseTo(0.5936020253478641,10);
    [1610.8891572060095,2268.4721427371423,120.63870005684635].forEach((v,p)=>expect(result!.values[p]).toBeCloseTo(v,8));
    [1619.1158098798564,2281.763772885669,122.86449824838739].forEach((v,p)=>expect(result!.bestResponses[p]).toBeCloseTo(v,8));
    expect(result!.rootActions.JdJh[0]).toBeCloseTo(185.92441533490472,8);
    expect(result!.rootActions.JsJc).toEqual(result!.rootActions.JdJh);
    expect(result!.accepted).toBe(true);
    expect(result!.sourceRangeCounts).toEqual([12,9,12]);
    expect(result!.jointDeals).toBe(8);
  });
  it('rejects incomplete pair classes instead of claiming their suit aliases are exact',()=>{
    const model=structuredClone(fixture);model.ranges[0].pop();
    expect(auditPairSymmetry(model)).toBeNull();
  });
  it('rejects shared ranks between players',()=>{
    const model=structuredClone(fixture);model.ranges[1]=model.ranges[0];
    expect(auditPairSymmetry(model)).toBeNull();
  });
  it('rejects suit-sensitive policies and boards outside the proven symmetry',()=>{
    const changed=structuredClone(fixture);
    changed.bucketMaps.Ks7d2c8h[0].QdQh=123;
    expect(auditPairSymmetry(changed)).toBeNull();
    const board=structuredClone(fixture);board.board[3]='8s';
    expect(auditPairSymmetry(board)).toBeNull();
  });
  it('applies the selected epsilon-Nash limit to every player and still reports the sum',()=>{
    const sum=auditPairSymmetry(fourPlayers);
    expect(sum!.accepted).toBe(false);
    const epsilon=auditPairSymmetry(fourPlayers,{qualityMetric:'max-unilateral'});
    expect(epsilon!.nashConvPct).toBeCloseTo(3.611352243802506,10);
    expect(epsilon!.maxGainPct).toBeCloseTo(1.5477786910035776,10);
    expect(epsilon!.qualityMetric).toBe('max-unilateral');
    expect(epsilon!.accepted).toBe(true);
  });
  it('never substitutes an average across players for the worst unilateral improvement',()=>{
    const result=auditPairSymmetry(sixPlayers,{qualityMetric:'max-unilateral'});
    expect(result!.nashConvPct/6).toBeLessThan(2);
    expect(result!.qualityErrorPct).toBeCloseTo(2.965831865161886,10);
    expect(result!.accepted).toBe(false);
    expect(()=>auditPairSymmetry(fourPlayers,{qualityMetric:'average' as 'nashconv'})).toThrow('Unsupported quality metric');
  });
});
