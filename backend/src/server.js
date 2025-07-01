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
const timelines = new Map();

// タイムラインイベントを追加する関数
const addTimelineEvent = (roomId, type, username, message) => {
  if (!timelines.has(roomId)) {
    timelines.set(roomId, []);
  }
  
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    username,
    timestamp: new Date(),
    message
  };
  
  timelines.get(roomId).push(event);
  
  // ルーム内の全ユーザーにイベントを送信
  io.to(roomId).emit('timeline-event', event);
  
  return event;
};

io.on('connection', (socket) => {

  socket.on('join-room', (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    const username = typeof data === 'string' ? `ユーザー${socket.id.slice(-4)}` : data.username;
    
    // ユーザー名を保存
    usernames.set(socket.id, username);
    
    // 既に参加済みの場合は処理をスキップ
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
      // 最初のユーザーの場合、ミーティング開始イベントを追加
      addTimelineEvent(roomId, 'meeting-start', 'システム', 'ミーティングが開始されました');
    }
    
    if (rooms.get(roomId).has(socket.id)) {
      return;
    }
    
    socket.join(roomId);
    rooms.get(roomId).add(socket.id);
    
    const roomSize = rooms.get(roomId).size;
    
    // タイムラインイベントを追加
    addTimelineEvent(roomId, 'user-joined', username, `${username}さんが参加しました`);
    
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
    
  });

  socket.on('offer', (data) => {
    if (data.targetUserId) {
      io.to(data.targetUserId).emit('offer', { 
        offer: data.offer, 
        fromUserId: socket.id 
      });
    } else {
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
    
    if (rooms.has(roomId)) {
      if (rooms.get(roomId).has(socket.id)) {
        const roomSize = rooms.get(roomId).size;
        const roomData = { 
          roomId, 
          userCount: roomSize,
          users: Array.from(rooms.get(roomId))
        };
        socket.emit('room-info', roomData);
      } else {
      }
    } else {
    }
  });

  socket.on('get-timeline', (roomId) => {
    if (timelines.has(roomId)) {
      socket.emit('timeline-history', timelines.get(roomId));
    } else {
      socket.emit('timeline-history', []);
    }
  });

  socket.on('avatar-update', (data) => {
    socket.to(data.roomId).emit('avatar-update', {
      userId: socket.id,
      avatarData: data.avatarData
    });
  });

  socket.on('disconnect', () => {
    const disconnectedUsername = usernames.get(socket.id) || `ユーザー${socket.id.slice(-4)}`;
    
    rooms.forEach((users, roomId) => {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        
        // タイムラインイベントを追加
        addTimelineEvent(roomId, 'user-left', disconnectedUsername, `${disconnectedUsername}さんが退出しました`);
        
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
          // 最後のユーザーが退出した場合、ミーティング終了イベントを追加
          addTimelineEvent(roomId, 'meeting-end', 'システム', 'ミーティングが終了しました');
          rooms.delete(roomId);
          // タイムラインも削除（必要に応じて保持することも可能）
          // timelines.delete(roomId);
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
});