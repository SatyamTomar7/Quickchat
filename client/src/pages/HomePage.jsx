import { useContext } from "react";
import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import RightSidebar from "../components/RightSidebar";
import { ChatContext } from "../../context/ChatContext";
const HomePage = () => {
  const { selectedUser } = useContext(ChatContext);
  return (
    <div className="min-h-screen w-full px-2 py-2 sm:px-4 sm:py-4 lg:px-[5%] lg:py-[3%] xl:px-[8%]">
      <div
        className={`backdrop-blur-xl border-2 border-gray-600 rounded-2xl overflow-hidden h-[calc(100dvh-1rem)] min-h-0 sm:min-h-[560px] max-h-[900px] grid grid-cols-1 relative ${selectedUser ? "md:grid-cols-2 lg:grid-cols-[minmax(220px,.9fr)_minmax(0,1.8fr)_minmax(200px,.8fr)] xl:grid-cols-[minmax(240px,1fr)_minmax(0,2fr)_minmax(220px,1fr)]" : "md:grid-cols-2"}`}
      >
        <Sidebar />
        <ChatContainer />
        <RightSidebar />
      </div>
    </div>
  );
};

export default HomePage;
