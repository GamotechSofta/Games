import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminPrivateRoute = ({ children }) => {
    const admin = localStorage.getItem('admin');
    const token = localStorage.getItem('adminToken');
    if (!admin || !token) {
        return <Navigate to="/" replace />;
    }
    return children;
};

export default AdminPrivateRoute;
