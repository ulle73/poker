import type {LiveSnapshot} from '../live/types';
import type {DecisionInput} from '../decision/types';
import type {PreflopLibrary} from './types';
import {preflopDecision} from './strategy';
export const ARTGTO_SHA='cc1fc30512a3d05d60a627c7b1c42f90a809e38dc08c3a5974116267fc8f7e79';
export const RC40_SHA='a1723be2a7ac0e61b7a1342e1ebe7e778747bb2197572bf8fb0a877610e18799';
export class PreflopClient {
  private generation=0;
  private library:Promise<PreflopLibrary>|null=null;
  constructor(private readonly readLibrary:()=>Promise<PreflopLibrary>=async()=>{
    const response=await fetch(new URL('preflop-data',document.baseURI),{cache:'no-store'});
    const data=await response.json();if(!response.ok||data.error)throw Error(data.error||'Preflopdata kunde inte läsas.');
    return data;
  }){}
  cancel(){this.generation++;}
  async compute(s:LiveSnapshot,input:DecisionInput){
    const generation=++this.generation;
    if(!this.library)this.library=this.readLibrary().then(data=>{
      if(data.schema!==1||data.source!=='artgto'||data.archiveSha256!==ARTGTO_SHA||data.order?.length!==169||new Set(data.order).size!==169||!data.nodes||!data.hu)throw Error('Preflopdata saknar granskad källidentitet.');
      if(data.shortstack){
        const extra=data.shortstack;
        if(extra.schema!==1||extra.source!=='rangeconverter'||extra.archiveSha256!==RC40_SHA||extra.metadata.depthBB!==40||extra.metadata.modelPlayers!==6||Object.keys(extra.nodes).length!==35)throw Error('Kortstackdata saknar granskad källidentitet.');
        for(const [key,actions] of Object.entries(extra.nodes)){
          if(extra.coverage[key]?.length!==169||extra.coverage[key].some(v=>typeof v!=='boolean')||!actions.length||actions.some(a=>a.weights.length!==169||a.weights.some(w=>!Number.isInteger(w)||w<0||w>10000)))throw Error('Kortstacktabellens hand- eller frekvensdata är ogiltiga.');
        }
      }
      return data as PreflopLibrary;
    }).catch(error=>{this.library=null;throw error;});
    const library=await this.library;
    if(generation!==this.generation)return null;
    return preflopDecision(s,input,library);
  }
}
