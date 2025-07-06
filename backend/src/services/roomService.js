const config = require('../config');
const logger = require('../utils/logger');

class RoomService {
  constructor() {
    this.rooms = new Map();
    this.usernames = new Map();
  }

  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      logger.info(`Room created: ${roomId}`);
      return true;
    }
    return false;
  }

  joinRoom(roomId, socketId, username) {
    try {
      if (!this.rooms.has(roomId)) {
        this.createRoom(roomId);
      }

      const room = this.rooms.get(roomId);
      
      if (room.has(socketId)) {
        logger.warn(`User ${socketId} already in room ${roomId}`);
        return false;
      }

      if (room.size >= config.room.maxUsers) {
        logger.warn(`Room ${roomId} is full`);
        return false;
      }

      room.add(socketId);
      this.usernames.set(socketId, username || `${config.room.defaultUsername}${socketId.slice(-4)}`);
      
      logger.info(`User ${socketId} joined room ${roomId}`, { username, roomSize: room.size });
      return true;
    } catch (error) {
      logger.error('Error joining room', { error: error.message, roomId, socketId });
      return false;
    }
  }

  leaveRoom(socketId) {
    try {
      const username = this.usernames.get(socketId);
      let leftRooms = [];

      this.rooms.forEach((users, roomId) => {
        if (users.has(socketId)) {
          users.delete(socketId);
          leftRooms.push(roomId);
          
          if (users.size === 0) {
            this.rooms.delete(roomId);
            logger.info(`Room ${roomId} deleted (empty)`);
          }
        }
      });

      this.usernames.delete(socketId);
      
      if (leftRooms.length > 0) {
        logger.info(`User ${socketId} left rooms: ${leftRooms.join(', ')}`, { username });
      }
      
      return leftRooms;
    } catch (error) {
      logger.error('Error leaving room', { error: error.message, socketId });
      return [];
    }
  }

  getRoomInfo(roomId) {
    if (!this.rooms.has(roomId)) {
      return null;
    }

    const users = Array.from(this.rooms.get(roomId)).map(userId => ({
      id: userId,
      username: this.usernames.get(userId) || `${config.room.defaultUsername}${userId.slice(-4)}`
    }));

    return {
      roomId,
      userCount: users.length,
      users
    };
  }

  getUsernameBySocketId(socketId) {
    return this.usernames.get(socketId) || `${config.room.defaultUsername}${socketId.slice(-4)}`;
  }

  isUserInRoom(roomId, socketId) {
    return this.rooms.has(roomId) && this.rooms.get(roomId).has(socketId);
  }

  getRoomUsers(roomId) {
    if (!this.rooms.has(roomId)) {
      return [];
    }
    return Array.from(this.rooms.get(roomId));
  }

  getAllRooms() {
    const roomsInfo = [];
    this.rooms.forEach((users, roomId) => {
      roomsInfo.push({
        roomId,
        userCount: users.size,
        users: Array.from(users)
      });
    });
    return roomsInfo;
  }
}

module.exports = new RoomService();