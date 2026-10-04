import ctypes as c
import json, math, time, sys, subprocess
from pathlib import Path
from PIL import Image

folder = Path(__file__).parent
egl = c.CDLL('libEGL.so.1')
def api(name, restype, args):
    f = getattr(egl, name); f.restype = restype; f.argtypes = args; return f
getproc = api('eglGetProcAddress', c.c_void_p, [c.c_char_p])
getdisplay = c.CFUNCTYPE(c.c_void_p,c.c_uint,c.c_void_p,c.POINTER(c.c_int))(getproc(b'eglGetPlatformDisplayEXT'))
display = getdisplay(0x31DD, None, None)
initialize = api('eglInitialize', c.c_uint, [c.c_void_p,c.POINTER(c.c_int),c.POINTER(c.c_int)])
major, minor = c.c_int(), c.c_int()
assert initialize(display,c.byref(major),c.byref(minor)), 'EGL initialization unavailable'
assert api('eglBindAPI',c.c_uint,[c.c_uint])(0x30A0)
attributes = (c.c_int*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038,0,0)
config, count = c.c_void_p(), c.c_int()
assert api('eglChooseConfig',c.c_uint,[c.c_void_p,c.POINTER(c.c_int),c.POINTER(c.c_void_p),c.c_int,c.POINTER(c.c_int)])(display,attributes,c.byref(config),1,c.byref(count)) and count.value
width,height=1280,720
surface = api('eglCreatePbufferSurface',c.c_void_p,[c.c_void_p,c.c_void_p,c.POINTER(c.c_int)])(display,config,(c.c_int*5)(0x3057,width,0x3056,height,0x3038))
context = api('eglCreateContext',c.c_void_p,[c.c_void_p,c.c_void_p,c.c_void_p,c.POINTER(c.c_int)])(display,config,None,(c.c_int*3)(0x3098,2,0x3038))
assert surface and context
assert api('eglMakeCurrent',c.c_uint,[c.c_void_p,c.c_void_p,c.c_void_p,c.c_void_p])(display,surface,surface,context)
def gl(name, restype, *args):
    ptr = getproc(name.encode()); assert ptr, name
    return c.CFUNCTYPE(restype,*args)(ptr)
print('Renderer:',gl('glGetString',c.c_char_p,c.c_uint)(0x1F01).decode())
create=gl('glCreateShader',c.c_uint,c.c_uint)
source=gl('glShaderSource',None,c.c_uint,c.c_int,c.POINTER(c.c_char_p),c.POINTER(c.c_int))
compile_shader=gl('glCompileShader',None,c.c_uint)
get_shader=gl('glGetShaderiv',None,c.c_uint,c.c_uint,c.POINTER(c.c_int))
shader_log=gl('glGetShaderInfoLog',None,c.c_uint,c.c_int,c.POINTER(c.c_int),c.c_char_p)
data=json.loads((folder/'motion-shaders.json').read_text()); mode=sys.argv[1]; shaders={'VERTEX_SHADER':data['vertex'],'FRAGMENT_SHADER':data['image']}
compiled=[]
for kind,key in [(0x8B31,'VERTEX_SHADER'),(0x8B30,'FRAGMENT_SHADER')]:
    shader=create(kind); buf=c.c_char_p(shaders[key].encode()); source(shader,1,c.byref(buf),None); compile_shader(shader)
    status=c.c_int(); get_shader(shader,0x8B81,c.byref(status))
    log=c.create_string_buffer(8192); shader_log(shader,8192,None,log)
    assert status.value,log.value.decode(); compiled.append(shader)
program=gl('glCreateProgram',c.c_uint)()
attach=gl('glAttachShader',None,c.c_uint,c.c_uint)
for shader in compiled:attach(program,shader)
gl('glLinkProgram',None,c.c_uint)(program)
status=c.c_int();gl('glGetProgramiv',None,c.c_uint,c.c_uint,c.POINTER(c.c_int))(program,0x8B82,c.byref(status)); assert status.value,'Program link failure'
gl('glUseProgram',None,c.c_uint)(program)
buffer=c.c_uint();gl('glGenBuffers',None,c.c_int,c.POINTER(c.c_uint))(1,c.byref(buffer))
gl('glBindBuffer',None,c.c_uint,c.c_uint)(0x8892,buffer)
vertices=(c.c_float*6)(-1,-1,3,-1,-1,3)
gl('glBufferData',None,c.c_uint,c.c_ssize_t,c.c_void_p,c.c_uint)(0x8892,c.sizeof(vertices),vertices,0x88E4)
attribute=gl('glGetAttribLocation',c.c_int,c.c_uint,c.c_char_p)(program,b'a_position')
gl('glEnableVertexAttribArray',None,c.c_uint)(attribute)
gl('glVertexAttribPointer',None,c.c_uint,c.c_int,c.c_uint,c.c_uint,c.c_int,c.c_void_p)(attribute,2,0x1406,0,0,None)
uniform=gl('glGetUniformLocation',c.c_int,c.c_uint,c.c_char_p)
u1=gl('glUniform1f',None,c.c_int,c.c_float);u2=gl('glUniform2f',None,c.c_int,c.c_float,c.c_float)
u2(uniform(program,b'u_resolution'),width,height)
if mode in ['opening','ending','membranes']:
    filename={'opening':'opening-sculpture-v5.png','ending':'ending-landscape-v5.png','membranes':'floating-membranes-v5.png'}[mode]
    img=Image.open(folder/'sources'/filename).convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    texture=c.c_uint();gl('glGenTextures',None,c.c_int,c.POINTER(c.c_uint))(1,c.byref(texture))
    gl('glActiveTexture',None,c.c_uint)(0x84C0);gl('glBindTexture',None,c.c_uint,c.c_uint)(0x0DE1,texture)
    setting=gl('glTexParameteri',None,c.c_uint,c.c_uint,c.c_int)
    for k,v in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:setting(0x0DE1,k,v)
    data=img.tobytes();buf=c.create_string_buffer(data)
    gl('glTexImage2D',None,c.c_uint,c.c_int,c.c_int,c.c_int,c.c_int,c.c_int,c.c_uint,c.c_uint,c.c_void_p)(0x0DE1,0,0x1908,img.width,img.height,0,0x1908,0x1401,buf)
    gl('glUniform1i',None,c.c_int,c.c_int)(uniform(program,b'u_image'),0)
    u1(uniform(program,b'u_mode'),{'opening':0,'ending':1,'membranes':2}[mode])
gl('glViewport',None,c.c_int,c.c_int,c.c_int,c.c_int)(0,0,width,height)
draw=gl('glDrawArrays',None,c.c_uint,c.c_int,c.c_int)
read=gl('glReadPixels',None,c.c_int,c.c_int,c.c_int,c.c_int,c.c_uint,c.c_uint,c.c_void_p)
pixels=(c.c_ubyte*(width*height*4))()
output=folder.parent/'public/assets/cinema'
encoder=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgba','-s',f'{width}x{height}','-r','24','-i','pipe:0','-vf','vflip','-an','-c:v','libx264','-preset','fast','-crf','22','-maxrate','2200k','-bufsize','4400k','-pix_fmt','yuv420p','-movflags','+faststart',str(output/f'{mode}-loop.mp4')],stdin=subprocess.PIPE)
first=None
for frame in range(288):
    phase=frame/288*math.pi*2;u1(uniform(program,b'u_phase'),phase);draw(4,0,3);read(0,0,width,height,0x1908,0x1401,pixels)
    raw=bytes(pixels);encoder.stdin.write(raw)
    if frame in [0,72,144,216]:
        img=Image.frombytes('RGBA',(width,height),raw).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB')
        img.save(folder/f'{mode}-phase-{frame}.jpg',quality=93)
        if frame==0:
            first=raw
            if mode=='membranes':img.save(output/'membranes-poster.webp',quality=91)
    if frame%72==0:print(mode,frame,'/ 288',flush=True)
encoder.stdin.close();assert encoder.wait()==0
u1(uniform(program,b'u_phase'),math.pi*2);draw(4,0,3);read(0,0,width,height,0x1908,0x1401,pixels)
import numpy as np
endpoint=np.abs(np.frombuffer(first,dtype=np.uint8).astype(np.int16)-np.frombuffer(bytes(pixels),dtype=np.uint8).astype(np.int16))
print(mode,'loop endpoint mean error',float(endpoint.mean()),flush=True)
assert endpoint.mean()<.1
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(output/f'{mode}-loop.mp4'),'-vf','scale=768:432','-an','-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(output/f'{mode}-mobile.mp4')],check=True)
print(mode,'COMPLETE',flush=True)
