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
const step = (physics, scroll, mobile = false, reduced = false, dt = 1 / 60) => physics.step(scroll, dt, mobile, reduced);
function settle(physics, scroll, mobile = false) {
    let state;
    for (let i = 0; i < 240; i++) {
        state = step(physics, scroll, mobile);
        if (state.settled) return state;
    }
    assert.fail("Animation did not settle in four seconds");
}

test("A fast flick preserves the adhesive pull, then releases and settles", () => {
    const physics = new TopbarPhysics();
    const first = step(physics, 600);
    assert.equal(first.floating, false);
    assert.ok(first.peel > 0 && first.peel < 0.1);
    let releaseCount = 0;
    let wasFloating = false;
    let maxTop = 0;
    for (let frame = 0; frame < 120; frame++) {
        const state = step(physics, 600);
        if (state.floating && !wasFloating) releaseCount++;
        wasFloating = state.floating;
        maxTop = Math.max(maxTop, state.top);
        assert.ok(state.top >= 0 && state.top + state.height < 104);
    }
    assert.equal(releaseCount, 1);
    assert.ok(maxTop > 24 && maxTop < 29);
    const final = settle(physics, 600);
    assert.ok(Math.abs(final.top - 8) < 0.02);
    assert.equal(final.tether, 0);
    assert.equal(final.lens, 1);
});

test("Slow peeling stays anchored and reverses without snapping", () => {
    const physics = new TopbarPhysics();
    const pulled = settle(physics, 36);
    assert.equal(pulled.floating, false);
    assert.equal(pulled.tether, 1);
    assert.ok(pulled.top > 15);
    const home = settle(physics, 0);
    assert.equal(home.top, 0);
    assert.equal(home.peel, 0);
    assert.equal(home.radius, 0);
});

test("Threshold jitter does not repeat the snap; returning home rearms it", () => {
    const physics = new TopbarPhysics();
    settle(physics, 100);
    for (const scroll of [47, 49, 30, 8, 3, 45, 49]) assert.equal(step(physics, scroll).floating, true);
    const home = settle(physics, -30);
    assert.equal(home.floating, false);
    assert.equal(home.top, 0);
    assert.equal(step(physics, 200).floating, false);
    assert.equal(settle(physics, 200).floating, true);
});

test("Continuous scroll only moves the capsule by a tiny amount", () => {
    const physics = new TopbarPhysics(500);
    for (let i = 0; i < 180; i++) {
        const state = step(physics, 500 + i * 80);
        assert.equal(state.tether, 0);
        assert.equal(state.height, 48);
        assert.equal(state.radius, 24);
        assert.ok(state.top >= 7.9 && state.top < 9.3);
    }
    assert.ok(Math.abs(settle(physics, 15000).top - 8) < 0.03);
});

test("Mobile, restored scroll, reduced motion and paused frames remain bounded", () => {
    const physics = new TopbarPhysics(500);
    assert.equal(step(physics, 500).floating, true);
    assert.ok(Math.abs(settle(physics, 500, true).top - 6) < 0.03);
    const reduced = new TopbarPhysics();
    const state = step(reduced, 500, true, true);
    assert.equal(state.top, 6);
    assert.equal(state.tether, 0);
    assert.equal(state.lens, 1);
    assert.equal(step(reduced, -30, true, true).top, 0);
    for (let i = 0; i < 60; i++) {
        const paused = step(physics, 1000, false, false, 2);
        assert.ok(Number.isFinite(paused.top) && paused.top >= 0 && paused.top < 30);
    }
});

test("Outline uses smooth corners and remains valid at every peel and narrow width", () => {
    for (const width of [1, 320, 390, 768, 1440, 2560]) {
        const physics = new TopbarPhysics();
        for (let frame = 0; frame < 100; frame++) {
            const state = step(physics, frame, width < 768);
            const path = buildTopbarOutline({ ...state, width });
            assert.ok(path.endsWith("Z"));
            assert.ok(!/NaN|Infinity/.test(path));
            assert.equal((path.match(/A/g) || []).length, 4);
            if (state.tether === 0) assert.ok(!path.includes("C"));
        }
    }
});
