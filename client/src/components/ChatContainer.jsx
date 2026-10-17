import { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";
const ChatContainer = () => {
  const {
    messages,
    selectedUser,
    setSelectedConversation,
    selectedConversation,
    setSelectedUser,
    sendMessage,
    getMessages,
    typingUsers,
    startTyping,
    stopTyping,
    editMessage,
    deleteMessage,
    toggleReaction,
    loadOlderMessages,
    messagePage,
  } =
    useContext(ChatContext);
  const { authUser, onlineUsers } = useContext(AuthContext);

  const scrollEnd = useRef();

  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const typingTimeout = useRef();

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return null;
    stopTyping();
    window.clearTimeout(typingTimeout.current);
    await sendMessage({ text: input.trim() });
    setInput("");
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInput(value);
    if (value.trim()) {
      startTyping();
      window.clearTimeout(typingTimeout.current);
      typingTimeout.current = window.setTimeout(stopTyping, 2500);
    } else {
      stopTyping();
    }
  };

  const saveEdit = async (messageId) => {
    if (!editingText.trim()) return;
    await editMessage(messageId, editingText.trim());
    setEditingId(null);
    setEditingText("");
  };

  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      await sendMessage({ image: reader.result });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [getMessages, selectedUser]);
  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  useEffect(() => () => window.clearTimeout(typingTimeout.current), []);

  const activeConversation = selectedConversation || selectedUser;

  useEffect(() => {
    if (selectedConversation) getMessages(selectedConversation._id);
  }, [getMessages, selectedConversation]);

  return activeConversation ? (
    <div className="h-full min-w-0 overflow-hidden relative backdrop-blur-lg">
      {/* header   */}
      <div className="flex items-center gap-2 sm:gap-3 py-3 mx-3 sm:mx-4 border-b border-stone-500">
        <img
          src={activeConversation.image || activeConversation.profilePic || assets.avatar_icon}
          alt=""
          className="w-8 rounded-full"
        />
        <div className="flex-1 min-w-0 text-base sm:text-lg text-white">
          <p className="flex items-center gap-2">
          <span className="truncate">{activeConversation.name || activeConversation.fullName}</span>
          {!selectedConversation && onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
          </p>
          {!selectedConversation && typingUsers[selectedUser._id] && (
            <p className="text-xs text-violet-300">User is typing...</p>
          )}
        </div>
        <img
          onClick={() => {
            setSelectedUser(null);
            setSelectedConversation(null);
          }}
          src={assets.arrow_icon}
          alt=""
          className="md:hidden max-w-7"
        />
        <img src={assets.help_icon} alt="" className="max-md:hidden max-w-5" />
      </div>
      {/* chat area  */}
      <div
        onScroll={(event) => {
          if (event.currentTarget.scrollTop === 0) loadOlderMessages();
        }}
        className="flex flex-col h-[calc(100%-120px)] overflow-y-auto p-2 sm:p-3 pb-6"
      >
        {messagePage.loading && <p className="text-center text-xs text-gray-400">Loading older messages...</p>}
        {messages.map((msg) => {
          const senderId = typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;
          const isMine = senderId === authUser._id;
          const reactionCounts = (msg.reactions || []).reduce((counts, reaction) => ({
            ...counts,
            [reaction.emoji]: (counts[reaction.emoji] || 0) + 1,
          }), {});
          return (
          <div
            key={msg._id}
            className={`flex items-end gap-2 ${
              isMine ? "justify-end" : "justify-start"
            }`}
          >
            {msg.deleted ? (
              <p className="p-2 max-w-[240px] md:text-sm italic text-gray-400 rounded-lg mb-8 bg-gray-500/20">
                This message was deleted
              </p>
            ) : editingId === msg._id ? (
              <div className="flex gap-2 mb-8">
                <input
                  value={editingText}
                  onChange={(event) => setEditingText(event.target.value)}
                  className="min-w-0 w-32 sm:w-auto p-2 rounded bg-gray-800 text-white"
                  maxLength={2000}
                />
                <button onClick={() => saveEdit(msg._id)} className="text-green-300">Save</button>
                <button onClick={() => setEditingId(null)} className="text-gray-300">Cancel</button>
              </div>
            ) : msg.image ? (
              <img
                src={msg.image}
                alt=""
                className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8"
              />
            ) : (
              <p
                className={`p-2 max-w-[min(75vw,400px)] md:text-sm font-light rounded-lg mb-8 break-words bg-violet-500/30 text-white ${isMine ? "rounded-br-none" : "rounded-bl-none"}`}
              >
                {msg.text}
              </p>
            )}
            {!msg.deleted && (
              <div className="flex items-center gap-1 mb-8">
                {["👍", "❤️", "😂"].map((emoji) => (
                  (() => {
                    const reactedByMe = (msg.reactions || []).some(
                      (reaction) =>
                        (typeof reaction.userId === "object" ? reaction.userId?._id : reaction.userId) === authUser._id &&
                        reaction.emoji === emoji,
                    );
                    return (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(msg._id, emoji)}
                    className={`text-xs opacity-80 hover:opacity-100 ${reactedByMe ? "ring-1 ring-violet-300 rounded" : ""}`}
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji} {(reactionCounts[emoji] || 0) > 0 ? reactionCounts[emoji] : ""}
                  </button>
                    );
                  })()
                ))}
                {isMine && !msg.image && (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(msg._id);
                        setEditingText(msg.text || "");
                      }}
                      className="text-xs text-violet-300"
                    >
                      Edit
                    </button>
                    <button onClick={() => deleteMessage(msg._id)} className="text-xs text-red-300">Delete</button>
                  </>
                )}
              </div>
            )}
            <div className="text-center text-xs">
              <img
                src={
                  isMine
                    ? authUser?.profilePic || assets.avatar_icon
                    : selectedConversation?.image || selectedUser?.profilePic || assets.avatar_icon
                }
                alt=""
                className="w-7 rounded-full"
              />
              <p className="text-gray-500">
                {formatMessageTime(msg.createdAt)}
              </p>
              {isMine && <p className="text-gray-500">{msg.status || (msg.seen ? "seen" : "sent")}</p>}
            </div>
          </div>
          );
        })}
        <div ref={scrollEnd}></div>
      </div>

      {/* bottm area  */}

      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-[#171329]/40">
        <div className="flex-1 bg-gray-100/12 px-3 rounded-full">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => (e.key === "Enter" ? handleSendMessage(e) : null)}
            placeholder="Send a message"
            className="w-full bg-transparent py-2 outline-none text-sm sm:text-base"
          />
        </div>
        <input
          onChange={handleSendImage}
          type="file"
          id="image"
          accept="image/png , image/jpeg"
          hidden
        />
        <label htmlFor="image" className="cursor-pointer">
          <img src={assets.gallery_icon} alt="" className="w-5 h-5" />
        </label>
        <img
          onClick={handleSendMessage}
          src={assets.send_button}
          alt=""
          className="w-7 h-7 cursor-pointer"
        />
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden">
      <img src={assets.logo_icon} className="max-w-16" alt="" />
      <p className="text-lg font-medium text-white">Chat anytime,anywhere</p>
    </div>
  );
};

export default ChatContainer;
