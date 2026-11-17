import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { MongoClient } from 'mongodb';

const data = {
    authors: [],
    books: []
};
const failures = new Set();
const calls = [];
const createdIndexes = [];
let server;
let baseUrl;
let originalConsoleError;

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

const request = async (method, path, body) => {
    const options = { method };

    if (body !== undefined) {
        options.headers = { 'content-type': 'application/json' };
        options.body = JSON.stringify(body);
    }

    return fetch(`${baseUrl}${path}`, options);
};

before(async () => {
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

    const { default: app } = await import('../app.js');
    server = await new Promise((resolve) => {
        const listeningServer = app.listen(0, () => {
            resolve(listeningServer);
        });
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    originalConsoleError = console.error;
    console.error = () => {};
});

beforeEach(() => {
    data.authors.length = 0;
    data.books.length = 0;
    failures.clear();
    calls.length = 0;
    createdIndexes.length = 0;
});

after(async () => {
    console.error = originalConsoleError;

    if (server) {
        await new Promise((resolve) => {
            server.close(resolve);
        });
    }
});

test('GET all and GET by ID return the required statuses and shapes', async () => {
    let response = await request('GET', '/authors');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);

    data.authors.push({
        id: 'a1',
        name: 'Author One',
        birthYear: 1876,
        _id: 'internal-id'
    });

    response = await request('GET', '/authors/a1');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        id: 'a1',
        name: 'Author One',
        birthYear: 1876
    });

    response = await request('GET', '/authors/missing');
    assert.equal(response.status, 404);
});

test('POST creates authors, rejects duplicates, and validates exact request fields', async () => {
    const author = {
        id: 'a1',
        name: 'Author One',
        birthYear: 1876
    };

    let response = await request('POST', '/authors', author);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), author);
    assert.ok(createdIndexes.some((index) => {return (
        index.name === 'authors' &&
        index.options.unique === true
    )}));

    response = await request('POST', '/authors', author);
    assert.equal(response.status, 400);

    response = await request('POST', '/authors', { id: 'missing-fields' });
    assert.equal(response.status, 400);

    response = await request('POST', '/authors', {
        ...author,
        extra: true
    });
    assert.equal(response.status, 400);

    response = await fetch(`${baseUrl}/authors`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid'
    });
    assert.equal(response.status, 400);
});

test('PUT updates authors and returns 400 or 404 for invalid requests', async () => {
    data.authors.push({ id: 'a1', name: 'Old Name', birthYear: 1876 });

    let response = await request('PUT', '/authors/a1', {
        name: 'New Name',
        birthYear: 1877
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        id: 'a1',
        name: 'New Name',
        birthYear: 1877
    });

    response = await request('PUT', '/authors/a1', {
        name: 'New Name',
        birthYear: '1877'
    });
    assert.equal(response.status, 400);

    response = await request('PUT', '/authors/missing', {
        name: 'New Name',
        birthYear: 1877
    });
    assert.equal(response.status, 404);
});

test('DELETE returns 404, protects referenced authors with 409, and deletes with 204', async () => {
    let response = await request('DELETE', '/authors/missing');
    assert.equal(response.status, 404);

    data.authors.push({ id: 'a1', name: 'Author One', birthYear: 1876 });
    data.books.push({ id: 'b1', authorId: 'a1' });

    response = await request('DELETE', '/authors/a1');
    assert.equal(response.status, 409);
    assert.equal(data.authors.length, 1);
    assert.ok(createdIndexes.some((index) => {return (
        index.name === 'books' &&
        index.keys.authorId === 1
    )}));

    const transactionalDelete = calls.find((call) => {return (
        call.name === 'authors' && call.operation === 'deleteOne'
    )});
    assert.equal(transactionalDelete, undefined);

    data.books.length = 0;
    response = await request('DELETE', '/authors/a1');
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
    assert.equal(data.authors.length, 0);

    const deleteCall = calls.find((call) => {return (
        call.name === 'authors' && call.operation === 'deleteOne'
    )});
    assert.ok(deleteCall.options.session);
});

test('unexpected database errors produce safe 500 responses', async () => {
    failures.add('authors.find');
    let response = await request('GET', '/authors');
    assert.equal(response.status, 500);

    failures.clear();
    failures.add('authors.findOne');
    response = await request('GET', '/authors/a1');
    assert.equal(response.status, 500);

    failures.clear();
    failures.add('authors.createIndex');
    response = await request('POST', '/authors', {
        id: 'database-error',
        name: 'Author',
        birthYear: 1876
    });
    assert.equal(response.status, 500);

    failures.clear();
    failures.add('authors.findOneAndUpdate');
    response = await request('PUT', '/authors/a1', {
        name: 'Name',
        birthYear: 1876
    });
    assert.equal(response.status, 500);

    failures.clear();
    data.authors.push({ id: 'a1', name: 'Author One', birthYear: 1876 });
    failures.add('books.findOne');
    response = await request('DELETE', '/authors/a1');
    assert.equal(response.status, 500);
});

test('Swagger documents all Authors operations and Books GET behavior is unchanged', async () => {
    const specificationResponse = await request('GET', '/api-docs.json');
    assert.equal(specificationResponse.status, 200);

    const specification = await specificationResponse.json();
    assert.deepEqual(Object.keys(specification.paths['/authors']).sort(), [
        'get',
        'post'
    ]);
    assert.deepEqual(
        Object.keys(specification.paths['/authors/{id}'])
            .filter((method) => {return method !== 'parameters'})
            .sort(),
        ['delete', 'get', 'put']
    );
    assert.equal(specification.paths['/authors/{id}'].parameters[0].required, true);
    assert.ok(specification.paths['/authors'].post.requestBody);
    assert.ok(specification.paths['/authors/{id}'].put.requestBody);
    assert.deepEqual(Object.keys(specification.paths['/authors'].get.responses).sort(), [
        '200',
        '500'
    ]);
    assert.deepEqual(Object.keys(specification.paths['/authors'].post.responses).sort(), [
        '201',
        '400',
        '500'
    ]);
    assert.deepEqual(Object.keys(specification.paths['/authors/{id}'].get.responses).sort(), [
        '200',
        '404',
        '500'
    ]);
    assert.deepEqual(Object.keys(specification.paths['/authors/{id}'].put.responses).sort(), [
        '200',
        '400',
        '404',
        '500'
    ]);
    assert.deepEqual(Object.keys(specification.paths['/authors/{id}'].delete.responses).sort(), [
        '204',
        '404',
        '409',
        '500'
    ]);
    assert.ok(specification.paths['/authors'].get.responses['200'].content['application/json'].examples);
    assert.ok(specification.paths['/authors'].post.responses['201'].content['application/json'].examples);

    const uiResponse = await request('GET', '/api-docs');
    assert.equal(uiResponse.status, 200);
    assert.match(await uiResponse.text(), /swagger-ui/);

    data.books.push({ id: 'b1', authorId: 'a1', title: 'Book One' });
    let response = await request('GET', '/books');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).length, 1);

    response = await request('GET', '/books/b1');
    assert.equal(response.status, 200);
});
