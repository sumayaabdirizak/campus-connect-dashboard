"use client";
import { TimePicker, type TimePickerProps } from "antd";

interface CommonTimePickerProps extends TimePickerProps {
  className?: string;
  ariaLabel?: string;
}

const CommonTimePicker: React.FC<CommonTimePickerProps> = ({
  className = "",
  ariaLabel = "Time picker",
  ...props
}) => {
  return (
    <TimePicker
      className='form-control flatpickr-input'
      format="HH:mm"
      suffixIcon={<i className="icon-clock text-dark" aria-hidden="true" />}
      aria-label={ariaLabel}
      {...props}
    />
  );
};

export default CommonTimePicker;