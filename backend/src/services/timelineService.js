const config = require('../config');
const logger = require('../utils/logger');

class TimelineService {
  constructor() {
    this.timelines = new Map();
    this.startCleanupTimer();
  }

  addEvent(roomId, type, username, message) {
    try {
      if (!this.timelines.has(roomId)) {
        this.timelines.set(roomId, []);
      }

      const timeline = this.timelines.get(roomId);
      
      // 最大イベント数を超えた場合、古いイベントを削除
      if (timeline.length >= config.timeline.maxEvents) {
        timeline.shift();
      }

      const event = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        username,
        timestamp: new Date(),
        message
      };

      timeline.push(event);
      
      logger.info(`Timeline event added: ${type}`, { roomId, username, message });
      return event;
    } catch (error) {
      logger.error('Error adding timeline event', { error: error.message, roomId, type, username });
      return null;
    }
  }

  getTimeline(roomId) {
    return this.timelines.get(roomId) || [];
  }

  clearTimeline(roomId) {
    try {
      this.timelines.delete(roomId);
      logger.info(`Timeline cleared for room: ${roomId}`);
      return true;
    } catch (error) {
      logger.error('Error clearing timeline', { error: error.message, roomId });
      return false;
    }
  }

  deleteOldEvents(roomId, olderThan) {
    try {
      const timeline = this.timelines.get(roomId);
      if (!timeline) return 0;

      const originalLength = timeline.length;
      const filteredEvents = timeline.filter(event => 
        new Date(event.timestamp).getTime() > olderThan
      );

      this.timelines.set(roomId, filteredEvents);
      const deletedCount = originalLength - filteredEvents.length;
      
      if (deletedCount > 0) {
        logger.info(`Deleted ${deletedCount} old events from room ${roomId}`);
      }
      
      return deletedCount;
    } catch (error) {
      logger.error('Error deleting old events', { error: error.message, roomId });
      return 0;
    }
  }

  startCleanupTimer() {
    setInterval(() => {
      const cutoffTime = Date.now() - config.timeline.cleanupInterval;
      let totalDeleted = 0;

      this.timelines.forEach((timeline, roomId) => {
        const deleted = this.deleteOldEvents(roomId, cutoffTime);
        totalDeleted += deleted;
        
        // 空のタイムラインを削除
        if (timeline.length === 0) {
          this.timelines.delete(roomId);
        }
      });

      if (totalDeleted > 0) {
        logger.info(`Timeline cleanup completed: ${totalDeleted} events deleted`);
      }
    }, config.timeline.cleanupInterval);
  }

  getAllTimelines() {
    const result = {};
    this.timelines.forEach((timeline, roomId) => {
      result[roomId] = timeline;
    });
    return result;
  }

  getEventsByType(roomId, type) {
    const timeline = this.getTimeline(roomId);
    return timeline.filter(event => event.type === type);
  }

  getEventsByUser(roomId, username) {
    const timeline = this.getTimeline(roomId);
    return timeline.filter(event => event.username === username);
  }

  getRecentEvents(roomId, count = 10) {
    const timeline = this.getTimeline(roomId);
    return timeline.slice(-count);
  }
}

module.exports = new TimelineService();