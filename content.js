
chrome.runtime.onMessage.addListener(async (msg)=>{
 if(msg.type==='fill'){
   const data=(await chrome.storage.local.get('geo')).geo;
   if(!data)return;
   document.querySelectorAll('input,textarea').forEach(el=>{
     if(el.placeholder?.toLowerCase().includes('name')) el.value=data.name;
     if(el.placeholder?.toLowerCase().includes('url')) el.value=data.url;
     if(el.placeholder?.toLowerCase().includes('desc')) el.value=data.desc;
   });
 }
});
