import React, { useContext } from 'react';
import Select, { components } from 'react-select';
import { WindmillContext } from "@windmill/react-ui";

const SelectWithCheckbox = ({ placeholder, options, onChange }) => {

    const { mode } = useContext(WindmillContext);

    const MultiValueContainer = ({ children, ...props }) => (
        <components.MultiValueContainer {...props}>
            <checkbox className="form-checkbox" checked={true} readOnly />
            <label className="ml-2">{children}</label>
        </components.MultiValueContainer>
    );

    const customStyles = {
        control: (provided) => ({
            ...provided,
            minHeight: '46px',
            backgroundColor: mode === 'dark' ? '#374151' : "#f3f4f6", // שינוי צבע רקע בהתאם למצב
            color: mode === 'dark' ? '#D1D5DB' : provided.color, // שינוי צבע טקסט בהתאם למצב
            boxShadow: 'none',
            outline: 'none',
            border: mode === 'dark' ? '1px solid #4b5563' : '1px solid #e5e7eb',
        }),
        valueContainer: (provided) => ({
            ...provided,
            height: '46px',
            padding: '0 6px',
            overflow: 'auto',
            direction: 'ltr',
        }),
        input: (provided) => ({
            ...provided,
            margin: '0',
            color: mode === 'dark' ? '#D1D5DB' : provided.color, // שינוי צבע טקסט בהתאם למצב
        }),
        indicatorsContainer: (provided) => ({
            ...provided,
            height: '46px',
        }),
        multiValue: (provided) => ({
            ...provided,
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            direction: 'rtl',
            backgroundColor: mode === 'dark' ? '#4B5563' : provided.backgroundColor, // שינוי צבע רקע של הערך הנבחר בהתאם למצב
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            flex: '1',
            color: mode === 'dark' ? '#D1D5DB' : provided.color, // שינוי צבע טקסט של הערך הנבחר בהתאם למצב
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            display: 'flex',
            alignItems: 'center',
            borderRadius: '500px',
            height: 'fit-content',
            padding: '3px',
            margin: 'auto 0',
            color: mode === 'dark' ? '#D1D5DB' : provided.color, // שינוי צבע של כפתור ההסרה בהתאם למצב
            backgroundColor: mode === 'dark' ? '#6B7280' : provided.backgroundColor, // שינוי צבע רקע של כפתור ההסרה בהתאם למצב
        }),
        option: (provided) => ({
            ...provided,
            padding: '3px 10px',
            backgroundColor: mode === 'dark' ? '#1F2937' : provided.backgroundColor, // שינוי צבע רקע של האפשרות בהתאם למצב
            color: mode === 'dark' ? '#D1D5DB' : provided.color, // שינוי צבע טקסט של האפשרות בהתאם למצב
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: mode === 'dark' ? '#1F2937' : provided.backgroundColor, // שינוי צבע רקע של התפריט בהתאם למצב
        }),
        placeholder: (provided) => ({
            ...provided,
            fontSize: '14px',
            color: mode === 'dark' ? '#d1d5db' : '#6B7280', // שינוי צבע ה-placeholder בהתאם למצב הנושא
        }),
    };

    return (
        <Select
            placeholder={placeholder}
            isMulti
            options={options}
            components={{ MultiValueContainer }}
            onChange={onChange}
            closeMenuOnSelect={false}
            hideSelectedOptions={true}
            styles={customStyles}
        />
    );
};

export default SelectWithCheckbox;
