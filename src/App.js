import "./App.css";
import { useState, useEffect } from "react";
import Chat from "./Chat";
import io from 'socket.io-client';

const socket = io("https://chatapp-4-0nz3.onrender.com", {
  transports: ["websocket"],
});

function App() {
  const [username, setUsername] = useState("");
  const [showChat, setShowChat] = useState(false);
  
  const [usersCount, setUsersCount] = useState(0);

  useEffect(() => {
    socket.on("connect", () => console.log("Connected to server!"));
    socket.on("disconnect", () => {
      console.log("Disconnected from server!");
      setUsersCount(0);
    });
    socket.on("room_users", (count) => {
      setUsersCount(count);
    });
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_users");
    };
  }, []);

  const joinChat = () => {
    if (username.trim() === "") {
      alert("Нэрээ оруулна уу!");
      return;
    }
    setShowChat(true);
  };

  return (
    <div className="App">
      {!showChat ? (
        <div className="joinChatContainer">
          <h3>Чатлах 💌</h3>
          <input
            type="text"
            placeholder="Нэрээ оруулна уу..."
            onChange={(event) => setUsername(event.target.value)}
            onKeyPress={(event) => event.key === "Enter" && joinChat()}
          />
          <button onClick={joinChat}>Чатлах</button>
        </div>
      ) : (
        <Chat
          socket={socket}
          username={username}
          usersCount={usersCount}
          setUsersCount={setUsersCount}
        />
      )}
      <footer className="footer">
        <p></p>
        <p>&copy; {new Date().getFullYear()} by Tugs.</p>
      </footer>
    </div>
  );
}

export default App;