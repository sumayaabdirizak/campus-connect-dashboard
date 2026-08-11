"use client";
import { type FC, useState } from "react";

interface QuantityControlProps {
  defaultValue?: number;
  min?: number;
}

const QuantityControl: FC<QuantityControlProps> = ({
  defaultValue = 0,   // 👈 default now 0
  min = 0,            // 👈 allow decreasing down to 0
}) => {

  const [value, setValue] = useState<number>(defaultValue);

  const handleIncrease = () => {
    setValue(prev => prev + 1);
  };

  const handleDecrease = () => {
    setValue(prev => (prev > min ? prev - 1 : prev));
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <div className="quantity-control" onClick={handleContainerClick}>
      <button type="button" className="minus-btn btn" onClick={handleDecrease}>
        <i className="icon-minus" />
      </button>

      <input
        type="text"
        className="quantity-input"
        value={value}
        readOnly
        aria-label="Quantity"
      />

      <button type="button" className="add-btn btn" onClick={handleIncrease}>
        <i className="icon-plus" />
      </button>
    </div>
  );
};

export default QuantityControl;
