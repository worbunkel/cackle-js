# cackle-js

[![npm version](https://badge.fury.io/js/cackle-js.svg)](https://badge.fury.io/js/cackle-js)

A lightweight library to batch and optimize graphql queries and mutations.

- [Usage](#usage)
- [What it does](#what-it-does)
  - [Graphql Request](#graphql-request)
  - [Zeus](#zeus)
- [Todo/Roadmap (In descending priority)](#todoroadmap-in-descending-priority)
- [License](#license)
- [Special Thanks](#special-thanks))

## Usage

```javascript
// Install Cackle
npm i cackle-js

//Install Graphql Request or any other request client you prefer
npm i graphql-request
```

```typescript
import { RequestManager } from 'cackle-js';
import { request } from 'graphql-request';

// Our graphql endpoint
const url = 'http://localhost:8080/graphql';

// The function that takes a Graphql Query or Mutation and returns a promise of the result
const requestCreator = (queryOrMutation: string) => request(url, queryOrMutation);

// The optional duration in ms the we want to wait before sending a request to batch them together
const batchTimeout = 200; // Default = 100

// The Cackle request manager which will handle all the batching and optimization
const requestManager = new RequestManager(requestCreator, batchTimeout);

// Our queries
const query1 = `{
  todos {
    name
  }
}`;
const query2 = `{
  todos {
    isComplete
  }
}`;

// Cackle will take the two queries and optimize them into one request with the query:
// {
//   todos {
//     name
//     isComplete
//   }
// }

(async () => {
  const promise1 = requestManager.createQuery(query1);
  const promise2 = requestManager.createQuery(query2);

  const [result1, result2] = await Promise.all([promise1, promise2]);
  console.log(JSON.stringify({ result1, result2 }, null, 2));

  // OUTPUT using test-schema (src/test-schema.ts). Note that each request gets the payload back that they requested
  // {
  //   "result1": {
  //     "todos": [
  //       {
  //         "name": "Brush Teeth"
  //       }
  //     ]
  //   },
  //   "result2": {
  //     "todos": [
  //       {
  //         "isComplete": true
  //       }
  //     ]
  //   }
  // }
})();
```

## What it does

Let's imagine an example scenario where you are building a social media app. You have a users component that queries for users and a posts component that queries for posts.

Users component query:

```graphql
{
  users {
    firstName
    lastName
  }
}
```

Posts component query:

```graphql
{
  posts {
    title
    message
    time
  }
}
```

So you make two separate requests within a very short time of each other right as the page loads. You could create a new query that does both in one and distributes the result to each component, or you could use Cackle.

Cackle waits for a certain amount of time to pass before making a request (100ms by default), then batches any queries together so that only one request is made. So if we used cackle in the exact same scenario that we started with, we would have one
request that looks like:

```graphql
{
  users {
    firstName
    lastName
  }
  posts {
    title
    message
    time
  }
}
```

This is called **batching** and it eliminates the extra overhead and allows you to have each component worry only about retrieving it's own data.

On top of that, Cackle also optimizes the batched queries. So lets say we have a component that retrieves the users' names, and another component that retrieves the users posts. Normally we would have two requests and two queries that look like:

Users' names query:

```graphql
{
  users {
    firstName
    lastName
  }
}
```

Users' posts query:

```graphql
{
  users {
    firstName
    posts {
      title
      message
      time
    }
  }
}
```

So now, we're querying for the same data (firstName) in both places, and we're making two requests. Cackle will optimize
these queries into one request that tries to avoid requesting the same data twice. The result would look like:

```graphql
{
  users {
    firstName
    lastName
    posts {
      title
      message
      time
    }
  }
}
```

### Graphql Request

- Library: [Graphql Request](https://github.com/prisma/graphql-request)
- Example: [graphql-request.example.ts](./examples/graphql-request/graphql-request.example.ts)

### Zeus

- Library: [Zeus](https://github.com/graphql-editor/graphql-zeus)
- Example: [graphql-zeus.example.ts](./examples/graphql-zeus/graphql-zeus.example.ts)

## Todo/Roadmap (In descending priority)

- Flesh out tests to 100% code coverage
- Add 100% type safety
- Add easy support for Apollo with an example
- Add easy support for URQL with an example
- Breakdown several of the util functions and the processQueries/processMutations functions into more readable pieces
- Add contributor guidelines (For now, just report any issues please)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Special Thanks

This library was sponsored by reddit user [/u/minuit1984](https://www.reddit.com/user/minuit1984/) as a result of a [post he created on /r/javascript](https://www.reddit.com/r/javascript/comments/c3f0ou/javascript_open_source_summer_project/). Thanks so much for reaching out to the community and offering to sponsor an open source project.
