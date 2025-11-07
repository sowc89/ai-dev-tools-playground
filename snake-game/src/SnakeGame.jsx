import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// SnakeGame.jsx
// Single-file React component for a playable Snake game.
// - Tailwind CSS for styling
// - touch swipe controls for mobile
// - keyboard controls for desktop
// - adjustable speed
// - pause / start / reset
// - high score persisted to localStorage

export default function SnakeGame() {
  // Config
  const GRID_SIZE = 20; // number of cells per row/column
  const CELL_SIZE = 20; // px per cell
  const CANVAS_SIZE = GRID_SIZE * CELL_SIZE; // canvas px

  // Refs
  const canvasRef = useRef(null);
  const touchStartRef = useRef(null);

  // Game state
  const [snake, setSnake] = useState(() => [
    { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) },
  ]);
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [food, setFood] = useState(() => randomFoodPosition());
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(8); // ticks per second
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const v = localStorage.getItem("snake_high_score");
    return v ? Number(v) : 0;
  });

  // Helpers
  function randomFoodPosition(exclude = []) {
    while (true) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      if (!exclude.some((p) => p.x === x && p.y === y)) return { x, y };
    }
  }

  function positionsEqual(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function oppositeDirection(d1, d2) {
    return d1.x + d2.x === 0 && d1.y + d2.y === 0;
  }

  // Input handlers
  useEffect(() => {
    function onKey(e) {
      if (!running) return;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        setDirection((prev) => (!oppositeDirection(prev, { x: 0, y: -1 }) ? { x: 0, y: -1 } : prev));
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        setDirection((prev) => (!oppositeDirection(prev, { x: 0, y: 1 }) ? { x: 0, y: 1 } : prev));
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        setDirection((prev) => (!oppositeDirection(prev, { x: -1, y: 0 }) ? { x: -1, y: 0 } : prev));
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        setDirection((prev) => (!oppositeDirection(prev, { x: 1, y: 0 }) ? { x: 1, y: 0 } : prev));
      } else if (e.key === " ") {
        // space toggles pause
        setRunning((r) => !r);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running]);

  // Touch controls: simple swipe detection
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    function handleTouchStart(e) {
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    }

    function handleTouchEnd(e) {
      if (!touchStartRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const absx = Math.abs(dx);
      const absy = Math.abs(dy);
      const threshold = 20; // min px to count as swipe
      if (Math.max(absx, absy) < threshold) return;
      if (absx > absy) {
        // horizontal
        if (dx > 0) setDirection((p) => (!oppositeDirection(p, { x: 1, y: 0 }) ? { x: 1, y: 0 } : p));
        else setDirection((p) => (!oppositeDirection(p, { x: -1, y: 0 }) ? { x: -1, y: 0 } : p));
      } else {
        if (dy > 0) setDirection((p) => (!oppositeDirection(p, { x: 0, y: 1 }) ? { x: 0, y: 1 } : p));
        else setDirection((p) => (!oppositeDirection(p, { x: 0, y: -1 }) ? { x: 0, y: -1 } : p));
      }
      touchStartRef.current = null;
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [running]);

  // Game loop
  useEffect(() => {
    if (!running || gameOver) return;
    const interval = 1000 / speed;
    const tick = setInterval(() => {
      setSnake((prev) => {
        const head = { x: prev[0].x + direction.x, y: prev[0].y + direction.y };
        // wrap-around behavior (you can change to wall collision by removing this)
        head.x = (head.x + GRID_SIZE) % GRID_SIZE;
        head.y = (head.y + GRID_SIZE) % GRID_SIZE;

        // check self collision
        if (prev.some((p) => positionsEqual(p, head))) {
          // game over
          setRunning(false);
          setGameOver(true);
          setHighScore((hs) => {
            const newHs = Math.max(hs, score);
            localStorage.setItem("snake_high_score", String(newHs));
            return newHs;
          });
          return prev;
        }

        const ateFood = positionsEqual(head, food);
        const newSnake = [head, ...prev];
        if (!ateFood) newSnake.pop();
        else {
          // generate new food avoiding snake
          setScore((s) => s + 1);
          setFood(randomFoodPosition(newSnake));
        }
        return newSnake;
      });
    }, interval);

    return () => clearInterval(tick);
  }, [running, direction, speed, food, gameOver, score]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // background
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // grid (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = i * CELL_SIZE;
      // vertical
      ctx.beginPath();
      ctx.moveTo(pos + 0.5, 0);
      ctx.lineTo(pos + 0.5, CANVAS_SIZE);
      ctx.stroke();
      // horizontal
      ctx.beginPath();
      ctx.moveTo(0, pos + 0.5);
      ctx.lineTo(CANVAS_SIZE, pos + 0.5);
      ctx.stroke();
    }

    // draw food
    ctx.fillStyle = "#ef4444"; // red-500
    drawCell(ctx, food.x, food.y, CELL_SIZE);

    // draw snake
    for (let i = 0; i < snake.length; i++) {
      const p = snake[i];
      const t = i === 0 ? 1 : 0.85 - Math.min(0.6, i / 40);
      ctx.globalAlpha = t;
      ctx.fillStyle = i === 0 ? "#f59e0b" : "#10b981"; // head: amber-500, body: emerald-500
      drawCell(ctx, p.x, p.y, CELL_SIZE, 3);
    }
    ctx.globalAlpha = 1;
  }, [snake, food]);

  function drawCell(ctx, x, y, size, radius = 2) {
    const px = x * size;
    const py = y * size;
    const r = radius;
    const w = size;
    const h = size;
    ctx.beginPath();
    ctx.moveTo(px + r, py);
    ctx.lineTo(px + w - r, py);
    ctx.quadraticCurveTo(px + w, py, px + w, py + r);
    ctx.lineTo(px + w, py + h - r);
    ctx.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
    ctx.lineTo(px + r, py + h);
    ctx.quadraticCurveTo(px, py + h, px, py + h - r);
    ctx.lineTo(px, py + r);
    ctx.quadraticCurveTo(px, py, px + r, py);
    ctx.closePath();
    ctx.fill();
  }

  // Controls
  function handleStart() {
    if (gameOver) {
      resetGame();
    }
    setRunning(true);
    setGameOver(false);
  }

  function handlePause() {
    setRunning(false);
  }

  function resetGame() {
    setSnake([{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]);
    setDirection({ x: 1, y: 0 });
    setFood(randomFoodPosition());
    setScore(0);
    setGameOver(false);
    setRunning(false);
  }

  // quick UI helpers
  function small() {
    return "px-3 py-1 text-sm rounded-md";
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-semibold">Snake — React + Tailwind</h1>
          <p className="text-sm text-slate-400">Use arrows / WASD or swipe. Wrap-around board. High score saved locally.</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-300">Score</div>
          <div className="text-xl font-bold">{score}</div>
          <div className="text-xs text-slate-400">High: {highScore}</div>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-2xl shadow-md grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 flex flex-col items-center">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="rounded-lg border border-slate-700 touch-none"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
          />

          <div className="flex gap-2 mt-3">
            {!running ? (
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleStart} className={`${small()} bg-amber-500 text-slate-900`}>Start</motion.button>
            ) : (
              <motion.button whileTap={{ scale: 0.96 }} onClick={handlePause} className={`${small()} bg-slate-700 text-slate-200`}>Pause</motion.button>
            )}
            <motion.button whileTap={{ scale: 0.96 }} onClick={resetGame} className={`${small()} bg-slate-700`}>Reset</motion.button>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setSnake((s) => {
                  const newSnake = [...s];
                  // quick cheat: grow snake by 2
                  newSnake.push({ ...newSnake[newSnake.length - 1] });
                  newSnake.push({ ...newSnake[newSnake.length - 1] });
                  return newSnake;
                });
              }}
              className={`${small()} bg-slate-700`}
            >
              Grow
            </motion.button>
          </div>
        </div>

        <div className="p-3 bg-slate-900 rounded-xl flex flex-col gap-3">
          <div>
            <label className="text-xs text-slate-400">Speed: {speed} ticks/s</label>
            <input
              type="range"
              min={3}
              max={20}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>

          <div>
            <div className="text-xs text-slate-400">Controls</div>
            <div className="mt-2 text-sm text-slate-200 grid grid-cols-3 gap-2">
              <button onClick={() => setDirection((p) => (!oppositeDirection(p, { x: 0, y: -1 }) ? { x: 0, y: -1 } : p))} className="py-2 rounded-md bg-slate-800">↑</button>
              <button onClick={() => setDirection((p) => (!oppositeDirection(p, { x: 0, y: 1 }) ? { x: 0, y: 1 } : p))} className="py-2 rounded-md bg-slate-800">↓</button>
              <button onClick={() => setDirection((p) => (!oppositeDirection(p, { x: -1, y: 0 }) ? { x: -1, y: 0 } : p))} className="py-2 rounded-md bg-slate-800">←</button>
              <button onClick={() => setDirection((p) => (!oppositeDirection(p, { x: 1, y: 0 }) ? { x: 1, y: 0 } : p))} className="py-2 rounded-md bg-slate-800">→</button>
              <button onClick={() => setRunning((r) => !r)} className="py-2 rounded-md bg-slate-800">Toggle</button>
              <button onClick={() => { localStorage.setItem("snake_high_score", "0"); setHighScore(0); }} className="py-2 rounded-md bg-slate-800">Reset High</button>
            </div>
          </div>

          {gameOver && (
            <div className="mt-2 p-3 bg-red-900 text-white rounded-md text-center">
              <div className="font-semibold">Game Over</div>
              <div>Score: {score}</div>
              <div className="mt-2 flex gap-2 justify-center">
                <button onClick={resetGame} className="px-3 py-1 rounded bg-slate-700">Try again</button>
                <button onClick={() => { setRunning(true); setGameOver(false); }} className="px-3 py-1 rounded bg-amber-500 text-slate-900">Restart</button>
              </div>
            </div>
          )}

          <div className="text-xs text-slate-400">Tips</div>
          <ul className="text-sm text-slate-300 list-disc list-inside">
            <li>Use keyboard arrows or swipe on mobile.</li>
            <li>Board wraps around edges. Toggle by editing code if you prefer wall collisions.</li>
            <li>Speed increases ticks per second — higher is harder.</li>
          </ul>
        </div>
      </div>

      <div className="text-xs text-slate-500 mt-3">Built with React + Tailwind. Feel free to copy this component into your app (e.g. /components/SnakeGame.jsx) and import it in a page.</div>
    </div>
  );
}
