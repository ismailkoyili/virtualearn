import React, { useRef, useEffect, useState } from 'react';
import { db } from '../../firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Eraser, PenTool, Trash2 } from 'lucide-react';

const Whiteboard = ({ roomId, userRole }) => {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const currentLineRef = useRef([]);
  const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'

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
      
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.lineWidth * 3 : stroke.lineWidth;
      
      ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
      }
      ctx.stroke();
    });
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
    ctx.beginPath();
    ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.arc(x * canvas.width, y * canvas.height, (tool === 'eraser' ? lineWidth * 3 : lineWidth) / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const draw = (e) => {
    if (!isDrawing || userRole !== 'teacher') return;
    
    const { x, y } = getCoordinates(e);
    const lastPoint = currentLineRef.current[currentLineRef.current.length - 1];
    currentLineRef.current.push({ x, y });
    
    // Draw locally immediately
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
  };

  const endDrawing = async () => {
    if (!isDrawing || userRole !== 'teacher') return;
    setIsDrawing(false);
    
    const points = currentLineRef.current;
    if (points.length > 0) {
      const newStroke = {
        tool,
        color,
        lineWidth,
        points: [...points]
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
    
    try {
      const whiteboardRef = doc(db, 'liveRooms', roomId);
      await setDoc(whiteboardRef, { strokes: [], whiteboardState: 'clear' }, { merge: true });
    } catch (error) {
      console.error("Error clearing whiteboard:", error);
    }
  };

  const clearCanvas = (localOnly = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
      {/* Toolbar */}
      {userRole === 'teacher' && (
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-md border border-gray-100 flex items-center gap-3">
          <button 
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <PenTool size={18} />
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
