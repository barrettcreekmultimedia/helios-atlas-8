import * as pc from 'playcanvas';
import {BODIES} from './data.js';
import {textureCandidates} from './atlas.js';
import {clamp,lcg} from './rules.js';
import {c,material,add,fragment,makeFragmentMesh,randBetween} from './graphics.js';
const TAU=Math.PI*2,rad=n=>n*Math.PI/180;
const rng=lcg(882991);
function sphereMesh(device){const p=[],norm=[],uv=[],idx=[],stacks=44,slices=88;
 for(let i=0;i<=stacks;i++){const lat=Math.PI/2-i*Math.PI/stacks;
  for(let j=0;j<=slices;j++){const lon=-Math.PI+j*TAU/slices;const x=Math.cos(lat)*Math.sin(lon),y=Math.sin(lat),z=-Math.cos(lat)*Math.cos(lon);p.push(x*.5,y*.5,z*.5);norm.push(x,y,z);uv.push(j/slices,1-i/stacks)}}
 for(let i=0;i<stacks;i++)for(let j=0;j<slices;j++){const a=i*(slices+1)+j,b=a+1,d=a+slices+1,e=d+1;idx.push(a,b,d,b,e,d)}
 const mesh=new pc.Mesh(device);mesh.setPositions(p);mesh.setNormals(norm);mesh.setUvs(0,uv);mesh.setIndices(idx);mesh.update();return mesh;
}
function ringMesh(app,parent,r0,r1,hex,alpha){const n=144,p=[],uv=[],idx=[];for(let i=0;i<=n;i++){const a=i/n*TAU;for(const r of [r0,r1]){p.push(Math.cos(a)*r,0,Math.sin(a)*r);uv.push(i/n,(r-r0)/(r1-r0))}if(i<n){const j=i*2;idx.push(j,j+1,j+2,j+1,j+3,j+2)}}
 const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(p);mesh.setUvs(0,uv);mesh.setIndices(idx);mesh.update();const m=material(hex,1);m.useLighting=false;m.opacity=alpha;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.update();const ent=new pc.Entity('Ring fragments / intact ring');ent.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,m,ent)]});parent.addChild(ent);return ent;
}
function tryTexture(device,urls,done){let k=0;function attempt(){if(k>=urls.length)return;const url=urls[k++],img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const t=new pc.Texture(device,{format:pc.PIXELFORMAT_RGBA8,minFilter:pc.FILTER_LINEAR_MIPMAP_LINEAR,magFilter:pc.FILTER_LINEAR,mipmaps:true});t.addressU=pc.ADDRESS_REPEAT;t.addressV=pc.ADDRESS_CLAMP_TO_EDGE;t.setSource(img);done(t,url);}catch(e){attempt();}};img.onerror=attempt;img.src=url;}attempt()}
function starfield(app){const groups=[[],[],[],[]];for(let i=0;i<5500;i++){const angle=rng()*TAU,h=rng()*2-1,rad=1100+rng()*600,flat=Math.sqrt(1-h*h);groups[i%4].push(Math.cos(angle)*flat*rad,h*rad,Math.sin(angle)*flat*rad)}
 const colors=['#9ebde9','#e1f0ff','#c3a3b8','#ffffff'];
 for(let i=0;i<4;i++){const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(groups[i]);mesh.update(pc.PRIMITIVE_POINTS);const e=new pc.Entity('Starfield');e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material(colors[i],.8),e)]});app.root.addChild(e)}
}
export function createUniverse(app,onEvent=()=>{}){
 const bodyMesh=sphereMesh(app.graphicsDevice),shardMesh=makeFragmentMesh(app.graphicsDevice);
 const worlds=new Map(),debris=[],effects=[];
 starfield(app);
 const solarLight=new pc.Entity('Sun key light');solarLight.addComponent('light',{type:'point',color:new pc.Color(1,.83,.72),intensity:14,range:1100});app.root.addChild(solarLight);
 app.scene.ambientLight=new pc.Color(.31,.32,.37);
 const scale=1.92;
 for(const d of BODIES){
  const root=new pc.Entity(d.name);app.root.addChild(root);
  const visual=new pc.Entity('Mapped planetary surface');root.addChild(visual);
  const mat=new pc.StandardMaterial();mat.diffuse=new pc.Color(1,1,1);mat.emissive=d.id==='sun'?new pc.Color(1,.78,.45):new pc.Color(.11,.12,.15);mat.emissiveIntensity=d.id==='sun'?2.6:.4;mat.update();
  const meshInstance=new pc.MeshInstance(bodyMesh,mat,visual);visual.addComponent('render',{meshInstances:[meshInstance]});
  const radius=d.size*(d.group==='star'?1.2:1.33);
  visual.setLocalScale(radius*2,radius*2,radius*2);
  if(d.id==='haumea')visual.setLocalScale(radius*2.7,radius*1.6,radius*1.7);
  tryTexture(app.graphicsDevice,[`assets/${d.texture}.jpg`],tex=>{mat.diffuseMap=tex;if(d.id==='sun')mat.emissiveMap=tex;mat.update()});
  // High fidelity real maps load only if available; local assets always work offline.
  if(['earth','mars','moon','jupiter','saturn','mercury','venus','neptune','uranus','pluto','io','europa','titan'].includes(d.texture)){
   tryTexture(app.graphicsDevice,textureCandidates(d.texture).slice(0,-1),tex=>{mat.diffuseMap=tex;if(d.id==='sun')mat.emissiveMap=tex;mat.update()});
  }
  if(d.id==='saturn'){const rings=new pc.Entity('Saturn ring plane');rings.setLocalEulerAngles(22,0,18);root.addChild(rings);for(const r of [[radius*1.27,radius*1.46,'#ab947c',.52],[radius*1.49,radius*1.79,'#d9c5a7',.68],[radius*1.83,radius*2.19,'#c3b9a5',.54],[radius*2.25,radius*2.47,'#a4a3a1',.26]])ringMesh(app,rings,...r);}
  if(d.id==='uranus'){const rings=new pc.Entity('Uranus rings');rings.setLocalEulerAngles(75,0,23);root.addChild(rings);ringMesh(app,rings,radius*1.3,radius*1.48,'#acd7df',.22)}
  if(d.id==='sun'){const halo=add(root,'Corona','sphere',[0,0,0],[radius*2.6,radius*2.6,radius*2.6],material('#ff8c43',.15));halo.render.meshInstances[0].material.opacity=.085;const m=halo.render.meshInstances[0].material;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.update();}
  const b={id:d.id,name:d.name,kind:d.kind,group:d.group,data:d,root,visual,material:mat,position:new pc.Vec3(),radius,alive:true,maxHp:d.group==='star'?Infinity:Math.round((d.group==='moon'?120:d.group==='dwarf'?160:230)+radius*42),hp:0,hitFlash:0};
  b.hp=b.maxHp;worlds.set(d.id,b);
 }
 // Freeze orbital positions while a match runs. Rotations remain animated.
 for(const d of BODIES){const b=worlds.get(d.id);if(!d.radius&&!d.parent)b.position.set(0,0,0);
  else if(d.group!=='moon'){const a=rad(d.angle||0),r=d.radius*scale;b.position.set(Math.cos(a)*r,Math.sin(a*1.3)*Math.sin(rad(d.tilt||0))*r*.2,Math.sin(a)*r);}}
 for(const d of BODIES.filter(x=>x.group==='moon')){const b=worlds.get(d.id),p=worlds.get(d.parent);const a=rad(d.angle||0),r=d.orbitRadius*1.72;b.position.set(p.position.x+Math.cos(a)*r,p.position.y+Math.sin(a*1.2)*r*.12,p.position.z+Math.sin(a)*r)}
 for(const b of worlds.values())b.root.setPosition(b.position);
 const asteroids=[];
 const rockMats=['#4a5566','#76717b','#947e75','#a6a4a0'].map(x=>material(x));
 const asteroidMesh=shardMesh;
 for(let i=0;i<125;i++){
  const r=(36+rng()*8)*scale,a=rng()*TAU,y=(rng()-.5)*4.0;
  const ent=fragment(app,asteroidMesh,rockMats[i%4],`Asteroid ${i}`);
  const radius=.14+rng()*.45,position=new pc.Vec3(Math.cos(a)*r,y,Math.sin(a)*r);
  ent.setPosition(position);ent.setLocalScale(radius,radius*.65,radius);ent.setLocalEulerAngles(rng()*180,rng()*180,rng()*180);
  asteroids.push({ent,position,radius,hp:15+radius*35,alive:true});
 }
 function burst(position,hex,count=18,power=8){
  const m=material(hex,1.5);
  for(let i=0;i<count;i++){
   const e=add(app.root,'Blast particle','sphere',[position.x,position.y,position.z],[.09,.09,.09],m);
   const v=new pc.Vec3(randBetween(-1,1),randBetween(-1,1),randBetween(-1,1)).normalize().mulScalar(randBetween(power*.4,power));
   effects.push({ent:e,pos:position.clone(),vel:v,age:0,life:randBetween(.3,.95)});
  }
 }
 function spawnShards(body,origin,impactVel){
  const count=body.group==='moon'?16:body.group==='dwarf'?22:Math.round(25+Math.min(14,body.radius*2));
  for(let i=0;i<count;i++){
   const n=new pc.Vec3(randBetween(-1,1),randBetween(-1,1),randBetween(-1,1)).normalize();
   const sr=body.radius*randBetween(.12,.25),p=origin.clone().add(n.clone().mulScalar(body.radius*randBetween(.12,.7)));
   const e=fragment(app,shardMesh,body.material,`Rubble / ${body.name}`);
   e.setPosition(p);e.setLocalScale(sr*1.2,sr*randBetween(.65,1.45),sr);e.setLocalEulerAngles(rng()*360,rng()*360,rng()*360);
   const v=n.mulScalar(randBetween(1.8,7.5)*Math.sqrt(Math.max(.5,body.radius/3))).add(impactVel?.clone().mulScalar(.22)||new pc.Vec3());
   debris.push({ent:e,pos:p,vel:v,radius:sr,hp:Math.max(8,sr*15),rot:new pc.Vec3(randBetween(-60,60),randBetween(-65,65),randBetween(-50,50)),born:performance.now(),source:body.id});
  }
  while(debris.length>240){const rem=debris.shift();rem.ent.destroy()}
 }
 function explodeWorld(b,source,velocity){
  if(!b.alive||b.group==='star')return;
  b.alive=false;b.hp=0;b.root.enabled=false;
  burst(b.position,b.data.color,Math.min(55,14+Math.round(b.radius*3)),12);
  spawnShards(b,b.position,velocity);
  onEvent('planetDestroyed',{id:b.id,name:b.name,by:source});
 }
 function damagePlanet(b,amount,by,vel){
  if(!b||!b.alive||b.group==='star')return false;
  b.hp=Math.max(0,b.hp-amount);b.hitFlash=.27;
  if(b.hp===0){explodeWorld(b,by,vel);return true}return false;
 }
 function destroyAsteroid(a,source){
  if(!a.alive)return;a.alive=false;a.ent.enabled=false;
  burst(a.position,'#efb9a0',6,3.8);
  for(let i=0;i<4;i++){
   const n=new pc.Vec3(randBetween(-1,1),randBetween(-1,1),randBetween(-1,1)).normalize(),r=a.radius*.43;
   const p=a.position.clone().add(n.clone().mulScalar(a.radius*.3)),ent=fragment(app,shardMesh,rockMats[i%rockMats.length],'Asteroid shard');
   ent.setPosition(p);ent.setLocalScale(r,r,r);debris.push({ent,pos:p,vel:n.mulScalar(randBetween(2,5)),radius:r,hp:8,rot:new pc.Vec3(32,20,46),born:performance.now(),source:'asteroid'});
  }
  onEvent('asteroidDestroyed',{by:source});
 }
 function update(dt){
  for(const b of worlds.values()){if(!b.alive)continue;b.visual.rotateLocal(0,dt*(b.group==='star'?1.4:.4),0);if(b.hitFlash>0){b.hitFlash=Math.max(0,b.hitFlash-dt);b.material.emissiveIntensity=(b.id==='sun'?2.6:.4)+b.hitFlash*4;b.material.update();}}
  for(const d of debris){d.pos.add(d.vel.clone().mulScalar(dt));d.vel.mulScalar(1-dt*.012);d.ent.setPosition(d.pos);d.ent.rotateLocal(d.rot.x*dt,d.rot.y*dt,d.rot.z*dt);
   for(const b of worlds.values()){if(!b.alive||b.group==='star')continue;const off=d.pos.clone().sub(b.position);const n=off.length();if(n<b.radius+d.radius){const norm=off.normalize();d.pos.copy(b.position).add(norm.clone().mulScalar(b.radius+d.radius+.01));const inward=d.vel.dot(norm);if(inward<0)d.vel.sub(norm.mulScalar(inward*1.45));break;}}
  }
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.age+=dt;e.pos.add(e.vel.clone().mulScalar(dt));e.vel.mulScalar(1-dt*.9);e.ent.setPosition(e.pos);const s=Math.max(.015,(1-e.age/e.life)*.15);e.ent.setLocalScale(s,s,s);if(e.age>e.life){e.ent.destroy();effects.splice(i,1)}}
 }
 return {worlds,asteroids,debris,update,burst,damagePlanet,destroyAsteroid,explodeWorld,spawnShards,scale,get(id){return worlds.get(id)}};
}
