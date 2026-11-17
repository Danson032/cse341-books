
import { getDb } from '../db/connect.js';

export const getAllBooks = async () => {
    return await getDb()
        .collection('books')
        .find({}, {
            projection: {
                _id: 0,
                id: 1,
                authorId: 1,
                title: 1,
                publicationDate: 1
            }
        })
        .toArray();
};

export const getBookById = async (bookId) => {
    return await getDb()
        .collection('books')
        .findOne({ id: bookId }, {
            projection: {
                _id: 0,
                id: 1,
                authorId: 1,
                title: 1,
                publicationDate: 1
            }
        });
};

export const createBook = async (book) => {
    const collection = getDb().collection('books');

    await collection.insertOne(book);

    return book;
};

export const updateBook = async (bookId, book) => {
    return await getDb()
        .collection('books')
        .findOneAndUpdate(
            { id: bookId },
            { $set: book },
            {
                returnDocument: 'after',
                projection: {
                    _id: 0,
                    id: 1,
                    authorId: 1,
                    title: 1,
                    publicationDate: 1
                }
            }
        );
};

export const deleteBook = async (bookId) => {
    const result = await getDb()
        .collection('books')
        .deleteOne({ id: bookId });

    return result.deletedCount > 0;
};
