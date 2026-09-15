/* DEVI GROUPS LIVE CMS ADAPTER */
(function(){
  const cfg=window.DEVI_CMS_CONFIG;
  if(!cfg||!window.supabase)return;
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const publicUrl=u=>u||'';
  async function get(table, cols='*'){const {data,error}=await client.from(table).select(cols);if(error)throw error;return data||[];}
  function setText(el,text){if(el)el.textContent=text||'';}
  function ensureBox(id,parent,after){let el=document.getElementById(id);if(!el){el=document.createElement('div');el.id=id;after?parent.insertBefore(el,after):parent.appendChild(el);}return el;}

  async function applyContent(){
    try{
      const rows=await get('site_content','*'); const byKey=Object.fromEntries(rows.map(r=>[(r.key||r.section_key),r]));
      const hero=byKey.hero; if(hero){const s=$('#page-home'); if(s){const span=s.querySelector('span.text-accent'); const h=s.querySelector('h1'); const p=h?.nextElementSibling; setText(span,hero.title); setText(h,hero.subtitle); setText(p,hero.content);}}
      const about=byKey.about; if(about){const s=$('#page-about'); if(s){const h=s.querySelector('h2'); if(h)setText(h,about.title); const spans=s.querySelectorAll('span.text-accent'); if(spans[0])setText(spans[0],about.subtitle);}}
      const products=byKey.products; if(products){const s=$('#page-products'); if(s){const h=s.querySelector('h2'); if(h)setText(h,products.title); const p=h?.parentElement?.querySelector('p'); if(p)setText(p,products.content||products.subtitle);}}
      const contact=byKey.contact; if(contact){const s=$('#page-contact'); if(s){const h=s.querySelector('h2'); if(h)setText(h,contact.title);}}
    }catch(e){console.warn('CMS content load skipped:',e);}
  }

  async function applyCompany(){
    try{const rows=await get('company_info','*'); const c=rows[0]; if(!c)return; const s=$('#page-contact'); if(!s)return;
      const ps=$$('#page-contact p'); const owner=c.owner_name||c.director_name||c.owner; const email=c.email||c.company_email; const address=c.address||c.company_address;
      if(owner){const p=ps.find(x=>/Owner & MD|Managing Director/i.test(x.textContent)); if(p)p.innerHTML='<i class="fa-solid fa-user text-accent mr-2.5"></i> <strong>'+esc(owner)+'</strong> (Owner & MD)';}
      if(email){const p=ps.find(x=>/devigroup1989@gmail\.com|@/i.test(x.textContent)); if(p)p.innerHTML='<i class="fa-solid fa-envelope text-accent mr-2.5"></i> <strong>'+esc(email)+'</strong>';}
      if(address){const p=ps.find(x=>/India:/i.test(x.textContent)); if(p)p.innerHTML='<i class="fa-solid fa-location-dot text-accent mr-2.5"></i> '+esc(address);}
    }catch(e){console.warn('CMS company load skipped:',e);}
  }

  async function applyBusinessUnits(){
    try{
      const units=await get('business_units','*'); const s=$('#page-about'); if(!s||!units.length)return;
      const marker=[...s.querySelectorAll('span')].find(x=>/Four Core Units/i.test(x.textContent));
      const oldGrid=marker?.closest('div')?.nextElementSibling;
      if(oldGrid?.classList?.contains('grid')) oldGrid.style.display='none';
      let host=$('#cms-business-units'); if(!host){host=document.createElement('div');host.id='cms-business-units';host.className='mt-8'; const anchor=oldGrid||marker?.closest('div'); if(anchor)anchor.insertAdjacentElement('afterend',host); else s.appendChild(host);}
      host.innerHTML='<div class="mb-5"><span class="text-accent font-bold uppercase tracking-widest text-[10px] sm:text-xs">Business Units</span><h3 class="text-xl sm:text-2xl font-black text-primary dark:text-white mt-1">DEVI GROUPS Business Units</h3></div><div class="grid grid-cols-1 md:grid-cols-2 gap-5">'+units.map(u=>`<div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm"><div class="h-44 bg-slate-100 dark:bg-slate-800">${u.image_url?`<img src="${esc(u.image_url)}" class="w-full h-full object-cover">`:''}</div><div class="p-5"><h4 class="text-lg font-black text-primary dark:text-white">${esc(u.name||u.title)}</h4><p class="text-sm text-slate-600 dark:text-slate-300 mt-2">${esc(u.description||'')}</p>${u.website?`<a href="${esc(u.website)}" target="_blank" rel="noopener" class="inline-block mt-3 text-accent font-bold text-sm">Visit Website →</a>`:''}</div></div>`).join('')+'</div>';
    }catch(e){console.warn('CMS business units load skipped:',e);}
  }

  async function applyProducts(){
    try{
      const [products,docs]=await Promise.all([get('products','*'),get('documents','*')]); const s=$('#page-products'); if(!s||!products.length)return;
      $$('#page-products .product-item').forEach(el=>{if(!el.closest('#cms-products'))el.style.display='none';});
      let host=$('#cms-products'); if(!host){host=document.createElement('div');host.id='cms-products';host.className='mt-6'; const search=$('#product-search-input'); if(search)search.closest('div')?.insertAdjacentElement('afterend',host); else s.appendChild(host);}
      host.innerHTML='<div class="grid grid-cols-1 gap-5">'+products.map(p=>{const pd=(docs||[]).filter(d=>String(d.product_id||'')===String(p.id)); return `<article class="product-item bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col md:flex-row gap-5 shadow-sm"><div class="w-full md:w-56 h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">${p.image_url?`<img src="${esc(p.image_url)}" class="w-full h-full object-contain p-2">`:''}</div><div class="flex-1"><h4 class="product-title font-black text-xl sm:text-2xl text-primary dark:text-white">${esc(p.name||p.product_name)}</h4><p class="text-sm text-slate-600 dark:text-slate-300 mt-2">${esc(p.description||'')}</p>${p.packing?`<p class="text-xs font-bold text-slate-500 mt-3">Packing: ${esc(p.packing)}</p>`:''}${p.category?`<p class="text-xs font-bold text-slate-500 mt-1">Category: ${esc(p.category)}</p>`:''}${pd.length?`<div class="flex flex-wrap gap-2 mt-4">${pd.map(d=>`<a href="${esc(d.file_url||'')}" target="_blank" rel="noopener" class="inline-flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-lg text-xs font-bold">📄 ${esc(d.title||d.file_name||'Document')}</a>`).join('')}</div>`:''}</div></article>`;}).join('')+'</div>';
    }catch(e){console.warn('CMS products load skipped:',e);}
  }

  async function applyReviews(){
    try {
      const reviews=await get('reviews','*');
      if(!reviews.length)return;
      const count=$('#total-reviews-count'),avg=$('#avg-rating-score'),stars=$('#avg-rating-stars');
      const active=reviews.filter(r=>r.active!==false);
      const total=active.reduce((a,r)=>a+Number(r.stars||r.rating||0),0);
      const average=active.length?total/active.length:0;
      if(count)count.textContent=active.length;
      if(avg)avg.textContent=average.toFixed(1);
      if(stars)stars.textContent='⭐'.repeat(Math.round(average));
      const grid=$('#modal-reviews-grid');
      if(grid)grid.innerHTML=active.map(r=>`<div class="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"><div class="text-amber-500 text-xs mb-2">${'⭐'.repeat(Number(r.stars||r.rating||0))}</div><p class="text-xs sm:text-sm text-slate-700 dark:text-slate-200 italic mb-4">"${esc(r.message||r.msg||r.review||'')}"</p><strong class="text-xs font-bold text-slate-800 dark:text-white block">${esc(r.name||'')}</strong><span class="text-[10px] text-slate-500">${esc(r.country||'')}</span></div>`).join('');
    } catch(e) { console.warn('CMS reviews load skipped:',e); }
  }

  async function patchTracking(){
    const original=window.trackShipment; window.trackShipment=async function(){const raw=$('#tracking-input')?.value.trim().toUpperCase();const err=$('#tracking-error'),res=$('#tracking-result');if(!raw){if(err){err.textContent='Please enter your Bill or Invoice Number.';err.classList.remove('hidden');}return;}try{const {data,error}=await client.from('tracking').select('*').ilike('tracking_number',raw).maybeSingle();if(error)throw error;if(!data){if(res)res.classList.add('hidden');if(err){err.innerHTML=`Reference <strong>"${esc(raw)}"</strong> not found in live cargo records.`;err.classList.remove('hidden');}return;}if(err)err.classList.add('hidden');if(res)res.classList.remove('hidden');setText($('#tr-id'),data.tracking_number);setText($('#tr-item'),data.item||data.description||'');setText($('#tr-dest'),data.destination||'');setText($('#tr-status-text'),'Live Status: '+(data.status||''));setText($('#tr-eta'),data.eta||'');}catch(e){console.warn('CMS tracking failed, using original:',e);if(typeof original==='function')return original();}};
  }
  window.handleReviewSubmit=async function(e){
    e.preventDefault();
    const name=$('#rev-name')?.value.trim()||''; const country=$('#rev-country')?.value.trim()||''; const stars=Number($('#rev-rating')?.value||0); const message=$('#rev-msg')?.value.trim()||'';
    if(!name||!stars||!message){alert('Please complete your review.');return;}
    try{
      const {error}=await client.from('reviews').insert({name,country,stars,message,status:'pending',active:false});
      if(error)throw error;
      $('#review-form')?.reset(); alert('Thank you! Your review has been submitted for approval.');
    }catch(err){console.error('Review submit error:',err);alert(err?.message||'Unable to submit review.');}
  };

  async function init(){await Promise.allSettled([applyContent(),applyCompany(),applyBusinessUnits(),applyProducts(),applyReviews()]);patchTracking();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
