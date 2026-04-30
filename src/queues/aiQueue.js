const { Queue } = require("bullmq");
const connection = require("./connection");

const aiQueue = new Queue("ai-jobs", {
  connection,
});

module.exports = aiQueue;
