"use client";
import { useState, forwardRef, useImperativeHandle, useCallback, useEffect, useRef } from "react";
import Matter from 'matter-js';

const PlinkoGame = forwardRef((props, ref) => {
  const [isDropping, setIsDropping] = useState(false);
  const [ballPosition, setBallPosition] = useState(null);
  const [currentBallPosition, setCurrentBallPosition] = useState({ x: 400, y: 50 });
  const [hitPegs, setHitPegs] = useState(new Set());
  
  // Physics engine refs
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const ballRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Multiplier values for the bottom slots
  const multipliers = [
    "110", "41x", "10x", "5x", "3x", "1.5x", "1x", "0.5x", 
    "0.3x", "0.5x", "1x", "1.5x", "3x", "5x", "10x", "41x", "110"
  ];

  // Generate peg positions for triangular board
  const generatePegs = () => {
    const pegs = [];
    let pegId = 0;
    
    for (let row = 0; row < 17; row++) { // Changed to 17 to ensure 16 rows (0-16)
      const rowPegs = [];
      const pegsInRow = row + 3;
      
      for (let col = 0; col < pegsInRow; col++) {
        const totalWidth = pegsInRow * 75;
        const startX = 400 - (totalWidth / 2) + (col * 75) + 37.5;
        
        rowPegs.push({
          id: pegId++,
          row,
          col,
          x: startX,
          y: row * 55 + 100 // Start pegs lower to give ball room to drop
        });
      }
      pegs.push(rowPegs);
    }
    
    console.log(`Generated ${pegs.length} rows of pegs:`, pegs.map((row, index) => `Row ${index}: ${row.length} pegs`));
    return pegs;
  };

  const pegs = generatePegs();

  // Initialize physics engine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Events = Matter.Events;

    // Create engine
    const engine = Engine.create();
    engine.world.gravity.y = 0.9; // Balanced gravity - not too fast, not too slow
    engineRef.current = engine;

    // Create renderer
    const render = Render.create({
      element: canvasRef.current,
      engine: engine,
      options: {
        width: 800, // Match SVG width
        height: 900, // Match SVG height
        wireframes: false,
        background: 'transparent',
        showVelocity: false,
        showAngleIndicator: false,
        showDebug: false
      }
    });
    renderRef.current = render;

    // Create walls (invisible boundaries) - match SVG dimensions
    const leftWall = Bodies.rectangle(-50, 450, 20, 900, { 
      isStatic: true,
      render: { visible: false }
    });
    const rightWall = Bodies.rectangle(850, 450, 20, 900, { // Changed from 1050 to 850
      isStatic: true,
      render: { visible: false }
    });

    // Create pegs as static circles with proper physics
    const pegBodies = [];
    pegs.forEach(row => {
      row.forEach(peg => {
        const pegBody = Bodies.circle(peg.x, peg.y, 8, {
          isStatic: true,
          restitution: 0.4, // Reduced bounciness to prevent sticking
          friction: 0.2,
          render: {
            fillStyle: 'white',
            strokeStyle: 'white',
            lineWidth: 2
          }
        });
        pegBody.pegId = peg.id;
        pegBodies.push(pegBody);
      });
    });

    // Add all bodies to world (no collectors - using position detection instead)
    World.add(engine.world, [leftWall, rightWall, ...pegBodies]);

    // Collision detection for pegs and collectors
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        
        // Check if ball hit a peg
        if (ballRef.current && (bodyA === ballRef.current || bodyB === ballRef.current)) {
          const otherBody = bodyA === ballRef.current ? bodyB : bodyA;
          
          if (otherBody.pegId !== undefined) {
            setHitPegs(prev => new Set([...prev, otherBody.pegId]));
          }
        }
      });
    });

    // Start the engine
    Engine.run(engine);
    Render.run(render);

    // Animation loop to update ball position
    const updateBallPosition = () => {
      if (ballRef.current) {
        const ballX = ballRef.current.position.x;
        const ballY = ballRef.current.position.y;
        
        setCurrentBallPosition({
          x: ballX,
          y: ballY
        });
        
        // Fallback: Check if ball reached bottom without collision detection
        if (ballY > 920) {
          // Use ref to get current isDropping state
          setIsDropping(current => {
            if (current) {
              const totalSlots = 17;
              const boardWidth = 800;
              const slotWidth = boardWidth / totalSlots;
              
              // Calculate which slot the ball is in based on x position
              let slotIndex = Math.floor(ballX / slotWidth);
              
              // Clamp to valid range
              slotIndex = Math.max(0, Math.min(slotIndex, totalSlots - 1));
              
              setBallPosition(slotIndex);
              console.log(`Ball landed in slot ${slotIndex} (fallback detection) with multiplier ${multipliers[slotIndex]}`);
              
              return false; // Stop dropping
            }
            return current;
          });
        }
      }
      animationRef.current = requestAnimationFrame(updateBallPosition);
    };
    updateBallPosition();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      Render.stop(render);
      Engine.clear(engine);
      if (render.canvas) {
        render.canvas.remove();
      }
    };
  }, []);

  const dropBall = useCallback(() => {
    if (isDropping || !engineRef.current) return;
    
    setIsDropping(true);
    setBallPosition(null);
    setHitPegs(new Set());

    const Bodies = Matter.Bodies;
    const World = Matter.World;

    // Remove existing ball if any
    if (ballRef.current) {
      World.remove(engineRef.current.world, ballRef.current);
    }

    // Create new ball with proper physics properties - start at center top
    const ball = Bodies.circle(400, 50, 12, { // 400 is center of 800 width
      restitution: 0.4, // Slightly more bounce for natural movement
      friction: 0.1, // Reduced surface friction
      frictionAir: 0.008, // Increased air resistance to slow down fall
      density: 0.008, // Slightly reduced mass for smoother movement
      render: {
        fillStyle: '#ff6b6b',
        strokeStyle: '#ff6b6b',
        lineWidth: 2
      }
    });

    ballRef.current = ball;
    World.add(engineRef.current.world, ball);

    // Add small random horizontal velocity to prevent sticking
    const randomVelocity = (Math.random() - 0.5) * 2; // Random between -1 and 1
    Matter.Body.setVelocity(ball, { x: randomVelocity, y: 0 });

    // Reset ball position state to match starting position
    setCurrentBallPosition({ x: 400, y: 50 });
  }, [isDropping]);

  // Expose dropBall function to parent component
  useImperativeHandle(ref, () => ({
    dropBall
  }), [dropBall]);

  // Generate gradient colors for multiplier slots - exactly as in image
  const getSlotColor = (index) => {
    const totalSlots = multipliers.length;
    const centerIndex = Math.floor(totalSlots / 2);
    const distanceFromCenter = Math.abs(index - centerIndex);
    const maxDistance = centerIndex;
    
    if (index === 0 || index === totalSlots - 1) {
      return "from-pink-500 to-red-500"; // Outermost slots - pink/red
    } else if (index === centerIndex) {
      return "from-blue-500 to-purple-500"; // Center slot - blue/purple
    } else {
      // Gradient from pink/red at edges to blue/purple at center
      const ratio = distanceFromCenter / maxDistance;
      if (ratio > 0.7) {
        return "from-pink-500 to-purple-500";
      } else if (ratio > 0.4) {
        return "from-purple-500 to-blue-500";
      } else {
        return "from-blue-500 to-purple-500";
      }
    }
  };

  return (
    <div className="bg-[#1A0015] rounded-xl border border-[#333947] p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white">Plinko Board</h2>
        <p className="text-gray-400 text-sm mt-1">
          Use the bet button on the left to start the game
        </p>
      </div>

      {/* Plinko Board Container */}
      <div className="relative bg-[#2A0025] rounded-lg p-6 min-h-[1000px] flex flex-col items-center">
        {/* Physics Canvas Container */}
        <div className="relative w-full max-w-7xl">
          {/* Matter.js Canvas - Hidden but running physics */}
          <div 
            ref={canvasRef} 
            className="absolute inset-0 opacity-0 pointer-events-none"
            style={{ zIndex: -1 }}
          />
          
          {/* Visual SVG Overlay */}
          <svg className="w-full h-[900px]" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid meet">
            {/* Draw pegs */}
            {pegs.map((row, rowIndex) =>
              row.map((peg) => (
                <circle
                  key={peg.id}
                  cx={peg.x}
                  cy={peg.y}
                  r="8"
                  fill={hitPegs.has(peg.id) ? "#ffd700" : "white"}
                  className={`drop-shadow-sm transition-all duration-300 ${
                    hitPegs.has(peg.id) ? "animate-pulse" : ""
                  }`}
                  style={{
                    filter: hitPegs.has(peg.id) 
                      ? "drop-shadow(0 0 15px #ffd700) brightness(1.5)" 
                      : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                  }}
                />
              ))
            )}
            
            {/* Ball visualization */}
            {isDropping && currentBallPosition.y <= 950 && (
              <circle
                cx={currentBallPosition.x}
                cy={currentBallPosition.y}
                r="12"
                fill="#ff6b6b"
                className="drop-shadow-lg"
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(255, 107, 107, 0.8))',
                  transition: 'none' // Let physics handle movement
                }}
              />
            )}
            

          </svg>

          {/* Multiplier Slots */}
          <div className="flex justify-between mt-8 px-4 max-w-7xl mx-auto">
            {multipliers.map((multiplier, index) => (
              <div
                key={index}
                className={`text-center transition-all ${
                  ballPosition === index && !isDropping
                    ? "text-yellow-400 font-bold scale-110"
                    : "text-white"
                }`}
              >
                <div className={`w-16 h-12 rounded-lg bg-gradient-to-r ${getSlotColor(index)} flex items-center justify-center mb-3 shadow-lg ${
                  ballPosition === index && !isDropping ? 'ring-4 ring-yellow-400' : ''
                }`}>
                  <span className="text-sm font-bold text-white">{multiplier}</span>
                </div>
                <div className={`w-16 h-3 rounded-full ${
                  ballPosition === index && !isDropping
                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                    : "bg-[#333947]"
                }`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Game Instructions */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>Use the bet button on the left to start the game</p>
          <p className="mt-1">The ball will bounce off pegs with realistic physics</p>
        </div>
      </div>

      {/* Game Stats */}
      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-xs text-gray-400">Games Played</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">0.00x</div>
          <div className="text-xs text-gray-400">Best Multiplier</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white">$0.00</div>
          <div className="text-xs text-gray-400">Total Won</div>
        </div>
      </div>
    </div>
  );
});

PlinkoGame.displayName = 'PlinkoGame';

export default PlinkoGame;
