const socket  = require('socket.io');
const cookie = require('cookie');
const jwt = require('jsonwebtoken')
const userModel = require('../models/user.model.js');
const aiService = require('../services/ai.service.js');
const messageModel = require('../models/message.model.js');
const { createMemory , queryMemory } = require('../services/vector.service.js')

function initSocketServer(httpServer) {
    
    const io = socket(httpServer, {});

    // socket io middleware to authenticate socket connections for authenticated users
    io.use( async (socket , next) => {
        const cookies = cookie.parse(socket.handshake.headers?.cookie || '')  
        if(!cookies.token){
            return next(new Error('error: No token provided'));
        }

        try{
            const decoded = jwt.verify(cookies.token , process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id);
            socket.user = user;
            next()

        } catch(err){
            return next(new Error('error: Invalid token'));
        }
    })

    io.on('connection', (socket) => {
        
socket.on("ai-message" , async(messagePayload) =>{
    /*
    messagePayload = {
    chatId : chatId
    content : message text content
    }
    */
    
    // await messageModel.create({
    //     chat: messagePayload.chat,
    //     user: socket.user._id,
    //     content: messagePayload.content,
    //     role: 'user'
    // })

    const vectors = await aiService.generateVector(messagePayload.content);

    console.log( "Vectors Generated" , vectors)


    const chatHistory = (await messageModel.find({ chat: messagePayload.chat }).sort({ createdAt: - 1 }).limit(20).lean()).reverse();


    const response = await aiService.generateResponse(chatHistory.map(item => { 
        return { 
            role: item.role, 
            parts: [{text : item.content}] 
        } 
    }
    ))



        await messageModel.create({
        user: socket.user._id,
        chat: messagePayload.chat,
        content: response,
        role: 'model'
    })

    socket.emit("ai-response" , {
        chatId: messagePayload.chat,
        content: response 

    }) 

});
})

}


module.exports = initSocketServer;