import { useContext, useMemo } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);

  const { logout, onlineUsers } = useContext(AuthContext);
  const msgImages = useMemo(
    () => messages.filter((message) => message.image).map((message) => message.image),
    [messages],
  );

  return (
    selectedUser && (
      <div
        className="bg-[#8185B2]/10 text-white w-full min-w-0 relative overflow-y-auto max-lg:hidden"
      >
        <div className="pt-8 xl:pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto text-center">
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            className="w-20 aspect-square rounded-full"
            alt=""
          />
          <h1 className="px-4 text-xl font-medium mx-auto flex items-center gap-2 break-words">
            {onlineUsers.includes(selectedUser._id) && (
              <p className="w-2 h-2 rounded-full bg-green-500"></p>
            )}
            {selectedUser.fullName}
          </h1>
          <p className="px-5 mx-auto break-words">{selectedUser.bio}</p>
        </div>
        <hr className="border-[#ffffff50] my-4" />
        <div className="px-5 text-xs">
          <p>Media</p>
          <div className="mt-2 max-h-[200px] overflow-y-scroll grid grid-cols-2 gap-4 opacity-80">
            {msgImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer rounded"
              >
                <img src={url} alt="" className="h-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <button onClick={()=>logout()} className="absolute bottom-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-400 to-violet-600 text-white border-none text-sm font-light py-2 px-8 xl:px-20 rounded-full cursor-pointer">
          Logout
        </button>
      </div>
    )
  );
};

export default RightSidebar;
