import * as pc from 'playcanvas';
import {lcg} from './rules.js';
const rnd=lcg(12771);
export const c=(hex)=>{const s=hex.replace('#','');return new pc.Color(...[0,2,4].map(i=>parseInt(s.slice(i,i+2),16)/255));};
export function material(hex,glow=0){const m=new pc.StandardMaterial();m.diffuse=c(hex);m.metalness=glow?0:.38;m.gloss=.73;if(glow){m.useLighting=false;m.emissive=c(hex);m.emissiveIntensity=glow;}m.update();return m;}
export function add(parent,name,type,at,scale,mat,rotate){const e=new pc.Entity(name);e.addComponent('render',{type,material:mat});e.setLocalPosition(...at);e.setLocalScale(...scale);if(rotate)e.setLocalEulerAngles(...rotate);parent.addChild(e);return e;}
export function hullTexture(app,primary,accent){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const x=canvas.getContext('2d');
 const grad=x.createLinearGradient(0,0,512,512);grad.addColorStop(0,'#344757');grad.addColorStop(.48,primary);grad.addColorStop(1,'#091421');x.fillStyle=grad;x.fillRect(0,0,512,512);
 x.strokeStyle='#98adbb';x.lineWidth=2;x.globalAlpha=.38;
 for(let i=10;i<512;i+=56){x.beginPath();x.moveTo(i,0);x.lineTo(i,512);x.stroke()}
 for(let i=18;i<512;i+=48){x.beginPath();x.moveTo(0,i);x.lineTo(512,i);x.stroke()}
 x.globalAlpha=.3;x.strokeStyle='#d9eaf5';for(let i=0;i<28;i++){x.strokeRect((i%7)*73+7,Math.floor(i/7)*120+25,34+(i%3)*8,26)}
 x.globalAlpha=.65;x.fillStyle=accent;for(const k of [84,266,435])x.fillRect(168,k,176,6);
 const tex=new pc.Texture(app.graphicsDevice,{format:pc.PIXELFORMAT_RGBA8,mipmaps:true,minFilter:pc.FILTER_LINEAR_MIPMAP_LINEAR,magFilter:pc.FILTER_LINEAR});tex.setSource(canvas);return tex;
}
export function buildShip(app,id,klass,color){
 const root=new pc.Entity(`Vessel ${id}`);app.root.addChild(root);
 const tex=hullTexture(app,klass==='dreadnought'?'#273342':klass==='interceptor'?'#244455':'#4b4040',color);
 const hull=material('#b5c6d4'),armour=material(klass==='fighter'?'#b7a7a0':'#889fb0'),black=material('#08111d'),trim=material('#dce7ec'),engine=material(color,2.4),lights=material('#b5eaff',1.9);
 hull.diffuseMap=tex;hull.update();armour.diffuseMap=tex;armour.update();
 const wide=klass==='dreadnought'?1.35:klass==='interceptor'?.78:1;
 const length=klass==='interceptor'?1.2:klass==='dreadnought'?1.45:1;
 add(root,'Armored spine','box',[0,0,0],[.76*wide,.38,2.65*length],hull);
 add(root,'Nose wedge','box',[0,.01,-1.32*length],[.69,.27,1.15*length],armour,[9,0,0]);
 add(root,'Canopy','sphere',[0,.22,-.79*length],[.48,.24,.78],black);
 add(root,'Canopy sheen','sphere',[0,.29,-.82*length],[.34,.11,.58],lights);
 add(root,'Radar tip','cone',[0,0,-2.0*length],[.12,.6,.12],trim,[90,0,0]);
 for(const s of [-1,1]){
  const sw=s*wide;
  add(root,'Swept main wing','box',[sw*.93,-.07,.29],[1.55*wide,.11,1.34*length],armour,[0,s*17,s*5]);
  add(root,'Wingtip leading-edge','box',[sw*1.78,.01,-.14],[.16,.11,.9*length],trim,[0,s*17,0]);
  add(root,'Engine nacelle','cylinder',[sw*1.2,-.14,1.04],[.26,.9,.26],hull,[90,0,0]);
  add(root,'Engine core','cylinder',[sw*1.2,-.14,1.47],[.2,.22,.2],engine,[90,0,0]);
  add(root,'Aft stabilizer','box',[sw*.41,.32,.9],[.12,.62,.74],armour,[0,0,s*18]);
  add(root,'Wing marker','box',[sw*1.23,.01,-.08],[.06,.04,.54],engine);
 }
 if(klass==='dreadnought'){
  add(root,'Fortified upper deck','box',[0,.40,.45],[1.4,.34,1.55],armour);
  add(root,'Upper turret housing','sphere',[0,.71,-.32],[.52,.29,.63],black);
  for(const s of [-1,1])add(root,'Forward rail cannon','cylinder',[s*.38,.45,-1.16],[.07,1.08,.07],trim,[90,0,0]);
 }else if(klass==='interceptor'){
  add(root,'Sharp ventral keel','box',[0,-.30,.28],[.14,.52,1.65],armour);
 }else add(root,'Central dorsal fin','box',[0,.42,.93],[.14,.65,.8],armour);
 const thrusts=[];for(const s of [-1,0,1])thrusts.push(add(root,'Glowing thruster','cone',[s*1.2*wide,-.14,1.69],[.15,.38,.15],engine,[90,0,0]));
 const scales={interceptor:.24,fighter:.34,dreadnought:.42};const size=scales[klass];root.setLocalScale(size,size,size);
 root.enabled=true;
 return {root,thrusts,size};
}
export function makeFragmentMesh(device){
 const v=[[0,1.13,0],[.99,.18,.22],[.42,.15,.92],[-.59,.17,.80],[-1,.05,-.26],[-.13,.12,-.97],[.28,-.96,.20]];
 const faces=[[0,1,2],[0,2,3],[0,3,4],[0,4,5],[0,5,1],[6,2,1],[6,3,2],[6,4,3],[6,5,4],[6,1,5]];
 const p=[],n=[],uv=[];
 for(let i=0;i<v.length;i++){const [x,y,z]=v[i],rr=Math.sqrt(x*x+y*y+z*z)||1;p.push(x,y,z);n.push(x/rr,y/rr,z/rr);uv.push(.5+Math.atan2(z,x)/(2*Math.PI),.5+Math.asin(y/rr)/Math.PI)}
 const m=new pc.Mesh(device);m.setPositions(p);m.setNormals(n);m.setUvs(0,uv);m.setIndices(faces.flat());m.update();return m;
}
export function fragment(app,mesh,material,name){const ent=new pc.Entity(name);ent.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material,ent)]});app.root.addChild(ent);return ent;}
export function randBetween(lo,hi){return lo+(hi-lo)*rnd()}
