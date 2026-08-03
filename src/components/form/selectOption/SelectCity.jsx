import React, { useEffect, useState } from "react";
import { Select } from "@windmill/react-ui";

const MultiSelectCity = ({ setValue, cities, selectedCitiesFromUser = [] }) => {
  const [selectedCities, setSelectedCities] = useState(selectedCitiesFromUser);

  useEffect(() => {
    setSelectedCities(selectedCitiesFromUser)
  }, [selectedCitiesFromUser])
  const handleSelectChange = (e) => {
    const value = JSON.parse(e.target.value);
    setSelectedCities((prev) => {
      if (!prev.find((city) => city._id === value._id)) {
        return [...prev, value];
      }
      return prev;
    });
  };

  const handleRemoveCity = (cityId) => {
    setSelectedCities((prev) => prev.filter((city) => city._id !== cityId));
  };
  useEffect(() => {
    if (selectedCities) {
      setValue(selectedCities)
    }
  }, [selectedCities])

  return (
    <div>
      <Select onChange={handleSelectChange} className="h-8 mb-4">
        <option value="" disabled selected>
          בחר עיר
        </option>
        {cities &&
          cities.map((city) => (
            <option key={city._id} value={JSON.stringify(city)}>
              {city.city_name_he}
            </option>
          ))}
      </Select>
      <div>
        {selectedCities.length > 0 && (
          <ul className="list-disc list-inside">
            {selectedCities.map((city) => (
              <li key={city._id} className="flex justify-between items-center">
                {city.city_name_he}
                <button
                  onClick={() => handleRemoveCity(city._id)}
                  className="mr-4 text-red-500"
                >
                  הסר
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MultiSelectCity;
