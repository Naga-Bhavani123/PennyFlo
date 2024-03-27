### Pennyflo Assignment

### Files

- index.js is a file and a database file noBroker.db consisting of 2 tables `USER` and `PROPERTY`.

### Index.js

- Contains APIs to perform operations on the tables `USER` and `PROPERTY` containing the following columns,

### USER TABLE

    id|column  |type  |pk|
    0 |id       |INTEGER|1|
    1 |name    |VARCHAR|0|
    2 |mobile  |VARCHAR|0|
    3 |email    |VARCHAR|0|
    4 |password |VARCHAR|0|
    5 |role     |VARCHAR|0|

### PROPERTY TABLE

    id|column   |type   |pk|
    0 |id        |INTEGER|1|
    1 |location  |VARCHAR|0|
    2 |cost       |INTEGER|0|
    3 |no_of_rooms|INTEGER|0|
    4 |owner       |INTEGER|0|
    5 |status      |VARCHAR|0|

- Here, owner is the foreign key of property table that refers id of property table.
- id of both tables are primary key and they are `AUTOINCREMENT`.

### Sample Valid User Credentials

{"email": "bhavani34@gmail.com",
"password": "bhavani@123"}

### API 1

Path: /register/
Method: POST
Request:

{"name": "Naga Bhavani",
"mobile": "9182724779",
"email": "bhavani34@gmail.com",
"password": "bhavani@123",
"role": "seller" }

Scenario 1

- Description: If the username already exists
- Response:
  Status code: 400
  Body: User already exists

Scenario 2

- Description: If the registrant provides a password with less than 5 characters
- Response:
  Status code: 400
  Body: Password is too short

Scenario 3

- Description:Successful registration of the registrant
- Response:
  Status code: 200
  Body: User created successfully

### API 2

Path: /login/
Method: POST
Request:
{"email": "bhavani34@gmail.com",
"password": "bhavani@123"}

Scenario 1

- Description: If the user doesn't have a account
- Response:
  Status code: 400
  Body: Invalid user

Scenario 2

- Description: If the user provides an incorrect password
- Response:
  Status code: 400
  Body: Invalid password

Scenario 3

- Description: Successful login of the user
- Response:
  Return the JWT Token

### Authentication with JWT Token

- Authentication is a middleware to authenticate the JWT token.

Scenario 1

- Description: If the JWT token is not provided by the user or an invalid JWT token is provided
- Response:
  Status code: 401
  Body: Invalid JWT Token

Scenario 2

- After successful verification of JWT token, proceed to next middleware or handler.

### API 3

Path: "/property/"
Method: "GET"

Scenario 1

- Sample API /property/?location=hyderabad
- Description: Returns a list of all properties whose location is 'hyderabad'
- Response:
  [{"id":3,
  "location":"hyderabad",
  "cost":1000000,
  "no_of_rooms":1,
  "owner":1,
  "status":"available"}, ...]

Scenario 2

- Sample API /property/?location=hyderabad&min_cost=1000000&min_rooms=3
- Description: Returns all the properties whose location is hyderabad and cost greater than equal to 1000000 and no_of_rooms greater than equal to 3
- Response:
  [{"id":2,
  "location":"hyderabad",
  "cost":1500000,
  "no_of_rooms":3,
  "owner":1,
  "status":"available"}, ...]

### API 4

Path: "/property/:id"
Method: "GET"

- Description: Returns a specific property based on the property ID
- Response:
  {"id":1,"location":"hyderabad","cost":500000,"no_of_rooms":1,"owner":1,"status":"available"}

### checkSellerOrNot

- checkSellerOrNot is middleware called explicitly after successful verification of JWT token.
- This middleware checks weather user is seller or not in the reason that only seller can add, delete and update the property.

Scenario 1

- Description: If user is not a seller.
- Response:
  Status Code: 400
  Body: Only seller can update
  Scenario 2
  After successful checking of the user role, if a role is seller then proceed for next middleware or handler and this passes user id through request object.

### API 5

Path: "/property/"
Method: "POST"

- Description: Creating a property in the property table.
- Request:
  {"location": "hyderabad",
  "cost": 1000000,
  "noOfRooms":1,
  "status":"available"
  }
- Response: Property Successfully Added

### API 6

Path: "/property/:id"
Method: "PUT"
Request:
{"location": "vijayawada"}

Scenario 1

- Description: If User is not a property owner.
- Response:
  Status Code: 400
  Body: Only owner can change

Scenario 2

- Description: If User is a property owner.
- Response:
  Body: Property is updated

### API 7

Path: "property/:id"
Method: "DELETE"

Scenario 1

- Description: If User is not a property owner.
- Response:
  Status Code: 400
  Body: Only owner can delete

Scenario 2

- Description: If User is a property owner.
- Response:
  Body: Property is deleted
