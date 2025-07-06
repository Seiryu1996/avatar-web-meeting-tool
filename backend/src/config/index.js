module.exports = {
  port: process.env.PORT || 3001,
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/json']
  },
  room: {
    maxUsers: 10,
    defaultUsername: 'ユーザー'
  },
  timeline: {
    maxEvents: 1000,
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  }
};