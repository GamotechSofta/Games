import React from 'react';

const MobileNumberInput = ({ value, onChange, disabled }) => {
  const handleInput = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(digitsOnly);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">Mobile Number</label>
      <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3">
        <span className="text-sm text-gray-500">+91</span>
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={handleInput}
          disabled={disabled}
          placeholder="9876543210"
          className="w-full rounded-lg px-2 py-3 text-sm outline-none"
        />
      </div>
    </div>
  );
};

export default MobileNumberInput;
