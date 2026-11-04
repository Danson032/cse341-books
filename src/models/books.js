
import { getDb } from '../db/connect.js';

export const getAllBooks = async () => {
    return await getDb()
        .collection('books')
        .find({})
        .toArray();
};

export const getBookById = async (bookId) => {
    return await getDb()
        .collection('books')
        .findOne({ id: bookId });
};
