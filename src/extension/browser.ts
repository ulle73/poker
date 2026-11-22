export interface BrowserApi {
 runtime: {id:string; sendMessage(message:unknown):Promise<{status:number}>;
   onMessage:{addListener(callback:(message:{type?:string;snapshot?:unknown},sender:import('./relay').Sender,reply:(value:unknown)=>void)=>boolean):void}};
 storage:{local:{get(key:string):Promise<{pairToken?:string}>;setAccessLevel(options:{accessLevel:string}):Promise<void>}};
}
declare global {const chrome:BrowserApi;}
