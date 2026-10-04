export const glassVertex=`
attribute vec2 a_position;
varying vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}
`;

export const glassFragment=`
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_video;
uniform vec2 u_resolution;
uniform vec2 u_videoSize;
uniform vec2 u_pointer;
uniform float u_strength;
uniform float u_time;
uniform float u_position;

vec2 cover(vec2 p){
  float screen=u_resolution.x/u_resolution.y;
  float source=u_videoSize.x/u_videoSize.y;
  vec2 scale=vec2(min(screen/source,1.),min(source/screen,1.));
  return (p-.5)*scale+vec2(.5+(u_position-.5)*(1.-scale.x),.5);
}
float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 d=(v_uv-u_pointer)*vec2(u_resolution.x/u_resolution.y,1.);
  float radius=length(d);
  float envelope=exp(-dot(d,d)*34.)*u_strength;
  vec2 refraction=(v_uv-u_pointer)*envelope*.055;
  float wave=sin(radius*43.-u_time*1.5)*exp(-radius*13.)*u_strength;
  refraction+=vec2(d.x,d.y)*wave*.007;
  vec2 uv=cover(v_uv+refraction);
  vec2 roughness=vec2(1.)/u_videoSize*envelope*1.15;
  vec3 sharp=texture2D(u_video,uv).rgb;
  if(envelope<.006){gl_FragColor=vec4(sharp,1.);return;}
  vec3 soft=(texture2D(u_video,uv+vec2(roughness.x,0.)).rgb+
             texture2D(u_video,uv-vec2(roughness.x,0.)).rgb+
             texture2D(u_video,uv+vec2(0.,roughness.y)).rgb+
             texture2D(u_video,uv-vec2(0.,roughness.y)).rgb)*.25;
  vec3 colour=mix(sharp,soft,envelope*.38);
  float rim=exp(-pow((radius-.165)*38.,2.))*u_strength;
  float light=clamp(.5-d.x*2.+d.y*2.,0.,1.);
  colour+=vec3(.82,.89,.83)*rim*light*.035;
  colour+=(grain(floor(gl_FragCoord.xy))-.5)*envelope*.012;
  gl_FragColor=vec4(colour,1.);
}
`;
