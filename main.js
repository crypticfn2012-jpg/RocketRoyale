import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const $ = (s) => document.querySelector(s);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const damp = (a, b, rate, dt) => THREE.MathUtils.lerp(a, b, 1 - Math.exp(-rate * dt));
const CONFIG = { arenaX:42, arenaZ:26, goalHalf:8, carRadius:1.35, ballRadius:1.35, gravity:24, acceleration:34, reverse:22, coastDrag:1.15, brakeDrag:7.5, sideGrip:13, driftGrip:2.6, turnLow:2.25, turnHigh:.72, boostAcceleration:39, maxSpeed:30, boostSpeed:39, jumpVelocity:8.9, dodgeVelocity:11.2, airTurn:1.9, matchTime:300 };
const stored = (() => { try { return JSON.parse(localStorage.getItem('rocketroyal.settings')) || {}; } catch { return {}; } })();
const settings = { paint: '#1688ee', camDist: 8.8, camHeight: 3.6, ballCam: true, ...stored };
function persist() { const value=JSON.stringify(settings);try{localStorage.setItem('rocketroyal.settings',value);}catch{}try{if(crazy?.ready)window.CrazyGames.SDK.data?.setItem('rocketroyal.settings',value);}catch{} }
const PAINTS=['azure','crimson','lime','violet','carbon','pearl','sunset','aqua','rose','gold','mint','coral','indigo','sand','slate','electric'];
const PAINT_COLORS=['#1688ee','#e85340','#54d46d','#a75de2','#171b24','#edf4ff','#ef7425','#35d8d0','#f45f9c','#e9b93d','#66e4b1','#ff8262','#5c62e8','#d0a465','#6b7c99','#72b6ff'];
const BOOSTS=['blue plasma','orange plasma','mint plasma','violet plasma','rose plasma','gold plasma','white plasma','lime plasma'];
const BOOST_COLORS=['#20aaff','#ff6828','#55f1c6','#b55bff','#ff5e9e','#ffd14e','#eaf7ff','#99ef40'];
const TOPPERS=['none','crown','halo','orb','cone','star'];
const profileDefaults={credits:3200,rating:1000,wins:0,losses:0,gameSeconds:0,nextPlayReward:300,lastDaily:'',dailyStreak:0,ownedPaints:['azure'],ownedBoosts:['blue plasma'],ownedToppers:['none'],paint:'azure',boost:'blue plasma',topper:'none'};
let profile=(()=>{try{return{...profileDefaults,...JSON.parse(localStorage.getItem('rocketroyal.profile')||'{}')}}catch{return{...profileDefaults}}})();
function saveProfile(){const value=JSON.stringify(profile);try{localStorage.setItem('rocketroyal.profile',value)}catch{}try{if(crazy?.ready)window.CrazyGames.SDK.data?.setItem('rocketroyal.profile',value)}catch{}updateProfileBar();}
function rankName(){const r=profile.rating;return r>=1450?'CHAMPION':r>=1250?'DIAMOND':r>=1100?'PLATINUM':r>=950?'GOLD':r>=800?'SILVER':'BRONZE';}
function updateProfileBar(){const bar=$('#profileBar');if(bar)bar.innerHTML=`<span>RANK <b>${rankName()} ${profile.rating}</b></span><span>◈ <b>${profile.credits}</b></span><span>${profile.wins}W · ${profile.losses}L</span>`;}
function paintColour(){return PAINT_COLORS[PAINTS.indexOf(profile.paint)]||settings.paint;}
function boostColour(){return BOOST_COLORS[BOOSTS.indexOf(profile.boost)]||'#20aaff';}
function awardCredits(amount,message=''){profile.credits+=amount;saveProfile();if(message){announcement=message;setTimeout(()=>{if(state==='play')announcement='';},1300);}}
updateProfileBar();
// CrazyGames SDK v3: optional locally, active automatically when published on CrazyGames.
const crazy={ready:false,playing:false,user:null,adActive:false};
function updateAccountButton(){const button=$('#accountButton');if(!button)return;button.hidden=!crazy.ready;if(crazy.user){button.textContent=`${crazy.user.username}`;button.classList.add('signedIn');}else{button.textContent='LOGIN WITH CRAZYGAMES';button.classList.remove('signedIn');}}
async function loadCrazyProfile(){try{const sdk=window.CrazyGames.SDK;if(!sdk.user.isUserAccountAvailable){updateAccountButton();return;}crazy.user=await sdk.user.getUser();const cloudSettings=sdk.data?.getItem('rocketroyal.settings'),cloudProfile=sdk.data?.getItem('rocketroyal.profile');if(cloudSettings)Object.assign(settings,JSON.parse(cloudSettings));else persist();if(cloudProfile)profile={...profileDefaults,...JSON.parse(cloudProfile)};else saveProfile();applyCarCosmetics?.(player);updateProfileBar();updateAccountButton();}catch(error){console.info('CrazyGames account not available.',error);updateAccountButton();}}
async function initCrazyGames(){
  // Never access SDK modules before init: the v3 SDK deliberately throws when that happens.
  try{
    const sdk=window.CrazyGames?.SDK;if(!sdk)return;
    await sdk.init();crazy.ready=true;
    // SDK modules are legal only after init. These calls are optional locally and track the first usable frame on CrazyGames.
    await sdk.game.loadingStart?.();
    await sdk.game.loadingStop?.();
    await loadCrazyProfile();
    if(!['menu','paused','end'].includes(state))crazyGameplay(true);
  }catch(error){console.info('CrazyGames SDK is inactive on this development host.',error);}
}
async function crazyGameplay(active){
  if(!crazy.ready||crazy.playing===active)return;crazy.playing=active;
  try{await window.CrazyGames.SDK.game[active?'gameplayStart':'gameplayStop']?.();}catch(error){console.info('CrazyGames gameplay event skipped.',error);}
}
async function crazyLogin(){if(!crazy.ready)return;try{crazy.user=await window.CrazyGames.SDK.user.showAuthPrompt();await loadCrazyProfile();}catch(error){if(error?.code!=='userCancelled')console.info('CrazyGames login did not complete.',error);}}
function requestMidgameAd(){
  if(!crazy.ready||crazy.adActive)return;crazy.adActive=true;
  const resume=()=>{crazy.adActive=false;};
  try{window.CrazyGames.SDK.ad.requestAd('midgame',{adStarted:()=>{crazyGameplay(false);},adFinished:resume,adError:resume});}catch(error){resume();console.info('CrazyGames ad unavailable.',error);}
}
initCrazyGames();

const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x061225); scene.fog = new THREE.FogExp2(0x071426, .010);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, .1, 260);
const clock = new THREE.Clock(); const arena = new THREE.Group(); scene.add(arena);
scene.add(new THREE.HemisphereLight(0xa8d8ff, 0x071020, 2.4));
const key = new THREE.DirectionalLight(0xffe8cb, 4.0); key.position.set(-25, 42, 16); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = key.shadow.camera.bottom = -55; key.shadow.camera.right = key.shadow.camera.top = 55; scene.add(key);

const mat = {
  turf: new THREE.MeshStandardMaterial({ color: 0x165b53, roughness: .88 }), darkTurf: new THREE.MeshStandardMaterial({ color: 0x103f3c, roughness: .92 }),
  rail: new THREE.MeshStandardMaterial({ color: 0x111b2a, metalness: .75, roughness: .25 }), glass: new THREE.MeshStandardMaterial({ color: 0x3e80a2, transparent: true, opacity: .22, metalness: .5, roughness: .1, side: THREE.DoubleSide }),
  blue: new THREE.MeshStandardMaterial({ color: 0x087fea, emissive: 0x034784, emissiveIntensity: 1.6, metalness: .35, roughness: .3 }), orange: new THREE.MeshStandardMaterial({ color: 0xf17817, emissive: 0x713000, emissiveIntensity: 1.8, metalness: .25, roughness: .3 }),
  white: new THREE.MeshStandardMaterial({ color: 0xd9f4ff, emissive: 0x23475c, emissiveIntensity: .25, roughness: .55 }), crowd: new THREE.MeshStandardMaterial({ color: 0x4b7194, emissive: 0x0b172d, emissiveIntensity: .6 })
};
function mesh(geo, material, x=0, y=0, z=0, group=arena) { const m = new THREE.Mesh(geo, material); m.position.set(x,y,z); m.castShadow = m.receiveShadow = true; group.add(m); return m; }
function box(x,y,z,w,h,d,material=mat.rail) { return mesh(new THREE.BoxGeometry(w,h,d), material, x,y,z); }
function line(points, color=0xffffff, opacity=.65) { const m = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent:true, opacity })); arena.add(m); return m; }

// A complete enclosed stadium designed from the supplied Rocket League reference shots.
box(0,-.30,0,90,.6,58,mat.turf);
for (let i=-4;i<=4;i++) box(i*10, .015, 0, 5, .025, 52, i%2 ? mat.darkTurf : mat.turf);
const marking = new THREE.MeshBasicMaterial({ color:0xc4f4e9, transparent:true, opacity:.68 });
const centre = new THREE.Mesh(new THREE.RingGeometry(6.2,6.48,64), marking); centre.rotation.x=-Math.PI/2; centre.position.y=.04; arena.add(centre);
box(0,.04,0,.15,.028,51,marking);
for (const x of [-30,30]) { const circle = new THREE.Mesh(new THREE.RingGeometry(3.2,3.37,48), marking); circle.rotation.x=-Math.PI/2; circle.position.set(x,.04,0); arena.add(circle); }
for (const z of [-25.4,25.4]) { const bank = box(0,1.25,z,84,2.5,2.5,mat.rail); bank.rotation.x = z<0 ? -.34 : .34; }
for (const x of [-41.4,41.4]) { const bank = box(x,1.25,0,2.5,2.5,51,mat.rail); bank.rotation.z = x<0 ? .34 : -.34; }
for (const z of [-27.4,27.4]) { box(0,5.8,z,89,.2,.25,z<0?mat.blue:mat.orange); const g=box(0,8,z,89,4,.08,mat.glass); g.castShadow=false; }
for (const x of [-44.3,44.3]) { box(x,5.8,0,.25,.2,55,x<0?mat.blue:mat.orange); const g=box(x,8,0,.08,4,55,mat.glass); g.castShadow=false; }
function goal(side) { const color=side<0?mat.blue:mat.orange, x=side*42.15, back=side*45.0; box(x,3.1,0,.34,6.2,17.4,color); box(back,2.55,0,.35,5.1,16.8,mat.rail); box((x+back)/2,5.1,0,3, .25,17.1,color); for(let z=-7.5;z<=7.5;z+=1.8)line([new THREE.Vector3(back,.3,z),new THREE.Vector3(back,5,z)],side<0?0x4eaaff:0xffa148,.25); for(let y=.6;y<=4.8;y+=1.4)line([new THREE.Vector3(back,y,-8.2),new THREE.Vector3(back,y,8.2)],side<0?0x4eaaff:0xffa148,.25); } goal(-1);goal(1);
for (const z of [-34,34]) for(let y=0;y<6;y++) { const stand=box(0,5+y*1.35,z,95,1.1,2.2,mat.crowd); stand.rotation.x=z<0?-.22:.22; }
for (const x of [-51,51]) for(let y=0;y<5;y++) { const stand=box(x,5+y*1.35,0,2.2,1.1,55,mat.crowd); stand.rotation.z=x<0?.22:-.22; }
const neon = new THREE.PointLight(0x259dff,35,48,2);neon.position.set(-29,15,0);scene.add(neon);const neon2=neon.clone();neon2.color.set(0xff7426);neon2.position.x=29;scene.add(neon2);

const pads=[];for(const [x,z,large] of [[0,-18,1],[0,18,1],[-20,-16,0],[20,16,0],[-20,16,0],[20,-16,0],[-34,0,0],[34,0,0],[-10,0,0],[10,0,0]]){const pad=mesh(new THREE.CylinderGeometry(large?1.45:.78,large?1.45:.78,.07,28),new THREE.MeshStandardMaterial({color:0xffb20a,emissive:0xff6300,emissiveIntensity:2,roughness:.25}),x,.045,z);pads.push({x,z,large,mesh:pad,ready:true,t:0});}

function fallbackCar(col){const g=new THREE.Group(),body=new THREE.MeshStandardMaterial({color:col,metalness:.65,roughness:.25}),black=new THREE.MeshStandardMaterial({color:0x071018,metalness:.5,roughness:.3});g.userData.rocketroyaleScale=1;g.userData.isFallback=true;mesh(new THREE.BoxGeometry(2.25,.58,3.65),body,0,.58,0,g);const cab=mesh(new THREE.BoxGeometry(1.55,.56,1.55),body,0,1.02,-.22,g);cab.rotation.x=-.12;for(const x of [-1.03,1.03])for(const z of [-1.2,1.2]){const wheel=mesh(new THREE.CylinderGeometry(.42,.42,.34,16),black,x,.42,z,g);wheel.rotation.z=Math.PI/2;}return g;}
function carState(team,isAI=false){const yaw=team==='blue'?Math.PI/2:-Math.PI/2;const m=fallbackCar(team==='blue'?settings.paint:'#ec681b');scene.add(m);return{team,ai:isAI,p:new THREE.Vector3(team==='blue'?-15:15,.7,0),v:new THREE.Vector3(),vy:0,yaw,visualYaw:yaw,pitch:0,roll:0,modelOffset:0,jumps:0,jumpDown:false,ground:true,airTime:0,dodgeTimer:0,model:m,trail:[]};}
const player=carState('blue'),bot=carState('orange',true);bot.model.visible=false;
const ball={p:new THREE.Vector3(0,2.1,0),v:new THREE.Vector3(),r:CONFIG.ballRadius,model:mesh(new THREE.SphereGeometry(CONFIG.ballRadius,32,24),new THREE.MeshStandardMaterial({color:0xe9f7ff,metalness:.65,roughness:.18,emissive:0x142235,emissiveIntensity:.25}),0,2.1,0,scene)};ball.model.castShadow=true;
const fbx=new FBXLoader();async function loadModel(url,fallback,colour,scale){try{const o=await fbx.loadAsync(url);o.userData.rocketroyaleScale=scale;o.traverse(n=>{if(n.isMesh){n.castShadow=n.receiveShadow=true;n.material=new THREE.MeshStandardMaterial({color:colour,metalness:.55,roughness:.28});}});o.scale.setScalar(scale);return o;}catch(err){console.warn('FBX could not load; using fallback model.',err);return fallback;}}
function recolour(root, colour){root.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.set(colour);n.material.metalness=.55;n.material.roughness=.28;n.castShadow=n.receiveShadow=true;}});}
function makeTopper(kind,modelScale=1){if(kind==='none')return null;const scale=Math.max(.001,modelScale),colour=kind==='crown'?0xffd14e:kind==='halo'?0x9ee9ff:kind==='orb'?0xed5bb4:kind==='cone'?0xff7a24:0xb88cff;const material=new THREE.MeshStandardMaterial({color:colour,emissive:colour,emissiveIntensity:.35,metalness:.55,roughness:.25});let geo;if(kind==='crown')geo=new THREE.ConeGeometry(.34/scale,.48/scale,5);else if(kind==='halo')geo=new THREE.TorusGeometry(.34/scale,.055/scale,8,24);else if(kind==='orb')geo=new THREE.SphereGeometry(.22/scale,16,12);else if(kind==='cone')geo=new THREE.ConeGeometry(.29/scale,.52/scale,16);else geo=new THREE.OctahedronGeometry(.3/scale);const topper=new THREE.Mesh(geo,material);topper.position.set(0,1.46/scale,0);if(kind==='halo')topper.rotation.x=Math.PI/2;topper.castShadow=true;return topper;}
function applyCarCosmetics(car){if(!car?.model)return;const colour=car===player?paintColour():'#ec681b';car.model.traverse(n=>{if(n.isMesh&&n!==car.model.userData.topper){n.material.color?.set(colour);n.material.metalness=profile.paint==='carbon'?.9:.55;n.material.roughness=profile.paint==='pearl'?.12:.28;}});if(car===player){const old=car.model.userData.topper;if(old){car.model.remove(old);old.geometry.dispose();old.material.dispose();}const topper=makeTopper(profile.topper,car.model.userData.rocketroyaleScale||1);if(topper){car.model.add(topper);car.model.userData.topper=topper;}else delete car.model.userData.topper;}}
applyCarCosmetics(player);
Promise.all([loadModel('./assets/car/Car.fbx',player.model,settings.paint,.015),loadModel('./assets/ball/rocket-ball.fbx',ball.model,0xf6f8ff,.012)]).then(([loadedCar,loadedBall])=>{if(loadedCar!==player.model){scene.remove(player.model);player.model=loadedCar;player.modelOffset=-Math.PI/2;scene.add(loadedCar);const botCar=loadedCar.clone(true);recolour(botCar,'#ec681b');botCar.visible=isMatch()&&state!=='menu';scene.remove(bot.model);bot.model=botCar;bot.modelOffset=-Math.PI/2;scene.add(botCar);applyCarCosmetics(player);}if(loadedBall!==ball.model){scene.remove(ball.model);ball.model=loadedBall;scene.add(loadedBall);}});

const keys={},touch={throttle:false,reverse:false,left:false,right:false,boost:false,drift:false,jump:false};
function clearKeys(){for(const k of Object.keys(keys))delete keys[k];for(const k of Object.keys(touch))touch[k]=false;}
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyC'){settings.ballCam=!settings.ballCam;persist();}if(e.code==='KeyR')resetCar(player);if(e.code==='Escape')togglePause();});addEventListener('keyup',e=>keys[e.code]=false);addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys();});
addEventListener('wheel',e=>e.preventDefault(),{passive:false});
for(const button of document.querySelectorAll('[data-touch]')){const input=button.dataset.touch;const start=e=>{e.preventDefault();touch[input]=true;button.setPointerCapture?.(e.pointerId);};const stop=e=>{e.preventDefault();touch[input]=false;};button.addEventListener('pointerdown',start);button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('pointerleave',e=>{if(e.buttons===0)stop(e);});}
function gamepadInput(){const pad=navigator.getGamepads?.().find(Boolean);if(!pad)return{throttle:0,turn:0,boost:false,drift:false,jump:false};const dead=n=>Math.abs(n)<.14?0:n;const turn=dead(pad.axes[0]||0),throttle=dead(-(pad.axes[1]||0));return{throttle,turn,boost:!!(pad.buttons[7]?.pressed||pad.buttons[5]?.pressed),drift:!!(pad.buttons[6]?.pressed||pad.buttons[4]?.pressed),jump:!!pad.buttons[0]?.pressed};}
let state='menu',resumeState='play',gameMode='ranked',scores=[0,0],matchTime=CONFIG.matchTime,countdown=0,announcement='',accumulator=0,goalLock=false,progressTimer=0;
function resetCar(c){c.p.set(c.team==='blue'?-15:15,.72,0);c.v.set(0,0,0);c.vy=0;c.yaw=c.team==='blue'?Math.PI/2:-Math.PI/2;c.visualYaw=c.yaw;c.pitch=c.roll=0;c.jumps=0;c.ground=true;c.airTime=0;c.dodgeTimer=0;c.boost=100;}
function kickoff(seconds=3){resetCar(player);resetCar(bot);ball.p.set(0,2.25,0);ball.v.set(0,0,0);countdown=seconds;announcement=String(Math.ceil(seconds));goalLock=false;state='kickoff';}
function isMatch(){return gameMode!=='free';}
function begin(mode){gameMode=mode;bot.model.visible=isMatch();scores=[0,0];matchTime=isMatch()?CONFIG.matchTime:0;$('#menu').classList.add('hidden');$('#hud').classList.remove('hidden');kickoff(3);crazyGameplay(true);}
function controls(c){
  if(!c.ai){const pad=gamepadInput();const throttle=clamp((keys.KeyW||touch.throttle?1:0)-(keys.KeyS||touch.reverse?1:0)+pad.throttle,-1,1),turn=clamp((keys.KeyA||touch.left?1:0)-(keys.KeyD||touch.right?1:0)-pad.turn,-1,1);return{throttle,turn,boost:!!(keys.ShiftLeft||touch.boost||pad.boost),drift:!!(keys.ControlLeft||touch.drift||pad.drift),jump:!!(keys.Space||touch.jump||pad.jump),pitch:throttle,roll:turn};}
  // Predict the ball, choose defense when it travels toward the orange goal, otherwise take a shooting approach from behind it.
  const predicted=ball.p.clone().addScaledVector(ball.v,.42);const danger=predicted.x>10||ball.v.x>7;
  const target=danger?new THREE.Vector3(28,0,clamp(predicted.z*.75,-7,7)):new THREE.Vector3(predicted.x+4.8,0,clamp(predicted.z,-18,18));
  const delta=target.sub(c.p);const distance=delta.length();const desiredYaw=Math.atan2(delta.x,delta.z);const angle=Math.atan2(Math.sin(desiredYaw-c.yaw),Math.cos(desiredYaw-c.yaw));
  const facing=Math.abs(angle)<.42,closeToBall=c.p.distanceTo(ball.p)<5.7;return{throttle:Math.abs(angle)>1.7?-.55:1,turn:clamp(angle*2.7,-1,1),boost:facing&&distance>13&&c.boost>15,drift:Math.abs(angle)>1.0&&distance>4,jump:closeToBall&&ball.p.y>2.2,pitch:0,roll:0};
}
function updateCar(c,dt){
  const q=controls(c); let forward=new THREE.Vector3(Math.sin(c.yaw),0,Math.cos(c.yaw)); let right=new THREE.Vector3(Math.cos(c.yaw),0,-Math.sin(c.yaw)); let forwardSpeed=c.v.dot(forward), sideSpeed=c.v.dot(right);
  if(c.ground){
    const accelerating=q.throttle>0, braking=q.throttle<0&&forwardSpeed>1;
    if(accelerating)c.v.addScaledVector(forward,CONFIG.acceleration*dt);
    else if(q.throttle<0)c.v.addScaledVector(forward,-CONFIG.reverse*dt);
    const speedRatio=clamp(Math.abs(forwardSpeed)/CONFIG.maxSpeed,0,1);
    const steer=THREE.MathUtils.lerp(CONFIG.turnLow,CONFIG.turnHigh,speedRatio)*(q.drift?1.5:1);
    c.yaw+=q.turn*steer*dt*(.32+speedRatio*.9);
    const grip=q.drift?CONFIG.driftGrip:CONFIG.sideGrip;c.v.addScaledVector(right,-sideSpeed*grip*dt);
    c.v.multiplyScalar(Math.exp(-(braking?CONFIG.brakeDrag:CONFIG.coastDrag)*dt));
    if(q.jump&&!c.jumpDown){c.vy=CONFIG.jumpVelocity;c.ground=false;c.jumps=1;c.airTime=0;}
  } else {
    c.airTime+=dt;c.yaw+=q.turn*CONFIG.airTurn*dt;c.pitch=damp(c.pitch,-q.pitch*.5,7,dt);c.roll=damp(c.roll,q.roll*.45,7,dt);
    // Second press is a directional dodge: it changes velocity, not position.
    if(q.jump&&!c.jumpDown&&c.jumps===1&&c.airTime>.08){const dodgeDir=forward.clone().multiplyScalar(q.pitch||1).addScaledVector(right,q.roll*.7).normalize();c.v.addScaledVector(dodgeDir,CONFIG.dodgeVelocity);c.vy=3.8;c.jumps=2;c.dodgeTimer=.18;}
    c.v.multiplyScalar(Math.exp(-.08*dt));
  }
  c.jumpDown=q.jump;
  if(q.boost&&c.boost>0){forward=new THREE.Vector3(Math.sin(c.yaw),0,Math.cos(c.yaw));c.v.addScaledVector(forward,CONFIG.boostAcceleration*dt);c.boost=Math.max(0,c.boost-25*dt);if(Math.random()<.42)spawnTrail(c);}
  const cap=q.boost?CONFIG.boostSpeed:CONFIG.maxSpeed;if(c.v.length()>cap)c.v.setLength(cap);
  c.vy-=CONFIG.gravity*dt;c.p.addScaledVector(c.v,dt);c.p.y+=c.vy*dt;c.dodgeTimer=Math.max(0,c.dodgeTimer-dt);
  if(c.p.y<.72){c.vy=c.vy<-.8?c.vy*-.14:0;c.p.y=.72;c.ground=true;c.jumps=0;c.airTime=0;c.pitch=damp(c.pitch,0,12,dt);c.roll=damp(c.roll,0,12,dt);}
  const xl=CONFIG.arenaX-1.15,zl=CONFIG.arenaZ-1.15;if(Math.abs(c.p.z)>zl){c.p.z=Math.sign(c.p.z)*zl;c.v.z*=-.32;}if(Math.abs(c.p.x)>xl){if(Math.abs(c.p.z)>CONFIG.goalHalf-1){c.p.x=Math.sign(c.p.x)*xl;c.v.x*=-.32;}else c.p.x=clamp(c.p.x,-45.2,45.2);}
  c.visualYaw=damp(c.visualYaw,c.yaw,20,dt);c.model.position.copy(c.p);c.model.rotation.set(c.pitch,c.visualYaw+c.modelOffset,c.roll,'YXZ');
}
function updateBall(dt){
  ball.v.y-=CONFIG.gravity*dt; ball.p.addScaledVector(ball.v,dt);
  if(ball.p.y<ball.r){ball.p.y=ball.r;ball.v.y=Math.abs(ball.v.y)*.67;ball.v.x*=.991;ball.v.z*=.991;}
  const zl=CONFIG.arenaZ-ball.r;if(Math.abs(ball.p.z)>zl){ball.p.z=Math.sign(ball.p.z)*zl;ball.v.z*=-.72;}
  const xl=CONFIG.arenaX-ball.r;if(Math.abs(ball.p.x)>xl&&Math.abs(ball.p.z)>CONFIG.goalHalf-ball.r){ball.p.x=Math.sign(ball.p.x)*xl;ball.v.x*=-.72;}
  for(const c of [player,bot]){if(c.ai&&!isMatch())continue;const d=ball.p.clone().sub(c.p),dist=d.length(),min=ball.r+CONFIG.carRadius;if(dist<min&&dist>.001){d.normalize();ball.p.addScaledVector(d,min-dist);const hit=Math.max(5,Math.min(26,5+c.v.length()*.72+Math.max(0,c.v.dot(d))*.55));ball.v.addScaledVector(d,hit);ball.v.y+=1.5+Math.max(0,c.vy)*.25;}}
  if(ball.v.length()>46)ball.v.setLength(46);ball.v.multiplyScalar(Math.pow(.9985,dt*60));ball.model.position.copy(ball.p);ball.model.rotation.x+=ball.v.z*dt*.28;ball.model.rotation.z-=ball.v.x*dt*.28;
  if(!goalLock&&Math.abs(ball.p.x)>44.1&&Math.abs(ball.p.z)<CONFIG.goalHalf&&ball.p.y<6.1){goalLock=true;score(ball.p.x<0?1:0);}if(ball.p.y<-5||ball.p.length()>100){ball.p.set(0,2.2,0);ball.v.set(0,0,0);}
}
function spawnTrail(c){const p=mesh(new THREE.SphereGeometry(.12,7,7),new THREE.MeshBasicMaterial({color:c.team==='blue'?boostColour():0xff6828,transparent:true,opacity:.9}),c.p.x,c.p.y,c.p.z,scene);p.userData.life=.42;c.trail.push(p);}
function updateTrails(dt){for(const c of [player,bot])for(let i=c.trail.length-1;i>=0;i--){const p=c.trail[i];p.userData.life-=dt;p.scale.multiplyScalar(1.035);p.material.opacity=Math.max(0,p.userData.life*2);if(p.userData.life<=0){scene.remove(p);p.geometry.dispose();p.material.dispose();c.trail.splice(i,1);}}}
const goalEffects=[];const goalParticleGeometry=new THREE.SphereGeometry(.075,6,5);
function spawnGoalBurst(team){const origin=ball.p.clone(),colour=team===0?0x45c4ff:0xff9145;for(let i=0;i<42;i++){const p=new THREE.Mesh(goalParticleGeometry,new THREE.MeshBasicMaterial({color:colour,transparent:true,opacity:1}));p.position.copy(origin);p.userData.velocity=new THREE.Vector3((Math.random()-.5)*18,Math.random()*13+2,(Math.random()-.5)*18);p.userData.life=.7+Math.random()*.75;p.userData.maxLife=p.userData.life;scene.add(p);goalEffects.push(p);}}
function updateGoalEffects(dt){for(let i=goalEffects.length-1;i>=0;i--){const p=goalEffects[i];p.userData.life-=dt;p.userData.velocity.y-=11*dt;p.position.addScaledVector(p.userData.velocity,dt);p.scale.setScalar(Math.max(.04,p.userData.life/p.userData.maxLife));p.material.opacity=clamp(p.userData.life/p.userData.maxLife,0,1);if(p.userData.life<=0){scene.remove(p);p.material.dispose();goalEffects.splice(i,1);}}}
function resolveCarCollision(){if(!isMatch())return;const delta=bot.p.clone().sub(player.p);delta.y=0;const dist=delta.length(),minDist=CONFIG.carRadius*2;if(dist<minDist&&dist>.001){delta.normalize();const overlap=minDist-dist;player.p.addScaledVector(delta,-overlap*.5);bot.p.addScaledVector(delta,overlap*.5);const closing=player.v.clone().sub(bot.v).dot(delta);if(closing>0){const impulse=closing*.72;player.v.addScaledVector(delta,-impulse);bot.v.addScaledVector(delta,impulse);}player.model.position.copy(player.p);bot.model.position.copy(bot.p);}}
function updatePads(dt){for(const pad of pads){if(!pad.ready){pad.t-=dt;if(pad.t<=0){pad.ready=true;pad.mesh.visible=true;}}for(const c of [player,bot])if(!(c.ai&&!isMatch())&&pad.ready&&(c.p.x-pad.x)**2+(c.p.z-pad.z)**2<(pad.large?3.2:1.8)){c.boost=Math.min(100,c.boost+(pad.large?100:12));pad.ready=false;pad.t=pad.large?10:4;pad.mesh.visible=false;}}}
function score(team){if(state!=='play')return;scores[team]++;spawnGoalBurst(team);announcement=(team?'ORANGE':'BLUE')+' SCORES!';state='goal';setTimeout(()=>{if(state==='goal')kickoff(3);},1650);}
function fixed(dt){
  if(state==='kickoff'){countdown-=dt;announcement=countdown>.15?String(Math.ceil(countdown)):'GO!';if(countdown<=-.55){state='play';announcement='';}}
  if(state==='play'){profile.gameSeconds+=dt;progressTimer+=dt;if(profile.gameSeconds>=profile.nextPlayReward){profile.nextPlayReward+=300;awardCredits(140,'PLAYTIME REWARD +140');}if(progressTimer>=5){progressTimer=0;saveProfile();}}
  if(state==='play'&&isMatch()){matchTime-=dt;if(matchTime<=0){matchTime=0;state='end';announcement=scores[0]===scores[1]?'DRAW!':scores[0]>scores[1]?'BLUE WINS!':'ORANGE WINS!';setTimeout(endScreen,900);}}
  updateCar(player,dt);if(isMatch()){updateCar(bot,dt);resolveCarCollision();}updateBall(dt);updatePads(dt);updateTrails(dt);updateGoalEffects(dt);
}
function updateBallIndicator(){const indicator=$('#ballIndicator');if(!indicator)return;const relative=ball.p.clone().sub(player.p);relative.y=0;const forward=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));const right=new THREE.Vector3(Math.cos(player.yaw),0,-Math.sin(player.yaw));const angle=Math.atan2(relative.dot(right),relative.dot(forward));indicator.style.opacity=relative.length()<4?'0':'1';indicator.querySelector('i').style.transform=`rotate(${angle}rad)`;}
function updateCamera(dt){
  if(state==='menu'){const t=clock.elapsedTime;const menuPos=player.p.clone().add(new THREE.Vector3(-4.4+Math.sin(t*.16)*.35,2.5,5.3));camera.position.lerp(menuPos,1-Math.exp(-dt*2.1));camera.lookAt(player.p.clone().add(new THREE.Vector3(0,1,0)));return;}
  const fwd=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw)),speed=Math.min(player.v.length()/CONFIG.boostSpeed,1);
  // Follow the car itself; the HUD indicator communicates ball direction instead of steering the camera toward it.
  const target=player.p.clone().addScaledVector(fwd,3.4).add(new THREE.Vector3(0,1.05,0));
  const distance=clamp(settings.camDist,7,17)+speed*.8;const desired=player.p.clone().addScaledVector(fwd,-distance).add(new THREE.Vector3(0,clamp(settings.camHeight,2,8)+speed*.35,0));desired.x=clamp(desired.x,-42,42);desired.z=clamp(desired.z,-27,27);camera.position.lerp(desired,1-Math.exp(-dt*11));const cameraTarget=settings.ballCam?ball.p.clone().lerp(target,.24):target;camera.lookAt(cameraTarget);camera.fov=damp(camera.fov,77+speed*5,7,dt);camera.updateProjectionMatrix();
}
function render(){requestAnimationFrame(render);const dt=Math.min(clock.getDelta(),.05);if(!['menu','paused','end'].includes(state)){accumulator+=dt;while(accumulator>=1/120){fixed(1/120);accumulator-=1/120;}}updateCamera(dt);updateBallIndicator();renderer.render(scene,camera);$('#blue').textContent=scores[0];$('#orange').textContent=scores[1];$('#clock').textContent=gameMode==='free'?'FREE':`${Math.floor(matchTime/60)}:${String(Math.ceil(matchTime%60)).padStart(2,'0')}`;$('#boostValue').textContent=Math.round(player.boost||0);$('#cameraMode').textContent=settings.ballCam?'BALL CAM · C':'CAR CAM · C';$('#notice').textContent=announcement;}render();addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

function togglePause(){if(['menu','end','goal'].includes(state))return;if(state==='paused'){state=resumeState;$('#pause').classList.add('hidden');crazyGameplay(true);}else{resumeState=state;state='paused';clearKeys();$('#pause').classList.remove('hidden');crazyGameplay(false);}}function endScreen(){finishRankedMatch();openPanel('end');crazyGameplay(false);requestMidgameAd();}$('#menu').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.action)begin(b.dataset.action);if(b.dataset.panel)openPanel(b.dataset.panel);});$('#accountButton').onclick=crazyLogin;$('#pauseBtn').onclick=togglePause;$('#pause').onclick=e=>{const a=e.target.dataset.action;if(a==='resume')togglePause();if(a==='restart'){togglePause();begin(gameMode);}if(a==='menu'){state='menu';crazyGameplay(false);$('#pause').classList.add('hidden');$('#hud').classList.add('hidden');$('#menu').classList.remove('hidden');}};

const DB='rocketroyal-mods';function getDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('mods',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}async function getMods(){try{const d=await getDB();return await new Promise(resolve=>{const r=d.transaction('mods').objectStore('mods').getAll();r.onsuccess=()=>resolve(r.result);});}catch{return[];}}async function saveMod(mod){const d=await getDB();return new Promise((resolve,reject)=>{const r=d.transaction('mods','readwrite').objectStore('mods').put(mod);r.onsuccess=resolve;r.onerror=reject;});}async function removeMod(id){const d=await getDB();return new Promise(resolve=>{const r=d.transaction('mods','readwrite').objectStore('mods').delete(id);r.onsuccess=resolve;});}
async function openPanel(kind){$('#panel').classList.remove('hidden');const title=$('#panelTitle'),content=$('#panelContent');if(kind==='garage'){title.textContent='GARAGE';content.innerHTML='<p class="help">Paint is saved locally and applies directly to your supplied car body in every match.</p><div class="row" id="paintChoices"></div><button id="saveBuild">SAVE BUILD</button>';for(const colour of ['#1688ee','#ef5d27','#e9edf6','#10131c','#ad47dc','#2ebd77']){const b=document.createElement('button');b.className='swatch '+(colour===settings.paint?'active':'');b.style.background=colour;b.onclick=()=>{settings.paint=colour;player.model.traverse(n=>{if(n.isMesh&&n.material?.color)n.material.color.set(colour);});persist();openPanel('garage');};$('#paintChoices').append(b);}$('#saveBuild').onclick=()=>{persist();alert('Current build saved.');};}else if(kind==='settings'){title.textContent='CAMERA SETTINGS';content.innerHTML=`<div class="row"><label>Distance <input id="camDistance" type="range" min="7" max="17" step=".5" value="${settings.camDist}"></label><label>Height <input id="camHeight" type="range" min="2" max="8" step=".25" value="${settings.camHeight}"></label></div><p class="help">Ball Cam is toggled in play with C. Camera movement and keys stop safely when this browser tab loses focus.</p>`;$('#camDistance').oninput=e=>{settings.camDist=+e.target.value;persist();};$('#camHeight').oninput=e=>{settings.camHeight=+e.target.value;persist();};}else if(kind==='mods'){title.textContent='MOD MANAGER';const mods=await getMods();content.innerHTML='<p class="help">Import declarative cosmetic ZIPs. Packages run no code: JavaScript and unsafe paths are rejected. This browser stores accepted packages in IndexedDB.</p><input id="modFile" type="file" accept=".zip"><div id="modList"></div>';const list=$('#modList');list.innerHTML=mods.map(m=>`<div class="mod"><b>${m.name}</b> v${m.version}<br><small>${m.author||'Unknown author'} · ${m.description||'No description'}</small><div class="row"><button data-toggle="${m.id}">${m.enabled?'DISABLE':'ENABLE'}</button><button data-remove="${m.id}">REMOVE</button></div></div>`).join('')||'<p class="help">No mod packages imported.</p>';list.onclick=async e=>{const id=e.target.dataset.toggle||e.target.dataset.remove;if(!id)return;if(e.target.dataset.remove)await removeMod(id);else{const m=mods.find(x=>x.id===id);m.enabled=!m.enabled;await saveMod(m);}openPanel('mods');};$('#modFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>40*1024*1024)return alert('Package is larger than the 40 MB import limit.');try{const zip=await JSZip.loadAsync(file),mf=zip.file('manifest.json');if(!mf)throw Error('manifest.json is required.');const manifest=JSON.parse(await mf.async('text'));if(!/^[a-z0-9._-]+$/i.test(manifest.id||''))throw Error('Manifest id must use letters, numbers, dots, underscores or dashes.');if(!manifest.name||!manifest.version)throw Error('Manifest needs name and version.');const files=Object.keys(zip.files);if(files.some(n=>n.includes('..')||/\.js$/i.test(n)))throw Error('Unsafe path or executable JavaScript rejected.');if(!(manifest.assets||[]).every(p=>zip.file(p)&&/\.(glb|gltf|png|jpe?g|webp|json)$/i.test(p)))throw Error('Every declared asset must exist and be GLB, glTF, image, or JSON.');await saveMod({id:manifest.id,name:manifest.name,version:manifest.version,author:manifest.author,description:manifest.description,manifest,enabled:true,blob:file});openPanel('mods');}catch(err){alert('Mod import failed: '+err.message);}};}else if(kind==='end'){title.textContent=announcement;content.innerHTML='<div class="row"><button id="rematch">REMATCH</button><button id="returnMenu">MAIN MENU</button></div>';$('#rematch').onclick=()=>{$('#panel').classList.add('hidden');begin('match');};$('#returnMenu').onclick=()=>{$('#panel').classList.add('hidden');state='menu';$('#hud').classList.add('hidden');$('#menu').classList.remove('hidden');};}}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function dailyAvailable(){return profile.lastDaily!==today();}
function claimDaily(){if(!dailyAvailable())return;const y=new Date();y.setDate(y.getDate()-1);const yesterday=`${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`;profile.dailyStreak=profile.lastDaily===yesterday?Math.min(7,profile.dailyStreak+1):1;profile.lastDaily=today();const reward=180+profile.dailyStreak*45;awardCredits(reward,`DAILY REWARD +${reward}`);openPanel('rewards');}
function cosmeticPrice(category,index){return category==='paint'?350+index*75:category==='boost'?600+index*100:800+index*160;}
function own(category,name){const key=category==='paint'?'ownedPaints':category==='boost'?'ownedBoosts':'ownedToppers';return profile[key].includes(name);}
function equip(category,name){if(!own(category,name))return;profile[category]=name;saveProfile();applyCarCosmetics(player);openPanel(category==='paint'||category==='boost'||category==='topper'?'garage':'shop');}
function buy(category,name,index){const key=category==='paint'?'ownedPaints':category==='boost'?'ownedBoosts':'ownedToppers',price=cosmeticPrice(category,index);if(profile[key].includes(name))return equip(category,name);if(profile.credits<price)return;profile.credits-=price;profile[key].push(name);profile[category]=name;saveProfile();applyCarCosmetics(player);openPanel('shop');}
function shopItem(category,name,index){const selected=profile[category]===name,owned=own(category,name),price=cosmeticPrice(category,index);return `<article class="shopItem ${selected?'equipped':''} ${owned?'owned':''}"><span class="rarity">${category.toUpperCase()}</span><h3>${name.toUpperCase()}</h3><p>${owned?(selected?'EQUIPPED':'OWNED'):`${price} CREDITS`}</p><button data-buy="${category}|${index}">${owned?(selected?'EQUIPPED':'EQUIP'):'BUY'}</button></article>`;}
function finishRankedMatch(){if(!isMatch())return;const won=scores[0]>scores[1],draw=scores[0]===scores[1];let credits=draw?120:won?340:150,mmr=0;if(gameMode==='ranked'){mmr=draw?0:won?24:-17;profile.rating=Math.max(100,profile.rating+mmr);}if(!draw){if(won)profile.wins++;else profile.losses++;}awardCredits(credits);saveProfile();announcement=draw?`DRAW · +${credits} CREDITS`:won?`VICTORY · +${credits} CREDITS${mmr?` · +${mmr} MMR`:''}`:`DEFEAT · +${credits} CREDITS${mmr?` · ${mmr} MMR`:''}`;}
async function activeOpenPanel(kind){
  $('#panel').classList.remove('hidden');const title=$('#panelTitle'),content=$('#panelContent');
  if(kind==='garage'){title.textContent='GARAGE';content.innerHTML=`<p class="help">Equip the cosmetics you own. Paint, topper, and boost trail update the gameplay car instantly.</p><h3>PAINTS</h3><div class="shopGrid">${profile.ownedPaints.map(x=>shopItem('paint',x,PAINTS.indexOf(x))).join('')}</div><h3>BOOST TRAILS</h3><div class="shopGrid">${profile.ownedBoosts.map(x=>shopItem('boost',x,BOOSTS.indexOf(x))).join('')}</div><h3>TOPPERS</h3><div class="shopGrid">${profile.ownedToppers.map(x=>shopItem('topper',x,TOPPERS.indexOf(x))).join('')}</div>`;}
  else if(kind==='shop'){title.textContent=`ITEM SHOP · ${profile.credits} CREDITS`;content.innerHTML=`<p class="help">All shop items are cosmetics. Purchased items persist locally and through CrazyGames Data when enabled.</p><h3>PAINT FINISHES</h3><div class="shopGrid">${PAINTS.map((x,i)=>shopItem('paint',x,i)).join('')}</div><h3>BOOST TRAILS</h3><div class="shopGrid">${BOOSTS.map((x,i)=>shopItem('boost',x,i)).join('')}</div><h3>TOPPERS</h3><div class="shopGrid">${TOPPERS.map((x,i)=>shopItem('topper',x,i)).join('')}</div>`;}
  else if(kind==='rewards'){const remaining=Math.max(0,Math.ceil(profile.nextPlayReward-profile.gameSeconds));title.textContent='REWARDS';content.innerHTML=`<div class="rewardCard"><span class="rarity">DAILY LOGIN</span><h3>${dailyAvailable()?'READY TO CLAIM':'CLAIMED TODAY'}</h3><p>${dailyAvailable()?`Day ${Math.min(7,profile.dailyStreak+1)} reward: ${180+Math.min(7,profile.dailyStreak+1)*45} credits.`:'Come back tomorrow for your next daily reward.'}</p><button id="dailyClaim" ${dailyAvailable()?'':'disabled'}>CLAIM DAILY</button></div><div class="rewardCard"><span class="rarity">PLAYTIME</span><h3>NEXT REWARD: ${remaining}s</h3><p>Play active matches to earn 140 credits every 5 minutes. Current credits: ${profile.credits}.</p></div><div class="rewardCard"><span class="rarity">RANKED</span><h3>${rankName()} · ${profile.rating} MMR</h3><p>Win ranked matches against the bot to earn MMR and credits. W ${profile.wins} / L ${profile.losses}.</p></div>`;const claim=$('#dailyClaim');if(claim)claim.onclick=claimDaily;}
  else if(kind==='settings'){title.textContent='SETTINGS';content.innerHTML=`<div class="row"><label>Camera distance <input id="camDistance" type="range" min="7" max="17" step=".5" value="${settings.camDist}"></label><label>Camera height <input id="camHeight" type="range" min="2" max="8" step=".25" value="${settings.camHeight}"></label><label class="checkLabel"><input id="ballCamToggle" type="checkbox" ${settings.ballCam?'checked':''}> Ball Camera (C)</label></div><p class="help">Keyboard: W/S throttle, A/D steer. Space jumps; left Shift boosts; left Ctrl powerslides. Controller: left stick steers/drives, A jumps, trigger/RB boosts. Touch controls appear on phones.</p>`;$('#camDistance').oninput=e=>{settings.camDist=+e.target.value;persist();};$('#camHeight').oninput=e=>{settings.camHeight=+e.target.value;persist();};$('#ballCamToggle').onchange=e=>{settings.ballCam=e.target.checked;persist();};}
  else if(kind==='end'){title.textContent=announcement;content.innerHTML=`<p class="help">${gameMode==='ranked'?'Ranked result recorded.':'Casual result recorded.'}</p><div class="row"><button id="rematch">REMATCH</button><button id="returnMenu">MAIN MENU</button></div>`;$('#rematch').onclick=()=>{$('#panel').classList.add('hidden');begin(gameMode);};$('#returnMenu').onclick=()=>{$('#panel').classList.add('hidden');state='menu';$('#hud').classList.add('hidden');$('#menu').classList.remove('hidden');};}
  content.querySelectorAll('[data-buy]').forEach(button=>button.onclick=()=>{const [category,index]=button.dataset.buy.split('|');const list=category==='paint'?PAINTS:category==='boost'?BOOSTS:TOPPERS;buy(category,list[+index],+index);});
}
openPanel=activeOpenPanel;
$('#panel .close').onclick=()=>$('#panel').classList.add('hidden');
// Useful for automated smoke tests and harmless for normal browser play.
if(new URLSearchParams(location.search).get('play')==='1') begin('ranked');
