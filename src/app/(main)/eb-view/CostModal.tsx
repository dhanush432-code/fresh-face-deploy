import { useState, useEffect, FC } from 'react';
import { CurrencyRupeeIcon } from '@heroicons/react/24/outline';

interface CostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cost: number) => void;
  cost: number; // The current cost from the parent, used as an initial value
  isLoading: boolean;
  // The `setCost` prop is no longer needed by this component
}

const CostModal: FC<CostModalProps> = ({ isOpen, onClose, onSave, cost, isLoading }) => {
  // --- CHANGES START HERE ---

  // 1. Local state to manage the input field value as a string.
  // This allows the input to be empty ('').
  const [inputValue, setInputValue] = useState<string>('');

  // 2. Use useEffect to set the initial value when the modal opens.
  useEffect(() => {
    if (isOpen) {
      // If the initial cost from the parent is a valid number greater than 0, show it.
      // Otherwise, start with a blank input field.
      setInputValue(cost > 0 ? String(cost) : '');
    }
  }, [isOpen, cost]); // This effect runs whenever the modal opens or the initial cost changes.

  const handleSave = () => {
    const numericCost = parseFloat(inputValue);

    // 3. Validate that the parsed number is valid and not negative.
    if (isNaN(numericCost) || numericCost < 0) {
      alert('Please enter a valid, non-negative number for the cost.');
      return;
    }
    onSave(numericCost);
  };

  // --- CHANGES END HERE ---

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900">Set Cost Per Unit</h2>
        <p className="text-sm text-gray-600 mt-1">This cost will be applied to all currently displayed readings.</p>
        
        <div className="mt-4">
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
            Cost (INR)
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <CurrencyRupeeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="number"
              name="cost"
              id="cost"
              className="block w-full rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
              placeholder="e.g., 8.50" // A better placeholder
              step="0.01"
              // 4. The input is now bound to our local string state.
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              autoFocus // Automatically focus the input when the modal opens
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save and Recalculate'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CostModal;