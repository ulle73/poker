import './browser';
import {relaySnapshot} from './relay';
const ready = chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if (message.type !== 'snapshot') return false;
 void ready.then(()=>chrome.storage.local.get('pairToken'))
   .then(({pairToken})=>relaySnapshot(message.snapshot,sender,chrome.runtime.id,pairToken))
   .then(reply,()=>reply({status:503}));
 return true;
});
