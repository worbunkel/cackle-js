# cackle

A WIP library to batch and optimize graphql queries and mutations. I think I just about have all the core

### Core Features

- [x] Batch queries together on a set timeout
- [x] Optimizes queries to only query for the same piece of data once
  - [x] Optimizes with query arguments
- [x] Handles mutations
- [x] Handles queries that return arrays
- [x] Handles mutations that return arrays

### Core Features TODO

- [ ] Flesh out tests and organize tests

### Features that allow use in any client

Note: This really is already the case. As long as you can pass a string to your client.

- [ ] Ensure support for GraphQL Request
- [ ] Ensure support for FetchQL
- [ ] Ensure support for URQL
- [ ] Ensure support for Zeus
- [ ] Ensure support for Apollo Fetch

### Possible Features Being Explored

- [ ] Support operation names
- [ ] Support Apollo Client
  - I know we will be able to support it when doing `.query` but it would be useful to be able to support it globally
