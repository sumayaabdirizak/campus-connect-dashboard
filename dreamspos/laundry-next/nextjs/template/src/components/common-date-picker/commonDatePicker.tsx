"use client";
import React from "react";
import { DatePicker, type DatePickerProps } from "antd";

type CommonDatePickerProps = DatePickerProps & {
  className?: string;
  icon?: React.ReactNode; // allows passing a custom icon
  ariaLabel?: string;
};

const CommonDatePicker: React.FC<CommonDatePickerProps> = React.memo(
  ({
    className = "",
    icon = <i className="icon-calendar-days text-dark" aria-hidden="true" />,
    format = "D/M/YYYY", // <-- add this line
    ariaLabel = "Date picker",
    ...props
  }) => {
    return (
      <div className={`common-datePicker ${className}`}>
        <DatePicker
          className="form-control"
          suffixIcon={icon}
          format={format}
          aria-label={ariaLabel}
          {...props}
        />
      </div>
    );
  }
);

export default CommonDatePicker;
