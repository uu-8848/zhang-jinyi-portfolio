precision highp float;
uniform vec2 u_resolution;
uniform float u_phase;
uniform float u_mode;
uniform sampler2D u_image;
float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution;
  vec2 source=uv;
  float t=u_phase;
  if(u_mode<.5){
    vec2 centre=vec2(.66,.54),d=uv-centre;
    float a=atan(d.y,d.x),weight=exp(-dot(d*vec2(1.,.9),d*vec2(1.,.9))*4.5)*smoothstep(.05,.23,length(d));
    source=centre+d/(1.+.018*sin(t));
    source.x+=.022*sin(t+a*3.)*weight*smoothstep(.18,.65,uv.x);
    source.y+=.023*cos(t+a*2.)*weight;
  }else if(u_mode<1.5){
    float lower=1.-smoothstep(.55,.85,uv.y);
    source.x+=sin(t+uv.y*8.)*.022*lower;
    source.y+=cos(t+uv.x*7.)*.018*lower;
    source=(source-.5)/(1.+.012*sin(t))+.5;
  }else{
    for(int i=0;i<6;i++){
      float fi=float(i);
      vec2 centre;
      if(i==0)centre=vec2(.08,.57);
      else if(i==1)centre=vec2(.80,.77);
      else if(i==2)centre=vec2(.86,.23);
      else if(i==3)centre=vec2(.23,.80);
      else if(i==4)centre=vec2(.38,.18);
      else centre=vec2(.62,.62);
      vec2 d=uv-centre;
      float weight=exp(-dot(d,d)*24.);
      source-=vec2(sin(t+fi*.9),cos(t+fi*.9))*.015*weight;
      source.x+=sin(t+d.y*14.+fi)*.006*weight;
    }
  }
  float edge=smoothstep(0.,.065,uv.x)*smoothstep(0.,.065,uv.y)*smoothstep(0.,.065,1.-uv.x)*smoothstep(0.,.065,1.-uv.y);
  source=mix(uv,source,edge);
  vec3 colour=texture2D(u_image,clamp(source,.001,.999)).rgb;
  colour*=1.+.04*sin(t+uv.x*2.);
  if(u_mode<.5){
    vec2 cell=fract(gl_FragCoord.xy/7.0);
    float dotMark=1.-smoothstep(.11,.27,length(cell-.5));
    float luminance=dot(colour,vec3(.2126,.7152,.0722));
    colour+=dotMark*.026*(1.-smoothstep(.15,.3,luminance));
  }
  gl_FragColor=vec4(colour,1.);
}
