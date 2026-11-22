import {build} from 'vite';
import {mkdir,copyFile} from 'node:fs/promises';
const outDir='release/edge-live-reader';
await mkdir(outDir,{recursive:true});
for(const name of ['content','background']) await build({configFile:false,publicDir:false,build:{outDir,emptyOutDir:false,minify:false,lib:{entry:`src/extension/${name}.ts`,name:`PokerExtension_${name}`,formats:['iife'],fileName:()=>`${name}.js`}}});
for(const name of ['manifest.json','options.html','options.js']) await copyFile(`extension/${name}`,`${outDir}/${name}`);
