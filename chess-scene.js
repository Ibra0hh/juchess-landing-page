/* JuChess 3D hero scene — real-time Three.js chess world.
   window.JuChessScene: init(canvas), update(scrollProgress), setVisible(bool), resize().
   Camera + knight-drop timeline are driven by scroll progress (0..1). */
(function () {
  var S = {
    ready: false, visible: true, targetP: 0, curP: 0,
    canvas: null, renderer: null, scene: null, camera: null,
    knight: null, knightGroup: null, impactLight: null, t0: 0
  };

  /* ---------- geometry builders ---------- */
  function lathe(pts, segs) {
    var v = pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    return new THREE.LatheGeometry(v, segs || 26);
  }
  function pawnGeo() {
    return lathe([[0, 0], [0.30, 0], [0.32, 0.05], [0.24, 0.11], [0.15, 0.22], [0.11, 0.42], [0.19, 0.5], [0.11, 0.56], [0.15, 0.64], [0.155, 0.74], [0.09, 0.84], [0, 0.88]]);
  }
  function rookGeo() {
    return lathe([[0, 0], [0.34, 0], [0.36, 0.06], [0.26, 0.14], [0.20, 0.3], [0.185, 0.62], [0.26, 0.7], [0.27, 0.88], [0.20, 0.88], [0.20, 0.8], [0, 0.8]]);
  }
  function bishopGeo() {
    return lathe([[0, 0], [0.32, 0], [0.34, 0.05], [0.24, 0.13], [0.14, 0.3], [0.11, 0.6], [0.20, 0.68], [0.11, 0.74], [0.17, 0.86], [0.13, 1.0], [0.05, 1.08], [0.09, 1.13], [0, 1.2]]);
  }
  function queenGeo() {
    return lathe([[0, 0], [0.36, 0], [0.38, 0.05], [0.27, 0.14], [0.16, 0.34], [0.12, 0.7], [0.23, 0.8], [0.12, 0.88], [0.20, 1.06], [0.26, 1.16], [0.14, 1.22], [0.16, 1.3], [0, 1.36]]);
  }
  function kingGeo() {
    return lathe([[0, 0], [0.37, 0], [0.39, 0.05], [0.28, 0.15], [0.17, 0.36], [0.13, 0.76], [0.25, 0.86], [0.13, 0.94], [0.22, 1.14], [0.28, 1.24], [0.15, 1.3], [0.17, 1.42], [0, 1.5]]);
  }
  /* faceted Staunton-style knight: extruded side profile on a lathe base */
  function knightGeo() {
    var g = new THREE.Group();
    var base = lathe([[0, 0], [0.36, 0], [0.38, 0.06], [0.30, 0.14], [0.24, 0.26], [0.21, 0.4], [0.29, 0.48], [0.24, 0.55], [0.18, 0.58], [0, 0.6]]);
    var head = new THREE.Shape();
    var pts = [
      [-0.16, 0.0], [-0.24, 0.12], [-0.30, 0.32], [-0.42, 0.45], [-0.56, 0.52],
      [-0.60, 0.60], [-0.56, 0.64], [-0.44, 0.64], [-0.56, 0.72], [-0.52, 0.80],
      [-0.34, 0.90], [-0.22, 1.02], [-0.14, 1.16], [-0.06, 1.04], [0.04, 1.14],
      [0.10, 1.00], [0.17, 0.86], [0.22, 0.62], [0.24, 0.34], [0.20, 0.10], [0.16, 0.0]
    ];
    head.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) head.lineTo(pts[i][0], pts[i][1]);
    head.closePath();
    var hg = new THREE.ExtrudeGeometry(head, { depth: 0.30, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, steps: 1 });
    hg.translate(0.03, 0.56, -0.15);
    g.userData = { base: base, head: hg };
    return g;
  }

  /* ---------- board texture ---------- */
  function boardTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 1024;
    var x = c.getContext('2d');
    var sq = 128;
    for (var r = 0; r < 8; r++) for (var f = 0; f < 8; f++) {
      var dark = (r + f) % 2 === 1;
      x.fillStyle = dark ? '#5a3a26' : '#cdb289';
      x.fillRect(f * sq, r * sq, sq, sq);
      /* wood grain streaks */
      x.globalAlpha = 0.10;
      for (var k = 0; k < 9; k++) {
        x.strokeStyle = dark ? '#2e1c10' : '#a08054';
        x.lineWidth = 1 + Math.random() * 2.2;
        x.beginPath();
        var yy = r * sq + Math.random() * sq;
        x.moveTo(f * sq, yy);
        x.bezierCurveTo(f * sq + 42, yy + (Math.random() * 10 - 5), f * sq + 86, yy + (Math.random() * 10 - 5), f * sq + sq, yy + (Math.random() * 8 - 4));
        x.stroke();
      }
      x.globalAlpha = 1;
    }
    var t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  /* ---------- camera timeline: {p, pos, look} ---------- */
  var KEYS = [
    { p: 0.00, pos: [8.6, 5.6, 9.6], look: [0.0, 0.9, 0.0] },
    { p: 0.30, pos: [6.6, 4.0, 7.4], look: [0.8, 0.9, 0.6] },
    { p: 0.47, pos: [4.9, 2.4, 5.0], look: [1.5, 0.8, 1.0] },
    { p: 0.62, pos: [3.3, 1.5, 3.0], look: [1.5, 0.95, 1.0] },
    { p: 0.76, pos: [1.5, 1.5, 3.6], look: [1.45, 1.0, -0.4] },
    { p: 0.88, pos: [-0.9, 1.45, 2.4], look: [-0.9, 0.9, -0.6] },
    { p: 1.00, pos: [-3.5, 1.25, 1.5], look: [-1.45, 0.95, -0.55] }
  ];
  function smooth(t) { return t * t * (3 - 2 * t); }
  function camAt(p, out) {
    var i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    var a = KEYS[i], b = KEYS[i + 1];
    var t = smooth(Math.min(1, Math.max(0, (p - a.p) / (b.p - a.p))));
    for (var k = 0; k < 3; k++) {
      out.pos[k] = a.pos[k] + (b.pos[k] - a.pos[k]) * t;
      out.look[k] = a.look[k] + (b.look[k] - a.look[k]) * t;
    }
  }

  /* ---------- scene assembly ---------- */
  function build() {
    var sc = new THREE.Scene();
    sc.background = new THREE.Color(0x171009);
    sc.fog = new THREE.FogExp2(0x171009, 0.052);

    var matW = new THREE.MeshStandardMaterial({ color: 0xc9a878, roughness: 0.34, metalness: 0.06 });
    var matB = new THREE.MeshStandardMaterial({ color: 0x392214, roughness: 0.30, metalness: 0.08 });

    /* board */
    var boardTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.22, 8), new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.22, metalness: 0.1 }));
    boardTop.position.y = -0.11;
    boardTop.receiveShadow = true;
    sc.add(boardTop);
    var frame = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.34, 9.0), new THREE.MeshStandardMaterial({ color: 0x2e1b10, roughness: 0.4, metalness: 0.08 }));
    frame.position.y = -0.19;
    frame.receiveShadow = true;
    sc.add(frame);
    /* ground glow disc under board (warm reflection feel) */
    var disc = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: 0x1d130a }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.37;
    sc.add(disc);

    /* shared geometries */
    var GP = pawnGeo(), GR = rookGeo(), GB = bishopGeo(), GQ = queenGeo(), GK = kingGeo();
    var KN = knightGeo();

    function put(geo, mat, x, z, s, ry) {
      var m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(s || 1);
      m.position.set(x, 0, z);
      if (ry) m.rotation.y = ry;
      m.castShadow = true;
      m.receiveShadow = true;
      sc.add(m);
      return m;
    }
    function putKnight(mat, x, z, ry) {
      var g = new THREE.Group();
      var b = new THREE.Mesh(KN.userData.base, mat);
      var h = new THREE.Mesh(KN.userData.head, mat);
      b.castShadow = h.castShadow = true;
      b.receiveShadow = h.receiveShadow = true;
      g.add(b); g.add(h);
      g.position.set(x, 0, z);
      g.rotation.y = ry || 0;
      sc.add(g);
      return g;
    }

    /* white army (far side, z negative) — mid-game arrangement */
    var wz = -3.5;
    put(GR, matW, -3.5, wz); put(GB, matW, -1.5, wz); put(GQ, matW, -0.5, wz);
    put(GK, matW, 0.5, wz); put(GB, matW, 1.5, wz); put(GR, matW, 3.5, wz);
    for (var f = -3.5; f <= 3.5; f += 1) if (f !== 0.5 && f !== -1.5) put(GP, matW, f, -2.5, 1);
    put(GP, matW, 0.5, -1.5); /* advanced pawn */
    putKnight(matW, 2.5, -2.5, Math.PI);           /* white knight developed */
    var heroWhite = putKnight(matW, -1.45, -0.55, Math.PI * 0.82);  /* the final-reveal white knight */

    /* black army (near side, z positive) */
    var bz = 3.5;
    put(GR, matB, -3.5, bz); put(GB, matB, -1.5, bz); put(GQ, matB, -0.5, bz);
    put(GK, matB, 0.5, bz); put(GB, matB, 1.5, bz); put(GR, matB, 3.5, bz);
    putKnight(matB, -2.5, 2.5, 0);
    for (var f2 = -3.5; f2 <= 3.5; f2 += 1) if (f2 !== 1.5 && f2 !== -0.5) put(GP, matB, f2, 2.5, 1);
    put(GP, matB, -0.5, 1.5);
    put(GP, matB, 2.5, 1.15, 1);

    /* THE black knight (drops in at f-file-ish square 1.5, 1.0) */
    var hero = putKnight(matB, 1.5, 1.0, -0.35);
    hero.position.y = 9;

    /* lights */
    sc.add(new THREE.AmbientLight(0x5a4636, 1.05));
    var key = new THREE.DirectionalLight(0xffd9a6, 1.25);
    key.position.set(6, 10, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -8;
    key.shadow.camera.right = key.shadow.camera.top = 8;
    sc.add(key);
    var rim = new THREE.PointLight(0xff9c50, 0.55, 30);
    rim.position.set(-7, 4, -6);
    sc.add(rim);
    var board_glow = new THREE.PointLight(0xffc070, 0.4, 12);
    board_glow.position.set(0, 1.4, 0);
    sc.add(board_glow);
    S.impactLight = new THREE.PointLight(0xffb060, 0, 7);
    S.impactLight.position.set(1.5, 0.9, 1.0);
    sc.add(S.impactLight);

    S.scene = sc;
    S.knightGroup = hero;
  }

  function easeInCubic(t) { return t * t * t; }
  function sub(p, a, b) { var v = (p - a) / (b - a); return v < 0 ? 0 : v > 1 ? 1 : v; }

  var _cam = { pos: [0, 0, 0], look: [0, 0, 0] };
  function frame(now) {
    requestAnimationFrame(frame);
    if (!S.ready || !S.visible) return;
    var dp = S.targetP - S.curP;
    S.curP += dp * 0.09;                       /* damped scroll → buttery motion */
    if (Math.abs(dp) < 0.0004) S.curP = S.targetP;
    var p = S.curP;
    var t = (now - S.t0) / 1000;

    /* knight drop: 0.28 → 0.47, impact bounce, settle */
    var fall = easeInCubic(sub(p, 0.28, 0.47));
    var settle = sub(p, 0.47, 0.53);
    var bounce = (settle > 0 && settle < 1) ? Math.sin(settle * Math.PI) * (1 - settle) * 0.22 : 0;
    var k = S.knightGroup;
    k.position.y = (1 - fall) * 9 + bounce;
    k.rotation.y = -0.35 + (1 - fall) * 0.9;
    var squash = (settle > 0 && settle < 0.5) ? 1 - Math.sin(settle * 2 * Math.PI) * 0.045 : 1;
    k.scale.set(1, squash, 1);

    /* impact flare */
    var flare = sub(p, 0.45, 0.58);
    S.impactLight.intensity = Math.sin(flare * Math.PI) * 2.4;

    /* camera */
    camAt(p, _cam);
    var shakeT = sub(p, 0.472, 0.535);
    var shake = (shakeT > 0 && shakeT < 1) ? Math.sin(shakeT * 46) * (1 - shakeT) * 0.05 : 0;
    /* gentle idle drift so the scene always breathes */
    var driftX = Math.sin(t * 0.4) * 0.045, driftY = Math.cos(t * 0.31) * 0.03;
    S.camera.position.set(_cam.pos[0] + driftX, _cam.pos[1] + shake + driftY, _cam.pos[2]);
    S.camera.lookAt(_cam.look[0], _cam.look[1], _cam.look[2]);

    S.renderer.render(S.scene, S.camera);
  }

  window.JuChessScene = {
    init: function (canvas) {
      if (S.ready || !window.THREE) return !!S.ready;
      S.canvas = canvas;
      S.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
      S.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      S.renderer.shadowMap.enabled = true;
      S.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      S.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 80);
      build();
      this.resize();
      S.t0 = performance.now();
      S.ready = true;
      requestAnimationFrame(frame);
      return true;
    },
    update: function (p) { S.targetP = p; },
    setVisible: function (v) { S.visible = v; },
    resize: function () {
      if (!S.renderer) return;
      var w = S.canvas.clientWidth || window.innerWidth;
      var h = S.canvas.clientHeight || window.innerHeight;
      S.renderer.setSize(w, h, false);
      S.camera.aspect = w / h;
      S.camera.updateProjectionMatrix();
    }
  };
})();
