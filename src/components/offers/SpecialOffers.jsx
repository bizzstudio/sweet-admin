import React, { useState } from 'react'
import {
    TableBody,
    TableCell,
    TableRow,
    Input,
    TableHeader,
    Table
} from "@windmill/react-ui";
import { t } from "i18next";
import LabelArea from '../form/selectOption/LabelArea';
import Tooltip from '../tooltip/Tooltip';
import { FiTrash2, FiPlus } from "react-icons/fi";


export default function SpecialOffers({ offers = [],
    setOffers,
    currency = '₪',
}) {

    // const [offers, setOffers] = useState([
    //     {
    //         name: 'מבצע חדש, 2 ב-10!',
    //         quantity: 2,
    //         price: 10,
    //         _id: 1
    //     },
    //     {
    //         name: 'מבצע חדש, 3 ב-14!',
    //         quantity: 3,
    //         price: 14,
    //         _id: 2
    //     },
    //     {
    //         name: 'מבצע חדש, 5 ב-20!',
    //         quantity: 5,
    //         price: 20,
    //         _id: 3
    //     },
    // ]);

    const handleNameChange = (value, offerIndex) => {
        setOffers((prevOffers) => prevOffers.map((offer, index) => {
            if (index == offerIndex) {
                return { ...offer, name: value };
            } else {
                return offer;
            }
        }))
    }

    const handleQuantityChange = (value, offerIndex) => {
        setOffers((prevOffers) => prevOffers.map((offer, index) => {
            if (index == offerIndex) {
                return { ...offer, quantity: value };
            } else {
                return offer;
            }
        }))
    };

    const handlePriceChange = (value, offerIndex) => {
        setOffers((prevOffers) => prevOffers.map((offer, index) => {
            if (index == offerIndex) {
                return { ...offer, price: value };
            } else {
                return offer;
            }
        }))
    };

    const handleDelete = (offerIndex) => {
        setOffers((prevOffers) => prevOffers.filter((_, index) => index !== offerIndex));
    };


    const handleAddOffer = () => {
        const newOffer = {
            name: '',
            quantity: null,
            price: null,
        };
        setOffers([...offers, newOffer]);
    };

    // return (
    //     <Table className='rounded-lg w-full bg-black bg-opacity-10'>
    //         <thead>
    //             <TableRow>
    //                 <TableCell className='text-center font-semibold pt-3 pb-3'>{t("offerName")}</TableCell>
    //                 <TableCell className='text-center font-semibold pt-3 pb-3'>{t("quantity")}</TableCell>
    //                 <TableCell className='text-center font-semibold pt-3 pb-3'>{t("offerPrice")}</TableCell>
    //                 <TableCell className='text-center font-semibold pt-3 pb-3'>{t("Actions")}</TableCell>
    //             </TableRow>
    //             <TableRow className='my-2'>
    //                 <td colSpan={4} className='bg-gray-300 h-0.5'></td>
    //             </TableRow>
    //         </thead>
    //         <tbody>
    //             {offers.map((offer, i) => (
    //                 <TableRow key={i + 1}>
    //                     <TableCell className='pb-0 pt-4'>
    //                         <Input
    //                             className="p-2"
    //                             name="name"
    //                             type="text"
    //                             defaultValue={offer.name}
    //                             placeholder={t("offerName")}
    //                             onChange={(e) => handleNameChange(e.target.value, i)}
    //                             required={true}
    //                         />
    //                     </TableCell>
    //                     <TableCell className='pb-0 pt-4'>
    //                         <Input
    //                             className="p-2"
    //                             name="quantity"
    //                             type="number"
    //                             defaultValue={offer.quantity}
    //                             placeholder={t("quantity")}
    //                             onChange={(e) => handleQuantityChange(e.target.value, i)}
    //                             required={true}
    //                         />
    //                     </TableCell>
    //                     <TableCell className='pb-0 pt-4'>
    //                         <div className='flex gap-1'>
    //                             <span className="inline-flex items-center px-3 rounded-md border border-gray-300 bg-gray-50 text-gray-500 text-sm focus:border-customBrown-light dark:bg-gray-700 dark:text-gray-300 dark:border dark:border-gray-600">
    //                                 {currency}
    //                             </span>
    //                             <Input
    //                                 className="p-2"
    //                                 name="price"
    //                                 type="number"
    //                                 defaultValue={offer.price}
    //                                 placeholder={t("offerPrice")}
    //                                 onChange={(e) => handlePriceChange(e.target.value, i)}
    //                                 required={true}
    //                             />
    //                         </div>
    //                     </TableCell>
    //                     <TableCell className='flex items-center justify-center pb-0 pt-4'>
    //                         <button
    //                             type="button"
    //                             onClick={() => handleDelete(i)}
    //                             className="h-12 cursor-pointer text-gray-500 hover:text-red-600 focus:outline-none"
    //                         >
    //                             <Tooltip
    //                                 id="delete"
    //                                 Icon={FiTrash2}
    //                                 title={t("Delete")}
    //                                 bgColor="#EF4444"
    //                             />
    //                         </button>
    //                     </TableCell>
    //                 </TableRow>
    //             ))}
    //             <TableRow>
    //                 <TableCell colSpan={4}>
    //                     <button
    //                         type="button"
    //                         onClick={() => handleAddOffer()}
    //                         className="flex items-center gap-1 px-3 py-2 rounded cursor-pointer hover:text-customGreen-dark focus:outline-none bg-red-600 font-semibold mr-auto
    //                         mb-2 mt-2"
    //                     >
    //                         <FiPlus className='text-xl' />
    //                         {t("AddOffer")}
    //                     </button>
    //                 </TableCell>
    //             </TableRow>
    //         </tbody>
    //     </Table>
    // )
}