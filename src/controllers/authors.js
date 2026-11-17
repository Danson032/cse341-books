
import {
    getAllAuthors,
    getAuthorById,
    createAuthor,
    updateAuthor,
    deleteAuthor
} from '../models/authors.js';

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

export const getAuthorsHandler = async (req, res) => {
    try {
        const authors = await getAllAuthors();
        return res.status(200).json(authors);
    } catch (error) {
        console.error('Failed to retrieve authors:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const getAuthorByIdHandler = async (req, res) => {
    try {
        const author = await getAuthorById(req.params.id);

        if (!author) {
            return res.status(404).json({
                message: 'Author not found'
            });
        }

        return res.status(200).json(author);
    } catch (error) {
        console.error('Failed to retrieve author:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const createAuthorHandler = async (req, res) => {
    try {
        if (!hasExactKeys(req.body, ['id', 'name', 'birthYear'])) {
            return res.status(400).json({
                message: 'Valid id, name, and birthYear are required'
            });
        }

        const { id, name, birthYear } = req.body;

        if (
            typeof id !== 'string' || !id.trim() ||
            typeof name !== 'string' || !name.trim() ||
            !Number.isInteger(birthYear)
        ) {
            return res.status(400).json({
                message: 'Valid id, name, and birthYear are required'
            });
        }

        const author = await createAuthor({
            id,
            name,
            birthYear
        });

        return res.status(201).json(author);
    } catch (error) {
        if (error && error.code === 11000) {
            return res.status(400).json({
                message: 'Author ID already exists'
            });
        }

        console.error('Failed to create author:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const updateAuthorHandler = async (req, res) => {
    try {
        if (!hasExactKeys(req.body, ['name', 'birthYear'])) {
            return res.status(400).json({
                message: 'Valid name and birthYear are required'
            });
        }

        const { name, birthYear } = req.body;

        if (
            typeof name !== 'string' || !name.trim() ||
            !Number.isInteger(birthYear)
        ) {
            return res.status(400).json({
                message: 'Valid name and birthYear are required'
            });
        }

        const author = await updateAuthor(req.params.id, {
            name,
            birthYear
        });

        if (!author) {
            return res.status(404).json({
                message: 'Author not found'
            });
        }

        return res.status(200).json(author);
    } catch (error) {
        console.error('Failed to update author:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};

export const deleteAuthorHandler = async (req, res) => {
    try {
        const result = await deleteAuthor(req.params.id);

        if (result === 'referenced') {
            return res.status(409).json({
                message: 'Cannot delete an author referenced by books'
            });
        }

        if (result === 'notFound') {
            return res.status(404).json({
                message: 'Author not found'
            });
        }

        return res.status(204).end();
    } catch (error) {
        console.error('Failed to delete author:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
};
