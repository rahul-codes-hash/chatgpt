require("dotenv").config();
const app = require("./src/app.js");
const connectDB = require('./src/db/db.js');
const initSocketServer = require('./src/sockets/socket.server.js');
const httpServer = require("http").createServer(app);

const PORT = process.env.PORT || 3000;


// Connect to the database
connectDB();

initSocketServer(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});