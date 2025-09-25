"use client";
import React, { useState, useEffect } from "react";
import { Header } from "@/components/header";
import Image from "next/image";
import Charcater from "../../components/Charcater";
import { Modal } from "../../components/Modal";
import { useX402Client } from "@/lib/x402-client";

interface Agent {
  name: string;
  desc: string;
  endpoint: string;
  fee: string;
}

interface AgentsResponse {
  agents: Agent[];
}

const page = () => {
  const { connected, account, x402fetch } = useX402Client();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [characterPositions, setCharacterPositions] = useState<
    { x: number; y: number; vx: number; vy: number }[]
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAgent, setModalAgent] = useState<Agent | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "agent"; message: string }[]
  >([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Orchestrator state
  const [orchestratorQuery, setOrchestratorQuery] = useState("");
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState<any>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch("http://localhost:4021/get-agents");
        const data: AgentsResponse = await response.json();
        setAgents(data.agents);

        // Initialize random positions and velocities for each agent
        const initialPositions = data.agents.map(() => ({
          x: Math.random() * 600 + 100, // Random x between 100-700 (70% of screen width)
          y: Math.random() * 400 + 100, // Random y between 100-500 (70% of screen height)
          vx: (Math.random() - 0.5) * 2, // Random velocity x between -1 to 1
          vy: (Math.random() - 0.5) * 2, // Random velocity y between -1 to 1
        }));
        setCharacterPositions(initialPositions);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Animation effect
  useEffect(() => {
    if (characterPositions.length === 0) return;

    const animate = () => {
      setCharacterPositions((prevPositions) =>
        prevPositions.map((pos) => {
          let newX = pos.x + pos.vx;
          let newY = pos.y + pos.vy;
          let newVx = pos.vx;
          let newVy = pos.vy;

          // Boundary collision detection (70% of screen center)
          // Screen boundaries: x: 100-700, y: 100-500
          if (newX <= 100 || newX >= 700) {
            newVx = -newVx;
            newX = newX <= 100 ? 101 : 699;
          }
          if (newY <= 100 || newY >= 500) {
            newVy = -newVy;
            newY = newY <= 100 ? 101 : 499;
          }

          return {
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        })
      );
    };

    const interval = setInterval(animate, 50); // Update every 50ms for smooth animation
    return () => clearInterval(interval);
  }, [characterPositions.length]);

  const handleCharacterClick = (agent: Agent) => {
    setModalAgent(agent);
    setIsModalOpen(true);
    setChatHistory([]); // Clear chat history when opening modal
    console.log("Selected agent:", agent);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalAgent(null);
    setChatMessage("");
    setChatHistory([]);
  };


  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !modalAgent || !connected || !account) {
      return;
    }

    setIsProcessing(true);
    const userMessage = chatMessage.trim();

    // Add user message to chat history
    setChatHistory((prev) => [...prev, { role: "user", message: userMessage }]);
    setChatMessage("");

    try {
      // Send message to agent via X402 payment using Aptos x402 client
      const response = await x402fetch(modalAgent.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: userMessage,
        }),
      });

      // Add agent response to chat history
      setChatHistory((prev) => [
        ...prev,
        {
          role: "agent",
          message: response.message || "Task completed successfully!",
        },
      ]);
    } catch (error) {
      console.error("Failed to send message:", error);

      let errorMessage = "Failed to process request";
      if (error instanceof Error) {
        if (error.message.includes("400 Bad Request")) {
          errorMessage = "Invalid request format. Please try again.";
        } else if (error.message.includes("Payment verification failed")) {
          errorMessage = "Payment verification failed. Please try again.";
        } else if (error.message.includes("Request failed: 402")) {
          errorMessage =
            "Payment required. Please ensure your wallet is connected.";
        } else {
          errorMessage = error.message;
        }
      }

      setChatHistory((prev) => [
        ...prev,
        {
          role: "agent",
          message: `❌ ${errorMessage}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrchestratorSend = async () => {
    if (!orchestratorQuery.trim() || !connected || !account) {
      return;
    }

    setIsOrchestrating(true);
    const query = orchestratorQuery.trim();
    setOrchestratorQuery("");

    try {
      console.log("🤖 Starting orchestration for:", query);

      const response = await x402fetch("http://localhost:4021/orchestrate", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      console.log("✅ Orchestration completed:", response);
      setOrchestrationResult(response);

      // Show success message in a simple way
      alert(`Orchestration completed! Check console for details.`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("❌ Orchestration failed:", errorMsg);
      alert(`Orchestration failed: ${errorMsg}`);
    } finally {
      setIsOrchestrating(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="relative w-full h-screen">
        
        <Image
          src={"/Village.png"}
          alt="Village Background"
          fill
          className="object-cover"
          priority
        />

        <div className="absolute top-0 left-0 right-0 z-20">
        <Header />
        </div>


       
        {/* Movement boundary indicator (optional - for debugging) */}
        <div
          className="absolute"
          style={{
            left: "100px",
            top: "100px",
            width: "600px",
            height: "400px",
          }}
        ></div>

        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-xl">Loading agents...</div>
          </div>
        )}

        {/* Agents as characters */}
        {!loading &&
          agents.map((agent, index) => {
            const position = characterPositions[index];
            if (!position) return null;

            return (
              <Charcater
                key={agent.name}
                character={{
                  id: `agent-${index}`,
                  ...agent,
                }}
                position={{ x: position.x, y: position.y }}
                isSelected={selectedAgent === agent.name}
                onClick={() => handleCharacterClick(agent)}
              />
            );
          })}

        {/* Professional Character with Chat Interface */}
        <div className="absolute bottom-6 right-6 flex items-end space-x-4">
          {/* Chat Input */}
          <div className=" backdrop-blur-md rounded-lg p-4 border border-gray-600">
            <div className="flex space-x-3">
              <textarea
                value={orchestratorQuery}
                onChange={(e) => setOrchestratorQuery(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  (e.preventDefault(), handleOrchestratorSend())
                }
                placeholder="Tell your agent it does the job for you!"
                className=" text-black px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-white resize-none w-48 h-16 text-sm"
                rows={2}
                disabled={isOrchestrating || !connected}
              />
              <button
                onClick={handleOrchestratorSend}
                disabled={
                  !orchestratorQuery.trim() || isOrchestrating || !connected
                }
                className="bg-white text-black hover:bg-gray-200 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed px-3 py-2 rounded text-sm font-medium transition-colors"
              >
                {isOrchestrating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>

          {/* Professional Character Image */}
          <div className="relative">
            <Image
              src="/Professional.png"
              alt="Professional Assistant"
              width={120}
              height={150}
              className="rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Agent Interaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        className="max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {modalAgent && (
          <div className="bg-black/90 backdrop-blur-md text-white border border-gray-600 flex flex-col h-full max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600 flex-shrink-0">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {modalAgent.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{modalAgent.name}</h2>
                  <p className="text-gray-300 text-sm">{modalAgent.desc}</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Agent Info */}
            <div className="p-6 border-b border-gray-600 flex-shrink-0">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-300 text-sm">
                    Cost per message:
                  </span>
                  <p className="text-lg font-semibold text-white">
                    {modalAgent.fee} tokens
                  </p>
                </div>
                <div>
                  <span className="text-gray-300 text-sm">Status:</span>
                  <p className="text-white font-medium">Ready</p>
                </div>
              </div>
            </div>

            {/* Chat History - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
              {chatHistory.length === 0 ? (
                <div className="text-center text-gray-300 py-8">
                  <p>Start a conversation with {modalAgent.name}</p>
                </div>
              ) : (
                chatHistory.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-white text-black"
                          : "bg-gray-700 text-white"
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-white px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="text-sm">Processing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-6 border-t border-gray-600 flex-shrink-0">
              <div className="flex space-x-3">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    (e.preventDefault(), handleSendMessage())
                  }
                  placeholder={`Type your message to ${modalAgent.name}...`}
                  className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:border-white resize-none h-16"
                  disabled={isProcessing || !connected}
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={
                    !chatMessage.trim() || isProcessing || !connected
                  }
                  className="bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center min-w-[80px]"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                  ) : (
                    "Send"
                  )}
                </button>
              </div>

              {!connected && (
                <p className="text-gray-400 text-sm mt-2">
                  Please connect your wallet to send messages
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default page;
