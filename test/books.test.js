import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { createTestContext } from '../support/testContext.js';

const context = await createTestContext();
const {
    baseUrl,
    createdIndexes,
    data,
    failures,
    request,
    startupIndexes
} = context;

beforeEach(() => {
    context.reset();
});

after(async () => {
    await context.close();
});

const exampleBook = {
    id: 'b1',
    authorId: 'a1',
    title: 'Book One',
    publicationDate: '2024-01-15'
};

const addAuthor = () => {
    data.authors.push({
        id: 'a1',
        name: 'Author One',
        birthYear: 1876
    });
};

test('GET routes return all books and find books by custom ID', async () => {
    data.books.push({ ...exampleBook, _id: 'internal-id' });

    let response = await request('GET', '/books');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), [exampleBook]);

    response = await request('GET', '/books/b1');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), exampleBook);

    response = await request('GET', '/books/missing');
    assert.equal(response.status, 404);
});

test('POST creates a book, rejects duplicate IDs and missing authors', async () => {
    addAuthor();

    const startupIndex = startupIndexes.find((index) => {
        return index.name === 'books' &&
            index.keys.id === 1 &&
            index.options.unique === true;
    });
    assert.ok(startupIndex);

    let response = await request('POST', '/books', exampleBook);
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), exampleBook);
    assert.equal(createdIndexes.some((index) => {
        return index.name === 'books' && index.keys.id === 1;
    }), false);

    response = await request('POST', '/books', exampleBook);
    assert.equal(response.status, 400);

    response = await request('POST', '/books', {
        ...exampleBook,
        id: 'b2',
        authorId: 'missing'
    });
    assert.equal(response.status, 400);
});

test('POST rejects missing, invalid, blank, and non-calendar date fields', async () => {
    addAuthor();
    const invalidBooks = [
        { id: 'b1' },
        { ...exampleBook, id: 1 },
        { ...exampleBook, authorId: '' },
        { ...exampleBook, title: '   ' },
        { ...exampleBook, publicationDate: '2024-02-30' },
        { ...exampleBook, publicationDate: '2024-1-15' },
        { ...exampleBook, publicationDate: '2024-01-15T00:00:00Z' },
        { ...exampleBook, extra: true }
    ];

    for (const invalidBook of invalidBooks) {
        const response = await request('POST', '/books', invalidBook);
        assert.equal(response.status, 400);
    }
});

test('Malformed JSON requests return a safe 400 response', async () => {
    const response = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid'
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
        message: 'Invalid JSON request body'
    });
});

test('PUT replaces mutable fields, validates author, and returns 404 for a missing book', async () => {
    addAuthor();
    data.authors.push({ id: 'a2', name: 'Author Two', birthYear: 1877 });
    data.books.push({ ...exampleBook, title: 'Old Title' });

    let response = await request('PUT', '/books/b1', {
        authorId: 'a2',
        title: 'New Title',
        publicationDate: '2025-02-20'
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        id: 'b1',
        authorId: 'a2',
        title: 'New Title',
        publicationDate: '2025-02-20'
    });

    const invalidUpdates = [
        { title: 'Missing author and date' },
        { authorId: 'a1', title: ' ', publicationDate: '2025-02-20' },
        { authorId: 'a1', title: 'Title', publicationDate: '2025-02-29' },
        { authorId: 'a1', title: 'Title', publicationDate: '2025-02-20', id: 'b2' }
    ];

    for (const update of invalidUpdates) {
        response = await request('PUT', '/books/b1', update);
        assert.equal(response.status, 400);
    }

    response = await request('PUT', '/books/b1', {
        authorId: 'missing',
        title: 'Title',
        publicationDate: '2025-02-20'
    });
    assert.equal(response.status, 400);

    response = await request('PUT', '/books/missing', {
        authorId: 'missing',
        title: 'Title',
        publicationDate: '2025-02-20'
    });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
        message: 'Book not found'
    });
});

test('DELETE returns 404 for missing books and 204 with no body on success', async () => {
    let response = await request('DELETE', '/books/missing');
    assert.equal(response.status, 404);

    data.books.push(exampleBook);
    response = await request('DELETE', '/books/b1');
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
    assert.equal(data.books.length, 0);
});

test('unexpected Books database errors return safe 500 responses', async () => {
    failures.add('books.find');
    let response = await request('GET', '/books');
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
        message: 'Internal server error'
    });

    failures.clear();
    failures.add('books.findOne');
    response = await request('GET', '/books/b1');
    assert.equal(response.status, 500);

    failures.clear();
    addAuthor();
    failures.add('books.insertOne');
    response = await request('POST', '/books', exampleBook);
    assert.equal(response.status, 500);

    failures.clear();
    failures.add('authors.findOne');
    response = await request('POST', '/books', exampleBook);
    assert.equal(response.status, 500);

    failures.clear();
    data.books.push(exampleBook);
    failures.add('books.findOneAndUpdate');
    response = await request('PUT', '/books/b1', {
        authorId: 'a1',
        title: 'Book One',
        publicationDate: '2024-01-15'
    });
    assert.equal(response.status, 500);

    failures.clear();
    failures.add('books.deleteOne');
    response = await request('DELETE', '/books/b1');
    assert.equal(response.status, 500);
});

test('database initialization fails safely if the unique book index cannot be created', async () => {
    failures.add('books.createIndex');
    const { connectToDb, getDb } = await import('../src/db/connect.js?books-index-failure');

    await assert.rejects(connectToDb(), /Simulated books\.createIndex failure/);
    assert.throws(getDb, /Database not initialized/);
});

test('Swagger documents all Books operations and schemas', async () => {
    const specificationResponse = await request('GET', '/api-docs.json');
    assert.equal(specificationResponse.status, 200);

    const specification = await specificationResponse.json();
    assert.deepEqual(Object.keys(specification.paths['/books']).sort(), [
        'get',
        'post'
    ]);
    assert.deepEqual(
        Object.keys(specification.paths['/books/{id}'])
            .filter((method) => {return method !== 'parameters'})
            .sort(),
        ['delete', 'get', 'put']
    );
    assert.equal(specification.paths['/books/{id}'].parameters[0].required, true);
    assert.ok(specification.paths['/books'].post.requestBody);
    assert.ok(specification.paths['/books/{id}'].put.requestBody);
    assert.deepEqual(Object.keys(specification.paths['/books'].post.responses).sort(), [
        '201',
        '400',
        '500'
    ]);
    assert.deepEqual(Object.keys(specification.paths['/books/{id}'].put.responses).sort(), [
        '200',
        '400',
        '404',
        '500'
    ]);
    assert.deepEqual(Object.keys(specification.paths['/books/{id}'].delete.responses).sort(), [
        '204',
        '404',
        '500'
    ]);
    assert.ok(specification.components.schemas.Book);
    assert.equal(
        specification.components.schemas.Book.properties.publicationDate.format,
        'date'
    );

    const uiResponse = await request('GET', '/api-docs');
    assert.equal(uiResponse.status, 200);
    assert.match(await uiResponse.text(), /swagger-ui/);
});
