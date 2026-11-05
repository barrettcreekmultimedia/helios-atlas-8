import * as pc from 'playcanvas';
import {SHIP_CLASSES,assignTeams,applyDamage,findWinner,segmentSphere,clamp,calculatePlanetDamage,lcg} from './rules.js';
import {buildShip,material,add} from './graphics.js';
const V=(x=0,y=0,z=0)=>new pc.Vec3(x,y,z),FWD=V(0,0,-1),UP=V(0,1,0),RIGHT=V(1,0,0);
const rand=lcg(9145);
const local=(q,v)=>q.transformVector(v,V());
export class ArenaGame{
 constructor(app,universe,{mode='teams',humans=2,arena='earth',difficulty='standard',p1='fighter',p2='interceptor'},callback=()=>{}){
  this.app=app;this.universe=universe;this.callback=callback;
  this.mode=mode;this.humans=humans;this.arena=arena;this.difficulty=difficulty;this.elapsed=0;this.over=false;this.paused=false;this.ships=[];this.projectiles=[];this.kills=[];this.score=[0,0,0,0];this.frameCount=0;
  const assignments=assignTeams(mode,humans),center=universe.get(arena)?.position.clone()||V(0,0,0),baseRadius=universe.get(arena)?.radius||3;
  const shipChoices=[p1,humans===2?p2:'fighter','fighter','dreadnought'];
  const colorTeams=mode==='teams'?['#74e4ff','#74e4ff','#ff8579','#ff8579']:['#74e4ff','#f2cc88','#ff8579','#bd9aff'];
  for(const slot of assignments){
   const shipClass=SHIP_CLASSES[shipChoices[slot.slot]]||SHIP_CLASSES.fighter;
   const spread=[[-10,-2,0],[10,2,0],[-9,2,17],[9,-2,17]][slot.slot];
   const position=center.clone().add(V(baseRadius+14+spread[2],spread[1],spread[0]));
   const ship=buildShip(app,slot.slot,shipChoices[slot.slot],colorTeams[slot.slot]);
   ship.root.setPosition(position);ship.root.lookAt(center);
   const rotation=ship.root.getRotation().clone();
   const camera=new pc.Entity('Camera / Pilot '+(slot.slot+1));
   if(slot.human){camera.addComponent('camera',{nearClip:.06,farClip:2400,fov:70,clearColor:new pc.Color(.002,.004,.014),priority:slot.slot});
    camera.camera.rect=humans===1?new pc.Vec4(0,0,1,1):slot.slot===0?new pc.Vec4(0,.5,1,.5):new pc.Vec4(0,0,1,.5);
    app.root.addChild(camera);}
   this.ships.push({id:slot.slot,name:slot.human?'PLAYER '+(slot.slot+1):'ACE BOT '+(slot.slot-humans+1),human:slot.human,team:slot.team,klass:shipChoices[slot.slot],settings:shipClass,model:ship,camera,position,rotation,vel:V(),omega:V(),hp:shipClass.hp,shields:shipClass.shields,laserCD:0,missileCD:0,kills:0,damage:0,alive:true,input:{},target:null,lockMode:'ships',message:'COMBAT READY',shotFlash:0,trail:[],boosting:false,impactCooldown:0,heatParticleCooldown:0});
  }
  this.planetHits=0;this.planetsDestroyed=0;this.projectilesFired=0;
  this.weaponMat={laser:[material('#79f0ff',3),material('#ffb896',3),material('#ff7b87',3),material('#c1a3ff',3)],missile:material('#ffd098',1.25)};
  this.fx=[];
 }
 humanShip(i){return this.ships.find(x=>x.human&&x.id===i)}
 optionsForTarget(ship){
  const targets=[];
  if(ship.lockMode==='worlds'){
   for(const b of this.universe.worlds.values())if(b.alive&&b.group!=='star')targets.push({kind:'planet',id:b.id,position:b.position,radius:b.radius,name:b.name});
  }else{
   for(const s of this.ships)if(s.hp>0&&s.id!==ship.id&&s.team!==ship.team)targets.push({kind:'ship',id:s.id,position:s.position,radius:s.settings.radius,name:s.name});
  }
  targets.sort((a,b)=>ship.position.distance(a.position)-ship.position.distance(b.position));return targets;
 }
 cycleTarget(ship,step=1){if(!ship)return;const targets=this.optionsForTarget(ship);if(!targets.length){ship.target=null;return}
  const ix=targets.findIndex(t=>ship.target?.kind===t.kind&&ship.target?.id===t.id);const next=targets[ix<0?0:(ix+step+targets.length)%targets.length];ship.target={kind:next.kind,id:next.id};
  ship.message='TARGET LOCK / '+this.targetInfo(ship.target)?.name;
 }
 toggleTargetMode(ship){if(!ship)return;ship.lockMode=ship.lockMode==='ships'?'worlds':'ships';ship.target=null;this.cycleTarget(ship,0);this.callback('targetMode',{pilot:ship.id,mode:ship.lockMode})}
 targetInfo(ref){if(!ref)return null;if(ref.kind==='ship'){const s=this.ships[ref.id];return s&&s.hp>0?{position:s.position,radius:s.settings.radius,name:s.name}:null}
  const b=this.universe.get(ref.id);return b?.alive?{position:b.position,radius:b.radius,name:b.name,hp:b.hp,maxHp:b.maxHp}:null;}
 acquire(ship){const candidates=this.optionsForTarget(ship);if(!candidates.length)return null;const locked=this.targetInfo(ship.target);
  return locked?ship.target:{kind:candidates[0].kind,id:candidates[0].id};}
 shoot(ship,type){if(!ship||ship.hp<=0||this.paused||this.over)return;
  const missile=type==='missile',cd=missile?'missileCD':'laserCD';if(ship[cd]>0)return;
  ship[cd]=missile?ship.settings.missileDelay:ship.settings.laserDelay;
  const f=local(ship.rotation,FWD),r=local(ship.rotation,RIGHT),u=local(ship.rotation,UP);
  const source=ship.position.clone().add(f.clone().mulScalar(1.0)).add(r.mulScalar((this.projectilesFired%2?1:-1)*.23));
  const speed=missile?29:110;
  const projectile={owner:ship.id,team:ship.team,type,position:source,velocity:f.clone().mulScalar(speed).add(ship.vel.clone().mulScalar(.32)),damage:missile?ship.settings.missileDamage:ship.settings.laserDamage,life:missile?7.2:2.8,radius:missile?.23:.17,target:missile?this.acquire(ship):null,age:0};
  const mat=missile?this.weaponMat.missile:this.weaponMat.laser[ship.id];
  projectile.entity=add(this.app.root,missile?'Guided missile':'Pulse shot','sphere',[source.x,source.y,source.z],missile?[.22,.22,.43]:[.17,.17,.34],mat);
  this.projectiles.push(projectile);this.projectilesFired++;ship.shotFlash=.13;
  this.callback('shoot',{owner:ship.id,type});
 }
 hurtShip(ship,amount,attacker=null,cause='weapons'){if(!ship||ship.hp<=0)return;
  const continuous=cause==='solar heat';
  if(!continuous&&cause!=='missile'&&cause!=='laser'&&cause!=='vessel collision'&&ship.impactCooldown>0)return;
  if(!continuous)ship.impactCooldown=(cause==='planetary collision'||cause==='asteroid collision')?.48:.08;
  const before=ship.hp;
  const result=applyDamage(ship,amount);ship.shotFlash=.18;
  if(!continuous||ship.heatParticleCooldown<=0){this.universe.burst(ship.position,ship.settings.color,continuous?3:Math.min(12,4+Math.round(amount/9)),continuous?2:5);if(continuous)ship.heatParticleCooldown=.3;}
  if(attacker!==null&&attacker!==ship.id&&this.ships[attacker])this.ships[attacker].damage+=result.dealt;
  if(result.killed){ship.alive=false;ship.model.root.enabled=false;ship.camera?.camera&& (ship.camera.camera.fov=68);
   this.universe.burst(ship.position,'#f7c8a0',27,12);
   if(attacker!==null&&attacker!==ship.id&&this.ships[attacker]){this.ships[attacker].kills++;this.kills.push({by:attacker,victim:ship.id});}
   this.callback('kill',{by:attacker,victim:ship.id,cause});
   const winner=findWinner(this.ships);
   if(winner){this.over=true;this.callback('winner',winner)}
  }
 }
 hitProjectile(p,previous){
  const end=p.position;
  let target=null,closest=Infinity;
  // Friendly fire disabled in team mode; free-for-all everyone is an enemy.
  for(const s of this.ships){if(s.hp<=0||s.id===p.owner||s.team===p.team)continue;
   const t=segmentSphere(previous,end,s.position,s.settings.radius+.22);if(t!==null&&t<closest){target={kind:'ship',obj:s};closest=t}}
  for(const b of this.universe.worlds.values()){if(!b.alive)continue;
   const t=segmentSphere(previous,end,b.position,b.radius);if(t!==null&&t<closest){target={kind:'planet',obj:b};closest=t}}
  for(const a of this.universe.asteroids){if(!a.alive)continue;const t=segmentSphere(previous,end,a.position,a.radius);if(t!==null&&t<closest){target={kind:'asteroid',obj:a};closest=t}}
  for(const d of this.universe.debris){const t=segmentSphere(previous,end,d.pos,d.radius*.98);if(t!==null&&t<closest){target={kind:'debris',obj:d};closest=t}}
  if(!target)return false;
  const impact=previous.clone().lerp(previous,end,closest);
  const blastSize=p.type==='missile'?10:4;
  this.universe.burst(impact,p.type==='missile'?'#ffe0ad':'#b6ecff',blastSize,p.type==='missile'?7:3);
  const o=target.obj;
  if(target.kind==='ship'){this.hurtShip(o,p.damage,p.owner,p.type)}
  else if(target.kind==='planet'){
   if(o.group!=='star'){this.planetHits++;const destroyed=this.universe.damagePlanet(o,p.damage*(p.type==='missile'?2.45:1.6),p.owner,p.velocity);if(destroyed){this.planetsDestroyed++;for(const ship of this.ships){if(ship.target?.kind==='planet'&&ship.target?.id===o.id)ship.target=null;} }}
   else{this.universe.burst(impact,'#ff9b44',14,11)}
  }else if(target.kind==='asteroid'){o.hp-=p.damage*(p.type==='missile'?2:1);if(o.hp<=0)this.universe.destroyAsteroid(o,p.owner)}
  else if(target.kind==='debris'){o.hp-=p.damage;if(o.hp<=0){o.ent.destroy();this.universe.debris.splice(this.universe.debris.indexOf(o),1)}else o.vel.add(p.velocity.clone().normalize().mulScalar(6));}
  return true;
 }
 steerBot(s,dt){
  const enemies=this.ships.filter(other=>other.hp>0&&other.team!==s.team);
  if(!enemies.length)return;
  enemies.sort((a,b)=>a.position.distance(s.position)-b.position.distance(s.position));let target=enemies[0];
  const lead=target.position.clone().add(target.vel.clone().mulScalar(Math.min(1,target.position.distance(s.position)/88)));
  const desired=lead.clone().sub(s.position),dist=desired.length();const forward=local(s.rotation,FWD);
  const lookAt=s.model.root;lookAt.setPosition(s.position);lookAt.lookAt(lead);
  const desiredQ=lookAt.getRotation().clone(),turn=this.difficulty==='veteran'?2.7:this.difficulty==='rookie'?1.0:1.65;
  s.rotation.slerp(s.rotation,desiredQ,clamp(dt*turn,0,1));
  // Fire only when weapons are actually pointing at a target.
  const aim=local(s.rotation,FWD).dot(desired.clone().normalize());
  if(this.elapsed>3.5&&aim>.965&&dist<100&&rand()>(this.difficulty==='rookie'?.58:.35))this.shoot(s,'laser');
  if(this.elapsed>4.5&&aim>.93&&dist<90&&rand()>(this.difficulty==='veteran'?.94:.983)){s.target={kind:'ship',id:target.id};this.shoot(s,'missile')}
  const avoid=dist<9?-1:dist>27?1:.27;
  // Bot strafing + gravitationally plausible momentum drift; no teleportation.
  const dir=local(s.rotation,FWD);s.vel.add(dir.mulScalar(s.settings.acceleration*dt*avoid*.9));
  const tangent=local(s.rotation,RIGHT);s.vel.add(tangent.mulScalar(dt*2*Math.sin(this.elapsed*.75+s.id*1.7)));
  if(s.vel.length()>s.settings.maxSpeed*.8)s.vel.mulScalar(s.settings.maxSpeed*.8/s.vel.length());
 }
 steerHuman(s,dt,input){
  const cfg=s.settings;
  const mouseYaw=clamp(input.mouseX||0,-110,110)*.0028*cfg.turn;
  const mousePitch=clamp(input.mouseY||0,-110,110)*.0026*cfg.turn;
  s.omega.y+=(input.yaw||0)*cfg.turn*dt+mouseYaw;
  s.omega.x+=(input.pitch||0)*cfg.turn*dt+mousePitch;
  s.omega.z+=(input.roll||0)*cfg.turn*dt;
  s.omega.mulScalar(Math.exp(-dt*5));
  const cap=cfg.turn*1.3;s.omega.x=clamp(s.omega.x,-cap,cap);s.omega.y=clamp(s.omega.y,-cap,cap);s.omega.z=clamp(s.omega.z,-cap,cap);
  const qy=new pc.Quat().setFromAxisAngle(UP,s.omega.y*dt*180/Math.PI),qx=new pc.Quat().setFromAxisAngle(RIGHT,s.omega.x*dt*180/Math.PI),qz=new pc.Quat().setFromAxisAngle(FWD,s.omega.z*dt*180/Math.PI);
  s.rotation.mul(qy).mul(qx).mul(qz).normalize();
  const f=local(s.rotation,FWD),r=local(s.rotation,RIGHT),u=local(s.rotation,UP);
  const turbo=input.boost?1.68:1;s.boosting=!!input.boost;
  s.vel.add(f.mulScalar((input.thrust||0)*cfg.acceleration*turbo*dt));
  s.vel.add(r.mulScalar((input.strafe||0)*cfg.acceleration*.57*dt));
  s.vel.add(u.mulScalar((input.vertical||0)*cfg.acceleration*.57*dt));
  if(input.brake)s.vel.mulScalar(Math.max(0,1-dt*2.55));
  if(input.primary)this.shoot(s,'laser');if(input.secondary)this.shoot(s,'missile');
  if(s.vel.length()>cfg.maxSpeed){s.vel.mulScalar(cfg.maxSpeed/s.vel.length())}
 }
 moveShips(dt,inputs){
  for(const s of this.ships){if(s.hp<=0)continue;
   s.laserCD=Math.max(0,s.laserCD-dt);s.missileCD=Math.max(0,s.missileCD-dt);s.shotFlash=Math.max(0,s.shotFlash-dt);s.impactCooldown=Math.max(0,s.impactCooldown-dt);s.heatParticleCooldown=Math.max(0,s.heatParticleCooldown-dt);
   const before=s.position.clone();
   if(s.human)this.steerHuman(s,dt,inputs[s.id]||{});else this.steerBot(s,dt);
   s.vel.mulScalar(Math.exp(-dt*.012));
   s.position.add(s.vel.clone().mulScalar(dt));
   for(const b of this.universe.worlds.values()){
    if(!b.alive)continue;
    const bodyRadius=b.radius+s.settings.radius*.68;
    if(segmentSphere(before,s.position,b.position,bodyRadius)===null)continue;
    const n=s.position.clone().sub(b.position);if(n.length()<1e-5)n.set(0,1,0);n.normalize();
    s.position.copy(b.position).add(n.clone().mulScalar(bodyRadius+.04));
    const approach=Math.max(0,-s.vel.dot(n));
    this.hurtShip(s,b.group==='star'?999:16+approach*5,null,b.group==='star'?'solar impact':'planetary collision');
    s.vel.sub(n.clone().mulScalar(Math.min(0,s.vel.dot(n))*1.6)).mulScalar(.45);
    break;
   }
   for(const d of this.universe.debris){const dlt=s.position.clone().sub(d.pos),distance=dlt.length(),r=s.settings.radius*.68+d.radius;
    if(distance>r||distance<1e-4)continue;const n=dlt.normalize(),relative=s.vel.clone().sub(d.vel),closing=-relative.dot(n);
    if(closing>0.6){const impulse=n.clone().mulScalar(closing*.5);s.vel.add(impulse);d.vel.sub(impulse.clone().mulScalar(.65));this.hurtShip(s,Math.min(48,4+closing*2),null,'rubble collision')}
    s.position.copy(d.pos).add(n.mulScalar(r+.035));
   }
   for(const a of this.universe.asteroids){if(!a.alive)continue;const dist=s.position.distance(a.position);if(dist>=s.settings.radius*.7+a.radius)continue;
    const n=s.position.clone().sub(a.position).normalize(),rel=-s.vel.dot(n);this.hurtShip(s,Math.min(45,5+Math.max(0,rel)*2),null,'asteroid collision');s.position.copy(a.position).add(n.clone().mulScalar(s.settings.radius*.7+a.radius+.02));s.vel.add(n.mulScalar(Math.max(3,rel*1.35)));a.hp-=Math.max(2,rel*3);if(a.hp<=0)this.universe.destroyAsteroid(a,s.id);
   }
   const sun=this.universe.get('sun');const hot=s.position.distance(sun.position)-sun.radius;if(hot<13)this.hurtShip(s,(13-hot)*dt*4,null,'solar heat');
   s.model.root.setPosition(s.position);s.model.root.setRotation(s.rotation);
   for(const flame of s.model.thrusts){const scale=s.boosting?.55:.35;flame.setLocalScale(.15,scale,.15)}
  }
  // Ship-to-ship collision.
  for(let i=0;i<this.ships.length;i++)for(let j=i+1;j<this.ships.length;j++){
   const a=this.ships[i],b=this.ships[j];if(a.hp<=0||b.hp<=0)continue;
   const d=a.position.clone().sub(b.position),m=d.length(),r=a.settings.radius+b.settings.radius;
   if(m>=r||m<1e-5)continue;const n=d.normalize();const va=a.vel.dot(n),vb=b.vel.dot(n),imp=Math.max(0,(vb-va)*.8);
   a.position.add(n.clone().mulScalar((r-m)*.52));b.position.sub(n.clone().mulScalar((r-m)*.52));a.vel.add(n.clone().mulScalar(imp));b.vel.sub(n.clone().mulScalar(imp));
   if(imp>2){this.hurtShip(a,imp*3,b.id,'vessel collision');this.hurtShip(b,imp*3,a.id,'vessel collision')}
  }
 }
 moveProjectiles(dt){for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i];p.age+=dt;p.life-=dt;const last=p.position.clone();
   if(p.type==='missile'&&p.target){const ti=this.targetInfo(p.target);if(ti){const dir=ti.position.clone().sub(p.position).normalize();p.velocity.lerp(p.velocity,dir.mulScalar(Math.max(32,p.velocity.length())),clamp(dt*2.5,0,1))}}
   p.position.add(p.velocity.clone().mulScalar(dt));p.entity.setPosition(p.position);
   if(p.type==='missile')p.entity.lookAt(p.position.clone().add(p.velocity));
   const hit=this.hitProjectile(p,last);
   if(hit||p.life<=0){p.entity.destroy();this.projectiles.splice(i,1)}
  }}
 updateCamera(s,dt){const cam=s.camera;if(!cam)return;
  const up=local(s.rotation,UP),forward=local(s.rotation,FWD);
  const desired=s.position.clone().sub(forward.clone().mulScalar(s.klass==='dreadnought'?7.7:5.9)).add(up.clone().mulScalar(s.klass==='dreadnought'?2.9:2.35));
  const blend=1-Math.exp(-dt*7);const current=cam.getPosition().clone();cam.setPosition(current.clone().lerp(current,desired,blend));
  cam.lookAt(s.position.clone().add(forward.clone().mulScalar(7)));
  cam.camera.fov+=( (s.boosting?77:70)-cam.camera.fov)*blend;
 }
 update(dt,inputs){if(this.over||this.paused)return;dt=clamp(dt,0,.04);this.elapsed+=dt;this.frameCount++;
  this.moveShips(dt,inputs);this.moveProjectiles(dt);this.universe.update(dt);
  for(const s of this.ships)if(s.human)this.updateCamera(s,dt);
  if(this.frameCount%2===0){const winner=findWinner(this.ships);if(winner&&!this.over){this.over=true;this.callback('winner',winner)}}
 }
 getShipStatus(s){const target=this.targetInfo(s.target);return {id:s.id,name:s.name,klass:s.klass,hp:s.hp,hpMax:s.settings.hp,shield:s.shields,shieldMax:s.settings.shields,speed:s.vel.length(),laserCD:s.laserCD,missileCD:s.missileCD,target:target?.name||'NO LOCK',targetHp:target?.hp,targetHpMax:target?.maxHp,mode:s.lockMode,kills:s.kills,damage:s.damage,team:s.team,alive:s.hp>0};}
}
