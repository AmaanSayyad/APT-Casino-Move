"use client";
import { useState, forwardRef, useImperativeHandle, useCallback, useEffect, useRef } from "react";
import Matter from 'matter-js';

const PlinkoGame = forwardRef(({ rowCount = 16 }, ref) => {
  const [isDropping, setIsDropping] = useState(false);
  const [ballPosition, setBallPosition] = useState(null);
  const [hitPegs, setHitPegs] = useState(new Set());
  
  // Physics engine refs
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Game constants - matching the reference repo
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PADDING_X = 52;
  const PADDING_TOP = 36;
  const PADDING_BOTTOM = 28;
  const ROW_COUNT = rowCount;
  
  // Pin and ball categories for collision filtering
  const PIN_CATEGORY = 0x0001;
  const BALL_CATEGORY = 0x0002;

  // Multiplier values for the bottom slots (17 bins)
  const multipliers = [
    "1000x", "130x", "26x", "9x", "4x", "2x", "0.2x", "0.2x", "0.2x", 
    "0.2x", "0.2x", "2x", "4x", "9x", "26x", "130x", "1000x"
  ];

  // Ball friction parameters by row count (from reference repo)
  const ballFrictions = {
    friction: 0.5,
    frictionAir: 0.0364, // For 16 rows
  };

  // Calculate pin distance and radius
  const getPinDistanceX = () => {
    const lastRowPinCount = 3 + ROW_COUNT - 1; // 18 pins in last row
    return (CANVAS_WIDTH - PADDING_X * 2) / (lastRowPinCount - 1);
  };

  const getPinRadius = () => {
    return (24 - ROW_COUNT) / 2; // 4px for 16 rows
  };

  // Generate pins with exact positioning from reference repo
  const generatePins = () => {
    const pins = [];
    const pinsLastRowXCoords = [];
    let pegId = 0;
    
    const pinDistanceX = getPinDistanceX();
    
    for (let row = 0; row < ROW_COUNT; row++) {
      const rowY = PADDING_TOP + ((CANVAS_HEIGHT - PADDING_TOP - PADDING_BOTTOM) / (ROW_COUNT - 1)) * row;
      const rowPaddingX = PADDING_X + ((ROW_COUNT - 1 - row) * pinDistanceX) / 2;
      const pinsInRow = 3 + row;
      
      for (let col = 0; col < pinsInRow; col++) {
        const colX = rowPaddingX + ((CANVAS_WIDTH - rowPaddingX * 2) / (pinsInRow - 1)) * col;
        
        pins.push({
          id: pegId++,
          row,
          col,
          x: colX,
          y: rowY
        });
        
        // Store last row x coordinates for bin detection
        if (row === ROW_COUNT - 1) {
          pinsLastRowXCoords.push(colX);
        }
      }
    }
    
    return { pins, pinsLastRowXCoords };
  };

  const { pins, pinsLastRowXCoords } = generatePins();

  // Initialize physics engine
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Events = Matter.Events;
    const Composite = Matter.Composite;

    // Create engine
    const engine = Engine.create({
      timing: {
        timeScale: 1,
      },
    });
    engineRef.current = engine;

    // Create renderer
    const render = Render.create({
      element: canvasRef.current,
      engine: engine,
      options: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        wireframes: false,
        background: 'transparent',
        showVelocity: false,
        showAngleIndicator: false,
        showDebug: false
      }
    });
    renderRef.current = render;

    // Create pins as static circles
    const pegBodies = [];
    pins.forEach(pin => {
      const pegBody = Bodies.circle(pin.x, pin.y, getPinRadius(), {
        isStatic: true,
        render: {
          fillStyle: 'white',
        },
        collisionFilter: {
          category: PIN_CATEGORY,
          mask: BALL_CATEGORY,
        },
      });
      pegBody.pegId = pin.id;
      pegBodies.push(pegBody);
    });

    // Create walls (slanted guard rails like in reference repo)
    const firstPinX = pins[0].x;
    const leftWallAngle = Math.atan2(
      firstPinX - pinsLastRowXCoords[0],
      CANVAS_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
    );
    const leftWallX = firstPinX - (firstPinX - pinsLastRowXCoords[0]) / 2 - getPinDistanceX() * 0.25;

    const leftWall = Bodies.rectangle(
      leftWallX,
      CANVAS_HEIGHT / 2,
      10,
      CANVAS_HEIGHT,
      {
        isStatic: true,
        angle: leftWallAngle,
        render: { visible: false },
      },
    );
    
    const rightWall = Bodies.rectangle(
      CANVAS_WIDTH - leftWallX,
      CANVAS_HEIGHT / 2,
      10,
      CANVAS_HEIGHT,
      {
        isStatic: true,
        angle: -leftWallAngle,
        render: { visible: false },
      },
    );

    // Create sensor at bottom for bin detection
    const sensor = Bodies.rectangle(
      CANVAS_WIDTH / 2,
      CANVAS_HEIGHT,
      CANVAS_WIDTH,
      10,
      {
        isSensor: true,
        isStatic: true,
        render: { visible: false },
      },
    );

    // Add all bodies to world
    World.add(engine.world, [...pegBodies, leftWall, rightWall, sensor]);

    // Collision detection
    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        
        // Check if ball hit a peg
        if (bodyA.pegId !== undefined || bodyB.pegId !== undefined) {
          const pegBody = bodyA.pegId !== undefined ? bodyA : bodyB;
          setHitPegs(prev => new Set([...prev, pegBody.pegId]));
        }
        
        // Check if ball hit sensor (reached bottom)
        if (bodyA === sensor || bodyB === sensor) {
          const ball = bodyA === sensor ? bodyB : bodyA;
          handleBallEnterBin(ball);
        }
      });
    });

    // Handle ball entering bin (exact logic from reference repo)
    const handleBallEnterBin = (ball) => {
      // Find which bin the ball fell into using findLastIndex logic
      const binIndex = pinsLastRowXCoords.findLastIndex((pinX) => pinX < ball.position.x);
      
      if (binIndex !== -1 && binIndex < pinsLastRowXCoords.length - 1) {
        setTimeout(() => {
          setIsDropping(false);
          setBallPosition(binIndex);
          console.log(`Ball landed in bin ${binIndex} with multiplier ${multipliers[binIndex]}`);
        }, 100);
      }
      
      // Remove ball from world
      Composite.remove(engine.world, ball);
    };

    // Start the engine
    Engine.run(engine);
    Render.run(render);

    return () => {
      if (renderRef.current) {
        Render.stop(render);
      }
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

    // Ball parameters from reference repo
    const ballOffsetRangeX = getPinDistanceX() * 0.8;
    const ballRadius = getPinRadius() * 2;
    
    // Random start position within range
    const startX = CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 2 * ballOffsetRangeX;

    const ball = Bodies.circle(startX, 0, ballRadius, {
      restitution: 0.8, // Bounciness from reference repo
      friction: ballFrictions.friction,
      frictionAir: ballFrictions.frictionAir,
      collisionFilter: {
        category: BALL_CATEGORY,
        mask: PIN_CATEGORY, // Collide with pins only, not other balls
      },
      render: {
        fillStyle: '#ff6b6b',
      },
    });

    World.add(engineRef.current.world, ball);
  }, [isDropping]);

  // Expose dropBall function to parent component
  useImperativeHandle(ref, () => ({
    dropBall
  }), [dropBall]);

  // Generate gradient colors for multiplier slots
  const getSlotColor = (index) => {
    const totalSlots = multipliers.length;
    const centerIndex = Math.floor(totalSlots / 2);
    const distanceFromCenter = Math.abs(index - centerIndex);
    const maxDistance = centerIndex;
    
    if (index === 0 || index === totalSlots - 1) {
      return "from-pink-500 to-red-500";
    } else if (index === centerIndex) {
      return "from-blue-500 to-purple-500";
    } else {
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
      <div className="relative bg-[#2A0025] rounded-lg p-6 min-h-[600px] flex flex-col items-center">
        {/* Physics Canvas Container */}
        <div className="relative w-full max-w-[800px]">
          {/* Matter.js Canvas - Visible for debugging */}
          <div 
            ref={canvasRef} 
            className="absolute inset-0 opacity-80 pointer-events-none"
            style={{ zIndex: 1 }}
          />
          
          {/* Visual SVG Overlay */}
          <svg className="w-full h-[600px] relative z-10" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
            {/* Draw pegs */}
            {pins.map((pin) => (
              <circle
                key={pin.id}
                cx={pin.x}
                cy={pin.y}
                r="6"
                fill={hitPegs.has(pin.id) ? "#ffd700" : "white"}
                className={`drop-shadow-sm transition-all duration-300 ${
                  hitPegs.has(pin.id) ? "animate-pulse" : ""
                }`}
                style={{
                  filter: hitPegs.has(pin.id) 
                    ? "drop-shadow(0 0 15px #ffd700) brightness(1.5)" 
                    : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                }}
              />
            ))}
          </svg>

          {/* Multiplier Slots */}
          <div className="flex justify-center mt-4 max-w-[800px] mx-auto">
            <div className="flex justify-between w-full px-12">
              {multipliers.map((multiplier, index) => (
                <div
                  key={index}
                  className={`text-center transition-all ${
                    ballPosition === index && !isDropping
                      ? "text-yellow-400 font-bold scale-110"
                      : "text-white"
                  }`}
                >
                  <div className={`w-10 h-7 rounded bg-gradient-to-r ${getSlotColor(index)} flex items-center justify-center mb-2 shadow-lg ${
                    ballPosition === index && !isDropping ? 'ring-2 ring-yellow-400' : ''
                  }`}>
                    <span className="text-[10px] font-bold text-white">{multiplier}</span>
                  </div>
                  <div className={`w-10 h-1 rounded-full ${
                    ballPosition === index && !isDropping
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                      : "bg-[#333947]"
                  }`}></div>
                </div>
              ))}
            </div>
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