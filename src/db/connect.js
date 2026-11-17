import { MongoClient } from 'mongodb';

let database;

const connectToDb = async () => {
    const connectionString = process.env.MONGODB_URI;
    const databaseName = process.env.MONGODB_DB_NAME;

    if (!connectionString) {
        throw new Error('MONGODB_URI is required.');
    }

    if (!databaseName) {
        throw new Error('MONGODB_DB_NAME is required.');
    }

    const client = new MongoClient(connectionString);
    await client.connect();

    const connectedDatabase = client.db(databaseName);
    await connectedDatabase
        .collection('books')
        .createIndex({ id: 1 }, { unique: true });

    database = connectedDatabase;

    return database;
};

const getDb = () => {
    if (!database) {
        throw new Error('Database not initialized. Call connectToDb first.');
    }

    return database;
};

export { connectToDb, getDb };