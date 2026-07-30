// src/services/OfferServices.js
import requests from './httpService';

const OfferServices = {
  addOffer: async (body) => {
    return requests.post('/offers/add', body);
  },

  getOfferById: async (id) => {
    return requests.get(`/offers/${id}`);
  },

  getAllOffers: async () => {
    return requests.get(`/offers`);
  },

  updateOffer: async (id, body) => {
    return requests.put(`/offers/${id}`, body);
  },

  deleteOffer: async (id) => {
    return requests.delete(`/offers/${id}`);
  },

  deleteManyOffer: async (body) => {
    return requests.patch('/offers/delete/many', body);
  },
};

export default OfferServices;