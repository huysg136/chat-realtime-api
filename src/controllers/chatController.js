import { chatService } from "../services/chatService.js";

async function postTyping(req, res){
    try {
        const uid = req.user.uid;
        const { roomId, action } = req.body;

        if (!roomId || !uid || !["start", "stop"].includes(action)){
            return res.status(400).json({
                error: "roomId, uid, action are required"
            })
        }

        const result = action === "start" ?
            await chatService.startTyping({roomId, uid}) :
            await chatService.stopTyping({roomId, uid});

        return res.status(200).json({
            ok: true,
            data: result
        })

    } catch (err) {
        return res.status(500).json({ 
            error: "Internal server error" 
        });
    }
}

async function getTyping (req, res){
    try {
        const uid = req.user.uid;
        const { roomId } = req.query;

        if (!roomId){
            return res.status(400).json({
                error: "roomId is required"
            })
        }

        const typingUids = await chatService.getTypingUsers({
            roomId,
            excludeUid: uid,
        });

        return res.status(200).json({
            ok: true,
            typingUids
        })
    } catch (err){
        return res.status(500).json({ 
            error: "Internal server error" 
        });
    }
}

export const chatController = {
    postTyping,
    getTyping,
}