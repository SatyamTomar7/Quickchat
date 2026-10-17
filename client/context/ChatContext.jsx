import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ChatContext } from "./ChatContext";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});

  const { socket, axios } = useContext(AuthContext);

  const getUsers = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load users");
    }
  }, [axios]);
  const getMessages = useCallback(async (userId) => {
    try {
      const { data } = await axios.get(`/api/messages/${userId}`);
      if (data.success) {
        setMessages(data.messages);
        setUnseenMessages((prev) => ({
          ...prev,
          [userId]: 0,
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load messages");
    }
  }, [axios]);

  const sendMessage = useCallback(async (messageData) => {
    try {
      if (!selectedUser) return; 
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData,
      );
      if (data.success) {
        setMessages((prevMessages) => [...prevMessages, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send message");
    }
  }, [axios, selectedUser]);

  const updateMessage = useCallback((messageId, update) => {
    setMessages((previous) =>
      previous.map((message) =>
        message._id === messageId ? { ...message, ...update } : message,
      ),
    );
  }, []);

  const editMessage = useCallback(async (messageId, text) => {
    try {
      const { data } = await axios.patch(`/api/messages/${messageId}`, { text });
      if (data.success) updateMessage(messageId, data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to edit message");
    }
  }, [axios, updateMessage]);

  const deleteMessage = useCallback(async (messageId) => {
    try {
      const { data } = await axios.delete(`/api/messages/${messageId}`);
      if (data.success) updateMessage(messageId, { deleted: true, text: undefined, image: undefined });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete message");
    }
  }, [axios, updateMessage]);

  const toggleReaction = useCallback(async (messageId, emoji) => {
    try {
      const { data } = await axios.put(`/api/messages/${messageId}/reactions`, { emoji });
      if (data.success) updateMessage(messageId, { reactions: data.reactions });
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update reaction");
    }
  }, [axios, updateMessage]);

  const startTyping = useCallback(() => {
    if (socket && selectedUser) socket.emit("typing:start", { receiverId: selectedUser._id });
  }, [selectedUser, socket]);

  const stopTyping = useCallback(() => {
    if (socket && selectedUser) socket.emit("typing:stop", { receiverId: selectedUser._id });
  }, [selectedUser, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (newMessage) => {
      const senderId =
        typeof newMessage.senderId === "object"
          ? newMessage.senderId?._id
          : newMessage.senderId;

      if (selectedUser && senderId === selectedUser._id) {
        setMessages((prev) => {
          const alreadyExists = prev.some((message) => message._id === newMessage._id);
          return alreadyExists ? prev : [...prev, { ...newMessage, seen: true, status: "seen" }];
        });

        setUnseenMessages((prev) => ({
          ...prev,
          [senderId]: 0,
        }));

        try {
          await axios.put(`/api/messages/mark/${newMessage._id}`);
        } catch (error) {
          toast.error(error.response?.data?.message || "Unable to mark message as seen");
        }
        return;
      }

      setUnseenMessages((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
    };

    const handleStatus = ({ messageId, status }) => {
      updateMessage(messageId, { status, seen: status === "seen" });
    };
    const handleTypingStart = ({ userId }) => {
      setTypingUsers((previous) => ({ ...previous, [userId]: Date.now() }));
    };
    const handleTypingStop = ({ userId }) => {
      setTypingUsers((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
    };
    const handleEdited = ({ messageId, text, edited }) => updateMessage(messageId, { text, edited });
    const handleDeleted = ({ messageId }) => updateMessage(messageId, { deleted: true, text: undefined, image: undefined });
    const handleReaction = ({ messageId, reactions }) => updateMessage(messageId, { reactions });

    socket.on("newMessage", handleNewMessage);
    socket.on("messageStatus", handleStatus);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("messageEdited", handleEdited);
    socket.on("messageDeleted", handleDeleted);
    socket.on("messageReaction", handleReaction);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageStatus", handleStatus);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("messageEdited", handleEdited);
      socket.off("messageDeleted", handleDeleted);
      socket.off("messageReaction", handleReaction);
    };
  }, [axios, selectedUser, socket, updateMessage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTypingUsers((previous) => {
        const next = Object.fromEntries(
          Object.entries(previous).filter(([, startedAt]) => now - startedAt < 4000),
        );
        return Object.keys(next).length === Object.keys(previous).length ? previous : next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    setMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
    getMessages
    ,typingUsers, editMessage, deleteMessage, toggleReaction, startTyping, stopTyping
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
