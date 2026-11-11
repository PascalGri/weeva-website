/* Standalone hover distortion from the licensed React Bits Pro template. */
(function () {
  'use strict';

  const vertexSource = `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    uniform vec2 uResolution;
    uniform vec2 uTextureResolution;
    vec2 resizeUvCover(vec2 point, vec2 size, vec2 resolution) {
      vec2 ratio = vec2(
        min((resolution.x / resolution.y) / (size.x / size.y), 1.0),
        min((resolution.y / resolution.x) / (size.y / size.x), 1.0)
      );
      return point * ratio + (1.0 - ratio) * 0.5;
    }
    void main() {
      vUv = resizeUvCover(vec2(uv.x, 1.0 - uv.y), uTextureResolution, uResolution);
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform vec2 uMouse;
    uniform float uBulge;
    uniform float uRadius;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      vec2 delta = vUv - uMouse;
      float dist = length(delta);
      float falloff = exp(-dist * dist / (uRadius * uRadius));
      float edgeFade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(0.0, 0.15, 1.0 - vUv.x)
        * smoothstep(0.0, 0.15, vUv.y) * smoothstep(0.0, 0.15, 1.0 - vUv.y);
      vec2 displaced = clamp(vUv + delta * falloff * uStrength * uBulge * edgeFade, 0.001, 0.999);
      gl_FragColor = vec4(texture2D(uTexture, displaced).rgb, 1.0);
    }
  `;

  window.initWeevaBulge = function (selector, reducedMotion) {
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion || motionQuery.matches || !hoverQuery.matches) return function () {};
    const safari = /safari/i.test(navigator.userAgent) && !/chrome|chromium|crios|edg|opr/i.test(navigator.userAgent);
    const cleanups = [];
    const images = document.querySelectorAll(selector || '.product-image .phone img');

    images.forEach(function (image) {
      if (image.dataset.weevaBulge) return;
      image.dataset.weevaBulge = 'true';
      const phone = image.closest('.phone') || image.parentElement;
      const hoverTarget = image.closest('.product-image') || phone;
      const saved = { opacity: image.style.opacity, transform: image.style.transform, transition: image.style.transition, position: phone.style.position };
      let canvas, gl, program, texture, buffer, resizeObserver;
      const shaders = [];
      let frame = 0;
      let destroyed = false;
      let ready = false;
      let hovering = false;
      let fallback = safari;
      let currentX = .5, currentY = .5, targetX = .5, targetY = .5;
      let currentBulge = 0;
      let width = 0, height = 0;
      let uniforms = {};

      function active() { return !destroyed && !document.hidden && !motionQuery.matches && hoverQuery.matches; }

      function enableFallback() {
        fallback = true;
        ready = false;
        image.style.opacity = saved.opacity;
        image.style.transition = 'transform .5s ease-out';
        if (canvas) canvas.style.display = 'none';
      }

      function render() {
        if (!gl || !program || !ready || destroyed) return;
        gl.useProgram(program);
        gl.uniform2f(uniforms.uMouse, currentX, currentY);
        gl.uniform1f(uniforms.uBulge, currentBulge);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      function tick() {
        frame = 0;
        if (!active() || !ready || fallback) return;
        currentX += (targetX - currentX) * .08;
        currentY += (targetY - currentY) * .08;
        currentBulge += ((hovering ? 1 : 0) - currentBulge) * .06;
        if (!hovering && currentBulge < .001) {
          currentBulge = 0;
          render();
          return;
        }
        render();
        frame = requestAnimationFrame(tick);
      }

      function schedule() {
        if (active() && ready && !fallback && !frame) frame = requestAnimationFrame(tick);
      }

      function resize() {
        if (!canvas || !gl || destroyed) return;
        const nextWidth = image.clientWidth;
        const nextHeight = image.clientHeight;
        if (nextWidth === width && nextHeight === height) return;
        width = nextWidth;
        height = nextHeight;
        if (!width || !height) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.style.left = image.offsetLeft + 'px';
        canvas.style.top = image.offsetTop + 'px';
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.uniform2f(uniforms.uResolution, width, height);
        render();
      }

      function compile(source, type) {
        const shader = gl.createShader(type);
        if (!shader) throw new Error('Bulge shader unavailable');
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Bulge shader unavailable');
        return shader;
      }

      function upload() {
        if (destroyed || fallback || !image.naturalWidth) return;
        try {
          gl.useProgram(program);
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
          gl.uniform2f(uniforms.uTextureResolution, image.naturalWidth, image.naturalHeight);
          ready = true;
          resize();
          render();
          canvas.style.opacity = '1';
          image.style.opacity = '0';
          if (hovering) schedule();
        } catch (_) { enableFallback(); }
      }

      function pointerMove(event) {
        if (!active()) return;
        const bounds = image.getBoundingClientRect();
        targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
        targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
        if (hovering) schedule();
      }

      function pointerEnter(event) {
        if (!active()) return;
        hovering = true;
        pointerMove(event);
        if (fallback) image.style.transform = 'scale(1.1)';
        else schedule();
      }

      function pointerLeave() {
        hovering = false;
        if (fallback) image.style.transform = saved.transform;
        else {
          cancelAnimationFrame(frame);
          frame = 0;
          currentBulge = 0;
          render();
        }
      }

      function sync() {
        if (!active()) {
          hovering = false;
          cancelAnimationFrame(frame);
          frame = 0;
          currentBulge = 0;
          if (fallback) image.style.transform = saved.transform;
          else render();
        } else if (hovering || currentBulge > .001) schedule();
      }

      function contextLost(event) {
        event.preventDefault();
        cancelAnimationFrame(frame);
        frame = 0;
        enableFallback();
      }

      function destroy() {
        if (destroyed) return;
        destroyed = true;
        cancelAnimationFrame(frame);
        hoverTarget.removeEventListener('pointerenter', pointerEnter);
        hoverTarget.removeEventListener('pointermove', pointerMove);
        hoverTarget.removeEventListener('pointerleave', pointerLeave);
        image.removeEventListener('load', upload);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', sync);
        motionQuery.removeEventListener('change', sync);
        hoverQuery.removeEventListener('change', sync);
        if (resizeObserver) resizeObserver.disconnect();
        if (canvas) {
          canvas.removeEventListener('webglcontextlost', contextLost);
          canvas.remove();
        }
        if (gl) {
          if (program) gl.deleteProgram(program);
          if (texture) gl.deleteTexture(texture);
          if (buffer) gl.deleteBuffer(buffer);
          shaders.forEach(shader => gl.deleteShader(shader));
        }
        image.style.opacity = saved.opacity;
        image.style.transform = saved.transform;
        image.style.transition = saved.transition;
        phone.style.position = saved.position;
        delete image.dataset.weevaBulge;
      }

      if (!fallback) {
        try {
          canvas = document.createElement('canvas');
          canvas.setAttribute('aria-hidden', 'true');
          canvas.className = 'weeva-bulge';
          canvas.style.cssText = 'position:absolute;pointer-events:none;opacity:0;display:block;max-width:none;';
          gl = canvas.getContext('webgl', { antialias: true, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
          if (!gl) throw new Error('WebGL unavailable');
          program = gl.createProgram();
          if (!program) throw new Error('Bulge program unavailable');
          gl.attachShader(program, compile(vertexSource, gl.VERTEX_SHADER));
          gl.attachShader(program, compile(fragmentSource, gl.FRAGMENT_SHADER));
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Bulge program unavailable');
          gl.useProgram(program);
          buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 0, 3, -1, 2, 0, -1, 3, 0, 2]), gl.STATIC_DRAW);
          const position = gl.getAttribLocation(program, 'position');
          const uv = gl.getAttribLocation(program, 'uv');
          gl.enableVertexAttribArray(position);
          gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
          gl.enableVertexAttribArray(uv);
          gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
          ['uTexture', 'uMouse', 'uBulge', 'uRadius', 'uStrength', 'uResolution', 'uTextureResolution'].forEach(name => {
            uniforms[name] = gl.getUniformLocation(program, name);
          });
          gl.uniform1i(uniforms.uTexture, 0);
          gl.uniform1f(uniforms.uRadius, .5);
          gl.uniform1f(uniforms.uStrength, .5);
          texture = gl.createTexture();
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          if (getComputedStyle(phone).position === 'static') phone.style.position = 'relative';
          phone.appendChild(canvas);
          canvas.addEventListener('webglcontextlost', contextLost);
          image.addEventListener('load', upload);
          window.addEventListener('resize', resize, { passive: true });
          if ('ResizeObserver' in window) {
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(image);
          }
          if (image.complete && image.naturalWidth) upload();
        } catch (_) { enableFallback(); }
      }
      if (fallback) enableFallback();
      hoverTarget.addEventListener('pointerenter', pointerEnter, { passive: true });
      hoverTarget.addEventListener('pointermove', pointerMove, { passive: true });
      hoverTarget.addEventListener('pointerleave', pointerLeave, { passive: true });
      document.addEventListener('visibilitychange', sync);
      motionQuery.addEventListener('change', sync);
      hoverQuery.addEventListener('change', sync);
      cleanups.push(destroy);
    });
    return function () { cleanups.forEach(cleanup => cleanup()); };
  };
})();
