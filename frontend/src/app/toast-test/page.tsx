"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToastMessage } from "@/components/ui/toast";
// import { Navigation } from "@/components/navigation";
import { CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

export default function ToastTestPage() {
  const { success, error, info, warning } = useToastMessage();
  const [count, setCount] = useState(0);

  const handleSuccess = () => {
    const newCount = count + 1;
    setCount(newCount);
    success("Success Toast", `This is success message #${newCount}`);
  };

  const handleError = () => {
    const newCount = count + 1;
    setCount(newCount);
    error("Error Toast", `This is error message #${newCount}`);
  };

  const handleInfo = () => {
    const newCount = count + 1;
    setCount(newCount);
    info("Info Toast", `This is info message #${newCount}`);
  };

  const handleWarning = () => {
    const newCount = count + 1;
    setCount(newCount);
    warning("Warning Toast", `This is warning message #${newCount}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      

      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Toast Notification Test
            </h1>
            <p className="text-gray-600">
              Click the buttons below to test different toast notifications
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleSuccess}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Success Toast
            </Button>

            <Button
              onClick={handleError}
              className="bg-red-600 hover:bg-red-700"
              size="lg"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Error Toast
            </Button>

            <Button
              onClick={handleInfo}
              className="bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <Info className="h-5 w-5 mr-2" />
              Info Toast
            </Button>

            <Button
              onClick={handleWarning}
              className="bg-yellow-600 hover:bg-yellow-700"
              size="lg"
            >
              <AlertTriangle className="h-5 w-5 mr-2" />
              Warning Toast
            </Button>
          </div>

          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Test Statistics:</h3>
            <p className="text-gray-700">Toasts triggered: {count}</p>
            <p className="text-sm text-gray-600 mt-2">
              Check the bottom-right corner for toast notifications
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Implementation Notes:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ ToastProvider integrated in root layout</li>
              <li>✅ useToastMessage hook available app-wide</li>
              <li>✅ Toasts auto-dismiss after 5 seconds</li>
              <li>✅ Multiple toasts stack vertically</li>
              <li>✅ Accessible with ARIA live regions</li>
              <li>✅ Keyboard accessible (Escape to close)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}