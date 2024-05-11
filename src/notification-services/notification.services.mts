import notificationService from './notification.service.mjs'

import projectStatusNotificationService from './project-status-notification.service.mjs'


const main = async () => {
    await notificationService.connectProducer();
    await notificationService.connectConsumer();
    await projectStatusNotificationService.connectProducer();
    await projectStatusNotificationService.connectConsumer();
    // const messageContent = 'Нейросеть завершила обучение!';
    // setInterval(() => projectStatusNotificationService.sendMessage(ulid, messageContent), 10000)
};

main().catch(console.error);



// import { Kafka } from "kafkajs"

// const kafka = new Kafka({
//   clientId: "test-app",
//   brokers: ["cs.rsu.edu.ru:9092"],
// });

// const producer = kafka.producer({
//   maxInFlightRequests: 1,
//   idempotent: true,
// });

// async function sendPayload(input: string) {
//   try {
//     await producer.send({
//       topic: "testTopic",
//       messages: [{ key: "test", value: input }],
//     });
//   } catch (e) {
//     console.error("Caught Error while sending:", e);
//   }
// }

// async function main() {
//   await producer.connect();
//   try {
//     await sendPayload('Hello, from Nodejs');
//   } catch (e) {
//     console.error(e);
//   }
// }

// main();

/* const kafka = new Kafka({
  clientId: "test-app",
  brokers: ["cs.rsu.edu.ru:9092"],
});

const consumer = kafka.consumer({ groupId: "test-group" });
const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: "testTopic", fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      
    },
  });
};
run().catch(console.error); */