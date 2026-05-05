import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL, {
  autoConnect: false
});

function App() {
  const [usernameInput, setUsernameInput] = useState("");
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [users, setUsers] = useState([]);
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    socket.on("receive_message", (msg) => {
      setMessages((prev) => [...prev, { ...msg, type: "chat" }]);
    });

    socket.on("system_message", (text) => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text, time: new Date().toLocaleTimeString(), type: "system" }
      ]);
    });

    socket.on("user_typing", ({ username: u, isTyping }) => {
      setTypingUser(isTyping ? u : "");
    });

    socket.on("user_list", (onlineUsers) => {
      setUsers(onlineUsers);
    });

    return () => {
      socket.off("receive_message");
      socket.off("system_message");
      socket.off("user_typing");
      socket.off("user_list");
    };
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  const canSend = useMemo(() => message.trim().length > 0, [message]);

  const handleJoin = (e) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (!trimmed) return;

    socket.connect();
    socket.emit("join_chat", trimmed);

    setJoined(true);
    setUsername(trimmed);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!canSend) return;

    socket.emit("send_message", { text: message.trim() });
    setMessage("");
    socket.emit("typing", false);
  };

  const onTyping = (value) => {
    setMessage(value);
    socket.emit("typing", value.trim().length > 0);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", false);
    }, 800);
  };

  if (!joined) {
    return (
      <div className="join-wrapper">
        <form className="card" onSubmit={handleJoin}>
          <h1>WSConnect</h1>
          <p>Show your real-time WebSocket skills with Socket.IO.</p>
          <input
            type="text"
            placeholder="Enter your name"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
          />
          <button type="submit">Join Chat</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Online Users</h2>
        <ul>
          {users.map((u) => (
            <li key={u}>
              {u}
              {u === username ? " (You)" : ""}
            </li>
          ))}
        </ul>
      </aside>

      <main className="chat-panel">
        <header>
          <h2>Live Chat</h2>
          <span>Logged in as {username}</span>
        </header>

        <section className="messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.type === "system" ? "message system" : "message"}
            >
              {msg.type === "chat" && <strong>{msg.username}: </strong>}
              <span>{msg.text}</span>
              <small>{msg.time}</small>
            </div>
          ))}

          {typingUser && <p className="typing">{typingUser} is typing...</p>}
          <div ref={messageEndRef} />
        </section>

        <form className="composer" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => onTyping(e.target.value)}
          />
          <button type="submit" disabled={!canSend}>
            Send
          </button>
        </form>
      </main>
    </div>
  );
}

export default App;
