import experss from "express"
import { createServer } from "http"
import { randomBytes } from "crypto"
import {Server} from "socket.io"


interface Message{
    id:string;
    content:string;
    sender:string;
    senderId:string;
    timestamp:Date
}

interface RoomData{
users:Set<string>;
messages:Message[]
lastactive:number
}

const rooms=new Map<string,RoomData>()

const app=experss();
const httpServer=createServer(app)
const io=new Server(httpServer,{
    cors:{
        origin:"http://localhost:5173",
        methods:["GET,POST"]
    }
})

io.on("connection",(socket)=>{
    console.log(socket.id)


    socket.on("set-user-id",(userId:string)=>{
        
    })


    socket.on("create-room",()=>{
        const roomCode=randomBytes(4).toString("hex").toUpperCase();
        rooms.set(roomCode,{
            users:new Set<string>(),
            messages:[],
            lastactive:Date.now()
        })

        socket.emit("room-created",roomCode)
    })



    socket.on("join-room",(data)=>{
       const parsedata=JSON.parse(data);
       const roomCode=parsedata.roomId;
       const room=rooms.get(roomCode);
       

       if(!room){
        socket.emit("error","room not found")
        return;
       }
       socket.join(roomCode)
       room.users.add(socket.id)
       room.lastactive=Date.now()

        socket.emit("joined-room",{roomCode,messages:room.messages})
        io.to(roomCode).emit("user-joined",room.users.size)
    })


    socket.on("send-message",({roomCode,message,userId,name})=>{
        const room=rooms.get(roomCode)
        if(room){
            const messageData:Message={
                id:randomBytes(6).toString("hex").toUpperCase(),
                sender:name,
                senderId:userId,
                content:message,
                timestamp:new Date()
            }
            room.messages.push(messageData);
            io.to(roomCode).emit("new-message",messageData)
        }

       
     })


     socket.on("disconnected",()=>{
        rooms.forEach((room,roomCode)=>{
            if(room.users.has(socket.id))
                room.users.delete(socket.id)
            socket.emit("user-left",room.users.size)


            if(room.users.size===0){
                rooms.delete(roomCode)
            }
        })
     })
   
})


setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomCode) => {
      if (room.users.size === 0 && now - room.lastactive > 3600000) {
        console.log(`Cleaning up inactive room: ${roomCode}`);
        rooms.delete(roomCode);
      }
    });
  }, 3600000);
  
  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  }); 