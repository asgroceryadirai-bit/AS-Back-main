/**
 * Socket Manager for real-time events.
 * Handles WebSocket connection setups with dynamic fallback support.
 */
let io = null;

export const initSocket = async (server) => {
  try {
    // Dynamic import allows the app to load even if socket.io is not in package.json
    const { Server } = await import("socket.io");
    
    io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on("connection", (socket) => {
      console.log(`⚡ Real-time client connected: ${socket.id}`);

      socket.on("join_room", (room) => {
        socket.join(room);
        console.log(`👤 Client ${socket.id} joined room: ${room}`);
      });

      socket.on("disconnect", () => {
        console.log(`🔌 Real-time client disconnected: ${socket.id}`);
      });
    });

    console.log("✅ Socket.io Manager successfully initialized!");
    return io;
  } catch (error) {
    console.log("ℹ️ Socket.io module is not installed. Socket Manager fallback enabled.");
    return null;
  }
};

export const getIO = () => io;
