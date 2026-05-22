import React, { useRef, useEffect, useState } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Eraser, PenTool, Trash2, Square, Circle, Minus, Undo2, Redo2, Maximize, Minimize } from 'lucide-react';

const Whiteboard = ({ roomId, userRole }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const strokesRef = useRef([]);
  const undoStackRef = useRef([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const currentLineRef = useRef([]);
  const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'
  const currentPropsRef = useRef({ tool: 'pen', color: '#000000', lineWidth: 3 });

  useEffect(() => {
    currentPropsRef.current = { tool, color, lineWidth };
  }, [tool, color, lineWidth]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent || parent.clientWidth === 0 || parent.clientHeight === 0) return;
      
      if (canvas.width === parent.clientWidth && canvas.height === parent.clientHeight) return;

      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (strokesRef.current && strokesRef.current.length > 0) {
        drawAllStrokes(strokesRef.current);
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Listen for remote strokes
  useEffect(() => {
    if (!roomId) return;
    
    const whiteboardRef = doc(db, 'liveRooms', roomId);
    
    const unsubscribe = onSnapshot(whiteboardRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.whiteboardState === 'clear') {
           strokesRef.current = [];
           clearCanvas(false);
        } else if (data.strokes) {
           strokesRef.current = data.strokes;
           drawAllStrokes(data.strokes);
        }
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  const drawAllStrokes = (strokes) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear first to redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;
      
      if (['rectangle', 'circle', 'line'].includes(stroke.tool)) {
        if (stroke.points.length < 2) return;
        const startPoint = stroke.points[0];
        const endPoint = stroke.points[stroke.points.length - 1];
        
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth;
        
        const startX = startPoint.x * canvas.width;
        const startY = startPoint.y * canvas.height;
        const endX = endPoint.x * canvas.width;
        const endY = endPoint.y * canvas.height;

        if (stroke.tool === 'rectangle') {
          ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        } else if (stroke.tool === 'circle') {
          const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (stroke.tool === 'line') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.lineWidth = stroke.tool === 'eraser' ? stroke.lineWidth * 3 : stroke.lineWidth;
        
        ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
        }
        ctx.stroke();
      }
    });

    // Also draw the currently active line if we are in the middle of drawing
    if (currentLineRef.current && currentLineRef.current.length > 0) {
      const activePoints = currentLineRef.current;
      const { tool: currentTool, color: currentColor, lineWidth: currentLineWidth } = currentPropsRef.current;
      
      if (['rectangle', 'circle', 'line'].includes(currentTool)) {
        if (activePoints.length < 2) return;
        const startPoint = activePoints[0];
        const endPoint = activePoints[activePoints.length - 1];
        
        ctx.beginPath();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentLineWidth;
        
        const startX = startPoint.x * canvas.width;
        const startY = startPoint.y * canvas.height;
        const endX = endPoint.x * canvas.width;
        const endY = endPoint.y * canvas.height;

        if (currentTool === 'rectangle') {
          ctx.strokeRect(startX, startY, endX - startX, endY - startY);
        } else if (currentTool === 'circle') {
          const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
          ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (currentTool === 'line') {
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;
        ctx.lineWidth = currentTool === 'eraser' ? currentLineWidth * 3 : currentLineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.moveTo(activePoints[0].x * canvas.width, activePoints[0].y * canvas.height);
        for (let i = 1; i < activePoints.length; i++) {
          ctx.lineTo(activePoints[i].x * canvas.width, activePoints[i].y * canvas.height);
        }
        ctx.stroke();
      }
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;
    return { x, y };
  };

  const startDrawing = (e) => {
    if (userRole !== 'teacher') return; // Only teacher can draw for now
    
    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    currentLineRef.current = [{ x, y }];
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (['pen', 'eraser'].includes(tool)) {
      ctx.beginPath();
      ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.arc(x * canvas.width, y * canvas.height, (tool === 'eraser' ? lineWidth * 3 : lineWidth) / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e) => {
    if (!isDrawing || userRole !== 'teacher') return;
    
    const { x, y } = getCoordinates(e);
    const lastPoint = currentLineRef.current[currentLineRef.current.length - 1];
    currentLineRef.current.push({ x, y });
    
    if (['rectangle', 'circle', 'line'].includes(tool)) {
      drawAllStrokes(strokesRef.current);
    } else {
      // Draw locally immediately for pen/eraser
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      ctx.beginPath();
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Connect last two points
      if (lastPoint) {
        ctx.moveTo(lastPoint.x * canvas.width, lastPoint.y * canvas.height);
        ctx.lineTo(x * canvas.width, y * canvas.height);
        ctx.stroke();
      }
    }
  };

  const endDrawing = async () => {
    if (!isDrawing || userRole !== 'teacher') return;
    setIsDrawing(false);
    
    const points = currentLineRef.current;
    if (points.length > 0) {
      undoStackRef.current = [];
      
      let finalPoints = [...points];
      if (['rectangle', 'circle', 'line'].includes(tool) && points.length > 1) {
        finalPoints = [points[0], points[points.length - 1]];
      }

      const newStroke = {
        tool,
        color,
        lineWidth,
        points: finalPoints
      };
      
      try {
        const whiteboardRef = doc(db, 'liveRooms', roomId);
        await updateDoc(whiteboardRef, {
          strokes: arrayUnion(newStroke),
          whiteboardState: 'active'
        }).catch(async (err) => {
          // If doc doesn't exist, create it
          if (err.code === 'not-found') {
            await setDoc(whiteboardRef, { strokes: [newStroke], whiteboardState: 'active' }, { merge: true });
          }
        });
      } catch (error) {
        console.error("Error syncing stroke:", error);
      }
    }
    
    currentLineRef.current = [];
  };

  const handleClear = async () => {
    if (userRole !== 'teacher') return;
    clearCanvas(true);
    undoStackRef.current = [];
    
    try {
      const whiteboardRef = doc(db, 'liveRooms', roomId);
      await setDoc(whiteboardRef, { strokes: [], whiteboardState: 'clear' }, { merge: true });
    } catch (error) {
      console.error("Error clearing whiteboard:", error);
    }
  };

  const handleUndo = async () => {
    if (userRole !== 'teacher' || strokesRef.current.length === 0) return;
    
    const newStrokes = [...strokesRef.current];
    const poppedStroke = newStrokes.pop();
    undoStackRef.current.push(poppedStroke);
    
    try {
      const whiteboardRef = doc(db, 'liveRooms', roomId);
      await updateDoc(whiteboardRef, { strokes: newStrokes });
    } catch (err) {
      console.error("Undo error", err);
    }
  };

  const handleRedo = async () => {
    if (userRole !== 'teacher' || undoStackRef.current.length === 0) return;
    
    const poppedStroke = undoStackRef.current.pop();
    const newStrokes = [...strokesRef.current, poppedStroke];
    
    try {
      const whiteboardRef = doc(db, 'liveRooms', roomId);
      await updateDoc(whiteboardRef, { strokes: newStrokes });
    } catch (err) {
      console.error("Redo error", err);
    }
  };

  const clearCanvas = (localOnly = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen().catch(err => console.error(err));
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen().catch(err => console.error(err));
      }
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      {/* Toolbar */}
      {userRole === 'teacher' && (
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 bg-white/90 backdrop-blur-sm p-1.5 sm:p-2 rounded-xl shadow-md border border-gray-100 flex flex-wrap items-center gap-1.5 sm:gap-3 max-w-[calc(100%-16px)] sm:max-w-none">
          <button 
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Pen"
          >
            <PenTool size={18} />
          </button>
          
          <button 
            onClick={() => setTool('line')}
            className={`p-2 rounded-lg transition-colors ${tool === 'line' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Line"
          >
            <Minus size={18} />
          </button>
          
          <button 
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded-lg transition-colors ${tool === 'rectangle' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Rectangle"
          >
            <Square size={18} />
          </button>
          
          <button 
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition-colors ${tool === 'circle' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Circle"
          >
            <Circle size={18} />
          </button>
          
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            disabled={tool === 'eraser'}
            className="w-8 h-8 rounded cursor-pointer border-none p-0 bg-transparent disabled:opacity-50"
          />
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          
          <button 
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <Eraser size={18} />
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          
          <button 
            onClick={handleUndo}
            disabled={strokesRef.current.length === 0}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 size={18} />
          </button>
          
          <button 
            onClick={handleRedo}
            disabled={undoStackRef.current.length === 0}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 size={18} />
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          
          <button 
            onClick={toggleFullscreen}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100 text-gray-600"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
          
          <div className="h-6 w-px bg-gray-300 mx-1"></div>
          
          <button 
            onClick={handleClear}
            className="p-2 rounded-lg transition-colors hover:bg-red-50 text-red-500"
            title="Clear Board"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}
      
      {/* Canvas */}
      <div className="flex-1 w-full h-full cursor-crosshair">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={endDrawing}
          onPointerOut={endDrawing}
          onPointerCancel={endDrawing}
          className="w-full h-full block bg-white"
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
};

export default Whiteboard;
