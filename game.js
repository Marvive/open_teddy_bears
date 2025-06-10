// Open World Teddy Game - Initial Scene Setup
// Uses Three.js for rendering

let scene, camera, renderer, controls;
let player, playerHealth = 100, maxHealth = 100;
let playerXP = 0, playerLevel = 1, playerAttack = 18, playerXPToNext = 60;
let teddyBears = [], monster = null, safeZones = [];
let rainbowClouds = [];
let ground;
let isResting = false;
let gameOver = false;
// Jump physics
let playerVelocityY = 0;
let playerOnGround = true;
let bearRespawnTimer = 0; // for bear respawn

const params = {
    worldSize: 400,
    numTeddies: 8,
    numClouds: 12,
    numSafeZones: 3
};

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // White sky

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 16);

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x88ff88, 0.7);
    scene.add(hemiLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    // Ground with hills/lakes/rivers
    createGround();

    // Rainbow clouds
    createRainbowClouds();

    // Safe zones
    createSafeZones();

    // Player
    createPlayer();

    // Teddy bears
    createTeddyBears();

    // Monster
    createMonster();

    // Events
    window.addEventListener('resize', onWindowResize);
    setupControls();
    setupUI();

    animate();
}

function createGround() {
    // Height map for hills
    const size = params.worldSize;
    const geometry = new THREE.PlaneGeometry(size, size, 128, 128);
    geometry.rotateX(-Math.PI/2);

    for (let i = 0; i < geometry.attributes.position.count; i++) {
        let x = geometry.attributes.position.getX(i);
        let z = geometry.attributes.position.getZ(i);
        geometry.attributes.position.setY(i, getGroundHeight(x, z));
    }
    geometry.computeVertexNormals();
    const groundMat = new THREE.MeshLambertMaterial({color: 0x4caf50, side: THREE.DoubleSide});
    ground = new THREE.Mesh(geometry, groundMat);
    ground.receiveShadow = true;
    scene.add(ground);

    // Water
    const waterGeom = new THREE.PlaneGeometry(size, size);
    waterGeom.rotateX(-Math.PI/2);
    const waterMat = new THREE.MeshLambertMaterial({color: 0x00bcd4, transparent: true, opacity: 0.7});
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.position.y = -2;
    scene.add(water);
}

function createRainbowClouds() {
    for (let i = 0; i < params.numClouds; i++) {
        let cloud = new THREE.Group();
        let baseY = 35 + Math.random()*10;
        let baseX = (Math.random()-0.5)*params.worldSize*0.8;
        let baseZ = (Math.random()-0.5)*params.worldSize*0.8;
        for (let j = 0; j < 5; j++) {
            let color = new THREE.Color().setHSL((j/5 + Math.random()*0.1), 0.9, 0.7);
            let sphere = new THREE.Mesh(
                new THREE.SphereGeometry(5+Math.random()*2, 16, 16),
                new THREE.MeshLambertMaterial({color: color})
            );
            sphere.position.set((Math.random()-0.5)*10, (Math.random()-0.5)*3, (Math.random()-0.5)*6);
            cloud.add(sphere);
        }
        cloud.position.set(baseX, baseY, baseZ);
        scene.add(cloud);
        rainbowClouds.push(cloud);
    }
}

function createSafeZones() {
    for (let i = 0; i < params.numSafeZones; i++) {
        let x = (Math.random()-0.5)*params.worldSize*0.8;
        let z = (Math.random()-0.5)*params.worldSize*0.8;
        let safe = new THREE.Mesh(
            new THREE.CylinderGeometry(7, 7, 0.3, 32),
            new THREE.MeshLambertMaterial({color: 0x90caf9, transparent: true, opacity: 0.55})
        );
        safe.position.set(x, 0.2, z);
        scene.add(safe);
        // Add a visible marker (rotating torus with glow)
        let marker = new THREE.Mesh(
            new THREE.TorusGeometry(7.5, 0.4, 16, 48),
            new THREE.MeshBasicMaterial({color: 0x00e5ff, transparent: true, opacity: 0.62})
        );
        marker.position.set(x, 0.7, z);
        marker.rotation.x = Math.PI/2;
        scene.add(marker);
        safeZones.push({mesh: safe, marker: marker, x, z});
    }
}

function createPlayer() {
    player = new THREE.Group();
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.5, 1.5),
        new THREE.MeshLambertMaterial({color: 0xffe082})
    );
    head.position.y = 3.75;
    player.add(head);

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 2, 1),
        new THREE.MeshLambertMaterial({color: 0x1976d2})
    );
    body.position.y = 1.5;
    player.add(body);

    const rightArm = new THREE.Group();
    const rightArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 2, 0.5),
        new THREE.MeshLambertMaterial({color: 0xffe082})
    );
    rightArmMesh.position.y = -0.5;
    rightArm.add(rightArmMesh);
    rightArm.position.set(-1, 2, 0);
    rightArm.name = 'rightArm';
    player.add(rightArm);

    const leftArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 2, 0.5),
        new THREE.MeshLambertMaterial({color: 0xffe082})
    );
    leftArm.position.set(1, 1.5, 0);
    player.add(leftArm);

    for (let i = 0; i < 2; i++) {
        const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 1.5, 0.5),
            new THREE.MeshLambertMaterial({color: 0x424242})
        );
        leg.position.set(i === 0 ? -0.375 : 0.375, -0.25, 0);
        player.add(leg);
    }
    
    let sword = new THREE.Group();
    let blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.5, 0.3),
        new THREE.MeshLambertMaterial({color: 0xb0bec5})
    );
    blade.position.y = 0.75;
    sword.add(blade);
    let hilt = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.3, 0.4),
        new THREE.MeshLambertMaterial({color: 0x8d6e63})
    );
    sword.add(hilt);
    sword.position.set(0, -1.5, 0);
    sword.name = 'weapon';
    rightArm.add(sword);

    player.position.set(0, 0, 0);
    scene.add(player);
}

function createTeddyBears() {
    for (let i = 0; i < params.numTeddies; i++) {
        spawnTeddyBear();
    }
}

function spawnTeddyBear() {
    let bear = new THREE.Group();
    // Body
    let body = new THREE.Mesh(
        new THREE.SphereGeometry(2.8, 18, 18),
        new THREE.MeshLambertMaterial({color: 0xd7a47b})
    );
    body.position.y = 2.7;
    bear.add(body);
    // Head
    let head = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 16, 16),
        new THREE.MeshLambertMaterial({color: 0xeecba8})
    );
    head.position.y = 5;
    bear.add(head);
    // Ears
    for (let j = 0; j < 2; j++) {
        let ear = new THREE.Mesh(
            new THREE.SphereGeometry(0.7, 12, 12),
            new THREE.MeshLambertMaterial({color: 0xeecba8})
        );
        ear.position.set(j===0?-1.2:1.2, 6.1, 0.4);
        bear.add(ear);
    }
    // Fearsome face: angry eyes, nose, fangs
    for (let i = 0; i < 2; i++) {
        let eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.19, 8, 8),
            new THREE.MeshLambertMaterial({color: 0xb71c1c}) // red angry eyes
        );
        eye.position.set(i===0?-0.45:0.45, 5.65, 1.3);
        bear.add(eye);
        // Eyebrows (angry)
        let brow = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.07, 0.07),
            new THREE.MeshLambertMaterial({color: 0x222222})
        );
        brow.position.set(i===0?-0.45:0.45, 5.81, 1.25);
        brow.rotation.z = i===0?-Math.PI/6:Math.PI/6;
        bear.add(brow);
    }
    let nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 8, 8),
        new THREE.MeshLambertMaterial({color: 0x6d4c41})
    );
    nose.position.set(0, 5.30, 1.45);
    bear.add(nose);
    // Fangs
    for (let i = -1; i <= 1; i+=2) {
        let fang = new THREE.Mesh(
            new THREE.ConeGeometry(0.08, 0.27, 8),
            new THREE.MeshLambertMaterial({color: 0xffffff})
        );
        fang.position.set(i*0.18, 5.03, 1.41);
        fang.rotation.x = Math.PI/1.2;
        bear.add(fang);
    }
    // Mouth (snarl)
    let mouthGeom = new THREE.TorusGeometry(0.23, 0.045, 8, 24, Math.PI*0.7);
    let mouth = new THREE.Mesh(mouthGeom, new THREE.MeshBasicMaterial({color: 0x880000}));
    mouth.position.set(0, 5.09, 1.36);
    mouth.rotation.set(Math.PI/2, 0, 0);
    bear.add(mouth);
    // Arms (with claws)
    for (let j = 0; j < 2; j++) {
        let arm = new THREE.Group();
        let armMesh = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.45, 2.2, 8, 12),
            new THREE.MeshLambertMaterial({color: 0xd7a47b})
        );
        armMesh.position.set(0, 0, 0);
        arm.add(armMesh);
        // Claws
        for (let k = -1; k <= 1; k++) {
            let claw = new THREE.Mesh(
                new THREE.CylinderGeometry(0.09, 0.04, 0.44, 8),
                new THREE.MeshLambertMaterial({color: 0xffffff})
            );
            claw.position.set(j===0?-2.3:2.3, 1.8, k*0.18);
            claw.rotation.set(Math.PI/2, 0, 0);
            bear.add(claw);
        }
        arm.position.set(j===0?-2.3:2.3, 3.2, 0);
        arm.rotation.z = j===0?Math.PI/6:-Math.PI/6;
        bear.add(arm);
    }
    // Legs
    for (let j = 0; j < 2; j++) {
        let leg = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.55, 1.2, 8, 12),
            new THREE.MeshLambertMaterial({color: 0xd7a47b})
        );
        leg.position.set(j===0?-0.9:0.9, 0.7, 0.5);
        bear.add(leg);
    }
    // Position bears randomly
    let x = (Math.random()-0.5)*params.worldSize*0.8;
    let z = (Math.random()-0.5)*params.worldSize*0.8;
    bear.position.set(x, 0, z);
    bear.userData = {health: 60, maxHealth: 60, isEnemy: true, attackAnim: 0};
    scene.add(bear);
    teddyBears.push(bear);
}

function createMonster() {
    monster = new THREE.Group();
    // Body
    let body = new THREE.Mesh(
        new THREE.BoxGeometry(5, 7, 4),
        new THREE.MeshLambertMaterial({color: 0x9e9e9e})
    );
    body.position.y = 3.5;
    monster.add(body);
    // Head
    let head = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 18, 18),
        new THREE.MeshLambertMaterial({color: 0x616161})
    );
    head.position.y = 7;
    monster.add(head);
    // Eyes
    for (let i = 0; i < 2; i++) {
        let eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshLambertMaterial({color: 0xff1744})
        );
        eye.position.set(i===0?-0.8:0.8, 7.7, 1.2);
        monster.add(eye);
    }
    // Arms
    for (let i = 0; i < 2; i++) {
        let arm = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.7, 3.8, 8, 12),
            new THREE.MeshLambertMaterial({color: 0x757575})
        );
        arm.position.set(i===0?-3.5:3.5, 4.5, 0);
        arm.rotation.z = i===0?Math.PI/7:-Math.PI/7;
        monster.add(arm);
    }
    // Legs
    for (let i = 0; i < 2; i++) {
        let leg = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.9, 2.7, 8, 12),
            new THREE.MeshLambertMaterial({color: 0x757575})
        );
        leg.position.set(i===0?-1.5:1.5, 1, 0.7);
        monster.add(leg);
    }
    // Place monster
    monster.position.set(params.worldSize*0.35, 0, params.worldSize*0.35);
    monster.userData = {health: 180, maxHealth: 180, isEnemy: true};
    scene.add(monster);
}

function setupControls() {
    // Simple WASD/arrow key movement and mouse look
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);

    renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });

    document.getElementById('attack-btn').addEventListener('click', attack);
    document.addEventListener('keydown', function(e) {
        if ((e.key === 'f' || e.code === 'KeyF') && !gameOver) {
            e.preventDefault();
            attack();
        } else if ((e.key === ' ' || e.code === 'Space') && !gameOver) {
            e.preventDefault();
            if (playerOnGround) {
                playerVelocityY = 0.23; // jump impulse
                playerOnGround = false;
            }
        }
    });
}
let keys = {};
function onKeyDown(e) { keys[e.key.toLowerCase()] = true; }
function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
let mouse = {x: 0, y: 0};
function onMouseMove(e) {
    if (document.pointerLockElement === renderer.domElement) {
        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
}

let yaw = 0, pitch = 0;
function updatePlayerMovement(dt) {
    let speed = 11 * dt;
    let forward = 0, right = 0;
    // WASD/Arrows for movement
    if (keys['w'] || keys['arrowup'] || keys['i']) forward += 1;
    if (keys['s'] || keys['arrowdown'] || keys['k']) forward -= 1;
    if (keys['a'] || keys['arrowleft']) right += 1;
    if (keys['d'] || keys['arrowright']) right -= 1;

    // Move player in yaw direction
    let dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    let rightVec = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    let move = dir.multiplyScalar(forward).add(rightVec.multiplyScalar(right));
    if (move.length() > 0) move.normalize();
    // --- Jump physics ---
    let newX = player.position.x + move.x*speed;
    let newZ = player.position.z + move.z*speed;
    let groundY = getGroundHeight(newX, newZ);
    // Apply gravity
    playerVelocityY -= 0.0095; // gravity
    if (!playerOnGround || Math.abs(playerVelocityY) > 0.0001) {
        player.position.y += playerVelocityY / dt * 0.016;
    }
    // Check if landed
    if (player.position.y <= groundY) {
        player.position.y = groundY;
        playerVelocityY = 0;
        playerOnGround = true;
    } else {
        playerOnGround = false;
    }
    player.position.x = newX;
    player.position.z = newZ;
    // Rotate player group to face yaw
    player.rotation.y = yaw;
    // Camera follows player
    camera.position.set(
        player.position.x - Math.sin(yaw)*12,
        player.position.y + 7 + Math.sin(pitch)*2,
        player.position.z - Math.cos(yaw)*12
    );
    camera.lookAt(player.position.x, player.position.y+3, player.position.z);
}

function getGroundHeight(x, z) {
    let y = 0;
    const distFromCenter = Math.sqrt(x*x + z*z);

    // Big hill in the middle
    if (distFromCenter < 80) {
        y = 20 * Math.exp(-distFromCenter * distFromCenter / 4000);
    }

    // Water trench around the hill
    if (distFromCenter > 90 && distFromCenter < 120) {
        return -5; // Water level
    }
    
    // Some other smaller hills
    y += Math.sin(x/30)*3 + Math.cos(z/40)*2;

    return y;
}

let safeZoneMoveTimer = 0;
let swordSwingTimer = 0;
let swordSwinging = false;

function animate() {
    if (gameOver) return;
    requestAnimationFrame(animate);
    let dt = 0.016; // Approximate frame time
    // Rotate safe zone markers for visibility
    safeZones.forEach(sz => {
        if (sz.marker) sz.marker.rotation.z += 0.07;
    });
    // --- Sword swing animation ---
    if (swordSwinging && player) {
        const rightArm = player.getObjectByName('rightArm');
        if (rightArm) {
            rightArm.rotation.x = -Math.PI / 2 * (1 - Math.cos(swordSwingTimer * Math.PI * 2));
        }
        swordSwingTimer += dt;
        if (swordSwingTimer > 0.5) {
            swordSwinging = false;
            if (rightArm) {
                rightArm.rotation.x = 0;
            }
        }
    }
    updatePlayerMovement(dt);
    updateEnemies(dt);
    updateSafeZones();
    updateUI();
    renderEnemyHealthBars();
    renderer.render(scene, camera);
    // --- Bear respawn/replace ---
    bearRespawnTimer += dt;
    if (bearRespawnTimer > 2.5) {
        bearRespawnTimer = 0;
        // Remove dead bears from array
        teddyBears = teddyBears.filter(bear => bear.userData.health > 0 && bear.parent);
        while (teddyBears.length < 8) {
            spawnTeddyBear();
        }
    }
    // --- Safe zone move ---
    safeZoneMoveTimer += dt;
    if (safeZoneMoveTimer > 60) {
        safeZoneMoveTimer = 0;
        safeZones.forEach(sz => {
            let x = (Math.random()-0.5)*params.worldSize*0.8;
            let z = (Math.random()-0.5)*params.worldSize*0.8;
            sz.x = x;
            sz.z = z;
            sz.mesh.position.set(x, 0.2, z);
            if (sz.marker) sz.marker.position.set(x, 0.7, z);
        });
    }
}

function updateEnemies(dt) {
    // Teddy bears AI
    teddyBears.forEach(bear => {
        if (bear.userData.health <= 0) return;
        // Always chase player if alive
        let dist = bear.position.distanceTo(player.position);
        let dir = player.position.clone().sub(bear.position).setY(0).normalize();
        // Move toward player
        bear.position.add(dir.multiplyScalar(6*dt));
        // Adjust y to ground
        let y = getGroundHeight(bear.position.x, bear.position.z);
        bear.position.y = y;
        // Attack if close
        if (dist <= 3) {
            if (Math.random() < 0.012) {
                damagePlayer(6);
                bear.userData.attackAnim = 0.33; // animate arm swipe
            }
        }
        // Animate bear attack (swipe arms)
        if (bear.userData.attackAnim > 0) {
            bear.children.forEach(child => {
                if (child.type === 'Group') {
                    child.rotation.x = Math.sin(performance.now()/80)*1.2;
                }
            });
            bear.userData.attackAnim -= dt;
            if (bear.userData.attackAnim <= 0) {
                // Reset arms
                bear.children.forEach(child => {
                    if (child.type === 'Group') child.rotation.x = 0;
                });
                bear.userData.attackAnim = 0;
            }
        }
    });
    // Monster AI
    if (monster && monster.userData.health > 0) {
        let dist = monster.position.distanceTo(player.position);
        if (dist < 32 && dist > 5) {
            let dir = player.position.clone().sub(monster.position).setY(0).normalize();
            monster.position.add(dir.multiplyScalar(7*dt));
            let y = getGroundHeight(monster.position.x, monster.position.z);
            monster.position.y = y;
        } else if (dist <= 5) {
            if (Math.random() < 0.018) {
                damagePlayer(13);
            }
        }
    }
}

function updateSafeZones() {
    isResting = false;
    safeZones.forEach(sz => {
        let dist = Math.sqrt(
            (player.position.x-sz.x)*(player.position.x-sz.x) +
            (player.position.z-sz.z)*(player.position.z-sz.z)
        );
        if (dist < 7) {
            isResting = true;
            if (playerHealth < maxHealth) playerHealth += 0.6;
            if (playerHealth > maxHealth) playerHealth = maxHealth;
        }
    });
    document.getElementById('rest-indicator').style.display = isResting ? 'block' : 'none';
}

function attack() {
    if (gameOver) return;
    // Sword swing animation
    swordSwinging = true;
    swordSwingTimer = 0;
    // Attack teddy bears or monster in range
    let attacked = false;
    teddyBears.forEach((bear, idx) => {
        if (bear.userData.health > 0 && bear.position.distanceTo(player.position) < 4.5) {
            bear.userData.health -= playerAttack;
            attacked = true;
            if (bear.userData.health <= 0) {
                gainXP(28);
                // Loot drop
                if (Math.random() < 0.25) {
                    dropLoot(bear.position);
                }
                // Remove bear from scene
                scene.remove(bear);
                // Remove health bar if present next frame
            }
        }
    });
    if (monster && monster.userData.health > 0 && monster.position.distanceTo(player.position) < 6) {
        monster.userData.health -= playerAttack + 4;
        attacked = true;
        if (monster.userData.health <= 0) {
            gainXP(80);
            scene.remove(monster);
        }
    }
    if (attacked) {
        // Optional: play sound or animation
    }
}

// --- Loot/Inventory/Equipment System ---
const equipmentSlots = ['hat','shirt','pants','weapon'];
let inventory = [];
let equipped = {hat:null, shirt:null, pants:null, weapon:null};
const lootItems = [
    {slot:'hat', name:'Wizard Hat', color:0x6a1b9a, base:{health:10,def:2,atk:0}},
    {slot:'hat', name:'Baseball Cap', color:0x1976d2, base:{health:7,def:1,atk:0}},
    {slot:'shirt', name:'Red Shirt', color:0xd32f2f, base:{health:12,def:3,atk:0}},
    {slot:'shirt', name:'Green Tunic', color:0x388e3c, base:{health:10,def:2,atk:1}},
    {slot:'pants', name:'Blue Jeans', color:0x1976d2, base:{health:8,def:2,atk:0}},
    {slot:'pants', name:'Gold Pants', color:0xffd600, base:{health:13,def:3,atk:0}},
    {slot:'weapon', name:'Golden Sword', color:0xffd600, base:{health:0,def:0,atk:8}},
    {slot:'weapon', name:'Spiked Club', color:0x6d4c41, base:{health:0,def:0,atk:12}}
];
function dropLoot(pos) {
    // Pick random loot
    let lootType = lootItems[Math.floor(Math.random()*lootItems.length)];
    // Check for duplicate
    let existing = inventory.find(item => item.name === lootType.name);
    if (existing) {
        // Level up
        existing.level = (existing.level||1)+1;
        existing.base.health += Math.ceil(existing.base.health*0.25);
        existing.base.def += Math.max(1, Math.floor(existing.base.def*0.2));
        existing.base.atk += Math.max(1, Math.floor(existing.base.atk*0.2));
        showLootNotification({...lootType, name:lootType.name+" leveled up! (Lv."+existing.level+")"});
    } else {
        // New item
        let loot = {...lootType, level:1};
        inventory.push(loot);
        showLootNotification(loot);
    }
    updateInventoryUI();
} 
function showLootNotification(loot) {
    let el = document.getElementById('loot-notification');
    el.textContent = `Found: ${loot.name}! Press I for inventory.`;
    setTimeout(()=>{ el.textContent = ''; }, 3400);
}
function updateInventoryUI() {
    let inv = document.getElementById('inventory-items');
    inv.innerHTML = inventory.map((item,i)=>{
        let stats = `Lv.${item.level||1} (+${item.base.health} HP, +${item.base.def} DEF, +${item.base.atk} ATK)`;
        return `<button onclick=\"equipItem(${i})\">Equip</button> <span style='color:#333'>${item.name}</span> <span style='color:#888'>${stats}</span>`;
    }).join('<br>');
    equipmentSlots.forEach(slot => {
        let slotEl = document.getElementById('slot-'+slot);
        if (equipped[slot]) {
            let item = equipped[slot];
            slotEl.querySelector('span').innerHTML = `${item.name} <span style='color:#888'>Lv.${item.level||1}</span>`;
        } else {
            slotEl.querySelector('span').textContent = 'none';
        }
    });
} 
window.equipItem = function(idx) {
    let item = inventory[idx];
    equipped[item.slot] = item;
    updateInventoryUI();
    updatePlayerEquipment();
};
function updatePlayerEquipment() {
    // Remove old equipment visuals and default sword
    for (let i = player.children.length-1; i >= 0; i--) {
        let obj = player.children[i];
        if ((obj.userData && obj.userData.equip) || obj.name === 'weapon') player.remove(obj);
    }
    // Hat
    if (equipped.hat) {
        let hat = new THREE.Mesh(
            new THREE.ConeGeometry(0.7 + 0.13*(equipped.hat.level-1), 1.3 + 0.2*(equipped.hat.level-1), 16),
            new THREE.MeshLambertMaterial({color: equipped.hat.color})
        );
        hat.position.set(0,5.1 + 0.13*(equipped.hat.level-1),0);
        hat.userData = {equip:true};
        player.add(hat);
    }
    // Shirt (torso overlay)
    if (equipped.shirt) {
        let shirt = new THREE.Mesh(
            new THREE.CylinderGeometry(0.82 + 0.09*(equipped.shirt.level-1),0.82 + 0.09*(equipped.shirt.level-1),1.7,16),
            new THREE.MeshLambertMaterial({color: equipped.shirt.color})
        );
        shirt.position.set(0,2.5,0);
        shirt.userData = {equip:true};
        player.add(shirt);
    }
    // Pants (legs overlay)
    if (equipped.pants) {
        let pants = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5 + 0.08*(equipped.pants.level-1),0.5 + 0.08*(equipped.pants.level-1),1.3,16),
            new THREE.MeshLambertMaterial({color: equipped.pants.color})
        );
        pants.position.set(0,0.7,0);
        pants.userData = {equip:true};
        player.add(pants);
    }
    // Weapon (replace sword)
    if (equipped.weapon) {
        // Visual: sword or club
        let weapon;
        if (equipped.weapon.name.toLowerCase().includes('sword')) {
            weapon = new THREE.Group();
            let blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.19+0.05*(equipped.weapon.level-1), 1.7+0.3*(equipped.weapon.level-1), 0.19+0.05*(equipped.weapon.level-1)),
                new THREE.MeshLambertMaterial({color: equipped.weapon.color})
            );
            blade.position.y = 0.8 + 0.15*(equipped.weapon.level-1);
            weapon.add(blade);
            let hilt = new THREE.Mesh(
                new THREE.CylinderGeometry(0.09, 0.09, 0.36, 8),
                new THREE.MeshLambertMaterial({color: 0x8d6e63})
            );
            hilt.position.y = 0.05;
            weapon.add(hilt);
        } else if (equipped.weapon.name.toLowerCase().includes('club')) {
            weapon = new THREE.Group();
            let club = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18+0.07*(equipped.weapon.level-1), 0.13+0.05*(equipped.weapon.level-1), 1.4+0.3*(equipped.weapon.level-1), 12),
                new THREE.MeshLambertMaterial({color: equipped.weapon.color})
            );
            club.position.y = 0.7 + 0.13*(equipped.weapon.level-1);
            weapon.add(club);
        } else {
            weapon = new THREE.Mesh(
                new THREE.BoxGeometry(0.19, 1.7, 0.19),
                new THREE.MeshLambertMaterial({color: equipped.weapon.color})
            );
            weapon.position.y = 0.8;
        }
        weapon.position.set(0.7,2.5,0.6);
        weapon.rotation.set(Math.PI/6, 0, Math.PI/10);
        weapon.userData = {equip:true};
        player.add(weapon);
    } else {
        // If no weapon equipped, add default sword
        let sword = new THREE.Group();
        let blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 1.6, 0.15),
            new THREE.MeshLambertMaterial({color: 0xb0bec5})
        );
        blade.position.y = 0.8;
        sword.add(blade);
        let hilt = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.09, 0.36, 8),
            new THREE.MeshLambertMaterial({color: 0x8d6e63})
        );
        hilt.position.y = 0.05;
        sword.add(hilt);
        sword.position.set(0.7, 2.5, 0.6);
        sword.rotation.set(Math.PI/6, 0, Math.PI/10);
        sword.name = 'weapon';
        player.add(sword);
    }
}
// Inventory toggle
window.addEventListener('keydown', function(e) {
    if (e.key === 'i' || e.key === 'I') {
        let inv = document.getElementById('inventory');
        if (inv.style.display==='none') {
            inv.style.display = 'block';
            updateInventoryUI();
        } else {
            inv.style.display = 'none';
        }
    }
    // Escape closes inventory
    if (e.key === 'Escape') {
        let inv = document.getElementById('inventory');
        if (inv.style.display==='block') {
            inv.style.display = 'none';
        }
    }
    // IJKL keys for character rotation
    if (e.key === 'i' || e.key === 'I') {
        player.rotation.y += 0.1;
    }
    if (e.key === 'k' || e.key === 'K') {
        player.rotation.y -= 0.1;
    }
    if (e.key === 'j' || e.key === 'J') {
        player.rotation.y += 0.1;
    }
    if (e.key === 'l' || e.key === 'L') {
        player.rotation.y -= 0.1;
    }
});

function damagePlayer(amount) {
    // ...
    playerHealth -= amount;
    if (playerHealth < 0) playerHealth = 0;
    if (playerHealth === 0) {
        showGameOver();
    }
}

function updateUI() {
    // Health bar
    let pct = Math.max(0, Math.min(1, playerHealth/maxHealth));
    document.getElementById('health-bar').style.setProperty('--health', (pct*100)+'%');
    document.getElementById('health-text').textContent = Math.round(playerHealth) + ' / ' + maxHealth + ' | Lvl: ' + playerLevel;
    // XP bar
    let xpPct = Math.max(0, Math.min(1, playerXP/playerXPToNext));
    document.getElementById('xp-bar').style.setProperty('--xp', (xpPct*100)+'%');
    document.getElementById('xp-text').textContent = 'XP: ' + playerXP + ' / ' + playerXPToNext;
}

function setupUI() {
    document.getElementById('rest-indicator').style.display = 'none';
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Enemy Health Bars ---
let healthBarDivs = [];
function renderEnemyHealthBars() {
    // Remove old bars
    healthBarDivs.forEach(div => div.remove());
    healthBarDivs = [];
    // For each enemy
    [...teddyBears, monster].forEach(enemy => {
        if (!enemy || !enemy.parent || enemy.userData.health <= 0) return;
        let pos = enemy.position.clone();
        pos.y += 7; // Above head
        let proj = pos.project(camera);
        let x = (proj.x * 0.5 + 0.5) * window.innerWidth;
        let y = (-proj.y * 0.5 + 0.5) * window.innerHeight;
        let pct = Math.max(0, Math.min(1, enemy.userData.health/enemy.userData.maxHealth));
        let bar = document.createElement('div');
        bar.className = 'enemy-health-bar';
        bar.style.position = 'absolute';
        bar.style.left = (x-32) + 'px';
        bar.style.top = (y-16) + 'px';
        bar.style.width = '64px';
        bar.style.height = '8px';
        bar.style.background = '#cfd8dc';
        bar.style.borderRadius = '5px';
        bar.style.zIndex = 20;
        let fill = document.createElement('div');
        fill.style.width = (pct*100)+'%';
        fill.style.height = '100%';
        fill.style.background = pct > 0.5 ? '#43a047' : (pct > 0.2 ? '#ffa000' : '#e53935');
        fill.style.borderRadius = '5px';
        bar.appendChild(fill);
        document.body.appendChild(bar);
        healthBarDivs.push(bar);
    });
}

// --- XP/Leveling ---
function gainXP(amount) {
    playerXP += amount;
    while (playerXP >= playerXPToNext) {
        playerXP -= playerXPToNext;
        playerLevel++;
        maxHealth = Math.round(maxHealth * 1.18);
        playerAttack = Math.round(playerAttack * 1.13);
        playerHealth = maxHealth;
        playerXPToNext = Math.round(playerXPToNext * 1.33);
        // Optional: flash level up
        let lvlDiv = document.createElement('div');
        lvlDiv.textContent = 'LEVEL UP!';
        lvlDiv.style.position = 'absolute';
        lvlDiv.style.top = '40%';
        lvlDiv.style.left = '50%';
        lvlDiv.style.transform = 'translate(-50%, -50%)';
        lvlDiv.style.fontSize = '48px';
        lvlDiv.style.color = '#ffd600';
        lvlDiv.style.fontWeight = 'bold';
        lvlDiv.style.textShadow = '2px 2px 8px #333';
        lvlDiv.style.zIndex = 100;
        document.body.appendChild(lvlDiv);
        setTimeout(()=>lvlDiv.remove(), 1200);
    }
}

// --- Game Over ---
function showGameOver() {
    gameOver = true;
    let overDiv = document.createElement('div');
    overDiv.id = 'game-over';
    overDiv.textContent = 'GAME OVER';
    overDiv.style.position = 'absolute';
    overDiv.style.top = '44%';
    overDiv.style.left = '50%';
    overDiv.style.transform = 'translate(-50%, -50%)';
    overDiv.style.fontSize = '64px';
    overDiv.style.color = '#e53935';
    overDiv.style.fontWeight = 'bold';
    overDiv.style.textShadow = '2px 2px 12px #000';
    overDiv.style.zIndex = 200;
    document.body.appendChild(overDiv);
}

window.onload = init;
