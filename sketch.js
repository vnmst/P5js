let numPads = 12;
let pads = [];
let sounds = [];
let images = [];

let cols = 6;
let rows = 2;
let img;
let flashes = []; // cada flash = {x, y, size, alpha, color}


let padSize;
let reverb, delay;
let startButton;
let audioStarted = false;

let friction = 0.95;
let bounce = 0.8;
let disableSpeed = false;
let glitchActive = false;
let glitchStart = 0;
let recompensa

// ⏳ Controle swap de sons
let swapped = false;
let swapDelay = 60000; // 1 minuto em ms

let newSounds = [];
let newSoundsLoaded = 0;
let r = 255, g = 0, b = 0;
let dr = 2, dg = 3, db = 4;

// 🔹 Delay individual por pad
let delays = [];

// 🔴 Text flashes
let textFlashStart = 90000; // 1 min 30 s
let textFlashActive = false;
let chance = 0.001;
let textFlashStartTime = 0;
let flashWords = [
  "PERDENDO","ERRO","ESTA PERDENDO","SENTIDO","ATENÇÃO","VOCÊ","SE PERDENDO",
  "NÓS","ESTAMOS","AGORA","O","PRESENÇA","SUA VIDA","CONTROLE","COM MENTIRAS",
  "MENTIRAS","PERDIDO"
];
let activeFlashes = []; // cada flash = {word, x, y, startTime, duration, size}

// Fase final
let finalFadeTriggered = false;
let finalFadeStart = 0;
let infinitePhaseReached = false;
let padsLocked = false;  // trava pads permanentemente
let physicsLocked = false;

let isSoundB = [];
let distortion;
let distortionStart = 0;
let distortionActive = false;
let delaysB = []; // delay individual para SoundB

// ---------------- PRELOAD ----------------
function preload() {
  for (let i = 0; i < numPads; i++) {
    sounds[i] = loadSound(
      `Sound${i + 1}.wav`,
      () => {},
      () => {
        loadSound(
          `Sound${i + 1}.mp3`,
          (buf) => { sounds[i] = buf; },
          () => { sounds[i] = null; }
        );
      }
    );
    
    recompensa = loadSound('audio-recompensa.mp3')
    
     img = loadImage('image5.png');

    images[i] = loadImage(
      `image${i + 1}.png`,
      () => {},
      () => { images[i] = null; }
    );
  }
}

// ---------------- SETUP ----------------
function setup() {
  let canvas = createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 255);
  rectMode(CORNER);
  imageMode(CENTER);
  noStroke();
  textAlign(CENTER, CENTER);
  

  // Evitar scroll no touch
  canvas.elt.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
  canvas.elt.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  canvas.elt.addEventListener("touchend", (e) => e.preventDefault(), { passive: false });
  
 // window.addEventListener("touchend", (e) => {
 // handleRelease();
//}, { passive: false });

  padSize = min(width / 6, height / 4);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let i = r * cols + c;
      pads.push({
        x: c * padSize * 1.5 + 60,
        y: r * padSize * 1.5 + 100,
        w: padSize,
        h: padSize,
        active: false,
        dragging: false,
        clicked: false,
        offsetX: 0,
        offsetY: 0,
        vx: 0,
        vy: 0,
        clickTime: 0,
        lastDragTime: 0,
        glow: 0,
        looping: false
      });
    }
  }

  startButton = createButton("🐯 Retire sua recompensa");
  startButton.position(width / 2 - 80, height / 2 - 25);
  startButton.size(width / 4, deight / 4);
  startButton.style("font-size", "25px");
  startButton.style("border", "none");
  startButton.style("border-radius", "10px");
  startButton.style("color", "white");
  startButton.style("font-weight", "bold");
  startButton.style("cursor", "pointer");
  
  startButton.mousePressed(botaosome);
  startButton.touchStarted(botaosome);

  reverb = new p5.Reverb();
  delay = new p5.Delay();
  distortion = new p5.Distortion();
  for (let i = 0; i < numPads; i++) {
  delaysB[i] = new p5.Delay();
}

  for (let i = 0; i < numPads; i++) {
    delays[i] = new p5.Delay();
  }

  setInterval(() => {
    if (textFlashActive && chance < 0.99) {
      chance += 0.005;
    }
  }, 1000);
  
  for (let i = 0; i < numPads; i++) {
  images[i].resize(padSize-10, padSize-10);
}
  startAudio();
  recompensa.play();
}

// ---------------- DRAW ----------------
function draw() {
      background(0);
  // Atualiza cores RGB
  r += dr; g += dg; b += db;
  if (r > 255 || r < 0) dr *= -1;
  if (g > 255 || g < 0) dg *= -1;
  if (b > 255 || b < 0) db *= -1;

  if (!audioStarted) {
    // Background escuro
    background(0);

    // Cria flashes aleatórios
    if (random() < 0.05) { // chance de criar um flash a cada frame
      flashes.push({
        x: random(width),
        y: random(height),
        size: random(20, 100),
        alpha: 255,
        color: [random(360), 100, 100]
      });
    } 

    // Desenha flashes
    for (let i = flashes.length - 1; i >= 0; i--) {
      let f = flashes[i];
      noStroke();
      fill(f.color[0], f.color[1], f.color[2], f.alpha);
      ellipse(f.x, f.y, f.size);
      f.alpha -= 5;  // fade
      f.size += 2;    // explode levemente
      if (f.alpha <= 0) flashes.splice(i, 1); // remove quando sumir
    }

    // Botão brilhando
    startButton.style("background-color", `rgb(${r},${g},${b})`);
    startButton.style(
      "box-shadow",
      `0 0 20px rgb(${r},${g},${b}), 0 0 40px rgb(${r},${g},${b})`
    );
  }
  
  if (audioStarted) {
     colorMode(RGB, 255);
    background(0); // após iniciar áudio
    recompensa.stop();

  // Troca automática de sons
  if (!swapped && millis() > swapDelay) {
    swapped = true;
    console.log("⏳ Iniciando swap gradual após 1 minuto");
    startSequentialSwap();
  }

 // FÍSICA FLUIDA
for (let pad of pads) {
  if (pad.dragging) {
    let targetX = mouseX - pad.offsetX;
    let targetY = mouseY - pad.offsetY;

    targetX = constrain(targetX, 0, width - pad.w);
    targetY = constrain(targetY, 0, height - pad.h);

    pad.vx = targetX - pad.x;
    pad.vy = targetY - pad.y;

    pad.x = targetX;
    pad.y = targetY;

    pad.lastDragTime = millis();
    pad.glow = 255;

    let speed = map(pad.y, 0, height, 2, 0.3);
    speed = constrain(speed, 0.3, 2);

    let i = pads.indexOf(pad);
   if (sounds[i] && sounds[i].isPlaying()) {
  if (isSoundB[i]) {
    if (typeof sounds[i].rate === "function") sounds[i].rate(1);
  } else {
    if (!disableSpeed && typeof sounds[i].rate === "function") sounds[i].rate(speed);
  }
}

  } else {
    // MOVIMENTO FLUIDO APÓS SOLTAR
    pad.x += pad.vx;
    pad.y += pad.vy;

    // decaimento da velocidade
    pad.vx *= friction;
    pad.vy *= friction;

    // brilho decresce gradualmente
    pad.glow = max(0, pad.glow - 10);

    // se a velocidade for muito pequena, zera pra evitar tremulação
    if (abs(pad.vx) < 0.01) pad.vx = 0;
    if (abs(pad.vy) < 0.01) pad.vy = 0;
  }

  // mantém dentro da tela
  pad.x = constrain(pad.x, 0, width - pad.w);
  pad.y = constrain(pad.y, 0, height - pad.h);

  // garante que drag termine mesmo que mouse saia
  if (pad.dragging && millis() - pad.lastDragTime > 400) {
    pad.dragging = false;
    pad.clicked = false;
  }
}
  // COLISÕES
  for (let i = 0; i < pads.length; i++) {
    for (let j = i + 1; j < pads.length; j++) {
      let a = pads[i];
      let b = pads[j];

      let dx = a.x + a.w / 2 - (b.x + b.w / 2);
      let dy = a.y + a.h / 2 - (b.y + b.h / 2);

      let distance = sqrt(dx * dx + dy * dy);
      let minDist = (a.w + b.w) / 2;

      if (distance < minDist) {
        let angle = atan2(dy, dx);
        let overlap = (minDist - distance) * 0.5;

        a.x += cos(angle) * overlap;
        a.y += sin(angle) * overlap;
        b.x -= cos(angle) * overlap;
        b.y -= sin(angle) * overlap;

        let avx = a.vx;
        let avy = a.vy;

        a.vx = b.vx * bounce;
        a.vy = b.vy * bounce;

        b.vx = avx * bounce;
        b.vy = avy * bounce;

        a.glow = 180;
        b.glow = 180;
      }
    }
  }

  // Desenho pads
  for (let i = 0; i < pads.length; i++) {
    let pad = pads[i];
    push();
    drawingContext.shadowBlur = pad.glow * 0.25;
    drawingContext.shadowColor = color(255, 50, 50, pad.glow);
    if (images[i]) image(images[i], pad.x + pad.w/2, pad.y + pad.h/2);
    else { fill(120); rect(pad.x+5, pad.y+5, pad.w-10, pad.h-10, 15); }
    pop();

    if (pad.looping) {
      stroke(255,0,0); strokeWeight(6); noFill();
      rect(pad.x+2, pad.y+2, pad.w-4, pad.h-4, 15);
    }

    // Delay individual
    if (pad.looping && delays[i]) {
      if (pad.dragging || pad.vx !== 0 || pad.vy !== 0) {
      let targetDelay = map(pad.x, 0, width, 0.05, 1);
      let smoothDelay = lerp(delays[i]._delayTime||0.1, targetDelay, 0.05);
      delays[i].delayTime(smoothDelay);
      delays[i]._delayTime = smoothDelay;
      delays[i].feedback(0.35);
    }
    }
    
    // Delay individual para SoundB
if (pad.looping && isSoundB[i] && delaysB[i] && sounds[i]) {
  let targetDelayB = map(pad.x, 0, width, 0.05, 1);
  let smoothDelayB = lerp(delaysB[i]._delayTime||0.1, targetDelayB, 0.05);
  delaysB[i].delayTime(smoothDelayB);
  delaysB[i]._delayTime = smoothDelayB;
  delaysB[i].feedback(0.35);
}
  }

  fill(255); textSize(16);
  text("Vertical = Speed 🎚️   |   Horizontal = Delay Time ⏱️", width/2, height-40);

  // Text flashes
  if (textFlashActive) {
    if (random() < chance) spawnFlash();
    for (let i = activeFlashes.length-1; i>=0; i--) {
      let f = activeFlashes[i];
      let alpha = map(millis()-f.startTime, 0, f.duration, 255,0);
      noFill(); stroke(255,0,0,alpha); strokeWeight(2.5);
      textSize(f.size); textStyle(NORMAL);
      text(f.word, f.x, f.y);
      if (millis() - f.startTime > f.duration) activeFlashes.splice(i,1);
    }
  }

  // Distortion gradativa
  if (distortionActive) {
    let t = constrain((millis()-distortionStart)/30000,0,1);
    try { distortion.set(0.25*t); } catch(e){}
  }

  // Fase final
  if (infinitePhaseReached && !finalFadeTriggered) {
    if (millis()-finalFadeStart > 15000) {
      physicsLocked = true;
      padsLocked = true;
      distortionActive = true; distortionStart = millis();
      finalFadeTriggered = true;
      console.log("⚠️ FASE FINAL — só sobrará o som dos pads 0,3,6");

      for (let i = 0; i < numPads; i++) {
        let s = sounds[i]; if (!s) continue;
        if (i===0||i===3||i===6) {
          if (!s._distConnected) { distortion.process(s,0); s._distConnected = true; }
          try { s.setVolume(0.3,2); if(!s.isPlaying()) s.loop(); } catch(e){}
        } else {
          try { s.setVolume(0,2); setTimeout(()=>{ if(s&&s.stop) s.stop(); },2000); } catch(e){}
        }
      }
      console.log("💀 Sons 1–12 desativados, exceto 1B,4B,7B.");
    }
  }
}
  }

// ---------------- SWAP SOUNDS ----------------
function swapSounds() {
  console.log("⏳ Carregando novos sons...");
  newSounds = []; newSoundsLoaded = 0;

  for (let i=0;i<numPads;i++){
    loadSound(`Sound${i+1}B.wav`, (buf)=>{ newSounds[i]=buf; checkAllLoaded(); },
      ()=>{ loadSound(`Sound${i+1}B.mp3`, (buf)=>{ newSounds[i]=buf; checkAllLoaded(); }, ()=>{ newSounds[i]=null; checkAllLoaded(); }); });
  }

  function checkAllLoaded() {
    newSoundsLoaded++;
    if (newSoundsLoaded===numPads) applySoundSwap();
  }
}

function applySoundSwap() {
  console.log("🔄 Aplicando troca de sons!");
  for(let i=0;i<numPads;i++){
    if(sounds[i]&&sounds[i].isPlaying) try{sounds[i].stop();}catch(e){}
    if(newSounds[i]) { sounds[i]=newSounds[i]; isSoundB[i]=true; }
  }
  disableSpeed = true;
}

let currentPadToSwap = 0;
let sequentialSwapInterval = 4000;
function startSequentialSwap() { currentPadToSwap=0; scheduleNextSingleSwap(); }
function scheduleNextSingleSwap() {
  setTimeout(()=>{
    swapSingleSound(currentPadToSwap);
    currentPadToSwap++;
    if(currentPadToSwap<numPads) scheduleNextSingleSwap();
    else console.log("✔ Todas as trocas individuais concluídas!");
  }, sequentialSwapInterval);
}
function swapSingleSound(i){
  loadSound(`Sound${i+1}B.wav`, (buf)=>applySingleSwap(i,buf),
    ()=>{ loadSound(`Sound${i+1}B.mp3`, (buf)=>applySingleSwap(i,buf), ()=>console.error(`❌ Falhou pad ${i}`)); });
}
function applySingleSwap(i,newBuffer){
  if(sounds[i]&&typeof sounds[i].stop==="function") sounds[i].stop();
  sounds[i]=newBuffer; 
  isSoundB[i]=true;
  console.log(`🔄 Pad ${i} trocado individualmente!`);
  
    // Conectar o delayB automaticamente
  if (delaysB[i] && newBuffer) {
    delaysB[i].process(newBuffer, 0.1, 0.3, 2000); // dry/wet inicial
    delaysB[i]._delayTime = 0.1;
    delaysB[i]._connected = true;
  }
}
// ---------------- CONTROLES ----------------
function startAudio() { //userStartAudio();
}

function botaosome() { audioStarted=true; startButton.hide(); }


function insidePad(pad,x,y){ return x>pad.x && x<pad.x+pad.w && y>pad.y && y<pad.y+pad.h; }

// ------------------ NOVO SISTEMA DE INPUT (mouse + touch unificados) ------------------

function handlePress(px, py) {
  if(!audioStarted) return;
  if(physicsLocked) return;
  if(padsLocked) return false;

  if(!textFlashActive && millis()>textFlashStart){
    textFlashActive=true;
    textFlashStartTime=millis();
    console.log("🔴 Text flashes ativados!");
  }

  for (let pad of pads) {
    if (insidePad(pad, px, py)) {
      pad.clicked = true;
      pad.dragging = false;
      pad.startX = px;
      pad.startY = py;
      pad.offsetX = px - pad.x;
      pad.offsetY = py - pad.y;
      pad.clickTime = millis();
      break;
    }
  }
}

function handleDrag(px, py) {
  if(padsLocked || physicsLocked) return;

  for (let pad of pads) {
     // ⇩⇩⇩ AQUI entra a lógica nova de ativação de arrasto
    if (pad.clicked) {
      let dx = px - pad.startX;
      let dy = py - pad.startY;

      if (abs(dx) > 10 || abs(dy) > 10) {
        pad.dragging = true;
        pad.clicked = false;
      }
    }
    if (pad.dragging) {
      let newX = constrain(px - pad.offsetX, 0, width - pad.w);
      let newY = constrain(py - pad.offsetY, 0, height - pad.h);

      pad.vx = newX - pad.x;
      pad.vy = newY - pad.y;

      pad.x = newX;
      pad.y = newY;

      pad.lastDragTime = millis();
      pad.glow = 255;

      let speed = map(pad.y, 0, height, 2, 0.3);
      speed = constrain(speed, 0.3, 2);

      let i = pads.indexOf(pad);

      if(sounds[i] && sounds[i].isPlaying()) {
        if (isSoundB[i]) {
          if(typeof sounds[i].rate === "function") sounds[i].rate(1);
        } else {
          if(!disableSpeed && typeof sounds[i].rate === "function") sounds[i].rate(speed);
        }
      }
    }
  }
}

function handleRelease() {
  if(padsLocked || physicsLocked) return;

    //let now = millis();
  for (let pad of pads) {

    if (pad.clicked) {
  console.log("Pad clicado:", pads.indexOf(pad));
      let clickDuration = millis() - pad.clickTime;

      if (clickDuration < 500) {
         //if (now - pad.clickTime < 1000){ // considera clique válido
       
      
        let i = pads.indexOf(pad);

        if (!pad.looping) {
          if (sounds[i] && typeof sounds[i].loop === "function") {
            sounds[i].setVolume(0);
            sounds[i].loop();
            sounds[i].setVolume(0.15, 0.2);
            pad.looping = true;

            if (!delays[i]._connected) {
              delays[i].process(sounds[i], 0.5, 0.3, 2000);
              delays[i]._connected = true;
              delays[i]._delayTime = 0.5;
            }
          }
        } else {
          if (sounds[i] && typeof sounds[i].stop === "function") {
            sounds[i].stop();
          }
          pad.looping = false;
        }
      }
    }

    pad.dragging = false;
    pad.clicked = false;
  }
}

// ---------------- EVENTOS COMPATÍVEIS (mouse + touch) -----------------

function mousePressed() {
  handlePress(mouseX, mouseY);
}

function mouseDragged() {
handleDrag(mouseX, mouseY);
}

function mouseReleased() {
  handleRelease();
}

function touchStarted() {
  if (touches.length > 0)
    handlePress(touches[0].x, touches[0].y);
  return false;
}

function touchMoved() {
  if (touches.length > 0)
    handleDrag(touches[0].x, touches[0].y);
  return false;
}

function touchEnded() {
  handleRelease();
  return false;
}

function windowResized(){ resizeCanvas(windowWidth,windowHeight); }

function spawnFlash(){
  let word=random(flashWords), x=random(width), y=random(height);
  let timeSinceFlashStart=millis()-textFlashStartTime;
  let progressiveBoost=map(timeSinceFlashStart,0,90000,0,8000);
  let duration=random(100,700)+progressiveBoost;

  if(timeSinceFlashStart>90000){ duration=999999999;
    if(!infinitePhaseReached){ infinitePhaseReached=true; finalFadeStart=millis(); console.log("🔥 Entrou na fase infinita. Contagem +15s iniciada."); }
  }

  let size=random(10,100);
  activeFlashes.push({word,x,y,startTime:millis(),duration,size});
}


function triggerPad(pad){
  let i = pads.indexOf(pad);
  if(!pad.looping && sounds[i]){
    sounds[i].loop();
    pad.looping = true;
  } else if(pad.looping && sounds[i]){
    sounds[i].stop();
    pad.looping = false;
  }
}

function keyPressed() {
  if (key === 'S') { // tecla S para salvar
    save(img, 'image5.png'); // img é a variável carregada com loadImage()
  }
}
