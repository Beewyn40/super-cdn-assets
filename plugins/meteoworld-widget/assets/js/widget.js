(function(){
  'use strict';
  const REST = (window.MWW && MWW.rest) || '';
  const OPTS = (window.MWW && MWW.options) || {};
  const rawTracks = OPTS.music_tracks || {};
  function trackUrl(v){ return (typeof v === 'string') ? v : (v && typeof v === 'object' && v.url ? v.url : ''); }
  const tracks = { lounge:'', jazz:'', 'ambient-asia':'', 'arabic-lounge':'', 'afrobeat-chill':'', 'chill-wave':'' };
  Object.keys(tracks).forEach(k => { tracks[k] = trackUrl(rawTracks[k]); });
  const trackMeta = {
    lounge:{title:'Lounge', sub:'Ambiance lounge', option:'Lounge'},
    jazz:{title:'Jazz', sub:'Ambiance feutrée', option:'Jazz'},
    'ambient-asia':{title:'Ambient Asia', sub:'Atmosphère douce', option:'Ambient Asia'},
    'arabic-lounge':{title:'Oriental Lounge', sub:'Ambiance orientale', option:'Oriental Lounge'},
    'afrobeat-chill':{title:'Afrobeat Chill', sub:'Rythme relaxant', option:'Afrobeat Chill'},
    'chill-wave':{title:'Chill Wave', sub:'Ambiance relaxante', option:'Chill Wave'},
    none:{title:'Aucune', sub:'Silence complet', option:'Aucune'}
  };
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\'':'&#039;','"':'&quot;'}[ch])); }
  async function getJSON(url){ const r = await fetch(url); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
  function stat(icon,label,value){ return `<div class="mww-stat"><b>${icon}</b><small>${label}</small><strong>${value}</strong></div>`; }
  function mini(icon,label,value){ return `<div class="mww-mini"><b>${icon}</b><strong>${value}</strong><small>${label}</small></div>`; }
  function chart(hourly){
    const vals = hourly.map(h=>Number(h.temperature||0)); const min=Math.min(...vals)-1, max=Math.max(...vals)+1;
    const pts = vals.map((v,i)=> `${(i/(vals.length-1))*100},${80-((v-min)/(max-min))*60}`).join(' ');
    return `<svg viewBox="0 0 100 90" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="0,90 ${pts} 100,90" opacity=".22" fill="currentColor"/></svg><div class="mww-hour-icons">${hourly.map(h=>`<span>${h.icon}<small>${h.time}</small></span>`).join('')}</div>`;
  }
  function daily(days){ return days.map(d=>`<div class="mww-day"><strong>${esc(d.day)}</strong><b>${esc(d.icon)}</b><span>${d.max}°</span><small>${d.min}° · ${d.rain}%</small></div>`).join(''); }

  function setHeroImage(hero, img){
    hero.classList.remove('loaded');
    if(!img){ hero.style.backgroundImage=''; hero.classList.add('empty'); return; }
    const probe = new Image();
    let done = false;
    const clean = String(img).replace(/"/g,'');
    const timeout = setTimeout(()=>{ if(done) return; done = true; hero.style.backgroundImage=''; hero.classList.add('empty'); }, 5500);
    probe.onload = ()=>{ if(done) return; done = true; clearTimeout(timeout); hero.style.backgroundImage = `url("${clean}")`; hero.classList.remove('empty'); hero.classList.add('loaded'); };
    probe.onerror = ()=>{ if(done) return; done = true; clearTimeout(timeout); hero.style.backgroundImage=''; hero.classList.add('empty'); };
    probe.src = clean;
  }

  document.querySelectorAll('.mww-widget').forEach(root => init(root));
  async function init(root){
    const shell = root.querySelector('.mww-shell');
    const hero = root.querySelector('.mww-hero-img');
    const cityEl = root.querySelector('.mww-city');
    const countryEl = root.querySelector('.mww-country');
    const tempEl = root.querySelector('.mww-temp');
    const summaryEl = root.querySelector('.mww-summary');
    const miniEl = root.querySelector('.mww-mini-cards');
    const statsEl = root.querySelector('.mww-stats');
    const chartEl = root.querySelector('.mww-chart');
    const dailyEl = root.querySelector('.mww-daily');
    const infoEl = root.querySelector('.mww-info-inner');
    const tab = root.querySelector('.mww-panel-tab');
    const select = root.querySelector('.mww-track-select');
    const trackTitle = root.querySelector('.mww-track-title');
    const trackSubtitle = root.querySelector('.mww-track-subtitle');
    const soundBtn = root.querySelector('.mww-sound-btn');
    const playBtn = root.querySelector('.mww-play-btn');
    const fullBtn = root.querySelector('.mww-full-btn');
    let cities = [], index = 0, timer = null, paused = false, audio = null;

    Object.keys(trackMeta).forEach(k=>{
      if(k==='none' || tracks[k] || k===OPTS.default_music){
        const o=document.createElement('option');
        o.value=k;
        o.textContent=trackMeta[k].option;
        select.appendChild(o);
      }
    });
    const requestedDefault = OPTS.default_music || 'lounge';
    select.value = select.querySelector(`option[value="${requestedDefault}"]`) ? requestedDefault : (select.querySelector('option[value="lounge"]') ? 'lounge' : 'none');
    function updateTrackUI(){
      const meta = trackMeta[select.value] || trackMeta.none;
      if(trackTitle) trackTitle.textContent = meta.title;
      if(trackSubtitle) trackSubtitle.textContent = meta.sub;
      root.classList.toggle('mww-audio-muted', select.value === 'none' || !tracks[select.value]);
    }
    function setSoundVisual(state){
      root.classList.remove('mww-sound-on','mww-sound-off','mww-sound-waiting');
      root.classList.add(state);
      if(soundBtn) soundBtn.setAttribute('aria-label', state === 'mww-sound-on' ? 'Couper le son' : 'Activer le son');
    }
    function loadAudio(){
      if(audio){ audio.pause(); audio=null; }
      const key=select.value;
      updateTrackUI();
      if(key==='none') { setSoundVisual('mww-sound-off'); return; }
      const url=tracks[key];
      if(!url) { setSoundVisual('mww-sound-off'); return; }
      audio = new Audio(url);
      audio.loop=true;
      audio.volume=(OPTS.sound_volume||45)/100;
      setSoundVisual('mww-sound-off');
    }
    function playAudio(){
      if(!audio) loadAudio();
      if(audio) audio.play().then(()=>setSoundVisual('mww-sound-on')).catch(()=>setSoundVisual('mww-sound-waiting'));
    }
    select.addEventListener('change', ()=>{ loadAudio(); playAudio(); });
    soundBtn.addEventListener('click', ()=>{ if(audio && !audio.paused){ audio.pause(); setSoundVisual('mww-sound-off'); } else playAudio(); });
    playBtn.addEventListener('click', ()=>{ paused=!paused; root.classList.toggle('mww-paused', paused); playBtn.setAttribute('aria-label', paused?'Lecture':'Pause'); if(!paused) schedule(); else clearTimeout(timer); });
    updateTrackUI();
    fullBtn.addEventListener('click', ()=>{ if(document.fullscreenElement) document.exitFullscreen(); else shell.requestFullscreen && shell.requestFullscreen(); });
    tab.addEventListener('click', ()=> shell.classList.toggle('panel-open'));

    try { cities = await getJSON(REST + '/cities'); } catch(e){ cities = []; }
    if(!cities.length){ cityEl.textContent='MeteoWorld'; summaryEl.textContent='Aucune ville active.'; return; }
    await render(0); playAudio(); schedule();

    function schedule(){ clearTimeout(timer); if(paused || !OPTS.autoplay) return; timer=setTimeout(()=>{ render((index+1)%cities.length); schedule(); }, OPTS.autoplay_speed || 8000); }
    async function render(i){
      index=i; const city=cities[i]; cityEl.textContent=city.name; countryEl.textContent=city.country || ''; summaryEl.textContent='Chargement de la météo…';
      let w, ai;
      const apiIndex = city.index;
      try { w = await getJSON(REST + '/weather/' + apiIndex); } catch(e){ w = null; }
      try { ai = await getJSON(REST + '/ai/' + apiIndex); } catch(e){ ai = {}; }
      if(!w) return;
      const c = w.current || {};
      tempEl.textContent = Math.round(c.temperature||0) + '°';
      summaryEl.textContent = ai.text || c.label || '';
      const img = ai.daily_photo_url || ai.image_url || '';
      setHeroImage(hero, img);
      root.dataset.imageSource = ai.image_source || (ai.daily_photo_url ? 'daily' : 'fallback');
      miniEl.innerHTML = mini(c.icon||'🌤️', c.label||'Météo', (c.humidity||0)+'%') + mini('🕘','Lever', w.sunrise||'--:--') + mini('🌇','Coucher', w.sunset||'--:--') + mini('🌡️','Ressenti', (c.apparent||0)+'°');
      statsEl.innerHTML = stat('💧','Humidité',(c.humidity||0)+'%') + stat('🌬️','Vent',(c.wind||0)+' km/h') + stat('📊','Pression',(c.pressure||0)+' hPa') + stat('👁️','Visibilité',(c.visibility||0)+' km') + stat('☀️','UV', c.uv||0);
      chartEl.innerHTML = chart(w.hourly || []);
      dailyEl.innerHTML = daily(w.daily || []);
      infoEl.innerHTML = `<h3>À propos de ${esc(city.name)}</h3><p>${esc(ai.text || '')}</p><div class="mww-info-grid"><span>Coordonnées<b>${esc(city.lat)}, ${esc(city.lon)}</b></span><span>Météo<b>${esc(c.label)}</b></span><span>Lever soleil<b>${esc(w.sunrise)}</b></span><span>Coucher soleil<b>${esc(w.sunset)}</b></span><span>Conseil<b>${(c.uv||0)>5?'Protection solaire conseillée':'Conditions favorables'}</b></span><span>Vent<b>${esc(c.wind)} km/h</b></span></div>`;
    }
  }
})();
