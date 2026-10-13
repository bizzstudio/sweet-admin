import React from 'react';

import StoreImage from '@/components/common/StoreImage';

const DriveImg = ({ src, alt, className }) => {
    // פונקציה לחילוץ מזהה התמונה מהקישור של Google Drive
    const getDriveImageId = (url) => {
        // בדיקה אם הקישור הוא בפורמט של Google Drive עם /uc?export=view&id=XXXXX
        const driveMatch = url.match(/drive\.google\.com\/uc\?export=view&id=(.*)/);
        const userContentMatch = url.match(/googleusercontent\.com\/d\/(.*?)\?/);

        // אם הקישור מכיל את התבנית של Google Drive או googleusercontent.com
        if (driveMatch) {
            return driveMatch[1];
        } else if (userContentMatch) {
            return userContentMatch[1];
        }
        return null;
    };

    // לבדוק אם הקישור הוא מ-Google Drive
    const imageId = getDriveImageId(src);

    // אם מצאנו את מזהה התמונה, יוצרים את הקישור החדש
    const imageUrl = imageId
        ? `https://lh3.googleusercontent.com/d/${imageId}?authuser=0`
        : src;

    return <StoreImage src={imageUrl} alt={alt} className={className} />;
};

export default DriveImg;