const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const rooms = new Map();
const usernames = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const username = typeof data === 'string' ? `ユーザー${socket.id.slice(-4)}` : data.username;
    
    // ユーザー名を保存
    usernames.set(socket.id, username);
    
    // 既に参加済みの場合は処理をスキップ
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    
    if (rooms.get(roomId).has(socket.id)) {
      console.log(`User ${socket.id} already in room ${roomId}`);
      return;
    }
    
    socket.join(roomId);
    rooms.get(roomId).add(socket.id);
    
    const roomSize = rooms.get(roomId).size;
    
    // 既存ユーザーに新しいユーザーの参加を通知（ユーザー名も含む）
    socket.to(roomId).emit('user-joined', { userId: socket.id, username });
    
    // ルーム内の全ユーザーに最新のルーム情報を送信
    const usersWithNames = Array.from(rooms.get(roomId)).map(userId => ({
      id: userId,
      username: usernames.get(userId) || `ユーザー${userId.slice(-4)}`
    }));
    
    io.to(roomId).emit('room-info', { 
      roomId, 
      userCount: roomSize,
      users: usersWithNames
    });
    
    console.log(`User ${socket.id} (${username}) joined room ${roomId}, total users: ${roomSize}`);
  });

  socket.on('offer', (data) => {
    console.log(`Offer received from ${socket.id} for target ${data.targetUserId}`);
    if (data.targetUserId) {
      console.log(`Forwarding offer to ${data.targetUserId}`);
      io.to(data.targetUserId).emit('offer', { 
        offer: data.offer, 
        fromUserId: socket.id 
      });
    } else {
      console.log(`Broadcasting offer to room ${data.roomId}`);
      socket.to(data.roomId).emit('offer', { 
        offer: data.offer, 
        fromUserId: socket.id 
      });
    }
  });

  socket.on('answer', (data) => {
    if (data.targetUserId) {
      io.to(data.targetUserId).emit('answer', { 
        answer: data.answer, 
        fromUserId: socket.id 
      });
    } else {
      socket.to(data.roomId).emit('answer', { 
        answer: data.answer, 
        fromUserId: socket.id 
      });
    }
  });

  socket.on('ice-candidate', (data) => {
    if (data.targetUserId) {
      io.to(data.targetUserId).emit('ice-candidate', { 
        candidate: data.candidate, 
        fromUserId: socket.id 
      });
    } else {
      socket.to(data.roomId).emit('ice-candidate', { 
        candidate: data.candidate, 
        fromUserId: socket.id 
      });
    }
  });

  socket.on('get-room-info', (roomId) => {
    console.log(`Get room info request from ${socket.id} for room ${roomId}`);
    console.log('Available rooms:', Array.from(rooms.keys()));
    
    if (rooms.has(roomId)) {
      console.log(`Room ${roomId} exists with users:`, Array.from(rooms.get(roomId)));
      if (rooms.get(roomId).has(socket.id)) {
        const roomSize = rooms.get(roomId).size;
        const roomData = { 
          roomId, 
          userCount: roomSize,
          users: Array.from(rooms.get(roomId))
        };
        socket.emit('room-info', roomData);
        console.log(`Sent room info to ${socket.id}:`, roomData);
      } else {
        console.log(`User ${socket.id} not found in room ${roomId}`);
      }
    } else {
      console.log(`Room ${roomId} does not exist`);
    }
  });

  socket.on('avatar-update', (data) => {
    socket.to(data.roomId).emit('avatar-update', {
      userId: socket.id,
      avatarData: data.avatarData
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        socket.to(roomId).emit('user-left', socket.id);
        
        // 残りのユーザーに更新されたルーム情報を送信
        if (users.size > 0) {
          const usersWithNames = Array.from(users).map(userId => ({
            id: userId,
            username: usernames.get(userId) || `ユーザー${userId.slice(-4)}`
          }));
          
          io.to(roomId).emit('room-info', { 
            roomId, 
            userCount: users.size,
            users: usersWithNames
          });
        } else {
          rooms.delete(roomId);
        }
      }
    });
    
    // ユーザー名も削除
    usernames.delete(socket.id);
  });
});

app.post('/upload-avatar', upload.single('avatarFile'), (req, res) => {
  try {
    const avatarData = JSON.parse(req.file.buffer.toString());
    res.json({ success: true, data: avatarData });
  } catch (error) {
    res.status(400).json({ success: false, error: 'Invalid JSON file' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});