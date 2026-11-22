const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
class PreflopData {
 constructor(directory){this.directory=directory;this.loaded=null;}
 async load(){
  if(!this.loaded)this.loaded=(async()=>{
   const expected=require('../docs/solver-provenance.json').optionalPreflop;
   const manifest=JSON.parse(await fs.readFile(path.join(this.directory,'manifest.json'),'utf8'));
   const bytes=await fs.readFile(path.join(this.directory,'ranges.json'));
   if(!expected||bytes.length>5000000||manifest.archiveSha256!==expected.archiveSha256||manifest.huSourceSha256!==expected.huSourceSha256||manifest.librarySha256!==expected.librarySha256||crypto.createHash('sha256').update(bytes).digest('hex')!==expected.librarySha256)throw Error('Preflopdata skiljer sig från den granskade versionen.');
   const data=JSON.parse(bytes);
   if(data.schema!==1||data.archiveSha256!==expected.archiveSha256||Object.keys(data.nodes).length!==expected.nodes||data.metadata.rangeFiles!==expected.rangeFiles)throw Error('Preflopbibliotekets katalog är ogiltig.');
   const shortExpected=require('../docs/solver-provenance.json').optionalPreflopShortstack;
   if(shortExpected){
    try{
     const shortBytes=await fs.readFile(path.join(this.directory,'shortstack.json'));
     const shortManifest=JSON.parse(await fs.readFile(path.join(this.directory,'shortstack-manifest.json'),'utf8'));
     if(shortBytes.length>500000||crypto.createHash('sha256').update(shortBytes).digest('hex')!==shortExpected.librarySha256||shortManifest.archiveSha256!==shortExpected.archiveSha256||shortManifest.librarySha256!==shortExpected.librarySha256||JSON.stringify(shortManifest.order)!==JSON.stringify(data.order))throw Error('Kortstackdata skiljer sig från den granskade versionen.');
     const short=JSON.parse(shortBytes);
     if(short.schema!==1||short.source!=='rangeconverter'||short.archiveSha256!==shortExpected.archiveSha256||Object.keys(short.nodes).length!==shortExpected.nodes||short.metadata.depthBB!==40)throw Error('Kortstackbibliotekets katalog är ogiltig.');
     data.shortstack=short;
    }catch(error){if(error.code!=='ENOENT')throw error;}
   }
   return data;
  })().catch(error=>{this.loaded=null;if(error.code==='ENOENT'){error.code='SOLVER_UNAVAILABLE';error.message='De lokala prefloptabellerna är inte installerade.';}throw error;});
  return this.loaded;
 }
}
module.exports={PreflopData};
