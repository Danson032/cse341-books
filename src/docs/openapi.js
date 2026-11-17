const authorExample = {
    id: 'a1',
    name: 'Example Author',
    birthYear: 1876
};

const updatedAuthorExample = {
    id: 'a1',
    name: 'Updated Author',
    birthYear: 1877
};

const bookExample = {
    id: 'b1',
    authorId: 'a1',
    title: 'Example Book',
    publicationDate: '2024-01-15'
};

const updatedBookExample = {
    id: 'b1',
    authorId: 'a1',
    title: 'Updated Book',
    publicationDate: '2024-02-20'
};

const errorSchema = {
    type: 'object',
    required: ['message'],
    additionalProperties: false,
    properties: {
        message: {
            type: 'string',
            example: 'Author not found'
        }
    }
};

const errorResponse = (description, example) => {
    return {
        description,
        content: {
            'application/json': {
                schema: {
                    $ref: '#/components/schemas/Error'
                },
                examples: {
                    error: {
                        value: {
                            message: example
                        }
                    }
                }
            }
        }
    };
};

const openApiDocument = {
    openapi: '3.0.3',
    info: {
        title: 'CSE341 Books and Authors API',
        version: '1.0.0',
        description: 'Authors API for BYU-Pathway CSE341 Week 02. Authors use custom string IDs.'
    },
    servers: [
        {
            url: '/',
            description: 'Current server'
        }
    ],
    tags: [
        {
            name: 'Books',
            description: 'Create and manage books linked to authors by custom ID'
        },
        {
            name: 'Authors',
            description: 'Create and manage authors'
        }
    ],
    paths: {
        '/books': {
            get: {
                tags: ['Books'],
                summary: 'List all books',
                operationId: 'getBooks',
                responses: {
                    '200': {
                        description: 'Books returned successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        $ref: '#/components/schemas/Book'
                                    }
                                },
                                examples: {
                                    books: {
                                        value: [bookExample]
                                    }
                                }
                            }
                        }
                    },
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            },
            post: {
                tags: ['Books'],
                summary: 'Create a book',
                operationId: 'createBook',
                requestBody: {
                    required: true,
                    description: 'All fields are required; authorId must match an existing author custom ID.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/NewBook'
                            },
                            examples: {
                                book: {
                                    value: bookExample
                                }
                            }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Book created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Book'
                                },
                                examples: {
                                    createdBook: {
                                        value: bookExample
                                    }
                                }
                            }
                        }
                    },
                    '400': errorResponse(
                        'Invalid request body, duplicate book ID, or nonexistent author',
                        'Valid id, authorId, title, and publicationDate are required'
                    ),
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            }
        },
        '/books/{id}': {
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: 'The book custom string ID, not MongoDB _id.',
                    schema: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*'
                    },
                    example: 'b1'
                }
            ],
            get: {
                tags: ['Books'],
                summary: 'Get a book by ID',
                operationId: 'getBookById',
                responses: {
                    '200': {
                        description: 'Book returned successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Book'
                                },
                                examples: {
                                    book: {
                                        value: bookExample
                                    }
                                }
                            }
                        }
                    },
                    '404': errorResponse('Book not found', 'Book not found'),
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            },
            put: {
                tags: ['Books'],
                summary: "Replace a book's mutable fields",
                operationId: 'updateBook',
                requestBody: {
                    required: true,
                    description: 'The URL ID is retained; provide all mutable fields.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/BookUpdate'
                            },
                            examples: {
                                bookUpdate: {
                                    value: {
                                        authorId: 'a1',
                                        title: 'Updated Book',
                                        publicationDate: '2024-02-20'
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Book updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Book'
                                },
                                examples: {
                                    updatedBook: {
                                        value: updatedBookExample
                                    }
                                }
                            }
                        }
                    },
                    '400': errorResponse(
                        'Invalid request body or nonexistent author',
                        'Valid authorId, title, and publicationDate are required'
                    ),
                    '404': errorResponse('Book not found', 'Book not found'),
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            },
            delete: {
                tags: ['Books'],
                summary: 'Delete a book',
                operationId: 'deleteBook',
                responses: {
                    '204': {
                        description: 'Book deleted; response has no body'
                    },
                    '404': errorResponse('Book not found', 'Book not found'),
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            }
        },
        '/authors': {
            get: {
                tags: ['Authors'],
                summary: 'List all authors',
                operationId: 'getAuthors',
                responses: {
                    '200': {
                        description: 'Authors returned successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'array',
                                    items: {
                                        $ref: '#/components/schemas/Author'
                                    }
                                },
                                examples: {
                                    authors: {
                                        value: [authorExample]
                                    }
                                }
                            }
                        }
                    },
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            },
            post: {
                tags: ['Authors'],
                summary: 'Create an author',
                operationId: 'createAuthor',
                requestBody: {
                    required: true,
                    description: 'All three fields are required; IDs must be unique.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/NewAuthor'
                            },
                            examples: {
                                author: {
                                    value: authorExample
                                }
                            }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Author created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Author'
                                },
                                examples: {
                                    createdAuthor: {
                                        value: authorExample
                                    }
                                }
                            }
                        }
                    },
                    '400': errorResponse(
                        'Invalid request body or duplicate author ID',
                        'An author with this id already exists'
                    ),
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            }
        },
        '/authors/{id}': {
            parameters: [
                {
                    name: 'id',
                    in: 'path',
                    required: true,
                    description: 'The author custom string ID, not MongoDB _id.',
                    schema: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*'
                    },
                    example: 'a1'
                }
            ],
            get: {
                tags: ['Authors'],
                summary: 'Get an author by ID',
                operationId: 'getAuthorById',
                responses: {
                    '200': {
                        description: 'Author returned successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Author'
                                },
                                examples: {
                                    author: {
                                        value: authorExample
                                    }
                                }
                            }
                        }
                    },
                    '404': errorResponse('Author not found', 'Author not found'),
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            },
            put: {
                tags: ['Authors'],
                summary: "Replace an author's mutable fields",
                operationId: 'updateAuthor',
                requestBody: {
                    required: true,
                    description: 'The URL ID is retained; only name and birthYear may be changed.',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/AuthorUpdate'
                            },
                            examples: {
                                authorUpdate: {
                                    value: {
                                        name: 'Updated Author',
                                        birthYear: 1877
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Author updated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Author'
                                },
                                examples: {
                                    updatedAuthor: {
                                        value: updatedAuthorExample
                                    }
                                }
                            }
                        }
                    },
                    '400': errorResponse(
                        'Invalid request body',
                        'Valid name and birthYear are required'
                    ),
                    '404': errorResponse('Author not found', 'Author not found'),
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            },
            delete: {
                tags: ['Authors'],
                summary: 'Delete an author',
                operationId: 'deleteAuthor',
                description: 'Deletion is rejected when a book references this author ID.',
                responses: {
                    '204': {
                        description: 'Author deleted; response has no body'
                    },
                    '404': errorResponse('Author not found', 'Author not found'),
                    '409': errorResponse(
                        'One or more books reference this author',
                        'Cannot delete an author referenced by books'
                    ),
                    '500': errorResponse(
                        'Unexpected server or database error',
                        'Internal server error'
                    )
                }
            }
        }
    },
    components: {
        schemas: {
            Book: {
                type: 'object',
                required: ['id', 'authorId', 'title', 'publicationDate'],
                additionalProperties: false,
                properties: {
                    id: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        description: 'Unique custom book ID.',
                        example: 'b1'
                    },
                    authorId: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        description: "Existing author's custom ID.",
                        example: 'a1'
                    },
                    title: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'Example Book'
                    },
                    publicationDate: {
                        type: 'string',
                        format: 'date',
                        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                        example: '2024-01-15'
                    }
                },
                example: bookExample
            },
            NewBook: {
                type: 'object',
                required: ['id', 'authorId', 'title', 'publicationDate'],
                additionalProperties: false,
                properties: {
                    id: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'b1'
                    },
                    authorId: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'a1'
                    },
                    title: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'Example Book'
                    },
                    publicationDate: {
                        type: 'string',
                        format: 'date',
                        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                        example: '2024-01-15'
                    }
                },
                example: bookExample
            },
            BookUpdate: {
                type: 'object',
                required: ['authorId', 'title', 'publicationDate'],
                additionalProperties: false,
                properties: {
                    authorId: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'a1'
                    },
                    title: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'Updated Book'
                    },
                    publicationDate: {
                        type: 'string',
                        format: 'date',
                        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
                        example: '2024-02-20'
                    }
                },
                example: {
                    authorId: 'a1',
                    title: 'Updated Book',
                    publicationDate: '2024-02-20'
                }
            },
            Author: {
                type: 'object',
                required: ['id', 'name', 'birthYear'],
                additionalProperties: false,
                properties: {
                    id: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        description: 'Unique custom author ID.',
                        example: 'a1'
                    },
                    name: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'Example Author'
                    },
                    birthYear: {
                        type: 'integer',
                        example: 1876
                    }
                },
                example: authorExample
            },
            NewAuthor: {
                type: 'object',
                required: ['id', 'name', 'birthYear'],
                additionalProperties: false,
                properties: {
                    id: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'a1'
                    },
                    name: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'Example Author'
                    },
                    birthYear: {
                        type: 'integer',
                        example: 1876
                    }
                },
                example: authorExample
            },
            AuthorUpdate: {
                type: 'object',
                required: ['name', 'birthYear'],
                additionalProperties: false,
                properties: {
                    name: {
                        type: 'string',
                        minLength: 1,
                        pattern: '.*\\S.*',
                        example: 'Updated Author'
                    },
                    birthYear: {
                        type: 'integer',
                        example: 1877
                    }
                },
                example: {
                    name: 'Updated Author',
                    birthYear: 1877
                }
            },
            Error: errorSchema
        }
    }
};

export default openApiDocument;
