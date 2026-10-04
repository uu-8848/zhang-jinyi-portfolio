export const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));

// Scroll remains native. These transforms only determine the layered exhibition.
export function cardPose(index,progress,height,width){
  const relative=index-progress;
  if(relative>=0)return {x:relative*width*.012,y:(relative*.125+relative*relative*.915)*height,rotation:clamp(relative)*-4,scale:1,opacity:clamp(2-relative),blur:0};
  const depth=-relative;
  return {x:depth*width*.025,y:-depth*height*.125,rotation:-depth*3.2,scale:Math.max(.78,1-depth*.07),opacity:clamp(1-depth*.58),blur:Math.min(4,depth*2)};
}

export function gridPoint(x,y,pointer,radius,strength){
  const dx=x-pointer.x,dy=y-pointer.y,distance=Math.hypot(dx,dy);
  const force=Math.exp(-distance*distance/(radius*radius))*strength;
  const depth=force*34;
  return {x:x+dx*force*.11,y:y+dy*force*.11,z:depth,force};
}

export function exhibitProgress(scroll,start,height,count){return clamp((scroll-start)/Math.max(1,height)-.35,0,count-1+.8);}
