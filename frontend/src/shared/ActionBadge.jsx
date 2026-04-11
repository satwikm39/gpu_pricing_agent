import React from 'react';

const ACTION_COLORS = {
    APPROVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    OVERRIDE: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    REJECT: 'bg-red-500/10 text-red-400 border-red-500/20',
    EVICT: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

const ActionBadge = ({ action }) => (
    <span className={`px-3 py-1 rounded-md font-display font-bold text-sm border uppercase tracking-wider ${ACTION_COLORS[action] || ACTION_COLORS.REJECT}`}>
        {action}
    </span>
);

export default ActionBadge;
