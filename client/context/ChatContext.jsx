import {
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

  const { socket, axios } = useContext(AuthContext);

  const getUsers = async () => {
    try {
      const { data } = await axios.get("/api/messages/users");
      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load users");
    }
  };
  const getMessages = async (userId) => {
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
  };

  const sendMessage = async (messageData) => {
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
  };

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
          return alreadyExists ? prev : [...prev, { ...newMessage, seen: true }];
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

    socket.on("newMessage", handleNewMessage);

    return () => socket.off("newMessage", handleNewMessage);
  }, [axios, selectedUser, socket]);

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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
