import React from 'react';

const OtpInput = ({ value, onChange, disabled }) => {
  const handleInput = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6);
    onChange(digitsOnly);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">OTP</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleInput}
        disabled={disabled}
        placeholder="Enter 4-6 digit OTP"
        className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm outline-none focus:border-indigo-500"
      />
    </div>
  );
};

export default OtpInput;
