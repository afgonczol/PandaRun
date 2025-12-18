import { makePanda } from "./entities/panda.js";
import { startSpawner } from "./systems/spawner.js";
import { setupUI } from "./ui.js";



const k = kaplay({
    width: 1280,
    height: 720,
    letterbox: true,
    background: [135, 206, 235],
    debug: true,
});

// Load Assets
k.loadSprite("panda", "sprites/panda_run.png", {
    sliceX: 2,
    anims: {
        run: { from: 0, to: 1, loop: true, speed: 10 },
    },
});
k.loadSprite("bamboo", "sprites/bamboo.png");
k.loadSprite("pie", "sprites/pie.png");
k.loadSprite("cake", "sprites/cake.png");
k.loadSprite("onion", "sprites/onion.png");
k.loadSprite("ground", "sprites/ground.png");
k.loadSprite("background", "sprites/background.png");

// Load Sounds
k.loadSound("music", "sounds/music.mp3");
k.loadSound("jump", "sounds/jump.mp3");
k.loadSound("pie", "sounds/pie.mp3");
k.loadSound("cake", "sounds/cake.mp3");
k.loadSound("onion", "sounds/onion.mp3");
k.loadSound("bamboo", "sounds/bamboo.mp3");
k.loadSound("gameover", "sounds/gameover.mp3");

k.scene("start", () => {
    k.add([
        k.text("Panda Runner", { size: 64 }),
        k.pos(k.width() / 2, k.height() / 2 - 100),
        k.anchor("center"),
    ]);
    k.add([
        k.text("Press SPACE to Start", { size: 32 }),
        k.pos(k.width() / 2, k.height() / 2 + 50),
        k.anchor("center"),
    ]);
    k.onKeyPress("space", () => k.go("game"));
});

k.scene("game", () => {
    let gameSpeed = 400;
    const baseSpeed = 400;
    let score = 0;
    let speedEffectTimer = 0; // Timer for speed effects

    // Audio
    const music = k.play("music", {
        loop: true,
        volume: 0.5,
    });
    k.setGravity(1600);

    // --- Background (Parallax) ---
    // Calculate scale to fit height
    // We don't know image size yet, but Kaplay handles it. 
    // We'll spawn two images side by side.

    const bg1 = k.add([
        k.sprite("background"),
        k.pos(0, 0),
        k.scale(k.width() / 2880), // Width of background image is 2880px
        k.z(-10),
        "bg"
    ]);
    const bg2 = k.add([
        k.sprite("background"),
        k.pos(k.width(), 0), // Start adjacent
        k.scale(k.width() / 2880), // Width of background image is 2880px
        k.z(-10),
        "bg"
    ]);

    // Config
    const GROUND_Y = k.height() - 40;

    // Configurable Block Width (will be auto-detected)
    let blockWidth = 200;

    function spawnGroundBlock(x) {
        const blk = k.add([
            k.sprite("ground"),
            k.pos(x, GROUND_Y),
            k.area(),
            k.body({ isStatic: true }),
            k.scale(0.75), // Scaled down by 25% (75% of original)
            k.anchor("botleft"),
            "ground",
            "obstacle_mover"
        ]);
        return blk;
    }

    // --- Ground Initialization ---
    let nextGroundX = 0;

    // Spawn first block to measure it
    const firstBlock = spawnGroundBlock(nextGroundX);

    // Auto-detect width if available
    if (firstBlock.width && firstBlock.width > 0) {
        blockWidth = firstBlock.width * firstBlock.scale.x;
    }

    nextGroundX += blockWidth;

    // Fill screen buffer
    while (nextGroundX < k.width() + blockWidth * 2) {
        spawnGroundBlock(nextGroundX);
        nextGroundX += blockWidth;
    }

    // --- Entities ---
    const panda = makePanda(k);
    const ui = setupUI(k);

    startSpawner(k, gameSpeed);

    // Logic
    k.onUpdate(() => {
        // Move everything that should scroll
        k.get("obstacle_mover").forEach((obj) => {
            obj.move(-gameSpeed, 0);

            // Cleanup
            if (obj.pos.x < -blockWidth * 2) {
                k.destroy(obj);
            }
        });

        // Move Background
        k.get("bg").forEach((bg) => {
            // Parallax factor 0.2 (move slower than foreground)
            bg.move(-gameSpeed * 0.2, 0);

            // Loop functionality
            // Use scaled width!
            const scaledWidth = bg.width * bg.scale.x;

            if (bg.pos.x <= -scaledWidth) {
                bg.pos.x += scaledWidth * 2;
            }
        });

        // --- Endless Ground Spawning ---

        // Find the rightmost ground block
        let rightmostX = -99999;
        const grounds = k.get("ground");

        if (grounds.length > 0) {
            grounds.forEach(g => {
                if (g.pos.x > rightmostX) rightmostX = g.pos.x;
            });
        } else {
            // Fallback if all ground falls off (shouldn't happen in normal loop)
            rightmostX = -blockWidth;
        }

        // If we have exposed space on the right, spawn new ground
        if (rightmostX < k.width() + blockWidth) {

            // 20% Chance for a GAP
            if (k.chance(0.2)) {
                const gapSize = k.choose([1, 1.5, 2]); // Gap size in blocks
                rightmostX += blockWidth * gapSize;
                // Just advance X, creating empty space
            }

            // Spawn next block
            spawnGroundBlock(rightmostX + blockWidth);
        }

        // --- Game Over ---

        // 1. Time
        ui.timerLabel.time -= k.dt();
        if (ui.timerLabel.time <= 0) {
            music.paused = true;
            k.play("gameover");
            k.go("gameover", Math.floor(score));
        }

        // 2. Fall
        if (panda.pos.y > k.height()) {
            music.paused = true;
            k.play("gameover");
            k.shake(20);
            k.go("gameover", Math.floor(score));
        }

        // 3. Keep Panda fixed horizontally (counter friction)
        panda.pos.x = 200;

        // Update Score (Distance based)
        score += k.dt() * gameSpeed * 0.05;
        ui.scoreLabel.value = score;

        // Speed Effect Timer Logic
        if (speedEffectTimer > 0) {
            speedEffectTimer -= k.dt();
            if (speedEffectTimer <= 0) {
                // Revert to normal
                gameSpeed = baseSpeed;
                panda.resetEffect();
            }
        }
    });

    // --- Collisions ---

    // Pie (+Time)
    panda.onCollide("pie", (pie) => {
        k.play("pie");
        k.destroy(pie);
        ui.timerLabel.time += 10;
        k.shake(5);
    });

    // Cake (Speed Boost)
    panda.onCollide("cake", (cake) => {
        k.play("cake");
        k.destroy(cake);
        gameSpeed = baseSpeed * 1.5;
        panda.setSpeedEffect("fast");
        speedEffectTimer = 5; // Set timer
    });

    // Onion (Slow + Cry)
    panda.onCollide("onion", (onion) => {
        k.play("onion");
        k.destroy(onion);
        gameSpeed = baseSpeed * 0.5;
        panda.setSpeedEffect("slow");
        speedEffectTimer = 5; // Set timer
    });

    // Bamboo (Stun/Penalty)
    panda.onCollide("bamboo", (bamboo) => {
        k.play("bamboo");
        k.destroy(bamboo);
        ui.timerLabel.time -= 5;
        k.shake(20);
        panda.color = k.RED;
        // Don't just reset to WHITE, use updateColor to respect current state
        k.wait(0.2, () => panda.updateColor());
    });
});

k.scene("gameover", (score) => {
    k.add([
        k.text("Game Over", { size: 64 }),
        k.pos(k.width() / 2, k.height() / 2 - 100),
        k.anchor("center"),
    ]);
    k.add([
        k.text(`Score: ${score}`, { size: 32 }),
        k.pos(k.width() / 2, k.height() / 2),
        k.anchor("center"),
    ]);


    k.add([
        k.text("Press SPACE to Restart", { size: 24 }),
        k.pos(k.width() / 2, k.height() / 2 + 50),
        k.anchor("center"),
    ]);
    k.onKeyPress("space", () => k.go("game"));
});

k.go("start");
