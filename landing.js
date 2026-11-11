/* Weeva marketing site. Animation timings follow the licensed React Bits Pro reference. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const animate = (target, vars) => {
    if (!motion.matches && window.gsap) return gsap.to(target, vars);
    return null;
  };
  const icon = name => `<svg aria-hidden="true"><use href="assets/icons.svg#${name}"/></svg>`;
  const header = $('#site-header');
  const menuButton = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  let menuOpen = false;
  const setMenu = open => {
    menuOpen = open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    $('use', menuButton).setAttribute('href', `assets/icons.svg#${open ? 'x' : 'menu'}`);
    mobileNav.classList.toggle('is-open', open);
    mobileNav.inert = !open;
    document.body.classList.toggle('menu-open', open);
    header.classList.remove('is-hidden');
    if (open) {
      if (!motion.matches && window.gsap) gsap.fromTo($$('a', mobileNav), {y: 20, opacity: 0, filter: 'blur(6px)'}, {y: 0, opacity: 1, filter: 'blur(0px)', stagger: .065, duration: .5, ease: 'power2.out', clearProps: 'all'});
      $('a', mobileNav).focus({preventScroll:true});
    }
  };
  menuButton.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', mobileNav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuOpen) {setMenu(false); menuButton.focus();}
    if (event.key === 'Tab' && menuOpen) {
      const links = $$('a',mobileNav);
      const first = menuButton;
      const last = links.at(-1);
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    }
  });
  matchMedia('(min-width: 768px)').addEventListener('change', event => {if(event.matches && menuOpen) setMenu(false);});
  const themeButtons = $$('.theme-toggle, .footer-theme');
  const updateTheme = () => {
    const dark = document.documentElement.dataset.theme !== 'light';
    themeButtons.forEach(button => {
      button.setAttribute('aria-label', `Zum ${dark ? 'hellen' : 'dunklen'} Design wechseln`);
      if (button.classList.contains('theme-toggle')) button.setAttribute('aria-pressed', String(!dark));
      $('use', button)?.setAttribute('href', `assets/icons.svg#${dark ? 'sun' : 'moon'}`);
    });
    $('meta[name="theme-color"]').setAttribute('content', dark ? '#08090d' : '#fafafb');
  };
  themeButtons.forEach(button => button.addEventListener('click', () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    try {localStorage.setItem('weeva-theme', document.documentElement.dataset.theme);} catch {}
    updateTheme();
  }));
  updateTheme();
  $('#year').textContent = new Date().getFullYear();

  const examples = {
    timetable: {
      prompt: '„Hier ist mein Stundenplan. Plane alle Vorlesungen für mich ein.“',
      title: 'Aus einem Screenshot wird dein Wochenplan.',
      days: ['Montag', 'Dienstag', 'Mittwoch'],
      events: [
        {day:0,start:8,length:2,title:'Mathematik',kind:'fixed'},
        {day:2,start:8,length:2,title:'Deutsch',kind:'fixed'},
        {day:1,start:10,length:2,title:'Englisch',kind:'fixed'},
        {day:2,start:10,length:2,title:'Statistik',kind:'fixed'},
        {day:0,start:12,length:2,title:'Physik',kind:'fixed'},
        {day:1,start:12,length:2,title:'Sport',kind:'fixed'},
        {day:2,start:14,length:3,title:'Zeit für dich',kind:'free'}
      ]
    },
    study: {
      prompt: '„Plane diese Woche drei Lernblöcke für meine Statistik-Klausur ein.“',
      title: 'Deine Lernzeit bekommt einen festen Platz.',
      days: ['Montag', 'Mittwoch', 'Freitag'],
      events: [
        {day:0,start:9,length:2,title:'Vorlesung',kind:'fixed'},
        {day:0,start:14,length:2,title:'Statistik lernen',kind:'task'},
        {day:1,start:13,length:2,title:'Übungsaufgaben',kind:'task'},
        {day:2,start:10,length:2,title:'Probeklausur',kind:'task'},
        {day:2,start:14,length:3,title:'Dein freier Nachmittag',kind:'free'}
      ]
    },
    life: {
      prompt: '„Ich möchte diese Woche zweimal zum Sport. Halte meine Abende frei.“',
      title: 'Dein Plan macht Platz für dich.',
      days: ['Dienstag', 'Donnerstag', 'Freitag'],
      events: [
        {day:0,start:9,length:3,title:'Arbeit',kind:'fixed'},
        {day:1,start:9,length:3,title:'Arbeit',kind:'fixed'},
        {day:0,start:15,length:2,title:'Zeit für Sport',kind:'goal'},
        {day:1,start:14,length:2,title:'Zeit für Sport',kind:'goal'},
        {day:2,start:14,length:3,title:'Früher ins Wochenende',kind:'free'}
      ]
    }
  };
  let selectedExample = 'timetable';
  // A shared, animated illustration of planning. All sample data stays in the browser.
  const plannerRuns = new Map();
  const kinds = {fixed:['calendar','Termin'],task:['book','Aufgabe'],goal:['heart','Ziel'],free:['sparkles','Freiraum']};
  const timeLabel = value => `${String(Math.floor(value)).padStart(2,'0')}:${value % 1 ? '30' : '00'}`;
  const plannerMarkup = (data, {day = false, compact = false} = {}) => {
    const days = day ? ['Dienstag'] : data.days;
    const planningOrder = [...data.events.filter(event=>event.kind!=='free'),...data.events.filter(event=>event.kind==='free')];
    const dayStrip = day ? `<div class="planner-week-strip" aria-label="Beispielwoche">${['Mo','Di','Mi','Do','Fr'].map((name,i)=>`<span class="planner-week-day${i===1?' is-current':''}"${i===1?' aria-current="date"':''}><small>${name}</small><strong>${9+i}</strong></span>`).join('')}</div>` : '';
    const hours = [8,10,12,14,16,18].map(hour=>`<span style="--hour:${hour-8}">${timeLabel(hour)}</span>`).join('');
    const columns = days.map((name,column)=>`<div class="planner-column"><div class="planner-column-heading">${name}</div><div class="planner-column-track">${data.events.filter(event=>(event.day||0)===column).map((event)=>{
      const [symbol,label] = kinds[event.kind];
      const order = planningOrder.indexOf(event);
      const time = `${timeLabel(event.start)}–${timeLabel(event.start+event.length)}`;
      return `<div class="planner-event kind-${event.kind}" style="--start:${event.start-8};--length:${event.length};--order:${order}" aria-label="${name}, ${time} Uhr, ${event.title}, ${label}"><div class="planner-event-top">${icon(symbol)}<small>${label}</small></div><strong>${event.title}</strong><span class="planner-event-time">${time}</span></div>`;
    }).join('')}</div></div>`).join('');
    return `<div class="planner" data-layout="${day?'day':'week'}"${compact?' data-compact="true"':''}><div class="planner-toolbar"><div class="planner-heading"><small>Beispielplanung</small><strong>${day?'Dein Dienstag':'Deine Woche'}</strong></div><button class="planner-replay" type="button" aria-label="Beispielplanung erneut abspielen">${icon('repeat')}<span>Nochmal planen</span></button></div>${dayStrip}<div class="planner-stage"><div class="planner-hours" aria-hidden="true">${hours}</div><div class="planner-grid" data-days="${days.length}">${columns}<div class="planner-scan" aria-hidden="true"></div></div></div><div class="planner-footer"><span class="planner-status" role="status" aria-atomic="true">${icon('check')}Alles hat seinen Platz.</span><span class="planner-legend"><i aria-hidden="true"></i>Zeit für dich bleibt frei</span></div></div>`;
  };
  const stopPlanner = host => {
    const run = plannerRuns.get(host);
    if(run){run.forEach(clearTimeout);plannerRuns.delete(host);}
    $('.planner',host)?.classList.remove('is-playing');
  };
  const playPlanner = host => {
    stopPlanner(host);
    const planner = $('.planner',host);
    const status = $('.planner-status',host);
    if(!planner)return;
    planner.classList.remove('is-planned');
    if(motion.matches){planner.classList.add('is-planned');status.innerHTML=`${icon('check')}Alles hat seinen Platz.`;return;}
    const timers = [];
    plannerRuns.set(host,timers);
    // Separate frames restart CSS animations without forcing a layout measurement.
    timers.push(setTimeout(()=>{
      planner.classList.add('is-playing');
      status.innerHTML=`${icon('sparkles')}Dein Alltag wird sortiert …`;
    },30));
    timers.push(setTimeout(()=>{status.innerHTML=`${icon('sparkles')}Aufgaben finden ihren Platz …`;},750));
    timers.push(setTimeout(()=>{
      planner.classList.remove('is-playing');
      planner.classList.add('is-planned');
      status.innerHTML=`${icon('check')}Alles hat seinen Platz.`;
      plannerRuns.delete(host);
    },2200));
  };
  const renderPlanner = (host,data,options) => {
    stopPlanner(host);
    host.innerHTML=plannerMarkup(data,options);
    $('.planner-replay',host).addEventListener('click',()=>playPlanner(host));
    playPlanner(host);
  };
  const selectExample = key => {
    selectedExample = key;
    $$('.prompt-chip').forEach(button => {
      const active = button.dataset.example === key;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('#prompt-text').textContent = examples[key].prompt;
    renderPlanner($('#hero-plan'),examples[key],{compact:true});
    if (!motion.matches && window.gsap) {gsap.killTweensOf('#prompt-text');gsap.fromTo('#prompt-text', {opacity:0,y:5,filter:'blur(3px)'}, {opacity:1,y:0,filter:'blur(0px)',duration:.3});}
  };
  $$('.prompt-chip').forEach(button => button.addEventListener('click', () => selectExample(button.dataset.example)));
  const dialog = $('#demo-dialog');
  const openDemo = () => {
    const example = examples[selectedExample];
    $('#demo-title').textContent = example.title;
    $('#demo-input').textContent = example.prompt;
    dialog.showModal();
    renderPlanner($('#demo-result'),example);
    document.body.classList.add('dialog-open');
    if (!motion.matches && window.gsap) {
      gsap.fromTo(dialog, {opacity:0,y:20,scale:.97}, {opacity:1,y:0,scale:1,duration:.35,ease:'power2.out'});
    }
  };
  $('#demo-open').addEventListener('click', openDemo);
  $('.import-demo').addEventListener('click', () => {selectExample('timetable'); openDemo();});
  $('#demo-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {if(event.target === dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close', () => {document.body.classList.remove('dialog-open');stopPlanner($('#demo-result'));});

  const audiences = {
    uni: {title:'Zwischen Hörsaal<br>und Feierabend.',copy:'Vorlesungen stehen fest. Lernzeiten, Nebenjob und Sport passen drumherum. Dein Kopf bleibt frei für das Studium.',events:[{start:9,length:1.5,title:'Vorlesung Statistik',kind:'fixed'},{start:11,length:2,title:'Hausarbeit schreiben',kind:'task'},{start:13.5,length:2,title:'Zeit für dich',kind:'free'},{start:16,length:1.5,title:'Zeit für Sport',kind:'goal'}]},
    school: {title:'Schule im Griff.<br>Kopf frei.',copy:'Deine Schulfächer sind schon eingetragen. Hausaufgaben, Prüfungsvorbereitung und Freizeit bekommen ihren eigenen Platz.',events:[{start:8,length:3,title:'Mathematik & Deutsch',kind:'fixed'},{start:12,length:2,title:'Hausaufgaben erledigen',kind:'task'},{start:14.5,length:1.5,title:'Einfach mal nichts vor',kind:'free'},{start:16.5,length:1.5,title:'Fußballtraining',kind:'goal'}]},
    life: {title:'Alles unter einen Hut.<br>Und Zeit für dich.',copy:'Arbeit, Erledigungen und gute Vorsätze. Weeva hilft dir, deinen Tag realistisch zu planen und Freiräume zu behalten.',events:[{start:9,length:1.5,title:'Team-Meeting',kind:'fixed'},{start:12,length:1.5,title:'Besorgungen machen',kind:'task'},{start:14,length:2,title:'Dein freier Nachmittag',kind:'free'},{start:16.5,length:1.5,title:'Eine Runde laufen',kind:'goal'}]}
  };
  const tabs = $$('[data-audience]');
  const setAudience = key => {
    const data = audiences[key];
    tabs.forEach(tab => {const active=tab.dataset.audience===key;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
    $('#audience-panel').setAttribute('aria-labelledby',`tab-${key}`);
    $('#audience-title').innerHTML = data.title;
    $('#audience-copy').textContent = data.copy;
    renderPlanner($('#audience-events'),data,{day:true});
    if (!motion.matches && window.gsap) {gsap.killTweensOf('#audience-panel');gsap.fromTo('#audience-panel', {opacity:0,y:9}, {opacity:1,y:0,duration:.35});}
  };
  tabs.forEach((tab,index) => {
    tab.addEventListener('click',()=>setAudience(tab.dataset.audience));
    tab.addEventListener('keydown',event=>{
      let target;
      if(event.key==='ArrowRight')target=tabs[(index+1)%tabs.length];
      if(event.key==='ArrowLeft')target=tabs[(index+tabs.length-1)%tabs.length];
      if(event.key==='Home')target=tabs[0];
      if(event.key==='End')target=tabs.at(-1);
      if(target){event.preventDefault();setAudience(target.dataset.audience);target.focus();}
    });
  });
  renderPlanner($('#hero-plan'),examples.timetable,{compact:true});
  renderPlanner($('#audience-events'),audiences.uni,{day:true});
  // Play when the visitor reaches each preview; replay remains explicitly available.
  if('IntersectionObserver' in window){
    const plannerObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){playPlanner(entry.target);plannerObserver.unobserve(entry.target);}
    }),{threshold:.45});
    [$('#hero-plan'),$('#audience-events')].forEach(host=>plannerObserver.observe(host));
  }
  motion.addEventListener('change',()=>{
    if(motion.matches)[...plannerRuns.keys()].forEach(host=>{stopPlanner(host);playPlanner(host);});
  });

  // Accessible details preserve native behavior without JavaScript; animation progressively enhances it.
  $$('.faq-list details').forEach(details => {
    const summary = $('summary',details);
    const content = $('.faq-answer',details);
    let tween;
    summary.addEventListener('click', event => {
      if(motion.matches || !window.gsap)return;
      event.preventDefault();
      const closing = details.open && !details.dataset.closing;
      tween?.kill();
      if(closing) {
        details.dataset.closing = 'true';
        tween = gsap.to(content,{height:0,opacity:0,duration:.3,ease:'power1.inOut',onComplete:()=>{details.open=false;delete details.dataset.closing;gsap.set(content,{clearProps:'height,opacity'});ScrollTrigger.refresh();}});
      } else {
        const reversing = details.dataset.closing;
        delete details.dataset.closing;
        details.open=true;
        if(!reversing)gsap.set(content,{height:0,opacity:0});
        tween=gsap.to(content,{height:'auto',opacity:1,duration:.3,ease:'power1.inOut',onComplete:()=>{gsap.set(content,{clearProps:'height,opacity'});ScrollTrigger.refresh();}});
      }
    });
  });
  $$('a[href="#faq-ki"]').forEach(a=>a.addEventListener('click',()=>{$('#faq-ki').open=true;requestAnimationFrame(()=>window.ScrollTrigger?.refresh());}));

  const gallery=$('#gallery');
  const galleryStep = () => $('.product-card',gallery).getBoundingClientRect().width + parseFloat(getComputedStyle(gallery).gap);
  const moveGallery=direction=>gallery.scrollBy({left:direction*galleryStep(),behavior:motion.matches?'instant':'smooth'});
  $('#gallery-prev').addEventListener('click',()=>moveGallery(-1));
  $('#gallery-next').addEventListener('click',()=>moveGallery(1));
  gallery.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();moveGallery(event.key==='ArrowRight'?1:-1);}});
  let dragging=false,dragStart=0,scrollStart=0,lastX=0,lastAt=0,velocity=0,dragTween;
  gallery.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse')return;
    dragging=true;dragTween?.kill();dragStart=lastX=event.clientX;scrollStart=gallery.scrollLeft;lastAt=performance.now();velocity=0;
    gallery.classList.add('dragging');gallery.setPointerCapture(event.pointerId);
  });
  gallery.addEventListener('pointermove',event=>{
    if(!dragging)return;
    const now=performance.now();
    velocity=(lastX-event.clientX)/Math.max(1,now-lastAt)*1000;
    lastX=event.clientX;lastAt=now;
    gallery.scrollLeft=scrollStart+dragStart-event.clientX;
  });
  const releaseGallery=()=>{
    if(!dragging)return;dragging=false;
    if(window.gsap&&!motion.matches){
      const max=gallery.scrollWidth-gallery.clientWidth;
      const target=Math.max(0,Math.min(max,gallery.scrollLeft+velocity*.3));
      dragTween=gsap.to(gallery,{scrollLeft:target,duration:.65,ease:'power3.out',onComplete:()=>gallery.classList.remove('dragging')});
    } else gallery.classList.remove('dragging');
  };
  gallery.addEventListener('pointerup',releaseGallery);gallery.addEventListener('pointercancel',releaseGallery);gallery.addEventListener('lostpointercapture',releaseGallery);
  gallery.addEventListener('dragstart',event=>event.preventDefault());
  window.initWeevaFluid?.($('#fluid'),motion.matches);
  if(!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  if(window.SplitText)gsap.registerPlugin(SplitText);
  const mm=gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)',()=>{
    gsap.from(header,{y:-20,opacity:0,filter:'blur(10px)',duration:.6,ease:'power2.out',clearProps:'transform,opacity,filter'});
    gsap.from('.site-header .wordmark',{x:-20,opacity:0,duration:.5,delay:.1,clearProps:'all'});
    gsap.from('.desktop-nav a, .header-actions>*',{y:-10,opacity:0,duration:.4,delay:.15,stagger:.05,clearProps:'transform,opacity'});
    gsap.from('.hero-enter',{y:28,opacity:0,filter:'blur(8px)',duration:.7,stagger:.11,delay:.15,ease:'power2.out',clearProps:'all'});
    let lastScroll=0;
    ScrollTrigger.create({start:0,end:'max',onUpdate:self=>{
      if(menuOpen||(document.activeElement?.closest('.site-header')&&document.activeElement.matches(':focus-visible')))return;
      const current=self.scroll();
      if(Math.abs(current-lastScroll)<3)return;
      header.classList.toggle('is-hidden',self.direction===1&&current>50);
      lastScroll=current;
    }});
    const heroTimeline=gsap.timeline({scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:.6}});
    heroTimeline.to('.hero-background',{scaleY:0,duration:.5,ease:'none'},0).to('.hero-background',{y:()=>$('.hero').offsetHeight*.7,duration:1,ease:'none'},0);
    $$('[data-reveal]').forEach(el=>gsap.from(el,{y:30,opacity:0,filter:'blur(5px)',duration:.7,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 88%',once:true},clearProps:'all'}));
    $$('[data-stagger]').forEach(el=>gsap.from([...el.children],{y:20,opacity:0,duration:.6,stagger:.1,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 88%',once:true},clearProps:'transform,opacity'}));
    $$('.product-card').forEach((el,i)=>gsap.from(el,{y:30,opacity:0,duration:.6,delay:.1*i,scrollTrigger:{trigger:gallery,start:'top 90%',once:true},clearProps:'transform,opacity'}));
    const splits=[];
    if(window.SplitText){
      $$('[data-split]').forEach(el=>{
        const split=SplitText.create(el,{type:'words',tag:'span',wordsClass:'reveal-word'});splits.push(split);
        gsap.from(split.words,{y:30,opacity:0,filter:'blur(7px)',duration:.7,stagger:.055,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 88%',once:true},clearProps:'all'});
      });
      $$('.scroll-reveal').forEach(el=>{
        const split=SplitText.create(el,{type:'words,chars',tag:'span',wordsClass:'reveal-word',charsClass:'scroll-char'});splits.push(split);
        const chars=split.chars,N=chars.length,c=Math.ceil(N/2);
        const tl=gsap.timeline({scrollTrigger:{trigger:el,start:'top 140%',end:'top 15%',scrub:true}});
        chars.forEach((char,index)=>{
          const u=index<c?index:c-Math.abs(Math.floor(N/2)-index)-1;
          const delay=.5*(N>1?index/(N-1):0);
          gsap.set(char,{transformOrigin:'50% 100%'});
          tl.fromTo(char,{scale:.5+u/c*1.6,y:u/c*60,rotation:index<N/2?-4+u/c*4:u/c*4,filter:'blur(12px)',opacity:0},{scale:1,y:0,rotation:0,filter:'blur(0px)',opacity:1,duration:1-delay,ease:'power1.inOut'},delay);
        });
      });
    }
    gsap.from('.closing-glow',{scale:.65,opacity:.1,scrollTrigger:{trigger:'.closing-section',start:'top bottom',end:'bottom bottom',scrub:1}});
    return ()=>{splits.forEach(split=>split.revert());header.classList.remove('is-hidden');};
  });
  // Keep directional navigation accessible when keyboard focus returns to it.
  header.addEventListener('focusin',()=>header.classList.remove('is-hidden'));
  document.fonts.ready.then(()=>ScrollTrigger.refresh());
  window.addEventListener('load',()=>ScrollTrigger.refresh(),{once:true});
})();
