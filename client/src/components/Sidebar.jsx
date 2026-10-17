import { useContext, useEffect, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
    conversations,
    selectedConversation,
    setSelectedConversation,
    getConversations,
    createGroup,
    searchUsers,
    searchedUsers,
  } = useContext(ChatContext);
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const { logout, onlineUsers } = useContext(AuthContext);

  useEffect(() => {
    getConversations();
  }, [getConversations]);

  useEffect(() => {
    const timer = window.setTimeout(() => searchUsers(input), 250);
    return () => window.clearTimeout(timer);
  }, [input, searchUsers]);

  const handleCreateGroup = async () => {
    const name = window.prompt("Group name");
    if (!name?.trim()) return;
    const selectedIds = users
      .filter((user) => window.confirm(`Add ${user.fullName} to this group?`))
      .map((user) => user._id);
    if (!selectedIds.length) return;
    await createGroup(name.trim(), selectedIds);
  };

  const filteredUsers = input ? searchedUsers : users;

  useEffect(() => {
    getUsers();
  }, [getUsers, onlineUsers]);

  return (
    <div
      className={`bg-[#8185B2]/10 h-full min-w-0 p-3 sm:p-5 rounded-r-xl overflow-y-auto text-white ${selectedUser ? "max-md:hidden" : ""}`}
    >
      <div className="pb-5">
        <div className="flex justify-between items-center">
          <img src={assets.logo} alt="logo" className="w-full max-w-40" />

          <div className="relative py-2 group">
            <img
              src={assets.menu_icon}
              alt="Menu"
              className="max-h-5 cursor-pointer"
            />

            <div className="absolute top-full right-0 z-20 w-32 p-5 rounded-md bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block">
              <p
                onClick={() => navigate("/profile")}
                className="cursor-pointer text-sm"
              >
                Edit Profile
              </p>
              <hr className="my-2 border-t border-gray-500" />
              <p onClick={() => logout()} className="cursor-pointer text-sm">
                Logout
              </p>
            </div>
          </div>
        </div>
        <div         className="bg-[#282142] rounded-full flex items-center gap-2 py-2.5 px-3 sm:px-4 mt-4 sm:mt-5">
          <img src={assets.search_icon} alt="Search" className="w-3" />
          <input
            onChange={(e) => setInput(e.target.value)}
            type="text"
            className="bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1"
            placeholder="Search User..."
          />
        </div>
        <button
          type="button"
          onClick={handleCreateGroup}
          className="mt-3 w-full rounded-full bg-violet-600/70 py-2.5 text-sm"
        >
          Create group
        </button>
      </div>

      <div className="flex flex-col">
        {conversations.map((conversation) => (
          <div
            key={conversation._id}
            className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm ${selectedConversation?._id === conversation._id && "bg-[#282142]/50"}`}
            onClick={() => {
              setSelectedConversation(conversation);
              setSelectedUser(null);
            }}
          >
            <img src={conversation.image || assets.avatar_icon} alt="" className="w-9 aspect-square rounded-full" />
            <div className="flex flex-col leading-5">
              <p>{conversation.name}</p>
              <span className="text-neutral-400 text-xs">Group · {conversation.members.length} members</span>
            </div>
          </div>
        ))}
        {filteredUsers.map((user, index) => (
          <div
            className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm ${selectedUser?._id === user._id && "bg-[#282142]/50"}`}
            key={index}
            onClick={() => {
              setSelectedUser(user);
              setUnseenMessages((prev) => ({
                ...prev,
                [user._id]: 0,
              }));
            }}
          >
            <img
              src={user?.profilePic || assets.avatar_icon}
              alt=""
              className="w-9 aspect-square rounded-full"
            />
            <div className="flex flex-col leading-5">
              <p>{user.fullName}</p>
              {onlineUsers.includes(user._id) ? (
                <span className="text-green-400 text-xs">Online</span>
              ) : (
                <span className="text-neutral-400 text-xs">Offline</span>
              )}
            </div>
            {unseenMessages[user._id] > 0 && (
              <p className="absolute top-4 right-4 text-xs h-5 w-5 flex justify-center items-center rounded-full bg-violet-500/50">
                {unseenMessages[user._id]}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
