import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function GameChat({ gameSessionId, currentUser }) {
    const [messages, setMessages] = useState([]);
    const [usersOnline, setUsersOnline] = useState([]);
    const [inputMsg, setInputMsg] = useState("");
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!gameSessionId) return;

        // 1. Cargar historial de mensajes filtrado por esta sesión de juego
        // Cumplimos con la regla: "si salgo y vuelvo a entrar deben estar"
        axios.get('/messages', { params: { game_session_id: gameSessionId } })
            .then(res => {
                const history = res.data.map(m => ({
                    id: m.id,
                    type: 'user',
                    content: m.message, // El modelo ChatMessage usa 'message'
                    user: m.user,
                    created_at: m.created_at
                }));
                setMessages(history);
            })
            .catch(err => console.error("Error cargando historial:", err));

        if (!window.Echo) return;

        // 2. Suscribirse al PresenceChannel de la sesión (blindado para que,
        //    si falla WebSocket/cliente, no rompa el render del resto).
        console.log(`Uniéndose al canal de presencia: game.${gameSessionId}`);
        let channel = null;
        try {
            channel = window.Echo.join(`game.${gameSessionId}`);

            channel
                .here((users) => {
                    setUsersOnline(users);
                })
                .joining((user) => {
                    setUsersOnline((prev) => [...prev, user]);
                    setMessages((prev) => [...prev, {
                        id: Date.now(),
                        type: 'system',
                        content: `${user.name} se ha unido`
                    }]);
                })
                .leaving((user) => {
                    setUsersOnline((prev) => prev.filter(u => u.id !== user.id));
                    setMessages((prev) => [...prev, {
                        id: Date.now(),
                        type: 'system',
                        content: `${user.name} ha salido`
                    }]);
                })
                .listen('GameMessageSent', (e) => {
                    console.log("Nuevo mensaje recibido en sesión:", e);
                    setMessages((prev) => [...prev, {
                        id: e.id,
                        type: 'user',
                        content: e.message,
                        user: e.user,
                        created_at: e.created_at
                    }]);
                });
        } catch (err) {
            console.error("Fallo al suscribirse al canal de presencia:", err);
        }

        return () => {
            if (channel) {
                window.Echo.leave(`game.${gameSessionId}`);
            }
        };
    }, [gameSessionId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!inputMsg.trim() || isSending || !gameSessionId) return;

        const currentMsg = inputMsg;
        setInputMsg("");
        setIsSending(true);

        try {
            const res = await axios.post('/messages', {
                game_session_id: gameSessionId,
                message: currentMsg
            });
            
            // El mensaje se recibe vía WebSocket por el canal de presencia,
            // pero lo añadimos localmente si queremos feedback instantáneo (opcional).
            const newMessage = res.data.message;
            setMessages((prev) => [...prev, {
                id: newMessage.id,
                type: 'user',
                content: newMessage.message,
                user: newMessage.user,
                created_at: newMessage.created_at
            }]);
        } catch (error) {
            console.error("Error al enviar mensaje:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white w-80 shadow-md transform transition-all duration-300 z-20">
            <div className="p-4 border-b border-gray-200 bg-gray-900 flex justify-between items-center text-white">
                <h3 className="font-bold tracking-wider text-sm uppercase">Chat Activo</h3>
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded border border-green-500/30 flex items-center shadow-inner">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse shadow-[0_0_5px_#4ade80]"></span>
                    {usersOnline.length}
                </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
                {messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full text-center text-gray-400 text-sm italic">
                        No hay mensajes.<br/>¡Saluda para romper el hielo!
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.type === 'system' ? 'items-center' : msg.user.id === currentUser.id ? 'items-end' : 'items-start'}`}>
                            {msg.type === 'system' ? (
                                <span className="text-[11px] text-gray-500 bg-gray-200/50 px-3 py-1 rounded-full shadow-sm">
                                    {msg.content}
                                </span>
                            ) : (
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm relative ${msg.user.id === currentUser.id ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
                                    {msg.user.id !== currentUser.id && (
                                        <div className="text-[10px] uppercase font-bold text-indigo-500 mb-0.5 tracking-wider">{msg.user.name}</div>
                                    )}
                                    <div className="text-sm leading-relaxed">{msg.content}</div>
                                </div>
                            )}
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="p-3 bg-gray-50 border-t border-gray-200 flex">
                <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border-0 ring-1 ring-gray-300 rounded-l-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm bg-white"
                    maxLength={1000}
                />
                <button
                    type="submit"
                    disabled={isSending || !inputMsg.trim()}
                    className="bg-indigo-600 text-white px-5 rounded-r-xl hover:bg-indigo-700 focus:outline-none disabled:opacity-50 transition-colors shadow-md"
                >
                    <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                </button>
            </form>
        </div>
    );
}
