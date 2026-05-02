const { Queue } = require("bullmq");
const { connection } = require("./connection");

const overdueQueue = new Queue("overdueQueue", {
  connection,
});

module.exports = { overdueQueue };