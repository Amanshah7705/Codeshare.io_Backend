import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
dotenv.config({
  path: "./.env",
});
const app = express();
const server = http.createServer(app);
const io =  new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());
const db = process.env.MONGO_URL;
async function connectToMongo() {
  try {
    await mongoose.connect(`${db}`, {});
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    // You might want to exit here if MongoDB connection fails
    process.exit(1);
  }
}

connectToMongo();

const PORT1 = process.env.PORT || 3000; // Default port is 3000 if not provided in .env
const RegisterSchema = mongoose.Schema({
  PageId: {
    type: String,
    unique: true,
  },
  data: {
   type:String,
  },
});
const RegisterModel = mongoose.model('Reg', RegisterSchema);
async function createData(id) {

    const userData = new RegisterModel({
      PageId: id,
      data: '',
    });
    await userData.save();

}

async function updateData(id, info) {

  await RegisterModel.findOneAndUpdate({ PageId: id }, { $set: { data: info } });
}

async function getBackData(id) {
  let existingData = await RegisterModel.findOne({ PageId: id });
  if (!existingData) {
    await createData(id);
    existingData = await RegisterModel.findOne({ PageId: id });
  }
  return existingData.data;
}
io.on('connection', async (socket) => {
  socket.on('join-room', async (roomId) => {
    socket.join(roomId);
  });
  socket.on('first', async (newData) => {
    const mydata = await getBackData(newData.id);
    const newData1 = {
      textabout: mydata,
    };
    socket.emit('second', newData1);
  });
  socket.on('change_backend', async (newData) => {
    await updateData(newData.id, newData.textabout);
    const mydata = await getBackData(newData.id);
    const newData1 = {
      textabout: mydata,
    };
    // Emit to all clients in the room except the sender
    socket.broadcast.to(newData.id).emit('second', newData1);
    // Emit to sender
    socket.emit('second', newData1);
  });
  socket.on('disconnect', () => {
  });
});

server.listen(PORT1);
