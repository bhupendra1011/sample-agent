// src/services/uiService.ts
import { toast } from "react-toastify"; // Import the toast function from react-toastify

/**
 * Displays a toast notification with a specified message and type.
 *
 * @param {string} message - The message to display in the toast.
 * @param {"success" | "error"} [type="success"] - The type of toast, affecting its visual style.
 */
export const showToast = (
  message: string,
  type: "success" | "error" = "success"
): void => {
  // react-toastify's toast function is more direct and context-aware
  switch (type) {
    case "success":
      toast.success(message, {
        position: "top-right", // Position of the toast
        autoClose: 3000, // Auto-close after 3 seconds
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored", // Uses predefined themes for styling
      });
      break;
    case "error":
      toast.error(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      break;
    default: // Fallback for any other types, uses a default toast
      toast(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
      break;
  }
};
