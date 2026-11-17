import { MongoClient } from 'mongodb';

export const createTestContext = async () => {
    const data = {
        authors: [],
        books: []
    };
    const failures = new Set();
    const calls = [];
    const createdIndexes = [];

    const failIfRequested = (operation) => {
        if (failures.has(operation)) {
            throw new Error(`Simulated ${operation} failure`);
        }
    };

    const matches = (document, query) => {
        return Object.entries(query).every(([key, value]) => {return document[key] === value});
    };

    const project = (document, options = {}) => {
        if (!document) {
            return null;
        }

        const projection = options.projection;

        if (!projection) {
            return structuredClone(document);
        }

        const included = Object.keys(projection)
            .filter((key) => {return projection[key] === 1});

        if (included.length > 0) {
            return Object.fromEntries(
                included
                    .filter((key) => {return key in document})
                    .map((key) => {return [key, document[key]]})
            );
        }

        const result = structuredClone(document);

        for (const key of Object.keys(projection)) {
            if (projection[key] === 0) {
                delete result[key];
            }
        }

        return result;
    };

    const fakeDb = {
        client: null,
        collection(name) {
            return {
                find(query = {}, options = {}) {
                    return {
                        toArray: async () => {
                            failIfRequested(`${name}.find`);
                            return data[name]
                                .filter((document) => {return matches(document, query)})
                                .map((document) => {return project(document, options)});
                        }
                    };
                },
                async findOne(query = {}, options = {}) {
                    failIfRequested(`${name}.findOne`);
                    calls.push({ name, operation: 'findOne', options });
                    const document = data[name].find((item) => {return matches(item, query)});
                    return project(document, options);
                },
                async createIndex(keys, options) {
                    failIfRequested(`${name}.createIndex`);
                    createdIndexes.push({ name, keys, options });
                    return `${Object.keys(keys)[0]}_1`;
                },
                async insertOne(document) {
                    failIfRequested(`${name}.insertOne`);

                    if (data[name].some((item) => {return item.id === document.id})) {
                        const error = new Error('Duplicate key');
                        error.code = 11000;
                        throw error;
                    }

                    data[name].push({ ...document, _id: 'internal-id' });
                },
                async findOneAndUpdate(query, update, options) {
                    failIfRequested(`${name}.findOneAndUpdate`);
                    const document = data[name].find((item) => {return matches(item, query)});

                    if (!document) {
                        return null;
                    }

                    Object.assign(document, update.$set);
                    return project(document, options);
                },
                async deleteOne(query, options) {
                    failIfRequested(`${name}.deleteOne`);
                    calls.push({ name, operation: 'deleteOne', options });
                    const index = data[name].findIndex((item) => {return matches(item, query)});

                    if (index < 0) {
                        return { deletedCount: 0 };
                    }

                    data[name].splice(index, 1);
                    return { deletedCount: 1 };
                }
            };
        }
    };

    MongoClient.prototype.connect = async function () {
        return this;
    };
    MongoClient.prototype.db = function () {
        fakeDb.client = this;
        return fakeDb;
    };
    MongoClient.prototype.startSession = function () {
        return {
            withTransaction: async (callback) => {
                return await callback();
            },
            endSession: async () => {}
        };
    };

    process.env.MONGODB_URI = 'mongodb://localhost/test';
    process.env.MONGODB_DB_NAME = 'test';

    const { connectToDb } = await import('../src/db/connect.js');
    await connectToDb();
    const startupIndexes = [...createdIndexes];

    const { default: app } = await import('../app.js');
    const server = await new Promise((resolve) => {
        const listeningServer = app.listen(0, () => {
            resolve(listeningServer);
        });
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const originalConsoleError = console.error;
    console.error = () => {};

    const request = async (method, path, body) => {
        const options = { method };

        if (body !== undefined) {
            options.headers = { 'content-type': 'application/json' };
            options.body = JSON.stringify(body);
        }

        return fetch(`${baseUrl}${path}`, options);
    };

    const reset = () => {
        data.authors.length = 0;
        data.books.length = 0;
        failures.clear();
        calls.length = 0;
        createdIndexes.length = 0;
    };

    const close = async () => {
        console.error = originalConsoleError;
        await new Promise((resolve) => {
            server.close(resolve);
        });
    };

    return {
        baseUrl,
        calls,
        close,
        createdIndexes,
        data,
        failures,
        request,
        reset,
        startupIndexes
    };
};
