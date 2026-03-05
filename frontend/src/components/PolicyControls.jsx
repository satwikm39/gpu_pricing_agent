import React, { useState } from 'react';

const PolicyControls = () => {
    const [settings, setSettings] = useState({
        min_margin: '15',
        scarcity_threshold: '10',
        scarcity_multiplier: '3.0',
        max_market_premium: '20'
    });
    const [envSettings, setEnvSettings] = useState({
        gpu_type: 'H100',
        depreciation_cost: 1.00,
        power_opex: 0.50
    });
    
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [envSaving, setEnvSaving] = useState(false);
    const [envSaved, setEnvSaved] = useState(false);

    const handleChange = (e) => {
        setSettings({
            ...settings,
            [e.target.name]: e.target.value
        });
        setSaved(false);
    };

    const handleEnvChange = (e) => {
        const { name, value, type } = e.target;
        setEnvSettings({
            ...envSettings,
            [name]: type === 'number' || type === 'range' ? parseFloat(value) || 0 : value
        });
        setEnvSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                min_margin: `${settings.min_margin}%`,
                scarcity_threshold: settings.scarcity_threshold,
                scarcity_multiplier: settings.scarcity_multiplier,
                max_market_premium: `${settings.max_market_premium}%`
            };
            
            await fetch('http://localhost:8000/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch(err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleEnvSave = async () => {
        setEnvSaving(true);
        try {
            await fetch('http://localhost:8000/api/environment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envSettings)
            });
            setEnvSaved(true);
            setTimeout(() => setEnvSaved(false), 2000);
        } catch(err) {
            console.error(err);
        } finally {
            setEnvSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="glass-panel p-5 flex flex-col gap-5">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Policy Sandbox
            </h3>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Min Margin Floor (%)</label>
                    <span className="text-accent-400 font-mono bg-accent-500/10 px-2 py-0.5 rounded">{settings.min_margin}%</span>
                </div>
                <input 
                    type="range" 
                    name="min_margin"
                    min="0" max="50" step="1"
                    value={settings.min_margin}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent-500"
                />
                <p className="text-xs text-slate-500 mt-2">Prevents AI from executing deals below fixed costs + margin protection.</p>
            </div>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Scarcity Threshold (%)</label>
                    <span className="text-red-400 font-mono bg-red-500/10 px-2 py-0.5 rounded">&lt; {settings.scarcity_threshold}%</span>
                </div>
                <input 
                    type="range" 
                    name="scarcity_threshold"
                    min="5" max="30" step="1"
                    value={settings.scarcity_threshold}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
            </div>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Scarcity Multiplier (x)</label>
                    <span className="text-yellow-400 font-mono bg-yellow-500/10 px-2 py-0.5 rounded">{settings.scarcity_multiplier}x</span>
                </div>
                <input 
                    type="range" 
                    name="scarcity_multiplier"
                    min="1.0" max="5.0" step="0.1"
                    value={settings.scarcity_multiplier}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
                <p className="text-xs text-slate-500 mt-2">Price surge when available inventory drops below threshold.</p>
            </div>

            <div className="pt-2 border-t border-slate-700/50">
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis mr-2">Max Market Premium (%)</label>
                    <span className="text-pink-400 font-mono bg-pink-500/10 px-2 py-0.5 rounded">{settings.max_market_premium}%</span>
                </div>
                <input 
                    type="range" 
                    name="max_market_premium"
                    min="0" max="100" step="5"
                    value={settings.max_market_premium}
                    onChange={handleChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                    <span>Matches Competitor</span>
                    <span>100% markup allowed</span>
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={saving || saved}
                className={`w-full py-2.5 mt-2 rounded-lg font-bold text-sm transition-all duration-300 shadow-lg ${saved ? 'bg-green-600/90 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'}`}
            >
                {saving ? 'Syncing...' : saved ? 'Policy Live!' : 'Deploy New Policies'}
            </button>
        </div>

        {/* Fleet Environment Panel */}
        <div className="glass-panel p-5 flex flex-col gap-5">
            <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Fleet Environment
            </h3>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Hardware Target</label>
                </div>
                <select 
                    name="gpu_type"
                    value={envSettings.gpu_type}
                    onChange={handleEnvChange}
                    className="w-full bg-slate-800 text-slate-200 border border-slate-600 rounded-lg p-2 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                >
                    <option value="H100">NVIDIA H100 (High-End Gen AI)</option>
                    <option value="A100">NVIDIA A100 (Legacy Model Training)</option>
                    <option value="L40S">NVIDIA L40S (Inference & Graphics)</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">Sets the default hardware type the Agent will simulate traffic for.</p>
            </div>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Depreciation Cost ($/hr)</label>
                    <span className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">${envSettings.depreciation_cost.toFixed(2)}</span>
                </div>
                <input 
                    type="range" 
                    name="depreciation_cost"
                    min="0.10" max="3.00" step="0.10"
                    value={envSettings.depreciation_cost}
                    onChange={handleEnvChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            <div>
                <div className="flex justify-between text-sm mb-1.5">
                    <label className="text-slate-300 font-medium">Power OPEX ($/hr)</label>
                    <span className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded">${envSettings.power_opex.toFixed(2)}</span>
                </div>
                <input 
                    type="range" 
                    name="power_opex"
                    min="0.10" max="1.50" step="0.05"
                    value={envSettings.power_opex}
                    onChange={handleEnvChange}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

            <button 
                onClick={handleEnvSave}
                disabled={envSaving || envSaved}
                className={`w-full py-2.5 mt-2 rounded-lg font-bold text-sm transition-all duration-300 shadow-lg ${envSaved ? 'bg-blue-600/90 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'}`}
            >
                {envSaving ? 'Syncing...' : envSaved ? 'Environment Updated!' : 'Update Hardware Costs'}
            </button>
        </div>
    </div>
    );
};

export default PolicyControls;
