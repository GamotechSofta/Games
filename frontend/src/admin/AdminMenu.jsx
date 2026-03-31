import React from 'react';
import { NavLink } from 'react-router-dom';

const linkCls = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        isActive ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'
    }`;

const AdminMenu = () => {
    return (
        <div className="flex flex-wrap gap-2 mb-5">
            <NavLink to="/admin-panel/dashboard" className={linkCls}>Dashboard</NavLink>
            <NavLink to="/admin-panel/games" className={linkCls}>Games</NavLink>
            <NavLink to="/admin-panel/transactions" className={linkCls}>Transactions</NavLink>
        </div>
    );
};

export default AdminMenu;
