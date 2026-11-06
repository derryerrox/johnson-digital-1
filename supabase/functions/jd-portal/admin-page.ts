export const adminPage = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#171717">
  <title>Media library — JOHNSON DIGITAL</title>
  <style>
    :root{color-scheme:light;--ink:#171717;--espresso:#302a24;--gold:#b08d57;--champagne:#d6b779;--ivory:#f5f0e7;--sand:#e9ddc8;--taupe:#a89b88;font:15px/1.55 "Segoe UI",Arial,sans-serif}
    *{box-sizing:border-box}body{margin:0;background:var(--ivory);color:var(--ink)}button,input,select{font:inherit}button{cursor:pointer}.shell{max-width:1180px;margin:auto;padding:2rem clamp(1rem,4vw,3rem) 4rem}.top{display:flex;justify-content:space-between;align-items:center;padding-bottom:1.2rem;border-bottom:1px solid #d5ccbd}.brand{color:var(--ink);font-weight:700;letter-spacing:.16em}.brand span{display:block;color:#786f63;font-size:.62rem;letter-spacing:.4em}.top button,.submit{border:1px solid var(--ink);padding:.65rem 1rem;background:var(--ink);color:var(--ivory)}h1{margin:2.5rem 0 .4rem;font:500 clamp(2.2rem,6vw,4rem)/1.1 Georgia,serif}h2{font:500 1.5rem Georgia,serif}p{color:#625a4f}.muted{color:#776d5f;font-size:.78rem}.panel{margin-top:1.5rem;padding:clamp(1rem,3vw,2rem);border:1px solid #d5ccbd;background:#faf7f0}.login{max-width:460px;margin:12vh auto}.login form,.editor{display:grid;gap:1rem}.field{display:grid;gap:.35rem;font-size:.78rem;font-weight:600}.field input,.field select{min-height:2.8rem;padding:.65rem;border:1px solid #c9beac;background:#fff}.toolbar{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}.layout{display:grid;grid-template-columns:minmax(260px,.75fr) 1.25fr;gap:1.5rem;align-items:start}.drop{display:grid;min-height:145px;place-items:center;padding:1.2rem;border:1px dashed var(--gold);background:#f5f0e7;text-align:center;cursor:pointer}.drop.is-over{background:var(--sand)}.drop input{max-width:100%}.preview{display:flex;gap:.5rem;flex-wrap:wrap}.preview img{width:72px;height:64px;object-fit:cover}.items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin-top:1rem}.card{overflow:hidden;border:1px solid #d5ccbd;background:#fff}.card img{display:block;width:100%;height:180px;object-fit:cover;background:#ddd}.card__body{padding:.8rem}.card__body h3{margin:0 0 .2rem;font-size:.95rem}.card__body p{margin:.25rem 0;font-size:.72rem}.card__actions{display:flex;gap:.5rem;margin-top:.7rem}.card__actions button,.secondary{padding:.45rem .7rem;border:1px solid #a89b88;background:transparent;color:var(--ink);font-size:.72rem}.danger{border-color:#9c4a3e!important;color:#812f26!important}.row{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}.publish{display:flex;align-items:center;gap:.6rem;font-size:.76rem}.publish input{accent-color:var(--gold)}.status{min-height:1.4rem;margin:0;color:#564b3a;font-size:.78rem}.status[data-error=true]{color:#8b332c}.status[data-success=true]{color:#355a3b}.notice{padding:.8rem 1rem;border-left:2px solid var(--gold);background:#f5f0e7;font-size:.76rem}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:760px){.layout{grid-template-columns:1fr}.items{grid-template-columns:1fr 1fr}.card img{height:140px}}
    @media(max-width:460px){.items,.row{grid-template-columns:1fr}.top{align-items:flex-start}.shell{padding-top:1rem}}
  </style>
</head>
<body>
  <main class="shell">
    <header class="top"><a class="brand" href="#" aria-label="JOHNSON DIGITAL media library">JOHNSON DIGITAL<span>MEDIA LIBRARY</span></a><button id="logout" type="button" hidden>Sign out</button></header>
    <section class="login panel" id="login-panel">
      <p class="muted">PRIVATE ADMINISTRATION</p><h1>Sign in</h1><p>Use an administrator account enabled for this project.</p>
      <form id="login-form"><label class="field">Email<input name="email" type="email" autocomplete="username" required maxlength="254"></label><label class="field">Password<input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><button class="submit" type="submit">Sign in securely</button><p class="status" id="login-status" role="status" aria-live="polite"></p></form>
      <p class="muted">Administrator access is restricted by the server-side email allowlist.</p>
    </section>
    <section id="dashboard" hidden>
      <h1>Image library</h1><p>Upload, replace and organize site photography. Uploaded image files are compressed in your browser when possible and stored in the project's private-write, public-read image bucket.</p>
      <div class="notice">Images marked Published appear on the website. Admin changes require a signed-in allowlisted account. Do not upload sensitive or private photographs.</div>
      <div class="layout">
        <form class="editor panel" id="image-form">
          <h2 id="editor-title">Add images</h2>
          <label class="drop" id="drop-zone">Drop image files here or choose files<input id="files" name="files" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple><span class="muted">JPEG, PNG, WebP or AVIF · up to 8 MB each · 10 files per batch</span></label>
          <div class="preview" id="preview"></div>
          <label class="field">Website image key<select id="image-key"><option value="">Create new image slot</option></select></label>
          <label class="field">Image key (new image)<input id="new-key" maxlength="80" placeholder="e.g. industry-real-estate"></label>
          <label class="field">Category<select id="category" required><option>Homepage</option><option>Portfolio</option><option>Industries</option><option>Services</option><option>Team</option><option>Gallery</option><option>Promotional</option></select></label>
          <div class="row"><label class="field">Title<input id="title" maxlength="120" required></label><label class="field">Website section<input id="section" maxlength="120" required placeholder="e.g. Industries — Real Estate"></label></div>
          <label class="field">Alternative text / description<input id="alt" maxlength="240" required></label>
          <label class="publish"><input id="published" type="checkbox" checked> Publish this image on the website</label>
          <button class="submit" type="submit">Save image changes</button><button class="secondary" id="clear-editor" type="button">Clear form</button>
          <p class="status" id="upload-status" role="status" aria-live="polite"></p>
        </form>
        <section class="panel" aria-labelledby="library-title"><div class="toolbar"><div><p class="muted">CURRENT WEBSITE MEDIA</p><h2 id="library-title">Saved images</h2></div><button class="secondary" id="refresh" type="button">Refresh list</button></div><div class="items" id="items"></div><p class="status" id="library-status" role="status" aria-live="polite"></p></section>
      </div>
    </section>
  </main>
  <script>
  (function(){
    var endpoint=location.pathname;
    var loginPanel=document.getElementById('login-panel');
    var dashboard=document.getElementById('dashboard');
    var logout=document.getElementById('logout');
    var imageForm=document.getElementById('image-form');
    var fileInput=document.getElementById('files');
    var imageKey=document.getElementById('image-key');
    var records=[];
    var queuedFiles=[];
    var urls=[];
    function api(action,options){
      var url=endpoint+'?action='+encodeURIComponent(action);
      var settings=options||{};
      settings.credentials='same-origin';
      if(settings.body&&!(settings.body instanceof FormData)){settings.headers=Object.assign({'Content-Type':'application/json'},settings.headers||{});}
      return fetch(url,settings).then(function(response){return response.json().then(function(data){if(!response.ok){throw new Error(data.error||'Request failed.');}return data;});});
    }
    function setStatus(element,message,error){element.textContent=message;element.dataset.error=error?'true':'false';element.dataset.success=error?'false':'true';}
    function openDashboard(){
      loginPanel.hidden=true;dashboard.hidden=false;logout.hidden=false;loadImages();
    }
    function closeDashboard(){
      dashboard.hidden=true;logout.hidden=true;loginPanel.hidden=false;
    }
    function slug(value){return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);}
    function clearPreviews(){urls.forEach(URL.revokeObjectURL);urls=[];document.getElementById('preview').replaceChildren();}
    function showPreviews(files){
      clearPreviews();files.forEach(function(file){var url=URL.createObjectURL(file);urls.push(url);var image=document.createElement('img');image.src=url;image.alt='Selected image preview';document.getElementById('preview').appendChild(image);});
    }
    function renderImages(){
      var list=document.getElementById('items');list.replaceChildren();imageKey.replaceChildren();
      var blank=document.createElement('option');blank.value='';blank.textContent='Create new image slot';imageKey.appendChild(blank);
      records.forEach(function(record){var option=document.createElement('option');option.value=record.image_key;option.textContent=record.image_key+' — '+record.title;imageKey.appendChild(option);
        var card=document.createElement('article');card.className='card';var img=document.createElement('img');img.src=record.public_url;img.alt=record.alt_text;img.loading='lazy';card.appendChild(img);
        var body=document.createElement('div');body.className='card__body';var title=document.createElement('h3');title.textContent=record.title;body.appendChild(title);
        var section=document.createElement('p');section.textContent=record.category+' · '+record.section_name+(record.is_published?' · Published':' · Draft');body.appendChild(section);
        var key=document.createElement('p');key.textContent=record.image_key;body.appendChild(key);
        var actions=document.createElement('div');actions.className='card__actions';var edit=document.createElement('button');edit.type='button';edit.textContent='Edit / replace';edit.addEventListener('click',function(){editRecord(record);});actions.appendChild(edit);
        var remove=document.createElement('button');remove.type='button';remove.textContent='Delete';remove.className='danger';remove.addEventListener('click',function(){deleteRecord(record);});actions.appendChild(remove);
        body.appendChild(actions);card.appendChild(body);list.appendChild(card);
      });
      if(!records.length){var empty=document.createElement('p');empty.className='muted';empty.textContent='No images have been added to the media library yet.';list.appendChild(empty);}
    }
    function loadImages(){
      setStatus(document.getElementById('library-status'),'Loading image library…',false);
      api('admin-images').then(function(data){records=data.images||[];renderImages();setStatus(document.getElementById('library-status'),records.length+' image slots loaded.',false);})
      .catch(function(error){setStatus(document.getElementById('library-status'),error.message,true);if(error.message.indexOf('Sign in')!==-1)closeDashboard();});
    }
    function editRecord(record){
      imageKey.value=record.image_key;document.getElementById('new-key').value=record.image_key;
      document.getElementById('category').value=record.category;document.getElementById('title').value=record.title;
      document.getElementById('section').value=record.section_name;document.getElementById('alt').value=record.alt_text;
      document.getElementById('published').checked=record.is_published;document.getElementById('editor-title').textContent='Edit or replace image';
      fileInput.value='';queuedFiles=[];clearPreviews();imageForm.scrollIntoView({behavior:'smooth',block:'start'});
    }
    function deleteRecord(record){
      if(!confirm('Delete "'+record.title+'" from the image library?'))return;
      api('image-delete',{method:'POST',body:JSON.stringify({image_key:record.image_key})})
      .then(function(){setStatus(document.getElementById('library-status'),'Image deleted.',false);loadImages();})
      .catch(function(error){setStatus(document.getElementById('library-status'),error.message,true);});
    }
    async function optimize(file){
      if(!('createImageBitmap' in window)||!file.type.startsWith('image/'))return file;
      try{
        var bitmap=await createImageBitmap(file);var scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
        var canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
        var context=canvas.getContext('2d');context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
        var blob=await new Promise(function(resolve){canvas.toBlob(resolve,'image/webp',.84);});
        if(blob&&blob.size>0&&blob.size<file.size)return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp',lastModified:Date.now()});
      }catch(error){console.warn('Browser image optimization was skipped.',error);}
      return file;
    }
    document.getElementById('login-form').addEventListener('submit',function(event){
      event.preventDefault();var form=new FormData(event.currentTarget);var status=document.getElementById('login-status');
      api('login',{method:'POST',body:JSON.stringify({email:form.get('email'),password:form.get('password')})})
      .then(openDashboard).catch(function(error){setStatus(status,error.message,true);});
    });
    logout.addEventListener('click',function(){api('logout',{method:'POST',body:JSON.stringify({})}).finally(closeDashboard);});
    document.getElementById('refresh').addEventListener('click',loadImages);
    fileInput.addEventListener('change',function(){queuedFiles=Array.from(fileInput.files||[]);showPreviews(queuedFiles);});
    var drop=document.getElementById('drop-zone');
    drop.addEventListener('dragover',function(event){event.preventDefault();drop.classList.add('is-over');});
    drop.addEventListener('dragleave',function(){drop.classList.remove('is-over');});
    drop.addEventListener('drop',function(event){event.preventDefault();drop.classList.remove('is-over');queuedFiles=Array.from(event.dataTransfer.files||[]);showPreviews(queuedFiles);});
    document.getElementById('clear-editor').addEventListener('click',function(){imageForm.reset();imageKey.value='';fileInput.value='';queuedFiles=[];clearPreviews();document.getElementById('editor-title').textContent='Add images';});
    imageForm.addEventListener('submit',async function(event){
      event.preventDefault();var status=document.getElementById('upload-status');var files=queuedFiles.length?queuedFiles:Array.from(fileInput.files||[]);
      var key=imageKey.value||document.getElementById('new-key').value||slug(document.getElementById('title').value);
      var title=document.getElementById('title').value.trim();var category=document.getElementById('category').value;
      var section=document.getElementById('section').value.trim();var alt=document.getElementById('alt').value.trim();
      if(!key||!title||!section||!alt){setStatus(status,'Enter an image key, title, website section and alternative text.',true);return;}
      if(!/^[a-z0-9][a-z0-9-]{1,79}$/.test(key)){setStatus(status,'Use a lowercase image key with letters, numbers and hyphens.',true);return;}
      if(files.length>10){setStatus(status,'Upload no more than 10 files at a time.',true);return;}
      if(!files.length&&imageKey.value){
        api('image-update',{method:'POST',body:JSON.stringify({image_key:key,title:title,category:category,section_name:section,alt_text:alt,is_published:document.getElementById('published').checked})})
        .then(function(){setStatus(status,'Image details updated.',false);loadImages();})
        .catch(function(error){setStatus(status,error.message,true);});return;
      }
      if(!files.length){setStatus(status,'Choose at least one image file.',true);return;}
      for(var index=0;index<files.length;index++){
        var original=files[index];var file=await optimize(original);
        var uploadKey=files.length===1?key:(index===0&&imageKey.value?key:slug(file.name)+'-'+Date.now().toString(36)+'-'+index);
        var data=new FormData();data.append('image',file,file.name);data.append('image_key',uploadKey);
        data.append('title',files.length===1?title:(index===0?title:file.name.replace(/\.[^.]+$/,'')));
        data.append('category',category);data.append('section_name',section);
        data.append('alt_text',files.length===1?alt:(index===0?alt:file.name.replace(/\.[^.]+$/,'')));
        data.append('is_published',document.getElementById('published').checked?'true':'false');
        setStatus(status,'Uploading '+(index+1)+' of '+files.length+'…',false);
        try{await api('image-upload',{method:'POST',body:data});}
        catch(error){setStatus(status,'Upload stopped: '+error.message,true);return;}
      }
      setStatus(status,'Images saved. Published images are now available to the website.',false);loadImages();
      fileInput.value='';queuedFiles=[];clearPreviews();
    });
    api('admin-session').then(openDashboard).catch(function(){closeDashboard();});
  })();
  </script>
</body>
</html>`;
