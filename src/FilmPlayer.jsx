import React, { useEffect, useRef, useState } from 'react';

export default function FilmPlayer({src,poster,title}){
  const video=useRef(null),hls=useRef(null),retries=useRef(0),nativeStream=useRef(false);
  const[started,setStarted]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const stream=/\.m3u8(?:$|\?)/.test(src);
  useEffect(()=>{
    const el=video.current;
    const hide=()=>{if(document.hidden)el.pause();};
    document.addEventListener('visibilitychange',hide);
    return()=>{document.removeEventListener('visibilitychange',hide);el.pause();};
  },[]);
  useEffect(()=>{
    if(!stream||!started)return;
    let disposed=false;const el=video.current;setError('');setReady(false);retries.current=0;
    const play=()=>{if(!disposed)el.play().catch(()=>{});};
    const start=async()=>{
      nativeStream.current=attempt===0&&Boolean(el.canPlayType('application/vnd.apple.mpegurl'));
      if(nativeStream.current){el.src=src;el.addEventListener('loadedmetadata',play,{once:true});el.load();return;}
      try{
        const{default:Hls}=await import('hls.js');if(disposed)return;
        if(!Hls.isSupported()){setError('当前浏览器无法播放此影片，请换用较新的 Chrome、Edge 或 Safari。');return;}
        const player=new Hls({backBufferLength:24,maxBufferLength:24,enableWorker:true});hls.current=player;
        player.on(Hls.Events.MANIFEST_PARSED,play);
        player.on(Hls.Events.ERROR,(_event,data)=>{
          if(disposed||!data.fatal)return;
          if(retries.current++<1){if(data.type===Hls.ErrorTypes.NETWORK_ERROR)player.startLoad();else if(data.type===Hls.ErrorTypes.MEDIA_ERROR)player.recoverMediaError();else setError('影片暂时未能载入，请重试。');}
          else setError('影片暂时未能载入，请重试。');
        });
        player.loadSource(src);player.attachMedia(el);
      }catch{if(!disposed)setError('影片暂时未能载入，请重试。');}
    };start();
    return()=>{disposed=true;nativeStream.current=false;el.removeEventListener('loadedmetadata',play);hls.current?.destroy();hls.current=null;el.pause();el.removeAttribute('src');el.load();};
  },[src,stream,started,attempt]);
  const retry=()=>{setError('');if(stream){setStarted(true);setAttempt(value=>value+1);}else{video.current.load();video.current.play().catch(()=>{});}};
  return <div className={`film-player ${ready?'player-ready':''}`}>
    <video ref={video} src={stream?undefined:src} poster={poster} controls={!stream||started} playsInline preload="none" tabIndex={0} aria-label={`${title}视频`} onCanPlay={()=>{setReady(true);setError('');}} onError={()=>{if(!stream||nativeStream.current)setError('影片暂时未能载入，请重试。');}}>
      你的浏览器不支持影片播放。
    </video>
    {stream&&!started&&<button className="film-start" onClick={()=>setStarted(true)}><span className="film-play-icon" aria-hidden="true">▷</span><span>播放影片</span></button>}
    {stream&&started&&!ready&&!error&&<span className="film-loading" role="status">影片载入中…</span>}
    {error&&<div className="film-error" role="alert"><p>{error}</p><button onClick={retry}>重新载入 ↗</button></div>}
  </div>;
}
