const field = document.querySelector('#token');
chrome.storage.local.get('pairToken').then(({pairToken})=>{if(pairToken) document.querySelector('#status').textContent='Parning finns sparad. Nya pokerflikar ansluts automatiskt.';});
document.querySelector('form').addEventListener('submit',async event=>{
 event.preventDefault();
 const token=field.value.trim();
 if(!/^[a-f0-9]{48}$/.test(token)) return;
 await chrome.storage.local.set({pairToken:token});
 field.value='';
 document.querySelector('#status').textContent='Sparat. Läsaren återansluter automatiskt. Befintliga pokerflikar behöver laddas om en gång efter installationen.';
});
