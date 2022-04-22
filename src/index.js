const { request } = require('express');
const express = require('express');
const { v4: uuid } = require('uuid');

const app = express();
app.use(express.json());

const customers = [];

// MIDDLEWARE
function verifyIfCPFAlreadyExists (request, response, next) {
    const { cpf } = request.headers;
    const customer = customers.find(customer => customer.cpf === cpf);

    if (!customer) {
        return response.status(400).json({ message: "Customer does not exist!" });
    }

    request.customer = customer;

    return next();
}

function getBalance(statement) {
    const balance = statement.reduce((acc, operation) => {
        if (operation.type === 'credit') {
            return acc + operation.amount;
        } else {
            return acc - operation.amount;
        }
    }, 0);

    return balance;
}

/** 
 * CREATE ACCOUNT (POST)
 * 
 * cpf: string
 * name: string
 * id: uuid
 * statement []
 */
app.post("/account", (request, response) => {
    const { cpf, name } = request.body;

    const customerAlreadyExists = customers.some((customer) => customer.cpf === cpf);

    if (customerAlreadyExists) {
        return response.status(400).json({ message: "Customer already exists!" })
    }

    customers.push({
        cpf,
        name,
        id: uuid(),
        statement: []
    });

    return response.status(201).send();
});

// app.use(verifyIfCPFAlreadyExists);

/**
 * GET STATEMENT
 */
app.get("/statement", verifyIfCPFAlreadyExists, (request, response) => {
    const { customer } = request;

    return response.json(customer.statement);
});

/**
 * GET STATEMENT BY DATE
 */
app.get("/statement/date", verifyIfCPFAlreadyExists, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString());

    return response.json(statement); 
});

/**
 * MAKE DEPOSIT
 */
app.post("/deposit", verifyIfCPFAlreadyExists, (request, response) => {
    const { description, amount } = request.body;
    const { customer } = request;
    
    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type: "credit"
    }
    customer.statement.push(statementOperation);

    return response.status(201).send();
});

/**
 * MAKE WITHDRAW
 */
app.post("/withdraw", verifyIfCPFAlreadyExists, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;

    const balance = getBalance(customer.statement);

    if (balance < amount) {
        return response.status(400).json({ error: "Insufficient funds!" });
    }
    
    const statementOperation = {
        amount,
        created_at: new Date(),
        type: "debit"
    }
    customer.statement.push(statementOperation);

    return response.status(201).send();
});

/**
 * UPDATE CLIENT ACCOUNT
 */
app.put("/account", verifyIfCPFAlreadyExists, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

/**
 * GET CLIENT ACCOUNT DETAILS
 */
app.get("/account", verifyIfCPFAlreadyExists, (request, response) => {
    const { customer } = request;

    return response.json(customer);
});

/**
 * DELETE ACCOUNT
 */
app.delete("/account", verifyIfCPFAlreadyExists, (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
});

/**
 * GET BALANCE
 */
app.get("/balance", verifyIfCPFAlreadyExists, (request, response) => {
    const { customer } = request;

    const balance = getBalance(customer.statement);

    return response.json(balance);
});

app.listen(3333);