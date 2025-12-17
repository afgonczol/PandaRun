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
k.loadSprite("panda", "sprites/panda.png");
k.loadSprite("bamboo", "sprites/bamboo.png");
k.loadSprite("pie", "sprites/pie.png");
k.loadSprite("cake", "sprites/cake.png");
k.loadSprite("onion", "sprites/onion.png");
k.loadSprite("ground", "sprites/ground.png");

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

    // Physics
    k.setGravity(1600);

    // --- Dynamic Ground & Gap System ---

    // Config
    const GROUND_Y = k.height() - 40;
    const TILE_WIDTH = 1280; // Assuming the new ground sprite is substantial, or we repeat it
    // If sprite is small, we need more. Let's assume user ground is like a block.
    // If we want random gaps, we should spawn smaller blocks.
    // Let's assume specific block width for logic.
    const BLOCK_WIDTH = 200;

    let nextGroundX = 0;

    // We will spawn ground blocks continuously
    function spawnGroundBlock(x) {
        k.add([
            k.sprite("ground"), // Use the sprite!
            k.pos(x, GROUND_Y),
            k.area(),
            k.body({ isStatic: true }),
            k.scale(0.5), // Scale down logic
            k.anchor("botleft"), // Anchor for easier alignment
            "ground",
            "obstacle_mover"
        ]);
        // Also add a rect collider fallback if sprite is weird? 
        // kaplay sprite area() auto-generates from image size.
    }

    // Initial buffer of ground
    for (let i = 0; i < 10; i++) {
        spawnGroundBlock(nextGroundX);
        nextGroundX += BLOCK_WIDTH;
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

            // Cleanup logic
            if (obj.pos.x < -BLOCK_WIDTH * 2) {
                k.destroy(obj);
            }
        });

        // Ground Spawning Logic
        // We track 'nextGroundX' in WORLD space, but since world moves left, 
        // effectively we need to see if the rightmost ground is coming onto screen?
        // Actually, simpler:
        // 'nextGroundX' is relative to SCREEN logic if we spawn continuously?
        // No, simplest is: Check the right-most ground block.
        // If its X pos < k.width() + buffer, spawn new one.

        // Find the rightmost ground
        let rightmostX = -99999;
        const grounds = k.get("ground");

        if (grounds.length > 0) {
            grounds.forEach(g => {
                if (g.pos.x > rightmostX) rightmostX = g.pos.x;
            });
        } else {
            // Check if we just fell into a gap and no ground is left, 
            // or if we need to restart spawning? 
            rightmostX = -BLOCK_WIDTH; // Fallback to restart
        }

        // If we have space on the right, spawn!
        if (rightmostX < k.width() + BLOCK_WIDTH) {
            // Chance for a GAP
            // Only spawn gap if we aren't already in one (logic handled by just skipping X)
            // And maybe don't spawn gap immediately at start (handled by initial buffer)

            if (k.chance(0.2)) { // 20% chance of gap
                // Gap size = 1 or 2 blocks
                const gapSize = k.choose([1, 1.5, 2]);
                rightmostX += BLOCK_WIDTH * gapSize;
                // Don't spawn visual ground, just advance X
            }

            // Spawn next block at new X
            spawnGroundBlock(rightmostX + BLOCK_WIDTH); // Actually this logic is slightly flawed due to moving reference frame.
            // Correct approach with moving frame:
            // We just need to add a new block at k.width() when the previous one moves inside?
            // Actually, simplest is: Spawn at fixed offset from *last spawned block*.
            // Since last block is moving, we can't store static nextGroundX.
            // We must reference the 'rightmostX' of the actual entities.
        }

        // --- Game Over Conditions ---

        // 1. Time
        ui.timerLabel.time -= k.dt();
        if (ui.timerLabel.time <= 0) {
            k.go("gameover", Math.floor(score));
        }

        // 2. Fall
        if (panda.pos.y > k.height()) {
            k.shake(20);
            k.go("gameover", Math.floor(score));
        }

        // Keep Panda fixed horizontally (counter friction from moving ground)
        panda.pos.x = 200;

        // Update Score
        score += k.dt() * 10;
        ui.scoreLabel.value = score;
    });

    // Collisions

    // Pie (+Time)
    panda.onCollide("pie", (pie) => {
        k.destroy(pie);
        ui.timerLabel.time += 10;
        k.shake(5);
    });

    // Cake (Speed Boost)
    panda.onCollide("cake", (cake) => {
        k.destroy(cake);
        gameSpeed = baseSpeed * 1.5;
        panda.setSpeedEffect("fast");
        k.wait(5, () => {
            gameSpeed = baseSpeed;
            panda.resetEffect();
        });
    });

    // Onion (Slow + Cry)
    panda.onCollide("onion", (onion) => {
        k.destroy(onion);
        gameSpeed = baseSpeed * 0.5;
        panda.setSpeedEffect("slow");
        k.wait(5, () => {
            gameSpeed = baseSpeed;
            panda.resetEffect();
        });
    });

    // Bamboo (Stun/Penality)
    panda.onCollide("bamboo", (bamboo) => {
        k.destroy(bamboo);
        ui.timerLabel.time -= 5;
        k.shake(20);
        panda.color = k.RED;
        k.wait(0.2, () => panda.color = k.WHITE);
    });

    // Gap (Game Over triggered by Y check now, so explicit collision not needed unless we use "Kill Floor")
});

k.scene("gameover", (score) => {
    k.add([
        k.text("Game Over", { size: 64 }),
        k.pos(k.width() / 2, k.height() / 2 - 50),
        k.anchor("center"),
    ]);
    k.add([
        k.text(`Score: ${score}`, { size: 32 }),
        k.pos(k.width() / 2, k.height() / 2 + 50),
        k.anchor("center"),
    ]);
    k.add([
        k.text("Press SPACE to Restart", { size: 24 }),
        k.pos(k.width() / 2, k.height() / 2 + 100),
        k.anchor("center"),
    ]);
    k.onKeyPress("space", () => k.go("game"));
});

k.go("start");
