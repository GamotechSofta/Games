import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserToken, isTokenExpired } from '../utils/auth';

const ProtectedRoute = ({ children }) => {
  const token = getUserToken();
  if (!token || isTokenExpired(token)) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
