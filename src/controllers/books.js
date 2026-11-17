
import {
    createBook,
    deleteBook,
    getAllBooks,
    getBookById,
    updateBook
} from '../models/books.js';
import { getAuthorById } from '../models/authors.js';

const bookFields = ['id', 'authorId', 'title', 'publicationDate'];
const mutableBookFields = ['authorId', 'title', 'publicationDate'];

const hasExactKeys = (body, keys) => {
    return (
        body !== null &&
        typeof body === 'object' &&
        !Array.isArray(body) &&
        Object.keys(body).length === keys.length &&
        keys.every((key) => {
            return Object.prototype.hasOwnProperty.call(body, key);
        })
    );
};

const isNonblankString = (value) => {
    return typeof value === 'string' && value.trim().length > 0;
};

const isValidPublicationDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsedDate = new Date(`${value}T00:00:00.000Z`);

    return (
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === value
    );
};

const isValidBook = (book) => {
    return (
        isNonblankString(book.id) &&
        isNonblankString(book.authorId) &&
        isNonblankString(book.title) &&
        isValidPublicationDate(book.publicationDate)
    );
};

const isValidBookUpdate = (book) => {
    return (
        isNonblankString(book.authorId) &&
        isNonblankString(book.title) &&
        isValidPublicationDate(book.publicationDate)
    );
};

export const getBooksHandler = async (req, res) => {
    try {
        const books = await getAllBooks();

        return res.status(200).json(books);
    } catch (error) {
        console.error('Failed to retrieve books:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const getBookByIdHandler = async (req, res) => {
    try {
        const book = await getBookById(req.params.id);

        if (!book) {
            return res.status(404).json({
                message: 'Book not found'
            });
        }

        return res.status(200).json(book);
    } catch (error) {
        console.error('Failed to retrieve book:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const createBookHandler = async (req, res) => {
    try {
        if (!hasExactKeys(req.body, bookFields) || !isValidBook(req.body)) {
            return res.status(400).json({
                message: 'Valid id, authorId, title, and publicationDate are required'
            });
        }

        const author = await getAuthorById(req.body.authorId);

        if (!author) {
            return res.status(400).json({
                message: 'Author does not exist'
            });
        }

        const book = await createBook({
            id: req.body.id,
            authorId: req.body.authorId,
            title: req.body.title,
            publicationDate: req.body.publicationDate
        });

        return res.status(201).json(book);
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(400).json({
                message: 'Book ID already exists'
            });
        }

        console.error('Failed to create book:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const updateBookHandler = async (req, res) => {
    try {
        if (!hasExactKeys(req.body, mutableBookFields) ||
            !isValidBookUpdate(req.body)) {
            return res.status(400).json({
                message: 'Valid authorId, title, and publicationDate are required'
            });
        }

        const existingBook = await getBookById(req.params.id);

        if (!existingBook) {
            return res.status(404).json({
                message: 'Book not found'
            });
        }

        const author = await getAuthorById(req.body.authorId);

        if (!author) {
            return res.status(400).json({
                message: 'Author does not exist'
            });
        }

        const book = await updateBook(req.params.id, {
            authorId: req.body.authorId,
            title: req.body.title,
            publicationDate: req.body.publicationDate
        });

        if (!book) {
            return res.status(404).json({
                message: 'Book not found'
            });
        }

        return res.status(200).json(book);
    } catch (error) {
        console.error('Failed to update book:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const deleteBookHandler = async (req, res) => {
    try {
        const deleted = await deleteBook(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                message: 'Book not found'
            });
        }

        return res.status(204).end();
    } catch (error) {
        console.error('Failed to delete book:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};
