
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Terminal, Layers, RefreshCw, Copy, Check, MousePointer2, Plus } from 'lucide-react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { appStore } from '@/lib/store';
import { RequestType } from '../types';
import { Avatar } from '../components/ui/Avatar';

interface Message {
  role: 'user' | 'model';
  text: string;
  toolCall?: {
    name: string;
    args: any;
  };
}

const CREATE_REQUEST_TOOL: FunctionDeclaration = {
  name: 'create_rpc_request',
  description: 'Creates a new JSON-RPC request tab.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      method: { type: Type.STRING, description: 'RPC method' },
      params: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Params' },
      name: { type: Type.STRING, description: 'Name' }
    },
    required: ['method', 'params', 'name']
  }
};

const CREATE_PTB_TOOL: FunctionDeclaration = {
  name: 'create_ptb',
  description: 'Creates a new PTB tab.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Name' },
      description: { type: Type.STRING, description: 'Description' }
    },
    required: ['name']
  }
};

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Sui AI Console ready." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (userMessage: string) => {
    if (!userMessage.trim() || isTyping) return;

    setInput('');
    const historyForAi = [...messages, { role: 'user', text: userMessage } as Message];
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: historyForAi.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: "You are a technical assistant for Sui blockchain development. Be concise. Provide raw code or JSON when asked.",
          tools: [{ functionDeclarations: [CREATE_REQUEST_TOOL, CREATE_PTB_TOOL] }]
        },
      });

      const callPart = response.functionCalls?.[0];
      const responseText = response.text || (callPart ? `Prepared tool call: ${callPart.name}` : "No response generated.");
      
      const assistantMsg: Message = { role: 'model', text: responseText };
      
      if (callPart) {
        assistantMsg.toolCall = { name: callPart.name, args: callPart.args };
      }

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "Error: AI Service Unavailable." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const executeToolCall = (toolCall: { name: string, args: any }) => {
      if (toolCall.name === 'create_rpc_request') {
          appStore.openTab('rpc', {
            id: `rpc-gen-${Date.now()}`,
            name: toolCall.args.name || 'Generated Request',
            type: RequestType.RPC,
            rpcParams: { method: toolCall.args.method, params: toolCall.args.params || [] },
            moveParams: { packageId: '', module: '', function: '', typeArguments: [], arguments: [], gasBudget: '10000000' }
          });
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans">
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
        <span className="font-bold text-slate-400 text-xs">AI Console</span>
        <button onClick={() => setMessages([])} className="p-1 text-slate-500 hover:text-white"><RefreshCw size={14}/></button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <Avatar 
                size="xs" 
                type={m.role === 'model' ? 'bot' : 'user'} 
                seed={m.role === 'model' ? 'sui-ai' : 'flow-user'} 
             />
             <div className={`max-w-[90%] space-y-2`}>
                 <div className={`p-3 rounded text-xs font-mono whitespace-pre-wrap relative group ${m.role === 'user' ? 'bg-slate-800 text-slate-200' : 'bg-black border border-slate-800 text-slate-300'}`}>
                     {m.text}
                     {m.role === 'model' && (
                        <button onClick={() => handleCopy(m.text, i)} className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white">
                            {copiedId === i ? <Check size={12}/> : <Copy size={12}/>}
                        </button>
                     )}
                 </div>
                 {m.toolCall && (
                     <div className="bg-slate-900 border border-slate-800 p-2 rounded flex items-center justify-between">
                         <div className="text-xs text-sui-400 font-mono flex items-center gap-2">
                             {m.toolCall.name === 'create_rpc_request' ? <Terminal size={12}/> : <Layers size={12}/>}
                             {m.toolCall.args.name}
                         </div>
                         <button onClick={() => executeToolCall(m.toolCall!)} className="p-1 bg-sui-700 text-white rounded hover:bg-sui-600"><Plus size={12}/></button>
                     </div>
                 )}
             </div>
          </div>
        ))}
        {isTyping && <div className="text-xs text-slate-600 italic px-10">Processing...</div>}
      </div>

      <div className="p-3 border-t border-slate-800 bg-slate-900">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="relative">
              <input 
                  className="w-full bg-black border border-slate-700 rounded p-2 pr-10 text-xs text-white font-mono focus:border-sui-500 outline-none"
                  placeholder="Enter prompt..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isTyping}
              />
              <button type="submit" disabled={!input.trim()} className="absolute right-2 top-1.5 text-slate-500 hover:text-white"><Send size={14}/></button>
          </form>
      </div>
    </div>
  );
};
