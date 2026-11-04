
import { getDb } from '../db/connect.js';

export const getAllBooks = async () => {
    return await getDb()
        .collection('books')
        .find({})
        .toArray();
};
