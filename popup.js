
async function save(){
  const data={
    name:document.getElementById('name').value,
    url:document.getElementById('url').value,
    desc:document.getElementById('desc').value
  };
  await chrome.storage.local.set({geo:data});
  alert('saved');
}
async function fill(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  chrome.tabs.sendMessage(tab.id,{type:'fill'});
}
document.getElementById('save').onclick=save;
document.getElementById('fill').onclick=fill;
