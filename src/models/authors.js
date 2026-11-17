
import { getDb } from '../db/connect.js';

const authorsCollection = () => {
    return getDb().collection('authors');
};

export const getAllAuthors = async () => {
    return await authorsCollection()
        .find({}, {
            projection: {
                _id: 0,
                id: 1,
                name: 1,
                birthYear: 1
            }
        })
        .toArray();
};

export const getAuthorById = async (authorId) => {
    return await authorsCollection()
        .findOne({ id: authorId }, {
            projection: {
                _id: 0,
                id: 1,
                name: 1,
                birthYear: 1
            }
        });
};

export const createAuthor = async (author) => {
    const collection = authorsCollection();

    await collection.createIndex({ id: 1 }, { unique: true });

    await collection.insertOne(author);

    return author;
};

export const updateAuthor = async (authorId, author) => {
    return await authorsCollection().findOneAndUpdate(
        { id: authorId },
        { $set: author },
        {
            returnDocument: 'after',
            projection: {
                _id: 0,
                id: 1,
                name: 1,
                birthYear: 1
            }
        }
    );
};

export const deleteAuthor = async (authorId) => {
    const database = getDb();
    const collection = authorsCollection();
    const author = await collection.findOne(
        { id: authorId },
        { projection: { _id: 0 } }
    );

    if (!author) {
        return 'notFound';
    }

    const booksCollection = database.collection('books');
    await booksCollection.createIndex({ authorId: 1 });

    const session = database.client.startSession();
    let result = 'notFound';

    try {
        // Concurrent book writes must also coordinate through the author record.
        await session.withTransaction(async () => {
            const currentAuthor = await collection.findOne(
                { id: authorId },
                {
                    projection: { _id: 1 },
                    session
                }
            );

            if (!currentAuthor) {
                result = 'notFound';
                return;
            }

            const referencedBook = await booksCollection.findOne(
                { authorId },
                {
                    projection: { _id: 1 },
                    session
                }
            );

            if (referencedBook) {
                result = 'referenced';
                return;
            }

            const deleteResult = await collection.deleteOne(
                { id: authorId },
                { session }
            );

            result = deleteResult.deletedCount > 0 ? 'deleted' : 'notFound';
        });

        return result;
    } finally {
        await session.endSession();
    }
};
