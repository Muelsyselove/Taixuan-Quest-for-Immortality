// WebGL 背景渲染器：FBM 墨色灵雾 + 金色星尘 + 鼠标视差，全程序化生成，无任何贴图资源
const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;
uniform float uIntensity; // 事件推进时短暂增强灵雾流动

// ---- 噪声 ----
vec2 hash22(vec2 p){
  p = vec2(dot(p, vec2(127.1,311.7)), dot(p, vec2(269.5,183.3)));
  return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(dot(hash22(i+vec2(0,0)), f-vec2(0,0)),
                 dot(hash22(i+vec2(1,0)), f-vec2(1,0)), u.x),
             mix(dot(hash22(i+vec2(0,1)), f-vec2(0,1)),
                 dot(hash22(i+vec2(1,1)), f-vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.55;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for(int i=0;i<5;i++){ v += a*noise(p); p = rot*p*2.02; a *= 0.5; }
  return v;
}

// ---- 星尘 ----
float star(vec2 uv, vec2 id, float t){
  vec2 gv = fract(uv) - 0.5;
  vec2 offs = hash22(id)*0.7;
  float d = length(gv - offs);
  float tw = 0.5 + 0.5*sin(t*(1.0+hash22(id).x*2.0) + hash22(id).y*20.0);
  return smoothstep(0.06, 0.0, d) * tw;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  vec2 par = (uMouse - 0.5) * 0.08; // 鼠标视差

  float t = uTime * 0.05;

  // 双层灵雾（域扭曲 FBM）
  vec2 q = vec2(fbm(p*1.6 + t), fbm(p*1.6 + vec2(5.2,1.3) - t));
  vec2 r = vec2(fbm(p*1.6 + 2.0*q + vec2(1.7,9.2) + t*0.7),
                fbm(p*1.6 + 2.0*q + vec2(8.3,2.8) - t*0.5));
  float mist = fbm(p*1.6 + 2.2*r + par*3.0);
  mist = mist*0.5 + 0.5;

  // 底色：玄墨 -> 黛青 -> 少量金
  vec3 ink   = vec3(0.035, 0.047, 0.067);
  vec3 teal  = vec3(0.098, 0.185, 0.208);
  vec3 gold  = vec3(0.847, 0.698, 0.361);
  vec3 col = mix(ink, teal, smoothstep(0.18, 0.85, mist));
  col += gold * smoothstep(0.68, 0.95, mist) * 0.13 * (1.0 + uIntensity*2.0);

  // 星尘层（两层不同尺度视差）
  vec2 suv1 = (p + par*1.2) * 24.0;
  vec2 suv2 = (p + par*2.0) * 48.0;
  float s = star(suv1, floor(suv1), uTime) * 1.1
          + star(suv2, floor(suv2), uTime*1.3) * 0.7;
  col += gold * s * (0.7 + uIntensity);

  // 月轮（右上）
  vec2 moonPos = vec2(0.62, 0.30) + par*0.6;
  float md = length(p - moonPos);
  col += vec3(0.85, 0.78, 0.60) * (smoothstep(0.105, 0.095, md)*0.7 + smoothstep(0.42, 0.0, md)*0.09);

  // 远山剪影（三层正弦叠峦）
  for(int i=0;i<3;i++){
    float fi = float(i);
    float hgt = -0.28 + fi*0.09
      + 0.05*sin(p.x*(2.0+fi) + fi*7.0)
      + 0.03*sin(p.x*(5.0+fi*2.0) + fi*3.0)
      + 0.012*sin(p.x*13.0 + fi*11.0);
    float m = smoothstep(hgt+0.004, hgt, p.y + par.y*(fi+1.0)*0.4);
    vec3 mcol = mix(ink, teal*0.5, 0.25 + fi*0.18);
    col = mix(col, mcol, m * (0.55 + fi*0.15));
  }

  // 暗角 + 细颗粒
  col *= 1.0 - 0.45*pow(length(uv-0.5)*1.35, 2.2);
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898,78.233)))*43758.5453) - 0.5) * 0.018;

  gl_FragColor = vec4(col, 1.0);
}
`;

export class MistRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!this.gl) return;
    this.mouse = [0.5, 0.5];
    this.mouseTarget = [0.5, 0.5];
    this.intensity = 0;
    this._init();
    this._bind();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _compile(type, src) {
    const gl = this.gl;
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  _init() {
    const gl = this.gl;
    const prog = gl.createProgram();
    gl.attachShader(prog, this._compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, this._compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    this.prog = prog;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.uRes = gl.getUniformLocation(prog, 'uRes');
    this.uTime = gl.getUniformLocation(prog, 'uTime');
    this.uMouse = gl.getUniformLocation(prog, 'uMouse');
    this.uIntensity = gl.getUniformLocation(prog, 'uIntensity');
  }

  _bind() {
    window.addEventListener('pointermove', (e) => {
      this.mouseTarget = [e.clientX / innerWidth, 1 - e.clientY / innerHeight];
    }, { passive: true });
    window.addEventListener('resize', () => this._resize(), { passive: true });
    this._resize();
  }

  _resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.6);
    this.canvas.width = innerWidth * dpr;
    this.canvas.height = innerHeight * dpr;
    this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  /** 剧情推进时调用：灵雾涌动一拍 */
  pulse() { this.intensity = 1; }

  _loop(t) {
    const gl = this.gl;
    if (gl) {
      // 缓动趋近
      this.mouse[0] += (this.mouseTarget[0] - this.mouse[0]) * 0.04;
      this.mouse[1] += (this.mouseTarget[1] - this.mouse[1]) * 0.04;
      this.intensity *= 0.985;

      gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uTime, t * 0.001);
      gl.uniform2f(this.uMouse, this.mouse[0], this.mouse[1]);
      gl.uniform1f(this.uIntensity, this.intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    requestAnimationFrame(this._loop);
  }
}
