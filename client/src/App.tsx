import { io, Socket } from "socket.io-client";
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { MdContentCopy } from "react-icons/md";
import { FaSnapchat } from "react-icons/fa6";
import { Loader2 } from "lucide-react";
interface Message{
    id:string;
    content:string;
    senderId:string;
    sender:string;
    timestamp:Date;
}

interface ClientoServer{
'create-room':()=>void;
'join-room':(roomCode:string)=>void;
'send-message':(data:{message:string,roomCode:string,userId:string,name:string})=>void;
'set-user-id':(userId:string)=>void
}

interface ServertoClient{
    'room-created':(code:string)=>void;
    'joined-room':(data:{roomCode:string,messages:Message[]})=>void;
    'new-message':(message:Message)=>void;
    'user-joined':(userCount:number)=>void
    'user-left':(userCount:number)=>void;
    'error':(message:string)=>void

    }
const PORTS=`${import.meta.env.VITE_BACKENDURL}`
console.log(`${import.meta.env.VITE_BACKENDURL}`)
const socket:Socket<ServertoClient,ClientoServer>=io(PORTS)

const MessageGroup = ({ messages, userId }: { messages: Message[], userId: string }) => {
  return (
    <>
      {messages.map((msg, index) => {
        const isFirstInGroup = index === 0 || messages[index - 1]?.senderId !== msg.senderId;
        
        return (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.senderId === userId ? 'items-end' : 'items-start'
            }`}
          >
            {isFirstInGroup && (
              <div className="text-xs text-muted-foreground mb-0.5">
                {msg.sender}
              </div>
            )}
            <div
              className={`inline-block rounded-lg px-3 py-1.5 break-words ${
                msg.senderId === userId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              } ${!isFirstInGroup ? 'mt-0.5' : 'mt-1.5'}`}
            >
              {msg.content}
            </div>
          </div>
        );
      })}
    </>
  );
};



const App = () => {

    const [inputCode,setinputCode]=useState<string>("")
    const [roomCode,setroomCode]=useState<string>("")
    const [name,setName]=useState<string>("")
    const [message,setmessage]=useState<string>("")
    const [messages,setmessages]=useState<Message[]>([])
    const [users,setUsers]=useState<number>(0)
    const [userId,setUserID]=useState<string>("")
    const [isLoading,setisLoading]=useState<boolean>(false)
    const [isConnected,setisConnected]=useState<boolean>(false)

const ScrollingBar=useRef<HTMLDivElement>(null)

useEffect(()=>{
    ScrollingBar.current?.scrollIntoView({behavior:"smooth"})
})


useEffect(()=>{
const storedUserId=localStorage.getItem("chatuserId")
const newUserid=storedUserId || crypto.randomUUID()
if(!storedUserId){
    localStorage.setItem("chatuserId",newUserid)

}
setUserID(newUserid)
socket.emit("set-user-id",newUserid)
},[])




    useEffect(()=>{
socket.on("room-created",(code)=>{
    setroomCode(code);
    setisLoading(false);
    toast.success("Room is created Sucessfully")
})

socket.on("joined-room",({roomCode,messages})=>{
    setroomCode(roomCode);
    setmessages(messages)
    setisConnected(true)
    setinputCode("")
    toast.success("Joined room is Successfully")
  
})


socket.on("new-message",(message)=>{
    setmessages((pre)=>[...pre,message])
})

socket.on("user-left",(userCount)=>{
    setUsers(userCount)
    toast.success('A user has joined the room');
})


socket.on("user-joined",(userCount)=>{
    setUsers(userCount)
    toast.info('A user has joined the room');
    
})
socket.on("error",(message)=>{
toast.error(message)
})


return()=>{
    socket.off("room-created")
    socket.off("joined-room")
    socket.off("new-message")
    socket.off("user-joined")
    socket.off("user-left")
    
    socket.off("error")

}



    },[socket])

    const handlesubmitofName=(e:ChangeEvent<HTMLInputElement>)=>{
       setName(e.target.value)
    }
    const handlesubmitofinput=(e:ChangeEvent<HTMLInputElement>)=>{
        setinputCode(e.target.value)
     }
     const handlesubmitMessage=(e:ChangeEvent<HTMLInputElement>)=>{
        setmessage(e.target.value)
     }
    


     const Createroom=()=>{
        setisLoading(true)
        socket.emit("create-room")
        toast.success("Room code is generated")
        
     }
     const Joinedroom=(e:FormEvent)=>{
        e.preventDefault()
        if(!inputCode.trim()){
            toast.info("Enter your RoomCode")
            return;
          
        }
        if(!name.trim()){
            toast.info("Enter your Name")
            return;
        }

        socket.emit("join-room",JSON.stringify({roomId:inputCode.toUpperCase(),name}))

 

     }

     const sendMessage=(e:FormEvent)=>{
        e.preventDefault()
        if(message.trim()){
            socket.emit("send-message",{roomCode,userId,message,name})
            setmessage("")
        }

     }

     const CopytoClipboard=(text:string)=>{
        navigator.clipboard.write([
            new ClipboardItem({
                'text/plain':new Blob([text],{type:"text/plain"})
            }),
    ]).then(()=>{toast.success("Room code is Copied")}).catch(()=>toast.info("Room code is Didn't copied"))

     }
  return (
    <div>
          <div className="container mx-auto max-w-2xl p-4 h-screen flex items-center justify-center">
            <Toaster richColors/>
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2 font-bold">
            <FaSnapchat className="cursor-pointer"/>
              Real Time Chat
            </CardTitle>
            <CardDescription>
              temporary room that expires after all users exit
            </CardDescription>
          </CardHeader>
          <CardContent>
           
     
           {!isConnected ?
           
           <div>
                 <Button className="w-full text-md p-3 h-10 tracking-wide" variant="default" onClick={Createroom} > {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating room...
                    </>
                  ) : (
                    "Create New Room"
                  )}</Button>


<Input placeholder="Enter your Name "  value={name} onChange={handlesubmitofName} className="mt-3"/>
<div className="flex items-center">
<Input placeholder="Enter your RoomCode"    value={inputCode} onChange={handlesubmitofinput} className="mt-2 mr-2" /> 
<Button onClick={Joinedroom} className="mt-1">Join Room</Button>
</div>

{roomCode && (<div className="bg-gray-100 pt-3 rounded-md mt-3 p-6">
  <p className="text-center text-gray-600">Share this code with your friend</p>
  <div className="flex items-center justify-center">
  <p className="text-center font-bold text-xl mr-2">{roomCode} </p>
  <p ><MdContentCopy onClick={()=>CopytoClipboard(roomCode)} className="cursor-pointer"/></p>
  </div>
</div>)}



           </div> :(
 <div className="max-w-3xl mx-auto space-y-7">
 <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted p-3 rounded-lg">
   <div className="flex items-center gap-2">
     <span>Room Code: <span className="font-mono font-bold">{roomCode}</span></span>
     <Button
       variant="ghost"
       size="icon"
       onClick={() => CopytoClipboard(roomCode)}
       className="h-6 w-6"
     >
       <MdContentCopy onClick={()=>CopytoClipboard(roomCode)}/>
     </Button>
   </div>
   <span>Users: {users}</span>
 </div>

 <div className="h-[430px] overflow-y-auto border rounded-lg p-4 space-y-2">
   <MessageGroup messages={messages} userId={userId} />
   <div ref={ScrollingBar} />
 </div>
 <form onSubmit={sendMessage} className="flex gap-2">
   <Input
     value={message}
     onChange={handlesubmitMessage}
     placeholder="Type a message..."
     className="text-lg py-5"
   />
   <Button 
     type="submit"
     size="lg"
     className="px-8"
   >
     Send
   </Button>
 </form>
</div>
           )
           
           
        
          }
          
          </CardContent>
        </Card>

        </div>
   

    </div>
  )
}

export default App