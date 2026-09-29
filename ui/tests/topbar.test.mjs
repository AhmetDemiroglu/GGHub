import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Module } from "node:module";
import ts from "typescript";

function load(name) {
    const filename = fileURLToPath(new URL("../src/core/components/base/" + name + ".ts", import.meta.url));
    const loaded = new Module(filename);
    loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, filename);
    return loaded.exports;
}
const { TopbarPhysics } = load("topbar-physics");
const { buildTopbarOutline } = load("topbar-outline");
const step = (physics, scroll, mobile = false, reduced = false, dt = 1 / 60, width = 1280) =>
    physics.step(scroll, dt, mobile, reduced, width);
function settle(physics, scroll, mobile = false) {
    let state;
    for (let i = 0; i < 360; i++) {
        state = step(physics, scroll, mobile);
        if (state.settled) return state;
    }
    assert.fail("Animation did not settle in six seconds");
}

test("A fast flick still stretches, breaks once, recoils and settles", () => {
    const physics = new TopbarPhysics();
    const first = step(physics, 600);
    assert.equal(first.floating, false);
    assert.ok(first.peel > 0 && first.peel < 0.1);
    let breaks = 0;
    let wasFloating = false;
    let maxTop = 0;
    let maxInset = 0;
    let minNeck = 56;
    for (let frame = 0; frame < 150; frame++) {
        const state = step(physics, 600);
        if (state.floating && !wasFloating) breaks++;
        wasFloating = state.floating;
        maxTop = Math.max(maxTop, state.top);
        maxInset = Math.max(maxInset, state.inset);
        if (!state.floating) minNeck = Math.min(minNeck, state.neck);
        assert.ok(state.top >= 0 && state.top + state.height < 104);
        assert.ok(state.inset >= 0);
    }
    assert.equal(breaks, 1);
    assert.ok(minNeck < 6, "strand thins before it breaks");
    assert.ok(maxTop > 26 && maxTop < 36, "body is thrown down after the break");
    assert.ok(maxInset > 67, "ends recoil inward");
    const final = settle(physics, 600);
    assert.equal(final.top, 8);
    assert.equal(final.inset, 12);
    assert.equal(final.height, 48);
    assert.equal(final.morph, 1);
    assert.equal(final.stub, 1);
    assert.equal(final.tether, 0);
    assert.equal(final.lens, 1);
});

test("Slow pulling stays glued to the walls and reverses without breaking", () => {
    const physics = new TopbarPhysics();
    const pulled = settle(physics, 40);
    assert.equal(pulled.floating, false);
    assert.equal(pulled.morph, 0);
    assert.equal(pulled.tether, 1);
    assert.ok(pulled.top > 10 && pulled.inset > 20);
    assert.ok(pulled.neck < pulled.wall && pulled.wall < pulled.height);
    const home = settle(physics, 0);
    assert.equal(home.top, 0);
    assert.equal(home.inset, 0);
    assert.equal(home.height, 56);
    assert.equal(home.glass, 0);
});

test("Threshold jitter does not repeat the break; returning home rearms it", () => {
    const physics = new TopbarPhysics();
    settle(physics, 100);
    for (const scroll of [71, 73, 30, 8, 3, 45, 73]) assert.equal(step(physics, scroll).floating, true);
    const home = settle(physics, -30);
    assert.equal(home.floating, false);
    assert.equal(home.top, 0);
    assert.equal(home.inset, 0);
    assert.equal(step(physics, 200).floating, false);
    assert.equal(settle(physics, 200).floating, true);
});

test("Continuous scroll keeps a rigid capsule that barely moves", () => {
    const physics = new TopbarPhysics(500);
    for (let i = 0; i < 180; i++) {
        const state = step(physics, 500 + i * 80);
        assert.equal(state.morph, 1);
        assert.equal(state.inset, 12);
        assert.equal(state.height, 48);
        assert.equal(state.radius, 24);
        assert.ok(state.top >= 7.9 && state.top < 9.3);
    }
    assert.equal(settle(physics, 15000).top, 8);
});

test("Mobile, restored scroll, reduced motion and paused frames remain bounded", () => {
    const physics = new TopbarPhysics(500);
    assert.equal(step(physics, 500, true).floating, true);
    const mobile = settle(physics, 500, true);
    assert.equal(mobile.top, 6);
    assert.equal(mobile.inset, 8);
    const reduced = new TopbarPhysics();
    const state = step(reduced, 500, true, true);
    assert.equal(state.top, 6);
    assert.equal(state.morph, 1);
    assert.equal(state.lens, 1);
    assert.equal(step(reduced, -30, true, true).top, 0);
    const paused = new TopbarPhysics();
    for (let i = 0; i < 60; i++) {
        const frame = step(paused, 1000, false, false, 2);
        assert.ok(Number.isFinite(frame.top) && frame.top >= 0 && frame.top < 40);
        assert.ok(Number.isFinite(frame.inset) && frame.inset >= 0 && frame.inset < 100);
    }
});

test("Outline stays inside the header at every frame and width", () => {
    for (const width of [1, 320, 390, 768, 1440, 2560]) {
        const physics = new TopbarPhysics();
        for (let frame = 0; frame < 200; frame++) {
            const scroll = frame < 100 ? frame : frame < 170 ? 400 : 0;
            const state = step(physics, scroll, width < 768, false, 1 / 60, width);
            const { fill, rim } = buildTopbarOutline({ ...state, width });
            assert.ok(fill.endsWith("Z"));
            assert.ok(!/NaN|Infinity/.test(fill + rim));
            for (const [, x, y] of fill.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) {
                assert.ok(Number(x) >= -0.01 && Number(x) <= width + 0.01);
                assert.ok(Number(y) >= -0.01 && Number(y) <= 104);
            }
            // Wall contact is never stroked while the strands are attached.
            if (state.morph === 0) assert.ok(!rim.includes("Z"));
        }
    }
});
