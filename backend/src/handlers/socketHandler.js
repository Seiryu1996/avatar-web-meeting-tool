const roomService = require('../services/roomService');
const timelineService = require('../services/timelineService');
const logger = require('../utils/logger');

const handleSocketConnection = (io, socket) => {
  logger.info(`New socket connection: ${socket.id}`);

  // WebRTC関連のハンドラー
  const handleWebRTCSignaling = (eventName, data) => {
    try {
      const { roomId, targetUserId, offer, answer, candidate } = data;
      
      if (targetUserId) {
        const payload = {
          [eventName.replace('-', '')]: offer || answer || candidate,
          fromUserId: socket.id
        };
        io.to(targetUserId).emit(eventName, payload);
      } else if (roomId) {
        const payload = {
          [eventName.replace('-', '')]: offer || answer || candidate,
          fromUserId: socket.id
        };
        socket.to(roomId).emit(eventName, payload);
      }
      
      logger.debug(`WebRTC ${eventName} handled`, { 
        fromUserId: socket.id, 
        targetUserId, 
        roomId 
      });
    } catch (error) {
      logger.error(`Error handling ${eventName}`, { 
        error: error.message, 
        socketId: socket.id 
      });
    }
  };

  // ルーム参加
  socket.on('join-room', (data) => {
    try {
      const roomId = typeof data === 'string' ? data : data.roomId;
      const username = typeof data === 'string' ? null : data.username;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      const joined = roomService.joinRoom(roomId, socket.id, username);
      if (!joined) {
        socket.emit('error', { message: 'Failed to join room' });
        return;
      }

      socket.join(roomId);
      
      const roomInfo = roomService.getRoomInfo(roomId);
      const finalUsername = roomService.getUsernameBySocketId(socket.id);
      
      // 最初のユーザーの場合、ミーティング開始イベントを追加
      if (roomInfo.userCount === 1) {
        timelineService.addEvent(roomId, 'meeting-start', 'システム', 'ミーティングが開始されました');
      }
      
      // タイムラインイベントを追加
      const event = timelineService.addEvent(roomId, 'user-joined', finalUsername, `${finalUsername}さんが参加しました`);
      if (event) {
        io.to(roomId).emit('timeline-event', event);
      }
      
      // 既存ユーザーに新しいユーザーの参加を通知
      socket.to(roomId).emit('user-joined', { 
        userId: socket.id, 
        username: finalUsername 
      });
      
      // ルーム内の全ユーザーに最新のルーム情報を送信
      io.to(roomId).emit('room-info', roomInfo);
      
      logger.info(`User joined room successfully`, { 
        socketId: socket.id, 
        roomId, 
        username: finalUsername,
        roomSize: roomInfo.userCount
      });
      
    } catch (error) {
      logger.error('Error in join-room handler', { 
        error: error.message, 
        socketId: socket.id 
      });
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // WebRTC シグナリング
  socket.on('offer', (data) => handleWebRTCSignaling('offer', data));
  socket.on('answer', (data) => handleWebRTCSignaling('answer', data));
  socket.on('ice-candidate', (data) => handleWebRTCSignaling('ice-candidate', data));

  // ルーム情報取得
  socket.on('get-room-info', (roomId) => {
    try {
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      if (!roomService.isUserInRoom(roomId, socket.id)) {
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }

      const roomInfo = roomService.getRoomInfo(roomId);
      if (roomInfo) {
        socket.emit('room-info', roomInfo);
      } else {
        socket.emit('error', { message: 'Room not found' });
      }
    } catch (error) {
      logger.error('Error in get-room-info handler', { 
        error: error.message, 
        socketId: socket.id, 
        roomId 
      });
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // タイムライン取得
  socket.on('get-timeline', (roomId) => {
    try {
      if (!roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }

      if (!roomService.isUserInRoom(roomId, socket.id)) {
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }

      const timeline = timelineService.getTimeline(roomId);
      socket.emit('timeline-history', timeline);
    } catch (error) {
      logger.error('Error in get-timeline handler', { 
        error: error.message, 
        socketId: socket.id, 
        roomId 
      });
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // アバター更新
  socket.on('avatar-update', (data) => {
    try {
      const { roomId, avatarData } = data;
      
      if (!roomId || !avatarData) {
        socket.emit('error', { message: 'Room ID and avatar data are required' });
        return;
      }

      if (!roomService.isUserInRoom(roomId, socket.id)) {
        socket.emit('error', { message: 'Not authorized for this room' });
        return;
      }

      socket.to(roomId).emit('avatar-update', {
        userId: socket.id,
        avatarData
      });
      
      logger.debug(`Avatar updated`, { socketId: socket.id, roomId });
    } catch (error) {
      logger.error('Error in avatar-update handler', { 
        error: error.message, 
        socketId: socket.id 
      });
      socket.emit('error', { message: 'Internal server error' });
    }
  });

  // 切断処理
  socket.on('disconnect', () => {
    try {
      const username = roomService.getUsernameBySocketId(socket.id);
      const leftRooms = roomService.leaveRoom(socket.id);
      
      leftRooms.forEach(roomId => {
        // タイムラインイベントを追加
        const event = timelineService.addEvent(roomId, 'user-left', username, `${username}さんが退出しました`);
        if (event) {
          io.to(roomId).emit('timeline-event', event);
        }
        
        // 他のユーザーに退出を通知
        socket.to(roomId).emit('user-left', socket.id);
        
        // 残りのユーザーに更新されたルーム情報を送信
        const roomInfo = roomService.getRoomInfo(roomId);
        if (roomInfo) {
          io.to(roomId).emit('room-info', roomInfo);
        } else {
          // 最後のユーザーが退出した場合、ミーティング終了イベントを追加
          timelineService.addEvent(roomId, 'meeting-end', 'システム', 'ミーティングが終了しました');
        }
      });
      
      logger.info(`User disconnected`, { 
        socketId: socket.id, 
        username, 
        leftRooms 
      });
    } catch (error) {
      logger.error('Error in disconnect handler', { 
        error: error.message, 
        socketId: socket.id 
      });
    }
  });
};

module.exports = handleSocketConnection;