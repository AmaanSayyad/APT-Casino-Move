"use client";
import { useState, forwardRef, useImperativeHandle, useCallback, useEffect, useRef } from "react";
import Matter from 'matter-js';

const PlinkoGame = forwardRef(({ rowCount = 16, riskLevel = "Medium", onRowChange }, ref) => {
  const [isDropping, setIsDropping] = useState(false);
  const [ballPosition, setBallPosition] = useState(null);
  const [hitPegs, setHitPegs] = useState(new Set());
  const [currentRows, setCurrentRows] = useState(rowCount);
  const [currentRiskLevel, setCurrentRiskLevel] = useState(riskLevel);
  const [isRecreating, setIsRecreating] = useState(false);
  const [betHistory, setBetHistory] = useState([]);
  
  // Physics engine refs
  const engineRef = useRef(null);
  const renderRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Watch for changes in rowCount or riskLevel props and update local state
  useEffect(() => {
    console.log('PlinkoGame: rowCount prop changed to:', rowCount);
    console.log('PlinkoGame: riskLevel prop changed to:', riskLevel);
    console.log('PlinkoGame: New configuration:', getRowConfig(rowCount, riskLevel));
    setIsRecreating(true);
    setCurrentRows(rowCount);
    setCurrentRiskLevel(riskLevel);
    setBallPosition(null);
    setHitPegs(new Set());
    
    // Clear any existing ball or game state
    if (engineRef.current) {
      const Engine = Matter.Engine;
      Engine.clear(engineRef.current);
    }
    
    // Small delay to show loading state and ensure cleanup
    setTimeout(() => {
      setIsRecreating(false);
    }, 100);
  }, [rowCount, riskLevel]);

  // Game constants - matching the reference repo
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PADDING_X = 52;
  const PADDING_TOP = 36;
  const PADDING_BOTTOM = 28;
  
  // Pin and ball categories for collision filtering
  const PIN_CATEGORY = 0x0001;
  const BALL_CATEGORY = 0x0002;

  // Row-specific configurations for bins and multipliers - EXACTLY from AnsonH/plinko-game
  const getRowConfig = (rows, riskLevel) => {
    const configs = {
      Low: {
        8: {
          binCount: 10,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "2x", "4.5x", "13x", "65x", "500x"]
        },
        9: {
          binCount: 11,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "1x", "2x", "4.5x", "13x", "65x", "500x"]
        },
        10: {
          binCount: 12,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "1x", "0.1x", "1x", "2x", "4.5x", "13x", "65x"]
        },
        11: {
          binCount: 13,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "1x", "0.1x", "0.1x", "1x", "2x", "4.5x", "13x", "65x"]
        },
        12: {
          binCount: 14,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "1x", "0.1x", "0.1x", "0.1x", "1x", "2x", "4.5x", "13x", "65x"]
        },
        13: {
          binCount: 15,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "1x", "0.1x", "0.1x", "0.1x", "0.1x", "1x", "2x", "4.5x", "13x", "65x"]
        },
        14: {
          binCount: 16,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "1x", "0.1x", "0.1x", "0.1x", "0.1x", "0.1x", "1x", "2x", "4.5x", "13x", "65x"]
        },
        15: {
          binCount: 17,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "1x", "0.1x", "0.1x", "0.1x", "0.1x", "0.1x", "1x", "2x", "4.5x", "13x", "65x", "500x"]
        },
        16: {
          binCount: 18,
          multipliers: ["500x", "65x", "13x", "4.5x", "2x", "1x", "0.1x", "0.1x", "0.1x", "0.1x", "0.1x", "1x", "2x", "4.5x", "13x", "65x", "500x", "500x"]
        }
      },
      Medium: {
        8: {
          binCount: 10,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "4x", "9x", "26x", "130x", "1000x"]
        },
        9: {
          binCount: 11,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "2x", "4x", "9x", "26x", "130x", "1000x"]
        },
        10: {
          binCount: 12,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "2x", "0.2x", "2x", "4x", "9x", "26x", "130x"]
        },
        11: {
          binCount: 13,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "2x", "0.2x", "0.2x", "2x", "4x", "9x", "26x", "130x"]
        },
        12: {
          binCount: 14,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "2x", "0.2x", "0.2x", "0.2x", "2x", "4x", "9x", "26x", "130x"]
        },
        13: {
          binCount: 15,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "2x", "0.2x", "0.2x", "0.2x", "0.2x", "2x", "4x", "9x", "26x", "130x"]
        },
        14: {
          binCount: 16,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "2x", "0.2x", "0.2x", "0.2x", "0.2x", "0.2x", "2x", "4x", "9x", "26x", "130x"]
        },
        15: {
          binCount: 17,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "2x", "0.2x", "0.2x", "0.2x", "0.2x", "0.2x", "2x", "4x", "9x", "26x", "130x", "1000x"]
        },
        16: {
          binCount: 18,
          multipliers: ["1000x", "130x", "26x", "9x", "4x", "2x", "0.2x", "0.2x", "0.2x", "0.2x", "0.2x", "2x", "4x", "9x", "26x", "130x", "1000x", "1000x"]
        }
      },
      High: {
        8: {
          binCount: 10,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "8x", "18x", "52x", "260x", "2000x"]
        },
        9: {
          binCount: 11,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "4x", "8x", "18x", "52x", "260x", "2000x"]
        },
        10: {
          binCount: 12,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "4x", "0.4x", "4x", "8x", "18x", "52x", "260x"]
        },
        11: {
          binCount: 13,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "4x", "0.4x", "0.4x", "4x", "8x", "18x", "52x", "260x"]
        },
        12: {
          binCount: 14,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "4x", "0.4x", "0.4x", "0.4x", "4x", "8x", "18x", "52x", "260x"]
        },
        13: {
          binCount: 15,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "4x", "0.4x", "0.4x", "0.4x", "0.4x", "4x", "8x", "18x", "52x", "260x"]
        },
        14: {
          binCount: 16,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "4x", "0.4x", "0.4x", "0.4x", "0.4x", "0.4x", "4x", "8x", "18x", "52x", "260x"]
        },
        15: {
          binCount: 17,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "4x", "0.4x", "0.4x", "0.4x", "0.4x", "0.4x", "4x", "8x", "18x", "52x", "260x", "2000x"]
        },
        16: {
          binCount: 18,
          multipliers: ["2000x", "260x", "52x", "18x", "8x", "4x", "0.4x", "0.4x", "0.4x", "0.4x", "0.4x", "4x", "8x", "18x", "52x", "260x", "2000x", "2000x"]
        }
      }
    };
    
    // Get the risk level config, default to Medium if invalid
    const riskConfig = configs[riskLevel] || configs.Medium;
    // Get the row config, default to 16 rows if invalid
    return riskConfig[rows] || riskConfig[16];
  };

  // Get current row configuration
  const currentConfig = getRowConfig(currentRows, currentRiskLevel);
  const multipliers = currentConfig.multipliers;
  const binCount = currentConfig.binCount;

  // Ball friction parameters by row count (from reference repo)
  const getBallFrictions = (rows) => {
    return {
      friction: 0.5,
      frictionAir: 0.0364 + (16 - rows) * 0.002, // Adjust friction based on row count
    };
  };

  // Calculate pin distance and radius
  const getPinDistanceX = (rows) => {
    // For the last row, we need to distribute binCount pins across the available width
    const availableWidth = CANVAS_WIDTH - PADDING_X * 2;
    const pinDistanceX = availableWidth / (binCount - 1);
    console.log(`Pin distance X: ${pinDistanceX} for ${binCount} bins, available width: ${availableWidth}`);
    return pinDistanceX;
  };

  const getPinRadius = (rows) => {
    return Math.max(2, (24 - rows) / 2); // Minimum 2px radius
  };

  // Generate pins with exact positioning from reference repo
  const generatePins = (rows) => {
    const pins = [];
    const pinsLastRowXCoords = [];
    let pegId = 0;
    
    const pinDistanceX = getPinDistanceX(rows);
    
    for (let row = 0; row < rows; row++) {
      const rowY = PADDING_TOP + ((CANVAS_HEIGHT - PADDING_TOP - PADDING_BOTTOM) / (rows - 1)) * row;
      
      // Calculate pins in this row - EXACTLY from AnsonH/plinko-game
      let pinsInRow;
      if (row === rows - 1) {
        // Last row should have exactly binCount pins
        pinsInRow = binCount;
      } else {
        // Other rows follow the pattern: 3 + row (starts with 3, adds 1 per row)
        pinsInRow = 3 + row;
      }
      
      // Center the pins in each row
      const rowPaddingX = PADDING_X + ((CANVAS_WIDTH - PADDING_X * 2 - pinDistanceX * (pinsInRow - 1)) / 2);
      
      for (let col = 0; col < pinsInRow; col++) {
        const colX = rowPaddingX + pinDistanceX * col;
        
        pins.push({
          id: pegId++,
          row,
          col,
          x: colX,
          y: rowY
        });
        
        // Store last row x coordinates for bin detection
        if (row === rows - 1) {
          pinsLastRowXCoords.push(colX);
        }
      }
    }
    
    console.log(`Generated ${pins.length} pins for ${rows} rows, last row has ${pinsLastRowXCoords.length} pins`);
    console.log(`Row breakdown: ${Array.from({length: rows}, (_, i) => i === rows - 1 ? binCount : 3 + i)}`);
    console.log(`First row pins: ${pins.filter(p => p.row === 0).map(p => p.x.toFixed(1))}`);
    console.log(`Last row pins: ${pinsLastRowXCoords.map(x => x.toFixed(1))}`);
    return { pins, pinsLastRowXCoords };
  };

  // Initialize physics engine
  const initializePhysics = useCallback((rows, riskLevel) => {
    console.log('PlinkoGame: Initializing physics for', rows, 'rows with risk level:', riskLevel);
    if (typeof window === 'undefined') return;

    const Engine = Matter.Engine;
    const Render = Matter.Render;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    const Events = Matter.Events;
    const Composite = Matter.Composite;

    // Clear existing engine if it exists
    if (engineRef.current) {
      Engine.clear(engineRef.current);
    }

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

    // Generate pins for current row count
    const { pins, pinsLastRowXCoords } = generatePins(rows);

    // Create pins as static circles
    const pegBodies = [];
    pins.forEach(pin => {
      const pegBody = Bodies.circle(pin.x, pin.y, getPinRadius(rows), {
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
      pegBody.pinData = pin;
      pegBodies.push(pegBody);
    });

    // Create walls (slanted guard rails like in reference repo)
    const firstPinX = pins[0].x;
    const lastRowFirstPinX = pinsLastRowXCoords[0];
    const lastRowLastPinX = pinsLastRowXCoords[pinsLastRowXCoords.length - 1];
    
    // Calculate wall angles based on the first and last row pin positions
    const leftWallAngle = Math.atan2(
      firstPinX - lastRowFirstPinX,
      CANVAS_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
    );
    const rightWallAngle = Math.atan2(
      lastRowLastPinX - firstPinX,
      CANVAS_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
    );
    
    // Position walls slightly outside the pin boundaries
    const leftWallX = lastRowFirstPinX - getPinDistanceX(rows) * 0.5;
    const rightWallX = lastRowLastPinX + getPinDistanceX(rows) * 0.5;

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
      rightWallX,
      CANVAS_HEIGHT / 2,
      10,
      CANVAS_HEIGHT,
      {
        isStatic: true,
        angle: -rightWallAngle,
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
          handleBallEnterBin(ball, pinsLastRowXCoords);
        }
      });
    });

    // Handle ball entering bin (exact logic from reference repo)
    const handleBallEnterBin = (ball, pinsLastRowXCoords) => {
      // Find which bin the ball fell into using findLastIndex logic
      const binIndex = pinsLastRowXCoords.findLastIndex((pinX) => pinX < ball.position.x);
      
      if (binIndex !== -1 && binIndex < pinsLastRowXCoords.length) {
        // Set landing animation state
        setBallPosition(binIndex);
        
        // Add to bet history
        const newBetResult = {
          multiplier: multipliers[binIndex],
          timestamp: Date.now()
        };
        setBetHistory(prev => {
          const updated = [newBetResult, ...prev.slice(0, 4)]; // Keep only last 5
          return updated;
        });
        
        setTimeout(() => {
          setIsDropping(false);
          console.log(`Ball landed in bin ${binIndex} with multiplier ${multipliers[binIndex]}`);
        }, 100);
      }
      
      // Remove ball from world
      Composite.remove(engine.world, ball);
    };

    // Start the engine
    Engine.run(engine);
    Render.run(render);

    return { pins, pinsLastRowXCoords };
  }, []);

  // Effect to initialize physics when component mounts or rows change
  useEffect(() => {
    const { pins, pinsLastRowXCoords } = initializePhysics(currentRows, currentRiskLevel);
    
    return () => {
      if (renderRef.current) {
        const Render = Matter.Render;
        Render.stop(renderRef.current);
        // Clear the canvas
        if (renderRef.current.canvas) {
          renderRef.current.canvas.remove();
        }
      }
      if (engineRef.current) {
        const Engine = Matter.Engine;
        Engine.clear(engineRef.current);
      }
    };
  }, [currentRows, currentRiskLevel, initializePhysics]);

  // Function to change rows instantly
  const dropBall = useCallback(() => {
    if (isDropping || !engineRef.current) return;
    
    setIsDropping(true);
    setBallPosition(null);
    setHitPegs(new Set());

    const Bodies = Matter.Bodies;
    const World = Matter.World;

    // Ball parameters from reference repo
    const ballOffsetRangeX = getPinDistanceX(currentRows) * 0.8;
    const ballRadius = getPinRadius(currentRows) * 2;
    
    // Get first row pin positions to determine ball drop range
    const { pins: currentPins } = generatePins(currentRows);
    const firstRowPins = currentPins.filter(pin => pin.row === 0);
    if (firstRowPins.length === 0) return;
    
    const firstRowStartX = firstRowPins[0].x;
    const firstRowEndX = firstRowPins[firstRowPins.length - 1].x;
    const firstRowCenterX = (firstRowStartX + firstRowEndX) / 2;
    
    // Random start position within the first row pin range
    const startX = firstRowCenterX + (Math.random() - 0.5) * ballOffsetRangeX;

    const ball = Bodies.circle(startX, 0, ballRadius, {
      restitution: 0.8, // Bounciness from reference repo
      friction: getBallFrictions(currentRows).friction,
      frictionAir: getBallFrictions(currentRows).frictionAir,
      collisionFilter: {
        category: BALL_CATEGORY,
        mask: PIN_CATEGORY, // Collide with pins only, not other balls
      },
      render: {
        fillStyle: '#ff6b6b',
      },
    });

    World.add(engineRef.current.world, ball);
  }, [isDropping, currentRows]);

  // Expose functions to parent component
  useImperativeHandle(ref, () => ({
    dropBall
  }), [dropBall]);

  // Generate current pins for rendering
  const { pins, pinsLastRowXCoords } = generatePins(currentRows);

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
          Current Rows: {currentRows} | Risk Level: {currentRiskLevel} | Bins: {binCount} | Use the bet button on the left to start the game
        </p>
        <div className="mt-2 text-xs text-gray-500">
          Configuration: {currentRows} rows with {binCount} reward bins ({currentRiskLevel} risk)
        </div>
        <div className="mt-1 text-xs text-gray-600">
          Pin distribution: {Array.from({length: currentRows}, (_, i) => i === currentRows - 1 ? binCount : 3 + i).join(' → ')}
        </div>
      </div>

      {/* Plinko Board Container */}
      <div className="relative bg-[#2A0025] rounded-lg p-6 min-h-[600px] flex flex-col items-center">
        {/* Loading Overlay */}
        {isRecreating && (
          <div className="absolute inset-0 bg-[#2A0025] bg-opacity-90 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-white text-lg">Recreating board...</p>
              <p className="text-gray-400 text-sm">Setting up {currentRows} rows with {currentRiskLevel} risk</p>
            </div>
          </div>
        )}
        

        
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
                className="drop-shadow-sm"
                style={{
                  filter: hitPegs.has(pin.id) 
                    ? "drop-shadow(0 0 15px #ffd700) brightness(1.5)" 
                    : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                }}
              />
            ))}
          </svg>

          {/* Bet History - Right Side */}
          <div className="absolute right-4 top-4 z-20">
            <div className="bg-[#1A0015] border border-[#333947] rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-2 text-center">Last 5 Bets</div>
              <div className="space-y-2">
                {betHistory.map((bet, index) => (
                  <div key={index} className="w-12 h-12 bg-[#2A0025] border border-[#333947] rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{bet.multiplier}</span>
                  </div>
                ))}
                {/* Fill empty slots */}
                {Array.from({ length: 5 - betHistory.length }).map((_, index) => (
                  <div key={`empty-${index}`} className="w-12 h-12 bg-[#2A0025] border border-[#333947] rounded-lg flex items-center justify-center opacity-30">
                    <span className="text-xs text-gray-500">-</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Multiplier Slots */}
          <div className="flex justify-center mt-4 max-w-[800px] mx-auto">
            <div className="flex justify-between w-full px-12">
              {multipliers.map((multiplier, index) => (
                <div
                  key={index}
                  className={`text-center transition-all duration-300 ${
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
          <p className="mt-1">Current configuration: {currentRows} rows with {currentRiskLevel} risk</p>
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