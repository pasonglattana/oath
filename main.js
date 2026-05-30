/* OATH — main.js | canvas hero · nav · fade-ins · form */
(function(){'use strict';
  const canvas=document.getElementById('hero-canvas');
  const grain=document.getElementById('grain-overlay');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const gCtx=grain?grain.getContext('2d'):null;
  let W,H,clock=0;
  let mouse={x:.5,y:.5},target={x:.5,y:.5};
  const COLORS=[[200,146,42],[160,82,45],[196,110,58],[244,237,228],[90,107,75],[122,92,58]];
  const NUM=70,parts=[];
  function makePart(born){const c=COLORS[Math.floor(Math.random()*COLORS.length)];return{x:Math.random()*W,y:born?Math.random()*H:H+5,r:.5+Math.random()*2.2,vx:(Math.random()-.5)*.22,vy:-(.14+Math.random()*.42),a:.06+Math.random()*.16,col:c,wob:Math.random()*Math.PI*2,wSpd:.005+Math.random()*.014,life:born?Math.floor(Math.random()*500):0,max:220+Math.random()*420};}
  function skyAt(t){const keys=[{t:0,top:[18,12,10],bot:[140,80,40]},{t:.2,top:[30,22,18],bot:[165,100,50]},{t:.42,top:[38,28,20],bot:[100,68,32]},{t:.62,top:[28,18,12],bot:[175,108,44]},{t:.78,top:[14,9,7],bot:[145,70,28]},{t:.9,top:[10,7,5],bot:[90,45,18]},{t:1,top:[18,12,10],bot:[140,80,40]}];let a=keys[0],b=keys[1];for(let i=0;i<keys.length-1;i++){if(t>=keys[i].t&&t<keys[i+1].t){a=keys[i];b=keys[i+1];break;}}const f=(t-a.t)/(b.t-a.t);const mix=(ca,cb)=>[0,1,2].map(i=>Math.round(ca[i]+(cb[i]-ca[i])*f));return{top:mix(a.top,b.top),bot:mix(a.bot,b.bot)};}
  function drawBg(t){const{top,bot}=skyAt(t);const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,`rgb(${top})`);g.addColorStop(1,`rgb(${bot})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  function drawGlow(){const cx=W*.5+(mouse.x-.5)*W*.12,cy=H*.52+(mouse.y-.5)*H*.07,p=.16+.07*Math.sin(clock*.0028);const g=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(W,H)*.82);g.addColorStop(0,`rgba(200,130,40,${p})`);g.addColorStop(.4,`rgba(200,130,40,${p*.28})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  function drawFog(){for(let i=0;i<3;i++){const y=H*(.44+i*.13)+Math.sin(clock*.0007+i*1.3)*18,a=.035+.015*Math.sin(clock*.001+i);const g=ctx.createLinearGradient(0,y-55,0,y+55);g.addColorStop(0,'rgba(210,196,185,0)');g.addColorStop(.5,`rgba(210,196,185,${a})`);g.addColorStop(1,'rgba(210,196,185,0)');ctx.fillStyle=g;ctx.fillRect(0,y-55,W,110);}}
  const cracks=[];
  function makeCrack(){let x=Math.random()*W,y=H*.55+Math.random()*H*.45;const pts=[{x,y}];for(let i=0;i<4+Math.floor(Math.random()*6);i++){x+=(Math.random()-.5)*80;y+=10+Math.random()*38;pts.push({x,y});}return{pts,prog:0,spd:.003+Math.random()*.005,op:0,target:.04+Math.random()*.07};}
  function drawCracks(){cracks.forEach(c=>{c.prog=Math.min(1,c.prog+c.spd);c.op+=(c.target-c.op)*.018;ctx.beginPath();ctx.strokeStyle=`rgba(155,115,75,${c.op})`;ctx.lineWidth=.5;ctx.setLineDash([2,4]);const{pts}=c,n=(pts.length-1)*c.prog,full=Math.floor(n),frac=n-full;ctx.moveTo(pts[0].x,pts[0].y);for(let i=0;i<full&&i<pts.length-1;i++)ctx.lineTo(pts[i+1].x,pts[i+1].y);if(full<pts.length-1){const p=pts[full],q=pts[full+1];ctx.lineTo(p.x+(q.x-p.x)*frac,p.y+(q.y-p.y)*frac);}ctx.stroke();ctx.setLineDash([]);});}
  function drawParts(){parts.forEach((p,i)=>{p.life++;p.wob+=p.wSpd;p.x+=p.vx+Math.sin(p.wob)*.28;p.y+=p.vy;const lf=p.life/p.max,a=lf<.1?p.a*(lf/.1):lf>.8?p.a*(1-(lf-.8)/.2):p.a;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${p.col},${a})`;ctx.fill();if(p.life>=p.max||p.y<-10)parts[i]=makePart(false);});}
  function drawVignette(){const g=ctx.createRadialGradient(W/2,H/2,H*.08,W/2,H/2,H*.85);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.68)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}
  function buildGrain(){if(!gCtx)return;grain.width=W;grain.height=H;const id=gCtx.createImageData(W,H);for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255|0;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=8;}gCtx.putImageData(id,0,0);}
  function frame(){clock++;if(clock%120===0)buildGrain();const t=(clock*.00022)%1;drawBg(t);drawGlow();drawFog();drawCracks();drawParts();drawVignette();requestAnimationFrame(frame);}
  function resize(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;if(grain){grain.width=W;grain.height=H;}}
  function init(){resize();cracks.length=0;for(let i=0;i<14;i++)cracks.push(makeCrack());parts.length=0;for(let i=0;i<NUM;i++)parts.push(makePart(true));buildGrain();frame();}
  window.addEventListener('resize',()=>{resize();cracks.length=0;for(let i=0;i<14;i++)cracks.push(makeCrack());});
  document.addEventListener('mousemove',e=>{target.x=e.clientX/W;target.y=e.clientY/H;});
  (function lerp(){mouse.x+=(target.x-mouse.x)*.045;mouse.y+=(target.y-mouse.y)*.045;requestAnimationFrame(lerp);})();
  init();
  const nav=document.getElementById('nav');
  window.addEventListener('scroll',()=>{nav.classList.toggle('scrolled',window.scrollY>60);},{passive:true});
  const burger=document.querySelector('.hamburger'),mobileNav=document.querySelector('.mobile-nav');
  if(burger&&mobileNav){burger.addEventListener('click',()=>{const open=mobileNav.classList.toggle('open');burger.classList.toggle('open',open);burger.setAttribute('aria-expanded',String(open));document.body.style.overflow=open?'hidden':'';});mobileNav.querySelectorAll('a').forEach(a=>{a.addEventListener('click',()=>{mobileNav.classList.remove('open');burger.classList.remove('open');burger.setAttribute('aria-expanded','false');document.body.style.overflow='';});});}
  const si=document.querySelector('.scroll-indicator');
  if(si)si.addEventListener('click',()=>document.getElementById('about').scrollIntoView({behavior:'smooth'}));
  const fadeEls=document.querySelectorAll('.fade-in');
  if('IntersectionObserver' in window){const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target);}});},{threshold:.12});fadeEls.forEach(el=>io.observe(el));}else{fadeEls.forEach(el=>el.classList.add('visible'));}
  const form=document.querySelector('.booking-form');
  if(form){form.addEventListener('submit',e=>{e.preventDefault();const btn=form.querySelector('.submit-btn');btn.textContent="Received — we'll be in touch.";btn.disabled=true;});}
})();