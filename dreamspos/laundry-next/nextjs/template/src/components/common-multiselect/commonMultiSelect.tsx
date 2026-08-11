"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Select from "react-select";
import type { StylesConfig, DropdownIndicatorProps, GroupBase } from "react-select";

export type Option = {
  value: string;
  label: string;
};

export interface SelectProps {
  options: Option[];
  defaultValue?: Option[];        // <-- array for multi select
  className?: string;
  styles?: StylesConfig<Option, true>;
  ariaLabel?: string;
  placeholder?: string;
}

// Custom dropdown indicator
const DropdownIndicator = (
  props: DropdownIndicatorProps<Option, true, GroupBase<Option>>
) => (
  <div {...props.innerProps} style={{ padding: "0 8px" }}>
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: "4px solid transparent",
        borderRight: "4px solid transparent",
        borderTop: "4px solid currentColor",
        transform: props.selectProps.menuIsOpen ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease"
      }}
    />
  </div>
);

const customComponents = {
  IndicatorSeparator: () => null,
  DropdownIndicator,
};

const CommonMultiSelect: React.FC<SelectProps> = ({
  options,
  defaultValue = [],
  className,
  ariaLabel,
  placeholder = "Select",
}) => {

  const [selectedOptions, setSelectedOptions] = useState<Option[]>(defaultValue);

  const customStyles: StylesConfig<Option, true> = useMemo(
    () => ({
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? "#13B5C9"
          : state.isFocused
          ? "#fff"
          : "white",
        color: state.isSelected
          ? "#fff"
          : state.isFocused
          ? "#13B5C9"
          : "#707070",
        cursor: "pointer",
        "&:hover": {
          backgroundColor: "#13B5C9",
          color: "#fff",
        },
      }),
      menu: (base) => ({
        ...base,
        position: "absolute",
        width: "100%",
        zIndex: 9999,
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
      }),
    }),
    []
  );

  const handleChange = useCallback((value: readonly Option[] | null) => {
    setSelectedOptions(value ? [...value] : []);
  }, []);

  useEffect(() => {
    setSelectedOptions(defaultValue);
  }, [defaultValue]);

  return (
    <div className="common-select">
      <Select
        isMulti                      // <-- enables multi select
        classNamePrefix="react-select"
        className={className}
        styles={customStyles}
        options={options}
        value={selectedOptions}
        onChange={handleChange}
        components={customComponents}
        placeholder={placeholder}
        menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
        menuPosition="fixed"
        aria-label={ariaLabel}
      />
    </div>
  );
};

export default React.memo(CommonMultiSelect);
