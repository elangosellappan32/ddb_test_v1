const EventEmitter = require('events');
const logger = require('../utils/logger');

class NotificationService extends EventEmitter {
    static instance = null;

    constructor() {
        super();
        this.wsServer = null;
        this.subscribers = new Map();
        this.eventBuffer = new Map();
        this.bufferSize = 100;
        this.retryDelay = 1000;
        this.maxRetries = 3;
    }

    static getInstance() {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    initialize(wsServer) {
        this.wsServer = wsServer;
        this.setupEventHandlers();
        logger.info('Notification Service Initialized');
    }

    setupEventHandlers() {
        // Core business events
        this.on('allocation.created', this.handleAllocationCreated.bind(this));
        this.on('allocation.updated', this.handleAllocationUpdated.bind(this));
        this.on('allocation.deleted', this.handleAllocationDeleted.bind(this));
        
        this.on('banking.created', this.handleBankingCreated.bind(this));
        this.on('banking.updated', this.handleBankingUpdated.bind(this));
        this.on('banking.deleted', this.handleBankingDeleted.bind(this));
        
        this.on('lapse.created', this.handleLapseCreated.bind(this));
        this.on('lapse.updated', this.handleLapseUpdated.bind(this));
        this.on('lapse.deleted', this.handleLapseDeleted.bind(this));

        // System events
        this.on('error', this.handleError.bind(this));
    }

    async notifyClients(eventType, payload, filter = null) {
        try {
            if (!this.wsServer) {
                throw new Error('WebSocket server not initialized');
            }

            // Store event in buffer
            this.bufferEvent(eventType, payload);

            // Notify connected clients
            await this.wsServer.notifyClients(eventType, payload, filter);
            
            logger.debug('Notification Sent', {
                eventType,
                recipients: filter ? 'filtered' : 'all'
            });
        } catch (error) {
            logger.error('Notification Failed', {
                eventType,
                error: error.message,
                stack: error.stack
            });
            
            // Attempt retry for critical events
            if (this.isCriticalEvent(eventType)) {
                this.retryNotification(eventType, payload, filter);
            }
        }
    }

    bufferEvent(eventType, payload) {
        if (!this.eventBuffer.has(eventType)) {
            this.eventBuffer.set(eventType, []);
        }

        const buffer = this.eventBuffer.get(eventType);
        buffer.push({
            timestamp: Date.now(),
            payload
        });

        // Maintain buffer size
        if (buffer.length > this.bufferSize) {
            buffer.shift();
        }
    }

    async retryNotification(eventType, payload, filter, attempt = 1) {
        if (attempt > this.maxRetries) {
            logger.error('Max retry attempts reached for notification', {
                eventType,
                attempts: attempt
            });
            return;
        }

        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        
        logger.info('Scheduling notification retry', {
            eventType,
            attempt,
            delay
        });

        setTimeout(async () => {
            try {
                await this.wsServer.notifyClients(eventType, payload, filter);
                logger.info('Retry notification succeeded', { eventType, attempt });
            } catch (error) {
                logger.error('Retry notification failed', {
                    eventType,
                    attempt,
                    error: error.message
                });
                this.retryNotification(eventType, payload, filter, attempt + 1);
            }
        }, delay);
    }

    isCriticalEvent(eventType) {
        const criticalEvents = [
            'allocation.created',
            'allocation.updated',
            'allocation.deleted',
            'banking.created',
            'banking.updated',
            'lapse.created'
        ];
        return criticalEvents.includes(eventType);
    }

    // Event handlers
    async handleAllocationCreated(allocation) {
        await this.notifyClients('allocation.created', allocation);
    }

    async handleAllocationUpdated(allocation) {
        await this.notifyClients('allocation.updated', allocation);
    }

    async handleAllocationDeleted(allocation) {
        await this.notifyClients('allocation.deleted', allocation);
    }

    async handleBankingCreated(banking) {
        await this.notifyClients('banking.created', banking);
    }

    async handleBankingUpdated(banking) {
        await this.notifyClients('banking.updated', banking);
    }

    async handleBankingDeleted(banking) {
        await this.notifyClients('banking.deleted', banking);
    }

    async handleLapseCreated(lapse) {
        await this.notifyClients('lapse.created', lapse);
    }

    async handleLapseUpdated(lapse) {
        await this.notifyClients('lapse.updated', lapse);
    }

    async handleLapseDeleted(lapse) {
        await this.notifyClients('lapse.deleted', lapse);
    }

    handleError(error) {
        logger.error('Notification Service Error', {
            error: error.message,
            stack: error.stack
        });
    }

    // Utility methods
    getBufferedEvents(eventType) {
        return this.eventBuffer.get(eventType) || [];
    }

    clearEventBuffer(eventType) {
        if (eventType) {
            this.eventBuffer.delete(eventType);
        } else {
            this.eventBuffer.clear();
        }
    }
}

module.exports = NotificationService.getInstance();