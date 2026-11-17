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
            name: 'Authors',
            description: 'Create and manage authors'
        }
    ],
    paths: {
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
