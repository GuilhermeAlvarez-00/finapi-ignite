const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors());
app.use(express.json());

const customers = [];

function verifyIfAccountCPFExists(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ error: 'Customer not found' });
  }

  request.customer = customer;

  next();
}

function getBalance(statements) {
  return statements.reduce((total, operation) => {
    if (operation.type === 'credit') {
      total += operation.amount;
    } else {
      total -= operation.amount;
    }

    return total;
  }, 0);
}

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: 'Customer already exists.' });
  }

  customers.push({
    id: uuidv4(),
    cpf,
    name,
    statements: [],
  });

  return response.status(201).json({ name, cpf });
});

app.get('/statement', verifyIfAccountCPFExists, (request, response) => {
  const { customer } = request;

  return response.json(customer.statements);
});

app.post('/deposit', verifyIfAccountCPFExists, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  };

  customer.statements.push(statementOperation);

  return response.status(201).send();
});

app.post('/withdraw', verifyIfAccountCPFExists, (request, response) => {
  const { customer } = request;
  const { amount } = request.body;

  const customerBalance = getBalance(customer.statements);
  if (amount > customerBalance) {
    return response.status(400).json({ error: 'Insufficient funds.' });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit',
  };

  customer.statements.push(statementOperation);

  return response.status(201).send();
});

app.get('/statement/date', verifyIfAccountCPFExists, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + ' 00:00');
  const statements = customer.statements.filter(
    (statement) =>
      statement.created_at.toDateString() === dateFormat.toDateString()
  );

  response.json(statements);
});

app.put('/account', verifyIfAccountCPFExists, (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  return response.status(201).send();
});

app.get('/account', verifyIfAccountCPFExists, (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.delete('/account', verifyIfAccountCPFExists, (request, response) => {
  const { customer } = request;
  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

app.get('/balance', verifyIfAccountCPFExists, (request, response) => {
  const { customer } = request;
  const balance = getBalance(customer.statements);

  return response.json({ balance });
});

app.listen(3333);
