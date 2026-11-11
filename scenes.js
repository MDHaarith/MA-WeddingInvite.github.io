/* Three.js scenes shown after the intro (needs THREE r128, loaded before this file).
   couple - the illustration as a plane inside layers: haze behind, orbiting gold dust, emerald hearts in front.
            The whole rig tilts with touch / scroll, so the layers visibly shift against each other.
   orb    - a spinning emerald heart inside gold rings, above the footer. Drag to spin it.
   Both skip silently (CSS fallback stays) without WebGL or when the visitor prefers reduced motion. */
(function(){
  const T=window.THREE;
  if(!T||!matchMedia('(prefers-reduced-motion: no-preference)').matches)return;
  const TAU=Math.PI*2,k=x=>x<0?0:x>1?1:x,sm=x=>(x=k(x))*x*(3-2*x);
  const fz=/sc=([\d.]+)/.exec(location.hash); // #sc=2 freezes the animation clock, for visual checks

  /* ---------- shared textures (drawn on canvas) and geometry ---------- */
  const cv=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return c;};
  const tex=c=>{const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;};
  const fill=(g,r,s,x,y,w,h)=>{s.forEach(([o,c])=>r.addColorStop(o,c));g.fillStyle=r;g.fillRect(x,y,w,h);};
  // Matcaps fake a studio reflection, so the jewel and gold look glossy without lights or an env map.
  const jewel=tex(cv(256,256,(g,w)=>{
    fill(g,g.createRadialGradient(w*.36,w*.3,2,w/2,w/2,w/2),[[0,'#effff7'],[.07,'#96f2cb'],[.3,'#1aa47a'],[.62,'#0b6b4d'],[.88,'#064a35'],[1,'#02261b']],0,0,w,w);
    fill(g,g.createRadialGradient(w*.72,w*.8,0,w*.72,w*.8,w*.3),[[0,'rgba(120,255,200,.4)'],[1,'rgba(120,255,200,0)']],0,0,w,w);}));
  const gold=tex(cv(256,256,(g,w)=>fill(g,g.createRadialGradient(w*.36,w*.32,4,w/2,w/2,w/2),[[0,'#fff0b8'],[.22,'#e2bd5c'],[.5,'#b8892d'],[.8,'#6e4f16'],[1,'#2e2008']],0,0,w,w)));
  const haze=tex(cv(64,64,g=>fill(g,g.createRadialGradient(32,32,0,32,32,32),[[0,'rgba(222,184,92,.95)'],[.45,'rgba(222,184,92,.32)'],[1,'rgba(222,184,92,0)']],0,0,64,64)));
  const shade=tex(cv(128,64,g=>fill(g,g.createRadialGradient(64,32,2,64,32,64),[[0,'rgba(10,40,30,.8)'],[1,'rgba(10,40,30,0)']],0,0,128,64)));
  let heartG;
  const heart=()=>heartG||(heartG=(()=>{ // upright extruded heart with a rounded bevel
    const p=[];for(let i=0;i<120;i++){const t=i/120*TAU;p.push(new T.Vector2(16*Math.pow(Math.sin(t),3),13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)));}
    const g=new T.ExtrudeGeometry(new T.Shape(p),{depth:4,bevelEnabled:true,bevelThickness:3,bevelSize:2.6,bevelSegments:6,curveSegments:1});
    g.center();g.scale(.03,.03,.03);return g;})());
  const jewelMat=(o)=>new T.MeshMatcapMaterial(Object.assign({matcap:jewel},o));
  const dots=(pos,size,mat)=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    return new T.Points(g,new T.PointsMaterial(Object.assign({map:haze,size,transparent:true,depthWrite:false},mat)));};
  const ring=n=>{const a=[];for(let i=0;i<n;i++){const t=Math.random()*TAU,r=.62+Math.random()*.28;a.push(Math.cos(t)*r,(Math.random()-.5)*1.5,Math.sin(t)*r);}return a;};

  /* ---------- plumbing: one shared loop, scenes only run while on screen ---------- */
  const live=[],ptr={x:0,y:0,tx:0,ty:0};let raf=0,last=0,clock=fz?+fz[1]:0;
  function loop(now){
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    if(!fz)clock+=dt;
    ptr.x+=(ptr.tx-ptr.x)*.06;ptr.y+=(ptr.ty-ptr.y)*.06;
    let any=false;
    for(const s of live)if(s.vis&&s.ready){any=true;s.step(dt);s.R.render(s.scene,s.cam);}
    raf=any&&!document.hidden?requestAnimationFrame(loop):0;
  }
  const kick=()=>{if(!raf){last=performance.now();raf=requestAnimationFrame(loop);}};
  function attach(s,host){
    live.push(s);
    new ResizeObserver(()=>{if(host.clientWidth){s.size(host.clientWidth);kick();}}).observe(host);
    new IntersectionObserver(e=>{s.vis=e[0].isIntersecting;kick();}).observe(host);
  }
  const renderer=canvas=>{let R;try{R=new T.WebGLRenderer({canvas,alpha:true,antialias:true});}catch(e){return null;}
    R.setPixelRatio(Math.min(devicePixelRatio||1,2));R.outputEncoding=T.sRGBEncoding;return R;};
  addEventListener('pointermove',e=>{ptr.tx=e.clientX/innerWidth*2-1;ptr.ty=e.clientY/innerHeight*2-1;},{passive:true});
  addEventListener('deviceorientation',e=>{if(e.gamma!=null){ptr.tx=Math.max(-1,Math.min(1,e.gamma/30));ptr.ty=Math.max(-1,Math.min(1,(e.beta-45)/30));}},{passive:true});
  document.addEventListener('visibilitychange',kick);

  /* ---------- couple ---------- */
  // Hearts: x/y0/y1 = lane and rise (in picture widths, relative to the picture centre), s = size, z = depth, d = seconds per rise.
  const HC=[{x:.04,y0:.45,y1:.78,s:.15,z:.25,d:4.2,ph:0},{x:-.05,y0:.45,y1:.74,s:.1,z:.5,d:3.6,ph:.5},
    {x:.62,y0:-.1,y1:.65,s:.13,z:.4,d:5,ph:.2},{x:-.66,y0:-.25,y1:.5,s:.12,z:-.3,d:5.4,ph:.6},
    {x:.74,y0:.2,y1:.85,s:.08,z:-.2,d:4.6,ph:.85},{x:-.55,y0:.1,y1:.8,s:.09,z:.6,d:4.4,ph:.35}];
  function couple(wrap){
    const img=wrap.querySelector('img'),canvas=document.createElement('canvas'),R=renderer(canvas);if(!R)return;
    const AR=688/520,W=1.9,H=2.05; // picture is 1 wide; the canvas is bigger so hearts and dust have room
    const scene=new T.Scene(),cam=new T.PerspectiveCamera(30,W/H,.1,30);cam.position.z=H/2/Math.tan(Math.PI/12);
    const rig=new T.Group();rig.position.y=H/2-.6-AR/2;scene.add(rig);
    const plane=new T.Mesh(new T.PlaneGeometry(1,AR),new T.MeshBasicMaterial({transparent:true,alphaTest:.1}));
    const glow=new T.Mesh(new T.PlaneGeometry(1.7,1.7),new T.MeshBasicMaterial({map:haze,transparent:true,depthWrite:false,opacity:.6}));glow.position.set(0,.12,-.9);
    const ground=new T.Mesh(new T.PlaneGeometry(.95,.24),new T.MeshBasicMaterial({map:shade,transparent:true,depthWrite:false,opacity:.5}));ground.position.set(0,-AR/2+.03,-.03);
    const dust=dots(ring(34),.07,{opacity:.9});
    const hs=HC.map(c=>{const m=new T.Mesh(heart(),jewelMat({transparent:true}));rig.add(m);return{c,m};});
    rig.add(glow,ground,dust,plane);
    const s={R,scene,cam,vis:false,ready:false,
      size(w){canvas.style.cssText=`left:${-(W-1)/2*w}px;top:${-.6*w}px;width:${W*w}px;height:${H*w}px`;R.setSize(W*w,H*w,false);},
      step(){
        const r=wrap.getBoundingClientRect(),sc=Math.max(-1,Math.min(1,(r.top+r.height/2-innerHeight/2)/innerHeight));
        rig.rotation.set(ptr.y*.16+sc*.28,ptr.x*.32+Math.sin(clock*.6)*.1,0);
        plane.position.y=Math.sin(clock*1.1)*.012;dust.rotation.y=clock*.25;dust.material.opacity=.7+.25*Math.sin(clock*1.7);
        for(const{c,m}of hs){
          const p=(clock/c.d+c.ph)%1,f=sm(p/.18)*(1-sm((p-.7)/.3));
          m.visible=f>.01;m.material.opacity=f;
          m.position.set(c.x+Math.sin(p*6+c.ph*9)*.07,c.y0+(c.y1-c.y0)*p,c.z);
          m.scale.setScalar(c.s*(.4+.6*f));m.rotation.set(Math.sin(clock+c.ph*6)*.2,clock*.9+c.ph*6,Math.sin(clock*1.3+c.ph*5)*.25);
        }
      }};
    new T.TextureLoader().load(img.getAttribute('src'),t=>{
      t.encoding=T.sRGBEncoding;t.anisotropy=4;plane.material.map=t;plane.material.needsUpdate=true;
      wrap.append(canvas);wrap.classList.add('gl');s.ready=true;kick();
    },undefined,()=>R.dispose());
    attach(s,wrap);
  }

  /* ---------- footer orb ---------- */
  function orb(canvas){
    const R=renderer(canvas);if(!R){canvas.remove();return;}
    const scene=new T.Scene(),cam=new T.PerspectiveCamera(28,1.125,.1,30);cam.position.z=4.9;
    const g=new T.Group();scene.add(g);
    const h=new T.Mesh(heart(),jewelMat());h.scale.setScalar(1.15);
    const gm=new T.MeshMatcapMaterial({matcap:gold}),r1=new T.Mesh(new T.TorusGeometry(.98,.013,8,100),gm),r2=new T.Mesh(new T.TorusGeometry(.8,.009,8,100),gm);
    const hz=new T.Mesh(new T.PlaneGeometry(2.8,2.8),new T.MeshBasicMaterial({map:haze,transparent:true,depthWrite:false,opacity:.45}));hz.position.z=-.9;
    const sp=dots(ring(30),.06,{opacity:.9,blending:T.AdditiveBlending,color:0xecd391});
    g.add(h,r1,r2,sp);scene.add(hz);
    let spin=0,vel=.5,drag=null;
    canvas.addEventListener('pointerdown',e=>{drag=e.clientX;canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{if(drag!=null){vel+=(e.clientX-drag)*.05;drag=e.clientX;}});
    addEventListener('pointerup',()=>drag=null);
    const s={R,scene,cam,vis:false,ready:true,
      size(){R.setSize(canvas.clientWidth,canvas.clientHeight,false);cam.aspect=canvas.clientWidth/canvas.clientHeight;cam.updateProjectionMatrix();},
      step(dt){
        vel+=(.5-vel)*Math.min(1,dt*1.2);spin+=vel*dt;
        h.rotation.set(Math.sin(clock*.8)*.12,spin,Math.sin(clock*.6)*.06);
        h.scale.setScalar(1.15*(1+.07*Math.pow(Math.max(0,Math.sin(clock*2.6)),6))); // heartbeat
        r1.rotation.set(1.15,clock*.45,clock*.2);r2.rotation.set(.5,-clock*.35+1,.9);sp.rotation.y=clock*.3;
        g.rotation.x=ptr.y*.15;
      }};
    attach(s,canvas);
  }

  const c=document.querySelector('.couple'),o=document.getElementById('orb');
  if(c)couple(c);
  if(o)orb(o);
})();
