// Success.jsx
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './Success.css';

const Success = () => {
  const { t } = useTranslation();

  return (
    <div className="container mt-16 flex flex-col items-center justify-center mx-auto p-5">
      <div className="checkmark-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 200 200"
          className="checkmark-svg"
        >
          <rect
            className="checkmark-box"
            width="200"
            height="200"
          ></rect>
          <path
            className="checkmark-tick"
            d="M52 111.018L76.9867 136L149 64"
          ></path>
        </svg>
      </div>
      <h2 className="mt-4 text-3xl font-bold dark:text-mainColor-light text-mainColor slide-up text-center">
        {t('botConnected')}
      </h2>
      <p className="mt-2 text-lg text-gray-600 dark:text-gray-400 slide-up text-center">
        {t('botConnectedDesc')}
      </p>
    </div>
  );
};

export default Success;

