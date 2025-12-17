export function makePanda(k) {
    const panda = k.add([
        k.sprite("panda"),
        k.pos(200, k.height() - 150),
        k.area(), // Use default rect collision for now, can fine-tune later
        k.body(),
        k.anchor("center"),
        k.scale(0.15), // Adjust scale based on sprite size
        "panda",
        {
            isCrying: false,
            speedMultiplier: 1.0,

            setSpeedEffect(type) {
                if (type === "fast") {
                    this.speedMultiplier = 1.2;
                    this.isCrying = false;
                    this.color = k.WHITE;
                } else if (type === "slow") {
                    this.speedMultiplier = 0.8;
                    this.isCrying = true;
                    this.color = k.rgb(200, 200, 255); // Blue-ish tint for sadness
                } else {
                    this.speedMultiplier = 1.0;
                    this.isCrying = false;
                    this.color = k.WHITE;
                }
            },

            resetEffect() {
                this.speedMultiplier = 1.0;
                this.isCrying = false;
                this.color = k.WHITE;
            }
        }
    ]);

    // Jump
    k.onKeyPress("space", () => {
        if (panda.isGrounded()) {
            panda.jump(800);
        }
    });

    // Mouse click jump
    k.onMousePress(() => {
        if (panda.isGrounded()) {
            panda.jump(800);
        }
    });

    // Variable Jump Height (Short Hop)
    // If key/mouse is released while moving up, cut the velocity
    k.onKeyRelease("space", () => {
        if (panda.vel.y < 0) { // "Up" is negative Y in 2D
            panda.vel.y *= 0.5; // Damping factor
        }
    });

    k.onMouseRelease(() => {
        if (panda.vel.y < 0) {
            panda.vel.y *= 0.5;
        }
    });

    return panda;
}
