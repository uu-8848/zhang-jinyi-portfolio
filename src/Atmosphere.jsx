import React,{useEffect,useRef,useState} from 'react';
import {clamp,gridPoint} from './geometry.js';
import GlassShader from './GlassShader.jsx';

export function VideoBackdrop({scene='membranes',paused=false,className=''}){
  const video=useRef(null);const[source,setSource]=useState(null),[live,setLive]=useState(false);
  useEffect(()=>{setSource(`/assets/cinema/${scene}-${window.matchMedia('(max-width:680px)').matches?'mobile':'loop'}.mp4`);},[scene]);
  useEffect(()=>{
    if(!source)return;const el=video.current;let visible=false,disposed=false;
    el.muted=true;
    const sync=()=>{if(disposed)return;if(visible&&!paused&&!document.hidden)el.play().catch(()=>{});else el.pause();};
    const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();},{rootMargin:'80px',threshold:.01}):null;
    if(observer)observer.observe(el.parentElement);else visible=true;
    el.addEventListener('canplay',sync);document.addEventListener('visibilitychange',sync);window.addEventListener('pointerdown',sync,{passive:true});sync();
    return()=>{disposed=true;observer?.disconnect();el.removeEventListener('canplay',sync);document.removeEventListener('visibilitychange',sync);window.removeEventListener('pointerdown',sync);el.pause();};
  },[source,paused]);
  return <div className={`video-backdrop scene-${scene} ${live?'video-live':''} ${className}`} aria-hidden="true"><img className="bg-poster" src={`/assets/cinema/${scene}-poster.webp`} alt=""/><video ref={video} className="bg-video" src={source||undefined} poster={`/assets/cinema/${scene}-poster.webp`} autoPlay={!paused} muted loop playsInline preload={scene==='opening'?'auto':'metadata'} tabIndex={-1} onPlaying={()=>setLive(true)} onError={()=>setLive(false)}/><GlassShader video={video} paused={paused} ready={live} scene={scene}/><div className="video-tint"/></div>;
}

export function PointerGrid({paused=false}){
  const canvas=useRef(null),lens=useRef(null);
  useEffect(()=>{
    const el=canvas.current,hero=el.closest('section'),ctx=el.getContext('2d');if(!ctx)return;
    let frame=0,visible=true,disposed=false,last=0,w=1,h=1,strength=0,targetStrength=0;
    let pointer={x:0,y:0},target={x:0,y:0};
    const coarse=window.matchMedia('(pointer:coarse)').matches;
    const draw=()=>{
      ctx.clearRect(0,0,w,h);const step=coarse?36:26,radius=Math.min(w*.24,190);
      const point=(x,y)=>{const p=gridPoint(x,y,pointer,radius,strength);return {...p,y:p.y-p.z*.18};};
      ctx.lineWidth=.65;
      for(let row=0;row<=Math.ceil(h/step);row++){
        ctx.beginPath();for(let column=0;column<=Math.ceil(w/step);column++){const p=point(column*step,row*step);if(column===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle='rgba(39,69,53,.11)';ctx.stroke();
      }
      for(let column=0;column<=Math.ceil(w/step);column++){
        ctx.beginPath();for(let row=0;row<=Math.ceil(h/step);row++){const p=point(column*step,row*step);if(row===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.strokeStyle='rgba(47,72,57,.13)';ctx.stroke();
      }
      if(strength>.01){
        for(let row=Math.floor((pointer.y-radius)/step);row<=(pointer.y+radius)/step;row++)for(let column=Math.floor((pointer.x-radius)/step);column<=(pointer.x+radius)/step;column++){
          const p=point(column*step,row*step);if(p.force<.03)continue;
          ctx.fillStyle=`rgba(250,247,226,${p.force*.10})`;ctx.fillRect(p.x+2,p.y+2,step-4,step-4);
          ctx.strokeStyle=`rgba(247,245,222,${p.force*.38})`;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+step,p.y);ctx.stroke();
        }
      }
      hero.style.setProperty('--probe-x',String((pointer.x/Math.max(1,w)*2-1)*strength));hero.style.setProperty('--probe-y',String((pointer.y/Math.max(1,h)*2-1)*strength));
      if(lens.current){lens.current.style.transform=`translate3d(${pointer.x}px,${pointer.y}px,0)`;lens.current.style.opacity=String(strength*.7);}
    };
    const tick=stamp=>{frame=0;if(disposed||!visible||document.hidden)return;const dt=last?Math.min(stamp-last,60):16;last=stamp;const speed=1-Math.exp(-dt/75);pointer.x+=(target.x-pointer.x)*speed;pointer.y+=(target.y-pointer.y)*speed;strength+=(targetStrength-strength)*speed;draw();if(Math.abs(strength-targetStrength)>.002||Math.hypot(pointer.x-target.x,pointer.y-target.y)>.2)frame=requestAnimationFrame(tick);};
    const schedule=()=>{if(!frame&&!paused)frame=requestAnimationFrame(tick);};
    const move=event=>{if(paused||coarse)return;const r=hero.getBoundingClientRect();target={x:event.clientX-r.left,y:event.clientY-r.top};targetStrength=1;schedule();};
    const leave=()=>{targetStrength=0;schedule();};
    const resize=()=>{const r=hero.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,1.5);w=r.width;h=r.height;el.width=Math.round(w*ratio);el.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);pointer=target={x:w*.64,y:h*.46};draw();};
    const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;}},{threshold:.01}):null;observer?.observe(hero);
    const size=new ResizeObserver(resize);size.observe(hero);hero.addEventListener('pointermove',move,{passive:true});hero.addEventListener('pointerleave',leave);resize();
    return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();size.disconnect();hero.removeEventListener('pointermove',move);hero.removeEventListener('pointerleave',leave);hero.style.setProperty('--probe-x','0');hero.style.setProperty('--probe-y','0');};
  },[paused]);
  return <><canvas ref={canvas} className="pointer-grid" aria-hidden="true"/><div ref={lens} className="field-lens" aria-hidden="true"><i/></div></>;
}

export function ArtCursor({paused=false,root}){
  const dot=useRef(null),ring=useRef(null),wake=useRef(null);
  useEffect(()=>{
    if(paused||!window.matchMedia('(pointer:fine)').matches)return;
    document.documentElement.classList.add('cinematic-cursor');let frame=0,x=0,y=0,tx=0,ty=0,seen=false,hover=false,hidden=false;
    const paint=()=>{frame=0;const dx=tx-x,dy=ty-y;x+=dx*.18;y+=dy*.18;const speed=Math.min(1.3,1+Math.hypot(dx,dy)*.008);const angle=Math.atan2(dy,dx)*180/Math.PI;
      ring.current.style.transform=`translate3d(${x}px,${y}px,0) rotate(${angle}deg) scale(${speed},${1/speed})`;ring.current.dataset.hover=String(hover);ring.current.dataset.visible=String(seen&&!hidden);
      wake.current.style.transform=`translate3d(${x-dx*.25}px,${y-dy*.25}px,0)`;wake.current.dataset.visible=String(seen&&!hidden);
      root.current?.style.setProperty('--pointer-x',String(tx/window.innerWidth*2-1));root.current?.style.setProperty('--pointer-y',String(ty/window.innerHeight*2-1));
      if(Math.hypot(dx,dy)>.15)frame=requestAnimationFrame(paint);
    };
    const move=event=>{tx=event.clientX;ty=event.clientY;if(!seen){x=tx;y=ty;seen=true;}hover=Boolean(event.target.closest('a,button,[data-art-link]'));hidden=Boolean(event.target.closest('video,input,textarea'));dot.current.style.transform=`translate3d(${tx}px,${ty}px,0)`;dot.current.dataset.visible=String(!hidden);if(!frame)frame=requestAnimationFrame(paint);};
    const leave=()=>{seen=false;for(const r of [dot,ring,wake])if(r.current)r.current.dataset.visible='false';};
    window.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',leave);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',leave);document.documentElement.classList.remove('cinematic-cursor');leave();};
  },[paused,root]);
  return <div className="cursor-field" aria-hidden="true"><i ref={dot} className="cursor-dot"/><i ref={ring} className="cursor-ring"/><i ref={wake} className="cursor-wake"/></div>;
}

export function PixelCurtain({works,paused=false,reduced=false}){
  const canvas=useRef(null),introPlayed=useRef(false);
  useEffect(()=>{
    if(paused||reduced)return;const el=canvas.current,ctx=el.getContext('2d');if(!ctx)return;
    let w=1,h=1,frame=0,start=performance.now(),intro=!introPlayed.current,disposed=false;
    introPlayed.current=true;
    const hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
    const band=(y,colour,phase=0)=>{
      const tile=w<700?13:18;
      for(let x=0;x<w;x+=tile){const column=Math.floor(x/tile),offset=(hash(column,3)-.5)*92+Math.sin(column*.61+phase)*19;
        for(let row=-3;row<4;row++){if(hash(column,row+8)<Math.abs(row)*.13)continue;const yy=y+offset+row*tile;
          ctx.fillStyle=`rgba(${colour},${.16+(1-Math.abs(row)/4)*.47})`;ctx.fillRect(x,yy,tile+1,tile+1);
          ctx.fillStyle='rgba(250,247,229,.22)';ctx.fillRect(x+1,yy+1,tile-2,1);
        }
      }
    };
    const paint=stamp=>{
      frame=0;if(disposed)return;ctx.clearRect(0,0,w,h);
      if(intro){const p=clamp((stamp-start)/1250);const tile=w<700?24:34;for(let x=0;x<w;x+=tile){const lag=hash(x,1)*.15,front=Math.floor(clamp((p-lag)/.85)*h/tile)*tile;ctx.fillStyle='rgba(216,222,204,.98)';ctx.fillRect(x,front,tile+1,h-front);for(let j=0;j<3;j++){ctx.globalAlpha=(1-p)*.7;ctx.fillRect(x,front-(j+1)*tile,tile,tile);ctx.globalAlpha=1;}}if(p>=1){intro=false;ctx.clearRect(0,0,w,h);}}
      else{
        document.querySelectorAll('[data-chapter]').forEach(section=>{const y=section.getBoundingClientRect().top;if(y>-110&&y<h+110)band(y,section.id==='contact'?'185,200,179':'197,211,189',window.scrollY/h);});
        const progress=Number(works.current?.dataset.progress||0),fraction=progress-Math.floor(progress);
        if(!works.current?.classList.contains('flat-exhibition')&&progress>0&&progress<5.1&&fraction>.05&&fraction<.92)band(h*(1-fraction),'183,203,180',fraction*3);
      }
      if(intro)frame=requestAnimationFrame(paint);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint);};
    const resize=()=>{w=window.innerWidth;h=window.innerHeight;const d=Math.min(window.devicePixelRatio||1,1.4);el.width=Math.round(w*d);el.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);schedule();};
    const step=()=>schedule();window.addEventListener('scroll',step,{passive:true});window.addEventListener('resize',resize);window.addEventListener('exhibitframe',step);resize();
    return()=>{disposed=true;cancelAnimationFrame(frame);window.removeEventListener('scroll',step);window.removeEventListener('resize',resize);window.removeEventListener('exhibitframe',step);ctx.clearRect(0,0,w,h);};
  },[works,paused,reduced]);
  return <canvas ref={canvas} className="pixel-curtain" aria-hidden="true"/>;
}
