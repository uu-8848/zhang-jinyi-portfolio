import React,{useEffect,useRef,useState} from 'react';
import {glassVertex,glassFragment} from './glassShaders.js';

// A local lens samples the moving video itself; text and original posters stay crisp.
export default function GlassShader({video,paused,ready,scene}){
  const canvas=useRef(null);const[generation,setGeneration]=useState(0);
  useEffect(()=>{
    if(paused||!ready||!window.matchMedia('(pointer:fine)').matches)return;
    const el=canvas.current,media=video.current;
    const gl=el.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'});
    if(!gl||!media)return;
    let program,buffer,texture,shaders=[],frame=0,disposed=false,lost=false,visible=true,last=0,videoTime=-1;
    let px=.5,py=.5,tx=.5,ty=.5,strength=0,target=0;
    const host=el.closest('section')||el.closest('.dialog-overlay')||el.parentElement;
    const conceal=()=>{el.dataset.ready='false';};
    try{
      for(const[type,source]of[[gl.VERTEX_SHADER,glassVertex],[gl.FRAGMENT_SHADER,glassFragment]]){
        const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);shaders.push(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('Shader unavailable');
      }
      program=gl.createProgram();shaders.forEach(shader=>gl.attachShader(program,shader));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Shader link unavailable');
      gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    }catch{
      conceal();if(texture)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));return;
    }
    const uniform=name=>gl.getUniformLocation(program,name);
    const uniforms=Object.fromEntries(['u_resolution','u_videoSize','u_pointer','u_strength','u_time','u_position'].map(name=>[name,uniform(name)]));
    gl.uniform1i(uniform('u_video'),0);
    const schedule=()=>{if(!frame&&!disposed&&!lost&&visible&&!document.hidden)frame=requestAnimationFrame(paint);};
    const paint=stamp=>{
      frame=0;if(disposed||lost||!visible||document.hidden)return;
      if(media.readyState<2||!media.videoWidth){conceal();return;}
      const dt=last?Math.min(stamp-last,60):16;last=stamp;const speed=1-Math.exp(-dt/85);
      px+=(tx-px)*speed;py+=(ty-py)*speed;strength+=(target-strength)*speed;
      if(strength<.003&&target===0){conceal();last=0;return;}
      try{
        if(videoTime!==media.currentTime){const first=videoTime<0;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,media);if(first&&gl.getError()!==gl.NO_ERROR)throw new Error('Video texture unavailable');videoTime=media.currentTime;}
        gl.uniform2f(uniforms.u_resolution,el.width,el.height);gl.uniform2f(uniforms.u_videoSize,media.videoWidth,media.videoHeight);
        gl.uniform2f(uniforms.u_pointer,px,py);gl.uniform1f(uniforms.u_strength,strength*(scene==='opening'?1:.65));
        gl.uniform1f(uniforms.u_time,stamp*.001);gl.uniform1f(uniforms.u_position,scene==='opening'&&window.innerWidth<=760?.65:.5);
        gl.drawArrays(gl.TRIANGLES,0,3);el.dataset.ready='true';
      }catch{lost=true;conceal();return;}
      schedule();
    };
    const move=event=>{if(event.pointerType==='touch')return;const r=el.getBoundingClientRect();tx=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));ty=Math.max(0,Math.min(1,1-(event.clientY-r.top)/r.height));target=1;schedule();};
    const leave=()=>{target=0;schedule();};
    const resize=()=>{const r=el.getBoundingClientRect();const scale=Math.min(window.devicePixelRatio||1,1.2,1400/Math.max(1,r.width));el.width=Math.max(1,Math.round(r.width*scale));el.height=Math.max(1,Math.round(r.height*scale));gl.viewport(0,0,el.width,el.height);if(target>0)schedule();};
    const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;conceal();}else if(target>0)schedule();};
    const contextLost=event=>{event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;conceal();};
    const contextRestored=()=>setGeneration(value=>value+1);
    const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;target=0;strength=0;conceal();}else if(target>0)schedule();},{threshold:.01}):null;
    observer?.observe(el);const size=new ResizeObserver(resize);size.observe(el.parentElement);resize();
    host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);
    media.addEventListener('canplay',schedule);document.addEventListener('visibilitychange',visibility);
    el.addEventListener('webglcontextlost',contextLost);el.addEventListener('webglcontextrestored',contextRestored);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();size.disconnect();host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);media.removeEventListener('canplay',schedule);document.removeEventListener('visibilitychange',visibility);el.removeEventListener('webglcontextlost',contextLost);el.removeEventListener('webglcontextrestored',contextRestored);conceal();if(!gl.isContextLost()){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));}};
  },[video,paused,ready,scene,generation]);
  return <canvas ref={canvas} className="glass-shader" aria-hidden="true"/>;
}
