export function startSpawner(k, gameSpeed) {

    // Spawn routine
    k.loop(1.5, () => {
        // Adjust spawn rate based on game speed implies things move faster, so we spawn faster?
        // Actually, in Kaplay/Kaboom, loop time is constant unless we change it.
        // For an infinite runner, usually we spawn based on distance or time.
        // Let's use a randomized wait for variability.

        const type = k.choose(["bamboo", "bamboo", "pie", "cake", "onion"]);

        spawnEntity(k, type);
    });
}

function spawnEntity(k, type) {
    // Entities move left speed = current game speed
    // We need to access global game speed which might be variable.
    // For now, let's just use a fixed definition and update movement in the main loop or component.

    if (type === "gap") {
        // Gap is a bit special, it's a hole in the ground.
        // We'll spawn a "gap" object that is just a wide invisible trigger or visual pit
        // But visuals are tricky with a scrolling ground.
        // EASIER STRATEGY: Spawn a "Gap" entity which is effectively a "Kill Floor" on the ground layer?
        // Actually, standard runner 'gaps' are absences of ground.
        // If we simply have a scrolling ground, we can't easily "delete" a chunk of it without more complex logic.
        // ALTERNATIVE: Spawn a "Pit" object that sits ON TOP of the ground and looks like a hole, and if you touch it, you die.
        k.add([
            k.rect(100, 20), // Visual representation (replace with sprite if available)
            k.pos(k.width(), k.height() - 40), // Roughly ground level
            k.color(0, 0, 0),
            k.area(),
            k.move(k.LEFT, 0), // Speed will be set by the game controller
            "gap",
            "obstacle_mover" // Tag to identify things that move with the world
        ]);
    } else {
        // Pickups and Bamboo
        let spriteName = type;
        let yPos = k.height() - 100; // Ground level
        let scale = 0.12;

        if (type === "bamboo") {
            yPos = k.height() - 120;
            scale = 0.15;
        } else {
            // Pickups might be slightly higher to jump for? Or on ground?
            // Let's vary it
            if (k.chance(0.5)) yPos -= 100; // Floating pickup
        }

        k.add([
            k.sprite(spriteName),
            k.pos(k.width(), yPos),
            k.area(),
            k.anchor("center"),
            k.scale(scale),
            k.move(k.LEFT, 0), // Speed handled by game controller
            k.rotate(0), // Enable rotation
            {
                startY: yPos,
                baseScale: scale,
                update() {
                    // Bobbing (All items bob?)
                    // User didn't say stop bobbing, just changed rotation.
                    // "For the collectables, please animate by rotating and bobbing." (Previous)
                    // "Instead of spinning... rotate back and forth... bamboo... size vary" (Current)
                    // I will keep bobbing for collectables, maybe not for bamboo?
                    // Usually obstacles don't bob floatingly unless they are flying. Bamboo is ground based.
                    // Let's assume Bamboo is static position, Items bob.

                    const t = k.time() * 5;

                    if (spriteName === "bamboo") {
                        // Bamboo: Scale pulse +/- 5%
                        const pulse = Math.sin(t) * 0.05;
                        this.scale = k.vec2(this.baseScale * (1 + pulse));
                    } else if (spriteName !== "gap") {
                        // Collectables: Bob + Swing
                        this.pos.y = this.startY + Math.sin(t) * 10;
                        // Swing +/- 15 degrees
                        this.angle = Math.sin(t) * 15;
                    }
                }
            },
            type, // Tag for collision
            "obstacle_mover"
        ]);
    }
}
