const express = require ('express');
const router = express.Router();
const { registerUser, loginUser } = require('../services/authService');
const { protect, sendSuccess } = require('../shared/middleware/auth');
const { ValidationError } = require('../shared/errors/error');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

//Inline async handler
const asyncHandler = (fun) => (req, res, next) =>{
    Promise.resolve(fun(req,res,next).catch(next));
};

//Inline request Validators to register & login
const validateRegister = (req, res, next) =>{
    const { username, password } = req.body;
    if(!username || username.trim().length < 3){
        return next(new ValidationError('Username must be at least 3 characters long'));
    }
    if(!password || password.length < 6){
        return next(new ValidationError('Password must be at least 6 characters long'));
    }
    next();
};

const validateLogin = (req, res, next) =>{
    const { username, password } = req.body;
    if(!username || !password ){
        return next(new ValidationError('Please provide both userName and Password'));
    }
    next();
};

// HTTP Routes

//user registration (port 3001 or 3002)
router.post('/auth/register', validateRegister,
    asyncHandler(async ( req, res) =>{
        const { username, password } = req.body;
        const result = await registerUser( username, password );
        return sendSuccess(res, result, 'Registration successful', 201);
    })
);

//login user
router.post('/auth/login', validateLogin, 
    asyncHandler (async( req, res ) => {
        const { username, password } = req.body;
        const result = await loginUser(username, password);
        return sendSuccess( res, result, 'Login Successful', 200);
    })
);

//create or fetch conversation between two users
router.post('/conversations', protect, 
    asyncHandler(async ( req, res ) =>{
        const { recipientId } = req.body;
        const userId = req.user._id;

        let conversation = await Conversation.findOne({
            participants: { $all: [userId, recipientId]}
        });

        if(!conversation){
            conversation  = await Conversation.create({
                participants: [userId, recipientId]
            });
        }

        return sendSuccess(res, conversation, 'Conversation fetched', 200);
    })
);

//Fetch Conversation List for the logged-in user
router.get('/conversations', protect,
    asyncHandler(async (req, res) =>{
        const userId = req.user._id;

        const list = await Conversation.find({
            participants: userId
        })
        .populate('participants', 'userName')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        return sendSuccess(res, list , 'Conversations list loaded' , 200);
    })
);

//Fetch message from history inside a conv

router.get('/conversations/:id/messages', protect ,
    asyncHandler(async( req, res) =>{
        const conversationId = req.params.id;

        const historyMessages = await Message.find({conversationId})
        .populate('sender' , 'userName')
        .sort({ createdAt: 1 });

        return sendSuccess(res, historyMessages, 'Message history loaded', 200);
    })
);

module.exports = router;
