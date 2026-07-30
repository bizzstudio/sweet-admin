// src/components/offers/ProductsInOffer.jsx
import React, { useContext, useEffect, useState } from 'react';
import {
    TableCell,
    TableRow,
    Table,
    WindmillContext,
} from "@windmill/react-ui";
import Select from 'react-select';
import { useTranslation } from "react-i18next";
import Tooltip from '../tooltip/Tooltip';
import { FiTrash2 } from "react-icons/fi";
import ProductServices from '@/services/ProductServices';

export default function ProductsInOffer({ products = [], setProducts, currency = '₪' }) {
    const { t } = useTranslation();
    const { mode } = useContext(WindmillContext);

    const [allProducts, setAllProducts] = useState([]);

    useEffect(() => {
        (async () => {
            const response = await ProductServices.getAllProducts({
                title: "",
                category: '',
            });
            setAllProducts(response.products);
        })();
    }, []);

    const handleDelete = (productIndex) => {
        setProducts((prevProducts) => prevProducts.filter((_, index) => index !== productIndex));
    };

    const handleAddProduct = (product) => {
        if (product && !products.some(p => p._id === product._id)) {
            setProducts([...products, product]);
        }
    };

    // עיצוב התפריט אפשרויות
    const customStyles = {
        container: (provided) => ({
            ...provided,
            width: '100%',
        }),
        control: (provided, state) => ({
            ...provided,
            borderColor: state.isFocused ? 'var(--main-color)' : provided.borderColor,
            minHeight: '46px',
            backgroundColor: mode === 'dark' ? '#374151' : "#f3f4f6",
            color: mode === 'dark' ? '#D1D5DB' : provided.color,
            boxShadow: state.isFocused ? `0 0 0 1px var(--main-color)` : provided.boxShadow,
            outline: 'none',
            border: mode === 'dark' ? '1px solid #4b5563' : '1px solid #e5e7eb',
            '&:hover': {
                borderColor: state.isFocused ? 'var(--main-color)' : mode === 'dark' ? 'var(--main-color)' : provided.borderColor,
            },
        }),
        valueContainer: (provided) => ({
            ...provided,
            minHeight: '46px', // גובה מינימלי
            maxHeight: '122px', // גובה אוטומטי
            height: 'auto', // גובה אוטומטי
            padding: '6px', // padding אחיד
            overflow: 'auto',
            flexWrap: 'wrap', // מאפשר מעבר לשורה חדשה
            // alignItems: 'flex-start', // יישור למעלה
        }),
        option: (provided, state) => ({
            ...provided,
            padding: '3px 10px',
            backgroundColor: mode === 'dark'
                ? state.isFocused ? '#334155' : '#1F2937'
                : state.isFocused ? 'var(--main-color-super-light)' : provided.backgroundColor,
            color: mode === 'dark' ? '#D1D5DB' : state.isFocused ? '#000' : provided.color,
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: mode === 'dark' ? '#4B5563' : '#E5E7EB',  // צבע רקע של הערך הנבחר
            borderRadius: '6px',
            padding: '3px 8px',
            marginRight: '5px',
            marginBottom: '2px', // מרווח בין שורות
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: mode === 'dark' ? '#F3F4F6' : '#374151',  // צבע טקסט של הערך הנבחר
            fontWeight: '500',
        }),
        multiValueRemove: (provided) => ({
            ...provided,
            color: mode === 'dark' ? '#F3F4F6' : '#374151',
            '&:hover': {
                backgroundColor: 'var(--main-color)',
                color: '#fff',
            },
        }),
        placeholder: (provided) => ({
            ...provided,
            fontSize: '14px',  // שינוי גודל הטקסט של ה-placeholder
            color: mode === 'dark' ? '#d1d5db' : '#000',  // שינוי צבע ה-placeholder
            fontWeight: '400',
        }),
        menuPortal: (base) => ({ ...base, zIndex: 100 }), // הוספת z-index גבוה
        menu: (provided) => ({
            ...provided,
            backgroundColor: mode === 'dark' ? '#1F2937' : '#fff',
            border: mode === 'dark' ? '1px solid #4b5563' : '1px solid #e5e7eb',
            boxShadow: mode === 'dark'
                ? '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -2px rgba(0,0,0,0.3)'
                : provided.boxShadow,
            zIndex: 100,
        }),
        menuList: (provided) => ({
            ...provided,
            backgroundColor: mode === 'dark' ? '#1F2937' : '#fff',
            paddingTop: 0,
            paddingBottom: 0,
        }),
        noOptionsMessage: (provided) => ({
            ...provided,
            backgroundColor: mode === 'dark' ? '#1F2937' : '#fff',
            color: mode === 'dark' ? '#D1D5DB' : '#374151',
        }),
        input: (provided) => ({
            ...provided,
            color: mode === 'dark' ? '#D1D5DB' : '#374151',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: mode === 'dark' ? '#D1D5DB' : '#374151',
        }),
    };

    const formatOptionLabel = ({ title, prices, image }) => (
        <div className='flex items-center'>
            <img src={image[0]} alt={title.he} className='w-12 max-h-12 object-contain ml-2' />
            <div>
                <div className='text-gray-900 dark:text-gray-200'>{title.he}</div>
                <div className='text-gray-600 dark:text-gray-400'>{prices.price} {currency}</div>
            </div>
        </div>
    );

    return (
        <Table className='rounded-lg w-full bg-gray-50 dark:bg-gray-800'>
            <thead>
                <TableRow>
                    <TableCell className='text-center font-semibold pt-3 pb-3 text-gray-900 dark:text-gray-200'>
                        {t("image")}
                    </TableCell>
                    <TableCell className='text-center font-semibold pt-3 pb-3 text-gray-900 dark:text-gray-200'>
                        {t("productName")}
                    </TableCell>
                    <TableCell className='text-center font-semibold pt-3 pb-3 text-gray-900 dark:text-gray-200'>
                        {t("productPrice")}
                    </TableCell>
                    <TableCell className='text-center font-semibold pt-3 pb-3 text-gray-900 dark:text-gray-200'>
                        {t("Actions")}
                    </TableCell>
                </TableRow>
                <TableRow className='my-2'>
                    <td colSpan={4} className='bg-gray-300 dark:bg-gray-600 h-0.5'></td>
                </TableRow>
            </thead>
            <tbody>
                {products.map((product, i) => (
                    <TableRow key={i + 1}>
                        <TableCell className='pb-0 pt-4'>
                            <img src={product.image[0]} alt={product.title.he} className='w-16 h-16 object-cover mx-auto rounded' />
                        </TableCell>
                        <TableCell className='pb-0 pt-4 mx-auto text-center text-gray-900 dark:text-gray-200'>
                            {product.title.he}
                        </TableCell>
                        <TableCell className='pb-0 pt-4 mx-auto text-center text-gray-700 dark:text-gray-300'>
                            {product?.prices?.price} {currency}
                        </TableCell>
                        <TableCell className='flex items-center justify-center pb-0 pt-4'>
                            <button
                                type="button"
                                onClick={() => handleDelete(i)}
                                className='h-12 cursor-pointer focus:outline-none transition-colors text-gray-400 hover:text-red-600 dark:hover:text-red-400'
                            >
                                <Tooltip
                                    id="delete"
                                    Icon={FiTrash2}
                                    title={t("Delete")}
                                    bgColor="#EF4444"
                                />
                            </button>
                        </TableCell>
                    </TableRow>
                ))}
                <TableRow>
                    <TableCell colSpan={4}>
                        <div className='flex items-center gap-2 py-2'>
                            <Select
                                value={null}
                                onChange={(selectedOption) => {
                                    if (selectedOption) {
                                        handleAddProduct(selectedOption);
                                    }
                                }}
                                options={allProducts
                                    .sort((a, b) => a.title.he.localeCompare(b.title.he))
                                    .filter(product => !products.some(p => p._id === product._id))
                                }
                                getOptionLabel={formatOptionLabel}
                                getOptionValue={(option) => option.title.he}
                                styles={customStyles}
                                placeholder={t("selectProduct")}
                                menuPortalTarget={document.body}
                                isClearable
                                menuPlacement="auto"
                                menuPosition="fixed"
                                noOptionsMessage={() => t("noOptions")}
                            />
                        </div>
                    </TableCell>
                </TableRow>
            </tbody>
        </Table>
    );
}
