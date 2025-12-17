export function setupUI(k) {
    // Timer
    const timerLabel = k.add([
        k.text("Time: 30", { size: 32 }),
        k.pos(24, 24),
        k.fixed(),
        {
            time: 30,
            update() {
                this.text = "Time: " + Math.ceil(this.time);
            }
        },
        "timer_ui"
    ]);

    // Score / Distance
    const scoreLabel = k.add([
        k.text("Score: 0", { size: 32 }),
        k.pos(24, 64),
        k.fixed(),
        {
            value: 0,
            update() {
                this.text = "Score: " + Math.floor(this.value);
            }
        },
        "score_ui"
    ]);

    return { timerLabel, scoreLabel };
}
