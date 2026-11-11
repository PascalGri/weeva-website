/* Standalone adaptation of the licensed React Bits Pro template fluid effect. */
(function () {
  'use strict';

  const vertex = `
    precision highp float;
    attribute vec2 a_position;
    uniform vec2 u_texel;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    void main () {
      vUv = .5 * (a_position + 1.);
      vL = vUv - vec2(u_texel.x, 0.);
      vR = vUv + vec2(u_texel.x, 0.);
      vT = vUv + vec2(0., u_texel.y);
      vB = vUv - vec2(0., u_texel.y);
      gl_Position = vec4(a_position, 0., 1.);
    }
  `;

  const fragments = {
    advection: `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D u_velocity_texture;
      uniform sampler2D u_input_texture;
      uniform vec2 u_texel;
      uniform float u_dt;
      vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);
        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
      }
      void main () {
        vec2 coord = vUv - u_dt * bilerp(u_velocity_texture, vUv, u_texel).xy * u_texel;
        gl_FragColor = .96 * bilerp(u_input_texture, coord, u_texel);
        gl_FragColor.a = 1.;
      }
    `,
    divergence: `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D u_velocity_texture;
      void main () {
        float L = texture2D(u_velocity_texture, vL).x;
        float R = texture2D(u_velocity_texture, vR).x;
        float T = texture2D(u_velocity_texture, vT).y;
        float B = texture2D(u_velocity_texture, vB).y;
        gl_FragColor = vec4(.6 * (R - L + T - B), 0., 0., 1.);
      }
    `,
    pressure: `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D u_pressure_texture;
      uniform sampler2D u_divergence_texture;
      void main () {
        float L = texture2D(u_pressure_texture, vL).x;
        float R = texture2D(u_pressure_texture, vR).x;
        float T = texture2D(u_pressure_texture, vT).x;
        float B = texture2D(u_pressure_texture, vB).x;
        float div = texture2D(u_divergence_texture, vUv).x;
        gl_FragColor = vec4((L + R + B + T - div) * .25, 0., 0., 1.);
      }
    `,
    gradientSubtract: `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      varying vec2 vL;
      varying vec2 vR;
      varying vec2 vT;
      varying vec2 vB;
      uniform sampler2D u_pressure_texture;
      uniform sampler2D u_velocity_texture;
      void main () {
        float L = texture2D(u_pressure_texture, vL).x;
        float R = texture2D(u_pressure_texture, vR).x;
        float T = texture2D(u_pressure_texture, vT).x;
        float B = texture2D(u_pressure_texture, vB).x;
        vec2 velocity = texture2D(u_velocity_texture, vUv).xy;
        velocity -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0., 1.);
      }
    `,
    splat: `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D u_input_texture;
      uniform float u_ratio;
      uniform vec3 u_point_value;
      uniform vec2 u_point;
      uniform float u_point_size;
      void main () {
        vec2 p = vUv - u_point;
        p.x *= u_ratio;
        vec3 splat = pow(2., -dot(p, p) / u_point_size) * u_point_value;
        gl_FragColor = vec4(texture2D(u_input_texture, vUv).xyz + splat, 1.);
      }
    `,
    output: `
      precision highp float;
      precision highp sampler2D;
      varying vec2 vUv;
      uniform sampler2D u_output_texture;
      uniform vec3 u_ink_color;
      void main () {
        float density = max(texture2D(u_output_texture, vUv).r, 0.);
        // Accumulating ink increases coverage, never desaturates the brand blue.
        float coverage = 1. - exp(-density * .8);
        gl_FragColor = vec4(u_ink_color, coverage);
      }
    `
  };

  window.initWeevaFluid = function (canvas, reducedMotion) {
    if (!canvas) return null;
    canvas.style.visibility = 'hidden';
    canvas.removeAttribute('data-fluid-ready');
    if (reducedMotion) return null;
    let gl;
    try {
      gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    } catch (_) { return null; }
    if (!gl) return null;

    let destroyed = false;
    let lost = false;
    let offscreen = false;
    let manuallyPaused = false;
    let frame = 0;
    let previousTime = 0;
    let elapsed = 0;
    let automatic = true;
    let width = 1;
    let height = 1;
    let density, velocity, divergence, pressure;
    let positionBuffer;
    let observer, resizeObserver;
    const programs = {};
    const shaders = [];
    const targets = new Set();
    const pointer = { x: 0, y: 0, dx: 0, dy: 0, moved: false };
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Weeva blue (#4a82d6) stays blue in both themes, including overlapping trails.
    const ink = [74 / 255, 130 / 255, 214 / 255];

    function deleteTarget(target) {
      if (!target) return;
      gl.deleteFramebuffer(target.framebuffer);
      gl.deleteTexture(target.texture);
      targets.delete(target);
    }

    function createTarget(w, h, type) {
      const texture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      const target = {
        texture, framebuffer, width: w, height: h,
        attach(unit) {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          return unit;
        }
      };
      targets.add(target);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        deleteTarget(target);
        return null;
      }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return target;
    }

    let textureType;
    const floatExtension = gl.getExtension('OES_texture_float');
    const halfExtension = gl.getExtension('OES_texture_half_float');
    gl.getExtension('WEBGL_color_buffer_float');
    gl.getExtension('EXT_color_buffer_half_float');
    for (const type of [floatExtension && gl.FLOAT, halfExtension && halfExtension.HALF_FLOAT_OES].filter(Boolean)) {
      const probe = createTarget(2, 2, type);
      if (probe) {
        deleteTarget(probe);
        textureType = type;
        break;
      }
    }
    if (!textureType) return null;

    function compile(source, type) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Fluid shader unavailable');
      return shader;
    }

    function bind(name) {
      const program = programs[name];
      gl.useProgram(program.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(program.position);
      gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 0, 0);
      return program.uniforms;
    }

    function blit(target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function doubleTarget(w, h) {
      let a = createTarget(w, h, textureType);
      let b = createTarget(w, h, textureType);
      if (!a || !b) throw new Error('Fluid framebuffer unavailable');
      return { get read() { return a; }, get write() { return b; }, swap() { [a, b] = [b, a]; } };
    }

    function resize() {
      if (destroyed || lost) return;
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(bounds.width));
      const nextHeight = Math.max(1, Math.round(bounds.height));
      if (density && nextWidth === width && nextHeight === height) return;
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
      targets.forEach(deleteTarget);
      const w = Math.max(2, Math.floor(width * .25));
      const h = Math.max(2, Math.floor(height * .25));
      try {
        density = doubleTarget(w, h);
        velocity = doubleTarget(w, h);
        pressure = doubleTarget(w, h);
        divergence = createTarget(w, h, textureType);
        if (!divergence) throw new Error('Fluid divergence unavailable');
      } catch (_) {
        destroy();
        return;
      }
      pointer.x = width * .5;
      pointer.y = height * .5;
      pointer.moved = false;
    }

    function move(x, y) {
      pointer.dx = 5 * (x - pointer.x);
      pointer.dy = 5 * (y - pointer.y);
      pointer.x = x;
      pointer.y = y;
      pointer.moved = true;
    }

    function onPointer(event) {
      automatic = false;
      if (offscreen || destroyed || lost) return;
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      if (x < 0 || x > bounds.width || y < 0 || y > bounds.height) return;
      move(x, y);
    }

    function canRun() {
      return !destroyed && !lost && !offscreen && !manuallyPaused && !document.hidden && !motionQuery.matches;
    }

    function tick(time) {
      frame = 0;
      if (!canRun() || !density) return;
      elapsed += previousTime ? Math.min(32, time - previousTime) : 16.667;
      previousTime = time;
      if (automatic) {
        const x = .5 + .25 * Math.sin(.0017 * elapsed) + .12 * Math.sin(.0031 * elapsed + 1.3) + .08 * Math.cos(.0053 * elapsed + 2.7) + .05 * Math.sin(.0079 * elapsed + 4.1);
        const y = .5 + .18 * Math.sin(.0023 * elapsed + .5) + .12 * Math.cos(.0041 * elapsed + 1.8) + .08 * Math.sin(.0067 * elapsed + 3.2) + .05 * Math.cos(.0089 * elapsed + 5);
        move(x * width, y * height);
      }
      if (pointer.moved) {
        pointer.moved = false;
        const u = bind('splat');
        gl.uniform1f(u.u_ratio, width / height);
        gl.uniform2f(u.u_point, pointer.x / width, 1 - pointer.y / height);
        gl.uniform1f(u.u_point_size, 4 / height);
        gl.uniform1i(u.u_input_texture, velocity.read.attach(1));
        gl.uniform3f(u.u_point_value, pointer.dx, -pointer.dy, 1);
        blit(velocity.write);
        velocity.swap();
        gl.uniform1i(u.u_input_texture, density.read.attach(1));
        gl.uniform3f(u.u_point_value, 1, 1, 1);
        blit(density.write);
        density.swap();
      }

      const tx = 1 / velocity.read.width;
      const ty = 1 / velocity.read.height;
      let u = bind('divergence');
      gl.uniform2f(u.u_texel, tx, ty);
      gl.uniform1i(u.u_velocity_texture, velocity.read.attach(1));
      blit(divergence);
      u = bind('pressure');
      gl.uniform2f(u.u_texel, tx, ty);
      gl.uniform1i(u.u_divergence_texture, divergence.attach(1));
      for (let pass = 0; pass < 4; pass++) {
        gl.uniform1i(u.u_pressure_texture, pressure.read.attach(2));
        blit(pressure.write);
        pressure.swap();
      }
      u = bind('gradientSubtract');
      gl.uniform2f(u.u_texel, tx, ty);
      gl.uniform1i(u.u_pressure_texture, pressure.read.attach(1));
      gl.uniform1i(u.u_velocity_texture, velocity.read.attach(2));
      blit(velocity.write);
      velocity.swap();
      u = bind('advection');
      gl.uniform2f(u.u_texel, tx, ty);
      gl.uniform1f(u.u_dt, 1 / 60);
      gl.uniform1i(u.u_velocity_texture, velocity.read.attach(1));
      gl.uniform1i(u.u_input_texture, velocity.read.attach(1));
      blit(velocity.write);
      velocity.swap();
      gl.uniform1i(u.u_velocity_texture, velocity.read.attach(1));
      gl.uniform1i(u.u_input_texture, density.read.attach(2));
      blit(density.write);
      density.swap();
      u = bind('output');
      gl.uniform1i(u.u_output_texture, density.read.attach(1));
      gl.uniform3f(u.u_ink_color, ink[0], ink[1], ink[2]);
      blit(null);
      if (!canvas.hasAttribute('data-fluid-ready')) {
        canvas.dataset.fluidReady = 'true';
        canvas.style.visibility = 'visible';
      }
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      if (canRun() && !frame) {
        previousTime = 0;
        frame = requestAnimationFrame(tick);
      } else if (!canRun() && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }

    function onContextLost(event) {
      event.preventDefault();
      lost = true;
      canvas.removeAttribute('data-fluid-ready');
      canvas.style.visibility = 'hidden';
      sync();
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', sync);
      motionQuery.removeEventListener('change', sync);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      if (observer) observer.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      targets.forEach(deleteTarget);
      Object.values(programs).forEach(p => gl.deleteProgram(p.program));
      shaders.forEach(shader => gl.deleteShader(shader));
      if (positionBuffer) gl.deleteBuffer(positionBuffer);
      canvas.removeAttribute('data-fluid-ready');
      canvas.style.visibility = 'hidden';
    }

    try {
      const vertexShader = compile(vertex, gl.VERTEX_SHADER);
      for (const [name, source] of Object.entries(fragments)) {
        const program = gl.createProgram();
        if (!program) throw new Error('Fluid program unavailable');
        const entry = { program, position: -1, uniforms: {} };
        programs[name] = entry;
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, compile(source, gl.FRAGMENT_SHADER));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Fluid program unavailable');
        entry.position = gl.getAttribLocation(program, 'a_position');
        const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
          const uniform = gl.getActiveUniform(program, i);
          entry.uniforms[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
      }
      positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      resize();
      if (destroyed) return null;
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('resize', resize, { passive: true });
      document.addEventListener('visibilitychange', sync);
      motionQuery.addEventListener('change', sync);
      canvas.addEventListener('webglcontextlost', onContextLost);
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          offscreen = !entries[0].isIntersecting;
          sync();
        }, { rootMargin: '80px' });
        observer.observe(canvas);
      }
      if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);
      }
      sync();
      return { destroy, pause() { manuallyPaused = true; sync(); }, resume() { manuallyPaused = false; sync(); } };
    } catch (_) {
      destroy();
      return null;
    }
  };
})();
