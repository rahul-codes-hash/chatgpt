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
    
    // Step 1: Store user message in DB
    const userMessage = await messageModel.create({
        chat: messagePayload.chat,
        user: socket.user._id,
        content: messagePayload.content,
        role: 'user'
    })

    // Step 2: Generate vector for user message
    const vectors = await aiService.generateVector(messagePayload.content);

    // Step 3: Query Pinecone for related Long Term Memories
    //Long Term Memory, LTM are always stored in pinecone
const memory = queryMemory({
    queryVector: vectors,
    limit: 3 ,
    metadata: {
        userId: socket.user._id,
    }
})

console.log(memory)

// Step 4: Save user message ( as memory ) in Pinecone
// await createMemory({
//     vector: vectors,
//     metadata: {
//         userId: socket.user._id.toString(),
//         chatId: messagePayload.chat,
//         content: messagePayload.content
//     }
// })



    // Step 5: Get chat history ( last 20 messages ) from database 
    const chatHistory = (await messageModel.find({ chat: messagePayload.chat }).sort({ createdAt: - 1 }).limit(20).lean()).reverse();

    // Transform chat history to format suitable for AI service. Extract text parts from array of 20 messages in chatHistory
    const stm = await aiService.generateResponse(chatHistory.map(item => { 
        return { 
            role: item.role, 
            parts: [{text : item.content}] 
        } 
    }
    ))

    // STM is generated from chat history retrieved from database (mongoDB or any other DB used by the application)
    // LTM is generated from the memories queried / extracted from pinecone
    const ltm = [
        {
            role: 'system',
            parts: [{ text: `There are some previous messages from the chat , use them to generate a response 
                ${memory.map(item => item.metadata.text).join('\n')}
                ` }] 
        }
    ]

    console.log(ltm[0])
    console.log(stm)

        // Step 6: Generate response from AI using chat history and LTM
    const response = await aiService.generateResponse([...ltm , ...stm])



       const responseMessage = await messageModel.create({
        user: socket.user._id,
        chat: messagePayload.chat,
        content: response,
        role: 'model'
    })

    // Step 7: Generate vector for AI response
    const responseVectors = await aiService.generateVector(response);

    // Step 8: Save AI response / memory ( as memory ) in Pinecone
    // await createMemory({
    //     vector: responseVectors,
    //     metadata: {
    //         userId: socket.user._id.toString(),
    //         chatId: messagePayload.chat,
    //         content: response
    //     }
    // })


    // Step 9: Send AI response back to client / user
    socket.emit("ai-response" , {
        chatId: messagePayload.chat,
        content: response 

    }) 

});
})

}


module.exports = initSocketServer;