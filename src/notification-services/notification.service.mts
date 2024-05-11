import { Kafka } from 'kafkajs';

import type { Producer, Consumer } from 'kafkajs'

import { AsyncDatabase } from 'promised-sqlite3';

import nano from '../couch-db/couch-db.mjs';

import { DocumentGetResponse } from 'nano';

import sseServer from '../sse/sse.service.mjs';

const db = nano.use('itsas-notifications');

const kafka = new Kafka({
  clientId: 'itsas-app',
  brokers: ['cs.rsu.edu.ru:9092']
});

const sqlDb = await AsyncDatabase.open("./db.sqlite");

class NotificationService {

    producer: Producer;
    consumer: Consumer;

    constructor() {
        this.producer = kafka.producer();
        this.consumer = kafka.consumer({ groupId: "notification-group" });
    }

    async connectProducer() {
        await this.producer.connect();
    }

    async connectConsumer() {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: "notification", fromBeginning: true });
        await this.consumer.run({ eachMessage: this.getMessage });
    }

    async storeMessageInDB(message) {
        await db.insert(message);
    }

    async sendMessage(ulid, messageContent) {
        const message = {
            ulid,
            messageContent,
            timestamp: Number(new Date()),
            isRead: false
        };

        await this.producer.send({
            topic: 'testTopic',
            messages: [{ value: JSON.stringify(message) }]
        });

        // await this.storeMessageInDB(message);
    }

    async getMessage({ topic, partition, message }) {
        const messageObj = JSON.parse(message.value)
        const messageDb = {
            _id: `${messageObj.ulid}:${String(message.offset).padStart(19,'0')}`,
            content:  messageObj.messageContent,
            timestamp: messageObj.timestamp,
        }

        await db.insert(messageDb, messageDb._id)
        .catch( err =>
            Promise.reject({
                error: `Ошибка создания сообщения: ${err}`,
                status: 500
            })
        )

        await sqlDb.run("INSERT INTO 'offsets' (id, offset) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET offset=excluded.offset;", [
            `${messageObj.ulid}:offset`,
            message.offset
        ]);
        sseServer.sendEventMessageToClient(messageObj.ulid, 'maxoffset', message.offset)
    }

    async markMessageAsRead(messageId) {
        const message: DocumentGetResponse & { isRead?: boolean } = await db.get(messageId);
        if (message && message.isRead !== undefined) {
            message.isRead = true;
            await db.insert(message);
        } else {
            throw new Error('Уведомление не найдено или испорчено');
        }
    }

    async getUnreadNotifications(ulid) {
        const query = {
            selector: { ulid, isRead: false },
            fields: ['_id', 'messageContent', 'timestamp']
        };

        const result = await db.find(query);

        return result.docs;
    }
}

const notificationService = new NotificationService();

export default notificationService;