import React,{useCallback,useEffect,useRef,useState} from 'react';
import {contact,journey} from './content.js';
import {projects,showreel} from './artworks.js';
import {resolveFilmLink} from './films.js';
import ProjectDialog from './ProjectDialog.jsx';
import {VideoBackdrop,PointerGrid,ArtCursor,PixelCurtain} from './Atmosphere.jsx';
import {clamp,cardPose,exhibitProgress} from './geometry.js';

const asset=file=>'/assets/'+file;
const projectURL=(id,film=false)=>'?project='+id+(film?'&view=film':'');
const Arrow=({down=false})=><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d={down?'M16 5v22M7 18l9 9 9-9':'M6 26 26 6M6 6h20v20'} stroke="currentColor" strokeWidth="1.3"/></svg>;
const Close=()=> <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 5 14 14M5 19 19 5" stroke="currentColor" strokeWidth="1.25"/></svg>;
const Note=({number,children,english})=><div className="section-note"><span>/{number}</span><span>{children}</span><span className="en">{english}</span></div>;

function MagneticLink({children,className='',...props}){
  const move=event=>{if(event.pointerType!=='mouse'||window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;const r=event.currentTarget.getBoundingClientRect();event.currentTarget.style.setProperty('--magnet-x',`${(event.clientX-r.left-r.width/2)*.09}px`);event.currentTarget.style.setProperty('--magnet-y',`${(event.clientY-r.top-r.height/2)*.09}px`);};
  const leave=event=>{event.currentTarget.style.setProperty('--magnet-x','0px');event.currentTarget.style.setProperty('--magnet-y','0px');};
  return <a {...props} className={`magnetic ${className}`} onPointerMove={move} onPointerLeave={leave}>{children}</a>;
}

function ResolvingName({paused}){
  const letters=useRef(null),done=useRef(false);
  useEffect(()=>{
    const el=letters.current,name='ZHANG JINYI';let frame=0,cancelled=false;
    const fill=text=>{el.children[0].textContent=text.slice(0,5);el.children[1].textContent=text.slice(6);};
    if(paused||done.current){fill(name);return;}
    const begin=()=>{if(cancelled)return;const start=performance.now();const symbols='ABCDEFGHIJKLMNOPQRSTUVWXYZ';const paint=now=>{const progress=clamp((now-start)/950);fill([...name].map((letter,index)=>letter===' '?letter:progress>index/name.length?letter:symbols[(Math.floor(now/55)+index*7)%symbols.length]).join(''));if(progress<1)frame=requestAnimationFrame(paint);else done.current=true;};frame=requestAnimationFrame(paint);};
    Promise.race([document.fonts?.ready||Promise.resolve(),new Promise(resolve=>setTimeout(resolve,600))]).then(begin);
    return()=>{cancelled=true;cancelAnimationFrame(frame);fill(name);};
  },[paused]);
  return <h1 className="artist-name" aria-label="张津溢 Zhang Jinyi"><span ref={letters} aria-hidden="true"><span>ZHANG</span><span>JINYI</span></span><span className="sr-only">张津溢 · Zhang Jinyi</span></h1>;
}

function Header({menu,setMenu,paused,setPaused}){
  useEffect(()=>{const close=event=>{if(event.key==='Escape')setMenu(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[setMenu]);
  return <header className="site-header"><a className="signature" href="#home" onClick={()=>setMenu(false)}>张津溢<span className="en">ZHANG JINYI</span></a><nav id="main-navigation" className={`navigation ${menu?'open':''}`} aria-label="主导航">{[['works','作品'],['about','履历'],['contact','联系']].map(([id,label])=><a key={id} href={`#${id}`} onClick={()=>setMenu(false)}>{label}<span aria-hidden="true">↗</span></a>)}<a href={asset('zhang-jinyi-resume.pdf')} download="张津溢_简历.pdf" onClick={()=>setMenu(false)}>简历<span aria-hidden="true">↓</span></a></nav><button className="motion-toggle" onClick={()=>setPaused(!paused)} aria-pressed={paused}><i aria-hidden="true">{paused?'▷':'Ⅱ'}</i><span>{paused?'启用动态':'暂停动态'}</span></button><button className="menu-toggle" aria-controls="main-navigation" aria-expanded={menu} aria-label={menu?'关闭导航':'打开导航'} onClick={()=>setMenu(!menu)}>{menu?<Close/>:<><i/><i/></>}</button></header>;
}

function Hero({paused}){
  return <section id="home" className="hero" data-chapter="opening"><VideoBackdrop scene="opening" paused={paused}/><PointerGrid paused={paused}/><div className="hero-copy"><p className="hero-overline">动画 / 影像 / 材料实验</p><ResolvingName paused={paused}/><div className="hero-identity"><p>张津溢<span>动画、绘画与跨媒介实验</span></p><div className="schools"><p>皇家艺术学院<span className="en">ROYAL COLLEGE OF ART · MA ANIMATION</span></p><p>湖北美术学院<span className="en">HUBEI INSTITUTE OF FINE ARTS</span></p></div></div></div><div className="hero-bottom"><span className="en">作品集 · 2026</span><MagneticLink href="#works" className="explore">进入作品<Arrow down/></MagneticLink><span className="hero-caption">在形体与时间之间</span></div></section>;
}

function useExhibition(root,works,cards,flat,paused){
  const[active,setActive]=useState(0);
  useEffect(()=>{
    let frame=0,last=0,position=window.scrollY,target=position,disposed=false;let height=window.innerHeight,width=window.innerWidth,start=0;
    const measure=()=>{height=window.innerHeight;width=window.innerWidth;root.current?.style.setProperty('--screen-h',`${height}px`);start=(works.current?.getBoundingClientRect().top||0)+window.scrollY;};
    const paint=now=>{
      frame=0;if(disposed)return;const dt=last?Math.min(60,now-last):16;last=now;position+=(target-position)*(paused||flat?1:1-Math.exp(-dt/65));
      const progress=exhibitProgress(position,start,height,projects.length);if(works.current)works.current.dataset.progress=String(progress);
      root.current?.style.setProperty('--page-progress',String(clamp(position/Math.max(1,document.documentElement.scrollHeight-height))));
      if(!flat)cards.current.forEach((el,index)=>{if(!el)return;const p=cardPose(index,progress,height,width);el.style.transform=`translate(-50%,-50%) translate3d(${p.x}px,${p.y}px,0) rotate(${p.rotation}deg) scale(${p.scale})`;el.style.opacity=String(p.opacity);el.style.filter=`blur(${p.blur}px)`;el.style.zIndex=String(index+2);});
      setActive(Math.min(projects.length-1,Math.floor(progress+.18)));window.dispatchEvent(new Event('exhibitframe'));
      if(Math.abs(position-target)>.15)frame=requestAnimationFrame(paint);
    };
    const schedule=()=>{target=window.scrollY;if(!frame)frame=requestAnimationFrame(paint);};
    const resize=()=>{measure();schedule();};measure();schedule();
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',resize);window.addEventListener('load',resize);
    return()=>{disposed=true;cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',resize);window.removeEventListener('load',resize);};
  },[root,works,cards,flat,paused]);
  return active;
}

function WorkCard({project,index,onOpen,cardRef,active,flat,paused}){
  const film=resolveFilmLink(project.id);
  const tilt=event=>{if(paused||event.pointerType!=='mouse')return;const r=event.currentTarget.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;event.currentTarget.style.setProperty('--tilt-x',`${(y-.5)*-3}deg`);event.currentTarget.style.setProperty('--tilt-y',`${(x-.5)*3}deg`);event.currentTarget.style.setProperty('--light-x',`${x*100}%`);event.currentTarget.style.setProperty('--light-y',`${y*100}%`);};
  const rest=event=>{event.currentTarget.style.setProperty('--tilt-x','0deg');event.currentTarget.style.setProperty('--tilt-y','0deg');};
  const open=(event,atFilm=false)=>{event.preventDefault();onOpen(project,atFilm);};
  return <article ref={cardRef} className="project-card" data-active={active} data-project={project.id} inert={!flat&&!active} aria-hidden={!flat&&!active?true:undefined}><div className="poster-frame" onPointerMove={tilt} onPointerLeave={rest}><div className="poster-heading"><span className="en">{project.number} / 06</span><h3>{project.title}</h3><span className="poster-year">{project.year}</span></div><a className="poster-art" href={projectURL(project.id)} onClick={open} data-art-link aria-label={`进入${project.title}作品档案`}><img src={asset(project.cover)} alt={`${project.title} · 原始封面`} loading={index<2?'eager':'lazy'} decoding="async"/><span className="poster-sheen" aria-hidden="true"/><span className="poster-enter" aria-hidden="true"><Arrow/></span></a><div className="poster-footer"><div><span className="en">{project.english}</span><p>{project.medium}</p></div><a href={projectURL(project.id)} onClick={open}>作品档案<Arrow/></a><a className="film-link" href={projectURL(project.id,true)} onClick={event=>open(event,true)}>{film?'观看影片':'影片 · 待上传'}<Arrow/></a></div></div></article>;
}

function Works({root,worksRef,cards,flat,paused,onOpen}){
  const active=useExhibition(root,worksRef,cards,flat,paused);
  const jump=index=>{if(flat){cards.current[index]?.scrollIntoView({block:'center',behavior:'auto'});return;}const start=worksRef.current.getBoundingClientRect().top+window.scrollY;window.scrollTo({top:start+(index+.35)*window.innerHeight,behavior:'auto'});};
  return <section id="works" ref={worksRef} className={`works ${flat?'flat-exhibition':''}`} data-chapter="works" style={{'--chapter-count':projects.length+1.4}}><div className="exhibition-pin"><VideoBackdrop scene="membranes" paused={paused}/><div className="exhibition-heading"><Note number="01" english="SELECTED WORKS">作品</Note><p>一些完成的故事，<br/>一些仍在变化的形体。</p></div><div className="work-rail" aria-label="选择作品">{projects.map((project,index)=><button key={project.id} onClick={()=>jump(index)} aria-current={!flat&&active===index?'step':undefined}><span className="en">{project.number}</span><span>{project.title}</span><i aria-hidden="true"/></button>)}</div><div className="poster-stage">{projects.map((project,index)=><WorkCard key={project.id} project={project} index={index} onOpen={onOpen} cardRef={el=>{cards.current[index]=el;}} active={index===active} flat={flat} paused={paused}/>)}</div><div className="exhibition-bottom"><span className="en">{flat?'六个精选项目':'向下滚动 · 浏览作品'}</span><span className="work-count en" aria-live="polite" hidden={flat}>{String(active+1).padStart(2,'0')}<i>/</i>06</span><span>向下，进入下一段时间</span></div></div></section>;
}

function Fragments({paused,onOpen}){
  return <section id="fragments" className="fragments chapter" data-chapter="fragments"><VideoBackdrop scene="membranes" paused={paused}/><div className="section-wrap fragments-layout"><div><Note number="02" english="FRAGMENT ARCHIVE">片段档案</Note><h2>传统动画，<br/>留下的片段。</h2><p>部分传统动画作品的选段。<br/>手绘、逐帧与材料，在时间里相遇。</p><MagneticLink className="underlined-link" href={projectURL(showreel.id,true)} onClick={event=>{event.preventDefault();onOpen(showreel,true);}}>观看传统动画片段合集<Arrow/></MagneticLink></div><a className="fragment-preview" href={projectURL(showreel.id,true)} onClick={event=>{event.preventDefault();onOpen(showreel,true);}} aria-label="播放传统动画片段合集"><img src={asset(showreel.cover)} alt="传统动画片段合集 · 影片静帧" loading="lazy" decoding="async"/><span className="play-circle" aria-hidden="true">▷</span><span className="fragment-tag en">传统动画片段 · 选段档案</span></a></div></section>;
}

function About({paused}){
  const[tab,setTab]=useState('education');const tabs=[['education','学习'],['experience','经历'],['recognition','展映与荣誉']];
  const keys=event=>{const current=tabs.findIndex(([key])=>key===tab);let next;if(event.key==='ArrowRight')next=(current+1)%tabs.length;if(event.key==='ArrowLeft')next=(current+tabs.length-1)%tabs.length;if(event.key==='Home')next=0;if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();setTab(tabs[next][0]);document.getElementById(`about-tab-${tabs[next][0]}`)?.focus();}};
  return <section id="about" className="about chapter" data-chapter="about"><VideoBackdrop scene="membranes" paused={paused}/><div className="section-wrap"><Note number="03" english="BEHIND THE FRAMES">关于创作者</Note><div className="about-layout"><div className="about-intro"><h2>张津溢<span className="en">Zhang Jinyi</span></h2><p className="about-statement">用绘画理解世界，<br/>用动画让它发生变化。</p><p>皇家艺术学院动画硕士。我的实践在手绘、材料、数字影像与叙事之间展开，关注形体如何携带情绪，以及图像如何在时间中改变。</p><p>从二维逐帧到 AI、实拍与后期，在不同的制作方法中寻找合适的表达。</p><MagneticLink className="underlined-link" href={asset('zhang-jinyi-resume.pdf')} download="张津溢_简历.pdf">阅读简历<Arrow/></MagneticLink></div><div className="artist-record"><div className="record-tabs" role="tablist" aria-label="创作者经历" onKeyDown={keys}>{tabs.map(([id,label])=><button key={id} role="tab" id={`about-tab-${id}`} aria-selected={tab===id} aria-controls={`about-panel-${id}`} tabIndex={tab===id?0:-1} onClick={()=>setTab(id)}>{label}</button>)}</div><div className="record-panel" id={`about-panel-${tab}`} role="tabpanel" aria-labelledby={`about-tab-${tab}`} tabIndex={0}>{journey[tab].map(item=><article key={item.title}><span className="record-date en">{item.date}</span><h3>{item.title}</h3><p className="record-sub">{item.sub}</p><p>{item.detail}</p></article>)}</div></div></div></div></section>;
}

function Contact({paused,onCopy}){
  return <section id="contact" className="contact chapter" data-chapter="contact"><VideoBackdrop scene="ending" paused={paused}/><div className="section-wrap contact-wrap"><Note number="04" english="LET'S MAKE SOMETHING">从一个想法开始</Note><div className="contact-heading"><h2>有一个想法，<br/>想听你说。</h2><MagneticLink className="contact-send" href={`mailto:${contact.email}?subject=${encodeURIComponent('作品集 · 创作与合作')}`} aria-label="发送邮件聊聊创作"><Arrow/></MagneticLink></div><div className="contact-details"><p>动画、影像、视觉创作与合作。<br/>也欢迎聊聊尚未成形的想法。</p><div><span className="en">联系邮箱</span><a className="email" href={`mailto:${contact.email}`}>{contact.email}</a><div className="contact-options"><button onClick={onCopy}>复制邮箱 ↗</button><a className="phone" href={`tel:${contact.phoneLink}`}>{contact.phone}</a></div></div></div><footer><span>© 2026 张津溢</span><span className="en">STAY CURIOUS. STAY IN MOTION.</span><a href="#home">回到起点 ↑</a></footer></div></section>;
}

export default function App(){
  const root=useRef(null),works=useRef(null),cards=useRef([]),returnFocus=useRef(null);
  const[paused,setPaused]=useState(false),[reduced,setReduced]=useState(false),[compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-height:650px)').matches),[menu,setMenu]=useState(false),[selection,setSelection]=useState(null),[toast,setToast]=useState('');
  useEffect(()=>{const screen=window.matchMedia('(max-height:650px)');const update=()=>setCompact(screen.matches);update();screen.addEventListener?.('change',update);return()=>screen.removeEventListener?.('change',update);},[]);
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion:reduce)');const update=()=>{setReduced(preference.matches);setPaused(preference.matches||Boolean(navigator.connection?.saveData));};update();preference.addEventListener?.('change',update);
    const read=()=>{const params=new URLSearchParams(window.location.search);const project=[...projects,showreel].find(p=>p.id===params.get('project'));setSelection(project?{project,film:params.get('view')==='film'}:null);};read();window.addEventListener('popstate',read);return()=>{preference.removeEventListener?.('change',update);window.removeEventListener('popstate',read);};
  },[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{document.title=selection?`${selection.project.title} — 张津溢作品集`:'张津溢 — 动画、绘画与跨媒介实验';},[selection]);
  const open=useCallback((project,film=false)=>{if(!selection)returnFocus.current=document.activeElement;setSelection({project,film});setMenu(false);const url=new URL(window.location.href);url.searchParams.set('project',project.id);if(film)url.searchParams.set('view','film');else url.searchParams.delete('view');url.hash='';window.history.pushState({},'',url);},[selection]);
  const close=useCallback(()=>{setSelection(null);const url=new URL(window.location.href);url.searchParams.delete('project');url.searchParams.delete('view');window.history.pushState({},'',url);requestAnimationFrame(()=>returnFocus.current?.focus({preventScroll:true}));},[]);
  const copy=async(value,message)=>{try{await navigator.clipboard.writeText(value);setToast(message);}catch{const input=document.createElement('textarea');input.value=value;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();const result=document.execCommand('copy');input.remove();setToast(result?message:'请选中地址后复制');}};
  const backgroundPaused=paused||Boolean(selection);
  return <div ref={root} className={`site ${paused?'motion-paused':''} ${reduced?'reduced-motion':''}`} data-dialog-open={Boolean(selection)}><a className="skip-link" href="#works">跳到作品</a><div className="reading-progress" aria-hidden="true"/><ArtCursor root={root} paused={paused||reduced}/><div inert={Boolean(selection)} aria-hidden={selection?true:undefined}><Header menu={menu} setMenu={setMenu} paused={paused} setPaused={setPaused}/><main><Hero paused={backgroundPaused}/><Works root={root} worksRef={works} cards={cards} flat={reduced||compact} paused={backgroundPaused} onOpen={open}/><Fragments paused={backgroundPaused} onOpen={open}/><About paused={backgroundPaused}/><Contact paused={backgroundPaused} onCopy={()=>copy(contact.email,'邮箱已复制')}/></main><PixelCurtain works={works} paused={backgroundPaused} reduced={reduced}/></div>{selection&&<ProjectDialog project={selection.project} startAtFilm={selection.film} onClose={close} onOpen={open} onShare={()=>copy(window.location.href,'项目链接已复制')} paused={paused}/>}<div className={`toast ${toast?'visible':''}`} role="status" aria-live="polite">{toast}</div></div>;
}
