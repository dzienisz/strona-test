"use client";

// Ocean wave background using WebGL.
// Core wave shader based on afl_ext's ocean waves (MIT License).
// https://www.shadertoy.com/view/MdXyzX
//
// Technique: raymarched 3D ocean surface with Gerstner waves,
// Fresnel reflections, atmospheric sky, film grain, and click ripples.

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// GLSL source
// ---------------------------------------------------------------------------

const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const buildFrag = (waveIter: number, rmSteps: number) => `
  precision highp float;

  uniform vec2  iResolution;
  uniform float iTime;
  uniform float u_night;          // 0 = day, 1 = night
  uniform vec4  u_ripples[8];     // (worldX, worldZ, birthTime, amplitude)
  uniform int   u_rippleCount;

  #define PI         3.14159265359
  #define DRAG_MULT  0.38
  #define WATER_DEPTH 1.0
  #define CAM_HEIGHT  1.5
  #define WAVE_ITER   ${waveIter}
  #define RM_STEPS    ${rmSteps}

  // ── Noise helpers ────────────────────────────────────────────────────────
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // ── Gerstner-like wave ────────────────────────────────────────────────────
  vec2 wavedx(vec2 pos, vec2 dir, float freq, float t) {
    float x   = dot(dir, pos) * freq + t;
    float w   = exp(sin(x) - 1.0);
    float dx  = w * cos(x);
    return vec2(w, -dx);
  }

  // ── Ripples (from mouse clicks) ───────────────────────────────────────────
  float getripples(vec2 pos) {
    float sum = 0.0;
    for (int i = 0; i < 8; i++) {
      if (i >= u_rippleCount) break;
      vec4  r    = u_ripples[i];
      float age  = iTime - r.z;
      if (age < 0.0 || age > 10.0) continue;
      float dist = length(pos - r.xy);
      float env  = exp(-0.5 * age) * exp(-dist * 0.18);
      float fade = smoothstep(0.0, 0.25, age);
      sum += r.w * env * fade * sin(dist * 4.0 - age * 3.2);
    }
    return sum;
  }

  // ── Ocean surface height ──────────────────────────────────────────────────
  float getwaves(vec2 pos, int iters) {
    float shift     = length(pos) * 0.1;
    vec2  swellDir  = normalize(vec2(-0.25, 1.0));
    float freq      = 1.0;
    float tMult     = 2.0;
    float weight    = 1.0;
    float sumV      = 0.0;
    float sumW      = 0.0;
    float iter      = 0.0;
    for (int i = 0; i < 16; i++) {
      if (i >= iters) break;
      vec2  d   = normalize(mix(vec2(sin(iter), cos(iter)), swellDir, 0.35));
      vec2  res = wavedx(pos, d, freq, iTime * tMult + shift);
      pos      += d * res.y * weight * DRAG_MULT;
      sumV     += res.x * weight;
      sumW     += weight;
      weight    = mix(weight, 0.0, 0.2);
      freq     *= 1.18;
      tMult    *= 1.07;
      iter     += 1232.399963;
    }
    return sumV / sumW + getripples(pos);
  }

  // ── Ray-march water surface ───────────────────────────────────────────────
  float raymarch(vec3 cam, vec3 p0, vec3 p1) {
    vec3 pos = p0;
    vec3 dir = normalize(p1 - p0);
    for (int i = 0; i < RM_STEPS; i++) {
      float h = getwaves(pos.xz, WAVE_ITER) * WATER_DEPTH - WATER_DEPTH;
      if (h + 0.01 > pos.y) return distance(pos, cam);
      pos += dir * (pos.y - h);
    }
    return distance(p0, cam);
  }

  // ── Surface normal ────────────────────────────────────────────────────────
  vec3 surfaceNormal(vec2 pos, float eps) {
    vec2 ex = vec2(eps, 0.0);
    float  H = getwaves(pos, WAVE_ITER) * WATER_DEPTH;
    vec3   a = vec3(pos.x, H, pos.y);
    return normalize(cross(
      a - vec3(pos.x - eps, getwaves(pos - ex.xy, WAVE_ITER) * WATER_DEPTH, pos.y),
      a - vec3(pos.x,       getwaves(pos + ex.yx, WAVE_ITER) * WATER_DEPTH, pos.y + eps)
    ));
  }

  // ── Rotation matrix ───────────────────────────────────────────────────────
  mat3 rotX(float a) {
    float s = sin(a), c = cos(a);
    return mat3(1,0,0, 0,c,-s, 0,s,c);
  }

  // ── Camera ray ────────────────────────────────────────────────────────────
  vec3 getRay(vec2 fc) {
    vec2  uv  = (fc / iResolution.xy * 2.0 - 1.0) * vec2(iResolution.x / iResolution.y, 1.0);
    vec3  dir = normalize(vec3(uv, 1.5));
    return rotX(0.14) * dir;
  }

  // ── Plane intersection ────────────────────────────────────────────────────
  float hitPlane(vec3 ro, vec3 rd, float y) {
    return clamp((y - ro.y) / rd.y, 0.0, 9999.0);
  }

  // ── Atmosphere ────────────────────────────────────────────────────────────
  vec3 daySky(vec3 ray) {
    vec3 sun = normalize(vec3(-0.08, 0.6, 0.58));
    float st = 1.0 / (ray.y * 1.0 + 0.1);
    float st2 = 1.0 / (sun.y * 11.0 + 1.0);
    float rsd = pow(abs(dot(sun, ray)), 2.0);
    float sd  = pow(max(0.0, dot(sun, ray)), 8.0);
    float mie = sd * st * 0.2;
    vec3  sc  = mix(vec3(1.0), max(vec3(0.0), vec3(1.0) - vec3(5.5,13.0,22.4)/22.4), st2);
    vec3  bs  = vec3(12.0,12.0,13.0) / 22.4 * sc;
    vec3  bs2 = max(vec3(0.0), bs - vec3(12.0,12.0,13.0)*0.002*(st + -6.0*sun.y*sun.y));
    bs2 *= st * (0.24 + rsd * 0.24);
    return bs2 * (1.0 + pow(1.0 - ray.y, 3.0));
  }

  // Simple star field
  float star(vec2 uv, vec2 cell, vec2 grid) {
    float rnd = hash21(cell);
    if (rnd > 0.7) return 0.0;
    vec2  sp  = vec2(hash21(cell + 0.1), hash21(cell + 0.2));
    vec2  suv = (cell + sp) / grid;
    vec2  d   = (uv - suv) * iResolution.xy;
    float sz  = 0.3 + hash21(cell + 0.3) * 0.5;
    float core = smoothstep(sz, sz * 0.2, length(d));
    float flk  = 0.5 + 0.5 * sin(iTime * (0.2 + hash21(cell+0.5)*0.3) + hash21(cell+0.4)*6.28);
    return core * flk * mix(0.7, 1.4, hash21(cell + 0.6));
  }

  vec3 nightSky(vec3 ray) {
    vec3  col = mix(vec3(0.03,0.035,0.05), vec3(0.01,0.015,0.03), clamp(ray.y,0.0,1.0));
    // project ray to screen-space UV for stars
    float horizon = smoothstep(0.04, 0.3, ray.y);
    if (horizon > 0.0) {
      vec2 uv  = vec2(atan(ray.z, ray.x)/(2.0*PI)+0.5, clamp(ray.y*0.5+0.5,0.0,1.0));
      vec2 grid = vec2(50.0, 35.0);
      vec2 base = floor(uv * grid);
      float s = 0.0;
      for (int yi = -1; yi <= 1; yi++) {
        for (int xi = -1; xi <= 1; xi++) {
          vec2 cell = base + vec2(float(xi), float(yi));
          if (cell.y < 0.0 || cell.y >= grid.y) continue;
          cell.x = mod(cell.x + grid.x, grid.x);
          s += star(uv, cell, grid);
        }
      }
      col += vec3(1.0, 0.97, 0.9) * s * horizon * 0.9;
    }
    return col;
  }

  vec3 getSky(vec3 ray) {
    return mix(daySky(ray), nightSky(ray), u_night);
  }

  // ── Tone-map (ACES) ───────────────────────────────────────────────────────
  vec3 aces(vec3 x) {
    mat3 m1 = mat3(0.59719,0.07600,0.02840,0.35458,0.90834,0.13383,0.04823,0.01566,0.83777);
    mat3 m2 = mat3(1.60475,-0.10208,-0.00327,-0.53108,1.10813,-0.07276,-0.07367,-0.00605,1.07602);
    vec3 v  = m1 * x;
    vec3 a  = v * (v + 0.0245786) - 0.000090537;
    vec3 b  = v * (0.983729 * v + 0.4329510) + 0.238081;
    return pow(clamp(m2 * (a / b), 0.0, 1.0), vec3(1.0/2.2));
  }

  // ── Film grain ────────────────────────────────────────────────────────────
  vec3 grain(vec3 col, vec2 fc) {
    float intensity = mix(0.40, 0.065, u_night);
    vec2  uv   = fc / iResolution.xy;
    float seed = dot(uv, vec2(12.9898, 78.233));
    float n    = fract(sin(seed) * 43758.5453 + iTime * 1.5);
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    float var  = mix(0.65, 0.5, u_night);
    float g    = (1.0/(var*sqrt(2.0*PI))) * exp(-((n * n) / (2.0 * var * var)));
    return col + vec3(g * (1.0 - gray)) * intensity;
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  void main() {
    vec3 ray = getRay(gl_FragCoord.xy);

    if (ray.y >= 0.0) {
      // Sky
      vec3 C = getSky(ray);
      gl_FragColor = vec4(aces(C * 2.0), 1.0);
      return;
    }

    vec3 origin = vec3(iTime * 0.2, CAM_HEIGHT, 1.0);
    float t0 = hitPlane(origin, ray,  0.0);
    float t1 = hitPlane(origin, ray, -WATER_DEPTH);
    vec3  p0 = origin + ray * t0;
    vec3  p1 = origin + ray * t1;

    float dist    = raymarch(origin, p0, p1);
    vec3  hitPos  = origin + ray * dist;

    float eps = max(0.01, dist * 0.004);
    vec3  N   = surfaceNormal(hitPos.xz, eps);
    N = mix(N, vec3(0.0, 1.0, 0.0), 0.8 * min(1.0, sqrt(dist * 0.01) * 1.1));

    // Fresnel
    float fresnelSharp = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(-N, ray)), 5.0);
    float fresnelFlat  = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(vec3(0.0,1.0,0.0), -ray)), 5.0);
    float fresnel      = mix(fresnelSharp, fresnelFlat, min(1.0, sqrt(dist * 0.01) * 1.1));

    // Reflection
    vec3 R    = normalize(reflect(ray, N));
    R.y       = abs(R.y);
    vec3 refl = getSky(R);

    // Water body scattering
    vec3 scatter = mix(vec3(0.08,0.08,0.09), vec3(0.02,0.02,0.03), u_night)
                 * (0.2 + (hitPos.y + WATER_DEPTH) / WATER_DEPTH);

    vec3 C = fresnel * refl + scatter;

    // Distance fog
    vec3 fogCol = mix(vec3(0.55,0.55,0.58), vec3(0.03,0.035,0.05), u_night);
    C = mix(C, fogCol, 1.0 - exp(-dist * 0.02));

    float brightness = mix(1.4, 1.9, u_night);
    C = aces(C * brightness);
    C = grain(C, gl_FragCoord.xy);

    gl_FragColor = vec4(C, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

interface Ripple { x: number; z: number; t: number; amp: number; }

export default function WavesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const ripplesRef = useRef<Ripple[]>([]);
  const timeRef    = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const glOrNull = canvas.getContext("webgl");
    if (!glOrNull) {
      console.warn("WebGL not available");
      return;
    }
    // Non-null aliases so closures below don't hit TS18047
    const gl: WebGLRenderingContext = glOrNull;
    const cv: HTMLCanvasElement = canvas;

    // ── Compile shaders ────────────────────────────────────────────────────
    function compile(type: number, src: string) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
      }
      return s;
    }
    function link(vs: WebGLShader, fs: WebGLShader) {
      const p = gl.createProgram()!;
      gl.attachShader(p, vs); gl.attachShader(p, fs);
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
      return p;
    }

    const frag = buildFrag(8, 32);
    const prog = link(compile(gl.VERTEX_SHADER, VERT), compile(gl.FRAGMENT_SHADER, frag));

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "a_pos");

    // Uniform locations
    const uRes       = gl.getUniformLocation(prog, "iResolution");
    const uTime      = gl.getUniformLocation(prog, "iTime");
    const uNight     = gl.getUniformLocation(prog, "u_night");
    const uRipples   = gl.getUniformLocation(prog, "u_ripples");
    const uRipCnt    = gl.getUniformLocation(prog, "u_rippleCount");

    // ── Resize ─────────────────────────────────────────────────────────────
    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      cv.width  = Math.round(window.innerWidth  * dpr * 0.5); // 0.5 scale for perf
      cv.height = Math.round(window.innerHeight * dpr * 0.5);
      gl.viewport(0, 0, cv.width, cv.height);
    }
    resize();
    window.addEventListener("resize", resize);

    // ── Click → ripple ─────────────────────────────────────────────────────
    function onPointerDown(e: PointerEvent) {
      const rect  = cv.getBoundingClientRect();
      const nx    = (e.clientX - rect.left)  / rect.width;
      const ny    = 1.0 - (e.clientY - rect.top) / rect.height;
      const asp   = cv.width / cv.height;
      // Approximate world position (matches camera setup in shader)
      const worldX = (nx * 2.0 - 1.0) * asp * 3.5 + timeRef.current * 0.2;
      const worldZ = ny * 4.0 + 1.0;
      ripplesRef.current.push({ x: worldX, z: worldZ, t: timeRef.current, amp: 0.28 });
      if (ripplesRef.current.length > 8) ripplesRef.current.shift();
    }
    window.addEventListener("pointerdown", onPointerDown);

    // ── Render loop ────────────────────────────────────────────────────────
    let start: number | null = null;
    function frame(ts: number) {
      if (!start) start = ts;
      const t = (ts - start) * 0.001;
      timeRef.current = t;

      // Prune old ripples
      ripplesRef.current = ripplesRef.current.filter(r => t - r.t < 12);

      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uRes, cv.width, cv.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uNight, 1.0); // always night for dark theme

      // Pack ripples into flat float32 array (vec4 each)
      const ripData = new Float32Array(8 * 4);
      ripplesRef.current.forEach((r, i) => {
        ripData[i*4+0] = r.x;
        ripData[i*4+1] = r.z;
        ripData[i*4+2] = r.t;
        ripData[i*4+3] = r.amp;
      });
      gl.uniform4fv(uRipples, ripData);
      gl.uniform1i(uRipCnt, ripplesRef.current.length);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        display: "block",
      }}
    />
  );
}
