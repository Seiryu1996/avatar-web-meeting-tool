const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');

const config = require('./config');
const logger = require('./utils/logger');
const handleSocketConnection = require('./handlers/socketHandler');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: config.cors
});

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

io.on('connection', (socket) => {
  handleSocketConnection(io, socket);
});

app.post('/upload-avatar', upload.single('avatarFile'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const avatarData = JSON.parse(req.file.buffer.toString());
    
    logger.info('Avatar file uploaded successfully', {
      originalName: req.file.originalname,
      size: req.file.size,
      ip: req.ip
    });
    
    res.json({ success: true, data: avatarData });
  } catch (error) {
    logger.error('Error parsing avatar file', {
      error: error.message,
      fileName: req.file.originalname,
      ip: req.ip
    });
    
    res.status(400).json({ success: false, error: 'Invalid JSON file' });
  }
}));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// エラーハンドリングミドルウェア
app.use(notFoundHandler);
app.use(errorHandler);

// プロセスエラーハンドリング
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

const PORT = config.port;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});