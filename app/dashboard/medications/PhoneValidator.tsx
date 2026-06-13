// app/dashboard/medications/PhoneValidator.tsx

"use client";

import { useState } from "react";
import { cleanAndValidatePhone } from "@/lib/validation";

export function PhoneValidator() {
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<{
    isValid: boolean;
    cleanedPhone?: string;
    error?: string;
  } | null>(null);

  const handleValidate = () => {
    const validationResult = cleanAndValidatePhone(phone);
    setResult(validationResult);
  };

  const handleTestPhones = (testPhone: string) => {
    setPhone(testPhone);
    const validationResult = cleanAndValidatePhone(testPhone);
    setResult(validationResult);
  };

  const handleClear = () => {
    setPhone("");
    setResult(null);
  };

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm max-w-md">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">MED001</h2>
        <p className="text-sm text-gray-600">E.164 Phone Validation</p>
      </div>

      {/* Input Section */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Enter Phone Number:</label>
        <input
          type="text"
          placeholder="+33612345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleValidate()}
          className="border border-gray-300 p-3 w-full rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleValidate}
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded flex-1 font-medium"
        >
          Validate
        </button>
        <button
          onClick={handleClear}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 p-2 rounded flex-1"
        >
          Clear
        </button>
      </div>

      {/* Test Buttons */}
      <div className="mb-4 space-y-2">
        <p className="text-xs font-semibold text-gray-600">Quick Tests:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleTestPhones("+33612345678")}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 p-2 rounded text-xs"
          >
            Valid: +33612345678
          </button>
          <button
            onClick={() => handleTestPhones("+33 6 12 34 56 78")}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 p-2 rounded text-xs"
          >
            With Spaces
          </button>
          <button
            onClick={() => handleTestPhones("06 12 34 56 78")}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 p-2 rounded text-xs"
          >
            Invalid: No +
          </button>
          <button
            onClick={() => handleTestPhones("+1")}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 p-2 rounded text-xs"
          >
            Too Short
          </button>
        </div>
      </div>

      {/* Result Section */}
      {result && (
        <div
          className={`p-4 rounded-lg border-2 ${
            result.isValid ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"
          }`}
        >
          {result.isValid ? (
            <div>
              <p className="text-green-800 font-bold text-lg">✅ VALID</p>
              <p className="text-green-700 text-sm mt-1">
                Cleaned: <code className="bg-green-100 px-2 py-1">{result.cleanedPhone}</code>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-red-800 font-bold text-lg">❌ INVALID</p>
              <p className="text-red-700 text-sm mt-1">{result.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Documentation */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold text-gray-800 mb-2 text-sm">E.164 Rules:</h3>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>
            {" "}
            Must start with: <code className="bg-gray-200 px-1">+</code>
          </li>
          <li> Country code: 1-3 digits</li>
          <li> Phone number: 1-14 digits</li>
          <li> Total: 1-15 digits after +</li>
          <li> No spaces, dashes, or symbols</li>
          <li>
            {" "}
            Example: <code className="bg-gray-200 px-1">+33612345678</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
