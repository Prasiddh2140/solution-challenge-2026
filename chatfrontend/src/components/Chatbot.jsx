import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MessageCircle, X, Send, User, Bot, MapPin } from "lucide-react";

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: "bot",
            text: "Hi there! 👋 I'm your Volunteer Assistant. How can I help you find opportunities today?",
            cards: [],
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    function parseAiResponse(rawText) {
        let text = rawText;
        let cards = [];
        // The AI might return the JSON block anywhere, typically at the end.
        const jsonRegex = /\`\`\`json\n([\s\S]*?)\n\`\`\`/i;
        const match = rawText.match(jsonRegex);

        if (match) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed.cards) cards = parsed.cards;
                text = rawText.replace(jsonRegex, "").trim();
            } catch (e) {
                console.error("Failed to parse JSON cards from AI response", e);
            }
        }
        return { text, cards };
    }

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages((prev) => [...prev, { role: "user", text: userMsg, cards: [] }]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await axios.post("/api/chat", {
                message: userMsg,
                history: messages.map((m) => ({ role: m.role === "bot" ? "model" : "user", text: m.text })),
            });

            const { text, cards } = parseAiResponse(response.data.text);

            setMessages((prev) => [
                ...prev,
                { role: "bot", text, cards },
            ]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                { role: "bot", text: "Sorry, I'm having trouble connecting to the server. Please try again later.", cards: [] },
            ]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") handleSend();
    };

    const quickReplies = [
        "Find NGOs near me",
        "Weekend volunteering",
        "Teaching opportunities",
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl w-[350px] sm:w-[400px] h-[600px] flex flex-col overflow-hidden mb-4 border border-gray-100 transition-all duration-300">
                    {/* Header */}
                    <div className="bg-emerald-600 text-white p-4 flex justify-between items-center shadow-md z-10">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-2 rounded-full">
                                <Bot size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Volunteer Assistant</h3>
                                <p className="text-emerald-100 text-xs flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4 no-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    <div className={`shrink-0 p-1.5 rounded-full ${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-emerald-600 shadow-sm"}`}>
                                        {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${msg.role === "user"
                                            ? "bg-emerald-600 text-white rounded-br-none"
                                            : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                                        }`}>
                                        {msg.text}
                                    </div>
                                </div>

                                {/* Cards for Opportunities */}
                                {msg.cards && msg.cards.length > 0 && (
                                    <div className="mt-2 ml-8 flex flex-col gap-2 w-[85%]">
                                        {msg.cards.map((card, cIdx) => (
                                            <div key={cIdx} className="bg-white rounded-xl p-3 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-sm text-gray-800 leading-tight">{card.title}</h4>
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                                                        {card.type}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                                                    <MapPin size={12} /> {card.location}
                                                </p>
                                                <button className="w-full py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                                                    Apply Now
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="flex items-end gap-2 max-w-[85%]">
                                <div className="shrink-0 p-1.5 rounded-full bg-white border border-gray-200 text-emerald-600 shadow-sm">
                                    <Bot size={14} />
                                </div>
                                <div className="bg-white px-4 py-3 border border-gray-100 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Replies */}
                    {messages.length === 1 && (
                        <div className="bg-gray-50 px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
                            {quickReplies.map((reply, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setInput(reply);
                                        setTimeout(() => document.getElementById('send-btn').click(), 50);
                                    }}
                                    className="whitespace-nowrap flex-shrink-0 bg-white text-emerald-600 border border-emerald-200 text-xs px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors"
                                >
                                    {reply}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                        <input
                            type="text"
                            className="flex-1 bg-gray-50 border border-gray-200 text-sm rounded-full px-4 py-2.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                        />
                        <button
                            id="send-btn"
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            className="bg-emerald-600 text-white p-2.5 rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:bg-emerald-700 hover:-translate-y-1 transition-all flex items-center justify-center animate-bounce-slow"
                >
                    <MessageCircle size={28} />
                </button>
            )}
        </div>
    );
}
