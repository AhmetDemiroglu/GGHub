import { axiosInstance } from "@core/lib/axios";
import { ConversationDto, MessageDto, MessageForCreationDto } from "@/models/messages/message.model";

export const getConversations = (): Promise<ConversationDto[]> => {
    return axiosInstance
        .get("/messages/conversations")
        .then((response) => response.data)
        .catch((error) => {
            throw error;
        });
};

export const getMessageThread = (partnerUsername: string): Promise<MessageDto[]> => {
    return axiosInstance
        .get(`/messages/thread/${partnerUsername}`)
        .then((response) => response.data)
        .catch((error) => {
            throw error;
        });
};

export const sendMessage = (data: MessageForCreationDto): Promise<MessageDto> => {
    return axiosInstance
        .post("/messages", data)
        .then((response) => response.data)
        .catch((error) => {
            throw error;
        });
};

export const getUnreadMessageCount = (): Promise<{ count: number }> => {
    return axiosInstance
        .get("/messages/unread-count")
        .then((response) => response.data)
        .catch((error) => {
            throw error;
        });
};
