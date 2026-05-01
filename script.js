// --- WebGL Shaders ---

const vertexShaderSource = `
    attribute vec2 a_position;
    varying vec2 v_position;
    void main() {
        v_position = a_position;
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fragmentShader2D = `
    precision highp float;
    varying vec2 v_position;
    
    uniform vec2 u_resolution;
    uniform vec2 u_offset;
    uniform float u_zoom;
    uniform int u_max_iter;
    uniform int u_color_scheme;
    uniform int u_fractal_type;
    uniform vec2 u_c_value;
    uniform vec2 u_z_value;
    uniform float u_power;
    
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 getColor(float m, float smooth_iter) {
        if (m >= float(u_max_iter) - 1.0) return vec3(0.0);
        float t = smooth_iter / float(u_max_iter);
        
        if (u_color_scheme == 0) {
            float h = fract(t * 3.0 + 0.5);
            return hsv2rgb(vec3(h, 0.8, 1.0 - abs(fract(t * 2.0) - 0.5) * 2.0));
        } else if (u_color_scheme == 1) {
            return vec3(smoothstep(0.0, 0.4, t) + smoothstep(0.7, 1.0, t), smoothstep(0.3, 0.8, t), smoothstep(0.6, 1.0, t));
        } else if (u_color_scheme == 2) {
            float v = pow(t, 0.5);
            return vec3(0.1 * v, 0.5 * v, v);
        } else {
            return hsv2rgb(vec3(t * 5.0, 1.0, 1.0));
        }
    }

    void main() {
        vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
        if (u_resolution.y > u_resolution.x) aspect = vec2(1.0, u_resolution.y / u_resolution.x);
        
        vec2 c_coord = v_position * aspect;
        c_coord = c_coord / u_zoom + u_offset;
        
        vec2 z = vec2(0.0);
        vec2 c = vec2(0.0);
        
        if (u_fractal_type == 0) {
            z = u_z_value; c = c_coord;
        } else if (u_fractal_type == 1) {
            z = c_coord; c = u_c_value;
        } else if (u_fractal_type == 2) {
            z = c_coord;
            float iter = 0.0;
            for (int i = 0; i < 10000; i++) {
                if (i >= u_max_iter) break;
                float r = length(z);
                float theta = atan(z.y, z.x);
                float r_pow = pow(r, u_power);
                vec2 z_pow = r_pow * vec2(cos(u_power * theta), sin(u_power * theta));
                float r_pow_m = pow(r, u_power - 1.0);
                vec2 z_pow_m = r_pow_m * vec2(cos((u_power - 1.0) * theta), sin((u_power - 1.0) * theta));
                
                vec2 p = z_pow - vec2(1.0, 0.0);
                vec2 p_prime = u_power * z_pow_m;
                
                float denom = p_prime.x * p_prime.x + p_prime.y * p_prime.y;
                if (denom < 1e-6) break;
                
                vec2 quotient = vec2(p.x * p_prime.x + p.y * p_prime.y, p.y * p_prime.x - p.x * p_prime.y) / denom;
                z = z - quotient;
                
                if (length(quotient) < 1e-4) {
                    iter = float(i);
                    break;
                }
                iter = float(i);
            }
            float angle = atan(z.y, z.x);
            float t = (angle + 3.14159) / 6.28318;
            gl_FragColor = vec4(hsv2rgb(vec3(t, 1.0, 1.0 - iter/float(u_max_iter))), 1.0);
            return;
        }
        
        float iter = 0.0;
        for (int i = 0; i < 10000; i++) {
            if (i >= u_max_iter) break;
            if (u_power == 2.0) {
                float x = (z.x * z.x - z.y * z.y) + c.x;
                float y = (2.0 * z.x * z.y) + c.y;
                z = vec2(x, y);
            } else {
                float r = length(z);
                float theta = atan(z.y, z.x);
                float r_pow = pow(r, u_power);
                z = r_pow * vec2(cos(u_power * theta), sin(u_power * theta)) + c;
            }
            if (dot(z, z) > 4.0) break;
            iter++;
        }
        
        float smooth_iter = iter;
        if (iter < float(u_max_iter)) {
            float log_zn = log(z.x*z.x + z.y*z.y) / 2.0;
            float power = max(u_power, 1.01);
            float nu = log(log_zn / log(2.0)) / log(power);
            smooth_iter = iter + 1.0 - nu;
        }
        
        gl_FragColor = vec4(getColor(iter, smooth_iter), 1.0);
    }
`;

const fragmentShader3D = `
    precision highp float;
    varying vec2 v_position;
    
    uniform vec2 u_resolution;
    uniform vec3 u_cam_pos;
    uniform vec3 u_cam_dir;
    uniform vec3 u_cam_up;
    uniform vec3 u_cam_right;
    uniform int u_max_iter;
    uniform int u_fractal_type;
    uniform float u_zoom;
    uniform int u_color_scheme;

    float sdSierpinski(vec3 z) {
        int n = 0;
        for (int i=0; i<15; i++) {
           if (z.x+z.y < 0.0) z.xy = -z.yx;
           if (z.x+z.z < 0.0) z.xz = -z.zx;
           if (z.y+z.z < 0.0) z.zy = -z.yz;
           z = z*2.0 - vec3(1.0);
           n++;
        }
        return (length(z) - 2.0) * pow(2.0, -float(n));
    }

    float sdBox( vec3 p, vec3 b ) {
      vec3 q = abs(p) - b;
      return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
    }

    float sdMenger(vec3 z) {
        float d = sdBox(z, vec3(1.0));
        float s = 1.0;
        for( int m=0; m<4; m++ ) { 
           vec3 a = mod( z*s, 2.0 )-1.0;
           s *= 3.0;
           vec3 r = abs(1.0 - 3.0*abs(a));
           float da = max(r.x,r.y);
           float db = max(r.y,r.z);
           float dc = max(r.z,r.x);
           float c = (min(da,min(db,dc))-1.0)/s;
           d = max(d,c);
        }
        return d;
    }

    float map(vec3 p) {
        if (u_fractal_type == 3) {
            return sdSierpinski(p);
        } else {
            return sdMenger(p);
        }
    }

    vec3 calcNormal(vec3 p) {
        const float h = 0.001;
        const vec2 k = vec2(1,-1);
        return normalize( k.xyy*map( p + k.xyy*h ) + 
                          k.yyx*map( p + k.yyx*h ) + 
                          k.yxy*map( p + k.yxy*h ) + 
                          k.xxx*map( p + k.xxx*h ) );
    }

    void main() {
        vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
        if (u_resolution.y > u_resolution.x) aspect = vec2(1.0, u_resolution.y / u_resolution.x);
        vec2 uv = v_position * aspect;
        
        float fov = 1.0 / u_zoom;
        vec3 rd = normalize(u_cam_dir + uv.x * u_cam_right * fov + uv.y * u_cam_up * fov);
        vec3 ro = u_cam_pos;
        
        float t = 0.0;
        float max_d = 10.0;
        int steps = 0;
        for(int j=0; j<200; j++) {
            if (j >= u_max_iter) break;
            float d = map(ro + rd * t);
            if(d < 0.001) break;
            t += d;
            if(t > max_d) break;
            steps++;
        }
        
        if(t < max_d) {
            vec3 p = ro + rd * t;
            vec3 n = calcNormal(p);
            vec3 light = normalize(vec3(1.0, 1.0, -1.0));
            float diff = max(dot(n, light), 0.1);
            
            vec3 baseColor = vec3(0.5, 0.2, 0.8);
            if (u_color_scheme == 1) baseColor = vec3(0.8, 0.3, 0.1);
            if (u_color_scheme == 2) baseColor = vec3(0.1, 0.5, 0.9);
            
            float ao = 1.0 - float(steps)/100.0;
            
            vec3 col = baseColor * diff * ao;
            gl_FragColor = vec4(col, 1.0);
        } else {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        }
    }
`;

// --- Initialization ---

const glCanvas = document.getElementById('glCanvas');
const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
const canvas2d = document.getElementById('canvas2d');
const ctx = canvas2d.getContext('2d');

function compileShader(source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

const vShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
const fShader2D = compileShader(fragmentShader2D, gl.FRAGMENT_SHADER);
const fShader3D = compileShader(fragmentShader3D, gl.FRAGMENT_SHADER);

function createProgram(fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vShader);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    return p;
}

const prog2D = createProgram(fShader2D);
const prog3D = createProgram(fShader3D);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);

let state = {
    fractalType: 0,
    offsetX: -0.5, offsetY: 0.0, zoom: 1.0,
    maxIter: 100, colorScheme: 0, power: 2.0,
    cReal: -0.4, cImag: 0.6, zReal: 0.0, zImag: 0.0,
    camPitch: 0.5, camYaw: 0.0, treeDepth: 8
};

const els = {
    maxIter: document.getElementById('max-iter'), zoom: document.getElementById('zoom'),
    panX: document.getElementById('pan-x'), panY: document.getElementById('pan-y'),
    colorScheme: document.getElementById('color-scheme'), fractalType: document.getElementById('fractal-type'),
    power: document.getElementById('power'), cReal: document.getElementById('c-real'), cImag: document.getElementById('c-imag'),
    zReal: document.getElementById('z-real'), zImag: document.getElementById('z-imag'),
    camPitch: document.getElementById('cam-pitch'), camYaw: document.getElementById('cam-yaw'),
    treeDepth: document.getElementById('tree-depth'),
    
    maxIterVal: document.getElementById('max-iter-val'), zoomVal: document.getElementById('zoom-val'),
    panXVal: document.getElementById('pan-x-val'), panYVal: document.getElementById('pan-y-val'),
    powerVal: document.getElementById('power-val'), cRealVal: document.getElementById('c-real-val'),
    cImagVal: document.getElementById('c-imag-val'), zRealVal: document.getElementById('z-real-val'),
    zImagVal: document.getElementById('z-imag-val'), camPitchVal: document.getElementById('cam-pitch-val'),
    camYawVal: document.getElementById('cam-yaw-val'), treeDepthVal: document.getElementById('tree-depth-val'),
    
    cControls: document.getElementById('c-controls'), zControls: document.getElementById('z-controls'),
    camControls: document.getElementById('camera-controls'), treeControls: document.getElementById('tree-controls')
};

function resizeCanvas() {
    glCanvas.width = window.innerWidth; glCanvas.height = window.innerHeight;
    canvas2d.width = window.innerWidth; canvas2d.height = window.innerHeight;
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    render();
}
window.addEventListener('resize', resizeCanvas);

function drawPythagorasTree(x, y, angle, depth, size) {
    if (depth === 0) return;
    
    const x2 = x - size * Math.sin(angle);
    const y2 = y - size * Math.cos(angle);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    
    // Color scheme
    if (state.colorScheme === 0) ctx.strokeStyle = `hsl(${depth * 20}, 80%, 60%)`;
    else if (state.colorScheme === 1) ctx.strokeStyle = `hsl(${0}, 80%, ${depth * 8}%)`; // Fire
    else ctx.strokeStyle = 'cyan';
    
    ctx.lineWidth = depth;
    ctx.stroke();
    
    drawPythagorasTree(x2, y2, angle - Math.PI/4, depth - 1, size * 0.7);
    drawPythagorasTree(x2, y2, angle + Math.PI/4, depth - 1, size * 0.7);
}

function render() {
    if (state.fractalType === 5) {
        glCanvas.style.display = 'none';
        canvas2d.style.display = 'block';
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas2d.width, canvas2d.height);
        
        let startX = canvas2d.width / 2 - state.offsetX * 100;
        let startY = canvas2d.height - 50 + state.offsetY * 100;
        drawPythagorasTree(startX, startY, 0, state.treeDepth, 150 * state.zoom);
        return;
    }
    
    glCanvas.style.display = 'block';
    canvas2d.style.display = 'none';

    let prog = (state.fractalType >= 3) ? prog3D : prog2D;
    gl.useProgram(prog);
    
    const locPos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(locPos);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), glCanvas.width, glCanvas.height);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_max_iter'), state.maxIter);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_color_scheme'), state.colorScheme);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_fractal_type'), state.fractalType);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_zoom'), state.zoom);
    
    if (prog === prog2D) {
        gl.uniform2f(gl.getUniformLocation(prog, 'u_offset'), state.offsetX, state.offsetY);
        gl.uniform2f(gl.getUniformLocation(prog, 'u_c_value'), state.cReal, state.cImag);
        gl.uniform2f(gl.getUniformLocation(prog, 'u_z_value'), state.zReal, state.zImag);
        gl.uniform1f(gl.getUniformLocation(prog, 'u_power'), state.power);
    } else {
        // 3D Camera Setup
        let dist = 3.0;
        let camPos = [
            dist * Math.cos(state.camPitch) * Math.sin(state.camYaw),
            dist * Math.sin(state.camPitch),
            dist * Math.cos(state.camPitch) * Math.cos(state.camYaw)
        ];
        gl.uniform3f(gl.getUniformLocation(prog, 'u_cam_pos'), camPos[0], camPos[1], camPos[2]);
        
        // Target is origin (0,0,0)
        let dir = [-camPos[0], -camPos[1], -camPos[2]];
        let dirLen = Math.sqrt(dir[0]*dir[0] + dir[1]*dir[1] + dir[2]*dir[2]);
        dir = [dir[0]/dirLen, dir[1]/dirLen, dir[2]/dirLen];
        gl.uniform3f(gl.getUniformLocation(prog, 'u_cam_dir'), dir[0], dir[1], dir[2]);
        
        let globalUp = [0, 1, 0];
        // right = dir x globalUp
        let right = [
            dir[1]*globalUp[2] - dir[2]*globalUp[1],
            dir[2]*globalUp[0] - dir[0]*globalUp[2],
            dir[0]*globalUp[1] - dir[1]*globalUp[0]
        ];
        let rightLen = Math.sqrt(right[0]*right[0] + right[1]*right[1] + right[2]*right[2]);
        right = [right[0]/rightLen, right[1]/rightLen, right[2]/rightLen];
        gl.uniform3f(gl.getUniformLocation(prog, 'u_cam_right'), right[0], right[1], right[2]);
        
        // up = right x dir
        let up = [
            right[1]*dir[2] - right[2]*dir[1],
            right[2]*dir[0] - right[0]*dir[2],
            right[0]*dir[1] - right[1]*dir[0]
        ];
        gl.uniform3f(gl.getUniformLocation(prog, 'u_cam_up'), up[0], up[1], up[2]);
    }
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function syncValsToState() {
    els.maxIterVal.value = state.maxIter; els.zoomVal.value = state.zoom.toFixed(1);
    els.panXVal.value = state.offsetX.toFixed(4); els.panYVal.value = state.offsetY.toFixed(4);
    els.powerVal.value = state.power.toFixed(1); els.cRealVal.value = state.cReal.toFixed(2);
    els.cImagVal.value = state.cImag.toFixed(2); els.zRealVal.value = state.zReal.toFixed(2);
    els.zImagVal.value = state.zImag.toFixed(2); els.camPitchVal.value = state.camPitch.toFixed(2);
    els.camYawVal.value = state.camYaw.toFixed(2); els.treeDepthVal.value = state.treeDepth;
}

function updateFromRange() {
    state.maxIter = parseInt(els.maxIter.value); state.zoom = parseFloat(els.zoom.value);
    state.offsetX = parseFloat(els.panX.value); state.offsetY = parseFloat(els.panY.value);
    state.colorScheme = parseInt(els.colorScheme.value); state.fractalType = parseInt(els.fractalType.value);
    state.power = parseFloat(els.power.value); state.cReal = parseFloat(els.cReal.value);
    state.cImag = parseFloat(els.cImag.value); state.zReal = parseFloat(els.zReal.value);
    state.zImag = parseFloat(els.zImag.value); state.camPitch = parseFloat(els.camPitch.value);
    state.camYaw = parseFloat(els.camYaw.value); state.treeDepth = parseInt(els.treeDepth.value);
    
    // UI Toggles
    els.cControls.style.display = (state.fractalType === 1) ? 'flex' : 'none';
    els.zControls.style.display = (state.fractalType === 0) ? 'flex' : 'none';
    els.camControls.style.display = (state.fractalType >= 3 && state.fractalType <= 4) ? 'flex' : 'none';
    els.treeControls.style.display = (state.fractalType === 5) ? 'flex' : 'none';
    
    // Hide Pan/Zoom for 3D
    let is2D = (state.fractalType < 3 || state.fractalType === 5);
    els.panX.parentElement.style.display = is2D ? 'flex' : 'none';
    els.panY.parentElement.style.display = is2D ? 'flex' : 'none';
    els.power.parentElement.style.display = (state.fractalType < 2) ? 'flex' : 'none';
    
    syncValsToState();
    render();
}

function updateFromVals() {
    state.maxIter = parseInt(els.maxIterVal.value) || 100; state.zoom = parseFloat(els.zoomVal.value) || 1.0;
    state.offsetX = parseFloat(els.panXVal.value) || 0.0; state.offsetY = parseFloat(els.panYVal.value) || 0.0;
    state.power = parseFloat(els.powerVal.value) || 2.0; state.cReal = parseFloat(els.cRealVal.value) || 0.0;
    state.cImag = parseFloat(els.cImagVal.value) || 0.0; state.zReal = parseFloat(els.zRealVal.value) || 0.0;
    state.zImag = parseFloat(els.zImagVal.value) || 0.0; state.camPitch = parseFloat(els.camPitchVal.value) || 0.0;
    state.camYaw = parseFloat(els.camYawVal.value) || 0.0; state.treeDepth = parseInt(els.treeDepthVal.value) || 8;
    
    els.maxIter.value = state.maxIter; els.zoom.value = state.zoom;
    els.panX.value = state.offsetX; els.panY.value = state.offsetY;
    els.power.value = state.power; els.cReal.value = state.cReal;
    els.cImag.value = state.cImag; els.zReal.value = state.zReal;
    els.zImag.value = state.zImag; els.camPitch.value = state.camPitch;
    els.camYaw.value = state.camYaw; els.treeDepth.value = state.treeDepth;
    
    render();
}

Object.values(els).forEach(el => {
    if (el && el.addEventListener && (el.tagName === 'INPUT' || el.tagName === 'SELECT')) {
        if (el.classList.contains('manual-input')) {
            el.addEventListener('change', updateFromVals);
        } else {
            el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', updateFromRange);
        }
    }
});

let isDragging = false, lastMouseX = 0, lastMouseY = 0;
glCanvas.addEventListener('mousedown', (e) => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; });
canvas2d.addEventListener('mousedown', (e) => { isDragging = true; lastMouseX = e.clientX; lastMouseY = e.clientY; });
window.addEventListener('mouseup', () => isDragging = false);

window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastMouseX; const dy = e.clientY - lastMouseY;
    
    if (state.fractalType >= 3 && state.fractalType <= 4) {
        state.camYaw -= dx * 0.01;
        state.camPitch += dy * 0.01;
        // Clamp pitch to avoid gimbal lock flip
        state.camPitch = Math.max(-1.5, Math.min(1.5, state.camPitch));
        els.camYaw.value = state.camYaw; els.camPitch.value = state.camPitch;
        updateFromRange();
    } else {
        const aspect = window.innerWidth / window.innerHeight;
        state.offsetX -= (dx / window.innerWidth) * (aspect > 1 ? aspect : 1) * 2.0 / state.zoom;
        state.offsetY += (dy / window.innerHeight) * (aspect > 1 ? 1 : 1/aspect) * 2.0 / state.zoom;
        els.panX.value = state.offsetX; els.panY.value = state.offsetY;
        updateFromRange();
    }
    lastMouseX = e.clientX; lastMouseY = e.clientY;
});

window.addEventListener('wheel', (e) => {
    state.zoom *= (e.deltaY < 0) ? 1.1 : 1/1.1;
    state.zoom = Math.max(0.1, Math.min(state.zoom, 100000.0));
    els.zoom.value = state.zoom;
    updateFromRange();
});

resizeCanvas();
updateFromRange();
