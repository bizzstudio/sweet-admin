// src/services/BlogServices.js
import requests from "./httpService";

const BlogServices = {
    // --- Admin CRUD ---
    getAllBlogs: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return requests.get(`/blog/admin/all${query ? `?${query}` : ""}`);
    },

    getBlogById: async (id) => requests.get(`/blog/admin/${id}`),
    addBlog: async (body) => requests.post("/blog/add", body),
    updateBlog: async (id, body) => requests.put(`/blog/${id}`, body),
    deleteBlog: async (id) => requests.delete(`/blog/${id}`),
    deleteManyBlogs: async (body) => requests.patch("/blog/delete/many", body),
};

export default BlogServices; 