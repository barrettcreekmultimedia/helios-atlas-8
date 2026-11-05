
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const midi=n=>440*Math.pow(2,(n-69)/12);

function makeNoiseBuffer(ctx){
 const length=ctx.sampleRate*1.5;
 const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
 const data=buffer.getChannelData(0);
 for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length*.2);
 return buffer;
}

export function createSpaceScore(){
 let ctx=null, master=null, musicBus=null, padBus=null, pulseBus=null, arpBus=null, fxBus=null, duckGain=null;
 let noiseBuffer=null, raf=0, started=false, enabled=true, nextTime=0, step=0;
 let intensity=0, targetIntensity=0, voiceDuckTarget=1;
 const bpm=84, beat=60/bpm, scheduleAhead=1.0;
 const progression=[50,45,47,42,43,38]; // Dm, Am, B♭, F, Gm, Dm
 const minorChord=[0,3,7,10,14];
 const leadPattern=[0,7,10,12,14,10,7,3];

 function ensure(){
  if(ctx) return;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return;
  ctx=new AC();
  master=ctx.createGain(); master.gain.value=.0001; master.connect(ctx.destination);
  duckGain=ctx.createGain(); duckGain.gain.value=1; duckGain.connect(master);
  musicBus=ctx.createGain(); musicBus.gain.value=.32; musicBus.connect(duckGain);
  padBus=ctx.createGain(); padBus.gain.value=.72; padBus.connect(musicBus);
  pulseBus=ctx.createGain(); pulseBus.gain.value=.64; pulseBus.connect(musicBus);
  arpBus=ctx.createGain(); arpBus.gain.value=.56; arpBus.connect(musicBus);
  fxBus=ctx.createGain(); fxBus.gain.value=.52; fxBus.connect(musicBus);
  noiseBuffer=makeNoiseBuffer(ctx);
 }
 function env(g,start,dur,peak=.1,attack=.03,release=.35){
  g.gain.cancelScheduledValues(start);
  g.gain.setValueAtTime(0.0001,start);
  g.gain.linearRampToValueAtTime(peak,start+attack);
  g.gain.setTargetAtTime(0.0001,start+Math.max(attack,dur-release),release/3);
 }
 function note(freq,start,dur,{type='sawtooth',gain=.03,bus=padBus,detune=0,filter=1400,pan=0}={}){
  if(!ctx) return;
  const osc=ctx.createOscillator(), osc2=ctx.createOscillator();
  const g=ctx.createGain(), f=ctx.createBiquadFilter(), p=ctx.createStereoPanner();
  osc.type=type; osc2.type=type;
  osc.frequency.setValueAtTime(freq,start); osc2.frequency.setValueAtTime(freq*1.0025,start);
  osc.detune.value=detune; osc2.detune.value=-detune*.6;
  f.type='lowpass'; f.frequency.setValueAtTime(filter,start); f.Q.value=.8;
  p.pan.setValueAtTime(pan,start);
  osc.connect(g); osc2.connect(g); g.connect(f); f.connect(p); p.connect(bus);
  env(g,start,dur,gain,Math.min(.2,dur*.2),Math.min(1.1,dur*.35));
  osc.start(start); osc2.start(start);
  osc.stop(start+dur+.8); osc2.stop(start+dur+.8);
 }
 function swell(start,dur,amount=.18){
  if(!ctx || !noiseBuffer) return;
  const src=ctx.createBufferSource(); src.buffer=noiseBuffer;
  const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.setValueAtTime(220,start); bp.frequency.linearRampToValueAtTime(2600,start+dur);
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=180;
  const g=ctx.createGain(); const p=ctx.createStereoPanner(); p.pan.value=(Math.random()*2-1)*.2;
  src.playbackRate.setValueAtTime(.72,start); src.playbackRate.linearRampToValueAtTime(1.16,start+dur);
  src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(p); p.connect(fxBus);
  g.gain.setValueAtTime(.0001,start); g.gain.linearRampToValueAtTime(amount,start+dur*.35); g.gain.linearRampToValueAtTime(.0001,start+dur);
  src.start(start); src.stop(start+dur+.1);
 }
 function hit(start,root){
  const freq=midi(root-24);
  note(freq,start,.6,{type:'sine',gain:.06+intensity*.05,bus:pulseBus,filter:180});
  swell(start,.42,.035+intensity*.03);
 }
 function choirPad(start,root,dur){
  minorChord.forEach((interval,i)=>{
   const freq=midi(root+interval);
   note(freq,start,dur,{type:'sawtooth',gain:(.015+(i==0?.02:0))*(1+intensity*.35),filter:900+intensity*1300,pan:(i-2)*.09});
   note(freq*.5,start,dur,{type:'triangle',gain:.012*(1+intensity*.25),filter:700,pan:(2-i)*.07,bus:padBus});
  });
 }
 function ostinato(start,root){
  const base=root+12;
  for(let i=0;i<8;i++){
    const t=start+i*beat*.5;
    const n=leadPattern[(step+i)%leadPattern.length];
    note(midi(base+n),t,beat*.46,{type:'triangle',gain:.012+.028*intensity,bus:arpBus,filter:1200+intensity*2200,pan:Math.sin((step+i)*.9)*.16});
  }
 }
 function brassStab(start,root){
  [0,7,10].forEach((interval,i)=>note(midi(root+interval),start,beat*1.2,{type:'square',gain:.016+.028*intensity,bus:fxBus,filter:700+intensity*700,pan:(i-1)*.12}));
 }
 function scheduleBlock(){
  if(!ctx) return;
  while(nextTime < ctx.currentTime + scheduleAhead){
    const root=progression[Math.floor(step/8)%progression.length];
    if(step%8===0){
      choirPad(nextTime,root,beat*8);
      if(intensity>.28) brassStab(nextTime,root+12);
      if(intensity>.45) swell(nextTime,beat*3,.06+.07*intensity);
    }
    hit(nextTime,root);
    if(intensity>.12) ostinato(nextTime,root);
    if(intensity>.7 && step%4===2) brassStab(nextTime+beat*.25,root+7);
    nextTime += beat;
    step++;
  }
 }
 function loop(){
  if(!ctx) return;
  intensity += (targetIntensity-intensity)*.08;
  const masterTarget=(enabled && started)?0.82:0.0001;
  master.gain.value += (masterTarget-master.gain.value)*.06;
  duckGain.gain.value += (voiceDuckTarget-duckGain.gain.value)*.08;
  if(enabled && started) scheduleBlock();
  raf=requestAnimationFrame(loop);
 }
 function start(){
  ensure(); if(!ctx) return;
  ctx.resume?.(); started=true; if(!nextTime) nextTime=ctx.currentTime+.08; if(!raf) raf=requestAnimationFrame(loop);
 }
 function stop(){ started=false; targetIntensity=0; voiceDuckTarget=1; if(ctx) ctx.suspend?.(); }
 function setEnabled(value){ enabled=!!value; if(enabled) start(); }
 function setTravel(value){ targetIntensity=clamp(.18+value*.9,0,.98); }
 function setNarration(active){ voiceDuckTarget=active?.54:1; }
 return {start,stop,setEnabled,setTravel,setNarration,get enabled(){return enabled}};
 }
