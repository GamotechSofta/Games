import React from 'react';

const ProtectedDemo = () => {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-indigo-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-indigo-700">Protected Route Example</h2>
      <p className="mt-2 text-sm text-gray-600">
        This page is accessible only when a valid JWT exists in localStorage.
      </p>
      <p className="mt-2 text-sm text-gray-600">
        Route path: <span className="font-medium">/protected-example</span>
      </p>
    </div>
  );
};

export default ProtectedDemo;
