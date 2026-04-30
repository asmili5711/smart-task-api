const { Queue } = require("bullmq");
const connection = require("./connection");

const notificationQueue = new Queue("notifications", {
  connection,
});

module.exports = notificationQueue;
