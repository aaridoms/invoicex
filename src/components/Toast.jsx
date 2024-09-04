import React, { useState } from "react";

const Toast = ({ message, type = "success", onClose }) => {
  const typeStyles = {
    success: "bg-green-100 text-green-500",
    error: "bg-red-100 text-red-500",
    warning: "bg-yellow-100 text-yellow-500",
    info: "bg-blue-100 text-blue-500",
  };

  return (
    <div className="fixed bottom-4 right-4 max-w-xs w-full">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center space-x-4">
        {/* Icono */}
        <div className={`${typeStyles[type]} rounded-full p-2`}>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 12l2 2 4-4M7 20h10M5 16h14M3 12h18M5 8h14M7 4h10"
            ></path>
          </svg>
        </div>

        {/* Mensaje */}
        <div className="text-gray-800 text-xl">
          <p>{message}</p>
        </div>

        {/* Botón de cerrar */}
        <button
          className="text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
