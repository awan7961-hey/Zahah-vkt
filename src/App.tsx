import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Activity, 
  Settings, 
  MessageSquare, 
  Terminal, 
  Power, 
  RefreshCw, 
  Key, 
  ShieldAlert, 
  Zap, 
  Cpu, 
  HardDrive, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles,
  Send,
  Layers,
  Radio,
  Sliders
} from 'lucide-react';

interface BotStatus {
  status: string;
  connectedUser: string | null;
  pairingCode: string | null;
  uptime: number;
  msgCount: number;
  avgResponseMs: number;
  queueLength: number;
  cachedGroups: number;
  ramUsedMB: string;
  totalRamMB: string;
  config: Record<string, any>;
}

interface PluginItem {
  pattern: string;
  alias: string[];
  desc: string;
  category: string;
  enabled: boolean;
  onlyOwner: boolean;
  isGroup: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'config' | 'chat' | 'plugins' | 'logs'>('dashboard');
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Pairing Form State
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState<boolean>(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

  // Config Form State
  const [configState, setConfigState] = useState<Record<string, any>>({});
  const [configSaving, setConfigSaving] = useState<boolean>(false);
  const [configSuccess, setConfigSuccess] = useState<boolean>(false);

  // Plugins State
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [pluginSearch, setPluginSearch] = useState<string>('');
  const [reloadingPlugins, setReloadingPlugins] = useState<boolean>(false);

  // AI Chat Tester State
  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: '👋 Hello! I am BOSS-MD WhatsApp AI Assistant. Send me a message or test a command like ".uptime" or "Hello!"', time: new Date().toLocaleTimeString() }
  ]);
  const [chatSending, setChatSending] = useState<boolean>(false);

  // Logs State
  const [logs, setLogs] = useState<Array<{ id: number; level: string; msg: string; time: string }>>([]);

  // Fetch Status Endpoint
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setConfigState(data.config || {});
        if (data.pairingCode) {
          setPairingCode(data.pairingCode);
        }
      }
    } catch (err) {
      console.error("Error fetching status:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Plugins Endpoint
  const fetchPlugins = async () => {
    try {
      const res = await fetch('/api/plugins');
      if (res.ok) {
        const data = await res.json();
        setPlugins(data.plugins || []);
      }
    } catch (err) {
      console.error("Error fetching plugins:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchPlugins();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Add sample log
  useEffect(() => {
    const timer = setInterval(() => {
      if (status) {
        setLogs(prev => [
          {
            id: Date.now(),
            level: 'INFO',
            msg: `[System Engine] Status: ${status.status} | RAM: ${status.ramUsedMB}MB | Queue: ${status.queueLength}`,
            time: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 49)
        ]);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [status]);

  // Handle Generate Pairing Code
  const handleGeneratePairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setPairingLoading(true);
    setPairingError(null);
    try {
      const res = await fetch('/api/pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      if (res.ok && data.pairingCode) {
        setPairingCode(data.pairingCode);
      } else {
        setPairingError(data.error || 'Failed to generate code.');
      }
    } catch (err: any) {
      setPairingError(err.message || 'Network error.');
    } finally {
      setPairingLoading(false);
    }
  };

  // Handle Save Configuration
  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigSuccess(false);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configState)
      });
      if (res.ok) {
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
        fetchStatus();
      }
    } catch (err) {
      console.error("Error updating config:", err);
    } finally {
      setConfigSaving(false);
    }
  };

  // Handle Plugin Reload
  const handleReloadPlugins = async () => {
    setReloadingPlugins(true);
    try {
      const res = await fetch('/api/plugins/reload', { method: 'POST' });
      if (res.ok) {
        await fetchPlugins();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReloadingPlugins(false);
    }
  };

  // Handle Send Test Message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg, time: new Date().toLocaleTimeString() }]);
    setChatSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setChatHistory(prev => [
        ...prev,
        { sender: 'bot', text: data.response || 'No response returned', time: new Date().toLocaleTimeString() }
      ]);
    } catch (err: any) {
      setChatHistory(prev => [
        ...prev,
        { sender: 'bot', text: `❌ Error: ${err.message}`, time: new Date().toLocaleTimeString() }
      ]);
    } finally {
      setChatSending(false);
    }
  };

  const formatUptimeDisplay = (secs: number) => {
    const d = Math.floor(secs / (3600 * 24));
    const h = Math.floor((secs % (3600 * 24)) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${d > 0 ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
  };

  const filteredPlugins = plugins.filter(p => 
    p.pattern.toLowerCase().includes(pluginSearch.toLowerCase()) ||
    p.desc.toLowerCase().includes(pluginSearch.toLowerCase()) ||
    p.category.toLowerCase().includes(pluginSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white flex items-center gap-2">
                BOSS-MD <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">v10.0 Pro</span>
              </h1>
              <p className="text-xs text-slate-400">Enterprise WhatsApp Multi-Device Framework</p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full ${
                status?.status === 'Connected' ? 'bg-emerald-400 animate-pulse' :
                status?.status === 'Connecting' ? 'bg-amber-400 animate-ping' : 'bg-rose-500'
              }`} />
              <span className="text-xs font-semibold capitalize text-slate-200">
                {status?.status || 'Disconnected'}
              </span>
              {status?.connectedUser && (
                <span className="text-xs text-slate-400 border-l border-slate-700 pl-2">
                  +{status.connectedUser}
                </span>
              )}
            </div>

            <button 
              onClick={fetchStatus}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto py-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'config', label: 'Bot Settings', icon: Settings },
            { id: 'chat', label: 'AI Simulator', icon: MessageSquare },
            { id: 'plugins', label: 'Plugin Engine', icon: Layers },
            { id: 'logs', label: 'System Logs', icon: Terminal },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium transition ${
                  active 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: DASHBOARD & PAIRING */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center text-slate-400 mb-2">
                  <Clock className="w-4 h-4 mr-1.5 text-emerald-400" />
                  <span className="text-xs">Uptime</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {status ? formatUptimeDisplay(status.uptime) : '0s'}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center text-slate-400 mb-2">
                  <Zap className="w-4 h-4 mr-1.5 text-amber-400" />
                  <span className="text-xs">Speed</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {status?.avgResponseMs || 0} ms
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center text-slate-400 mb-2">
                  <MessageSquare className="w-4 h-4 mr-1.5 text-sky-400" />
                  <span className="text-xs">Messages</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {status?.msgCount || 0}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center text-slate-400 mb-2">
                  <Cpu className="w-4 h-4 mr-1.5 text-indigo-400" />
                  <span className="text-xs">RAM Used</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {status?.ramUsedMB || 0} MB
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center text-slate-400 mb-2">
                  <Sliders className="w-4 h-4 mr-1.5 text-purple-400" />
                  <span className="text-xs">Queue</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {status?.queueLength || 0} msgs
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center text-slate-400 mb-2">
                  <Users className="w-4 h-4 mr-1.5 text-rose-400" />
                  <span className="text-xs">Groups Cache</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {status?.cachedGroups || 0}
                </div>
              </div>
            </div>

            {/* Connection & Pairing Code Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* WhatsApp Pairing Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">WhatsApp Pairing Code Generator</h2>
                    <p className="text-xs text-slate-400">Link your WhatsApp account without QR code scanning</p>
                  </div>
                </div>

                <form onSubmit={handleGeneratePairingCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      WhatsApp Phone Number (with country code)
                    </label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. 923076411099"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pairingLoading || !phoneNumber}
                    className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {pairingLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Generating Code...</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-4 h-4" />
                        <span>Generate Pairing Code</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Display Pairing Code Result */}
                {pairingCode && (
                  <div className="mt-5 p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-center">
                    <p className="text-xs text-emerald-300 mb-1 font-medium">Your 8-Digit WhatsApp Linking Code:</p>
                    <div className="text-2xl font-mono font-bold tracking-widest text-emerald-400 select-all my-2">
                      {pairingCode}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Open WhatsApp → Linked Devices → Link with phone number → Enter this code
                    </p>
                  </div>
                )}

                {pairingError && (
                  <div className="mt-4 p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                    ⚠️ {pairingError}
                  </div>
                )}
              </div>

              {/* Engine Status & Bot Identification */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-base">Bot Operational Status</h2>
                      <p className="text-xs text-slate-400">System permissions, owner rights & operating parameters</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                      <span className="text-slate-400">Bot Name</span>
                      <span className="font-mono text-emerald-400 font-semibold">{status?.config?.BOT_NAME || 'BOSS-MD'}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                      <span className="text-slate-400">Command Prefix</span>
                      <span className="font-mono text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {status?.config?.PREFIX || '.'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                      <span className="text-slate-400">Operating Mode</span>
                      <span className="font-mono uppercase text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                        {status?.config?.MODE || 'PUBLIC'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                      <span className="text-slate-400">AI Conversation Mode</span>
                      <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                        status?.config?.AI_MODE === 'true' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {status?.config?.AI_MODE === 'true' ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs py-2 border-b border-slate-800">
                      <span className="text-slate-400">Owner Number</span>
                      <span className="font-mono text-slate-300">{status?.config?.OWNER_NUMBER || '923076411099'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Gemini API Engine: <strong className="text-emerald-400">Connected</strong></span>
                  <span>Baileys Socket: <strong className="text-sky-400">Active</strong></span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: BOT SETTINGS */}
        {activeTab === 'config' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="font-bold text-white text-lg">Bot Feature Toggles & Configuration</h2>
                <p className="text-xs text-slate-400">Configure real-time response parameters and anti-spam protections</p>
              </div>

              <button
                onClick={handleSaveConfig}
                disabled={configSaving}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{configSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>

            {configSuccess && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
                ✅ Settings updated successfully!
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Left Column: Basic Config */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">General Identification</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Bot Name</label>
                  <input
                    type="text"
                    value={configState.BOT_NAME || ''}
                    onChange={(e) => setConfigState({ ...configState, BOT_NAME: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Command Prefix</label>
                  <input
                    type="text"
                    value={configState.PREFIX || ''}
                    onChange={(e) => setConfigState({ ...configState, PREFIX: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Operating Mode</label>
                  <select
                    value={configState.MODE || 'public'}
                    onChange={(e) => setConfigState({ ...configState, MODE: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="public">Public (Everyone can use commands)</option>
                    <option value="private">Private (Owner only)</option>
                    <option value="inbox">Inbox Only (Ignore group commands)</option>
                    <option value="groups">Groups Only (Ignore DM commands)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Owner Number</label>
                  <input
                    type="text"
                    value={configState.OWNER_NUMBER || ''}
                    onChange={(e) => setConfigState({ ...configState, OWNER_NUMBER: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Right Column: Toggles */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Automation & Protection Toggles</h3>

                {[
                  { key: 'AI_MODE', label: 'Gemini AI Auto Response Mode', desc: 'Auto respond to inbox messages with AI' },
                  { key: 'AUTO_READ', label: 'Auto Read Inbox Messages', desc: 'Automatically mark received messages as read' },
                  { key: 'AUTO_REACT', label: 'Auto Emoji Reactions', desc: 'React to messages with expressive emojis' },
                  { key: 'ANTI_DELETE', label: 'Anti Delete Protection', desc: 'Recover deleted group and DM messages' },
                  { key: 'ANTI_CALL', label: 'Anti WhatsApp Call', desc: 'Automatically reject incoming calls' },
                  { key: 'AUTO_STATUS_SEEN', label: 'Auto View Status Stories', desc: 'Automatically mark contacts status stories as viewed' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                    <div>
                      <div className="text-xs font-semibold text-white">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setConfigState({ ...configState, [item.key]: configState[item.key] === 'true' ? 'false' : 'true' })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        configState[item.key] === 'true' ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        configState[item.key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: AI SIMULATOR */}
        {activeTab === 'chat' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl h-[650px] flex flex-col max-w-4xl mx-auto overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-sm">Bot & Gemini AI Simulator</h2>
                  <p className="text-xs text-slate-400">Test commands & AI conversations directly from the console</p>
                </div>
              </div>

              <button
                onClick={() => setChatHistory([])}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800"
              >
                Clear History
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 font-sans text-xs">
              {chatHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3.5 ${
                      item.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{item.text}</div>
                    <div className="text-[10px] opacity-60 text-right mt-1">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-800 bg-slate-950/60 flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message or command (e.g. .uptime or Hello Gemini)..."
                className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={chatSending || !chatInput.trim()}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center space-x-1"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: PLUGIN ENGINE */}
        {activeTab === 'plugins' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 border border-slate-800 rounded-2xl">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">Loaded Plugins ({plugins.length})</h2>
                  <p className="text-xs text-slate-400">Dynamic plugin engine with auto-discovery and hot reloading</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={pluginSearch}
                  onChange={(e) => setPluginSearch(e.target.value)}
                  placeholder="Filter plugins..."
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500"
                />

                <button
                  onClick={handleReloadPlugins}
                  disabled={reloadingPlugins}
                  className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reloadingPlugins ? 'animate-spin' : ''}`} />
                  <span>Reload</span>
                </button>
              </div>
            </div>

            {/* Plugin Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlugins.map((plugin, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        .{plugin.pattern}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {plugin.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-3">{plugin.desc || 'No description provided.'}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Aliases: {plugin.alias?.length ? plugin.alias.join(', ') : 'None'}</span>
                    <span className="text-emerald-400">Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM LOGS */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-5xl mx-auto space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">System Runtime Event Logs</span>
              </div>
              <button
                onClick={() => setLogs([])}
                className="text-slate-500 hover:text-white text-xs"
              >
                Clear
              </button>
            </div>

            <div className="h-[500px] overflow-y-auto space-y-1 bg-slate-950 p-4 rounded-xl text-slate-300">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-10">No log entries recorded yet.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="hover:bg-slate-900/50 p-1 rounded transition">
                    <span className="text-slate-500 mr-2">[{log.time}]</span>
                    <span className="text-emerald-400 font-semibold mr-2">[{log.level}]</span>
                    <span>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
