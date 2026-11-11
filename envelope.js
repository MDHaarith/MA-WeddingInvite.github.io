/* 3D wedding envelope (Three.js r128, global THREE).
   initEnvelope(canvas) -> {open(onReveal), dispose()}, or null when WebGL is unavailable. */
function initEnvelope(canvas){
  const T=window.THREE;if(!T)return null;
  let R;
  try{R=new T.WebGLRenderer({canvas,antialias:true,alpha:true});}catch(e){return null;}
  R.setPixelRatio(Math.min(devicePixelRatio||1,2));
  R.outputEncoding=T.sRGBEncoding;
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(32,1,.1,60);
  const TAU=Math.PI*2,L=1.16; // L = flap length; envelope is 3 x 2

  /* ---------- textures (all drawn on canvas, no image files) ---------- */
  const cv=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c;};
  const tex=(c,rep)=>{const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;if(rep){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep);}return t;};
  const fibres=(g,w,h,n)=>{for(let i=0;i<n;i++){const x=Math.random()*w,y=Math.random()*h,a=Math.random()*TAU,l=3+Math.random()*9;
    g.strokeStyle=Math.random()<.5?'rgba(120,90,40,.05)':'rgba(255,255,255,.2)';g.lineWidth=.6+Math.random();
    g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}};
  const paperC=cv(512,512,(g,w,h)=>{g.fillStyle='#f6ecd6';g.fillRect(0,0,w,h);fibres(g,w,h,2200);});
  const paperTex=tex(paperC,1),paperBump=new T.CanvasTexture(paperC);
  paperBump.wrapS=paperBump.wrapT=T.RepeatWrapping;
  const lining=tex(cv(256,256,(g,w,h)=>{ // emerald lining with a fine gold lattice
    g.fillStyle='#0d5440';g.fillRect(0,0,w,h);fibres(g,w,h,500);g.strokeStyle='rgba(236,211,145,.3)';g.fillStyle='rgba(236,211,145,.3)';g.lineWidth=1.2;
    g.beginPath();g.moveTo(128,0);g.lineTo(256,128);g.lineTo(128,256);g.lineTo(0,128);g.closePath();g.stroke();
    g.beginPath();g.arc(128,128,7,0,TAU);g.stroke();g.beginPath();g.arc(128,128,2.2,0,TAU);g.fill();
    for(const[x,y]of[[0,0],[256,0],[0,256],[256,256]]){g.beginPath();g.arc(x,y,2.2,0,TAU);g.fill();}
  }),1.6);
  const matcap=tex(cv(256,256,(g,w)=>{ // fake studio reflection so the gold trim has a sheen without an env map
    const r=g.createRadialGradient(w*.36,w*.32,4,w/2,w/2,w/2);
    [[0,'#fff0b8'],[.22,'#e2bd5c'],[.5,'#b8892d'],[.8,'#6e4f16'],[1,'#2e2008']].forEach(([o,c])=>r.addColorStop(o,c));
    g.fillStyle=r;g.fillRect(0,0,w,w);}));
  const glowSprite=tex(cv(64,64,g=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,244,200,1)');r.addColorStop(.4,'rgba(236,211,145,.5)');r.addColorStop(1,'rgba(236,211,145,0)');g.fillStyle=r;g.fillRect(0,0,64,64);}));
  const shadowTex=tex(cv(256,256,g=>{const r=g.createRadialGradient(128,128,10,128,128,128);r.addColorStop(0,'rgba(0,0,0,.7)');r.addColorStop(.55,'rgba(0,0,0,.3)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,256,256);}));

  // Letter card and wax-seal monogram are text, so they are redrawn once the web fonts arrive.
  const letterC=cv(1024,610,()=>{}),sealC=cv(256,256,()=>{});
  const letterTex=tex(letterC),sealTex=tex(sealC);
  function paint(){
    let g=letterC.getContext('2d'),w=1024,h=610;
    g.fillStyle=g.createPattern(paperC,'repeat');g.fillRect(0,0,w,h);
    const gd=g.createLinearGradient(0,0,w,h);[[0,'#a8823a'],[.5,'#ecd391'],[1,'#a8823a']].forEach(([o,c])=>gd.addColorStop(o,c));
    g.strokeStyle=gd;g.lineWidth=5;g.strokeRect(26,26,w-52,h-52);g.lineWidth=1.5;g.strokeRect(42,42,w-84,h-84);
    g.textAlign='center';g.fillStyle='#9a7429';g.font='600 26px Cinzel,serif';g.letterSpacing='9px';g.fillText('THE WEDDING OF',w/2,150);
    g.letterSpacing='0px';
    const parts=[['Meeran','500 #px "Cormorant Garamond",serif','#0b3d2e',130],['&','#px "Great Vibes",cursive','#b8913f',110],['Amra','500 #px "Cormorant Garamond",serif','#0b3d2e',130]];
    const measure=(m)=>parts.map(([t,f,,z])=>(g.font=f.replace('#',z*m),g.measureText(t).width));
    const m=Math.min(1,(w-190)/(measure(1).reduce((a,b)=>a+b)+44)),ws=measure(m),gap=22*m;
    let x=(w-ws.reduce((a,b)=>a+b)-gap*2)/2;g.textAlign='left';
    parts.forEach(([t,f,c,z],i)=>{g.font=f.replace('#',z*m);g.fillStyle=c;g.fillText(t,x,340);x+=ws[i]+gap;});
    g.textAlign='center';g.fillStyle='#0b3d2e';g.font='600 30px Cinzel,serif';g.letterSpacing='11px';g.fillText('10 · 01 · 2027',w/2,468);g.letterSpacing='0px';
    g.fillStyle=gd;g.fillRect(w/2-190,516,150,2);g.fillRect(w/2+40,516,150,2);
    g.beginPath();g.moveTo(w/2,504);g.lineTo(w/2+12,517);g.lineTo(w/2,530);g.lineTo(w/2-12,517);g.fill();
    letterTex.needsUpdate=true;

    g=sealC.getContext('2d');w=256;g.clearRect(0,0,w,w);
    g.strokeStyle='rgba(236,211,145,.5)';g.lineWidth=2;g.setLineDash([2,7]);g.beginPath();g.arc(128,128,112,0,TAU);g.stroke();g.setLineDash([]);
    const sp=[['M','600 84px Cinzel,serif'],['&','84px "Great Vibes",cursive'],['A','600 84px Cinzel,serif']];
    const sw=sp.map(([t,f])=>(g.font=f,g.measureText(t).width)),sg=6;
    let sx=(w-sw.reduce((a,b)=>a+b)-sg*2)/2;g.textAlign='left';
    sp.forEach(([t,f],i)=>{g.font=f; // emboss: shadow, highlight, then gold face
      [[2.5,3,'rgba(0,0,0,.55)'],[-1.5,-2,'rgba(255,240,190,.55)']].forEach(([dx,dy,c])=>{g.fillStyle=c;g.fillText(t,sx+dx,160+dy);});
      const gr=g.createLinearGradient(0,90,0,170);gr.addColorStop(0,'#fff1c4');gr.addColorStop(.5,'#d9b866');gr.addColorStop(1,'#a8823a');
      g.fillStyle=gr;g.fillText(t,sx,160);sx+=sw[i]+sg;});
    sealTex.needsUpdate=true;
  }
  paint();
  if(document.fonts)Promise.all(['600 26px Cinzel','500 40px "Cormorant Garamond"','40px "Great Vibes"'].map(f=>document.fonts.load(f))).then(paint).then(()=>settle&&render());

  /* ---------- geometry ---------- */
  const shape=p=>{const s=new T.Shape();p.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;};
  const ribbon=(pts,w,z)=>{ // thin flat strip along a polyline, used for the gold foil trim
    const v=[];for(let i=0;i<pts.length-1;i++){
      const[ax,ay]=pts[i],[bx,by]=pts[i+1],d=Math.hypot(bx-ax,by-ay),dx=(bx-ax)/d,dy=(by-ay)/d,nx=-dy*w/2,ny=dx*w/2,e=w/2;
      const A=[ax-dx*e,ay-dy*e],B=[bx+dx*e,by+dy*e];
      v.push(A[0]-nx,A[1]-ny,z,B[0]-nx,B[1]-ny,z,B[0]+nx,B[1]+ny,z,A[0]-nx,A[1]-ny,z,B[0]+nx,B[1]+ny,z,A[0]+nx,A[1]+ny,z);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.computeVertexNormals();
    return new T.Mesh(g,goldMat);};

  const paperMat=new T.MeshStandardMaterial({map:paperTex,bumpMap:paperBump,bumpScale:.3,roughness:.88});
  const pocketMat=paperMat.clone();pocketMat.color.set(0xf0e5cb).convertSRGBToLinear();
  const liningFront=new T.MeshStandardMaterial({map:lining,roughness:.7}),liningBack=liningFront.clone();liningBack.side=T.BackSide;
  const goldMat=new T.MeshMatcapMaterial({matcap});
  const env=new T.Group();scene.add(env);

  const back=new T.Mesh(new T.ShapeGeometry(shape([[-1.5,-1],[1.5,-1],[1.5,1],[-1.5,1]])),liningFront);
  const letter=new T.Mesh(new T.PlaneGeometry(2.52,1.5),new T.MeshStandardMaterial({map:letterTex,roughness:.85}));letter.position.z=.02;
  const pocket=new T.Mesh(new T.ExtrudeGeometry(shape([[-1.5,-1],[1.5,-1],[1.5,1],[0,-.05],[-1.5,1]]),{depth:.012,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2}),pocketMat);
  pocket.position.z=.045;
  const trimV=ribbon([[-1.5,.9],[0,-.13],[1.5,.9]],.022,.068),trimBox=ribbon([[-1.4,.83],[-1.4,-.9],[1.4,-.9],[1.4,.83]],.022,.068);

  const flap=new T.Group(),flapGeo=new T.ShapeGeometry(shape([[-1.5,0],[1.5,0],[0,-L]]));
  flap.position.set(0,1,.085);
  flap.add(new T.Mesh(flapGeo,paperMat),new T.Mesh(flapGeo,liningBack),ribbon([[-1.37,-.06],[0,-L+.11],[1.37,-.06]],.022,.003));

  const shadow=new T.Mesh(new T.PlaneGeometry(5.2,4.2),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false,opacity:.9}));
  shadow.position.set(.12,-.4,-.45);

  // Wax seal in two halves so it can crack apart.
  const wax=new T.MeshPhysicalMaterial({color:0x0a5a42,roughness:.4,metalness:.05,clearcoat:.35,clearcoatRoughness:.3});wax.color.convertSRGBToLinear();
  const decalMat=new T.MeshStandardMaterial({map:sealTex,transparent:true,roughness:.4,metalness:.25,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  const wobble=g=>{const p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),a=Math.atan2(x,z),k=1+.045*Math.sin(5*a+.6)+.025*Math.sin(9*a+2);p.setX(i,x*k);p.setZ(i,z*k);}return g;};
  const half=s=>{const g=new T.Group(),q=Math.PI/2*s;
    const plate=new T.Mesh(wobble(new T.CylinderGeometry(.28,.3,.07,48,1,false,s>0?0:Math.PI,Math.PI)).rotateX(Math.PI/2),wax);
    const rim=new T.Mesh(new T.TorusGeometry(.225,.026,10,40,Math.PI).rotateZ(-q),wax);rim.position.z=.035;
    const decal=new T.Mesh(new T.CircleGeometry(.198,40,-q,Math.PI),decalMat);decal.position.z=.0375;
    g.add(plate,rim,decal);return g;};
  const seal=new T.Group(),sealL=half(-1),sealR=half(1);seal.add(sealL,sealR);seal.position.set(0,-.14,.12);

  const dark=o=>new T.MeshBasicMaterial({color:0,transparent:true,opacity:o,depthWrite:false});
  const flapShade=new T.Mesh(new T.ShapeGeometry(shape([[-1.5,1],[1.5,1],[0,-.25]])),dark(.3));flapShade.position.z=.072;
  const sealShade=new T.Mesh(new T.CircleGeometry(.33,32),dark(.4));sealShade.position.set(.035,-.18,.088);
  env.add(shadow,back,letter,pocket,trimV,trimBox,flapShade,flap,sealShade,seal);

  /* ---------- lights ---------- */
  scene.add(new T.HemisphereLight(0xfff3dc,0x0b3d2e,.5));
  const key=new T.DirectionalLight(0xfff0d2,.3);key.position.set(-3,4.5,6);scene.add(key);
  const lamp=new T.PointLight(0xfff0d0,.75,12);lamp.position.set(-3,3,4);scene.add(lamp);
  const spark=new T.PointLight(0xffd990,.2,6);spark.position.set(.8,-.2,2.4);scene.add(spark);

  /* ---------- floating gold dust + seal-break burst ---------- */
  const dotMat=sz=>new T.PointsMaterial({map:glowSprite,size:sz,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:0xecd391});
  const N=60,dp=new Float32Array(N*3),ds=new Float32Array(N);
  for(let i=0;i<N;i++){dp.set([(Math.random()-.5)*8,(Math.random()-.5)*7,(Math.random()-.2)*3],i*3);ds[i]=.08+Math.random()*.15;}
  const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(dp,3));
  scene.add(new T.Points(dustGeo,dotMat(.1)));
  const B=40,bp=new Float32Array(B*3),bv=new Float32Array(B*3),burstGeo=new T.BufferGeometry(),burstMat=dotMat(.16);
  burstGeo.setAttribute('position',new T.BufferAttribute(bp,3));
  const burst=new T.Points(burstGeo,burstMat);burst.visible=false;scene.add(burst);
  let burstAge=-1,fired=false;
  function fire(){fired=true;const o=seal.getWorldPosition(new T.Vector3());
    for(let i=0;i<B;i++){const a=Math.random()*TAU,s=1.2+Math.random()*2.4;bp.set([o.x,o.y,o.z],i*3);bv.set([Math.cos(a)*s,Math.sin(a)*s+1,Math.random()*2.4],i*3);}
    burstAge=0;burst.visible=true;}

  /* ---------- timeline ---------- */
  const k=x=>x<0?0:x>1?1:x,S=(t,a,b)=>{const x=k((t-a)/(b-a));return x*x*(3-2*x);};
  let clock=0,px=0,py=0,tx=0,ty=0;
  function pose(t,idle){
    const f=S(t,.3,1.6),tl=S(t,.4,2.6),r=S(t,1.3,2.5),g=S(t,2.45,3.7),q=k(t/.7),calm=1-tl;
    const sw=idle*calm;
    env.rotation.set(-.3*calm-.03*tl+(.03*Math.sin(clock*.9)+py*.1)*sw,(.1*Math.sin(clock*.7)+px*.25)*sw,0);
    env.position.y=-1.1*tl+.04*Math.sin(clock*1.1)*sw;
    flap.rotation.x=-f*Math.PI;flap.position.z=.085-.115*f; // hinge slides behind, so the letter can pass in front of the open flap
    sealL.position.set(-.4*q,-1.7*q*q,.9*q);sealL.rotation.z=1.1*q;
    sealR.position.set(.4*q,-1.7*q*q,.9*q);sealR.rotation.z=-1.1*q;
    seal.visible=q<1;flapShade.material.opacity=.3*(1-S(t,.3,.9));sealShade.material.opacity=.4*(1-q);
    const pulse=Math.sin(clock*2.4);seal.scale.setScalar(1+.03*pulse*calm);spark.intensity=.2+.12*pulse*calm+.4*g;
    letter.position.set(0,-.1+2.1*r-.45*g,.02+2.3*g);letter.rotation.x=-env.rotation.x*g;letter.scale.setScalar(1+.06*g);
    shadow.material.opacity=.9*(1-S(t,1.6,3));
  }

  /* ---------- loop ---------- */
  let ot=-1,reveal=null,raf=0,last=performance.now(),settle=false;
  const render=()=>R.render(scene,cam);
  function frame(now){
    raf=requestAnimationFrame(frame);
    const dt=Math.max(0,Math.min(.05,(now-last)/1000));last=now;clock+=dt;
    px+=(tx-px)*.06;py+=(ty-py)*.06;
    if(ot>=0){ot+=dt;if(!fired&&ot>.05)fire();if(reveal&&ot>3.5){reveal();reveal=null;}}
    pose(Math.max(ot,0),1);
    const p=dustGeo.attributes.position;
    for(let i=0;i<N;i++){let y=p.getY(i)+ds[i]*dt*(ot>=0?3:1);if(y>3.6)y=-3.6;p.setXYZ(i,p.getX(i)+Math.sin(clock+i)*.0016,y,p.getZ(i));}
    p.needsUpdate=true;
    if(burstAge>=0){burstAge+=dt;const b=burstGeo.attributes.position;
      for(let i=0;i<B;i++){bv[i*3+1]-=2.6*dt;b.setXYZ(i,b.getX(i)+bv[i*3]*dt,b.getY(i)+bv[i*3+1]*dt,b.getZ(i)+bv[i*3+2]*dt);}
      b.needsUpdate=true;burstMat.opacity=1-k(burstAge/1.3);if(burstAge>1.3){burst.visible=false;burstAge=-1;}}
    render();
  }
  function size(){
    const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
    R.setSize(w,h,false);cam.aspect=w/h;
    cam.position.z=Math.max(5.8/cam.aspect,10.8); // phone: envelope fills ~90% of the width
    cam.updateProjectionMatrix();if(settle)render();
  }
  const onMove=e=>{tx=e.clientX/innerWidth*2-1;ty=e.clientY/innerHeight*2-1;};
  const onTilt=e=>{if(e.gamma!=null){tx=Math.max(-1,Math.min(1,e.gamma/30));ty=Math.max(-1,Math.min(1,(e.beta-45)/30));}};
  addEventListener('resize',size);addEventListener('pointermove',onMove,{passive:true});addEventListener('deviceorientation',onTilt,{passive:true});
  size();

  const dbg=/pose=([\d.]+)/.exec(location.hash); // #pose=1.8 renders one fixed frame, for visual checks
  if(dbg){settle=true;ot=+dbg[1];pose(ot,0);if(ot>=.05)fire();render();}
  else raf=requestAnimationFrame(frame);

  return{
    open(cb){reveal=cb;ot=0;},
    dispose(){cancelAnimationFrame(raf);removeEventListener('resize',size);removeEventListener('pointermove',onMove);removeEventListener('deviceorientation',onTilt);R.dispose();}
  };
}
