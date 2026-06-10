interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Proceed",
  cancelText = "Cancel",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4 shadow-xl">
        {title && (
          <h2 className="text-white text-xl font-bold mb-4">{title}</h2>
        )}
        <p className="text-white text-lg mb-6">
          {message ?? "You haven't answered all the questions. Can you confirm you want to proceed?"}
        </p>
        <div className="flex space-x-4 justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-white text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors font-semibold"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
